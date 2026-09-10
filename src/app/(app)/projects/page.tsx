import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { monitors: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-[var(--muted)]">Group monitors by service or environment.</p>
      </div>
      <CreateProjectForm />
      <div className="grid gap-4 md:grid-cols-2">
        {projects.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Create a project to add your first monitor.</p>
        ) : null}
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"
          >
            <h2 className="text-lg font-medium">{project.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{project.description || "No description"}</p>
            <p className="mt-4 text-sm">{project._count.monitors} monitors</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
