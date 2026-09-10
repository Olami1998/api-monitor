const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    buckets.clear();
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
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return userId ? `${userId}:${ip}` : ip;
}
