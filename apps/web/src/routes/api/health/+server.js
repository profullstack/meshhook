import { json } from "@sveltejs/kit";
import { pool } from "@meshhook/shared/lib/db.js";

const startTime = Date.now();

export async function GET() {
  let dbOk = false;
  let poolInfo = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  let dbError = null;

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbOk = true;
    } finally {
      client.release();
    }
    poolInfo = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (err) {
    dbError = err.message;
  }

  const status = dbOk ? 200 : 503;

  return json(
    {
      status: dbOk ? "healthy" : "degraded",
      uptime: Math.round((Date.now() - startTime) / 1000),
      database: {
        ok: dbOk,
        pool: poolInfo,
        error: dbError,
      },
      memory: process.memoryUsage(),
      pid: process.pid,
    },
    { status }
  );
}
