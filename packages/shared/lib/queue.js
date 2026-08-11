/**
 * SQLite-backed message queue.
 *
 * Reimplements the subset of pgmq that MeshHook used. pgmq is a Postgres
 * extension with no SQLite equivalent, and the old code reached it through
 * Supabase RPC calls (`client.rpc('pgmq_send', …)`), so both the transport and
 * the implementation had to be replaced.
 *
 * Semantics carried over unchanged:
 *   - send() appends a message, optionally invisible until a delay elapses.
 *   - read() leases the oldest visible message: it pushes `vt` forward by the
 *     visibility timeout and increments `read_ct`. The message stays in the
 *     table, so a consumer that dies without acknowledging simply loses its
 *     lease and the message is redelivered.
 *   - deleteMessage() removes it permanently; archive() moves it aside.
 *
 * The claim must be atomic — two workers polling concurrently must not lease
 * the same message. pgmq guaranteed this with FOR UPDATE SKIP LOCKED. SQLite
 * has no row locks, but a write transaction holds an exclusive lock on the
 * whole database, which gives the same guarantee here.
 */

import { db as sharedDb, json } from "./db.js";

/** ISO-8601 UTC, matching the format every timestamp column stores. */
const iso = (date) => date.toISOString();

/** A timestamp `seconds` in the future (or the past, for negative values). */
const offsetIso = (seconds) => iso(new Date(Date.now() + seconds * 1000));

export class Queue {
  /**
   * @param {object} options
   * @param {string} [options.name] Queue name; rows are partitioned by this column.
   * @param {object} [options.db] Database handle, for tests wanting isolation.
   */
  constructor({ name = "workflow_jobs", db = sharedDb } = {}) {
    if (!name) throw new Error("Queue name is required");
    this.name = name;
    this.db = db;
  }

  /**
   * Append a message.
   *
   * @param {object} message Arbitrary JSON-serialisable payload.
   * @param {number} delaySeconds Seconds to keep the message invisible.
   * @returns {Promise<number>} The new msg_id.
   */
  async send(message, delaySeconds = 0) {
    if (message === null || typeof message !== "object") {
      throw new Error("Queue message must be an object");
    }

    const { lastInsertRowid } = await this.db.none(
      `insert into queue_messages (queue_name, message, vt) values (?, ?, ?)`,
      [this.name, JSON.stringify(message), offsetIso(delaySeconds)],
    );

    // libSQL returns lastInsertRowid as a BigInt; msg_id is used as a plain
    // number everywhere else (JSON payloads, tracking rows), so narrow it here.
    return Number(lastInsertRowid);
  }

  /**
   * Lease up to `qty` visible messages.
   *
   * @param {number} vtSeconds Visibility timeout for the lease.
   * @param {number} qty Maximum messages to return.
   * @returns {Promise<Array<{msg_id:number,message:object,read_ct:number,enqueued_at:string,vt:string}>>}
   */
  async read(vtSeconds = 30, qty = 1) {
    return this.db.tx(async (t) => {
      const nowIso = iso(new Date());

      const candidates = await t.manyOrNone(
        `select msg_id, message, read_ct, enqueued_at
           from queue_messages
          where queue_name = ? and vt <= ?
          order by msg_id
          limit ?`,
        [this.name, nowIso, qty],
      );

      if (candidates.length === 0) return [];

      const newVt = offsetIso(vtSeconds);
      const ids = candidates.map((c) => c.msg_id);

      // Placeholders are built from the row count, never from user input.
      await t.none(
        `update queue_messages
            set vt = ?, read_ct = read_ct + 1
          where msg_id in (${ids.map(() => "?").join(",")})`,
        [newVt, ...ids],
      );

      return candidates.map((c) => ({
        msg_id: Number(c.msg_id),
        message: json(c.message, {}),
        read_ct: c.read_ct + 1,
        enqueued_at: c.enqueued_at,
        vt: newVt,
      }));
    });
  }

  /**
   * Inspect messages without leasing them.
   *
   * The old DLQ code called pgmq_read with vt=0 to browse the queue, which
   * still incremented read_ct and briefly hid each message. Inspection should
   * not mutate the queue, so browsing goes through this instead.
   *
   * @param {number} limit Maximum messages to return.
   * @returns {Promise<Array<{msg_id:number,message:object,read_ct:number,enqueued_at:string,vt:string}>>}
   */
  async peek(limit = 100) {
    const rows = await this.db.manyOrNone(
      `select msg_id, message, read_ct, enqueued_at, vt
         from queue_messages
        where queue_name = ?
        order by msg_id
        limit ?`,
      [this.name, limit],
    );

    return rows.map((r) => ({
      msg_id: Number(r.msg_id),
      message: json(r.message, {}),
      read_ct: r.read_ct,
      enqueued_at: r.enqueued_at,
      vt: r.vt,
    }));
  }

  /** Fetch one message by id without leasing it. */
  async peekOne(msgId) {
    const row = await this.db.oneOrNone(
      `select msg_id, message, read_ct, enqueued_at, vt
         from queue_messages where queue_name = ? and msg_id = ?`,
      [this.name, msgId],
    );
    if (!row) return null;
    return {
      msg_id: Number(row.msg_id),
      message: json(row.message, {}),
      read_ct: row.read_ct,
      enqueued_at: row.enqueued_at,
      vt: row.vt,
    };
  }

  /**
   * Remove a message permanently.
   * @returns {Promise<boolean>} True when a row was deleted.
   */
  async deleteMessage(msgId) {
    const { rowsAffected } = await this.db.none(
      `delete from queue_messages where queue_name = ? and msg_id = ?`,
      [this.name, msgId],
    );
    return rowsAffected > 0;
  }

  /**
   * Move a message to the archive table, preserving its msg_id.
   * @returns {Promise<boolean>} True when a row was archived.
   */
  async archive(msgId) {
    return this.db.tx(async (t) => {
      const row = await t.oneOrNone(
        `select msg_id, queue_name, message, read_ct, enqueued_at
           from queue_messages where queue_name = ? and msg_id = ?`,
        [this.name, msgId],
      );
      if (!row) return false;

      await t.none(
        `insert into queue_archive (msg_id, queue_name, message, read_ct, enqueued_at)
         values (?, ?, ?, ?, ?)
         on conflict (msg_id) do nothing`,
        [row.msg_id, row.queue_name, row.message, row.read_ct, row.enqueued_at],
      );
      await t.none(`delete from queue_messages where msg_id = ?`, [msgId]);
      return true;
    });
  }

  /**
   * Make a leased message visible again, optionally after a delay. pgmq called
   * this set_vt; it is how the worker returns a job for retry without waiting
   * for the lease to lapse naturally.
   */
  async setVisibilityTimeout(msgId, seconds) {
    const { rowsAffected } = await this.db.none(
      `update queue_messages set vt = ? where queue_name = ? and msg_id = ?`,
      [offsetIso(seconds), this.name, msgId],
    );
    return rowsAffected > 0;
  }

  /**
   * Delete every message on this queue.
   * @returns {Promise<number>} Messages removed.
   */
  async purge() {
    const { rowsAffected } = await this.db.none(
      `delete from queue_messages where queue_name = ?`,
      [this.name],
    );
    return rowsAffected;
  }

  /**
   * Depth and age of the queue. Only messages that are currently visible count
   * toward queue_length, matching how pgmq's metrics view reported backlog.
   */
  async metrics() {
    const nowIso = iso(new Date());
    const row = await this.db.oneOrNone(
      `select
         count(*) as queue_length,
         min(enqueued_at) as oldest,
         max(enqueued_at) as newest
       from queue_messages
       where queue_name = ? and vt <= ?`,
      [this.name, nowIso],
    );

    const ageSeconds = (ts) =>
      ts ? Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 1000)) : null;

    return {
      queue_name: this.name,
      queue_length: Number(row?.queue_length ?? 0),
      oldest_msg_age_seconds: ageSeconds(row?.oldest),
      newest_msg_age_seconds: ageSeconds(row?.newest),
    };
  }

  /** Total messages including those currently leased — useful for tests. */
  async size() {
    const row = await this.db.oneOrNone(
      `select count(*) as n from queue_messages where queue_name = ?`,
      [this.name],
    );
    return Number(row?.n ?? 0);
  }
}

export function createQueue(options) {
  return new Queue(options);
}

/**
 * Read the tunables for a queue from queue_config, falling back to the same
 * defaults the table declares if no row exists.
 */
export async function getQueueConfig(queueName, db = sharedDb) {
  const row = await db.oneOrNone(
    `select visibility_timeout_seconds, max_retry_attempts, retry_backoff_base_ms,
            retry_backoff_max_ms, dlq_enabled
       from queue_config where queue_name = ?`,
    [queueName],
  );

  if (!row) {
    return {
      visibility_timeout_seconds: 30,
      max_retry_attempts: 5,
      retry_backoff_base_ms: 1000,
      retry_backoff_max_ms: 300000,
      dlq_enabled: true,
    };
  }

  return { ...row, dlq_enabled: row.dlq_enabled === 1 };
}
