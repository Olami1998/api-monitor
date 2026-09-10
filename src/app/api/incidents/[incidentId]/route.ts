import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import type { RouteParams } from "@/lib/route";

export async function GET(_request: Request, context: RouteParams<{ incidentId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { incidentId } = await context.params;

  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, monitor: { project: { userId: result.user.id } } },
    include: { monitor: { select: { id: true, name: true, url: true } } },
  });
  if (!incident) return error("NOT_FOUND", "Incident could not be found.", 404);

  return json(incident);
}
