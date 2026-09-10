"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function CreateProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description") || null,
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 md:flex-row md:items-end">
      <label className="flex-1 text-sm">
        Name
        <input name="name" required className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      <label className="flex-1 text-sm">
        Description
        <input name="description" className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      </label>
      <button className="rounded-lg bg-teal-800 px-4 py-2 text-white">Create</button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
