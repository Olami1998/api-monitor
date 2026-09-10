import dns from "node:dns";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dns.setDefaultResultOrder("ipv4first");
dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error("Set DATABASE_URL to your Neon PostgreSQL connection string.");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = "20260910181200_init_postgres";
const file = path.join(root, "prisma", "migrations", name, "migration.sql");
const sql = fs.readFileSync(file, "utf8");
const checksum = crypto.createHash("sha256").update(sql).digest("hex");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 60_000,
});

await client.connect();

const exists = await client.query(`
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'User'
`);
if (exists.rowCount === 0) {
  await client.query(sql);
}

await client.query(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )
`);
await client.query(
  `
  INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
  SELECT $1::varchar, $2::varchar, NOW(), $3::varchar, NOW(), 1
  WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $3::varchar)
`,
  [crypto.randomUUID(), checksum, name]
);
await client.end();
console.log("Neon schema applied:", name);
