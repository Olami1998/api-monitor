import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "api_monitor_session";
const HOST_SESSION_COOKIE = "__Host-api_monitor_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function cookieName() {
  return process.env.NODE_ENV === "production" ? HOST_SESSION_COOKIE : SESSION_COOKIE;
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get(cookieName())?.value ?? cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }
  return session.userId;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { id: sessionId, userId, expiresAt },
  });
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set(cookieName(), sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get(cookieName())?.value ?? cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(cookieName());
}

export async function clearAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(cookieName());
}
