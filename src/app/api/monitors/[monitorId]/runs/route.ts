import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getOwnedMonitor } from "@/lib/access";
import type { RouteParams } from "@/lib/route";

export async function GET(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const status = url.searchParams.get("status");

  const where = {
    monitorId,
    ...(status ? { status: status as never } : {}),
  };

  const [total, runs] = await Promise.all([
    prisma.testRun.count({ where }),
    prisma.testRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return json({
    data: runs.map((run) => ({
      id: run.id,
      status: run.status,
      httpStatus: run.httpStatus,
      durationMs: run.responseTime,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    })),
    pagination: { page, limit, total },
  });
}
