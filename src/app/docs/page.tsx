import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation · Sentinel",
  description: "How to monitor HTTP APIs with Sentinel: projects, monitors, assertions, runs, and incidents.",
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick start" },
  { id: "projects", label: "Projects" },
  { id: "monitors", label: "Monitors" },
  { id: "assertions", label: "Assertions" },
  { id: "authentication", label: "Monitor auth" },
  { id: "runs", label: "Runs and schedule" },
  { id: "incidents", label: "Incidents" },
  { id: "security", label: "Security notes" },
  { id: "environment", label: "Environment" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            Sentinel
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link href="/login" className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-teal-800 px-3 py-1.5 font-medium text-white">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-800">Docs</p>
          <nav className="mt-4 flex flex-col gap-1 text-sm text-[var(--muted)]">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="rounded-md px-2 py-1 hover:bg-stone-100 hover:text-stone-900">
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="max-w-3xl space-y-8 pb-16">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Documentation</h1>
            <p className="mt-3 text-lg text-[var(--muted)]">
              Sentinel watches HTTP APIs, checks that responses still match the contract you defined, and opens
              incidents when they do not.
            </p>
          </div>

          <section id="overview" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Create a project, add a monitor (URL, method, interval), attach assertions, then let the scheduler
              enqueue runs. A background worker performs the request from the server. Two consecutive failures
              open an incident; one passing run resolves it.
            </p>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6">
              <li>Register or sign in</li>
              <li>Create a project</li>
              <li>Add a monitor with a public https URL</li>
              <li>Add at least a status-code assertion</li>
              <li>Click Run test, then inspect the run and any incident</li>
            </ol>
          </section>

          <section id="quick-start" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Quick start</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Copy <code className="rounded bg-stone-100 px-1">.env.example</code> to{" "}
              <code className="rounded bg-stone-100 px-1">.env</code>, paste your Neon{" "}
              <code className="rounded bg-stone-100 px-1">DATABASE_URL</code>, then:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-900 p-4 text-sm text-stone-100">
              {`npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev`}
            </pre>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Open{" "}
              <Link href="/" className="text-teal-800 underline">
                localhost:3000
              </Link>
              . Seed creates demo accounts documented in the repository README. Scheduled checks run automatically
              with <code className="rounded bg-stone-100 px-1">next start</code>. In{" "}
              <code className="rounded bg-stone-100 px-1">next dev</code>, set{" "}
              <code className="rounded bg-stone-100 px-1">ENABLE_SCHEDULER=true</code> if you need the 5s loop;
              otherwise use Run test.
            </p>
          </section>

          <section id="projects" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Projects</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Projects group monitors (for example by product or environment). Each project belongs to the account
              that created it. From a project you can add monitors and open their detail pages.
            </p>
          </section>

          <section id="monitors" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Monitors</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">A monitor is one HTTP check. You configure:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
              <li>Name, URL, and method (GET, POST, PUT, PATCH, DELETE)</li>
              <li>Timeout (500ms–30s) and interval (60s–24h)</li>
              <li>Optional headers, query parameters, and JSON body</li>
              <li>Enabled or paused (paused monitors are not scheduled)</li>
            </ul>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Only http and https URLs are allowed. Private, loopback, and link-local destinations are rejected
              when the check runs.
            </p>
          </section>

          <section id="assertions" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Assertions</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Assertions define a good response. A run fails if any assertion fails.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
              <li>
                <strong>Status code</strong> — for example equals 200
              </li>
              <li>
                <strong>Response time</strong> — for example less than 800ms
              </li>
              <li>
                <strong>Header</strong> — name exists or value contains a substring
              </li>
              <li>
                <strong>JSON</strong> — path such as <code className="rounded bg-stone-100 px-1">$.items[0].id</code>
              </li>
            </ul>
          </section>

          <section id="authentication" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Monitor auth</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Bearer, Basic, and API-key credentials are stored encrypted. GET APIs return only that auth is
              configured, not the secret. Put tokens on the monitor auth settings, not in custom{" "}
              <code className="rounded bg-stone-100 px-1">Authorization</code> headers.
            </p>
          </section>

          <section id="runs" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Runs and schedule</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Run test enqueues a job (<code className="rounded bg-stone-100 px-1">QUEUED</code>). The worker claims
              it, performs the HTTP request, and records status, latency, headers, and a truncated body. The
              browser never calls the customer API directly.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Statuses: queued, running, passed, failed, error, timeout.
            </p>
          </section>

          <section id="incidents" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Incidents</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              One failed run marks the monitor degraded. A second consecutive failure opens an incident. A passing
              run resolves the open incident. In-app notifications appear under Settings. Outbound email or Slack
              is planned for Version 2.
            </p>
          </section>

          <section id="security" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Security notes</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--muted)]">
              <li>Sessions use an httpOnly cookie. Sign out from Settings in the sidebar.</li>
              <li>SSRF checks run at execution time, including DNS and redirect targets.</li>
              <li>Auth headers are not forwarded across redirects.</li>
              <li>Set your own 32-byte hex <code className="rounded bg-stone-100 px-1">ENCRYPTION_KEY</code> before storing real secrets.</li>
            </ul>
          </section>

          <section id="environment" className="scroll-mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-xl font-semibold">Environment</h2>
            <div className="mt-4 overflow-x-auto text-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="py-2 pr-4 font-medium">Variable</th>
                    <th className="py-2 font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--muted)]">
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-2 pr-4 font-mono text-xs text-stone-800">DATABASE_URL</td>
                    <td className="py-2">Neon PostgreSQL connection string</td>
                  </tr>
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-2 pr-4 font-mono text-xs text-stone-800">ENCRYPTION_KEY</td>
                    <td className="py-2">64-character hex key for monitor credentials</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs text-stone-800">ENABLE_SCHEDULER</td>
                    <td className="py-2">true to run the 5s loop in next dev; production enables it by default</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
