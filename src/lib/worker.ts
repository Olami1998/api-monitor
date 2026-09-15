import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { executeMonitorRequest } from "@/lib/execute";
import { writeRunResult } from "@/lib/run";
import { readRequestConfig } from "@/lib/monitor";
import { RUN_RETENTION_DAYS, STUCK_RUN_MS } from "@/lib/limits";

export async function recoverStuckRuns() {
  const cutoff = new Date(Date.now() - STUCK_RUN_MS);
  const stuck = await prisma.testRun.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] }, startedAt: { lt: cutoff } },
    select: { id: true, status: true },
  });
  for (const run of stuck) {
    if (run.status === "QUEUED") {
      await prisma.testRun.updateMany({
        where: { id: run.id, status: "QUEUED" },
        data: { status: "RUNNING" },
      });
    }
    await writeRunResult(run.id, {
      status: "ERROR",
      errorMessage: "Run was interrupted",
    }).catch(() => undefined);
  }
}

export async function pruneOldRuns() {
  const cutoff = new Date(Date.now() - RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.testRun.deleteMany({
    where: { createdAt: { lt: cutoff }, status: { notIn: ["QUEUED", "RUNNING"] } },
  });
}

export async function processQueuedRuns() {
  const queued = await prisma.testRun.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: { monitor: true },
  });

  const processed: string[] = [];

  for (const run of queued) {
    const claimed = await prisma.testRun.updateMany({
      where: { id: run.id, status: "QUEUED" },
      data: { status: "RUNNING" },
    });
    if (claimed.count !== 1) continue;

    try {
      const request = readRequestConfig(run.monitor.request);
      const result = await executeMonitorRequest({
        url: run.monitor.url,
        method: run.monitor.method,
        timeoutMs: run.monitor.timeoutMs,
        request: request as Prisma.JsonValue as {
          headers?: Record<string, string>;
          queryParams?: Record<string, string>;
          body?: unknown;
        },
        auth: run.monitor.auth as { type?: string; ciphertext?: string } | null,
      });
      await writeRunResult(run.id, result);
    } catch {
      await writeRunResult(run.id, {
        status: "ERROR",
        errorMessage: "Request failed",
      });
    }
    processed.push(run.id);
  }

  return processed;
}
