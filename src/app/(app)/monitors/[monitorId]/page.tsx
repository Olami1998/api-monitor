import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { publicAuth, publicRequest } from "@/lib/monitor";
import { MonitorDetail } from "@/components/monitor-detail";

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ monitorId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { monitorId } = await params;
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, project: { userId: user.id } },
    include: {
      assertions: { orderBy: { createdAt: "asc" } },
      testRuns: { orderBy: { createdAt: "desc" }, take: 20 },
      incidents: { orderBy: { startedAt: "desc" }, take: 5 },
      project: true,
    },
  });
  if (!monitor) notFound();
  return (
    <MonitorDetail
      monitor={{
        ...monitor,
        request: publicRequest(monitor.request),
        auth: publicAuth(monitor.auth),
      }}
    />
  );
}
