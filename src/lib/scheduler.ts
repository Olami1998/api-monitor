import { prisma } from "@/lib/prisma";
import { nextRunAt } from "@/lib/monitor";

export async function queueDueMonitors() {
  const due = await prisma.monitor.findMany({
    where: {
      enabled: true,
      status: "ACTIVE",
      nextRunAt: { lte: new Date() },
    },
    take: 25,
    orderBy: { nextRunAt: "asc" },
  });

  const createdRunIds: string[] = [];

  for (const monitor of due) {
    const running = await prisma.testRun.findFirst({
      where: { monitorId: monitor.id, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (running) continue;

    const claimed = await prisma.monitor.updateMany({
      where: {
        id: monitor.id,
        enabled: true,
        nextRunAt: monitor.nextRunAt,
      },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRunAt(monitor.intervalSeconds),
      },
    });
    if (claimed.count !== 1) continue;

    const run = await prisma.testRun.create({
      data: {
        monitorId: monitor.id,
        status: "QUEUED",
        startedAt: new Date(),
      },
    });
    createdRunIds.push(run.id);
  }

  return createdRunIds;
}
