import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getOwnedMonitor } from "@/lib/access";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { kickWorker } from "@/lib/runtime";
import type { RouteParams } from "@/lib/route";

export async function POST(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  if (!rateLimit(`run:${clientKey(request, result.user.id)}`, 10, 60_000)) {
    return error("RATE_LIMITED", "Too many manual test runs.", 429);
  }

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const run = await prisma.testRun.create({
    data: {
      monitorId,
      status: "QUEUED",
      startedAt: new Date(),
    },
  });

  kickWorker();

  return json({ jobId: run.id, status: "QUEUED" }, { status: 202 });
}
