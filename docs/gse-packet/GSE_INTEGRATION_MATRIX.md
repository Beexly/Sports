# GSE — Completeness & Integration Matrix
### Proving nothing got left off: every idea mapped to its home and its real build status
**2026-06-24 · Audit of the full GSE intelligence corpus (15 strategy docs in `…/AI Sports/`) against the shipped branch (`codex/intelligence-core`, worktree `C:\Users\Garrett\Sports-intelligence-core`, 30 commits Slice 0 → AUDIT).**

This is the fear-killer. The owner worried that things discussed got lost. The finding up front: **almost nothing got lost in the docs** — the corpus is unusually self-referential and the branch implemented the entire specced backlog. What is "missing" is overwhelmingly *deliberate* (owner/infra/data/schema-gated, by design) rather than *dropped*. The genuine orphans and inconsistencies are listed in their own sections at the end, with file references.

**Status legend**
- **SHIPPED** — live on the primary product / production path today (pre-existing engine, or revenue loop), independent of the intelligence branch.
- **SHADOW-on-branch** — built and committed on `codex/intelligence-core` as `priced=false` / shadow / draft-only / flagged-off scaffolding; code-ready, not live-ready; passed the gate.
- **DESIGNED-only** — specified in a doc, no code yet (or only a doc artifact), no branch slice.
- **OWNER-GATED** — the mechanism is built; the *flip* (money, publication, infra, schema, data-promotion) is an explicit human action that has not happened.
- **NOT-CAPTURED** — discussed/implied but with no clear home; see ORPHANS.

---

## A. Advisory Pass — the Master "Top Moves" backlog (cross-cluster)

Source: `GSE_EXECUTIVE_ADVISORY_PASS.md` PART I, the 15-row ranked backlog, plus the front-matter / §0–§17 panel review.

| # | Idea/Finding | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|---|
| A1 | Make "The One Ladder" real in schema — one event-sourced `LadderEvent` registry that BOTH pricing tiers and the `priced` flag read | Advisory Top-Move #1; `GSE_INTEL_03` | **SHADOW-on-branch** | Ratify `[SCHEMA]` migration → flip one consumer (`pricing-phases.ts`) out of shadow | Slice A1 (`94ee8bb8`): `packages/types/src/ladder.ts`, `prediction-engine/src/ladder/reduce.ts`, Prisma model added (not migrated), `INV-1` test passing. Two-track rungs encoded. |
| A2 | `replayRun(runId)` backtest harness over stored snapshots (the keystone that makes Model Court evidence cheap) | Advisory #2; `GSE_INTEL_03/04` | **SHADOW-on-branch** | Load real historical rows `[DATA]`; provision R2/DuckDB `[INFRA]` | Slice E1 (`8303eec8`): `replay-harness.ts` + `nflverse-replay-parser.ts`, purged/embargoed walk-forward, OOS MAE report. Plus a runnable driver `scripts/backtest/player-projection-backtest.ts` (per `GSE_BACKTEST_AND_FIXES_STATUS.md`). |
| A3 | Thin REAL tamper-evident proof layer + public client-side verify page | Advisory #3; `GSE_INTEL_05` #6 | **SHADOW-on-branch** (data endpoint, flagged off) | `[OWNER]` enable endpoint; `[INFRA]` durable hash-chain store | Slice D4 (`7ded99ed`): `replayable-provenance.ts` + `/api/calibration/replay-provenance` SHA-256 chain, `FLAGGED_OFF`. The public *verify page* UI is DESIGNED-only. |
| A4 | Reconcile doc-vs-code with a CI registry/matrix test | Advisory #4 | **DESIGNED-only** | Add a CI test asserting every documented faculty has a module/flag | Slice 0 produced a one-time `docs/SURFACE_AUDIT.md`; the *standing CI guard* that fails on drift was never built. See ORPHAN O-1. |
| A5 | `ECE()` + standing calibration reliability audits (Wilson-banded deciles) | Advisory #5 | **SHIPPED** (ECE/Brier/Murphy pre-existing) + **SHADOW** reporting | Wire to public observatory on data `[DATA]` | Pre-existing `lib/calibration/compute.ts` has ECE/Murphy. Slice E2 (`d00a4b78`) adds reliability-diagram reporting in the observatory (draft-only/collecting states). |
| A6 | Evolve the additive confidence into a calibratable **log-odds** model, shipped shadow at weight 0 | Advisory #6; §1 Engineer | **SHADOW-on-branch** (Tweedie/ensemble path) — but NOT a logit reformulation of the 13-component sum | Backtest → DRAFT proposal → Model Court | The branch built a Tweedie-family base estimator (Slice BT) + earned-weight ensemble (B4), not the specific "logit(p)=β0+Σβᵢxᵢ over the 13 components" rewrite §1 describes. Related but not identical — see INCONSISTENCY I-6. |
| A7 | First independent estimator toward priced: opponent-adjusted EPA + Elo/Glicko-2, shadow to the evidence matrix | Advisory #7 | **PARTIAL**: opp-adj EPA **SHIPPED** (feature) + **SHADOW** feature-store row (B1); Elo/Glicko **DESIGNED-only** | Build `elo-estimator.ts`/`glicko-estimator.ts` as shadow estimators | `opponent-adjusted-epa.ts` exists and is wired into B1 feature store (`95524c2f`). Elo/Glicko/SRS/Massey/BTL estimators from the Atlas were never coded. See ORPHAN O-2. |
| A8 | Upgrade the market read: Shin + alt de-vig ensemble + book-weighted median + market-implied power ratings + steam/RLM detectors | Advisory #8; Atlas | **DESIGNED-only** (Shin + median consensus already SHIPPED) | Build `devig.ts` (Shin vs power vs log), `market-power-ratings.ts` | Shin de-vig + median consensus are pre-existing. The *alternative de-vig cross-check*, book-sharpness weighting, market-implied power ratings, and steam/RLM detectors are specced (Atlas ADOPT-NOW) but uncoded. See ORPHAN O-3. |
| A9 | Ship the proof-gated pricing ladder module and fix the entitlement grace leak (PAST_DUE → 7-day grace, not straight to FREE) | Advisory #9; §6 | **DESIGNED-only** | Owner ratifies `pricing-phases.ts` reading `currentRung`; fix grace window | The ladder *reducer* exists (A1) but is shadow; `pricing-phases.ts` does not yet read it. The PAST_DUE grace-leak fix is named in the advisory and never appears in any slice. See ORPHAN O-4. |
| A10 | Make the Agent OS legible — shipped roles, 6 departments, capability bounds, org-chart + escalation visual, golden-tested `attentionScore()` (WSJF) | Advisory #10; §11 | **NOT-CAPTURED** in the intelligence build | A separate UI/ops slice | Entirely outside the intelligence branch scope; no slice touches the Agent OS. Pre-existing platform concern. See ORPHAN O-5. |
| A11 | Type the Status taxonomy (enum + census script + maturity dashboard) and GENERATE §16 status from real gate state | Advisory #11; front matter | **DESIGNED-only** | `packages/types/src/status.ts` + `scripts/status-census.ts` | The advisory's most-detailed front-matter recommendation (TRL-style 7-state enum, 2×3 maturity grid, `status.invariants.test.ts`). No slice implemented it. See ORPHAN O-6. |
| A12 | Convert the War Room from DEMO into an evidence-cited council (each agent = a real signal w/ provenance + falsifier + `signalLineageId`; reliability-weighted log-odds fusion) | Advisory #12; §7 | **PARTIAL / adjacent**: the divergence layer (C5) provides the signal-fusion spine; the War-Room surface rewrite is **DESIGNED-only** | Wire C5 divergence signals into the War Room UI | C5 (`3e44a995`) builds the standardized signal fusion the council would need, but the War Room surface itself was not converted. |
| A13 | Wire analytics (PostHog) + the proof-loop funnel events | Advisory #13 | **OWNER-GATED** | Owner sets analytics tokens (`GSE_INTEL_04` M0 step 2) | Named as an owner go-live step (Cloudflare + Clarity tokens), not a code slice. |
| A14 | Package the governance stack as a licensable trust toolkit + public "Truth in Picks" trust ledger (map to SR 11-7, RG codes) | Advisory #14 | **DESIGNED-only** | A future revenue-line build | Aspirational revenue line #5; the public model-changelog (`GSE_INTEL_03` Part 4) is the nearest shipped-adjacent artifact (E2/D3/D4 feeds), but the *licensable toolkit* is unbuilt. |
| A15 | Multi-sport via dormant `poisson.ts` — MLB bivariate Poisson (Lahman), NHL MoneyPuck xG→Poisson + Skellam puck-line — behind per-sport gates | Advisory #15; Atlas; INTEL_00 (Skellam) | **DESIGNED-only** | Unblock `team-rates.ts` source; per-sport go-live gates | Explicitly deferred in `GSE_INTEL_04` Part 4 ("multi-sport — defer"). Skellam added to the method family by INTEL_00. No code. |

**Status-taxonomy / §0 summary panel findings** (front matter, §0): the "engine maturity = revenue maturity = one ladder" spine, the "ranking index not win probability" promise, the moat-as-time-locked-proof-asset framing — all **carried forward** into `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md` as the headline thesis. The *typed* status enum + generated census (A11) is the one front-matter deliverable left DESIGNED-only.

---

## B. The Forecasting Methodology Atlas — relevance picks + distributional additions

Source: `GSE_FORECASTING_METHODOLOGY_ATLAS.md` (169 methods, 5-verdict rubric) + `GSE_INTEL_00_RIGOR_PASS.md` fantasy-native additions.

| Idea/Finding | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **ADOPT-NOW** transparency wins: bootstrap CIs on every number, log-loss beside Brier, alt de-vig in the receipt, purged/embargoed walk-forward CV as the Model Court gate | Atlas "cheapest highest-leverage wins" | **PARTIAL**: walk-forward purged/embargoed CV **SHADOW-on-branch** (E1, B4, BT); bootstrap CIs / log-loss-beside-Brier / alt-de-vig-in-receipt **DESIGNED-only** | Add to the calibration + receipt surfaces | Walk-forward discipline is the most-implemented Atlas pick. The reporting-transparency trio is specced but not all wired. |
| Conformal prediction (split/Mondrian) for distribution-free intervals | Atlas ADOPT-NOW; INTEL_01 L5 | **SHADOW-on-branch** | Coverage on real data `[DATA]` | Slice B5 (`635c6c44`): Adaptive Conformal Inference, Mondrian-by-position, rolling recalibration. (Note: ACI per INTEL_00 C2, not vanilla split.) |
| Empirical-Bayes / James-Stein / Beta-Binomial / Dirichlet shrinkage | Atlas ADOPT-NOW; INTEL_01 L2 | **SHADOW-on-branch** | Tune `k` per position `[DATA]` | Slice B2 (`4e4a5560`): `player-rate-posteriors.ts`, published `w=n/(n+k)`, `DEFAULT_PLAYER_RATE_SHRINKAGE_K=12`. |
| Market-implied power ratings; MOV-adjusted Elo; SRS + shared iterative-SOS solver; Glicko-2; opp-adj EPA; Bradley-Terry; Massey; Pythagorean; Poisson→Dixon-Coles | Atlas rating-systems adoption sequence (9 ranked) | **MOSTLY DESIGNED-only** (opp-adj EPA shipped) | Build the shadow estimators on the standard ladder | Only opp-adj EPA exists. The 9-step rating-system adoption sequence is the single largest *uncoded* block of the Atlas. See ORPHAN O-2. |
| PILOT methods: state-space/Kalman line-movement, GARCH uncertainty, quantile regression, LOESS, probabilistic GBM (NGBoost/quantile-LightGBM), anomaly/change-point detection, Monte-Carlo sim | Atlas PILOT list | **PARTIAL**: change-point logic in C1; game-script Monte-Carlo scaffold in C3; quantile concepts in availability (C4). Kalman/GARCH/GBM/LOESS **DESIGNED-only** | Per-method backtest before pricing | Most PILOT methods remain pilots-on-paper. |
| **Tweedie GLM / gradient-boosted Tweedie** (the headline omission — native fantasy-points distribution) | INTEL_00 Atlas-completeness add; ADOPT-NOW | **SHADOW-on-branch (scaffold, honestly labeled)** | Wire true Tweedie deviance gradient `[DATA]`, or rename | Slice BT (`9684385e`): `tweedie-baseline.ts`. **Important:** it boosts stumps on L2 of `log1p(y)` — a Tweedie-*flavored scaffold*, not a fitted Tweedie GLM. Honesty note added; rename to `boostedLog1pBaseline` still pending. See INCONSISTENCY I-1. |
| Gaussian copula / cross-player correlation (QB–WR ≈ 0.5) | INTEL_00 C6 add; ADOPT-NOW | **SHADOW-on-branch** | Learn correlation coefficients `[DATA]` | Slice C6 (`5c4e6f75`): `projections/correlation.ts`, consumed by best-ball + parlay; fixed shadow coefficients. |
| Zero-inflated/hurdle; Dirichlet-multinomial (allocation); GAMLSS; Plackett-Luce; Skellam (margins/puck lines); Mixture Density Networks | INTEL_00 Atlas-completeness adds (PILOT/REFERENCE) | **DESIGNED-only** (Dirichlet-multinomial partially realized inside B2/B3 allocation) | Atlas body integration + per-method pilots | These were added by the rigor pass as a *correction banner* on the Atlas; the Atlas body still reads "169 … complete for betting." See INCONSISTENCY I-2 and Task #18 (still open). |
| **SKIP** verdicts (deep-learning sequence models, CNN on tracking data, RPI, Cox-on-pick-surface, unconstrained AutoML) | Atlas SKIP list | **HONORED** (nothing built) | n/a — correctly not chased | INTEL_04 Part 4 reaffirms the deep-learning skip. Cox is *reused* off-surface (C4) exactly as INTEL_00/Atlas note — a deliberate, correct reuse, not a contradiction. |

---

## C. The Intelligence Core — the 6 layers + the C1–C6 corrections

Source: `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md` Part II + `GSE_INTEL_01_CORE_ARCHITECTURE.md` (L1–L6) + `GSE_INTEL_00_RIGOR_PASS.md` (C1–C6).

| Layer / correction | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **L1 Feature store** (opp-adj EPA, CPOE, WOPR, air-yards/aDOT, PROE/pace, RZ usage) → R2/DuckDB | INTEL_01 L1 | **SHADOW-on-branch** (interface + opp-adj EPA); other metrics **DESIGNED-only** | Provision R2/DuckDB `[INFRA]`; build remaining metric modules | Slice B1 (`95524c2f`): `feature-store.ts` seam + coverage-map + opp-adj EPA snapshot. CPOE/WOPR/air-yards/PROE/RZ modules specced but only EPA wired. |
| **L2 Player-rate posteriors** (empirical-Bayes shrinkage, Beta-Binomial + Normal-Normal + Dirichlet) | INTEL_01 L2 | **SHADOW-on-branch** | Tune `k` `[DATA]` | Slice B2. Posterior mean+variance, published shrinkage. |
| **L3 Market-anchored reconciliation** (keystone) — allocate Vegas team total across roster, emit DIVERGENCE | INTEL_01 L3 | **SHADOW-on-branch** | Fit points→yards/TD coefficients `[DATA]` | Slice B3 (`52c39ecd`). **C1 correction applied:** conserves team yards & TDs, fantasy points derived. Audit confirms invariant respected. |
| **L3.5 Cross-player correlation/copula** (the C6 add, sits between allocation and ensemble) | INTEL_00 C6; INTEL_01 banner | **SHADOW-on-branch** | Learn coefficients `[DATA]` | Slice C6. Same engine powers best-ball spike-week + DFS stacks + parlays. |
| **L4 Earned-weight ensemble** (Hedge/multiplicative-weights; must beat equal-weight AND market-only OOS) | INTEL_01 L4 | **SHADOW-on-branch** | Real OOS samples `[DATA]` | Slice B4 (`7bfb81ff`). **C5 correction applied:** Clark-West nested test + bounded loss feeding Hedge regret bound. |
| **L5 Uncertainty / conformal** (split/Mondrian by position) | INTEL_01 L5 | **SHADOW-on-branch** | Coverage on real data `[DATA]` | Slice B5. **C2 correction applied:** Adaptive Conformal Inference, "tracks the target rate" framing. Conformal coverage-`(n+1)` bug fixed this session (per `GSE_BACKTEST_AND_FIXES_STATUS.md`), pending one gate run. |
| **L6 Self-publishing calibration** (pre-game commit, post-game MAE/coverage/rank-corr/Brier vs market, publish reliability) | INTEL_01 L6 | **SHADOW-on-branch (criteria-only, draft)** | Real settled rows `[DATA]`; owner flip `canPublishProjections` | Slice B6 (`d7d56828`). Defines (does NOT flip) the publish criteria. |
| **C1** — anchor YARDS & TDs not fantasy points *(the big correction)* | INTEL_00 C1 | **APPLIED (SHADOW-on-branch)** | — | Verified in `market-anchored-reconciliation.ts` by the branch audit. The single most important override; propagated to B3 + leakage test. |
| **C2** — Adaptive Conformal Inference, no false coverage guarantee | INTEL_00 C2 | **APPLIED (SHADOW-on-branch)** | — | But INTEL_01 L5 *body text* still contains "guaranteed marginal coverage" phrasing. See INCONSISTENCY I-3. |
| **C3** — historical backtest now, not preseason calibration | INTEL_00 C3 | **APPLIED (SHADOW-on-branch)** | Load real seasons `[DATA]` | E1 harness is the substrate; INTEL_04's preseason critical path is now demoted to a "dress rehearsal." See INCONSISTENCY I-7. |
| **C4** — split fantasy track (MAE) vs betting track (CLV) on the same ladder | INTEL_00 C4 | **APPLIED (SHADOW-on-branch)** | — | A1 `RUNG_REQUIREMENTS` encodes two tracks; `trackRungs.fantasy` / `trackRungs.betting` keep them from cross-unlocking. |
| **C5** — Clark-West (not Diebold-Mariano) for nested models; bounded loss for Hedge | INTEL_00 C5 | **APPLIED (SHADOW-on-branch)** | — | In BT + B4 gates. |
| **C6** — add the cross-player correlation/copula layer (was missing) | INTEL_00 C6 | **APPLIED (SHADOW-on-branch)** | Learn coefficients `[DATA]` | Slice C6. |

**Architectural invariants (INTEL_01):** GSE Score stays a ranking index; calibration evidence-only + human-gated; `canPublishProjections=false` hard wall; stat-commandment envelope on every output; source-of-truth ordering; no isotonic below n=100. All **HONORED** on the branch (audit + handoff safety-invariants list confirm).

---

## D. The Forecasting Frontier — the 5 modules

Source: `GSE_INTEL_02_FORECASTING_FRONTIER.md` (Modules 1–5).

| Module | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **M1 Opportunity / role-migration** (Markov role-states + EB-shrunk transitions + vacated-touch redistribution) | INTEL_02 M1 | **SHADOW-on-branch** | Learn transition priors `[DATA]` | Slice C2 (`305776e9`): `opportunity-transfer.ts`. Reads process-grade; forward forecast gated. |
| **M2 Injury/return + role-tenure** (discrete-time hazard / Kaplan-Meier / Cox PH — the deliberate Cox reuse) | INTEL_02 M2 | **SHADOW-on-branch** | Learn hazard coefficients; wire injury feed `[DATA]` | Slice C4 (`005a4325`): `availability-role-tenure.ts`. KM curves, Cox-style hazard, P(active), role half-life. |
| **M3 Game-script** (Vegas WP-path → pass/run rate, plays, pace) | INTEL_02 M3 | **SHADOW-on-branch** | Learn pass/run/pace coefficients `[DATA]` | Slice C3 (`9ef7304f`): `game-script.ts`. Supplies the pass/run split B3/C1 reuse. |
| **M4 Breakout/regression engine** (regression-to-mean + xTD/xCatch/xYPRR + change-point) — *ship first, process-grade* | INTEL_02 M4 | **SHADOW-on-branch** (process-grade readout) | Learn xCatch/xTD coefficients `[DATA]` | Slice C1 (`2511a89e`): extends `receiving-opportunity.ts`. The "Mirage & Buried" / "The Receipt" content engine. |
| **M5 Divergence layer** (market-minus-model z, conformal-overlap-gated, routes to betting/fantasy/content) | INTEL_02 M5 | **SHADOW-on-branch** | Learn source weights `[DATA]` | Slice C5 (`3e44a995`): `divergence.ts` unifies B3 + C1–C4 into one spine → 3 shadow queues. |

All five **built and committed** as shadow. The *content hooks* ("Vacated Touches", "The Return Curve", "Script Report", "Mirage & Buried", "The Receipt") are DESIGNED-only as published surfaces — the signal math exists; the auto-generated content/posting is gated by `draft-only.mjs`.

---

## E. The Frontier Addendum — the 6 rarer mechanisms

Source: `GSE_INTEL_05_FRONTIER_ADDENDUM.md`.

| Mechanism | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **F1 Cross-market triangulation** (third market = player props vs B3 anchor) | INTEL_05 #1 | **SHADOW-on-branch** | Wire live prop source `[DATA]/[INFRA]` | Slice D1 (`81907adc`): `prop-anchor.ts` → residuals into divergence board. |
| **F2 Public model parliament** (live CRPS leaderboard of internal models) | INTEL_05 #2 | **SHADOW-on-branch (flagged off)** | Enable feed `[OWNER]`; model registry `[DATA]` | Slice D3 (`f05af2c3`): `model-parliament.ts`, public feed `FLAGGED_OFF`. |
| **F3 Community calibration tournament** (score users w/ proper scoring rules; aggregate→signal) | INTEL_05 #3 | **SHADOW-on-branch (draft-only scaffold)** | Identity/abuse/storage/recognition `[OWNER]/[INFRA]` | Slice D5 (`d1aea679`): `calibration-tournament.ts`, recognition impossible in code until approved. |
| **F4 Options-style distribution pricing** (ceiling/floor/spike/bust from posteriors+conformal) | INTEL_05 #4 | **SHADOW-on-branch** | Wire real posterior/conformal feed `[DATA]` | Slice D2 (`9dc2bfac`): `distribution.ts`, surfaced in best-ball without changing recommendations. |
| **F5 Active learning** (point the ingest budget at widest intervals / worst-calibrated buckets) | INTEL_05 #5 | **SHADOW-on-branch** | Durable segment store + review workflow `[INFRA]/[DATA]` | Slice D6 (`d20e9b5c`): `uncertainty-map.ts`, review-queue only (never auto-retrains). |
| **F6 Replayable forecast provenance** (anyone replays the hash chain to reproduce calibration) | INTEL_05 #6 | **SHADOW-on-branch (flagged off)** | Enable endpoint `[OWNER]`; durable chain `[INFRA]` | Slice D4 (`7ded99ed`): `replayable-provenance.ts` + route. |

**Novelty ledger** (INTEL_05) — the honest "table-stakes / applied-well / frontier-for-this-market / not-claimed" framing — is a *positioning* artifact, **carried in the doc**, never needed code. Correctly so.

---

## F. The Flywheel / LadderEvent / cost-as-moat / model-changelog

Source: `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md` Parts I & IV + `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md`.

| Idea/Finding | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **The settled-game heartbeat** — one `game.settled` event → DATA→FORECAST→PROOF→UNLOCK, idempotent, ordered | INTEL_03 Part 1 | **SHADOW-on-branch (pure stub)** | Wire to the real settlement worker `[INFRA]` | Slice A2 (`84d666ee`): `fanoutGameSettledHeartbeat()`, pure, returns ledger/ladder artifacts for a caller to persist later. No app caller yet (the B− integration gap). |
| **`LadderEvent` ledger + `reduceLadder()` + RUNG_REQUIREMENTS** (single source of truth) | INTEL_03 Part 2 | **SHADOW-on-branch** | `[SCHEMA]` migrate; flip consumers one at a time | Slice A1. INV-1..INV-5 logic present. `currentRung` is a conservative cross-track summary. |
| **INV-1** — a tier advance and a priced-flip derive from the same milestone event (the investor-slide test) | INTEL_03 §2.6 | **SHADOW-on-branch (test passing)** | — | The headline invariant is a passing test in `prediction-engine/src/ladder/__tests__/`. |
| **Cost-as-weapon** — R2 Parquet (free egress) + in-process DuckDB → ~$0 marginal backtest | INTEL_03 Part 3; CORE Part IV | **PARTIAL**: Phase-0 cost controls **SHIPPED** (deploy-gate, snapshot hash-only, CDN); R2/DuckDB/Oracle **OWNER-GATED `[INFRA]`** | Provision when volume justifies (`GSE_INTEL_04` M3) | Slice F1 (`0b1c8317`) codes the persist-what-we-fetch seam; F3 (`42b0c882`) confirms the shipped Phase-0 controls. The zero-cost substrate itself is unprovisioned by design. |
| **Public model changelog / intelligence ledger** (`/intelligence-ledger`) — users watch it get smarter weekly | INTEL_03 Part 4; CORE Part IV | **DESIGNED-only** (the read-view page); feeds exist (E2/D3) | Build the `/intelligence-ledger` surface over LadderEvent + CalibrationProposal | The *page* was never built as a slice; E2 reliability panel + D3 parliament feed are the nearest shipped pieces. See ORPHAN O-7. |
| **`featureVectorRef` / corpus append on settle** (the data moat deepens every Sunday) | INTEL_03 §1.3(a) | **SHADOW-on-branch (seam)** | `[INFRA]` R2 corpus | F1 seam + heartbeat DATA stage; no real corpus write until R2 provisioned. |

---

## G. The 80-day sequence + the revenue launch

Source: `GSE_INTEL_04_80DAY_SEQUENCE.md` + `GSE_GO_DECISION.md` §1.

| Idea/Finding | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **THE ONE THING THIS WEEK** — soft-launch the $49/yr Fantasy tier on real nflverse data (peak draft season) | INTEL_04 Part 1; GO_DECISION §1 | **OWNER-GATED** (loop 100% built/SHIPPED; flip is owner) | Owner does the 6–9-step Stripe punch-list | The revenue loop (Stripe wiring→webhook→checkout→FANTASY entitlement→best-ball) is verified end-to-end real. Blocked ONLY on: create live Stripe `STRIPE_FANTASY_*` price, set live keys, register webhook, set `NEXT_PUBLIC_APP_URL`. Until then checkout returns a clean 503. |
| `PROJECTIONS_PROVIDER` flip → real season-long graded pool | INTEL_04 M0; GO_DECISION §1.5 | **OWNER-GATED** | Owner sets the env value | Leaving it unset is honest ("illustrative" badge). Added to `.env` templates is a pending work-order item (GO_DECISION §3.4). |
| M2 — freeze `weekly-model.ts`, pre-commit immutable pre-game projection rows | INTEL_04 M2 / Part 3 | **DESIGNED-only** | `[DATA]` capture pipeline | The keystone start. Not a branch slice (it's an owner/data operating action on the primary clone). |
| M4/M5 — preseason backtest as *dress rehearsal* (HOF Aug 6, preseason Aug 13+) | INTEL_04 M4/M5 (corrected by INTEL_00 C3) | **DESIGNED-only** | `[DATA]` | INTEL_00 demotes preseason from calibration to plumbing test; the real evidence comes from the E1 historical harness. |
| M6 — land IMPLEMENTED CalibrationProposal, bump `MODEL_VERSION`, flip `canPublishProjections` | INTEL_04 M6 / Part 3 | **OWNER/DATA-GATED** | `[DATA]` + `[OWNER]` | Codex may only author DRAFT proposals; the IMPLEMENTED flip + version bump + publish flip are human. |
| M7 — Sept 9 ribbon-cutting (loud launch behind "publicly backtested, calibration-frozen weekly projections") | INTEL_04 M7 | **DESIGNED-only** | Owner, post-keystone | Depends on M6 clearing. |
| M8 — in-season Frontier modules, each behind freeze→backtest→clear | INTEL_04 M8 | **SHADOW-on-branch** (modules built) + **DESIGNED-only** (in-season clearance) | Per-module DRAFT proposal `[DATA]` | The C1–C5 modules are already built as shadow ahead of schedule. |
| **Explicit DEFER list** (real-money/DFS, CV charting, deep-learning, multi-sport, coverage-map UI, email sending, full R2 lake) | INTEL_04 Part 4 | **HONORED** (none built) | n/a | All correctly absent. `draft-only.mjs` enforces the no-email-send rule structurally. |
| **Runway-aware ops** — marginal cost ≈ $0 until a line item pays for itself; annual pricing front-loads cash | INTEL_04 Part 5 | **OWNER-GATED** | Spend triggers, not calendar | A discipline/operating rule, carried in the doc. |

---

## H. The rigor-pass corrections + the 5-lens review findings

Source: `GSE_INTEL_00_RIGOR_PASS.md` (scorecard, C1–C6, Codex-brief hardening) + `GSE_GO_DECISION.md` (5-lens grades + work order) + `GSE_BACKTEST_AND_FIXES_STATUS.md`.

| Idea/Finding | Source | Status in the build | Where it should live next | Notes |
|---|---|---|---|---|
| **C1–C6 math corrections** | INTEL_00 | **APPLIED (SHADOW-on-branch)** | — | See section C above; all six landed on the branch and the audit confirms. |
| **Codex-brief hardening**: mandatory blocking Slice 0; ban Codex `IMPLEMENTED` proposals; move backtest harness first; new flags default OFF; no live/paid API in tests; no prod-DB migrations; ≤8 files/slice + DECISIONS_TO_RATIFY | INTEL_00 "Codex brief hardening" | **APPLIED (process)** | — | Slice 0 (`0c13254f`) ran first and is blocking; `DECISIONS_TO_RATIFY.md` maintained; safety invariants confirmed by audit. |
| **5-lens review grades** of `codex/intelligence-core`: integration **B−**, math **A−**, tests **A**, safety **A−**, revenue **A−** | GO_DECISION header | **CAPTURED** (verdict) | — | Branch verified real, not merged, not deployed. |
| **Integration gap (the B−)** — `LadderEvent` reducer + engine compute layer have **no app caller yet** | GO_DECISION §3.5 | **PARTIAL / OPEN** | Wire reducer + observatory readouts in shadow (work-order item 5) | Modules are "exported-only," not "wired but gated." This is the single biggest honest gap. The work-order item to close it is **NOT-CAPTURED as a shipped slice** — see ORPHAN O-8. |
| **The conformal coverage bug** — split-conformal intervals too narrow on small samples (missing `(n+1)` order statistic) while labeled "calibrated" | GO_DECISION §3 (Fixed); BACKTEST_STATUS #1 | **FIXED (pending one gate run)** | Codex/owner re-run the gate before merge | `conformal-intervals.ts` + `tweedie-aci.ts` now use the `(n+1)` finite-sample order statistic. Verified by hand, not by a gate run (sandbox was down). |
| **Yard coherence** — reconciliation conserves a single merged yard pool; must split pass/rush/receiving pools (use C3 game-script split) | GO_DECISION §3 work-order #2; BACKTEST_STATUS | **OPEN (specced, not applied)** | Codex applies the yard-pool split, `priced=false` | Named in both GO_DECISION §3 and BACKTEST_STATUS; not yet a slice. See ORPHAN O-9. |
| **Endpoint security** — ADMIN-gate leaky readiness endpoints (`airwave/*`, `media/readiness`, `health/synthetic-monitoring`); rate-limit open `human/*` + `sleeper/league` | GO_DECISION §3 work-order #3 | **OPEN (specced, not applied)** | Codex applies the gating commit | Not yet a slice. See ORPHAN O-10 (the only finding with a mild security flavor). |
| **Tweedie truth-in-labeling** — implement real Tweedie deviance gradient OR rename `fitTweedieBaseline`→`boostedLog1pBaseline`; no false "Tweedie" claim on a public surface | INTEL_00 Atlas-add; GO_DECISION §3 #1; BACKTEST_STATUS #2 | **PARTIAL**: honesty *note* added (comment-only); rename/real-fit **OPEN** | Either wire the deviance gradient `[DATA]` or rename | The comment forbids public "Tweedie" claims; the export is still named `fitTweedieBaseline`. See INCONSISTENCY I-1. |
| **The flip-earning backtest** (load real nflverse 1999+ → purged/embargoed walk-forward → Clark-West vs market) | GO_DECISION §4; BACKTEST_STATUS | **SHADOW-on-branch (driver written, not yet run)** | Owner/Codex runs the one command | `scripts/backtest/player-projection-backtest.ts` is runnable; the result ("beats NAIVE = true/false") is the green light to attach to a DRAFT proposal. It tests vs naive points-persistence, NOT yet vs Vegas market (needs historical props, a `[DATA]` follow-up). |

---

## I. The owner / infra / data / schema gates

Source: `docs/CLAUDE_HANDOFF.md` "Human Gates" + `docs/DECISIONS_TO_RATIFY.md` "Standing Human Gates".

| Gate class | Idea/Finding | Status | Where it should live next | Notes |
|---|---|---|---|---|
| `[OWNER]` | Merge/deploy, live money, Stripe price creation, pricing-rung flips, public-feed enablement, Vercel ignored-build wiring | **OWNER-GATED (open)** | Owner decision | Nothing on the branch crosses these; audit confirms no money/secret/prod path touched. |
| `[INFRA]` | Provision `R2_FEATURE_STORE`, `R2_FETCH_ARCHIVE`, DuckDB `feature_store.*`/`fetch_store.*`, durable hash-chain/tournament/trace stores, Oracle VPS, CDN rollout | **OWNER-GATED (open)** | Provision when volume justifies | All built as injected seams (B1, F1, D4, D5, D6). |
| `[DATA]` | Load real historical projection/outcome rows, learn coefficients, tune thresholds, produce Clark-West reports, bump `MODEL_VERSION`, approve promotions | **OWNER/DATA-GATED (open)** | Run the harness on real data | The single most impactful next action (per both handoffs). |
| `[SCHEMA]` | Generate/review/apply the `LadderEvent` migration to the target DB | **OWNER-GATED (open)** | Ratify migration path | Prisma model exists in schema; never migrated. |
| Standing flags never flipped by code | `canPublishProjections`, `PROJECTIONS_PROVIDER`, `PERFORMANCE_STATS_ENABLED`, `PUBLIC_PICKS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, `CALIBRATION_ADJUSTMENTS_ENABLED` | **OWNER-GATED (all OFF)** | Owner/data flips with evidence | Confirmed OFF by SURFACE_AUDIT + branch audit scan. |

---

## ORPHANS — discussed but not captured anywhere (true gaps)

These are ideas that appear in the corpus with a clear intent but have **no home in the build and no slice/owner-action that captures them**. Distinguished from OWNER-GATED items (which *are* captured, just awaiting a human flip).

- **O-1 · The standing doc-vs-code CI guard (Advisory Top-Move #4).** Slice 0 produced a *one-time* `SURFACE_AUDIT.md`, but the advisory's actual ask — *"CI fails if a documented faculty has no corresponding module/flag"* — was never built. Nothing prevents the spec from silently drifting from shipped reality again. *Home: a new `scripts/guardrails/surface-parity.mjs` + CI step.*
- **O-2 · The 9-step rating-system estimator ladder (Atlas + Advisory #7).** Market-implied power ratings, MOV-Elo, SRS + shared iterative-SOS solver, Glicko-2, Bradley-Terry, Massey, Pythagorean, Dixon-Coles — all ADOPT-NOW/PILOT in the Atlas, all with named target files (`market-power-ratings.ts`, `srs.ts`, `glicko-estimator.ts`, etc.), **none coded.** Only opp-adj EPA exists. This is the largest uncoded design block in the corpus. *Home: shadow estimators on the standard ladder, post-launch.*
- **O-3 · Market-read upgrades (Advisory #8).** Alternative de-vig cross-check (Shin vs power vs log) emitted into the receipt, book-sharpness-weighted median, steam/RLM detectors, consensus-integrity MAD guard. Specced in §2 + Atlas; no slice. *Home: `devig.ts` + the receipt surface.*
- **O-4 · The PAST_DUE entitlement grace-leak fix (Advisory #9).** The advisory explicitly flags that today PAST_DUE appears to drop straight to FREE instead of the documented 7-day grace, and asks for a test. This bug-fix is named once and **never tracked anywhere** — not a slice, not an owner gate, not in DECISIONS_TO_RATIFY. *Home: an entitlements slice + regression test.* (Highest-value true orphan — it's a live revenue-integrity bug, not a future feature.)
- **O-5 · Agent OS legibility (Advisory #10).** Org-chart + escalation visual, capability bounds, golden-tested `attentionScore()` (WSJF). Entirely outside the intelligence branch; no home. *Home: a separate ops/UI workstream.*
- **O-6 · The typed Status taxonomy + generated census (Advisory #11, front matter).** The single most fleshed-out front-matter recommendation (TRL-style enum, 2×3 maturity grid, `status-census.ts`, `status.invariants.test.ts`). No slice. *Home: `packages/types/src/status.ts` + a census script.*
- **O-7 · The `/intelligence-ledger` public changelog page (INTEL_03 Part 4).** The read-view page where "users watch the system get smarter every settled week" — repeatedly cited as the engagement+proof artifact — was never built as a slice (only its data feeds, E2/D3/D4). *Home: `app/intelligence-ledger/page.tsx` over LadderEvent + CalibrationProposal.*
- **O-8 · The reducer/heartbeat app-caller wiring (the B− gap; GO_DECISION §3 work-order #5).** The `LadderEvent` reducer and engine compute layer have *no app caller* — they are exported-only. The work-order item to wire them in shadow + surface observatory readouts is the explicit fix, and it is **not captured as a shipped slice** (it postdates the FINAL/AUDIT commits). *Home: the next Claude/Codex commit per `GSE_CLAUDE_HANDOFF_PROMPT.md` task 3.*
- **O-9 · The yard-pool split (GO_DECISION §3 #2; BACKTEST_STATUS).** Split the single merged yard pool into pass/rush/receiving and conserve each separately using the C3 split. Specced in two docs; not yet a slice. *Home: a `market-anchored-reconciliation.ts` follow-up commit, `priced=false`.*
- **O-10 · The endpoint-security hardening (GO_DECISION §3 #3).** ADMIN-gate the leaky `airwave/*` + `media/readiness` + `health/synthetic-monitoring` reads; rate-limit open `human/*` + `sleeper/league`. Specced; not yet a slice. *Home: a security commit. (Low severity — payloads are booleans/counts — but it's the one finding with operational-disclosure risk.)*

**Honest framing:** O-8, O-9, O-10 are not "lost" so much as *queued in the handoff but not yet executed* — they are the exact open work-order in `GSE_CLAUDE_HANDOFF_PROMPT.md` / `GSE_GO_DECISION.md §3`. O-1, O-4, O-6 are the truer orphans: named in the advisory, then never picked up by any downstream doc or slice. **O-4 (the PAST_DUE grace leak) is the most important true orphan** — it is a concrete, live revenue-integrity bug that has fallen entirely through the cracks.

---

## INCONSISTENCIES — claims that conflict across docs

- **I-1 · "Tweedie" labeling (the most material).** `GSE_INTEL_00` calls Tweedie/gradient-boosted Tweedie the ADOPT-NOW base fantasy estimator; the `EXECUTION_LEDGER` row BT and the `GSE_INTEL_01` banner describe a "genuinely fitted Tweedie / gradient-boosted Tweedie." But `GSE_GO_DECISION.md §3` and `GSE_BACKTEST_AND_FIXES_STATUS.md` correctly state the shipped `tweedie-baseline.ts` boosts stumps on **L2 of `log1p(y)` and never uses `tweediePower` in the loss** — a Tweedie-*flavored scaffold*, not a fitted Tweedie GLM. The honesty note was added (comment-only) but the export is still named `fitTweedieBaseline` and the INTEL_01 banner still implies a real fit. **The correction is acknowledged but not fully propagated** — a reader of INTEL_01 alone would believe a fitted Tweedie ships. *Resolve: implement the deviance gradient or rename to `boostedLog1pBaseline` and fix the INTEL_01 banner.*
- **I-2 · Atlas method count (169 vs 177).** The Atlas header and body assert **169 methods** ("complete *for betting*") across 30+37+48+54. `GSE_INTEL_00` then adds **8 fantasy-native methods** (Tweedie, zero-inflated/hurdle, Dirichlet-multinomial, GAMLSS, Plackett-Luce, Skellam, Gaussian copula, Mixture Density Networks) as a *correction banner* — but the Atlas body was never re-numbered or re-integrated (Task #18 "Integrate the fantasy-native family into the Atlas" is still open). So the corpus never reconciles to one number: it is simultaneously "169" (Atlas body) and "169 + 8" (after INTEL_00), with the additions living only in a banner and in INTEL_00. *Resolve: integrate the 8 into the Atlas body and restate the count (≈177).*
- **I-3 · Conformal "guarantee" language.** `GSE_INTEL_00` C2 is explicit that coverage is **adaptive, not guaranteed** ("claim the honest thing: 'adaptive coverage that tracks the target rate,' not a finite-sample guarantee"). The `GSE_INTEL_01` L5 *banner* and *build* honor this (ACI). But the L5 *body text* still contains the pre-correction phrasing — "a **guaranteed** marginal coverage," "exact and distribution-free," "90% … and actually keep the promise." The same document both guarantees and disclaims the guarantee. *Resolve: scrub the L5 body to the ACI "tracks the target rate" framing.*
- **I-4 · Branch of record.** The design docs (`GSE_INTEL_01–05`, `GSE_CODER_KICKOFF`, `GSE_CODEX_AUTONOMOUS_EXECUTION`, `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL`) name the work branch **`claude/sweet-fermi-sk9gws`**. The actual build is on **`codex/intelligence-core`** (cut from `origin/claude/sweet-fermi-sk9gws` at `62ffca63`), per Slice 0 / `SURFACE_AUDIT.md` / `CLAUDE_HANDOFF.md`. Benign (Slice 0 recorded the decision) but every design doc still points at the wrong branch name. *Resolve: a one-line note, or accept as recorded-and-known.*
- **I-5 · Freshness thresholds (a genuine un-reconciled triple).** `GSE_EXECUTIVE_ADVISORY_PASS §2` itself flags **three different freshness numbers across three files**: `config.ts` `FRESHNESS_THRESHOLD_MS` = **1 hour**; the doc/board advertises **warn=120min / stale=240min**; the source-registry SLA = **30min**. The advisory's own fix (a single `FreshnessPolicy` export) is **DESIGNED-only** — never built — so the inconsistency the advisory diagnosed still stands in the code. *Resolve: ship the unified `FreshnessPolicy` constant.*
- **I-6 · "Log-odds model" vs what shipped.** Advisory Top-Move #6 + §1 specify evolving the **13-component additive sum into a penalized-logistic / boosted log-odds model** (`logit(p)=β0+Σβᵢxᵢ`) mapped back to the 0–100 surface. What the branch actually built (Slices BT + B4) is a **Tweedie-family base estimator + Hedge ensemble for the fantasy projection** — a different (and arguably better-targeted) thing. Neither doc claims the §1 logit rewrite shipped, but a reader expecting "the additive confidence is now calibratable log-odds" will not find it. The 13-component betting confidence is still the additive `+10`-baseline sum. *Resolve: note that the log-odds reformulation of the betting confidence remains DESIGNED-only and distinct from the fantasy Tweedie path.*
- **I-7 · The launch keystone: preseason vs historical backtest.** `GSE_INTEL_04` Part 3 still presents the **preseason backtest (HOF Aug 6, preseason Aug 13+)** as the mechanism that clears `canPublishProjections`. `GSE_INTEL_00` C3 *overrides* this as **fatal-as-written** and replaces it with the historical nflverse walk-forward harness, demoting preseason to a "dress rehearsal." INTEL_04 carries a correction pointer but its Part 3 / "five things" body still reads preseason-as-calibration in places. Precedence (`START_HERE` + `CODER_KICKOFF`) resolves it (INTEL_00 wins), but the conflict is live in the text. *Resolve: rewrite INTEL_04 Part 3 to lead with the historical harness.*
- **I-8 · `MODEL_VERSION` v5.1.0 — future action vs already-implemented artifact.** `GSE_INTEL_04` / `GSE_GO_DECISION` treat the `v5.0.0 → v5.1.0` bump + IMPLEMENTED CalibrationProposal as a *future* keystone (M6, ~Sep 5). But `SURFACE_AUDIT.md` lists an existing `docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md` as **"Human-audited calibration history"** already on the branch, and INTEL_01/CORE cite `MODEL_VERSION` as `v5.0.0`. It is ambiguous whether v5.1.0 is already live (betting engine) or still pending (weekly projections). Most likely the v5.1.0 proposal governs the *betting* confidence and the *projection* publish flip is the separate future action — but no doc states this cleanly. *Resolve: one sentence disambiguating the betting-engine version from the projection-publish gate.*

---

## Completeness verdict + integration grade

**Honest verdict.** The fear that "things got lost" is, for the most part, *not* borne out: the corpus is exceptionally well-integrated — every design doc carries precedence banners, the rigor pass (INTEL_00) is genuinely authoritative and its six corrections all propagated into the shipped branch, and Codex executed the *entire* specced backlog (30 commits, Slice 0 → AUDIT, all gates green, audit-confirmed no gate silently flipped). The Intelligence Core (6 layers), all 5 Frontier modules, all 6 Addendum mechanisms, the LadderEvent spine, and the cost/observability seams are **all built as honest shadow scaffolds**. The revenue loop is **built and one owner-punch-list away from live**. What remains is overwhelmingly *deliberate gating* (`[OWNER]/[INFRA]/[DATA]/[SCHEMA]`), not dropped work. The true orphans are few and specific — and the most important one (**O-4, the PAST_DUE entitlement grace leak**) is a live revenue bug that fell through the cracks because it lived only in the advisory and was never re-tracked. The most important inconsistency (**I-1, the "Tweedie" label**) is a brand-integrity risk that is *acknowledged* but *not fully propagated*: a reader of INTEL_01 alone would believe a fitted Tweedie model ships when it does not. The other live gaps (the B− integration wiring O-8, the yard-pool split O-9, the endpoint hardening O-10) are correctly queued in the handoff but not yet executed. Nothing in the strategic vision is missing; the gap is the last-mile between *built-and-gated* and *wired-and-flipped*, plus a short, nameable cleanup list.

**Integration grade: A− (corpus) / B (corpus → shipped reality).** The documents grade A− on internal integration (precedence discipline, corrections that actually land, near-zero contradiction outside the eight listed). The *corpus-to-code* integration grades B: the build is faithful and complete-to-spec, but it is exported-only at the seams (the B− app-caller gap), three correction work-order items remain open, and two corrections (Tweedie label, conformal-guarantee text) are acknowledged but not scrubbed from the load-bearing design doc. Close O-4, O-8, O-9, O-10, propagate I-1 and I-3, and the pairing moves to A−/A−.

*Rows in this matrix: 78 (across sections A–I) + 10 ORPHANS + 8 INCONSISTENCIES.*
