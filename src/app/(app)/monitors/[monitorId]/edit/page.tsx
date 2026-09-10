"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Monitor = {
  name: string;
  url: string;
  method: string;
  timeoutMs: number;
  intervalSeconds: number;
};

export default function EditMonitorPage() {
  const { monitorId } = useParams<{ monitorId: string }>();
  const router = useRouter();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<Monitor>(`/api/monitors/${monitorId}`)
      .then(setMonitor)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load monitor"));
  }, [monitorId]);

  async function onSubmit(formData: FormData) {
    setError(null);
    try {
      await api(`/api/monitors/${monitorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.get("name"),
          url: formData.get("url"),
          method: formData.get("method"),
          timeoutMs: Number(formData.get("timeoutMs")),
          intervalSeconds: Number(formData.get("intervalSeconds")),
        }),
      });
      router.push(`/monitors/${monitorId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update monitor");
    }
  }

  if (error && !monitor) return <p className="text-red-700">{error}</p>;
  if (!monitor) return <p>Loading…</p>;

  return (
    <form action={onSubmit} className="max-w-xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
      <h1 className="text-2xl font-semibold">Edit monitor</h1>
      <input name="name" defaultValue={monitor.name} required className="w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      <input name="url" defaultValue={monitor.url} required className="w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      <select name="method" defaultValue={monitor.method} className="w-full rounded-lg border border-[var(--line)] px-3 py-2">
        {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
          <option key={method}>{method}</option>
        ))}
      </select>
      <input name="timeoutMs" type="number" defaultValue={monitor.timeoutMs} className="w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      <input name="intervalSeconds" type="number" defaultValue={monitor.intervalSeconds} className="w-full rounded-lg border border-[var(--line)] px-3 py-2" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-teal-800 px-4 py-2 text-white">Save</button>
    </form>
  );
}
