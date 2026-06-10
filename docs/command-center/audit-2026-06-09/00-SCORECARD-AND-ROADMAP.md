# 00 — Scorecard & Prioritized Roadmap — Founder Audit 2026-06-09

**Scope:** Synthesis of the eleven-lens read-only audit across the two clones —
**DEPLOY** = `C:/Users/Garrett/Sports` (the launch target; narrower picks/board product) and
**CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` (the full platform).
This document grades all eleven dimensions, sequences every P0/P1/P2 finding into a plan, and
carves out a 30-day path to a safe launch with a provably honest engine. It is built from the
per-lens findings (`01`–`11`) and the executive summary (`00-EXECUTIVE-SUMMARY.md`).

**Read-only, doc-only:** nothing below is an instruction to flip a switch. Every money/legal/regulated
item is called out and routed to FOUNDER/LEGAL, never auto-scheduled.

---

## 1. Scorecard

| # | Dimension | Clone(s) | Grade | One-line rationale |
|---|-----------|----------|:-----:|--------------------|
| 01 | Aesthetic / Design | both | **B−** | CANONICAL design system is A-grade senior work (AA-documented tokens, reduced-motion-safe cinematic layer); DEPLOY ships the old raw-`gray-950` system with 1696 raw-neutral occurrences and no surface tokens — what launches isn't what was matured. |
| 02 | Product / IA / UX | both | **B−** | DEPLOY is a lean, launch-coherent funnel (B+ alone); CANONICAL is the full platform with good consolidation but 6+ orphaned pages and nav that surfaces under half the product (C+) — two products, two front doors, unreconciled. |
| 03 | Brand / Marketing / Copy | both | **B−** | Genuinely human copy and a real CI-enforced trust-claims/banned-phrase registry, undercut by a positioning identity crisis (3 headlines), a helpline-number conflict, and a host-canonicalization bug. |
| 04 | Financials / Monetization | both | **B−** | Production-grade Stripe (signature-verified idempotent webhook) and a good spend governor, but two clones ship two **incompatible** pricing + Stripe-wiring systems — whichever tree deploys decides what customers are charged. |
| 05 | Departments / Heads / Process | both | **B** | Real wired operator PROCESS (ingestion→scoring→publish-gate→board, honest cron, every regulated step human-gated) + DB-backed Jarvis + substantive guardrail-script CI gates; held to B because the Department-Heads cockpit and Compliance-Program model are CANONICAL-only (absent from the launch tree) and DEPLOY's HEAD branch matches no CI trigger. |
| 06 | Engine / Accuracy / Trust | both | **B−** | A-grade trust scaffolding (evidence-only calibration that can never auto-apply, fail-closed performance surface, leak-proof audit endpoint) wrapped around a C-grade circular edge (`trueEvScore`/`fairProbability` hardcoded null). |
| 07 | Data Sources / Resilience | both | **C+** | The just-shipped fail-closed truth contract is excellent, but the live DEPLOY spine is single-source (one Odds API, no failover), the 60-min freshness gate contradicts the daily cron, and CANONICAL's resilience toolkit is built-but-inert. |
| 08 | Code / Architecture / Health | both | **B−** | Strict TS, near-zero escape hatches/debt, mature CI matrix and real guardrail scripts — pulled down by structural two-clones drift (schema/migrations/CI-trigger) where DEPLOY is the weaker twin on shipping correctness. |
| 09 | Security / Compliance / Legal | both | **B+** | Compliance-as-code is the crown jewel (fail-closed promotions gate with zero approved partners, Airwave refusal-by-default, leakage CI gate); held below A only by the CANONICAL `DEV_FAKE_ADMIN` prod-guard gap, a dropped HSTS header, and honestly-unbuilt regulated controls. |
| 10 | Launch Readiness | both | **B−** | Launch *engineering* is strong (correct liveness/readiness split, fail-closed cron, scope genuinely cut) but not launchable *today*: DB+ingestion unprovisioned, cron/freshness contradiction, migrate-in-build + HSTS missing from DEPLOY. GO-WITH-FIXES. |
| 11 | Performance / Reliability / Observability | both | **C+ (deploy) / B (canonical)** | Good instincts (fail-closed health, excellent WebGL/RSC bundle hygiene in CANONICAL) but the full observability stack is CANONICAL-only — a real prod incident on the launch target is visible only via raw `console.*`. |

### Overall project grade: **B−**

A high floor for a pre-launch solo build. The trust/compliance/security posture is genuinely
A-/B+ and, in places, beats funded competitors. The overall grade is dragged to B− by two
structural drags that recur in 9 of 10 graded lenses: **(a) two-clones drift** — the matured
implementation keeps living in the clone that isn't shipping — and **(b) the edge is ambition,
not yet reality** — the headline number is a calibrated consensus tracker, honestly labeled, not
yet an engine with its own edge. Neither is a quality defect so much as a *consolidation and R&D*
gap. Close the drift on one declared deploy tree and the cluster moves to B/B+ quickly; prove the
edge and the engine story becomes real. (Lens 05 — Departments/Heads/Process — is now produced
and graded **B**; it reinforces the same two-clones theme, with the department-heads/compliance
cockpit living CANONICAL-only. Overall now reflects all eleven graded lenses.)

---

## 2. Prioritized Roadmap

Sequenced **P0 → P1 → P2**, with dependency ordering inside each band. Effort is realistic:
**S** = <½ day, **M** = ½–2 days, **L** = multi-day / multi-PR. **Gating:** none (proceed),
founder (needs Garrett's call), legal (needs counsel). Founder/legal items are listed for
visibility and **never auto-scheduled** — they are flagged for a human hand.

### 2.1 — P0 (launch-blocking / correctness / legal / security)

| ID | Title | Dim | Clone | Effort | Gating | Dependencies / notes |
|----|-------|-----|-------|:------:|:------:|----------------------|
| P0-1 | **Declare ONE source-of-truth deploy tree** | 02/08/10 | both | S | founder | The keystone decision — every other reconciliation P0 depends on it. Verify which `page.tsx`/`vercel.json` Vercel actually builds. No code; a founder declaration + a written one-way promotion checklist (schema→migrations→config→guardrails→code). |
| P0-2 | **Provision prod DB + run one real ingestion → `prod-probe` green** | 10 | deploy | M | founder | The single hard launch gate. `/api/ready` is correctly 503 until live DB (`DATABASE_URL`/`DIRECT_URL`) + an `IngestionRun` <freshness-window exist. Depends on P0-3/P0-4 to stay green and on P0-7 to migrate the schema. `scripts/prod-probe.mjs` must exit 0. |
| P0-3 | **Reconcile cron cadence with the 60-min freshness gate** | 07/10 | deploy | S | founder | `FRESHNESS_MAX_AGE_MINUTES=60` (`lib/health/checks.ts:8,59`) vs once-daily crons (`vercel.json:8-44`) makes `/api/ready` red ~23h/day. Pick a real per-sport freshness contract; make cron + gate agree (do **not** loosen the gate silently). Blocks P0-2 staying green. |
| P0-7 | **Port `migrate-if-configured.mjs` + migrate-in-build into DEPLOY `vercel.json`** | 08/10/11 | deploy | S | founder | Script exists only in CANONICAL; DEPLOY `vercel.json:3` has no migrate step. Without it a fresh prod DB never gets schema → permanent 503. This is the fix that took CANONICAL from ~80% deploy-error to green. Founder reviews the runner's env gating before flip; touches prod DB. Blocks P0-2. |
| P0-9 | **Reconcile the two incompatible pricing + Stripe-wiring systems** | 04 | both | M | founder | DEPLOY `$19/$49` monthly-only + `STRIPE_PRO/ELITE_PRICE_ID` vs CANONICAL Founding `$14.99/$24.99`+annual + 4-var schema + `PRICING_PHASE`. Whichever tree deploys decides what customers are charged. Recommend porting CANONICAL `pricing-phases.ts` + 4-var schema + `PRICING_PHASE=FOUNDING` into DEPLOY. **Do not create Stripe price objects until reconciled.** Depends on P0-1. |
| P0-5 | **Production-guard CANONICAL `DEV_FAKE_ADMIN` (port d26c306)** | 09 | canonical | S | founder | CANONICAL `lib/auth.ts:92` / `entitlements.ts:27` / `middleware.ts:63` lack the `NODE_ENV!=='production'` guard DEPLOY has — would mint ADMIN+ELITE for every visitor if the flag leaks to a canonical prod deploy. Add the guard + a cross-clone test asserting it in both trees. Any canonical deploy is gated on this. |
| P0-6 | **Resolve the design-system split for launch** | 01 | both | L | founder | DEPLOY `app/page.tsx` is raw `bg-gray-950`, no `surface-*` in its Tailwind config (token classes would silently no-op), no Reveal/cinematic. Founder decision: keep DEPLOY deliberately simpler (still port tokens for brand parity) **or** promote the CANONICAL aesthetic. If porting: **Tailwind config first** (P0-6a, one-way CANONICAL→DEPLOY) so `bg-surface-*` resolves, then the token CSS (overlaps P1-3). Depends on P0-1. |
| P0-8 | **Single odds provider, zero failover on the live spine** | 07 | deploy | L | founder | `process-sport.ts:121-149` aborts a sport on any single-provider failure; no failover exists in DEPLOY. One outage/quota/key-revocation blacks out the board (two keys already leaked/rotated 2026-06-03). Port CANONICAL `resolveOddsWithFailover` + a second independent aggregator behind a flag; coordinate with the data-mesh workstream (20-24). Until then, treat as a known launch risk and ensure monitoring pages on the 502. |

**P0 legal/regulated watch-items (flagged, NOT scheduled — founder/legal hand required):**
- **Responsible-gaming helpline conflict** (Dim 03/09, both): `1-800-GAMBLER` vs `1-800-522-4700` across surfaces. **LEGAL** must confirm the intended helpline; then centralize on one `HELPLINE` constant. (Listed again as P1-B for the code mechanics, but the *number choice* is a legal decision.)
- **21+ age gate + state geo-gating are designed-not-built** (Dim 09, canonical): hard prerequisites before any affiliate/real-money path. **LEGAL** keeps both in the approval queue; build + legal-review before any affiliate switch is flipped.

### 2.2 — P1 (important — quality, trust, money, UX)

| ID | Title | Dim | Clone | Effort | Gating | Dependencies / notes |
|----|-------|-----|-------|:------:|:------:|----------------------|
| P1-1 | **Engine edge is circular; `trueEvScore`/`fairProbability` inert** | 06 | both | L | founder | `scoring.ts:152-187,271-278,393-395`. Land an independent `fairProbability` from non-market inputs, benchmark vs the close out-of-sample, **shadow-first**, promote only if it beats/complements the close. No autonomous flip / no `MODEL_VERSION` bump. The keystone of the accuracy story; depends on P1-9 (validation harness). |
| P1-2 | **User-facing read paths never check freshness; stale renders as "live"** | 07 | deploy | M | none | `api/picks/route.ts:11-73`, `board/state.ts`/`passes.ts` degrade only on thrown DB error, never staleness. Add the read-side complement to the shipped write-side contract — downgrade `dataStatus`/hide odds when stale, calm copy. Directly protects the trust pitch. |
| P1-3 | **Sync CANONICAL design-token CSS → DEPLOY (live AA regressions)** | 01 | both | M | none | DEPLOY still ships `--ion-2 #5E6878` (3.36:1, AA FAIL) and harsh `#00E5FF`; CANONICAL has the AA re-valuations + consolidated scale. The `--ion-2/--ion-3` + eyebrow size-floor fixes are live accessibility regressions in the launch clone. Pairs with P0-6/P0-6a (config must land first). |
| P1-4 | **DEPLOY observability stack + client error capture absent** | 11 | both | M | founder | DEPLOY has no OTel/PostHog/Langfuse/etc. and no `instrumentation.ts`; a prod incident is visible only via raw `console.*`. `error.tsx:43` promises "the observatory has the trace" but nothing captures it. Port the stack (all no-op without keys, safe merge) + add `global-error.tsx`; set ≥1 traces/analytics key. Founder call on whether DEPLOY carries the stack. |
| P1-5 | **Launch-critical DB reads throw unhandled 500s instead of degrading** | 11 | deploy | M | none | `api/picks/route.ts:38` (`db.pick.findMany`), auth/entitlements, and the Stripe idempotency lookup (`webhooks/stripe/route.ts:32`) lack try/catch. Good pattern already exists at `daily-slate/route.ts:21-23`. Wrap + sweep ~24 DB-touching routes. |
| P1-6 | **DEPLOY git branch not covered by CI triggers** | 08 | deploy | S | founder | `ci.yml:4-7` triggers `[main, claude/*, sports-intelligence-os-*]`; DEPLOY HEAD `safety/sports-wip-2026-06-04` matches none → pushes to the launch target may never run CI. Put DEPLOY on a covered branch or add `safety/*`. Confirm Vercel prod branch == CI branch. Pairs with P0-1. |
| P1-7 | **Add HSTS header to DEPLOY (`vercel.json` + `next.config.mjs`)** | 08/09/10/11 | both | S | none | CANONICAL emits `Strict-Transport-Security max-age=63072000`; DEPLOY omits it and `next-config-policy.test.ts` doesn't assert it. Add the header **and** extend the test so the clones can't diverge again. Low-cost, high-value for a trust-first product. |
| P1-8 | **Two-clones structural drift: parity check + promotion checklist** | 08 | both | L | founder | ~598 vs ~1244 TS files, forked migrations, `Pick` CLV columns canonical-only, divergent branches with no shared working branch. Add a CI parity check diffing `schema.prisma`/migrations list/guardrails/headers between clones and failing on unexpected drift. Depends on P0-1; this is the durable fix for the audit's connective-tissue problem. |
| P1-9 | **No out-of-sample / walk-forward validation harness** | 06 | both | M | none | Zero grep hits for walk-forward/holdout; `calibration/report.ts:36-47` reads recent 500 with no train/test split. Land walk-forward CV + frozen-season holdout + a CI check that fit-split≠report-split≠holdout **before** any realized-rate publish or calibration-map fit. Safe/additive; blocks P1-1 and any future calibration apply. |
| P1-10 | **`currentEdgeIndex` ("Edge Index" 0-100) never written in production** | 06 | deploy | M | founder | `schema.prisma:216` defines it, read in ~8 places, but no prod writer — always null, falls back to the circular `edgeScore`; test fixtures mix scales. Either give it a single scale + a real writer, or retire the name. Don't ship a named public metric that is permanently null+fallback (trust risk). |
| P1-11 | **`GateDecision` audit rows read but never written** | 06 | deploy | M | none | `board/state.ts:240-260`/`passes.ts` derive gated rows on the fly; no `gateDecision.create/upsert` in prod, so "no strong play today" is a UI fallback, not an auditable record. Write real rows when the slate gates a game. Safe/additive; makes the honest empty-state queryable. |
| P1-12 | **Tier-grader "Elite" mislabel — no absolute floor (Tua≠Elite)** | 06 | canonical | M | founder | `player-model.ts:177` is pure within-position percentile; missing metrics coerced `?? 0` before ranking (`:166-169`); `colors.ts` bands Elite ≥85. Add an absolute Elite floor (validated EPA/CPOE bar), drop-missing-before-ranking, ship the "graded vs position, this season" annotation now. Defaults to current behavior until a founder `MODEL_VERSION` action. |
| P1-13 | **Brand promise fragmented across 3 headlines; strongest absent from DEPLOY** | 03 | both | M | founder | `brand.ts:22` vs DEPLOY `page.tsx:125` ("We're not AI…") vs CANONICAL `page.tsx:91`; "Proven, not explained" exists only in CANONICAL. Pick ONE primary promise (recommend elevating "Proven, not explained"), put it in `brand.ts`, render DEPLOY H1 from that constant. Founder owns final wording. |
| P1-14 | **`brand.ts` claims SoT but H1 hard-codes around it; unused hero constants** | 03 | deploy | S | none | `brand.ts:200,203` export `HERO_KICKER`/`HERO_SUBHEAD`; `page.tsx:124-130` hard-codes the hero. Drive the home hero from `brand.ts` (or delete the dead exports) + add a test asserting H1 == a brand export. Pairs with P1-13. |
| P1-B | **Centralize the responsible-gaming helpline on one constant** | 03/09 | both | S | legal | Code mechanics for the legal watch-item: once LEGAL confirms the number, make `brand.ts` `HELPLINE` the only source, reference it from `trust-claims.ts:254` and everywhere, add a test asserting a single helpline string. **The number itself is a legal decision (see P0 watch-items).** |
| P1-15 | **Canonical host inconsistent (www vs non-www) in DEPLOY** | 03 | deploy | S | none | `layout.tsx:35` `https://www.…` (seeds `metadataBase`) vs `robots.ts:13`/`sitemap.ts:40` bare host — splits SEO signal. Pick one host matching the live 301 target; use it in all three files. CANONICAL is already consistent. |
| P1-16 | **Banned-phrase scanner covers a static 8-file allowlist** | 03 | both | S | none | `public-copy-scan-strong.test.ts:28-37` scans 8 of 60+ pages and skips missing files silently. Glob `app/**/page.tsx` + marketing components; **fail** (not skip) on missing expected files. Runtime content-engine gate already covers DB copy. |
| P1-17 | **Stripe non-null env assertions → hard 500 instead of graceful 503** | 04 | both | S | none | DEPLOY `lib/stripe.ts:3` + `checkout/route.ts:27` non-null-assert env/price-IDs → generic 500 mid-checkout. CANONICAL already returns a clean 503. Mirror CANONICAL: explicit "pricing not configured" 503 + guard the constructor to fail loudly at boot/health-check. |
| P1-18 | **Claude cost-monitor hard-codes Sonnet pricing; router can route to Opus** | 04 | both | S | none | `cost-monitor.ts:140` `{input:3,output:15}` (Sonnet) but `model-router.ts:19-21` can route to Opus 4.8 ($5/$25) → ~40-67% spend undercount on Opus surfaces. Make pricing a per-model `Record` keyed off the resolved model id + a vitest pinning Opus 4.8=$5/$25. Pure refactor, no live switch. |
| P1-19 | **No dunning grace window — one failed invoice drops customer to FREE** | 04 | both | S | founder | `entitlements.ts:33` honors only ACTIVE/TRIALING; `webhooks/stripe/route.ts:105-113,198,207` flips PAST_DUE immediately. Founder/money-UX decision: keep PAST_DUE entitled for a grace window or let Stripe Smart Retries run first. Flag, don't auto-change. |
| P1-20 | **Unit economics plausible but unproven; higher pricing phases gated on a track record that doesn't exist** | 04 | canonical | S | founder | `pricing-phases.ts` requires ≥100 settled picks + published calibration (PROVEN), ≥500 + CLV≥52.4% (ESTABLISHED). Keep `PRICING_PHASE=FOUNDING` until proof milestones met (code already enforces human-gated advance). Treat higher-phase prices as roadmap. No code change. |
| P1-21 | **Client error boundary captures nothing; no `global-error.tsx`** | 11 | both | S | none | `error.tsx:20-23` only `console.error`; neither clone has `global-error.tsx`. Wire the boundary to a sink (PostHog on canonical; POST digest+message to a server route on deploy) + add `global-error.tsx` on both. Pairs with P1-4. |
| P1-22 | **AI-tic copy density: "X, not Y", em-dash overload, eyebrow-on-everything** | 01/03 | both | M | none | "`, not <lc>`" 106× / em-dash 1002× / eyebrow on 42 files in CANONICAL. Copy pass: cap "X, not Y" ~1/page (keep compliance lines), halve visible em-dashes, demote eyebrow to a deliberate kicker, finish migrating to the `Eyebrow` primitive, add lint guards. |
| P1-23 | **Latent RSC client-boundary footgun (`node:zlib` co-located with pure helper)** | 08/11 | canonical | S | none | `nflverse-readiness.ts:1` imports `gunzipSync` at top level beside pure `latestNflverseInspectionSeason` (`:47`). Verified latent (no client importer today). Split pure helpers into `*.pure.ts` siblings + a guardrail test asserting no `'use client'` module transitively imports a `node:`-importing file. |
| P1-24 | **`/api/health` 200 even when stale; nothing internal consumes `/api/ready`** | 07 | deploy | S | founder | `health/route.ts:15` always 200; only `/api/ready` 503s and nothing polls it. Confirm an external uptime monitor (or Vercel check) actually polls `/api/ready` and pages on 503/502; document in RUNBOOK — else the truth contract fires into the void. |
| P1-25 | **`validateFreshness` is a tautology on a just-set timestamp** | 07 | both | S | none | `process-sport.ts:125,147` sets `fetchedAt=new Date()` then validates it. Validate upstream event timestamps (`commence_time`/last-update) vs now to catch stale-upstream-with-fresh-fetch, or remove the check so it doesn't imply protection it lacks. |
| P1-26 | **Backport truth contract + provider-status classifier into CANONICAL cron** | 07 | canonical | M | founder | CANONICAL `refresh-odds/route.ts:74-100` still discards `processSport()` result and always returns `ok:true` (the masked-success bug DEPLOY fixed). Backport, or formally freeze canonical's cron and designate DEPLOY the only deploy target. Track under data-mesh reconcile. |
| P1-27 | **DEPLOY carries four shadow workspace packages no shipping code imports** | 08 | deploy | S | none | `packages/{brand,emails,social-formatters,ui-brand}` imported by 0 files in `apps/web`. Wire deliberately or remove; if kept as staging, document as inert in a README. |
| P1-28 | **three.js fully untyped in DEPLOY via blanket `declare module "three"`** | 08 | deploy | S | none | `types/three.d.ts:1` types the whole package as `any`. Replace with `@types/three` (as CANONICAL) + delete the shim — **or** (see P2) remove `three` from DEPLOY entirely since it's a dead dep there. Reconcile with P2-7. |
| P1-29 | **Standardize liveness/readiness split into CANONICAL** | 11 | canonical | S | none | CANONICAL has only `/api/health` and it 503s when degraded → a liveness probe could restart a healthy container. Port `lib/health/checks.ts` + `/api/live` + `/api/ready` into CANONICAL; make its `/api/health` always-200. |
| P1-30 | **Webhook sync silently no-ops on unresolved userId** *(borderline P1/P2)* | 04 | both | S | none | `webhooks/stripe/route.ts:172-181` `console.warn`s on `count===0`. Emit a structured alert + add a reconciliation cron diffing Stripe active subs vs local rows. |

### 2.3 — P2 (worth doing)

| ID | Title | Dim | Clone | Effort | Gating | Dependencies / notes |
|----|-------|-----|-------|:------:|:------:|----------------------|
| P2-1 | Off-palette `yellow-*`/`slate-*` in CANONICAL cockpit; CinematicEntrance hardcodes hex | 01 | canonical | S | none | `journal-new-form.tsx:281` `bg-yellow-400` (deprecated gold), slate status pills, `cinematic-entrance.tsx:73-78` literal hex at the most-watched first impression. Map to `btn-primary`/`--data-*`/`var()` tokens. |
| P2-2 | Intelligence subnav: 10 ungrouped pills; same content at two URLs | 02 | canonical | S | none | `intelligence-subnav.tsx:36-47`; `next.config.mjs:42-48` rewrites leave `/trends` + `/intelligence/trends` both resolving. Group into 2 tiers / primary-5+More; finish the "later pass" so bare routes 301 to canonical form. |
| P2-3 | Free "Beat the Model" growth loop is CANONICAL-only | 03 | canonical | M | none | Compliant (no money/chance, local-storage, no fabricated results). Port the self-contained `BeatTheModel` to DEPLOY for a top-of-funnel mechanic; keep real-money variants founder-gated. Pairs with P1-1 messaging. |
| P2-4 | Four+ parallel color-token vocabularies in DEPLOY | 01/03 | deploy | M | none | No surface matches declared `BRAND_COLORS`; gray~1118/cyan~73/brand~69/ink~61. Adopt CANONICAL's semantic system, migrate DEPLOY off raw gray/brand/ink. Subsumed by P0-6 if the full aesthetic is promoted. |
| P2-5 | Key conversion pages lack metadata/OG (home, dashboard, promotions) | 03 | deploy | S | none | 25/60 DEPLOY pages export metadata; home/dashboard/promotions export none. Add explicit metadata + hand-written `openGraph`. |
| P2-6 | `trust-claims.ts` + `brand.ts` diverged between clones | 03 | both | S | founder | Two sources of truth. Designate one clone authoritative, sync each release, adopt the CANONICAL voice line. Pairs with P0-1/P1-8. |
| P2-7 | `three` is a dead dependency on DEPLOY | 11 | deploy | S | none | `package.json:35` declares `three` but 0 source imports (`interactive-galaxy.tsx` is "Pure 2D canvas. No Three.js."). Remove `three`+`@types/three` from DEPLOY (install/build bloat only). Reconcile with P1-28. |
| P2-8 | Webhook `payment_failed`/sync no-ops on unresolved userId | 04 | both | S | none | (Same surface as P1-30 if not taken there.) Structured alert on `count===0` + reconciliation cron. |
| P2-9 | Nested duplicate source tree `C:/Users/Garrett/Sports/Sports/` | 04/06/08 | deploy | S | founder | A second copy of pricing/checkout/stripe/webhook + an older thinner engine + its own `.git`; pollutes search and risks editing the wrong file. Confirm Vercel build root, then delete/quarantine. Verify before deleting. |
| P2-10 | Strongest financial guardrails are CANONICAL-only | 04 | deploy | M | founder | `monetization-levers.ts`/`pricing-phases.ts`/`operator-registry.ts`/`promotions/guards.ts` absent from DEPLOY. Port them + tests when reconciling pricing (P0-9) so the launch tree carries the audited guardrails. |
| P2-11 | Quarantined `.bad` test + lock-file debris in `_overnight_quarantine/` | 08 | deploy | S | none | `api-picks-elite.test.ts.bad` is a silently-dropped test (coverage you think you have but don't). Triage (fix+restore or delete with note); clear lock debris. |
| P2-12 | No CSP header (no current XSS vector) | 09 | both | M | none | All `dangerouslySetInnerHTML` is static JSON-LD. Add a baseline CSP (report-only first) once the third-party script/style surface is enumerated. Hardening, not a fix. |
| P2-13 | Privacy policy promises a self-serve delete the compliance model marks unbuilt | 09 | both | S | legal | `privacy/page.tsx:64-70` vs `compliance-program.ts:197-205`. **LEGAL:** confirm the dashboard self-serve delete is wired before launch, or soften copy to the published request path (GDPR/CCPA exposure). |
| P2-14 | Kelly stake inherits the circular edge + inconsistent version tag | 06 | deploy | S | founder | `kelly.ts:145-154` derives `fairProb` from `edgeScore`; `kelly.ts/poisson.ts` say v6.0.0 while `constants.ts` is v5.0.0. Keep Kelly gated until an independent `fairProbability` exists (depends on P1-1); reconcile version comments. Money/RG surface → founder/legal before any wiring. |
| P2-15 | Confidence is a hand-tuned additive sum with +10 floor; calibration lacks resolution | 06 | both | M | none | `scoring.ts:340-348`; `compute.ts:109-124` has Brier but no Murphy decomposition. Add Brier decomposition + log-loss so "calibrated" can't hide "low-resolution". Treat component caps as priors to validate. Pairs with P1-9. |
| P2-16 | `engines.node` pinned at root only, not per-app | 11 | both | S | none | Add explicit `engines.node` to `apps/web/package.json` on both clones and/or pin the Vercel Node version. |
| P2-17 | No automatic schema migration on DEPLOY build (perf-lens framing of P0-7) | 11 | deploy | S | founder | Same root cause as P0-7 — resolved by that item. Listed for cross-lens traceability. |

---

## 3. The 30-Day Path to Launch + Trust

The minimal set that gets the **DEPLOY** clone safely live and the engine **provably honest**.
Sequenced into four lanes. Founder/legal items appear as **gates**, never as auto-scheduled tasks.

### Lane A — Make it deployable (Days 1–7) — *the only true launch blockers*
> Goal: `prod-probe` green on a real prod environment. Pure operational provisioning + three config ports.

1. **P0-1** — Founder declares the deploy tree + writes the one-way promotion checklist. *(gate: founder; unblocks everything.)*
2. **P0-7** — Port `migrate-if-configured.mjs` + add migrate-in-build to DEPLOY `vercel.json`. *(S)*
3. **P0-3** — Reconcile cron cadence with the 60-min freshness gate. *(S, founder picks the contract.)*
4. **P0-2** — Provision Postgres + run one real ingestion; `prod-probe` must exit 0. *(M, founder.)*
5. **P1-6** — Put DEPLOY on a CI-covered branch; confirm Vercel prod branch == CI branch. *(S.)*
6. **P1-7** — Add the HSTS header + assert it in the policy test. *(S.)*

**Exit criteria for Lane A:** `/api/ready` 200 on prod, `prod-probe` green, CI runs on the deploy branch, HSTS present.

### Lane B — Don't lie under load (Days 5–14) — *trust integrity at runtime*
> Goal: the live product can never present stale or unobservable state as healthy.

7. **P1-2** — Read-side freshness complement (`/api/picks` + board degrade when stale).
8. **P1-5** — Wrap launch-critical DB reads so they degrade instead of 500ing.
9. **P1-24** — Confirm an external monitor actually polls `/api/ready`; document in RUNBOOK. *(founder.)*
10. **P1-4 / P1-21** — Port a no-op-safe observability stack to DEPLOY + wire the error boundary to a sink + add `global-error.tsx`. *(founder call on carrying the stack.)*
11. **P1-17** — Stripe graceful-503 instead of hard-500 (only relevant once keys go live).

### Lane C — Make the money correct before any key goes live (Days 7–18) — *founder/legal gated*
> Goal: displayed price and the Stripe price object cannot disagree; no regulated switch flips.

12. **P0-9** — Reconcile the two pricing + Stripe-wiring systems; recommend porting CANONICAL `pricing-phases.ts` + 4-var schema + `PRICING_PHASE=FOUNDING`. **Do not create Stripe price objects until reconciled.** *(M, founder.)*
13. **P2-10** — Port the financial guardrails (`monetization-levers`/`operator-registry`/`promotions/guards`) alongside the pricing reconcile. *(founder.)*
14. **P1-B + helpline LEGAL decision** — LEGAL confirms the one helpline number; then centralize on a single constant + test. *(legal.)*
15. **P1-19** — Founder decides the dunning grace-window policy. *(founder, decision only.)*
16. **Keep `PRICING_PHASE=FOUNDING`; keep affiliate hard-off; 21+/geo-gating stay in the legal queue (NOT built for launch).** *(legal gates — explicitly not scheduled.)*

### Lane D — Make the engine provably honest (Days 10–30) — *the trust differentiator, parallelizable with A–C*
> Goal: the honesty story is not just "labeled honest" but *validated and auditable*. None of this requires a `MODEL_VERSION` bump or any autonomous flip.

17. **P1-9** — Land the out-of-sample / walk-forward validation harness (fit≠report≠holdout CI check). *(blocks any realized-rate publish or calibration fit.)*
18. **P1-11** — Write real `GateDecision` rows so "no strong play today" becomes an auditable artifact. *(safe/additive.)*
19. **P1-10** — Resolve `currentEdgeIndex`: give it a real writer + single scale, or retire the public name. *(founder — don't ship a permanently-null named metric.)*
20. **P2-15** — Add Brier decomposition + log-loss so "calibrated" can't hide "low-resolution."
21. **P1-1** *(stretch / post-launch R&D)* — Begin the independent `fairProbability` from non-market inputs, **shadow-first**, benchmarked vs the close. *(founder; the real-edge chapter — explicitly the honest *next* chapter, not a launch blocker.)*

### Decision gates the founder owns (must be resolved, in order, before the relevant lane completes)
- **G1 (Lane A):** Which tree deploys? (P0-1) — unblocks all reconciliation.
- **G2 (Lane A):** The per-sport freshness contract / cron cadence value. (P0-3)
- **G3 (Lane C):** Final pricing numbers + `PRICING_PHASE` default. (P0-9)
- **G4 (Lane C, LEGAL):** The single responsible-gaming helpline number. (P1-B)
- **G5 (Lane A/D):** Whether DEPLOY promotes the full CANONICAL aesthetic (P0-6) or stays deliberately simpler — affects scope but **not** the go/no-go.

### Explicitly out of the 30-day launch scope (correct posture — do not flip)
Affiliate/real-money paths, 21+ age gate, state geo-gating, Airwave live capture, performance-stats
publishing, any higher `PRICING_PHASE`, the CANONICAL Player-Lab/intelligence/fantasy surface
(that's Launch 2). The single-provider failover (P0-8) is a launch *risk* to monitor, not a 30-day
must-build — it's an L-effort item best done with the data-mesh workstream; until then, ensure
monitoring pages on the 502.

### Lens 05 — now produced (grade B)
The fifth lens (Departments/Heads/Process) has been produced — see `05-departments-heads-process.md`.
It surfaced **no P0**. Its two P1s fold into existing lanes rather than adding new blockers:
(a) the Department-Heads cockpit + Compliance-Program model are CANONICAL-only and absent from the
launch tree — a founder decision to port-or-defer, tracked under the two-clones consolidation work
(P0-1 / P1-8); (b) DEPLOY's HEAD branch matches no CI push trigger, the process angle on **P1-6**
(put DEPLOY on a CI-covered branch). Both are consolidation/process-hardening, not launch-blocking.

---

## 4. Bottom line

The narrow DEPLOY launch is a legitimate **GO-WITH-FIXES**, and the fixes that block it are
**operational and configuration**, not missing product: provision a DB, make cron agree with the
freshness gate, port migrate-in-build, run `prod-probe` to green (Lane A). The trust posture that is
this product's real differentiator is already A-/B+; Lane D turns "labeled honest" into "validated
honest" without flipping a single regulated switch. The connective-tissue problem across the whole
audit is **two-clones drift** — so the highest-leverage non-launch action is P0-1 + P1-8: declare one
deploy tree and add a CI parity check so the better implementation stops living in the clone that
isn't shipping. Keep every money/legal switch in the founder's hands throughout.
