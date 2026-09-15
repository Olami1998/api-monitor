import crypto from "node:crypto";
import { promisify } from "node:util";

const KEYLEN = 64;
const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}.${derived.toString("hex")}`;
}

let dummyHashPromise: Promise<string> | null = null;

function dummyHash() {
  dummyHashPromise ??= hashPassword("timing-dummy-password");
  return dummyHashPromise;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(".");
    if (!salt || !hash || hash.length % 2 !== 0) {
      return false;
    }
    const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export async function verifyPasswordOrDummy(password: string, stored?: string | null) {
  return verifyPassword(password, stored || (await dummyHash()));
}

export function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
