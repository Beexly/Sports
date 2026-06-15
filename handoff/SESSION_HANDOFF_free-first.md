# Session Handoff — Free-First Data Layer

**Branch:** `claude/happy-euler-trkihe` (push here only; never to another branch without explicit OK)
**Date:** 2026-06-15 · **State:** all work committed + pushed, branch in sync.
**Tests:** full apps/web suite green — **373 files / 5109 tests, 0 failures.**
**Typecheck:** green **after** `npm run db:generate` (fresh sandboxes lack the Prisma client →
8 spurious implicit-`any` errors in `packages/data-ingestion`; CI generates the client, so
ignore them — do NOT "fix" that correct code).

## The mission (owner's words)

Owner is unemployed, saving every dollar, but wants a "king of stats" picks platform.
Directive: **exhaust every FREE, already-cleared data source before spending a cent** — but
cost-saving must **never** lower quality. Facts only, attribution preserved, rights-gated
(see root `CLAUDE.md` "Legal Scraping Posture"). No fake data, server-side paywalls only.

## What exists now (all free, no key, cleared, facts-only)

Read `docs/FREE_FIRST_DATA.md` first — it's the map. Key modules in
`apps/web/lib/data-sources/`:

- **free-adapters/** — pure parsers + fetchers, schemas verified live, fixture-tested:
  `espn-scores` (7 sports; supports `dates` targeting), `espn-rankings`, `espn-standings`,
  `henrygd-ncaa` (NCAA football + basketball; `HENRYGD_PATHS`), `open-meteo` (weather).
- **source-router.ts** — free-first, cleared-only, quality-ranked routing. `freeCoverageMatrix()`,
  `planIngestion()`. henrygd is registered but `cleared:false` (redistribution posture unconfirmed —
  it's used for cross-check/verification, not redistribution).
- **cost-policy.ts** — `paidCallJustified()` spend guard. **Odds is the ONLY need that still
  justifies spend.** `season-gating.ts` keeps Odds API free credits for in-season sports.
- **free-stats.ts** — TTL-cached facade. **free-first-ingest.ts** — `fetchScoresFreeFirst` /
  `fetchWeatherFreeFirst`. **cfb-free.ts** — `getCfbSnapshot()`.
- **ncaa-consensus.ts** — sport-agnostic cross-source trust: `crossCheckNcaaScores()` joins
  ESPN ↔ henrygd by stable team **abbreviation** + date proximity (±1d), → CONFIRMED /
  DISPUTED / coverage gaps. `resilientNcaaScores()` fails over free→free.
- **ncaa-scores.ts** — `fetchNcaaScoresResilient(sport)`: ESPN primary → henrygd fallback, unified shape.
- **free-settlement.ts** — `buildTrustedFinals()` (CONFIRMED/SINGLE_SOURCE/DISPUTED) +
  `settlePendingPicks()` (grades via engine `calculatePickResult`, **HOLDS disputed**, leaves
  unmatched PENDING). PURE — not yet wired to a worker.
- **score-verification.ts** — index/cross-check our recorded scores vs free finals.

Verify any time: **`npm run free:doctor`** (hits every free source live, proves cross-source
NCAA confirmation, $0 spend; exits non-zero on failure). Last run: 12/12 ok.

## #1 next task (deliberately held — needs a decision + a DB)

**Route `settleSport()` through the free trusted-finals path to remove the LAST paid dependency.**
- Today: `packages/ingestion-pipeline/src/settle-sport.ts` calls the **paid** Odds API
  `client.getScores()` and matches finals to games by `externalId`.
- The free path (`buildTrustedFinals` + `settlePendingPicks`) matches by **team name + date**,
  not `externalId`. So this is a **settlement matching-semantics change on money-critical code.**
- Why held: no DB in the sandbox to validate; settlement feeds the settled track record behind
  the proof-gated pricing ladder. Don't ship blind. The pure primitives are built + tested.
- How to do it safely: extend `settle-sport.test.ts` (it mocks `db`), add free scores as an
  injected source that defaults OFF (no behavior change unless enabled), confirm name+date
  matching + DISPUTED-holds against the mock, THEN validate against a real DB before enabling.

## Other open threads (lower priority, mostly safe)

- **Owner-review batch:** `handoff/codex/galaxy-2026-limit-push/OWNER_REVIEW_BATCH_01.md` has
  bulk decisions drafted for the 721 gated resource-dump items (adopt ~12 self-host RSS readers;
  reject copyrighted replays + out-of-scope tools). Waiting on owner to accept buckets.
- **CFBD** (College Football Data API) — free with registration, DEEP CFB stats; needs a terms
  read + owner clearance before wiring. The real "king of stats" CFB depth source.
- **Self-host henrygd** to drop the public-demo 5 req/sec cap: `docker/docker-compose.yml`
  service `ncaa-api`, then set `HENRYGD_NCAA_BASE_URL`.
- Women's basketball (`HENRYGD_PATHS.wbb`) would need a new `Sport` union member + ESPN path
  (`womens-college-basketball`) — touches core types, so scope it deliberately.

## Working rules / gotchas

- Run `npm run db:generate` once before trusting typecheck. Tests run without a DB (stub Prisma).
- `tsx` is not a local bin — scripts use `npx tsx`. ESLint has no config under `scripts/`.
- Commit in verified increments (tests + lint + typecheck) before pushing. No PR unless asked.
- Do NOT put the model id / internal identifiers in commits, code, or docs.
- **Owner still needs to ROTATE the two API keys** pasted earlier in the session — everything
  stays env-var-only on our side; never hardcode secrets.

## Quick orientation commands

```bash
npm run free:doctor                                   # live proof of $0 operation
npm run test --workspace=apps/web -- __tests__/ncaa-consensus.test.ts __tests__/free-settlement.test.ts
git log --oneline c7080d72..HEAD                      # this session's commits
```
