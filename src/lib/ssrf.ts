import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inCidr(ip: string, cidr: string) {
  const [range, bits] = cidr.split("/");
  const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

export function isBlockedIpv4(ip: string) {
  const ranges = [
    "0.0.0.0/8",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "198.18.0.0/15",
    "224.0.0.0/4",
    "255.255.255.255/32",
  ];
  return ranges.some((cidr) => inCidr(ip, cidr));
}

function ipv4FromMappedIpv6(ip: string) {
  const stripped = stripBrackets(ip).toLowerCase();
  if (!stripped.startsWith("::ffff:")) return null;
  const rest = stripped.slice("::ffff:".length);
  if (isIP(rest) === 4) return rest;
  const match = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!match) return null;
  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);
  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
}

function firstHextet(ip: string) {
  const first = stripBrackets(ip).toLowerCase().split(":")[0] ?? "";
  const value = Number.parseInt(first, 16);
  return Number.isFinite(value) ? value : null;
}

export function isBlockedIpv6(ip: string) {
  const mapped = ipv4FromMappedIpv6(ip);
  if (mapped) return isBlockedIpv4(mapped);
  const normalized = stripBrackets(ip).toLowerCase();
  const hextet = firstHextet(normalized);
  const linkLocal = hextet !== null && (hextet & 0xffc0) === 0xfe80;
  const uniqueLocal = hextet !== null && (hextet & 0xfe00) === 0xfc00;
  const multicast = hextet !== null && (hextet & 0xff00) === 0xff00;
  return normalized === "::" || normalized === "::1" || linkLocal || uniqueLocal || multicast;
}

export function isBlockedIp(ip: string) {
  const cleaned = stripBrackets(ip);
  const mapped = ipv4FromMappedIpv6(cleaned);
  if (mapped) return isBlockedIpv4(mapped);
  const version = isIP(cleaned);
  if (version === 4) return isBlockedIpv4(cleaned);
  if (version === 6) return isBlockedIpv6(cleaned);
  return true;
}

export function stripBrackets(hostname: string) {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

export function normalizeHostname(hostname: string) {
  return stripBrackets(hostname).replace(/\.+$/, "").toLowerCase();
}

function isBlockedHostname(hostname: string) {
  const host = normalizeHostname(hostname);
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) return true;
  return false;
}

export function parseHttpUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    throw new Error("URL hostname is required");
  }
  if (isBlockedHostname(hostname)) {
    throw new Error("URL hostname is not allowed");
  }
  if (isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("URL resolves to a private or reserved address");
  }
  url.hostname = hostname;
  return url;
}

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    parseHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}

export type ResolvedTarget = {
  url: URL;
  address: string;
  family: 4 | 6;
};

export async function assertSafeDestination(value: string): Promise<ResolvedTarget> {
  const url = parseHttpUrl(value);
  const hostname = normalizeHostname(url.hostname);
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("URL resolves to a private or reserved address");
    }
    return { url, address: hostname, family: isIP(hostname) === 6 ? 6 : 4 };
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Unable to resolve hostname");
  }
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new Error("URL resolves to a private or reserved address");
    }
  }
  const preferred = records.find((record) => record.family === 4) ?? records[0];
  return {
    url,
    address: preferred.address,
    family: preferred.family === 6 ? 6 : 4,
  };
}
