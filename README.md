# Sentinel

HTTP API monitoring: define an endpoint, assert what a good response looks like, run checks on a schedule, and inspect failures as expected vs actual.

The Next.js app owns authentication and CRUD. In production, a Node runtime loop inside the app claims due monitors, executes outbound HTTP from the server, evaluates assertions, opens/resolves incidents, and records in-app notifications. Jobs live in PostgreSQL (`TestRun.status = QUEUED`). `next dev` does not run that 5s loop by default.

## Why this shape

- **API handlers do not call customer APIs.** `POST /api/monitors/:id/run` only enqueues a run. A background worker performs the request. That keeps request timeouts and SSRF controls off the browser-facing latency path.
- **Credentials are encrypted at rest** (AES-256-GCM) and never returned by GET endpoints.
- **SSRF checks run at execution time**, including DNS resolution and redirect targets, not only when a URL is saved.
- **Incidents require two consecutive failures** so a single blip does not look like an outage. One passing run resolves the open incident.

## Local setup

1. Copy `.env.example` to `.env`. Paste your Neon connection string as `DATABASE_URL` (dashboard → Connect, include `sslmode=require`). If `prisma migrate` fails, also set `DIRECT_URL` to the **direct** host (no `-pooler`).

2. Install, apply migrations, and seed:

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with `demo@example.com` / `password123`, create a project, add a monitor (public `https` URL), add a status-code assertion, and click **Run test**.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL URI (pooled is fine for the app) |
| `DIRECT_URL` | Optional Neon **direct** URI (no `-pooler`) for `prisma migrate` |
| `ENCRYPTION_KEY` | 32-byte hex key for monitor credentials |
| `ENABLE_SCHEDULER` | Set `true` in `next dev` to run the 5s due-monitor loop. Production (`next start`) enables it unless you set `false`. |

## Main loop

```
Browser → Next.js API → PostgreSQL
                 ↓
         scheduler (every 5s)
                 ↓
            QUEUED TestRun
                 ↓
              worker fetch
                 ↓
         assertions → incidents → notifications
```

## Scripts

- `npm run dev` — app via webpack (avoids a Turbopack HMR crash that reloaded the browser); set `ENABLE_SCHEDULER=true` to also run the 5s scheduler
- `npx prisma db seed` — upsert `demo@example.com` and `tester@example.com` (`password123`)
- `npm test` — assertion, SSRF, and encryption unit tests
- `npm run typecheck` — `tsc --noEmit`
- `npx prisma studio` — inspect data

## Out of MVP

Teams, billing, public developer API, Slack/Discord, multi-region probes, and Redis/BullMQ. The database-backed queue is enough for a single instance; a dedicated worker + Redis is the scale-out path.
# api-monitor
