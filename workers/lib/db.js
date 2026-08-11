/**
 * Worker database handle.
 *
 * This used to be a byte-for-byte copy of packages/shared/lib/db.js, which meant
 * the Postgres pool was configured twice and the two copies could drift. The
 * libSQL client is re-exported from the shared package instead.
 */

export { db, json, now, createDb } from "@meshhook/shared/lib/db.js";
