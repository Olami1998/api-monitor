import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, updateMonitorSchema } from "@/lib/schemas";
import { nextRunAt, serializeMonitor } from "@/lib/monitor";
import { isSafeHttpUrl } from "@/lib/ssrf";
import { getOwnedMonitor } from "@/lib/access";
import { MAX_ENABLED_MONITORS_PER_USER } from "@/lib/limits";
import type { RouteParams } from "@/lib/route";

export async function GET(_request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, project: { userId: result.user.id } },
    include: { assertions: { orderBy: { createdAt: "asc" } } },
  });
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);
  return json({
    ...serializeMonitor(monitor),
    assertions: monitor.assertions,
  });
}

export async function PATCH(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const parsed = parseBody(updateMonitorSchema, await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);
  if (parsed.data.url !== undefined && !isSafeHttpUrl(parsed.data.url)) {
    return error("INVALID_URL", "Invalid monitor URL.", 422);
  }

  const enabled = parsed.data.enabled;
  if (enabled === true && !monitor.enabled) {
    const enabledCount = await prisma.monitor.count({
      where: { enabled: true, project: { userId: result.user.id } },
    });
    if (enabledCount >= MAX_ENABLED_MONITORS_PER_USER) {
      return error("VALIDATION_ERROR", "Enabled monitor limit reached.", 422);
    }
  }

  const intervalSeconds = parsed.data.intervalSeconds ?? monitor.intervalSeconds;
  const willBeEnabled = enabled ?? monitor.enabled;
  const intervalChanged =
    parsed.data.intervalSeconds !== undefined && parsed.data.intervalSeconds !== monitor.intervalSeconds;

  const updated = await prisma.monitor.update({
    where: { id: monitorId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
      ...(parsed.data.method !== undefined ? { method: parsed.data.method } : {}),
      ...(parsed.data.timeoutMs !== undefined ? { timeoutMs: parsed.data.timeoutMs } : {}),
      ...(parsed.data.intervalSeconds !== undefined ? { intervalSeconds: parsed.data.intervalSeconds } : {}),
      ...(enabled !== undefined
        ? {
            enabled,
            status: enabled ? "ACTIVE" : "PAUSED",
            health: enabled ? monitor.health : "UNKNOWN",
            nextRunAt: enabled ? nextRunAt(intervalSeconds) : null,
          }
        : intervalChanged && willBeEnabled
          ? { nextRunAt: nextRunAt(intervalSeconds) }
          : {}),
    },
  });

  return json(serializeMonitor(updated));
}

export async function DELETE(_request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  await prisma.monitor.delete({ where: { id: monitorId } });
  return new Response(null, { status: 204 });
}
