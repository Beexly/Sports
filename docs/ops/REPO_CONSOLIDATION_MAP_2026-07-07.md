# Repo Consolidation Map — 2026-07-07

Single source of truth for **what work exists, where it lives, and how to get it to a
shippable `main`.** Written after auditing the full remote (126+ branches). `main` has
not moved in this window (`a7bd5639`); nearly all recent work is stranded on unmerged
branches. This document accounts for all of it.

---

## EXECUTIVE DECISION — "reset the record?" → NO. Consolidate instead. (2026-07-07)

The instinct behind the question is right (too much branch sprawl, no single baseline).
But **"reset" is the wrong instrument** — it would destroy the two most valuable, hardest-
to-rebuild assets this company has. Three distinct things get called "the record":

1. **Git history / commit record → DO NOT RESET.** The signed, auditable commit trail
   *is* the integrity moat versus ESPN / Action Network / Genius Sports. "Prove it, don't
   assert it" only means something if the history is intact. Squashing/resetting throws
   away provenance for a cosmetic clean-up. Never do this.
2. **Prediction / calibration track record → NEVER RESET.** This is the revenue engine.
   Pricing is a proof-gated ladder (FOUNDING → PROVEN ≥100 settled → ESTABLISHED ≥500 +
   CLV ≥52.4% → AUTHORITY). Every settled pick is a rung toward charging more and making
   stronger, defensible claims. Resetting it zeroes the clock on the only thing that lets
   us raise prices honestly. It is the single most valuable non-code asset. Keep it running.
3. **A clean consolidated baseline branch → YES. This is what actually helps.** One green
   trunk that carries every verified engine, that `main` can fast-forward to. Same
   "fresh baseline" outcome the question is reaching for — with zero loss of provable record.

**Decision:** consolidate onto one trunk, preserve all history and the track record, prune
dead experiment branches, then take the trunk to `main` via a CI-verified PR (founder-gated).

### The trunk is already 90% built
`claude/nfl-pbp-expected-metrics-xb069r` (`5918b5dc`, **183 commits ahead of main**) already
absorbed the 171-commit codex program + the IP engine + security/correctness/data-integrity
hardening, and is **verified green** (204-page prod build, ~1,063 engine + ~7,500 web/pkg
tests, 14 guardrails, green Vercel previews on every push). It is the natural baseline.

### The other real, verified islands to fold in (each additive, each its own decision)
| Branch | Capability (new to GSE) | Fold-in note |
|---|---|---|
| `claude/consensus-accuracy-engine` (`57baff1`) | Fantasy multi-source consensus, accuracy-weighted by default; fixes FantasyPros' short-list loophole; 14 tests | Additive (new fantasy lib); merge + re-gate |
| `claude/dfs-optimizer-edge` (`c7ca41b8`) | Exact DFS solver + position-aware correlation v2 + competitive-intel docs; 19 tests | Additive (fantasy + engine); merge + re-gate |
| `claude/magical-feynman-j9180p` | `/dynasty` hub (rank ladder tied to real proof gates); 18 tests | Additive (new routes/lib); merge + re-gate |

**Coordination caveat:** these are being iterated in parallel sessions. Fold each in only
when its owning session says it is final, to avoid merging over live edits.

### Path to REVENUE (honest, no reset, no overclaim)
Revenue does not require a new engine — it requires getting the *proven, honest* surfaces to
production and selling the **tools + transparency**, not accuracy claims we have not yet earned.
Ordered:
1. Keep the track record running (never reset) so the pricing ladder can advance to PROVEN.
2. Fold the finalized islands onto the trunk; keep it green.
3. **Founder-gated:** open the CI-verified PR trunk → `main`, merge, promote the preview to a
   production deploy. (This is the one outward, hard-to-reverse step — it stays the owner's call.)
4. Sell Pro/Elite on the tool suite (optimizer, consensus, metrics, edge signals) + the public
   calibration/track-record page. Paywall enforcement is already server-side + tested.
5. Prune the ~120 dead experiment branches once their value is confirmed captured on the trunk.

## TL;DR

- **The GSE expected-metrics IP play is built, proven, and shipped** — our own
  CPOE / RYOE / xYAC computed from open play-by-play and validated against Next Gen
  Stats by correlation. This is build #2 from the NGS handoff, which was approved but
  never done.
- **The entire stranded `codex/sunday-frontier-maxforce` program (176 commits) is now
  consolidated onto `claude/nfl-pbp-expected-metrics-xb069r` and verified GREEN** for
  the first time: **~8,035 tests pass** (907 prediction-engine + 7,128 apps/web), all
  workspaces typecheck clean, all 14 guardrails + 34 eval-contracts pass. It was never
  broken — just never merged or CI-verified.
- **Two large lineages remain stranded and are NOT normally mergeable** — `jarvis/*`
  and `safety/*` share **no common ancestor with `main`** (unrelated histories). They
  are parallel builds needing a human strategic decision, not a merge.

## What shipped this session (on `claude/nfl-pbp-expected-metrics-xb069r`)

1. **Expected-metrics engine** — `packages/prediction-engine/src/expected-metrics/`
   (pure, deterministic, zero-dep): ridge + logistic regression primitives; fit-on-load
   expected-completion (→ GSE-CPOE), expected-rush-yards (→ GSE-RYOE), expected-YAC
   (→ GSE-xYAC); a validation bridge that correlates our per-player numbers against NGS
   ground truth (Pearson/Spearman/RMSE/MAE) with honest per-metric graduation
   thresholds and enforced grain discipline. 22 dedicated tests; CPOE recovers injected
   latent skill at Pearson > 0.85.
2. **Loader + route** — `apps/web/lib/nflverse/expected-metrics.ts` (fetch PBP → fit →
   compute → validate vs full NGS pool) + a premium-gated API route.
3. **Docs** — `docs/math/GSE_EXPECTED_METRICS.md` (metric bible) and
   `docs/data/NGS_GROUND_TRUTH_MAP.md` (nflverse CC-BY-4.0 legal map; NGS is a
   validation referee, never a re-served metric).
4. **Consolidation** — merged the 176-commit codex program on top, resolved the only
   two conflicts (the index.ts export barrel and EXECUTION_LEDGER) by union, and
   verified the whole tree green.

## Branch landscape — the full accounting

| Lineage | Commits vs main | Size | Relationship to main | Status / disposition |
|---|---|---|---|---|
| **`codex/sunday-frontier-maxforce-2026-07-05`** | +176 | ~1,088 files / +70k | **Clean superset** of main | **CONSOLIDATED + GREEN** on this branch. `claude/night-shift` (+97) is its ancestor — fully subsumed. |
| **`jarvis/intelligence-os-foundation-v1`** | +312 | ~1,878 files / +10k | **Unrelated history** (no common ancestor) | Parallel "Intelligence OS" (capability registry, agent council, memory protocol) + cockpit. Needs a strategic decision — see below. |
| `jarvis/command-interface-v1` / `v2` | +310 / +311 | ~1,884 files | Unrelated history | Owner command cockpit ("Mission Control"). Siblings of the OS branch. |
| `jarvis/os-foundation-fable5-v1` | +25 | ~1,910 files / +23k | Unrelated history | Fable-5 OS foundation. Newest jarvis head. |
| **`safety/sports-wip-2026-06-04`** | +185 | ~2,866 files / +67k | **Unrelated history** | Large WIP snapshot (secret-fixture hardening at head). Likely an alternative baseline; audit before adopting. |
| `research/proven-edge` | +5 | ~834 files / +5k | Diverged @`031de51` (related) | Proven-edge research/docs (Frontier Institution §19). Reviewable/mergeable. |
| `integration/proven-edge` | +0 | — | At main | Doc reconcile only; effectively already in main. |
| ~120 other branches (`claude/magical-volta-*`, older experiments) | varies | — | mixed | Mostly superseded experiment/checkpoint branches. Recommend triage + prune. |

### Why jarvis and safety can't just be merged

`git merge-base origin/main origin/jarvis/…` and `…origin/safety/…` return **empty** —
these branches have **no common ancestor with `main`**. A normal merge refuses
(`unrelated histories`); forcing it would produce thousands of conflicts. They are
effectively separate repositories/rewrites. Integrating them is a deliberate product
decision (adopt one as the new baseline, cherry-pick specific features across, or
archive), not a mechanical merge — and should not be done blind.

## Reconciliation — the IP engine vs the codex metrics framework

They are **complementary layers, not duplicates** (verified by reading both):

| Layer | What it is | Where |
|---|---|---|
| **Lower (this session)** | Empirical models **fit on real play-by-play** + **NGS-correlation proof** (`fitLogistic`/`fitRidge` → residual rollups → `buildCalibrationReport`/`graduationVerdict`). | `expected-metrics/` |
| **Upper (codex)** | Governance/scoring/exposure **shell** on hardcoded proxy coefficients: `metric-birth-certificate`, `metric-evidence-cards`, `residual-rollup`, `metric-graduation`, source/payload-rights, shadow-metric lifecycle. | `metrics/` |

The codex shell currently earns its `validationReport.status` from static placeholders;
our correlation-backed `graduationVerdict` is exactly the empirical proof it lacks.

### Next integration step (additive, founder-gated)

- Feed `computeCpoe/Ryoe/YacOverExpected` residuals into codex's `buildMetricResidualRollups`.
- Map our `graduated` verdict → codex's `evaluateMetricGraduation` PASS.
- Promote our `provenance` (modelVersion, featureSchemaHash, sampleSize) into the
  birth-certificate registry.
- Replace the loader's inline NGS fetch with codex's `nflverse-ngs.ts` typed bridge.

## Path to a working, deployed `main`

1. **Open a PR: `claude/nfl-pbp-expected-metrics-xb069r` → `main`.** This is the
   consolidated, green weekend program + the IP play. CI will verify it independently
   (the codex lineage has never had a CI run). Merge once green.
2. **Triage `research/proven-edge`** (small, related) — review and merge or fold in.
3. **Decide the jarvis question.** Is the "Intelligence OS" / cockpit the intended next
   product surface? If yes, adopt one jarvis head as a baseline and forward-port the
   now-consolidated metrics onto it (or cherry-pick jarvis features onto main). If no,
   archive. Do not blind-merge unrelated histories.
4. **Audit `safety/sports-wip`** — determine if it is a stale snapshot (archive) or an
   alternative baseline with unique value (cherry-pick).
5. **Prune** the ~120 superseded experiment branches to make the remaining work legible.

## Verification evidence (this branch, HEAD of consolidation)

- `npm run typecheck` — clean across packages/types, data-ingestion, ingestion-pipeline,
  prediction-engine, apps/web.
- `npx vitest` — prediction-engine **907/907**, apps/web **7,128/7,128**.
- `npm run guardrails` — all 14 scanners + 34 eval-contracts pass; 3,489 files
  secret-scanned clean.

---

## Best-of-the-best review campaign — progress log

A multi-wave adversarial review (correctness / honesty-gate / security / rights /
coverage), verified findings only, applied under full gates. Landed on this branch:

| Commit | Batch | Result |
|---|---|---|
| `761ebcbd` | Security: FANTASY→Pro **paywall leak** closed (+regression test), admin JWT revocation (DB re-resolve + fresh allow-list + 24h cap), clearance blocks automation on `technical_controls_detected` | apps/web 7,129 green |
| `b807e033` | **74 verified correctness + honesty-gate fixes** across every engine (e.g. `settlement` LA/LAC mis-grade, `scoring` totals-favorite inversion + fabricated consensus, `kelly` fabricated fair-prob + NaN leak, `edge-significance` Math.random, `market-read` under-round renorm, `game-context` push-inflated sample gate) | engine green |
| `bd70d651` | 4 late modules (`gse-action-score`, `model-parliament`, `performance-analytics/ci`) + deferred coverage | engine green |
| `a2458ede` | 92 behavior-preserving doc/clarity/robustness polish across engines | engine 1,063 green |
| `2a223c53` | Wave-4 product-lib fixes (revenue, fantasy, media, studio, cockpit, jarvis, fable, …) — 45 applied; reverted 1 over-strict claim scanner; fixed header-convention + trust-gate false-positive | apps/web 7,212 green |
| **build** | **`npm run build` — full Next production build: 204/204 pages compiled, deployable** | ✅ |
| (API wave) | **120 API routes reviewed** — cockpit/intelligence/nflverse/cron/webhooks/admin all EXCELLENT (server-side authz correct); fixed `/api/waitlist` rate-limit + input bounds, `/api/health` DB-error leak, `/api/picks/daily-slate` prod seed-exclusion | gating |

**Reviewed to date:** every prediction-engine metric + core framework + the IP engine
(43 modules), the core scoring/edge/CLV/Poisson/Kelly/calibration logic (18 groups),
apps/web security+rights+entitlement (9 subsystems), apps/web product libs (12 subsystems),
and all **120 API routes** (authorization/entitlement/input-validation). The full
production build passes (204 pages).

**Deliberate skips (not defects):** manual-research clearance on technically-blocked
sources (CLAUDE.md permits manual research; controls only bar automation); `studio/load.ts`
`isBootstrap` (field does not exist on the Prisma `Game` model — the "fix" would break the build).

## Session addendum — 2026-07-08 (post-merge; PR #65 landed on main, prod deployed)

Branch restarted from `origin/main` per merged-PR protocol; new work pushed on the same
branch name. Landed:

| Commit | What | Result |
|---|---|---|
| `fddd4beb` | **AWS Bedrock provider seam** (the cloud-credits play): zero-dep SigV4 signer pinned to AWS's `get-vanilla` known-answer vector; Bedrock `InvokeModel` adapter returning the exact `ClaudeMessagesResult` shape; `callClaude()` dispatcher (Bedrock only when `CLAUDE_PROVIDER=bedrock` + creds, Anthropic fallback on any error); env surface + strategy doc `docs/ops/CLOUD_CREDITS_MAXIMIZATION_STRATEGY_2026-07-08.md` | 20 tests; typecheck+lint clean |
| `0fe34272` | **Both logged coverage gaps closed**: team-rates-source (leakage-safety `before` cutoff, honest-empty, no fabricated anchor — 6 tests) + content-publishing worker kill switch (first worker test infra; default-ON refusal, no path to PUBLISHED — 5 tests). Honesty correction to the credits doc: all 7 system prompts sit below Sonnet 4.6's ~2048-token cache floor → prompt caching is currently a silent no-op; no savings booked | 145+5 green |
| `2e0e79a1`* | **Mirror supply-chain guard** (deferred ghproxy item): `fetchWithFailover` opt-in `validate(body, sourceUrl)` — tampered/truncated mirror bodies become recorded failover events; wired into the Lahman loader (poisoned host now fails over instead of failing the load) | 8 failover + 6 lahman green |

*commit id may differ — see `git log`.

Verified program intel (research agents, sourced): AWS Activate credits cover Anthropic
**only via Bedrock InvokeModel/Converse** — NOT Claude-Platform-on-AWS (Marketplace-billed)
and not general Marketplace SaaS; Google credits never cover third-party models. Partner
offers worth claiming from the Activate console: Datadog 1yr (claim BEFORE any organic
trial), Stripe $500 fee credit, Amplitude 1yr. Full table in the credits strategy doc.

## Workers adversarial review — 2026-07-08 (data-refresh / pick-generation / airwave)

Full verified review of the three remaining workers. **Fixed + pushed** (`d0920a7f`): H1
data-refresh Dockerfile missing ingestion-pipeline manifest (build failure); H2
pick-generation Dockerfile shell-in-COPY (build failure); M1 restart-loop on the two
run-once stub workers; M2 airwave dry-run wrong gate env names. Clean areas confirmed:
no fabricated values, strong freshness gate, race-safe idempotent settle, fail-closed
airwave gates, no secrets logged.

**Deferred — founder-gated (touch settlement/track-record, DB schema, or shared pipeline —
review before shipping):**

- **M3 — settlement horizon is a hardcoded 2 days, no backfill.** `settleSport` calls
  `getScores(sport, 2)`; after any >2-day outage of both the worker and the Vercel cron,
  completed games fall out of the scores feed and their picks stay PENDING forever
  (silently shrinks the settled denominator behind calibration). Fix = raise `daysFrom` to
  the API max **and** add a reconciliation pass that flags/voids picks whose game commenced
  > N days ago but is still PENDING. (Settlement-path change → founder review.)
- **M4 — worker "startup readiness" comment is false; per-sport results discarded.** A bad
  API key logs "Cycle complete" with 0 picks forever instead of failing loudly. Fix =
  aggregate per-sport results and fail/alert when the whole first cycle fails.
- **L2 — settlement polls all 7 sports year-round** (refresh season-gates; settlement does
  not) → ~480 wasted Odds-API credits/day out of season vs a 500/mo free tier. Fix =
  season-gate settlement with a ~1-month grace past `endMonth`. **Real cost lever**, but
  needs the grace-window trade-off reviewed so late playoff games still settle.
- **L4 — completed draws recorded as `result:"TBD"`** (`context-enrichment.ts`); the
  `GameLogResult` Prisma enum has no `DRAW`. MLS draws are routine final outcomes stored as
  indeterminate. Fix = add `DRAW` to the enum (**DB migration** → founder-gated; this is the
  previously-logged tie/draw enum item).
- **L1 — no graceful shutdown**: `docker stop` mid-cycle leaves `IngestionRun` rows stuck
  `RUNNING`; add a SIGTERM handler + a reaper. **L3 — TOCTOU** on the settled-pick freeze
  between the two concurrent settlement writers (scope the rewrite `updateMany` to PENDING).
  **L5** — `workers:refresh/picks` npm scripts run compiled `node dist` but workspace `main`
  fields point at `.ts` (Docker uses ts-node; the npm scripts don't work). **L6** —
  `mapMarket` throws on any unknown market key, failing a whole sport's cycle (skip-and-warn
  instead). **L7** — airwave `isWindowOpen` uses fixed-offset UTC math that disagrees with
  the DST-correct `centralTimeHour` at the edges (latent; dry-run prints the correct one).

## Ingestion-backbone review + conversion-funnel audit — 2026-07-08

**Ingestion backbone (adversarial review, verified):** FIXED + pushed: F1 HIGH side-flip
freeze (PENDING pick flipping sides on refresh desynced the frozen CLV lock/receipt →
fabricated CLV + wrong-line settlement; picks now freeze on flip with a loud log) and F6
CLV side-derivation prefix-collision (boundary-aware match, same as settlement).
**Deferred (founder-gated, data-path semantics):**
- F2 MEDIUM — per-game freshness gate admits stale per-book rows (freshest book passes the
  whole game); fix = row-level filter alongside freshGameIds. Touches consensus math.
- F3 MEDIUM — TeamGameLog ATS graded vs OPENING consensus spread, not the close (closing
  snapshot already computed in scope); systematically biased ATS form signal. Fix is
  one line but changes a recorded-metric convention → founder sign-off.
- F4 MEDIUM — rest-days/B2B uses floor(hours/24) not calendar days (ET) → phantom B2B flags.
- F5/F8 LOW (latent, unwired surfaces): Kalshi ticker UTC-date boundary; failover id-namespace
  contract for the future odds-api.io adapter. F7 LOW: network errors bypass the odds
  client's retry loop (only HTTP 429/5xx retry).
**Clean areas confirmed:** normalizer core math, freshness schedule, config seasons/credits,
source-health, fetch-failover, settle-sport (beyond logged items), openfootball, reddit,
nflverse-ngs mappings, kalshi devig/gating.

**Conversion-funnel audit (verified):** SHIPPED the safe set (nav/footer /picks links, public
price ladder on /pricing, honesty copy fixes, phase-derived prices on FAQ/picks, purchase-
success banner, sign-in callbackUrl, MLS tab, board title, dead-waitlist cleanup).
**Founder-gated conversion items:**
- Landing hero: point a primary/secondary CTA at /picks and/or /pricing with a founding-rate
  line (brand decision; currently routes to /board + /the-beat).
- 3-day money-back promise on /pricing is not backed by Terms §5 (discretionary wording) —
  align one way or the other (legal wording; recommend honoring + codifying).
- Anonymous 2-pick cap: decide free-sample vs account-capture posture (copy now honest
  either way); consider entitlements-FREE parity for anonymous.
- Resume-checkout after OAuth (carry tier/interval through signin → re-open checkout).
- Email/magic-link auth provider (Google-only is a hard wall for some paying customers).
- Grade filter no-ops for anonymous visitors (apply unconditionally or hide the row).

## Remaining queue (not yet done)

- **Un-reviewed subsystems** (breadth waves): workers ✅ **all four reviewed** (deploy
  blockers fixed 2026-07-08; design items logged above), data-ingestion + ingestion-pipeline,
  202 pages/components, docs quality. (API routes ✅ done; engine + product libs + security ✅
  done; build ✅ passing.)
- **Two deferred, non-critical API findings** (logged, low priority): `/api/picks/daily-slate`
  `sportBreakdown` is honest-empty in production (a per-sport-breakdown feature gap, not
  fabricated data — needs a grouped DB query); `/api/subscriptions/checkout`+`portal` have no
  per-user rate limit on Stripe resource creation (authenticated; defense-in-depth polish).
- **`claude/dfs-optimizer-edge`** (stranded worktree branch, 2 commits `aefe8074`+`8874f174`,
  held / not pushed): max-out DFS solver — exact solver (`dfs-exact.ts`) with FLEX-slot
  symmetry break, `minStack` provably-optimal QB stack, exact kBest, deterministic
  `diversePool`, and exact `lateSwap`/Swaptimize; position-aware correlation v2
  (`dfs-correlation.ts`) with bring-back + offense↔DST loadings + duplication risk;
  GPP on the deterministic k-best pool. 19 tests, typecheck clean. Gated to the
  illustrative slate via `activeDfsSlate()`. **Founder-gated to go live:** push + draft PR,
  wire the `/optimizer` UI (exact-cash + sim-ranked GPP + late-swap), and calibrate the
  correlation loadings against real outcomes before any public accuracy claim. Legally/
  correctness-review this branch and fold into the consolidation once verified.
- **Stranded lineages still pending a decision:** jarvis (312), safety (185),
  research/proven-edge (5) — as above.

## Constraint note

The subagent review fleet hit the account's **monthly spend limit** mid-campaign
(raise at claude.ai/settings/usage). Verification + commits continued in the main loop;
the remaining breadth waves are queued until budget resets.
