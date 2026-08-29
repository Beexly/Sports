# Grok 4.6 — full codebase + security audit

**Auditor:** grok-4.6 (xAI OAuth). **Tree:** `origin/main` `bb0e7dfc0` in worktree `C:/Users/Garrett/.cagent/Sports-audit-grok` on branch `hermes/grok46-full-audit-2026-08-27`. **Date:** 2026-08-27.

This is Phase B (read-only) plus measured tests. No gate flips. No schema/migration/.env/.github edits. No main merge.

## What prior sessions got wrong (corrected with evidence)

| Prior claim | Measured |
|---|---|
| `bb0e7df` missing on GitHub | `git fetch origin bb0e7df` looks for a **branch name**. `origin/main` **is** `bb0e7dfc0` (Merge PR #594). |
| `espn-odds-client.ts` / `rundown-client.ts` missing | Both exist at `packages/data-ingestion/src/` on this SHA. Prior grep only hit `.claude/worktrees/phase3/`. |
| Workspace = 16,417 files = the product | Dirty clone includes `.venv` (5413) + `.claude` (4486). Canonical tracked tree here: **5913 files** (secret-scan 5909). |
| next-auth unpatched (GHSA ≤ beta.31 / @auth/core < 0.41.3) | **Stale.** lockfile: `next-auth@5.0.0-beta.32` + `@auth/core@0.41.3`. Homoglyph mitigation still present (`apps/web/lib/auth/email-guard.ts`). |
| FINISH-LINE-PLAN on main | **Not on main.** PR **#677** is OPEN DRAFT (`claude/fable-5-registry-sync-ejp6pf`). |
| 11,770 web / 3,125 engine / 221 ingestion | Engine **3125 tests / 282 files PASS** this session. Ingestion **221 passed + 6 skipped**. Web file count **891** test files; **full web suite NOT RUN this session** (time). Trust-gate **2062 files OK**. Typecheck **0 errors**. |

## Inventory (`bb0e7dfc0`)

- Apps: `apps/web` only.
- Packages: ai-council, compliance, crypto, data-ingestion, db, dev-tools, epistemic-twin, feature-store, genesis-kernel, governed, ingestion-pipeline, ops, partner-stack, phase-c, prediction-engine, quote-plane, sql, stats-api, types, util.
- `vercel.json` crons: **21** routes (matches Claude's count).
- Test files on disk: 1297 (`*.test.ts(x)` / `*.spec.ts` under apps/packages/workers).

## Odds / kill-the-bill (code, not the local wrapper)

Live **FIRE** quotes (`createOddsQuoteProvider`, `packages/data-ingestion/src/odds-provider-adapter.ts:204-221`):

- `ODDS_PROVIDER=offline` → OfflineOddsProvider
- missing `THE_ODDS_API_KEY` → OfflineOddsProvider ("refusing to invent quotes")
- else The Odds API

**Rundown/ESPN are NOT in this factory.** They live in `packages/ingestion-pipeline/src/process-sport.ts` (refresh worker): Odds API → TheRundown (`assertIngestible("therundown")`) → ESPN public tertiary (`fetchEspnOddsForSport`, **no** `assertIngestible`).

Unsetting the paid key **does not** keep the live gate certifiable. That is a **code** gap, not an env flip. Local `galaxy-sports-api/` is **outside this repo** — cloud agents will not see it unless copied.

Registry (`source-registry.ts`):

- `espn-hidden-api` verdict **forbidden** (line 345–359)
- `therundown` verdict **use-with-caution** (ingestible; lines 489–505)
- `INGESTIBLE_VERDICTS` includes use-with-caution (lines 55–60)

**Legal tension (HIGH):** production refresh **calls ESPN** when Odds+Rundown empty (`process-sport.ts:407-432`) while the registry forbids `espn-hidden-api`. Client never calls `assertIngestible`. This is the ToS/litigation item. Safe next step (code, not a gate flip): skip ESPN unless a dedicated **cleared** source id exists, or stop calling it from `process-sport`. Do **not** weaken the registry.

## Tests run this session (observed)

| Suite | Result | Evidence |
|---|---|---|
| `npm run typecheck` (all workspaces) | **exit 0** | this worktree |
| `packages/data-ingestion` vitest | **44 files, 344 passed** | includes source-registry, rundown, espn-odds, odds-provider-adapter |
| `packages/ingestion-pipeline` vitest | **19 passed / 1 skipped, 221 passed / 6 skipped** | slate-opening integration skipped (no PG URL) — honest |
| `packages/prediction-engine` vitest | **282 files, 3125 passed** | CLV settlement tests included (`clv*.test.ts`, `settle` via pipeline) |
| `apps/web` vitest | **NOT RUN** this session | 891 files; do not quote Claude's 11,770 as re-measured |

## Guards run this session

OK: `guard:secrets` (5909 tracked), `trust-gate` (2062), `draft-only`, `affiliate-structural-separation`, `performance-claims`, `commercial-copy`, `partner-offers`, `api-payload-rights`, `no-zk-overclaim`, `sealed-holdout-open-scan`, `skipped-pg-integration-honesty` (2 skipped-green warnings), `actor-minting-boundary`.

NOT RUN (need longer / extra deps noted): `guard:model-freeze` (known red #419), `guard:api-v1-boundary` (known red #420), `guard:ai-control-plane-sealing`, `guard:claude-api`, full `npm run guardrails`.

## Security

**Green**

- Tracked-tree secret-scan clean. Placeholder `sk-ant-...` only in examples/docs/tests.
- Cron default **bearer_only** (`apps/web/lib/cron/authorize.ts`); dual x-vercel-cron is opt-in; unset CRON_SECRET → 500 fail-closed.
- `LIVE_BOARD_GATE_SLATE` must be exactly `"1"` (`load-gate-slate.ts`).
- Admin homoglyph gate wired in `isAdminEmail`.
- Affiliate engine/revenue layers structurally separated (guard OK).
- Sportsbook CPA: founder F-6 **no sportsbook/DFS affiliate**, permanently (ledger).
- CSP: production forbids `unsafe-eval` (test in `next-config-policy.test.ts`); `unsafe-inline` remains (MEDIUM, known).

**npm audit (dev+prod, this install):** 10 issues — **1 critical, 6 high, 3 moderate**. Critical is **vitest UI path traversal/RCE** GHSA-5xrq-8626-4rwp (`vitest < 3.2.6`; repo runs **vitest 2.1.9**). High: glob CLI injection (eslint-config-next chain), Next Image Optimizer DoS, postcss stringify XSS, vite optimized-deps path traversal. **Do not `npm audit fix --force`.** Owner-gated package.json bump. Vitest UI must not be exposed on a network.

**Auth stack:** next-auth beta.32 / @auth/core 0.41.3 — prior CRITICAL unpatched advisory **does not apply to this lockfile**. Keep email-guard anyway.

**Compliance / litigation**

- ESPN tertiary ingest vs forbidden registry: **open**. Prefer Rundown free key + Odds API; do not scrape DK/FD (forbidden).
- Kalshi Trade API remains `paid-required`; Rundown's Kalshi affiliate is licensed-feed via Rundown, not Kalshi Trade API.
- Pinnacle unofficial wrappers forbidden; public API shut 2025-07-23 (registry).
- StatsBomb / Ergast / Understat / PFR scrape forbidden (registry).
- Citations: registry `license.url` + `docsUrl` + `reason` per source; `assertIngestible` is the enforcement — **except ESPN client**.

**Founder-only (do not impersonate)**

- R-1 credential rotation (~25 keys in a transcript) still OPEN.
- P1–P5 probes (Vercel cron fire, Actions billing, prod migrate status, Stripe price IDs) **NOT RUN** — need founder consoles.
- F-7 prod SHA lag / anonymous premium surfaces: ledger claim at older SHA; **not re-fetched against live www this session**.

## Audit 2 — missed corners

1. Dirty clone `hermes/w2-audit-settlement` (`3b275df9b`) ≠ main. Do not treat untracked nflverse dumps as product.
2. `MASTER_PLAN_INDEX.md` is a copy of `CANONICAL.md` (same body). Claude called this out; still true on main.
3. `AGENTS.md` still warns `handoff/LEDGER.md` is frozen; live queue is this `AGENT_LEDGER.md`.
4. Kernel slots K1–K13: H0.5 BLOCKED waiting K11 — not on main (`no kernel/slots/` per ledger).
5. Credit governor (Phase 2 Finish Line) **not built**.
6. Local `C:/Users/Garrett/galaxy-sports-api/` (odds_feed.py server :8731) is **not in GitHub**. Cloud agents cannot see it.
7. PR #678 (Sports Intel orientation / RND-0827) OPEN — separate from this audit.
8. Dual-mode cron grep for `mode: "dual"` in cron routes: **0 hits** this pass (default bearer_only). Routes may still pass options differently — not fully proven.

## What to do before NFL kickoff (~9 days) — ranked, safe

**Founder (only you)**

1. Signup TheRundown free key; set `RUNDOWN_API_KEY`; confirm refresh-odds uses it (R-3/R-4). Do not scrape.
2. R-1 rotate leaked Hermes credentials.
3. Decide ESPN tertiary: **disable in process-sport** or accept ToS risk. Recommendation: **disable** until a cleared source id exists.
4. Do **not** flip LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS (Brier RED / CLV integrity open per ledger C-15/C-28).
5. Stripe cutover + webhook events remain founder (Finish Line Phase 1).
6. Merge or close draft PR #677 when you want Finish Line as the fleet queue; until then CANONICAL + this ledger win.

**Agents (this branch / follow-ups — still no main merge)**

1. Wire `assertIngestible` **or remove** ESPN from `process-sport` (legal).
2. Extend `createOddsQuoteProvider` with a Rundown-backed provider **or** point live gate at refresh-odds output (product honesty). Tests first.
3. Do not implement K1–K13 here (H0.5).
4. Do not bump vitest/next without an owner-gated package.json change.

## Never-do (reconfirmed)

No public ROI/win-rate. No sportsbook CPA. No fabricated odds. No gate flips. No prisma migrations. No `--no-verify`.
