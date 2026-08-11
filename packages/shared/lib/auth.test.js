// Auth tests: password hashing, session lifecycle, and tenant scoping.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createUser,
  authenticate,
  createSession,
  validateSession,
  destroySession,
  destroyUserSessions,
  pruneExpiredSessions,
  normalizeEmail,
} from "./auth.js";
import {
  assertProjectAccess,
  getWorkflow,
  listWorkflows,
  listRunEvents,
  ensureDefaultProject,
  NotFoundError,
} from "./authz.js";
import { createTestDb } from "../../../src/queue/test-helpers.js";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("salts each hash, so equal passwords differ", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("encodes its parameters so they can be raised later", async () => {
    const hash = await hashPassword("pw");
    expect(hash.split("$").slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"]);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toContain("hunter2");
  });

  it("returns false rather than throwing on a malformed hash", async () => {
    for (const bad of ["", "garbage", "scrypt$1$2", "bcrypt$16384$8$1$aa$bb"]) {
      expect(await verifyPassword("pw", bad)).toBe(false);
    }
  });

  it("rejects an empty password at hash time", async () => {
    await expect(hashPassword("")).rejects.toThrow(/non-empty/);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("users and sessions", () => {
  let db;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  const signup = (email = "user@example.com", password = "password123") =>
    createUser({ email, password }, db);

  describe("createUser", () => {
    it("stores the email lower-cased", async () => {
      const user = await signup("Mixed@Case.COM");
      expect(user.email).toBe("mixed@case.com");
      expect(user.id).toBeTruthy();
    });

    it("rejects a duplicate email regardless of case", async () => {
      await signup("dupe@example.com");
      await expect(signup("DUPE@example.com")).rejects.toThrow(/already exists/);
    });

    it("rejects an invalid email", async () => {
      await expect(signup("not-an-email")).rejects.toThrow(/valid email/);
    });

    it("rejects a short password", async () => {
      await expect(signup("a@b.com", "short")).rejects.toThrow(/at least 8/);
    });

    it("does not return the password hash", async () => {
      const user = await signup();
      expect(user.password_hash).toBeUndefined();
    });
  });

  describe("authenticate", () => {
    it("accepts correct credentials", async () => {
      const created = await signup();
      const user = await authenticate({ email: "user@example.com", password: "password123" }, db);
      expect(user?.id).toBe(created.id);
    });

    it("is case-insensitive on the email", async () => {
      await signup("user@example.com");
      const user = await authenticate({ email: "USER@EXAMPLE.COM", password: "password123" }, db);
      expect(user).not.toBeNull();
    });

    it("rejects a wrong password", async () => {
      await signup();
      expect(await authenticate({ email: "user@example.com", password: "nope12345" }, db)).toBeNull();
    });

    it("returns null for an unknown user instead of throwing", async () => {
      expect(await authenticate({ email: "ghost@example.com", password: "whatever1" }, db)).toBeNull();
    });
  });

  describe("sessions", () => {
    it("issues a token that validates back to the user", async () => {
      const user = await signup();
      const { token } = await createSession(user.id, {}, db);

      const result = await validateSession(token, db);
      expect(result?.user.id).toBe(user.id);
      expect(result?.user.email).toBe("user@example.com");
    });

    it("stores only the hash of the token", async () => {
      const user = await signup();
      const { token } = await createSession(user.id, {}, db);

      const row = await db.one("select id from sessions where user_id = ?", [user.id]);
      // The raw token must not be recoverable from the database.
      expect(row.id).not.toBe(token);
      expect(row.id).toHaveLength(64); // sha256 hex
    });

    it("rejects an unknown or empty token", async () => {
      expect(await validateSession("nonsense", db)).toBeNull();
      expect(await validateSession("", db)).toBeNull();
      expect(await validateSession(null, db)).toBeNull();
    });

    it("rejects and deletes an expired session", async () => {
      const user = await signup();
      const { token } = await createSession(user.id, {}, db);

      await db.none("update sessions set expires_at = ? where user_id = ?", [
        new Date(Date.now() - 1000).toISOString(),
        user.id,
      ]);

      expect(await validateSession(token, db)).toBeNull();
      const remaining = await db.manyOrNone("select id from sessions where user_id = ?", [user.id]);
      expect(remaining).toHaveLength(0);
    });

    it("destroys a single session", async () => {
      const user = await signup();
      const { token } = await createSession(user.id, {}, db);

      expect(await destroySession(token, db)).toBe(true);
      expect(await validateSession(token, db)).toBeNull();
    });

    it("destroys every session for a user", async () => {
      const user = await signup();
      const a = await createSession(user.id, {}, db);
      const b = await createSession(user.id, {}, db);

      expect(await destroyUserSessions(user.id, db)).toBe(2);
      expect(await validateSession(a.token, db)).toBeNull();
      expect(await validateSession(b.token, db)).toBeNull();
    });

    it("prunes only expired sessions", async () => {
      const user = await signup();
      const live = await createSession(user.id, {}, db);
      const dead = await createSession(user.id, {}, db);

      await db.none("update sessions set expires_at = ? where id != ?", [
        new Date(Date.now() - 1000).toISOString(),
        // keep the live one untouched
        (await validateSession(live.token, db)).session.id,
      ]);

      expect(await pruneExpiredSessions(db)).toBe(1);
      expect(await validateSession(live.token, db)).not.toBeNull();
      expect(await validateSession(dead.token, db)).toBeNull();
    });

    it("cascades session deletion when the user is removed", async () => {
      const user = await signup();
      const { token } = await createSession(user.id, {}, db);

      await db.none("delete from users where id = ?", [user.id]);
      expect(await validateSession(token, db)).toBeNull();
    });
  });
});

describe("authz tenant scoping", () => {
  let db;
  let alice;
  let bob;
  let aliceProject;
  let aliceWorkflow;

  beforeEach(async () => {
    db = await createTestDb();
    alice = await createUser({ email: "alice@example.com", password: "password123" }, db);
    bob = await createUser({ email: "bob@example.com", password: "password123" }, db);

    aliceProject = await ensureDefaultProject(alice.id, "Alice", db);
    aliceWorkflow = await db.one(
      `insert into workflow_definitions (project_id, slug, name, definition)
       values (?, ?, ?, ?) returning id`,
      [aliceProject, "wf", "Workflow", JSON.stringify({ nodes: [] })],
    );
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates a default project once and reuses it", async () => {
    expect(await ensureDefaultProject(alice.id, "Alice", db)).toBe(aliceProject);
  });

  it("lets the owner read their own project", async () => {
    await expect(assertProjectAccess(alice.id, aliceProject, db)).resolves.toBe(aliceProject);
  });

  it("hides another user's project behind NotFound", async () => {
    // Reporting 403 here would confirm the id exists.
    await expect(assertProjectAccess(bob.id, aliceProject, db)).rejects.toThrow(NotFoundError);
  });

  it("does not leak a workflow across tenants", async () => {
    expect(await getWorkflow(alice.id, aliceWorkflow.id, db)).not.toBeNull();
    expect(await getWorkflow(bob.id, aliceWorkflow.id, db)).toBeNull();
  });

  it("lists only the caller's workflows", async () => {
    expect(await listWorkflows(alice.id, {}, db)).toHaveLength(1);
    expect(await listWorkflows(bob.id, {}, db)).toHaveLength(0);
  });

  it("does not leak run events across tenants", async () => {
    const run = await db.one(
      `insert into workflow_runs (project_id, workflow_id, status)
       values (?, ?, 'running') returning id`,
      [aliceProject, aliceWorkflow.id],
    );
    await db.none(`insert into workflow_events (run_id, type, payload) values (?, 'x', '{}')`, [
      run.id,
    ]);

    expect(await listRunEvents(alice.id, run.id, {}, db)).toHaveLength(1);
    expect(await listRunEvents(bob.id, run.id, {}, db)).toHaveLength(0);
  });
});
