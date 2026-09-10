import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { runId } = await params;
  const run = await prisma.testRun.findFirst({
    where: { id: runId, monitor: { project: { userId: user.id } } },
    include: {
      monitor: true,
      assertionResults: { include: { assertion: true } },
    },
  });
  if (!run) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/monitors/${run.monitorId}`}>{run.monitor.name}</Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Test run</h1>
        <div className="mt-3 flex gap-3">
          <StatusBadge value={run.status} />
          <span className="text-sm text-[var(--muted)]">{formatDate(run.startedAt)}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">HTTP status</p>
          <p className="mt-1 text-2xl">{run.httpStatus ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">Duration</p>
          <p className="mt-1 text-2xl">{run.responseTime ?? "—"} ms</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">Size</p>
          <p className="mt-1 text-2xl">{run.responseSize ?? "—"} B</p>
        </div>
      </div>
      {run.errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{run.errorMessage}</p>
      ) : null}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="font-medium">Assertions</h2>
        <ul className="mt-4 space-y-3">
          {run.assertionResults.map((result) => (
            <li key={result.id} className="rounded-xl border border-[var(--line)] p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {result.assertion.type} {result.assertion.operator}
                </p>
                <StatusBadge value={result.passed ? "PASSED" : "FAILED"} />
              </div>
              <p className="mt-2 text-sm">Expected: {JSON.stringify(result.expected)}</p>
              <p className="text-sm">Actual: {result.actual ?? "—"}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{result.message}</p>
            </li>
          ))}
          {run.assertionResults.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No assertions were configured for this run.</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
