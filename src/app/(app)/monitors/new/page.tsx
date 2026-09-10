"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";

function NewMonitorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ data: Array<{ id: string; name: string }> }>("/api/projects").then((payload) => {
      setProjects(payload.data);
    });
  }, []);

  async function onSubmit(formData: FormData) {
    setError(null);
    const projectId = String(formData.get("projectId") || "");
    try {
      const monitor = await api<{ id: string }>(`/api/projects/${projectId}/monitors`, {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          url: formData.get("url"),
          method: formData.get("method"),
          timeoutMs: Number(formData.get("timeoutMs")),
          intervalSeconds: Number(formData.get("intervalSeconds")),
        }),
      });
      router.push(`/monitors/${monitor.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create monitor");
    }
  }

  return (
    <form action={onSubmit} className="max-w-xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
      <label className="block text-sm">
        Project
        <select
          name="projectId"
          defaultValue={searchParams.get("projectId") ?? ""}
          required
          className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Name
        <input name="name" required className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      <label className="block text-sm">
        URL
        <input name="url" required placeholder="https://api.example.com/health" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      <label className="block text-sm">
        Method
        <select name="method" defaultValue="GET" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2">
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Timeout (ms)
        <input name="timeoutMs" type="number" defaultValue={10000} className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      <label className="block text-sm">
        Interval (seconds)
        <input name="intervalSeconds" type="number" defaultValue={300} className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-teal-800 px-4 py-2 text-white">Create monitor</button>
    </form>
  );
}

export default function NewMonitorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">New monitor</h1>
      <Suspense>
        <NewMonitorForm />
      </Suspense>
    </div>
  );
}
