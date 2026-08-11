/**
 * Authorization helpers — the application-layer replacement for Row Level
 * Security.
 *
 * Under Supabase, every table carried RLS policies keyed on auth.uid(), so a
 * query that forgot to filter by owner still returned only that user's rows.
 * SQLite has no RLS and Turso has no notion of the calling user, so *that
 * safety net is gone*: an unfiltered query now returns every tenant's data.
 *
 * The policies being replaced (supabase/migrations/…0002_enable_rls_policies)
 * reduced to one rule applied consistently:
 *
 *   projects              owner = current user
 *   secrets               project_id ∈ the user's projects
 *   workflow_definitions  project_id ∈ the user's projects
 *   workflow_runs         project_id ∈ the user's projects
 *   workflow_events       run_id → workflow_runs → the user's projects
 *   audit_log             project_id ∈ the user's projects
 *
 * Route handlers should go through these helpers rather than writing the join
 * by hand. Where a bespoke query is unavoidable, use ownedProjectIdsSql() so
 * the scoping predicate stays in one place.
 */

import { db as sharedDb } from "./db.js";

/**
 * A subquery selecting the project ids owned by one user, for embedding in a
 * larger statement. Takes one bound parameter: the user id.
 *
 * The Postgres equivalent was the user_project_ids() function referenced by
 * every policy.
 */
export const ownedProjectIdsSql = () => "select id from projects where owner = ?";

/** Raised when a record exists but belongs to someone else. */
export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource") {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

/** Raised when a record does not exist. */
export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

/** Every project owned by a user. */
export async function listProjects(userId, db = sharedDb) {
  return db.manyOrNone(
    "select id, name, owner, created_at, updated_at from projects where owner = ? order by created_at",
    [userId],
  );
}

/**
 * Assert that `userId` owns `projectId`.
 *
 * Deliberately reports NotFound for a project owned by someone else, so the
 * error does not confirm that the id exists.
 */
export async function assertProjectAccess(userId, projectId, db = sharedDb) {
  const row = await db.oneOrNone("select id from projects where id = ? and owner = ?", [
    projectId,
    userId,
  ]);
  if (!row) throw new NotFoundError("Project not found");
  return row.id;
}

/**
 * Fetch a workflow the user is allowed to see.
 * @returns {Promise<object|null>}
 */
export async function getWorkflow(userId, workflowId, db = sharedDb) {
  return db.oneOrNone(
    `select w.* from workflow_definitions w
       where w.id = ? and w.project_id in (${ownedProjectIdsSql()})`,
    [workflowId, userId],
  );
}

/** Every workflow across the user's projects, newest first. */
export async function listWorkflows(userId, { limit = 100, offset = 0 } = {}, db = sharedDb) {
  return db.manyOrNone(
    `select w.* from workflow_definitions w
       where w.project_id in (${ownedProjectIdsSql()})
       order by w.updated_at desc
       limit ? offset ?`,
    [userId, limit, offset],
  );
}

/** Fetch a run the user is allowed to see. */
export async function getRun(userId, runId, db = sharedDb) {
  return db.oneOrNone(
    `select r.* from workflow_runs r
       where r.id = ? and r.project_id in (${ownedProjectIdsSql()})`,
    [runId, userId],
  );
}

/** Runs across the user's projects, most recently started first. */
export async function listRuns(userId, { limit = 50, offset = 0, status } = {}, db = sharedDb) {
  const params = [userId];
  let statusFilter = "";

  if (status) {
    statusFilter = "and r.status = ?";
    params.push(status);
  }
  params.push(limit, offset);

  return db.manyOrNone(
    `select r.*, w.name as workflow_name, w.slug as workflow_slug
       from workflow_runs r
       join workflow_definitions w on w.id = r.workflow_id
      where r.project_id in (${ownedProjectIdsSql()}) ${statusFilter}
      order by r.started_at desc
      limit ? offset ?`,
    params,
  );
}

/**
 * Events for a run, scoped through the run's project.
 *
 * `afterId` supports incremental polling from the live log view without
 * re-reading the whole history.
 */
export async function listRunEvents(
  userId,
  runId,
  { limit = 500, afterId = 0 } = {},
  db = sharedDb,
) {
  return db.manyOrNone(
    `select e.id, e.run_id, e.ts, e.type, e.payload
       from workflow_events e
       join workflow_runs r on r.id = e.run_id
      where e.run_id = ?
        and e.id > ?
        and r.project_id in (${ownedProjectIdsSql()})
      order by e.id asc
      limit ?`,
    [runId, afterId, userId, limit],
  );
}

/** Secrets for a project, without their ciphertext. */
export async function listSecrets(userId, projectId, db = sharedDb) {
  await assertProjectAccess(userId, projectId, db);
  return db.manyOrNone(
    `select id, project_id, key, created_at, updated_at
       from secrets where project_id = ? order by key`,
    [projectId],
  );
}

/**
 * Fetch one secret, ciphertext included. Callers are responsible for
 * decrypting and for not returning the plaintext to the browser.
 */
export async function getSecret(userId, secretId, db = sharedDb) {
  return db.oneOrNone(
    `select s.* from secrets s
       where s.id = ? and s.project_id in (${ownedProjectIdsSql()})`,
    [secretId, userId],
  );
}

/**
 * Record an auditable action.
 *
 * The RLS policy allowed inserts only into the user's own projects; the same
 * check is made here before writing.
 */
export async function recordAudit(
  userId,
  { projectId, action, resourceType, resourceId, metadata, ipAddress, userAgent },
  db = sharedDb,
) {
  if (projectId) {
    await assertProjectAccess(userId, projectId, db);
  }

  await db.none(
    `insert into audit_log
       (project_id, user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId ?? null,
      userId,
      action,
      resourceType,
      resourceId ?? null,
      metadata ? JSON.stringify(metadata) : null,
      ipAddress ?? null,
      userAgent ?? null,
    ],
  );
}

/**
 * Ensure the user has a project to work in, creating a default one on first
 * use. Supabase seeded this with a trigger on auth.users.
 */
export async function ensureDefaultProject(userId, name = "Default", db = sharedDb) {
  const existing = await db.oneOrNone(
    "select id from projects where owner = ? order by created_at limit 1",
    [userId],
  );
  if (existing) return existing.id;

  const created = await db.one("insert into projects (owner, name) values (?, ?) returning id", [
    userId,
    name,
  ]);
  return created.id;
}
