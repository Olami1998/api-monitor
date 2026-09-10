import { prisma } from "@/lib/prisma";
import { error, json } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { parseBody, projectSchema } from "@/lib/schemas";

export async function GET() {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const projects = await prisma.project.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { monitors: true } } },
  });

  return json({
    data: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      monitorCount: project._count.monitors,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const result = await requireUser();
  if ("response" in result) return result.response;

  const parsed = parseBody(projectSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return error("VALIDATION_ERROR", parsed.error, 422);
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      userId: result.user.id,
    },
    select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
  });

  return json(project, { status: 201 });
}
