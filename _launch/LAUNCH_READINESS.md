# LAUNCH_READINESS.md — evidence-graded board

Runtime audit B-01, executed 2026-06-10 against C:/Users/Garrett/Sports @ safety/sports-wip-2026-06-04 (HEAD f897fd5).
Method: local bring-up (throwaway PG 18.3 on :5433 / stub mode), `next build` + `next start`, 40+ routes curled, full vitest suites run, code-line verification. **Every grade below carries evidence. A file existing is not a feature working.**

## Summary

| 🟢 Green | 🟡 Yellow | 🔴 Red | Total |
|---|---|---|---|
| **25** | **14** | **3** | 42 |

### Launch-distance statement

**Not launchable today, and the gap is narrower than it looks — but one defect is launch-fatal.**
The runtime surface is genuinely solid: the app builds and serves clean, all 23 public pages + health/readiness/data APIs behave correctly (fail-closed, honest empty states), auth/entitlement/compliance gates are enforced server-side and test-proven (700+ guardrail/compliance assertions green), and the deploy pipeline (migrate-in-build, crons, smoke tooling) is real. What stands between here and launch:

1. **Trust core defect (🔴):** away-favorite SPREAD picks grade WIN when they LOST by 1-2 points — proven live through the real scoring+settlement modules. Until fixed, every settled record, win rate, and future calibration sample is corrupted. ~1 day to fix.
2. **Code fixes:** the remaining 🔴/🟡 code work (baseline migration, seed repair, CLV sign, Stripe test coverage, header/rate-limit hardening, rollback runbook) is roughly **1–2 weeks of focused work**, most of it CODEX-laneable.
3. **Human gates (15 min each):** prod DB (B-02) and a working Odds API key (B-03) — nothing downstream of ingestion can be proven until these.
4. **The clock nobody can compress:** the B-04 launch gate requires ≥150 honestly graded picks. Once B-03/B-05 unblock and the settlement fix lands, the shadow season needs an estimated **3–6 weeks of daily generate→settle accumulation** before calibration eligibility.

**Estimated launch distance: ~4–8 weeks from today, gated primarily by the shadow-season sample, not by code. Confidence: MEDIUM** — high confidence in the platform surface (exhaustively exercised this audit), medium-low confidence in the calibration outcome because the engine has never been graded on real settled data, and the one component that produces that data (settlement) just failed its live exercise.

---

## Area 1 — Runtime bring-up + routes

| Item | Grade | Evidence (one line) |
|---|---|---|
| Docker/compose local DB bring-up | 🟡 | Docker Desktop daemon never came up (5.5 min poll, silent exit) AND compose maps 5432:5432 colliding with native postgresql-x64-18; fallback throwaway PG 18.3 on :5433 worked (`pg_isready` accepting). |
| prisma generate | 🟢 | `npx prisma generate` in packages/db completed clean (client emitted). |
| prisma migrate deploy (fresh DB) | 🔴 | Fails on migration #1 (20260522141600, 42P01 'relation "picks" does not exist') — 9 migrations, no baseline; fresh envs cannot bootstrap (prod unaffected, was baselined via db push). |
| DB seed (db:seed) | 🔴 | packages/db/prisma/seed.ts:1332+ is an orphaned merge fragment after main(); ERR_INVALID_TYPESCRIPT_SYNTAX + esbuild 'Unexpected "}"' at 1333:6 — seeding impossible at HEAD. |
| next build | 🟢 | `npm run build` exit 0; full route manifest, middleware 26.9 kB, shared first-load 87.3 kB. |
| next start runtime health | 🟢 | Ready in 370ms; zero error/warn lines across the 40+-route sweep; / 95ms, /api/board/state 13ms; ran clean with no Redis. |
| Public pages (23 routes) | 🟢 | All 23 pages + robots.txt + sitemap.xml returned 200 with real rendered bodies (picks 50.9 kB, home 74.0 kB). |
| Liveness/readiness APIs | 🟢 | /api/live 200; /api/health 200 honest-degraded (db ok, ingestion error true-on-fresh-DB); /api/ready 503 correct fail-closed. |
| Bootstrap-gated public APIs | 🟢 | /api/picks, /api/performance, /api/blog all 503 with self-identifying bootstrap-gate JSON + remediation hint — no masked success. |
| Open data APIs | 🟢 | board/state, board/passes, daily-slate, promotions (incl. 1-800-GAMBLER notice), calibration, brief all 200 with truthful empty payloads. |
| Auth-gated routes | 🟢 | /dashboard,/admin,/cockpit 307→signin without session; /api/admin/dashboard + /api/cockpit/jarvis 403; /api/dev/state 404 in prod mode. |
| Gated features (beat-the-model, explainer) | 🟢 | Both return the documented 404-when-off contract live (page gate :26-28; route gate :56-59; GET 405). |
| 404 + honest empty-state copy | 🟢 | Unknown routes 404; home shows truthful 'Sample: 0 canonical settled picks'; /performance carries explicit bootstrap labeling. |
| THE_ODDS_API_KEY presence/behavior | 🟡 | Present (name-only) in 3 env files; live validity unproven (was 401/quota June 5; deliberately not exercised) — covered by B-03. |

## Area 2 — Pick lifecycle + grading + calibration

| Item | Grade | Evidence (one line) |
|---|---|---|
| Scoring engine + publish gating | 🟢 | 229/229 prediction-engine tests pass; MIN_PUBLISH_CONFIDENCE=50 / MIN_BOOKMAKERS=2 / consensus 0.55 / ML 0.58 floors verified at code lines AND exercised live via scoreGame. |
| Readiness gates + isBootstrap provenance | 🟢 | 28/28 readiness tests pass; calibration adjustments hardcoded off (readiness.ts:100,124); isBootstrap written create-only (process-sport.ts:375-393). |
| Settlement pure math | 🟢 | 31/31 settlement tests pass incl. inverse-symmetry proof — correct for home-perspective lines per its documented contract. |
| **Settlement production wiring (away SPREAD)** | 🔴 | **Proven live: away-favored pick persisted line=-3 (chosen-perspective), away loses by 1, calculatePickResult returns WIN (expected LOSS) — every away-favorite spread grade is wrong; corrupts W/L, /api/performance, calibration sample.** |
| VOID + postponement edge cases | 🟡 | VOID exists in types/schema/UI/docs but NO code path ever writes it; postponed games leave picks PENDING forever (worker settles only completed scores, index.ts:109). |
| Settlement runtime topology | 🟡 | /api/cron/settle-picks is an authenticated NO-OP placeholder; real settlement only in the long-running worker — on Vercel-only prod, settlement never executes and the ok:true cron can mask it. |
| GateDecision writes (Wave-2) | 🟢 | 7/7 + 4/4 tests pass incl. fail-closed degraded board on DB-down; one row per evaluated game, never throws into ingestion (gate-decisions.ts:166-190). |
| Calibration engine as built | 🟢 | 41/41 calibration tests pass; 5 fixed buckets, Brier per-bucket+overall, PUSH=0.5, proposals need n≥30 AND |Δ|≥0.12, review-only; honest source query excludes bootstrap/seed. |
| B-04 calibration pipeline delta | 🟡 | Exists: buckets + Brier + proposal gate. Missing (code-verified): per-sport, trend, closing-implied comparison, CI, ≥150 eligibility gate, verdict, report generator — covered by B-04 (scope now precise). |
| CLV scaffold | 🟡 | 38/38 tests pass + wiring real, BUT: capture timing pulls post-completion (S-01), AWAY sign in computeClv is inverted (clv.ts:92-96), and pick.line is overwritten every refresh (lock bias) — would fabricate the honesty metric if data turned on today. |
| Shadow season feasibility (B-05) | 🟡 | Locally feasible in ~1 day ONCE: working key (B-03), DB bring-up (compose collision fixed), worker run via ts-node; settlement fix MUST land first or the sample is poisoned. |

## Area 3 — Money + auth + compliance

| Item | Grade | Evidence (one line) |
|---|---|---|
| Stripe wiring | 🟡 | Signature verification + 401s proven live; idempotency/lifecycle/tier-map verified in code; BUT zero automated tests touch the Stripe routes, keys are placeholders, lifecycle never exercised (B-09), and lib/stripe.ts:3 throws at import if key absent. |
| Entitlements FREE/PRO/ELITE on /api/picks | 🟢 | Gate is in the Prisma WHERE (route.ts:51) + server-side nulling (:138-148); 32/32 tests pass; live anon GET returns tier:FREE with confidence/factors locked. |
| Auth + role gating (middleware, DEV_FAKE_ADMIN) | 🟢 | 21/21 tests pass incl. prod-ignores-fake-admin; triple guard verified at lib/auth.ts:63-65 + entitlements.ts:20-22 + middleware.ts:27-28; live 307s confirmed on prod build. |
| Cockpit auth + compliance scanners | 🟢 | Every cockpit route checks role→401 (grep-complete); 621/621 compliance + 64/64 payload-guard tests green this audit. |
| Responsible-gaming surface | 🟢 | /responsible-play live-rendered with 1-800-GAMBLER, warning signs, NCPG/GA/self-exclusion links; footer helpline site-wide; 21+ language enforced by passing tests. |
| Legal pages (/terms, /privacy) | 🟡 | Both 200 with substantive product-specific content, BUT 'Last updated' is `new Date()` at render time (terms:30, privacy:25-28) — always reads as today, misrepresenting revision history. |

## Area 4 — Observability + security + performance + pipeline

| Item | Grade | Evidence (one line) |
|---|---|---|
| Observability library + seams | 🟢 | 17/17 tests pass; provider:"none" zero-egress proven; seams wired in error boundaries, cron, health, board degraded paths without altering payloads. |
| Production error visibility | 🟡 | capture.ts:96-97,117-118 never dispatches to any provider EVEN WITH keys (deferred by design); synthetic monitor exists + tests pass but is scheduled nowhere — uptime checks are human-invoked only. |
| Error resilience (degraded payloads) | 🟢 | 54/54 tests pass + live stub-mode exercise: picks 503 honest-degraded, ready 503 fail-closed, health 200-degraded, promotions/board honest-empty. |
| Security headers (runtime) | 🟢 | Live curl: XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS max-age=63072000 all served from next.config.mjs. |
| Security header parity + CSP | 🟡 | HSTS absent from vercel.json edge headers; Permissions-Policy diverges between the two sources; zero CSP anywhere; no test pins the header set. |
| Rate limiting + input validation | 🟡 | No inbound rate limit exists (middleware excludes api/; 10-request burst → ten 200s); zod in exactly one route; public GETs consume raw params (Prisma parameterization mitigates injection). |
| Cost tracking (Claude API) | 🟢 | 16/16 tests pass; budget/usage stores + cockpit surface + override route exist; guard:claude-api in the guardrails chain. |
| Odds API quota visibility | 🟡 | Client parses x-requests-remaining + classifies quota errors (14/14 truth-contract tests pass) BUT remainingRequests is console-log-only — invisible to the operator. |
| Performance (bundles, fonts) | 🟢 | 72 routes, median first-load 320 KB uncompressed (~100 KB gz), no outlier; fonts display:swap; three@0.184 is a dead dep (zero imports, not bundled). |
| Deploy pipeline (migrate-in-build + crons) | 🟢 | buildCommand runs migrate-if-configured before build (failure fails the build); 9 crons with CRON_SECRET auth; deploy:ready + smoke:prod tooling wired in package.json. |
| Rollback + staging | 🟡 | Rollback POLICY (triggers, GO/NO-GO) exists; the MECHANICAL alias-based rollback sequence is undocumented, DB rolls forward-only, and no prod-like staging environment exists. |

---

## The three reds, in one breath

1. **Away-spread settlement grades wrong picks as wins** (R-01) — launch-fatal, fix before any shadow-season pick settles.
2. **Fresh databases cannot be bootstrapped from migrations** (R-02) — DR/preview/new-dev blocker; prod unaffected today.
3. **Seed is syntactically broken at HEAD** (R-03) — blocks local/dev seeding; prod never seeds.

New tickets from this audit: see GAP_REGISTER.md → "Tickets from runtime audit B-01 (2026-06-10)".
