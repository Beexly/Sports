# 07 — Data / Sources / Resilience Audit (current state)

**Grade: C+** — The just-shipped fail-closed truth contract is genuinely good and lands in the *deploy* clone, but the live data spine is a single, un-failed-over, once-a-day Odds-API pull whose freshness gate contradicts its own refresh cadence, and the read path that users actually see never checks freshness at all.

## Honest verdict

The deploy clone (`C:/Users/Garrett/Sports`) ingests exactly one external source for everything load-bearing: **The Odds API** (`packages/data-ingestion/src/odds-api-client.ts`), pulling `h2h/spreads/totals` for 7 sports. Everything else the engine "uses" — rest, schedule density, line movement — is *derived from that same odds pull*, and every richer context category (injuries, weather, officials, pace) is explicitly shadow/absent (`packages/ingestion-pipeline/src/process-sport.ts:70-96`, `packages/prediction-engine/src/evidence-readiness-matrix.ts`). The Phase-2 fail-closed truth contract is real and well-built: the cron route now keys off `processSport()`'s classified status and returns 200/207/502 instead of masking provider 401/403/429/5xx as success (`apps/web/app/api/cron/refresh-odds/route.ts:82-157`), backed by a pure, tested error classifier (`packages/data-ingestion/src/provider-status.ts`) and a regression test pinning the contract (`apps/web/__tests__/refresh-odds-truth-contract.test.ts`). That fixed the worst masked-success bug. But three gaps keep this from being trustworthy: (1) there is **no second odds provider and no failover** in the deploy clone — Odds API is a hard single point of failure; (2) the **60-minute freshness gate** in `/api/ready` (`apps/web/lib/health/checks.ts:8,59`) contradicts the **once-daily** cron cadence in `vercel.json` (`0 5 * * *` per sport), so readiness will report STALE/503 for ~23h of every day; and (3) the freshness gate lives **only** in the `/api/ready` monitoring probe — the user-facing read paths (`/api/picks`, board state/passes) never check ingestion age and will serve day-old odds labeled `dataStatus: "live"`. The canonical clone has built a strong resilience *toolkit* (failover, circuit breaker, legal source registry, nflverse adapter) but it is inert — none of it is wired into the live pipeline.

---

## Findings by severity

### P0 — launch-blocking / correctness

**P0-1 — Freshness gate (60 min) contradicts refresh cadence (24 h); `/api/ready` will be red almost all day.** *(deploy clone)*
`apps/web/lib/health/checks.ts:8` sets `FRESHNESS_MAX_AGE_MINUTES = 60` and `:59` fails `/api/ready` closed (→ 503) when the last `SUCCESS` ingestion is older than 60 minutes. But `vercel.json:8-36` schedules each sport's `refresh-odds` **once per day** (NFL `0 5 * * *`, NCAAF `0 6 * * *`, … MLS `0 11 * * *`). Between runs the newest successful ingestion is hours old, so for ~23 of every 24 hours `/api/ready` returns 503. Either the gate is wrong (too tight for a daily product) or the cron is wrong (should be ~30 min, which is what the route's own header comment claims at `apps/web/app/api/cron/refresh-odds/route.ts:5` and `vercel.json` does NOT do). As written they are mutually inconsistent and any uptime monitor wired to `/api/ready` will page continuously or be ignored.
**Recommendation (founder):** Decide the real freshness contract per sport, then make cron cadence and `FRESHNESS_MAX_AGE_MINUTES` agree (e.g., 30-min cron + 60-min gate, or a per-sport "is there a game in the next N hours" gate). Do not loosen the gate silently to make readiness green — pick a cadence that matches the promise.

**P0-2 — Single odds provider, zero failover, in the live deploy clone.** *(deploy clone)*
`processSport()` constructs exactly one `OddsApiClient` and aborts the whole sport on any failure (`packages/ingestion-pipeline/src/process-sport.ts:121-149`). There is no second aggregator and no `resolveOddsWithFailover` import anywhere in the deploy clone (Grep for `odds-failover|fetch-failover|source-health` in `Sports/packages` returns only a stray `types/world-model.test.ts` match). The entire board goes dark on a single Odds-API outage, key revocation, or quota exhaustion — and per memory, two GSE keys were already leaked/rotated on 2026-06-03, so this failure mode is not hypothetical. The fail-closed contract makes the outage *honest* (502, no stale-as-live), but it does not make the product *available*.
**Recommendation (founder):** This is the data-mesh 20-24 deliverable. Near-term, port the canonical `resolveOddsWithFailover` (`Sports-canonical-.../packages/data-ingestion/src/odds-failover.ts`) and wire a second independent book source (odds-api.io per the stack decision) behind a flag; until then, treat single-provider outage as a known launch risk and ensure monitoring actually pages on the 502.

### P1 — important (trust / UX / correctness-of-display)

**P1-1 — User-facing read paths never check freshness; stale data renders as `"live"`.** *(deploy clone)*
`/api/picks` gates only on bootstrap (`canExposePublicPicks`) and `isBootstrap:false`, then serves whatever is in the DB for "today" with no age check (`apps/web/app/api/picks/route.ts:11-73`). `loadBoardState` / `loadBoardPasses` return `dataStatus:"live"` and only fall back to `"degraded"` on a *thrown DB error*, never on staleness (`apps/web/lib/board/state.ts:192,282-289`; `apps/web/lib/board/passes.ts:83,109-124`). So if the daily cron fails for 2 days but Postgres is up, the public board confidently shows 2-day-old odds as live. The 60-min freshness signal exists (`lib/health/checks.ts`) but is not consumed by any of these surfaces.
**Recommendation:** Have the public read paths consult ingestion freshness (reuse `loadHealthChecks`/`FRESHNESS_MAX_AGE_MINUTES`) and downgrade `dataStatus` to `"degraded"` (or hide odds) when stale, with calm public copy. This is the read-side complement to the write-side truth contract already shipped.

**P1-2 — `/api/health` returns 200 even when ingestion is stale; only `/api/ready` 503s, and nothing internal consumes it.** *(deploy clone)*
`apps/web/app/api/health/route.ts:15` always returns HTTP 200 ("liveness_with_dependency_summary") even when `checks.ingestion.status === "error"`. The dependency-aware gate is `/api/ready` (`apps/web/app/api/ready/route.ts:15`, 503 when not ok), but Grep shows it is referenced only by its own route + tests + the prod-probe script — there is no middleware, no Vercel health-check binding, and no evidence an external uptime monitor pings it. A correct gate that nothing observes provides no resilience.
**Recommendation (founder):** Confirm an external monitor (or Vercel check) actually polls `/api/ready` and pages on 503/502; otherwise the truth contract fires into the void. Document the monitor in RUNBOOK.

**P1-3 — `validateFreshness` is a tautology on a just-set timestamp.** *(both clones)*
In `process-sport.ts:147` the pipeline calls `normalizer.validateFreshness(fetchedAt)`, but `fetchedAt = new Date()` is set one statement earlier (`:125`) and `validateFreshness` just checks `Date.now() - fetchedAt < 1h` (`packages/data-ingestion/src/normalizer.ts:91-94`). It can essentially never be false at this call site, so it is dead protection — it does not catch the real risk (the upstream Odds API returning *stale game data* with a fresh fetch time). Worth noting because it can read as "we validate freshness" when we don't.
**Recommendation:** Either validate the upstream event timestamps (`commence_time` / last-update) against now, or remove the check so it doesn't imply protection it doesn't give.

**P1-4 — Canonical refresh-odds still carries the masked-success bug the deploy clone fixed.** *(canonical clone)*
`Sports-canonical-2026-06-03/apps/web/app/api/cron/refresh-odds/route.ts:74-100` calls `processSport(...)`, discards the return, and unconditionally pushes `ok:true`, returning a default 200; canonical's `processSport` doesn't even return a `providerStatus`, and canonical's `data-ingestion/index.ts` does not export `PROVIDER_JOB_STATUS`/`classifyProviderError`. So the Phase-2 fix lives **only** in the deploy clone. If canonical is ever the build target, the masked-success launch blocker is back.
**Recommendation:** Reconcile — backport the truth contract + provider-status classifier into canonical (or formally designate `Sports` as the only deploy target and freeze canonical's cron). Track under the data-mesh reconcile.

### P2 — worth doing

**P2-1 — Resilience toolkit is built but inert in canonical (no live callers).** *(canonical clone)*
Canonical has a genuinely good kit: `odds-failover.ts` (provider-agnostic merge + lazy secondary), `source-health.ts` (closed/degraded/open circuit breaker with staleness), `source-registry.ts` (per-source legal verdict + `assertIngestible` guard), `nflverse-source.ts`, `kalshi-client.ts`, `fetch-failover.ts`. But `resolveOddsWithFailover` has zero callers outside its own test + the barrel export, `assessSourceHealth` has no app/pipeline consumer, and `nflverse-source.ts:16-18` states outright it "is not yet wired into the live pipeline." The nflverse/weather/Sleeper/MoneyPuck adapters feed *read-time feature pages* (Player Lab, weather page, intelligence engines) — not the scoring/ingestion spine.
**Recommendation:** Keep building toward the mesh (this is the 20-24 workstream). The audit point is only to be honest in the command center: these are scaffolding, not active resilience — the live spine today is single-source.

**P2-2 — nflverse/feature-source fetches have no shared caching/breaker at read time.** *(canonical clone)*
Feature surfaces fetch nflverse GitHub release assets and weather live (e.g., `apps/web/lib/nflverse/*`, `apps/web/lib/weather/game-weather.ts`). The built circuit breaker (`source-health.ts`) and `fetch-failover.ts` mirrors exist but aren't applied to these read-time fetches, so a GitHub/NWS hiccup degrades those pages ad hoc rather than through one governed path.
**Recommendation:** Route read-time source fetches through `fetchWithFailover` + a cache + `assessSourceHealth` so degradation is uniform and observable. (Deploy clone is unaffected — it ships none of these surfaces.)

**P2-3 — Coverage gaps are correctly modeled but the model isn't enforced as a publish gate end-to-end.** *(deploy clone)*
`evidence-readiness-matrix.ts` cleanly marks `player.availability` (injuries), `venue.environment` (weather), `official.tendencies`, `team.pace` as ABSENT/BLOCKED and only `market.odds` as required-and-active. That's honest. But the public board's pass reasons (`lib/board/passes.ts:30-34`) reduce to bookmaker depth / data-quality thresholds; the rich matrix integrityScore isn't surfaced to users as the reason a slate is thin.
**Recommendation:** Surface the readiness matrix's `nextBestActions`/blocked-critical reasons in the cockpit (founder) and a calm summarized form publicly, so "why no pick" traces to real missing sources.

### P3 — minor / polish

**P3-1 — Route comment lies about cadence.** *(both clones)* `refresh-odds/route.ts:5` says "every 30 minutes" / `*/30 * * * *`; the actual `vercel.json` is daily per sport. Fix the comment (or the schedule per P0-1).
**P3-2 — `classify429` defaults a signal-less 429 to QUOTA_EXHAUSTED.** *(deploy clone)* `provider-status.ts:135-136` — a deliberate, documented conservative choice (founder-actionable), but worth a monitoring note so a transient throttle without headers doesn't trigger a false "rotate the key" page.
**P3-3 — Inter-sport pause is a fixed 750 ms sleep, not quota-aware.** *(both)* `process-sport.ts`/cron loop `setTimeout(750)` — fine for daily cadence; revisit if cadence tightens (P0-1) so it reads `x-requests-remaining` (already parsed at `odds-api-client.ts:87`) to back off.

---

## Strengths (real, grounded)

- **The fail-closed truth contract is the right fix, done well.** A failed provider pull can no longer be reported as success: `processSport` records `IngestionRun` FAILED with the classified reason and returns it (`process-sport.ts:431-458`); the cron route maps outcomes to 200/207/502 (`refresh-odds/route.ts:139-157`); a dedicated regression test pins every branch including the old masked-success bug (`__tests__/refresh-odds-truth-contract.test.ts:97-115`). (deploy clone)
- **The error classifier is pure, secret-safe, and genuinely tested.** `provider-status.ts` maps 401/403→AUTH, 429→RATE_LIMITED vs QUOTA via real Odds-API headers (`x-requests-remaining`), 5xx/network→UNAVAILABLE, with a paired test file. No I/O, no env, no secret leakage by construction (`provider-status.ts:1-16`). (deploy clone)
- **Honest absence modeling.** The pipeline writes `BLOCKED_MISSING_SOURCE` shadow evidence for the 8 context categories it doesn't have (`process-sport.ts:81-96`) and the evidence-readiness matrix encodes trust/sample/age/failure-horizon per factor (`evidence-readiness-matrix.ts:71-241`). The system *knows and records* what it can't see rather than faking it. (both clones)
- **Source-level legal governance is excellent.** Canonical's `source-registry.ts` declares 25+ sources with real license/ToS, commercial-use verdicts, attribution lines, and an `assertIngestible` guard that physically blocks forbidden/paid sources (ESPN hidden API, PFR scraping, DK unofficial) from being wired. This is exactly the right posture for a regulated-adjacent product. (canonical clone)
- **Immutable provenance + snapshots.** Every pull is hashed and stored (`ingestion-pipeline/src/source-snapshot.ts`), and `PickSignalSnapshot` is write-once (`update:{}`) so the signal state at prediction time can't be rewritten — the foundation for honest later calibration. (both clones)
- **Bootstrap gating is threaded correctly.** `isBootstrap` is derived once from gates and propagated through games/picks/snapshots; bootstrap-era picks are never exposed publicly (`api/picks/route.ts:41`). (deploy clone)

---

## What would move this from C+ to A

1. **Make freshness and cadence agree, and per-game-aware (P0-1).** Replace the flat 60-min-vs-daily mismatch with a contract that says "fresh = refreshed within X of any game starting in the next window," cron cadence that meets it, and a gate that matches. A reader hitting `/api/ready` mid-day should get the truth, not a 23-hours-red signal everyone learns to ignore.
2. **Add a real second odds provider with failover on the live spine (P0-2).** Wire canonical's `resolveOddsWithFailover` + a second independent aggregator behind a flag so a single Odds-API outage/quota/key-revocation degrades coverage instead of blacking out the board. Founder-gated for the paid secondary, but the *plumbing* should exist and be tested in the deploy clone.
3. **Push the freshness gate into the user-facing read paths (P1-1, P1-2).** `/api/picks` and board state/passes must downgrade to `degraded` (or suppress odds) when ingestion is stale, and an external monitor must actually page on `/api/ready` 503/502. The write side is honest; make the read side honest too.
4. **Activate the circuit breaker for read-time sources and wire one independent context source (P2-1, P2-2, P2-3).** Route nflverse/weather fetches through `fetchWithFailover` + `assessSourceHealth`, and promote at least one currently-ABSENT factor (injuries via nflverse, or weather via NWS — both `cleared`/`cleared-with-attribution` in the registry) into the readiness matrix as ACTIVE so the engine is no longer 100% odds-derived. Each scoring wire-in stays a founder-gated MODEL_VERSION step.
5. **Reconcile the two clones (P1-4).** Backport the truth contract + classifier into canonical or formally freeze canonical's cron, so "fixed" means fixed everywhere that could ship.

> Scope note: per the audit constraints, the source-strategy deep dive (which providers, costs, contracts) is the parallel **data-mesh 20-24** workstream (`docs/command-center/data-mesh/`). This lens audits the **current live state** and the just-shipped fail-closed contract only; the recommendations above point at that workstream rather than re-deriving it.
