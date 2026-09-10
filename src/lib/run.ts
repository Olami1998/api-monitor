import { prisma } from "@/lib/prisma";
import { evaluateAssertions } from "@/lib/assertions";
import { applyRunOutcome } from "@/lib/incidents";

export async function writeRunResult(
  runId: string,
  input: {
    status: "PASSED" | "FAILED" | "ERROR" | "TIMEOUT";
    httpStatus?: number | null;
    responseTime?: number | null;
    responseSize?: number | null;
    errorMessage?: string | null;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
  }
) {
  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: { monitor: { include: { assertions: true, project: true } } },
  });

  if (!run) {
    throw new Error("Run not found");
  }

  const results = evaluateAssertions(run.monitor.assertions, {
    httpStatus: input.httpStatus,
    responseTimeMs: input.responseTime,
    responseHeaders: input.responseHeaders,
    responseBody: input.responseBody,
  });

  const assertionsPassed = results.every((result) => result.passed);
  const status =
    input.status === "PASSED" && assertionsPassed
      ? "PASSED"
      : input.status === "PASSED"
        ? "FAILED"
        : input.status;

  await prisma.$transaction([
    prisma.assertionResult.createMany({
      data: results.map((result) => ({
        assertionId: result.assertionId,
        testRunId: runId,
        passed: result.passed,
        actual: result.actual,
        message: result.message,
        expected: result.expected as never,
        actualValue: result.actualValue as never,
      })),
    }),
    prisma.testRun.update({
      where: { id: runId },
      data: {
        status,
        httpStatus: input.httpStatus ?? null,
        responseTime: input.responseTime ?? null,
        responseSize: input.responseSize ?? null,
        errorMessage: input.errorMessage ?? null,
        completedAt: new Date(),
      },
    }),
  ]);

  const failedAssertion = results.find((result) => !result.passed);
  await applyRunOutcome({
    monitor: run.monitor,
    ownerId: run.monitor.project.userId,
    passed: status === "PASSED",
    failureReason:
      input.errorMessage ??
      failedAssertion?.message ??
      (status === "PASSED" ? null : `Run ended with status ${status}`),
  });

  return { status, passed: status === "PASSED", results };
}
