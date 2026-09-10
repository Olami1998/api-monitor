import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const owner = { project: { userId: result.user.id } };

  const [totalMonitors, healthy, degraded, failing, recentIncidents, recentRuns, avg] = await Promise.all([
    prisma.monitor.count({ where: owner }),
    prisma.monitor.count({ where: { ...owner, health: "HEALTHY" } }),
    prisma.monitor.count({ where: { ...owner, health: "DEGRADED" } }),
    prisma.monitor.count({ where: { ...owner, health: "FAILING" } }),
    prisma.incident.findMany({
      where: { monitor: owner },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: { monitor: { select: { id: true, name: true } } },
    }),
    prisma.testRun.findMany({
      where: { monitor: owner },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { monitor: { select: { id: true, name: true } } },
    }),
    prisma.testRun.aggregate({
      where: { monitor: owner, responseTime: { not: null } },
      _avg: { responseTime: true },
    }),
  ]);

  return json({
    summary: { totalMonitors, healthy, degraded, failing },
    recentIncidents,
    recentRuns,
    performance: { averageResponseTimeMs: Math.round(avg._avg.responseTime ?? 0) },
  });
}
