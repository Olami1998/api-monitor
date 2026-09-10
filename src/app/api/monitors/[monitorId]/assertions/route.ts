import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, assertionSchema } from "@/lib/schemas";
import { getOwnedMonitor } from "@/lib/access";
import type { RouteParams } from "@/lib/route";

export async function POST(request: Request, context: RouteParams<{ monitorId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { monitorId } = await context.params;

  const monitor = await getOwnedMonitor(result.user.id, monitorId);
  if (!monitor) return error("MONITOR_NOT_FOUND", "Monitor could not be found.", 404);

  const parsed = parseBody(assertionSchema, await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);

  const assertion = await prisma.assertion.create({
    data: {
      monitorId,
      type: parsed.data.type,
      operator: parsed.data.operator,
      target: parsed.data.target ?? null,
      expectedValue: parsed.data.expectedValue as never,
    },
  });

  return json(assertion, { status: 201 });
}
