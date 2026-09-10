import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { monitors: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-[var(--muted)]">{project.description || "No description"}</p>
        </div>
        <Link
          href={`/monitors/new?projectId=${project.id}`}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white"
        >
          Add monitor
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {project.monitors.map((monitor) => (
              <tr key={monitor.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link href={`/monitors/${monitor.id}`}>{monitor.name}</Link>
                </td>
                <td className="px-4 py-3">{monitor.method}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={monitor.health} />
                </td>
                <td className="px-4 py-3">{monitor.enabled ? "Yes" : "Paused"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {project.monitors.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">No monitors in this project yet.</p>
        ) : null}
      </div>
    </div>
  );
}
