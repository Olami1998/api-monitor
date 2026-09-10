import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { incidentStatusSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam ? incidentStatusSchema.safeParse(statusParam) : null;
  if (statusParam && !status?.success) {
    return error("VALIDATION_ERROR", "Invalid incident status.", 422);
  }

  const incidents = await prisma.incident.findMany({
    where: {
      monitor: { project: { userId: result.user.id } },
      ...(status?.success ? { status: status.data } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { monitor: { select: { id: true, name: true, url: true } } },
  });

  return json({ data: incidents });
}
