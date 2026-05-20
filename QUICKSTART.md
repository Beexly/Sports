# Quickstart — Sports Intelligence OS

## Path A — "I just want to see the dashboard" (no commands)

Open `OPEN_THIS_TONIGHT.html` at the root of this folder. It links to
rendered HTML snapshots of every critical route.

## Path B — Live dev server (stub DB, no Postgres needed)

```cmd
npm install
```

Create `apps\web\.env.local`:

```
DATABASE_URL=stub
DIRECT_URL=stub
NEXTAUTH_SECRET=dev-launch-night-secret
NEXTAUTH_URL=http://localhost:3000
DEV_FAKE_ADMIN=true
NODE_ENV=development
```

Then:

```cmd
npm run dev
```

Open:
- http://localhost:3000/cockpit — Jarvis Launch Observatory (auto-admin)
- http://localhost:3000/dashboard — customer dashboard
- http://localhost:3000/cockpit/history — pick ledger
- http://localhost:3000/performance — public performance

Stub-mode means all DB reads return empty; Jarvis correctly says
"NOT_READY_VALIDATION" with explicit blockers. This is the right state
to demo from before live data is flowing.

## Path C — Full local stack with Postgres + real Prisma

```cmd
docker compose -f docker\docker-compose.yml up -d
```

Update `apps\web\.env.local`:

```
DATABASE_URL=postgresql://sports:sports_dev_password@localhost:5432/sports_platform
DIRECT_URL=postgresql://sports:sports_dev_password@localhost:5432/sports_platform
FORCE_REAL_PRISMA=true
NEXTAUTH_SECRET=dev-launch-night-secret
NEXTAUTH_URL=http://localhost:3000
DEV_FAKE_ADMIN=true
NODE_ENV=development
```

Then push the schema and start:

```cmd
npm run db:generate
npm run db:push
npm run dev
```

Jarvis will report `NOT_READY_DATA` once the DB is reachable — that's the
real next-gate (no canonical picks yet). Run a data refresh worker and let
canonical picks accumulate before flipping `PERFORMANCE_STATS_ENABLED=true`.

## Path D — Production build

```cmd
npm run build
npm run start
```

Same env as Path B or C. The Next.js production server boots in seconds
once the build is cached.

## Validation

```cmd
npm run typecheck     :: tsc --noEmit, 0 errors
npm run test          :: vitest, 227/227 pass
npm run lint          :: eslint
npm run build         :: next build
```

## Notes

- `DEV_FAKE_ADMIN=true` is the launch-night escape hatch. It returns a
  synthetic ADMIN session so you can open `/dashboard` and `/cockpit`
  without configuring Google OAuth or running a real Postgres session
  table. **Never set this in production.**
- `FORCE_REAL_PRISMA=true` overrides the stub-mode check — useful when
  you need to see real connection errors instead of empty defaults.
- The launch-night report is at
  `reports/launch-night/run-dashboard-tonight.md`.
