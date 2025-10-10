import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../..");
config({ path: join(rootDir, ".env") });
config({ path: join(rootDir, ".env.local") });
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please check your .env or .env.local file."
  );
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = {
  one: async (q, p = []) => (await pool.query(q, p)).rows[0],
  oneOrNone: async (q, p = []) => (await pool.query(q, p)).rows[0] ?? null,
  manyOrNone: async (q, p = []) => (await pool.query(q, p)).rows,
  none: async (q, p = []) => {
    await pool.query(q, p);
  },
  tx: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const tdb = {
        one: (q, p = []) => client.query(q, p).then((r) => r.rows[0]),
        none: (q, p = []) => client.query(q, p).then(() => {
        })
      };
      const res = await fn(tdb);
      await client.query("commit");
      return res;
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
};
export {
  db
};
