import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, requestConfigSchema } from "@/lib/schemas";
import { getOwnedMonitor } from "@/lib/access";
import type { RouteParams } from "@/lib/route";

export async function PUT(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const parsed = parseBody(requestConfigSchema, await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);

  if (JSON.stringify(parsed.data).length > 1_000_000) {
    return error("VALIDATION_ERROR", "Request configuration is too large.", 422);
  }

  await prisma.monitor.update({
    where: { id: monitorId },
    data: { request: JSON.parse(JSON.stringify(parsed.data)) },
  });

  return json({ success: true });
}
