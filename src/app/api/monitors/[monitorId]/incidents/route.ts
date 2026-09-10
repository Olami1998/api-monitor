import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getOwnedMonitor } from "@/lib/access";
import type { RouteParams } from "@/lib/route";
import { incidentStatusSchema } from "@/lib/schemas";

export async function GET(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam ? incidentStatusSchema.safeParse(statusParam) : null;
  if (statusParam && !status?.success) {
    return error("VALIDATION_ERROR", "Invalid incident status.", 422);
  }

  const incidents = await prisma.incident.findMany({
    where: {
      monitorId,
      ...(status?.success ? { status: status.data } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ data: incidents });
}
