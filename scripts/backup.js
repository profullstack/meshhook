import { execSync } from "child_process";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), "backups");
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "7", 10);

if (!DB_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

mkdirSync(BACKUP_DIR, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const path = join(BACKUP_DIR, `meshhook-${ts}.sql`);

try {
  execSync(`pg_dump "${DB_URL}" --no-owner --no-acl -f "${path}"`, {
    stdio: "pipe",
    timeout: 120_000,
  });
} catch (err) {
  console.error("backup failed:", err.stderr?.toString() || err.message);
  process.exit(1);
}

console.log(`backup written: ${path} (${statSync(path).size} bytes)`);

const cutoff = Date.now() - RETENTION_DAYS * 86400_000;
for (const f of readdirSync(BACKUP_DIR)) {
  const fp = join(BACKUP_DIR, f);
  const st = statSync(fp);
  if (st.isFile() && st.mtimeMs < cutoff) {
    unlinkSync(fp);
    console.log(`removed old backup: ${f}`);
  }
}
