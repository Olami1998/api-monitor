import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default async function IncidentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const incidents = await prisma.incident.findMany({
    where: { monitor: { project: { userId: user.id } } },
    orderBy: { startedAt: "desc" },
    include: { monitor: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Incidents</h1>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Monitor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link href={`/incidents/${incident.id}`}>{incident.monitor.name}</Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={incident.status} />
                </td>
                <td className="px-4 py-3">{formatDate(incident.startedAt)}</td>
                <td className="px-4 py-3">{incident.failureReason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {incidents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">No incidents recorded.</p>
        ) : null}
      </div>
    </div>
  );
}
