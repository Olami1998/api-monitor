import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, assertionSchema } from "@/lib/schemas";
import type { RouteParams } from "@/lib/route";

export async function PATCH(request: Request, context: RouteParams<{ assertionId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { assertionId } = await context.params;

  const assertion = await prisma.assertion.findFirst({
    where: { id: assertionId, monitor: { project: { userId: result.user.id } } },
  });
  if (!assertion) return error("NOT_FOUND", "Assertion could not be found.", 404);

  const parsed = parseBody(assertionSchema.partial(), await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);

  const updated = await prisma.assertion.update({
    where: { id: assertionId },
    data: parsed.data as never,
  });

  return json(updated);
}

export async function DELETE(_request: Request, context: RouteParams<{ assertionId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;
  const { assertionId } = await context.params;

  const assertion = await prisma.assertion.findFirst({
    where: { id: assertionId, monitor: { project: { userId: result.user.id } } },
  });
  if (!assertion) return error("NOT_FOUND", "Assertion could not be found.", 404);

  await prisma.assertion.delete({ where: { id: assertionId } });
  return new Response(null, { status: 204 });
}
