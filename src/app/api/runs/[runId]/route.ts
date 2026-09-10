import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { summarizeAssertionResults } from "@/lib/assertions";
import type { RouteParams } from "@/lib/route";

export async function GET(_request: Request, context: RouteParams<{ runId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { runId } = await context.params;

  const run = await prisma.testRun.findFirst({
    where: { id: runId, monitor: { project: { userId: result.user.id } } },
    include: {
      assertionResults: {
        include: { assertion: true },
      },
      monitor: { select: { id: true, name: true, url: true, method: true } },
    },
  });
  if (!run) return error("NOT_FOUND", "Run could not be found.", 404);

  return json({
    id: run.id,
    status: run.status,
    httpStatus: run.httpStatus,
    durationMs: run.responseTime,
    responseSize: run.responseSize,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    monitor: run.monitor,
    assertions: run.assertionResults.map((item) => ({
      id: item.id,
      type: item.assertion.type,
      operator: item.assertion.operator,
      target: item.assertion.target,
      expected: item.expected,
      actual: item.actual,
      passed: item.passed,
      message: item.message,
    })),
    passedAssertions: summarizeAssertionResults(run.assertionResults),
  });
}
