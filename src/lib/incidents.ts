import { prisma } from "@/lib/prisma";

const FAILURES_TO_OPEN = 2;

export async function applyRunOutcome(input: {
  monitor: { id: string; consecutiveFailures: number; name: string };
  ownerId: string;
  passed: boolean;
  failureReason: string | null;
}) {
  if (input.passed) {
    await prisma.monitor.update({
      where: { id: input.monitor.id },
      data: { consecutiveFailures: 0, health: "HEALTHY" },
    });
    const open = await prisma.incident.findFirst({
      where: { monitorId: input.monitor.id, status: "OPEN" },
    });
    if (open) {
      await prisma.incident.update({
        where: { id: open.id },
        data: { status: "RESOLVED", resolvedAt: new Date(), openMonitorId: null },
      });
      await prisma.notification.create({
        data: {
          type: "EMAIL",
          status: "SENT",
          recipient: (await prisma.user.findUnique({ where: { id: input.ownerId } }))?.email ?? "",
          sentAt: new Date(),
          userId: input.ownerId,
          monitorId: input.monitor.id,
          incidentId: open.id,
        },
      });
    }
    return;
  }

  const updated = await prisma.monitor.update({
    where: { id: input.monitor.id },
    data: {
      consecutiveFailures: { increment: 1 },
    },
  });
  const consecutiveFailures = updated.consecutiveFailures;
  const health = consecutiveFailures >= FAILURES_TO_OPEN ? "FAILING" : "DEGRADED";
  await prisma.monitor.update({
    where: { id: input.monitor.id },
    data: { health },
  });

  if (consecutiveFailures < FAILURES_TO_OPEN) {
    return;
  }

  const existing = await prisma.incident.findFirst({
    where: { monitorId: input.monitor.id, status: "OPEN" },
  });
  if (existing) {
    await prisma.incident.update({
      where: { id: existing.id },
      data: { failureReason: input.failureReason ?? existing.failureReason },
    });
    return;
  }

  const owner = await prisma.user.findUnique({ where: { id: input.ownerId } });
  try {
    const incident = await prisma.incident.create({
      data: {
        monitorId: input.monitor.id,
        status: "OPEN",
        startedAt: new Date(),
        failureReason: input.failureReason,
        openMonitorId: input.monitor.id,
      },
    });
    await prisma.notification.create({
      data: {
        type: "EMAIL",
        status: "SENT",
        recipient: owner?.email ?? "",
        sentAt: new Date(),
        userId: input.ownerId,
        monitorId: input.monitor.id,
        incidentId: incident.id,
      },
    });
  } catch {
    return;
  }
}
