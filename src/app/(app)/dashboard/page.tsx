import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const owner = { project: { userId: user.id } };

  const [totalMonitors, healthy, degraded, failing, incidents, runs, avg] = await Promise.all([
    prisma.monitor.count({ where: owner }),
    prisma.monitor.count({ where: { ...owner, health: "HEALTHY" } }),
    prisma.monitor.count({ where: { ...owner, health: "DEGRADED" } }),
    prisma.monitor.count({ where: { ...owner, health: "FAILING" } }),
    prisma.incident.findMany({
      where: { monitor: owner },
      orderBy: { startedAt: "desc" },
      take: 6,
      include: { monitor: true },
    }),
    prisma.testRun.findMany({
      where: { monitor: owner },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { monitor: true },
    }),
    prisma.testRun.aggregate({
      where: { monitor: owner, responseTime: { not: null } },
      _avg: { responseTime: true },
    }),
  ]);

  const cards = [
    { label: "Monitors", value: totalMonitors },
    { label: "Healthy", value: healthy },
    { label: "Degraded", value: degraded },
    { label: "Failing", value: failing },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-[var(--muted)]">
            Average response {Math.round(avg._avg.responseTime ?? 0)} ms
          </p>
        </div>
        <Link href="/monitors/new" className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">
          New monitor
        </Link>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-medium">Recent incidents</h2>
          <ul className="mt-4 space-y-3">
            {incidents.length === 0 ? <p className="text-sm text-[var(--muted)]">No incidents yet.</p> : null}
            {incidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between gap-3">
                <Link href={`/incidents/${incident.id}`} className="text-sm">
                  {incident.monitor.name}
                </Link>
                <StatusBadge value={incident.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-medium">Recent runs</h2>
          <ul className="mt-4 space-y-3">
            {runs.length === 0 ? <p className="text-sm text-[var(--muted)]">No runs yet.</p> : null}
            {runs.map((run) => (
              <li key={run.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/runs/${run.id}`}>{run.monitor.name}</Link>
                <span className="text-[var(--muted)]">{formatDate(run.createdAt)}</span>
                <StatusBadge value={run.status} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
