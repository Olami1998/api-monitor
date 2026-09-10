const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
  const stamps = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (stamps.length >= limit) {
    buckets.set(key, stamps);
    return false;
  }
  stamps.push(now);
  buckets.set(key, stamps);
  return true;
}

export function clientKey(request: Request, userId?: string) {
  const trustProxy = process.env.TRUST_PROXY === "true";
  const forwarded = trustProxy ? request.headers.get("x-forwarded-for") : null;
  const realIp = trustProxy ? request.headers.get("x-real-ip") : null;
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "local";
  return userId ? `${userId}:${ip}` : ip;
}
