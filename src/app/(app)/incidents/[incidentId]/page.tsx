import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { incidentId } = await params;
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, monitor: { project: { userId: user.id } } },
    include: { monitor: true },
  });
  if (!incident) notFound();

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        <Link href={`/monitors/${incident.monitorId}`}>{incident.monitor.name}</Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Incident</h1>
      <StatusBadge value={incident.status} />
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 text-sm">
        <p>Started: {formatDate(incident.startedAt)}</p>
        <p>Resolved: {formatDate(incident.resolvedAt)}</p>
        <p className="mt-4">
          Expected vs actual is recorded on the related test run. Failure reason:
        </p>
        <p className="mt-2 font-medium">{incident.failureReason ?? "Unknown failure"}</p>
      </div>
    </div>
  );
}
