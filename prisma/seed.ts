import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

setDefaultResultOrder("ipv4first");

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}
if (url.startsWith("file:")) {
  throw new Error("DATABASE_URL must be a Neon PostgreSQL connection string, not a SQLite file URL.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
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
