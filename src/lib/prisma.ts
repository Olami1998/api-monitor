import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function ensureSqliteDirectory(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  ensureSqliteDirectory(url);
  const adapter = new PrismaBetterSqlite3({ url, timeout: 5000 });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
