import { prisma } from "@/lib/prisma";
import { nextRunAt } from "@/lib/monitor";
import { MAX_ENABLED_MONITORS_PER_USER, MAX_QUEUED_RUNS_PER_USER } from "@/lib/limits";

export async function queueDueMonitors() {
  const due = await prisma.monitor.findMany({
    where: {
      enabled: true,
      status: "ACTIVE",
      nextRunAt: { lte: new Date() },
    },
    take: 25,
    orderBy: { nextRunAt: "asc" },
    include: { project: { select: { userId: true } } },
  });

  const createdRunIds: string[] = [];

  for (const monitor of due) {
    const quotaIds = await prisma.monitor.findMany({
      where: { enabled: true, project: { userId: monitor.project.userId } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
      take: MAX_ENABLED_MONITORS_PER_USER,
    });
    if (!quotaIds.some((row) => row.id === monitor.id)) {
      await prisma.monitor.update({
        where: { id: monitor.id },
        data: { nextRunAt: nextRunAt(monitor.intervalSeconds) },
      });
      continue;
    }

    const inflight = await prisma.testRun.count({
      where: {
        monitor: { project: { userId: monitor.project.userId } },
        status: { in: ["QUEUED", "RUNNING"] },
      },
    });
    if (inflight >= MAX_QUEUED_RUNS_PER_USER) {
      continue;
    }

    const running = await prisma.testRun.findFirst({
      where: { monitorId: monitor.id, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (running) continue;

    const run = await prisma.$transaction(async (tx) => {
      const claimed = await tx.monitor.updateMany({
        where: {
          id: monitor.id,
          enabled: true,
          nextRunAt: monitor.nextRunAt,
        },
        data: {
          nextRunAt: nextRunAt(monitor.intervalSeconds),
        },
      });
      if (claimed.count !== 1) return null;
      return tx.testRun.create({
        data: {
          monitorId: monitor.id,
          status: "QUEUED",
          startedAt: new Date(),
        },
      });
    });
    if (run) createdRunIds.push(run.id);
  }

  return createdRunIds;
}
