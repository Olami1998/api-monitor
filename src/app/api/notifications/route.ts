import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const notifications = await prisma.notification.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { monitor: { select: { id: true, name: true } } },
  });

  return json({ data: notifications });
}
