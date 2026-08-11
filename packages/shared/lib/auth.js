/**
 * Authentication: password hashing and session management.
 *
 * Supabase Auth handled all of this (signup, login, JWTs, cookie refresh,
 * auth.uid() inside RLS policies). Turso is just a database, so MeshHook owns
 * it now. The design is deliberately small:
 *
 *   - Passwords are hashed with scrypt from node:crypto. No new dependency, and
 *     it is memory-hard, unlike a bare SHA.
 *   - Sessions are opaque 256-bit random tokens. The database stores only the
 *     SHA-256 of the token, so a database leak cannot be replayed as a login.
 *   - Session ids are compared with timingSafeEqual via the hash lookup rather
 *     than by string equality on the raw token.
 *
 * There is no JWT: a session is a database row, so revocation is a DELETE and
 * takes effect immediately, which the old stateless access tokens could not do.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { db as sharedDb } from "./db.js";

const scrypt = promisify(scryptCallback);

// scrypt cost parameters. N=16384 keeps a hash around 50-100ms on typical
// hardware — slow enough to blunt offline cracking, fast enough for a login.
const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** How long a new session stays valid. */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Sliding-window refresh: a session more than this far from issue gets its
 * expiry extended when used, so active users are not logged out mid-session
 * while idle sessions still expire.
 */
const SESSION_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 day

/** Name of the cookie carrying the session token. */
export const SESSION_COOKIE = "meshhook_session";

/**
 * Hash a password into "scrypt$N$r$p$salt$hash" (base64 salt and hash).
 * The parameters travel with the hash so they can be raised later without
 * invalidating existing passwords.
 */
export async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
    // scrypt needs memory ≈ 128*N*r bytes; Node's default cap is below that.
    maxmem: 256 * SCRYPT_N * SCRYPT_r,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Check a password against a stored hash.
 *
 * Always returns a boolean — a malformed stored hash is a failed verification,
 * not an exception, so it cannot be used to distinguish accounts.
 */
export async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;

  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");

    const derived = await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 256 * Number(n) * Number(r),
    });

    // Equal lengths are required by timingSafeEqual.
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Normalise an email for storage and lookup. */
export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

/** SHA-256 of a session token; this is what the sessions table stores. */
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

/**
 * Register a new user.
 * @throws when the email is already taken.
 */
export async function createUser({ email, password }, db = sharedDb) {
  const normalized = normalizeEmail(email);

  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email address is required");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await db.oneOrNone("select id from users where email = ?", [normalized]);
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const passwordHash = await hashPassword(password);

  return db.one(
    `insert into users (email, password_hash) values (?, ?)
     returning id, email, created_at`,
    [normalized, passwordHash],
  );
}

/**
 * Verify credentials.
 *
 * Runs the hash comparison even when no such user exists, so the response time
 * does not reveal whether an email is registered.
 * @returns {Promise<object|null>} The user, or null when credentials are wrong.
 */
export async function authenticate({ email, password }, db = sharedDb) {
  const normalized = normalizeEmail(email);

  const user = await db.oneOrNone(
    "select id, email, password_hash, created_at from users where email = ?",
    [normalized],
  );

  // A dummy hash of the right shape keeps the work comparable for unknown users.
  const stored =
    user?.password_hash ??
    "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(88);

  const ok = await verifyPassword(password, stored);

  if (!user || !ok) return null;

  return { id: user.id, email: user.email, created_at: user.created_at };
}

/**
 * Issue a session and return the raw token to put in a cookie.
 *
 * The raw token is returned once and never stored; only its hash is persisted.
 */
export async function createSession(userId, { userAgent, ipAddress } = {}, db = sharedDb) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.none(
    `insert into sessions (id, user_id, expires_at, user_agent, ip_address)
     values (?, ?, ?, ?, ?)`,
    [hashToken(token), userId, expiresAt, userAgent ?? null, ipAddress ?? null],
  );

  return { token, expiresAt };
}

/**
 * Resolve a session token to its user.
 *
 * Expired sessions are deleted on sight rather than merely rejected, which
 * keeps the table from accumulating dead rows without a separate sweep.
 *
 * @returns {Promise<{user: object, session: object}|null>}
 */
export async function validateSession(token, db = sharedDb) {
  if (!token) return null;

  const id = hashToken(token);

  const row = await db.oneOrNone(
    `select s.id, s.user_id, s.expires_at, s.created_at,
            u.email, u.created_at as user_created_at
       from sessions s
       join users u on u.id = s.user_id
      where s.id = ?`,
    [id],
  );

  if (!row) return null;

  if (Date.parse(row.expires_at) <= Date.now()) {
    await db.none("delete from sessions where id = ?", [id]);
    return null;
  }

  // Extend a session that is being actively used.
  const remaining = Date.parse(row.expires_at) - Date.now();
  let expiresAt = row.expires_at;

  if (remaining < SESSION_DURATION_MS - SESSION_REFRESH_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    await db.none(
      `update sessions
          set expires_at = ?, last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        where id = ?`,
      [expiresAt, id],
    );
  }

  return {
    user: { id: row.user_id, email: row.email, created_at: row.user_created_at },
    session: { id: row.id, expires_at: expiresAt },
  };
}

/** Revoke a single session. */
export async function destroySession(token, db = sharedDb) {
  if (!token) return false;
  const { rowsAffected } = await db.none("delete from sessions where id = ?", [hashToken(token)]);
  return rowsAffected > 0;
}

/** Revoke every session for a user, e.g. after a password change. */
export async function destroyUserSessions(userId, db = sharedDb) {
  const { rowsAffected } = await db.none("delete from sessions where user_id = ?", [userId]);
  return rowsAffected;
}

/** Delete expired sessions. Intended for a periodic job. */
export async function pruneExpiredSessions(db = sharedDb) {
  const { rowsAffected } = await db.none(
    "delete from sessions where expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
  );
  return rowsAffected;
}

/** Cookie options for the session cookie. Secure is disabled only for http dev. */
export function sessionCookieOptions({ secure = true } = {}) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}
