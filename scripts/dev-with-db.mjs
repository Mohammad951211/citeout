/**
 * dev-with-db.mjs
 * Starts embedded PostgreSQL, runs migrations + seed (first time), then starts Next.js dev server.
 * Run with: node scripts/dev-with-db.mjs
 */

import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_DIR = join(ROOT, ".embedded-postgres");
const isFirstRun = !existsSync(join(DB_DIR, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: DB_DIR,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${label}] Running: ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[${label}] exited with code ${code}`));
    });
  });
}

async function main() {
  // 1. Init cluster on first run
  if (isFirstRun) {
    console.log("[DB] Initialising new PostgreSQL cluster...");
    await pg.initialise();
  }

  // 2. Start server
  console.log("[DB] Starting PostgreSQL on port 5432...");
  await pg.start();
  console.log("[DB] PostgreSQL is running.");

  // 3. Create citeout database (no-op if exists)
  try {
    await pg.createDatabase("citeout");
    console.log("[DB] Database 'citeout' created.");
  } catch {
    console.log("[DB] Database 'citeout' already exists.");
  }

  // 4. Push schema (idempotent — safe to run every time)
  await run("npx", ["prisma", "db", "push"], "MIGRATE");

  // 5. Seed (uses upsert — idempotent)
  await run("npm", ["run", "db:seed"], "SEED");

  // 6. Start Next.js dev server
  console.log("\n[DEV] Starting Next.js dev server...\n");
  const nextProc = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });

  // Keep process alive; forward signals
  const shutdown = async () => {
    nextProc.kill();
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  nextProc.on("close", async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch(async (err) => {
  console.error(err.message);
  await pg.stop().catch(() => {});
  process.exit(1);
});
