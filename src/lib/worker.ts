import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { executeMonitorRequest } from "@/lib/execute";
import { writeRunResult } from "@/lib/run";

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
      const result = await executeMonitorRequest({
        url: run.monitor.url,
        method: run.monitor.method,
        timeoutMs: run.monitor.timeoutMs,
        request: run.monitor.request as Prisma.JsonValue as {
          headers?: Record<string, string>;
          queryParams?: Record<string, string>;
          body?: unknown;
        } | null,
        auth: run.monitor.auth as { type?: string; ciphertext?: string } | null,
      });
      await writeRunResult(run.id, result);
    } catch (error) {
      await writeRunResult(run.id, {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Worker failed",
      });
    }
    processed.push(run.id);
  }

  return processed;
}
