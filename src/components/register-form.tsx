"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export function RegisterForm({ inviteRequired }: { inviteRequired: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          invite: String(formData.get("invite") || searchParams.get("invite") || "") || undefined,
        }),
      });
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form method="post" action="/register" onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Name
          <input autoComplete="name" name="name" required className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Email
          <input autoComplete="email" name="email" type="email" required className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Password
          <input autoComplete="new-password" name="password" type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2" />
        </label>
        {inviteRequired ? (
          <label className="block text-sm">
            Invite code
            <input
              name="invite"
              defaultValue={searchParams.get("invite") ?? ""}
              required
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button disabled={pending} className="w-full rounded-lg bg-teal-800 px-4 py-2.5 text-white">
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already registered? <Link href="/login" className="text-teal-800 underline">Sign in</Link>
      </p>
    </main>
  );
}
