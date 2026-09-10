import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, projectPatchSchema } from "@/lib/schemas";
import { getOwnedProject } from "@/lib/access";
import { serializeMonitor } from "@/lib/monitor";
import type { RouteParams } from "@/lib/route";

export async function GET(_request: Request, context: RouteParams<{ projectId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const { projectId } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: result.user.id },
    include: { monitors: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) return error("PROJECT_NOT_FOUND", "Project could not be found.", 404);
  return json({
    project: {
      ...project,
      monitors: project.monitors.map(serializeMonitor),
    },
  });
}

export async function PATCH(request: Request, context: RouteParams<{ projectId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const parsed = parseBody(projectPatchSchema, await request.json().catch(() => null));
  if (!parsed.ok) return error("VALIDATION_ERROR", parsed.error, 422);

  const { projectId } = await context.params;
  const existing = await getOwnedProject(result.user.id, projectId);
  if (!existing) return error("PROJECT_NOT_FOUND", "Project could not be found.", 404);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    },
  });

  return json(project);
}

export async function DELETE(_request: Request, context: RouteParams<{ projectId: string }>) {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const { projectId } = await context.params;
  const existing = await getOwnedProject(result.user.id, projectId);
  if (!existing) return error("PROJECT_NOT_FOUND", "Project could not be found.", 404);

  await prisma.project.delete({ where: { id: projectId } });
  return new Response(null, { status: 204 });
}
