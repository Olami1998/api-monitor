import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/password";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}
if (url.startsWith("file:")) {
  mkdirSync(dirname(resolve(url.slice("file:".length))), { recursive: true });
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url, timeout: 5000 }),
});

const users = [
  { email: "demo@example.com", name: "Demo User", password: "password123" },
  { email: "tester@example.com", name: "Tester", password: "password123" },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash: hashPassword(user.password) },
      create: {
        email: user.email,
        name: user.name,
        passwordHash: hashPassword(user.password),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
