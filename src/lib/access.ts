import { prisma } from "@/lib/prisma";

export async function getOwnedMonitor(userId: string, monitorId: string) {
  return prisma.monitor.findFirst({
    where: { id: monitorId, project: { userId } },
  });
}

export async function getOwnedProject(userId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
  });
}
