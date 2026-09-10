import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, createMonitorSchema } from "@/lib/schemas";
import { nextRunAt, serializeMonitor, defaultRequestConfig, defaultAuthConfig } from "@/lib/monitor";
import { isSafeHttpUrl } from "@/lib/ssrf";
import { getOwnedProject } from "@/lib/access";
import type { RouteParams } from "@/lib/route";

export async function GET(_request: Request, context: RouteParams<{ projectId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { projectId } = await context.params;

  const project = await getOwnedProject(result.user.id, projectId);
  if (!project) return error("PROJECT_NOT_FOUND", "Project could not be found.", 404);

  const monitors = await prisma.monitor.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return json({ data: monitors.map(serializeMonitor) });
}

export async function POST(request: Request, context: RouteParams<{ projectId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { projectId } = await context.params;

  const project = await getOwnedProject(result.user.id, projectId);
  if (!project) return error("PROJECT_NOT_FOUND", "Project could not be found.", 404);

  const monitorCount = await prisma.monitor.count({
    where: { project: { userId: result.user.id } },
  });
  if (monitorCount >= 50) {
    return error("VALIDATION_ERROR", "Monitor limit reached.", 422);
  }

  const parsed = parseBody(createMonitorSchema, await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);
  if (!isSafeHttpUrl(parsed.data.url)) return error("INVALID_URL", "Invalid monitor URL.", 422);

  const intervalSeconds = parsed.data.intervalSeconds ?? 300;
  const enabled = parsed.data.enabled ?? true;
  const monitor = await prisma.monitor.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      method: parsed.data.method ?? "GET",
      timeoutMs: parsed.data.timeoutMs ?? 10000,
      intervalSeconds,
      enabled,
      status: enabled ? "ACTIVE" : "PAUSED",
      projectId,
      nextRunAt: enabled ? nextRunAt(intervalSeconds) : null,
      request: defaultRequestConfig(),
      auth: defaultAuthConfig(),
    },
  });

  return json(serializeMonitor(monitor), { status: 201 });
}
