import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { verifyPasswordOrDummy } from "@/lib/password";
import { parseBody, loginSchema } from "@/lib/schemas";
import { setSession } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimit(`login:${clientKey(request)}`, 8, 60_000)) {
    return error("RATE_LIMITED", "Too many login attempts.", 429);
  }

  const parsed = parseBody(loginSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return error("VALIDATION_ERROR", parsed.error, 422);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);
  if (!user || !valid) {
    return error("UNAUTHORIZED", "Invalid credentials.", 401);
  }

  await setSession(user.id);
  return json({ user: { id: user.id, name: user.name, email: user.email } });
}
