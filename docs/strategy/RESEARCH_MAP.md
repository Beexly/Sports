# Research Map — Everything Already Built & Researched (GSE)

**Purpose.** A single, navigable index of the R&D that *already exists* in this repository, so any session can orient without re-deriving context. The R&D is largely done; this map says **what exists, what's actually wired vs. doctrine-only, how it relates to the proven-edge moat, and where the contradictions and gaps are.**

**How it was built.** 572 markdown files plus the supporting code were partitioned into 12 non-overlapping domains and mapped by 12 parallel research agents (2026-06-22). Each domain section below is a synthesis, not a file dump; source paths are cited inline.

**Companion doc.** The active workstream charter is [`docs/strategy/PATH_TO_PROVEN_EDGE.md`](./PATH_TO_PROVEN_EDGE.md). This map is the evidence base under that charter.

---

## Part 0 — Executive synthesis (the one-page truth)

1. **The moat is singular and consistent across every domain:** an *auditable, calibrated, per-pick CLV/EV track record* that the entire competitor field (40+ tools) markets-around but never ships. Sell decision quality with a receipt, not confidence.
2. **The integrity machinery is real and code-enforced.** Rights-gating (`clearance-engine.ts` throws without clearance), banned-phrase scanning (`compliance-scanner/rules.ts`), draft-only autonomy (`externalActions: "NONE"`, no `DRAFTED→APPROVED` path), server-side paywalls, freshness gates, and proof-gated pricing are all implemented and tested.
3. **The CLV/calibration *math* is built and tested; the *plumbing* is the gap.** CLV grading runs end-to-end at settlement; calibration primitives (isotonic, Murphy/Brier decomposition, ECE, reliability curves, drift) exist as pure tested code but are **gated/not wired into the live display path**. Missing: out-of-sample split harness, champion/challenger promoter, segmented CLV, nightly coverage/drift alerting, and enough settled canonical picks (≥100) to legitimately flip calibration on.
4. **A lot of the "platform" is doctrine, not implementation.** The "brain" (Evidence Vault, Signal Ledger, Entity Graph) is BLOCKED/unbuilt; Jarvis is a real deterministic synthesizer at 38/100 with *zero autonomy by design*; most product specs are design-complete/build-pending.
5. **Nothing has been verified against a live production DB** in any prior session — every "green" is source-level / stub-Prisma. Go-live is blocked on owner-only actions (provision prod env/DB/Redis, verify deploy, create Stripe live prices).
6. **Recurring cross-domain contradictions to resolve once:** pricing (3-way), brand name (GSE vs GSN vs StatKing vs Sports OS), voice (1st-person singular vs plural), color tokens, Jarvis seat count (15 vs 23), settled floor (25 vs 100). See Part 2.

---

## Part 1 — The 12 domains

### 1. Proven-edge / CLV / prediction-engine
*Charter: `docs/strategy/PATH_TO_PROVEN_EDGE.md`; supporting: `docs/data-analytics-strategy.md`, `docs/evidence-engine.md`, `docs/path-to-70.md`, `docs/research/evidence-source-strategy-2026-05-21.md`.*

- **Thesis:** target proven edge (CLV + EV), not a win rate. CLV is the cleanest public evidence of edge; positive CLV at scale ≈ positive EV. Win rate is mostly variance.
- **Built & tested (pure):** `packages/prediction-engine/src/` — `clv.ts` (spread/total points + ML prob CLV, verdicts, `summarizeClv`), `clv-capture.ts` (`deriveClosingSnapshotFromOdds`, `gradePickClv`), `probability-calibration.ts` (isotonic PAVA, Murphy `brierDecomposition`, `expectedCalibrationError`, `reliabilityCurve`), `calibration-apply.ts` (`buildCalibrator`, self-suppressing, activates only at sample ≥100 + non-worsening ECE), `calibration-drift.ts`, `shin-devig.ts`, `elo-estimator.ts`/`elo-backtest.ts`, `poisson.ts` (runtime-guarded off), `ml-estimator.ts`, `edge-engine.ts` (`assessEdge`, emits `expectedClv`), `kelly.ts`, `edge-significance.ts` (MC permutation p-value), `proof-of-record.ts` (Merkle), `conviction-tier.ts` (gated OFF), `evidence-readiness-matrix.ts`.
- **Wired live:** CLV lock at pick creation → closing snapshot at settlement → `clvValue`/`clvVerdict` persisted; public gate (`apps/web/lib/performance/public-clv-policy.ts`); admin dashboard; **NEW this branch:** `apps/web/lib/performance/clv-coverage.ts` (the coverage invariant).
- **Prescribed but NOT built:** out-of-sample temporal split harness; champion/challenger promotion gate; nightly CLV-coverage probe + pre-kickoff capture; segmented CLV (book / line-move / time-to-kickoff); reliability curve + Brier decomposition as a *public* surface; input-PSI drift; isotonic/Platt in the live display path.
- **Watch:** `MODEL_VERSION="v5.0.0"` is frozen but `kelly.ts`/`poisson.ts` headers say "v6.0.0" (stale comments). Two CLV sign conventions coexist (price-beat in `clv.ts`/`tracker`; model-edge-vs-close in `clv-calibration.ts`) — never aggregate them together. The binding gap for Phase 3 is **historical production predictions** to validate out-of-sample.

### 2. Strategy / competitive / moat
*`docs/strategy/competitive-landscape-2026.md`, `COMPETITIVE_INTELLIGENCE.md`, `COMPETITIVE_PRICING_AND_PACKAGING.md`, `docs/strategy/opportunity-ledger.md`, `vision-tracker.md`, `repo-firehose-review.md`, `gaming-and-engagement-expansion.md`.*

- **Stated moat:** be the calibrated, tamper-evident, venue-agnostic *trust layer* — the brand that wins on proof, not promises. "Our biggest moat is latent, not missing" (the CLV record exists in code; it isn't surfaced as the hero yet).
- **Top opportunities (ranked, deduped):** (1) lead with the scoreboard not the pick; (2) public CLV report (gated) — *shipped as `/clv`*; (3) model-accountability surface (`/accountability`, loss autopsies, changelog); (4) best-line/best-book context; (5) honest-education content moat; (6) venue-agnostic fair-probability API (Kalshi/Polymarket traders); (7) "ask why" evidence-grounded agent; (8) user-side CLV tracking — *partly shipped as `/track`*; (9) "Beat the Model" pick'em. Monetization-beyond-subs order: education → premium calibration reports → B2B data/API (founder-gated) → honest affiliate (never sportsbook CPA).
- **Highest-leverage remaining:** elevate CLV/calibration to homepage hero + close the CLV-coverage guardrail (Phase 1) + resolve brand/positioning contradictions before any public push.

### 3. Data & metrics foundation
*`docs/data-analytics-strategy.md`, `docs/STAT_INTAKE_COVERAGE_MATRIX.md`, `docs/data/galaxy-data-doctrine.md`, `packages/data-ingestion/src/*`, `packages/db/prisma/schema.prisma`.*

- **Live inputs:** **The Odds API** (only paid dep; per-book h2h/spreads/totals across 7 sports — written to the `Odds` table every cycle). **nflverse** (deep NFL stats, partially persisted, deliberately walled off from scoring pending calibration proof). **Kalshi** (built but inert — a near-zero-vig *clean CLV anchor*). **ESPN public** (settlement cross-check). **OpenFootball** (CC0, inert).
- **The mineable spine:** `Odds` (per-book per-cycle, indexed on `fetchedAt`) is a true timestamped line history — sufficient to reconstruct opening→closing drift and segment CLV by book / time-to-kickoff. The **closing line is derived, not stored** (`clv-capture.ts`). Also: `OpeningLine` (consensus only), `Game.opening*`/`lineMovement*`, `Pick.clv*`, `TeamGameLog`, `HistoricalGame` (closing lines + scores back to 1999), `SourceSnapshot` (raw payloads + hash).
- **Missing for inefficiency mapping:** per-book *opening*/line-history table; steam/RLM detection (impossible without bet%/handle, which The Odds API doesn't provide); persisted devig time-series; a sharp-book/Kalshi anchor to grade CLV against (currently self-consensus); CFBD; player props/alt lines. The universal `Signal` ledger has schema + composer but **no populator** (empty).

### 4. Product spec library (31 specs)
*`docs/product/*`.*

- **Status:** design-complete, build-pending. Only `engine-versioning-policy.md` reads as live.
- **Moat trio (Phase 2, highest leverage):** `intelligence-graph-spec` (the read-model/entitlement layer everything depends on) → `ledger-and-loss-room-spec` (public record of every settled pick) → `pre-mortem-pipeline-spec` (deterministic ex-ante "what would change our mind"). Add `galaxy-memory-persistence-spec` (immutability) and `cockpit-losses-spec` (loss-autopsy authoring).
- **Uncopyable differentiators (Phase 4-5, pure spec):** `anti-galaxy-spec` (a deliberately-wrong adversary model proving falsifiability), `model-court-prompts` (interactive refusal discipline), `cross-sport-correlation-engine-spec`, `github-issues-for-model-spec`.
- **Adjacent (reach/revenue):** discord/twitter bots, chrome extension, galaxy-studio, b2b-widgets, programmable-dsl, live-war-room, edge-lab.

### 5. Intelligence architecture (brain / Jarvis / Airwave / agent-OS)
*`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`, `docs/brain/*`, `docs/ai/jarvis/*`, `docs/ai/airwave/*`, `docs/agents/*`, `docs/adr/002-jarvis-synthesizer.md`.*

- **The Brain:** a 15-component evidence/calibration/trust pipeline (source hierarchy → acquisition mesh → evidence vault → entity graph → signal ledger → claim governance → public trust layer → calibration feedback loop). **Almost entirely doctrine-only; Evidence Vault / Signal Ledger / Entity Graph are BLOCKED/unbuilt.** Tier 6 = AI output, never an evidence source.
- **Jarvis:** the *most real* of the three — a **deterministic, I/O-free synthesizer** (no model calls at cockpit runtime; enforced by `jarvis-purity.test.ts`). 16-capability registry (zero ACTIVE by design), 23-seat agent council (`externalActions: "NONE"` on every seat), wiring score **38/100**. Episodic memory is coded but pending an owner-run migration (`wired:false`).
- **Airwave:** pundit/broadcast accountability engine — built, but **legally frozen** behind a two-gate hold (`AIRWAVE_ENABLED` + `AIRWAVE_SIRIUSXM_LEGAL_ACK`); paraphrase-only, no raw audio/transcripts, SiriusXM activators permanently excluded.
- **Autonomy:** 3-zone model (safe / pre-declare / hard-stop); the ceiling is owner approval for anything externally visible. **Autonomous capability count today is zero, intentionally.**
- **Missing scaffolding:** the change-proposal ADR template + block-tracker (`reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`) that gate all brain implementation are absent.

### 6. Advanced modeling & sports-science
*`docs/models/*`, `docs/performance/*`, `reports/rd/black-label-2026/HUMAN_PERFORMANCE_SIMULATION_PRIORS_LAYER.md`, `docs/ops/HISTORICAL_DATA_AND_PROJECTIONS_QUEUE.md`.*

- **Built primitives:** `market-read.ts` `marketGravityIndex()` (conviction-banded; *different formula than the proposal doc*), `protection-stress.ts` (simpler than proposed blitz-regression), `qb-forward.ts` (DAKOTA+ANY/A), human-performance `availability.ts`/`environment.ts` (Phase 1 — can only **widen** the band / trigger no-bet, never manufacture confidence).
- **Proposal-only:** QB Pressure Sensitivity (Index 1, needs `pbp`×`ftn` join); sim-priors (≤5% weight cap, design only).
- **Highest-leverage built asset:** the **historical calibration backtest** (`/api/calibration/market-backtest` + `probability-calibration.ts`) — real Brier/ECE on closing-line `(forecast, outcome)` pairs back to 1999. This is the thing that lets us *measure* edge honestly.
- **Sports-science layer:** five-modality taxonomy; **everything is rights-gated and NOTHING is licensed/enrolled** (force-plate/tracking/radar/CV all gated; OpenPose forbidden). Any CV/ML lane needs a separate Python→ONNX→Node service (local-model lane forbids weight files in-repo).
- **Stub docs (no real content):** `player-comp-engine`, `player-archetypes`, `scheme-personnel-formation-intelligence`, `trenches-intelligence-roadmap`, `metric-ontology`, `model-evaluation-framework` are 16-line Codex placeholders — data-blocked, not modeling-blocked.

### 7. StatKing
*`docs/statking-*.md` (×28), `handoff/claude/statking/**`, `scripts/statking_*.py`.*

- **What it is:** an **NFL-only stats/data/analytics lens of GSN/GSE** (routes `/stats/*`, `/admin/statking/*`), not a separate or predecessor product. Not referenced in `_logs/REALITY.md`/`DECISIONS.md` — a side branch.
- **Reality:** real metric *formulas* (Galaxy Player Index, Fantasy Edge, Hidden Value, Mirage Risk, …90 active of 800 defined) running on **synthetic fixture data** ("StatKing QB 001", `example.com` URLs). Honest about it — proof artifacts explicitly mute live/prediction claims.
- **Genuinely built-out:** rights/source governance (546-source registry, per-mode rights matrix, gate enforcement) — aligns with the CLAUDE.md clearance posture.
- **Relationship to moat:** **zero CLV/proven-edge content** — sits *beside* the moat. ~⅔ of its docs are duplicate boilerplate; report scripts are misleading (most print the same summary). Needs: live authorized feeds, keys, contracts, historical backtest, real explanation/discovery layers, UX.

### 8. Brand / design / content
*`apps/web/lib/brand.ts` (code SoT), `apps/web/lib/compliance-scanner/rules.ts`, `BRAND_AND_DESIGN_SYSTEM.md`, `DESIGN.md`, `docs/design/*`, `docs/media/*`, `docs/positioning.md`.*

- **Canonical name:** **Galaxy Sports Edge / GSE** (`brand.ts`). **Banned in code:** "AI-powered"/"AI-driven" (`L1-AI-POWERED`), the literal phrase **"Mission Control"** (`L1-MISSION-CONTROL`), and tout/certainty vocab ("lock", "guaranteed", "verified track record"…). The NASA-mission-control *aesthetic* is allowed; the *words* "AI"/"Mission Control" in copy are not.
- **Design system:** fully specified dark-theme token system (environment/ion/confidence/risk ladders, tabular numerals non-negotiable, casino-green permanently forbidden), formal 5-level component maturity model, motion-as-information doctrine (no slot-machine count-ups).
- **Media/content:** everything AI touches is **draft-only, human-gated, no auto-publish anywhere** (MoneyPrinter/Gemini-auto-upload patterns permanently forbidden). Synthetic presenter "Nova" must be disclosed; synthetic athlete voice permanently forbidden. The compliance scanner is the shared trust spine across blog/journal/studio/bots.
- **Open issues:** brand-name sprawl (GSE/GSN/StatKing/Sports OS/SportsPicks Pro); voice conflict (1st-singular vs plural); color-token fork (`brand.ts` `#FF2DD6`/cyan vs design-system `#FF2D8A`/ion-blue); a **casino-green violation in `components/performance/calibration-panel.tsx`** (the most credibility-bearing module).

### 9. Growth / monetization / sales / pricing
*`MARKETING_AND_GROWTH_BLUEPRINT.md`, `SALES_CONVERSION_AND_CRM.md`, `CUSTOMER_PSYCHOLOGY_AND_GROWTH_REPORT.md`, `docs/intelligence/monetization-lanes.md`, `apps/web/lib/pricing/pricing-phases.ts`, `handoff/claude/gse-pricing-value/*`.*

- **Thesis:** the proof record *is* the product, the pricing trigger, the viral unit, the SEO/GEO defensibility, the retention story, and the winback asset — almost nothing of consequence ships before the record is live.
- **Three growth loops:** content→SEO→signup; track-record→shareable OG card→viral (**blocked — only one static OG image exists**); referral (**greenfield, not in schema**).
- **Monetization lanes (ranked):** Subscriptions (live) → Almanac/premium content → Vault → Fantasy → B2B API → Media. Hard "never": no fake win-rate, no certainty language, no Free-tier confidence scores, **no sportsbook CPA without legal review**, no CSS-only paywalls.
- **Pricing (canonical):** `pricing-phases.ts` proof-gated ladder — FOUNDING $14.99/$24.99 (live) → PROVEN (≥100 settled + calibration) $19.99/$29.99 → ESTABLISHED (≥500 + CLV ≥52.4%) $29.99/$49.99 → AUTHORITY (multi-season ROI). Founding grandfathered for life; advances are manual (`PRICING_PHASE` env).
- **Psychology:** the moat is *emotional* (bettors lied to by touts). The aha = "they showed me *why*, and what they *passed on*". Inverse-dark-patterns as brand (the PHAI v. DraftKings/FanDuel suit makes the usual growth-hacks the exact litigated conduct).
- **Capability gaps:** no analytics/event instrumentation wired; no lifecycle/email infra; no referral; passive dunning; `ModelJournalEntry.emailedAt`/`twitterTeasedAt` hooks built-but-unwired.

### 10. Sources / legal / compliance / responsible gaming
*`apps/web/lib/scraping/clearance-engine.ts` + `source-rights-registry.ts`, `COMPLIANCE_AND_RESPONSIBLE_GAMING.md`, `docs/legal/*`, `docs/audit/*`, `docs/brain/source-hierarchy.md`, `apps/web/lib/data-reliability/*`.*

- **Posture:** scraping is rights-gated, not banned. `checkClearance()` runs 14 checks; `wrapExtractedRecord()` **throws** without granted clearance + rights snapshot. No evasion (CAPTCHA/login/paywall bypass, proxy rotation, rate-limit-evasion-via-scraping all forbidden); commercial crawling needs a 7-gate approval ending in owner written sign-off.
- **Source statuses (canonical, code-aligned):** The Odds API `approved_api` (only live odds), nflverse/Open-Meteo `approved_open_license`, ESPN `approved_public_logged_off`, scores24.live `permission_required`, score24.com `vendor_candidate`, CFBD/Jeff Mans `vendor_candidate`, SiriusXM `permission_required` (Customer Agreement §9 "AI Matters" bans scraping + AI-training use), siriusxm-activator `excluded`.
- **Facts-only doctrine:** extract facts/timestamps/URLs/metadata/derived signals; never article bodies, proprietary predictions/ratings, protected graphics, account-gated content. Pundit picks → attributed accountability claims, **never model inputs**.
- **Trust model:** six-tier source hierarchy; only T1/T2 back picks; T1 overrides on conflict. Freshness SLAs (warn 120 min / stale 240 min; odds TTL 5 min, pick-gen hard guard 60 min). 
- **Compliance:** age-gate (default 21), banned-phrase CI gate, no microbetting/dark patterns, RG signposting (1-800-GAMBLER), no wager-recommendation framing (`kellyStake`/`trueEV`/CLV gated behind real sources + settled-pick floors). **Privacy sign-offs unchecked → live rooms can't launch.** Several API keys were pasted in cleartext in eval docs → rotation pending.
- **Edge pipeline rests on:** The Odds API (lines) + Kalshi (fair-value/CLV anchor) + nflverse/API-Sports (settlement & factors).

### 11. Ops / autonomy / launch / QA / evals
*`AUTONOMOUS_OPERATING_SYSTEM.md`, `docs/ops/*` (incl. `evals/`), `docs/launch-*.md`, `RISK_AND_FAILURE_REGISTER.md`, `PRODUCTION_QUALITY_AUDIT.md`.*

- **Autonomy (code-enforced):** every agent drafts; only a human commits anything externally visible. Six operator agents (JARVIS/SARAH/TAL/SCOUT/AVA/BOBBY) all `externalActions:"NONE"`; the task state machine has **no `DRAFTED→APPROVED` path**; every transition writes an append-only `CockpitDecision`. Six named hard stops (no destructive DB / no auto-migration / no Stripe live mutation / no agent deploy / no publish without approval / no fabricated data / no secret in code).
- **Eval harness:** 33 markdown eval contracts gating every LLM surface (blog, calibration-training, discord/twitter bots, model-court, model-journal, pre-mortem, studio×9) — refusals, citation discipline, banned-vocab blocks, thin-evidence honesty. **All `status: pending-runner`:** the structural contract validator (`evals:contracts`) + promptfoo parity gate run in CI today, but **the model-output scorer that executes the refusal/citation assertions is not built** — the single biggest gap in the "no-fabrication" moat.
- **Launch readiness:** both P0 trust-fatal bugs FIXED (away-favored spread mis-grade; settlement no-op). **Go-live blocked entirely on owner-side actions** (provision prod env/DB/Redis, verify deploy — Vercel reports `live:false`, create Stripe live prices). Soft spots: **alert delivery is unwired** (no stale-unsettled-picks alarm — the moat's observability blind spot); no CSP/HSTS; `www`/apex `SITE_URL` mismatch; blind funnel.
- **Queues:** issue-queue/stuck-queue clean; `NEXT_AUTONOMOUS_LOOP` = ship the `/picks` trust strip; `HISTORICAL_DATA_AND_PROJECTIONS_QUEUE` = market backtest **shipped** (1999+), owner-gated to run against the real DB.

### 12. Handoff / history / leverage
*`handoff/**`, `reports/**`, `_logs/*`, root `CODEX_*.md`, `handoff/leverage/*`.*

- **14 build waves** (2026-05-18 → 06-17): early Codex phases → launch-night observability → Best-of-2026 (the CLV primitive landed here, DEC-006) → nflverse rebuild → agent-os-max-v3 (typed skeleton) → agent-os-runtime → visible-review (the honest reckoning) → consolidation → typecheck-prisma-baseline → gates-and-hardening → launch-2026-06-17 (gate-flip ready).
- **REAL vs TYPED vs UI vs BLOCKED** (gate-verified): agent registry/health/routing/Jarvis-assessment/workflow-planner/NFL-resolvers/calibration-math = **REAL** (pure, tested). Agent-task **DB persistence = TYPED-ONLY** (the `OperatorAgent` enum has 6 agents vs the registry's 23 → 16 can't persist; writes throw → silent in-memory fallback). All 23 agents NOT_WIRED by design (`operationalCapacity = 0`). All external actions BLOCKED. **Nothing verified against a live production DB.**
- **CLV history:** two generations — the engine primitive (`clv.ts`, real + 13 tests) and agent-os helper libs (`lib/market/*`, `lib/calibration/*`, **stubbed, not wired, and duplicate**). Convergence recommendation appears repeatedly: re-export the app libs from `@sports/prediction-engine` rather than maintain two implementations.
- **Leverage stack (near-$0):** Oracle Always-Free ARM VPS (hosts BullMQ+Redis), Ollama/Groq + models.dev + promptfoo (move grunt work off Claude, prove parity before downgrade), DuckDB (local backtesting), Cloudflare/Clarity analytics (cookieless, wired, need tokens), CFBD (free w/ registration, ToS read pending). **The resource dump is cleanup, not a goldmine — no hidden real sports-data feed.**

---

## Part 2 — Cross-cutting findings

### A. Honest build-state ledger
| Layer | State |
|---|---|
| Rights-gating, banned-phrase scan, draft-only autonomy, server-side paywall, freshness gates, proof-gated pricing | **REAL, enforced, tested** |
| CLV grading (lock→close→grade), CLV coverage invariant, public CLV gate, admin CLV dashboard | **REAL, wired** |
| Calibration math (isotonic, Murphy/Brier, ECE, reliability curve, drift), Elo/Poisson/ML referees, edge engine, Kelly, significance, Merkle proof | **REAL, pure/tested — gated, not in live display path** |
| Historical market backtest (1999+ Brier/ECE) | **Built; owner-gated to run against real DB** |
| The Brain (Evidence Vault, Signal Ledger, Entity Graph) | **Doctrine-only / BLOCKED** |
| Jarvis episodic memory, agent-task DB persistence | **TYPED-ONLY (pending migration / enum decision)** |
| 31 product specs | **Design-complete, build-pending** |
| Eval model-output runner, alert delivery, analytics events, lifecycle email, referral, dynamic OG cards | **Not built / unwired** |
| Sports-science licensed data | **Rights-gated; nothing licensed** |
| Production deployment against a live DB | **Never verified** |

### B. Contradictions to resolve once (they recur across domains)
1. **Pricing — 3-way.** Canonical = `pricing-phases.ts` FOUNDING $14.99/$24.99. Stale = $19/$49 monthly (many docs) and $9.99/$13.99 weekly (the two root sales/psych reports critique a now-parked PR #14). *Action: treat the phase ladder as authoritative; sweep stale prices.*
2. **Brand name.** GSE (code/domain SoT) vs GSN (strategy/media docs) vs StatKing vs Sports OS vs SportsPicks Pro. *P0 founder decision; GSE is the authority.*
3. **Voice.** First-person singular (founder) vs first-person plural ("we"). *Needs one ruling.*
4. **Color tokens.** `brand.ts`/`DESIGN.md` vs `design-system/colors_and_type.css` — different hexes *and* a different secondary accent. *Pick one canonical token file.*
5. **Jarvis seat count.** 15 (architecture doc, operator brief) vs 23 (council doc, build spec) — the council expanded 06-12; older docs weren't updated.
6. **Settled-pick floor.** 25 (some policy defaults) vs 100 (env `MIN_SETTLED_PICKS_FOR_LEARNING`, QA checklist). Effective floor is 100; affects when the performance gate may open.
7. **Positioning.** "We're not AI / math you can read" (enforced in code) vs "ship the AI agent" / "Mission Control" framing. The *look* is fine; the *words* are banned.
8. **Free-tier tease.** Psych report wants the factor trail shown on the free pick (the differentiator); value-ladder doctrine forbids leaking the paid product. Unresolved.
9. **CSP/HSTS.** QA checklist lists CSP as a MUST (implying it exists); the audit confirms it doesn't.
10. **`MODEL_VERSION`** v5.0.0 (frozen) vs "v6.0.0" header comments in `kelly.ts`/`poisson.ts`.

### C. Recurring next-best-builds (convergent across handoffs + the charter)
1. Wire CLV/calibration helpers to persisted odds snapshots + canonical settled-pick queries; **converge the duplicate app-level CLV/Brier math onto `@sports/prediction-engine`.**
2. Resolve the `OperatorAgent` enum (6→23) so agent tasks can persist (unblocks "operational capacity > 0").
3. Wire a stale-ingestion / CLV-coverage alert to real timestamps (the observability blind spot).
4. Persist a **modeled win-probability distinct from the confidence UX score** (the deepest integrity issue under any "proven edge" claim; `MODEL_VERSION`-gated).
5. Build the eval model-output runner so the 33 refusal/citation contracts actually execute.
6. Run the historical backfill + the platform's own scorer over 1999+ games → real Brier/ECE → unblocks out-of-sample validation.
7. Proven-edge Phase 2/3: segmented CLV, out-of-sample split harness, champion/challenger promoter.
8. Per-route dynamic OG cards (the viral loop); analytics events + lifecycle email (the blind funnel).

### D. Missing referenced material (cited but absent)
- `packages/prediction-engine/src/market-backtest.ts` (referenced as built; the `/api/calibration/market-backtest` route exists but the engine file doesn't).
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` (the BLOCK-tracker the brain docs depend on).
- `docs/adr/pre-implementation-change-proposal-template.md`, `promotion-publication-checklist.md`, `source-freshness-and-deploy-readiness-guide.md`, `public-cockpit-boundary-and-gate-integrity-contract.md`, `docs/source-registry-spec.md`.
- `packages/prediction-engine/src/factors/registry.ts` (catalog actually lives in `evidence-readiness-matrix.ts`); the named `calibration.test.ts`.
- `docs/calibration-proposals/` holds only `FROZEN.md` (no dated proposal files yet).

### E. Boilerplate / stub docs to treat skeptically (real signal lives in code)
- StatKing: ~16 identical "Codex hardening" files + 6 identical "autonomous integrity" files; `data/**/*.summary.md` are near-empty.
- Sources: `source-atlas`, `source-candidate-triage`, `source-discovery-at-scale`, `source-graph`, `source-trust-model`, `source-freshness-slas`, `source-conflict-resolution`, `vendor-source-expansion`, `team-source-packs` are stubs — logic is in `apps/web/lib/scraping/*`, `lib/data-reliability/*`, `docs/brain/*`.
- Modeling: `player-comp-engine`, `player-archetypes`, `scheme-personnel-formation-intelligence`, `trenches-intelligence-roadmap`, `metric-ontology`, `model-evaluation-framework` are 16-line placeholders.

---

## Part 3 — Implications for the proven-edge program

The research is unusually coherent: **every domain points at the same moat, and the moat's load-bearing link — a live, honest, calibrated CLV track record — is exactly where the plumbing is thinnest.** Sequencing that falls directly out of this map:

- **Phase 1 (in progress):** make CLV a *measured invariant* — coverage receipt (done this branch), then a nightly coverage/staleness alert wired to real timestamps + pre-kickoff odds capture so no settled pick is silently ungraded.
- **Phase 2:** segment CLV (book / line-move direction / time-to-kickoff) off the existing per-book `Odds` history; persist Kalshi as a sharp fair-value anchor to grade against instead of self-consensus.
- **Phase 3:** run the 1999+ historical backfill + the platform's own scorer → out-of-sample Brier/ECE/CLV; stand up the champion/challenger promoter; publish the reliability curve once past the settled-sample floor.
- **Throughout:** converge the duplicate CLV/calibration math onto `@sports/prediction-engine`; persist modeled win-probability separate from the confidence UX score; keep everything behind the coverage + sample-floor gates.

---

*Provenance: compiled 2026-06-22 from a 12-agent parallel sweep of 572 docs + supporting code, on branch `research/proven-edge`. Update this map as domains change; it is the orientation layer beneath `PATH_TO_PROVEN_EDGE.md`.*
