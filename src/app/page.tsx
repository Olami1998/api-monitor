import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-800">Sentinel</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
        Know when your APIs stop behaving, not just when they go down.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
        Monitor HTTP endpoints, assert status codes, latency, headers, and JSON contracts, then
        investigate incidents with expected vs actual results.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/register" className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white">
          Create account
        </Link>
        <Link href="/login" className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm">
          Sign in
        </Link>
        <Link href="/docs" className="rounded-lg px-4 py-2.5 text-sm text-teal-800 underline">
          Documentation
        </Link>
      </div>
    </main>
  );
}
