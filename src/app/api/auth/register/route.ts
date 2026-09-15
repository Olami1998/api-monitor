import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { parseBody, registerSchema } from "@/lib/schemas";
import { setSession } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { registrationAllowed } from "@/lib/registration";

export async function GET() {
  return error("METHOD_NOT_ALLOWED", "Use POST.", 405);
}

export async function POST(request: Request) {
  if (!(await rateLimit(`register:${clientKey(request)}`, 5, 60_000))) {
    return error("RATE_LIMITED", "Too many registration attempts.", 429);
  }

  const parsed = parseBody(registerSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return error("VALIDATION_ERROR", parsed.error, 422);
  }

  if (!registrationAllowed(parsed.data.invite)) {
    return error("VALIDATION_ERROR", "Unable to create account.", 422);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return error("VALIDATION_ERROR", "Unable to create account.", 422);
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
    select: { id: true, name: true, email: true },
  });

  await setSession(user.id);
  return json({ user }, { status: 201 });
}
