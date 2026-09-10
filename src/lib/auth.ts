import { prisma } from "@/lib/prisma";
import { error } from "@/lib/http";
import { getSessionUserId } from "@/lib/session";

export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { response: error("UNAUTHORIZED", "Authentication required.", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) {
    return { response: error("UNAUTHORIZED", "Authentication required.", 401) };
  }

  return { user };
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}
