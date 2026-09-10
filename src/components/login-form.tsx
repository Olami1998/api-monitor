"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input autoComplete="email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Password
          <input autoComplete="current-password" name="password" type="password" required className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={pending} className="w-full rounded-lg bg-teal-800 px-4 py-2.5 text-white">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Need an account? <Link href="/register" className="text-teal-800 underline">Create one</Link>
      </p>
    </main>
  );
}
