import { prisma } from "@/lib/prisma";

const MAX_KEYS = 5000;

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const existing = await prisma.rateBucket.findUnique({ where: { key } });
  if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
    const count = await prisma.rateBucket.count();
    if (count > MAX_KEYS) {
      await prisma.rateBucket.deleteMany({
        where: { windowStart: { lt: new Date(now.getTime() - windowMs) } },
      });
    }
    await prisma.rateBucket.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return true;
  }
  if (existing.count >= limit) {
    return false;
  }
  await prisma.rateBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return true;
}

export function clientKey(request: Request, userId?: string) {
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.NODE_ENV === "production";
  const forwarded = trustProxy ? request.headers.get("x-forwarded-for") : null;
  const realIp = trustProxy ? request.headers.get("x-real-ip") : null;
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "local";
  return userId ? `${userId}:${ip}` : ip;
}
