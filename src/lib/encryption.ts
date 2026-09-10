import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }
  return Buffer.from(hex, "hex");
}

export function encryptString(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptString(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function redactSecrets(value: string) {
  return value
    .replace(/(Bearer\s+)(\S+)/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)([^"'\s]+)/gi, "$1[REDACTED]")
    .replace(/(password["']?\s*[:=]\s*["']?)([^"'\s]+)/gi, "$1[REDACTED]");
}
