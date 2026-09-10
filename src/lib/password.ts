import crypto from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}.${hash}`;
}

const DUMMY_HASH = hashPassword("timing-dummy-password");

export function verifyPassword(password: string, stored: string) {
  try {
    const [salt, hash] = stored.split(".");
    if (!salt || !hash || hash.length % 2 !== 0) {
      return false;
    }
    const derived = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
    if (hash.length !== derived.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

export function verifyPasswordOrDummy(password: string, stored?: string | null) {
  return verifyPassword(password, stored || DUMMY_HASH);
}

export function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
