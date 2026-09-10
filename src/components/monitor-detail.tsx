"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

type Monitor = {
  id: string;
  name: string;
  url: string;
  method: string;
  health: string;
  enabled: boolean;
  timeoutMs: number;
  intervalSeconds: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  request: unknown;
  auth: unknown;
  project: { id: string; name: string };
  assertions: Array<{
    id: string;
    type: string;
    operator: string;
    target: string | null;
    expectedValue: unknown;
  }>;
  testRuns: Array<{
    id: string;
    status: string;
    httpStatus: number | null;
    responseTime: number | null;
    startedAt: Date;
  }>;
  incidents: Array<{ id: string; status: string; failureReason: string | null; startedAt: Date }>;
};

export function MonitorDetail({ monitor }: { monitor: Monitor }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const request = (monitor.request ?? {}) as {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: unknown;
  };
  const auth = (monitor.auth ?? {}) as { type?: string; configured?: boolean };

  async function runTest() {
    setError(null);
    try {
      const queued = await api<{ jobId: string }>(`/api/monitors/${monitor.id}/run`, { method: "POST" });
      setMessage("Test queued…");
      for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const run = await api<{ status: string; id: string }>(`/api/runs/${queued.jobId}`);
        if (!["QUEUED", "RUNNING"].includes(run.status)) {
          router.push(`/runs/${run.id}`);
          router.refresh();
          return;
        }
      }
      setMessage("Still running. Refresh shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run test");
    }
  }

  async function toggle() {
    await api(`/api/monitors/${monitor.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !monitor.enabled }),
    });
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this monitor?")) return;
    await api(`/api/monitors/${monitor.id}`, { method: "DELETE" });
    router.push(`/projects/${monitor.project.id}`);
  }

  async function addAssertion(formData: FormData) {
    setError(null);
    try {
      const expectedRaw = String(formData.get("expectedValue") ?? "");
      let expectedValue: unknown = expectedRaw;
      if (expectedRaw && !Number.isNaN(Number(expectedRaw))) expectedValue = Number(expectedRaw);
      await api(`/api/monitors/${monitor.id}/assertions`, {
        method: "POST",
        body: JSON.stringify({
          type: formData.get("type"),
          operator: formData.get("operator"),
          target: formData.get("target") || null,
          expectedValue,
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add assertion");
    }
  }

  async function saveRequest(formData: FormData) {
    setError(null);
    try {
      const headers = Object.fromEntries(
        String(formData.get("headers") ?? "")
          .split("\n")
          .map((line) => line.split(":").map((part) => part.trim()))
          .filter((pair) => pair[0])
          .map(([key, ...rest]) => [key, rest.join(":")])
      );
      const queryParams = Object.fromEntries(
        String(formData.get("queryParams") ?? "")
          .split("\n")
          .map((line) => line.split("=").map((part) => part.trim()))
          .filter((pair) => pair[0])
          .map(([key, ...rest]) => [key, rest.join("=")])
      );
      let body: unknown = null;
      const rawBody = String(formData.get("body") ?? "").trim();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
      await api(`/api/monitors/${monitor.id}/request`, {
        method: "PUT",
        body: JSON.stringify({
          headers,
          queryParams,
          body,
        }),
      });
      setMessage("Request configuration saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save request");
    }
  }

  async function saveAuth(formData: FormData) {
    setError(null);
    const type = String(formData.get("type"));
    const payload =
      type === "BEARER"
        ? { type, token: formData.get("token") }
        : type === "API_KEY"
          ? { type, key: formData.get("key"), value: formData.get("value") }
          : type === "BASIC"
            ? { type, username: formData.get("username"), password: formData.get("password") }
            : { type: "NONE" };
    try {
      await api(`/api/monitors/${monitor.id}/auth`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage("Authentication saved. Secrets are not shown again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save auth");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{monitor.project.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{monitor.name}</h1>
          <p className="mt-2 font-mono text-sm">{monitor.method} {monitor.url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={monitor.health} />
          <button type="button" onClick={() => void runTest()} className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">
            Run test
          </button>
          <Link href={`/monitors/${monitor.id}/edit`} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
            Edit
          </Link>
          <button type="button" onClick={() => void toggle()} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm">
            {monitor.enabled ? "Pause" : "Resume"}
          </button>
          <button type="button" onClick={() => void remove()} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-800">
            Delete
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-teal-800">{message}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">Timeout</p>
          <p className="mt-1 text-xl font-medium">{monitor.timeoutMs} ms</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">Interval</p>
          <p className="mt-1 text-xl font-medium">{monitor.intervalSeconds}s</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
          <p className="text-sm text-[var(--muted)]">Next run</p>
          <p className="mt-1 text-xl font-medium">{formatDate(monitor.nextRunAt)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="font-medium">Assertions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {monitor.assertions.map((assertion) => (
            <li key={assertion.id} className="flex justify-between gap-3">
              <span>
                {assertion.type} {assertion.operator} {assertion.target ?? ""} {String(assertion.expectedValue ?? "")}
              </span>
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={async () => {
                      await api(`/api/assertions/${assertion.id}`, { method: "DELETE" });
                      router.refresh();
                    }}
                  >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form action={addAssertion} className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="type" className="rounded-lg border border-[var(--line)] px-3 py-2">
            <option>STATUS_CODE</option>
            <option>RESPONSE_TIME</option>
            <option>HEADER</option>
            <option>JSON</option>
          </select>
          <select name="operator" className="rounded-lg border border-[var(--line)] px-3 py-2">
            <option>EQUALS</option>
            <option>NOT_EQUALS</option>
            <option>LESS_THAN</option>
            <option>GREATER_THAN</option>
            <option>EXISTS</option>
            <option>TYPE_IS</option>
            <option>CONTAINS</option>
          </select>
          <input name="target" placeholder="target / $.path" className="rounded-lg border border-[var(--line)] px-3 py-2" />
          <input name="expectedValue" placeholder="expected" className="rounded-lg border border-[var(--line)] px-3 py-2" />
          <button className="rounded-lg bg-stone-900 px-4 py-2 text-white md:col-span-4">Add assertion</button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={saveRequest} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-medium">Request</h2>
          <label className="mt-3 block text-sm">
            Headers (Header: value per line)
            <textarea
              name="headers"
              defaultValue={Object.entries(request.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")}
              className="mt-1 h-28 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            Query params (key=value per line)
            <textarea
              name="queryParams"
              defaultValue={Object.entries(request.queryParams ?? {}).map(([k, v]) => `${k}=${v}`).join("\n")}
              className="mt-1 h-20 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm">
            JSON body
            <textarea name="body" defaultValue={request.body ? JSON.stringify(request.body, null, 2) : ""} className="mt-1 h-28 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <button className="mt-3 rounded-lg border border-[var(--line)] px-4 py-2">Save request</button>
        </form>
        <form action={saveAuth} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
          <h2 className="font-medium">Authentication</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Secrets are encrypted and never returned by the API.</p>
          <select name="type" defaultValue={auth.type ?? "NONE"} className="mt-3 w-full rounded-lg border border-[var(--line)] px-3 py-2">
            <option>NONE</option>
            <option>BEARER</option>
            <option>API_KEY</option>
            <option>BASIC</option>
          </select>
          <input name="token" placeholder="Bearer token" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          <input name="key" placeholder="API key header name" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          <input name="value" placeholder="API key value" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          <input name="username" placeholder="Basic username" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          <input name="password" placeholder="Basic password" type="password" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          <button className="mt-3 rounded-lg border border-[var(--line)] px-4 py-2">Save auth</button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="font-medium">Test history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {monitor.testRuns.map((run) => (
            <li key={run.id} className="flex items-center justify-between gap-3">
              <Link href={`/runs/${run.id}`}>{formatDate(run.startedAt)}</Link>
              <span>{run.responseTime ?? "—"} ms</span>
              <StatusBadge value={run.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
