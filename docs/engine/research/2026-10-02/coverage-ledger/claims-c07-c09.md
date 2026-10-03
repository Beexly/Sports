# Claims extraction — partitions c07, c08, c09 (2026-10-02 corpus-deep)

Base: `C:\Users\Garrett\Sports\.worktrees\calib-boundary\docs\engine\research\2026-10-02\corpus-deep\deep\`
Checkouts file-checked (read-only listings, no git): `C:\Users\Garrett\Sports-wt-intel` (wt-intel) and `C:\Users\Garrett\Sports\.worktrees\calib-boundary` (calib-boundary).
Scoping rule applied honestly: IMPLEMENTED is used ONLY where the cited path was confirmed present by a directory/file listing in this pass (wt-intel). Vendor-doc-only measurements (`~/workspace/vendor/Sports/docs/...` cited by the lanes) that were not re-listed here are disposed as QUEUED-RESEARCH (re-list before wiring) or DUPLICATE of a canonical row — never marked IMPLEMENTED from memory. `packages/verifier/` was confirmed ABSENT in both checkouts. Ensemble dirs were listed in both checkouts and are identical (no calib-boundary-only delta found at directory level), so IMPLEMENTED-CALIB-BOUNDARY count is 0.
Numeric gates are quoted verbatim from the files. One row per distinct claim.

## c07/verified-claims.md (canonical measurements)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c07/verified-claims.md | Time-varying edge decay exists and is quantified (descriptive, not prescriptive) | TAE hierarchical model, brief 0602 | `θ = −0.62, 95% HPD (−1.08, −0.17)` | QUEUED-RESEARCH | vendor-doc measurement per lane (0602 ledger); re-list before wiring; prescriptive decay model still open |
| c07/verified-claims.md | EPA-lost formula + 3×3 cells exist as cited mechanics | brief 0602 record | none (formula/cells, no gate) | QUEUED-RESEARCH | same as above; no acceptance gate stated |
| c07/verified-claims.md | Decorrelated portfolio at γ=0.4 books profit above naive at slightly lower accuracy | XENT decorrelation portfolio, brief 0174 | `γ = 0.4 → profit 1.74 ± 0.14 at accuracy 67.15 vs book 69 ± 2.5` | QUEUED-BUILDABLE | build B2 stack (fractional-Kelly + governor + γ≈0.4 book); port is brief ADAPT, not paper canon |
| c07/verified-claims.md | Calibration-selected portfolios beat accuracy-selected on ROI (single-season, confounded) | selection horse race, brief 0290 | `+34.69% ROI vs −35.17% ROI` | QUEUED-RESEARCH | re-run on 5+ seasons before wiring selection on calibration (C1) |
| c07/verified-claims.md | Eighth-Kelly pair confirms calibration-vs-accuracy gap direction | brief 0290 fixed-stakes/eighth-Kelly | `−75.9% vs +36.93%` | DUPLICATE | same claim as c07/verified-claims.md 0290 row above (same brief/caveats) |
| c07/verified-claims.md | OL tackle ladder quantifies degradation propagation on 1,069 team-weeks | practice-participation ladder, ol-drag-calibration | `−2.65 (se 0.91, n=129) / −1.77 / −1.17 on 1,069 team-weeks` | QUEUED-BUILDABLE | build B4 pressure-funnel detector; ladder descriptive, not a forward model |
| c07/verified-claims.md | Rest +0.41 margin pts/day claim is struck (absent from cited brief) | worker verification vs brief text | `+0.41` STRUCK | QUEUED-RESEARCH | do not cite; check week3-2026 brief before any reuse |
| c07/verified-claims.md | twCRPS-gated combination gains tail skill at a stated EMOS body cost | twCRPS/TMCB, brief 1523 | `TMCB +44.81 / +48.90 / +49.28% at CRPS −0.09…−0.15%; EMOS MCB −13.55%` | QUEUED-BUILDABLE | build B5; carry −13.55% cost in every report; γ=5 only tested point |
| c07/verified-claims.md | HMM regime model hits 0.715 with wide per-team spread (2 states not AIC-validated, data ends 2018) | HMM, brief 0431 | `0.715, per-team 0.602–0.779` | QUEUED-RESEARCH | no joint regime+rating recipe in corpus (S6/B6 gap) |
| c07/verified-claims.md | Elo sparsity scaling law for ratings | brief 0940 | `t/N ≈ 9, η_t = √(aN/(t+b))` | QUEUED-RESEARCH | rating-layer input; no acceptance gate stated |
| c07/verified-claims.md | Precision weighting cuts worst-case regret ~3× (adversarial regret; Conjecture 3 unproven) | brief 1160 | `0.0225 vs 0.0625` | QUEUED-RESEARCH | label worst-case in every use; do not size on it (C6) |
| c07/verified-claims.md | Dampened logit has measured α and numerical regret certificate | brief 1180 | `α = 0.585, regret 0.025512 vs 0.023379 bound` | QUEUED-RESEARCH | certificates numerical, not analytic |
| c07/verified-claims.md | Marginal-corrected logit parameters measured | brief 1180 | `α = 0.656089, γ = 0.498268` | QUEUED-RESEARCH | same brief; no gate stated |
| c07/verified-claims.md | Full Kelly is ruinous under drawdown constraints | brief 1210 | `K* 0.98 → ≈0.1, 92% P(drawdown > 98%)` | QUEUED-BUILDABLE | build B2 fractional-Kelly leg of the staking stack |
| c07/verified-claims.md | M(k) governor buys survival cheaply in one episode (single-TSLA caveat) | drawdown governor, brief 1628 | `5% vs 22.5% drawdown at ~12% wealth cost` | QUEUED-BUILDABLE | build B2 governor leg; multi-asset backtest owed (C5) |
| c07/verified-claims.md | Max-exposure selection discipline dominates edge size in E[max] duel | brief 1759 | `+$5,376 (+55.6%) vs −$4,374` | QUEUED-BUILDABLE | feeds S5 publish/withhold discipline (REJECT as product) |
| c07/verified-claims.md | Live-news activity carries signal with stated betas | brief 0240 | `15× activity, β̂₃ = 0.531 vs β̂₅ = 0.034` | QUEUED-RESEARCH | news-signal prior; no gate stated |
| c07/verified-claims.md | Ghost Score RB ranks measured (Jacobs/Sanders/Etienne) | brief 0210 | `0.542 / 0.539 / 0.527` | QUEUED-RESEARCH | descriptive ranks; brief gates are future acceptance gates, not findings |
| c07/verified-claims.md | CausalTraj trajectory errors measured | brief 0330 | `minJADE20 1.12 / minJFDE20 2.68` | NOT-APPLICABLE | trajectory-forecasting metric; no GSE pick-sizing seam named |
| c07/verified-claims.md | Cox soccer method port numbers measured (paper domain only) | brief 0390 | `<10s / 78 params / 3039 matches; red card −30.48%; trailing +10.11%` | NOT-APPLICABLE | soccer-domain method port; no NFL transfer recipe in file |
| c07/verified-claims.md | SHAPEffects relative win is meaningless absolutely (R² −0.99 even for winner) | brief 2185 | `12.61 vs 13.39–13.41, R² = −0.99` | NOT-APPLICABLE | explicitly not buildable (C3); relative superiority only, not usable fit |
| c07/verified-claims.md | DYNAMO crowd-effect numbers cited (home/away empty/crowds, Arsenal MSE) | brief 1080 | `Home 37.9% / away 40.3% empty, 43.0% crowds, Arsenal −29% MSE` | QUEUED-RESEARCH | crowd-effects prior; attribution below struck |
| c07/verified-claims.md | DYNAMO paired-differencing-eq.6-from-0270 attribution is struck | worker verification vs brief text | `0270 / paired-differencing eq. 6` STRUCK | QUEUED-RESEARCH | method may be real; attribution unsupported — re-source first |
| c07/verified-claims.md | Empirical-rate teacher halves ECE with portable +25 shrinkage recipe | brief 0691 | `ECE 0.10 → 0.050, p̂ = (w + 25·p̂_parent)/(n + 25)` | QUEUED-BUILDABLE | build B1 shrinkage leg; re-tune +25 per sport/cell |
| c07/verified-claims.md | Gate statistic with Spearman gate exists | brief 0003 | `φ = (s² − σ²_{2k}) / s², gate Spearman ρ > 0.3` | QUEUED-RESEARCH | gate prior; no GSE acceptance run stated |
| c07/verified-claims.md | 0643 momentum numbers are struck (absent from cited brief) | worker verification vs 0643 brief | `+12.7pp (p<0.001), β 0.115 n.s., −7.4% to −23.3% ROI` STRUCK | QUEUED-RESEARCH | re-read brief before any momentum claim; momentum staking banned until re-sourced |
| c07/verified-claims.md | Calibration snapshot contradiction unresolved (cite neither) | truth surface vs AGENTS.md note | `n=392 / 0.0639 vs n=458 / 0.0524` | QUEUED-RESEARCH | needs note date + both filter definitions |
| c07/verified-claims.md | BDB 2026 license unresolved — default posture no BDB data | license conflict | none (posture, not number) | CONTRADICTS-DOCTRINE | doctrine: default posture is no BDB data at all until resolved; any BDB-2026 build contradicts it |
| c07/verified-claims.md | 1461 MOVDA numerics self-contradictory — steal equation, never numbers | brief 1461 | none (struck numerics) | NOT-APPLICABLE | no GSE seam on the numbers; equation-only port |
| c07/verified-claims.md | arXiv:2512.18858 stands REJECTED (four internal contradictions) | review verdict | none (REJECT) | NOT-APPLICABLE | REJECT never counts; never quietly revived |

## c07/syntheses.md (compositions; components cite verified-claims)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c07/syntheses.md | Calibration ladder ordering (selection → shrinkage → tail combination) is the build order | composition of 0290 + 0691 + 1523 | same gates as canonical rows | QUEUED-BUILDABLE | build B1+B5 in ladder order; reversing order untested |
| c07/syntheses.md | Kelly staking stack order (fraction → governor → decorrelation) with unmeasured joint behavior | composition of 1210 + 1628 + 0174 | same gates as canonical rows | QUEUED-BUILDABLE | build B2; backtest stack jointly before wiring (S2) |
| c07/syntheses.md | Stale-edge overbetting follows from measured decay; decay enters as haircut on edge | TAE inference from θ=−0.62 | `θ = −0.62` (diagnostic) | QUEUED-BUILDABLE | build B3 monitor; dishonest as a sizer until prescriptive model validated (C7) |
| c07/syntheses.md | OL→scheme→QB hierarchy is evaluation order with tackle-ladder backing | ol-drag ladder + L5 prior | `−2.65 / −1.77 / −1.17` | QUEUED-BUILDABLE | build B4; L4 breaking conditions lead with OL-health falsifier |
| c07/syntheses.md | Publish/withhold discipline (L5 + breaking conditions + adversarial report) dominates edge size | reasoning-depth §7 + E[max] duel | `+$5,376 / +55.6%` | QUEUED-BUILDABLE | withhold (REJECT) is the product; system without REJECT is not a system |
| c07/syntheses.md | Ratings should carry regime posterior, not a point (no joint recipe exists) | HMM 0.715 + Elo sparsity composition | `0.715; t/N ≈ 9` | QUEUED-RESEARCH | build gap S6, not a result; 2 states not AIC-validated |

## c07/challenges.md (falsifiers and standing rules)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c07/challenges.md | Calibration ROI gap is single-season fragile; collapses if gap reverses on 2019–2025 | falsifier + re-run prescription (C1) | `+34.69% vs −35.17%` (under test) | QUEUED-RESEARCH | re-run selection horse race on 5+ seasons |
| c07/challenges.md | γ=0.4 optimum may not transfer from ADAPT port to paper loss | re-derivation prescription (C2) | `γ=0.4; 1.74 ± 0.14` (under test) | QUEUED-RESEARCH | re-derive from paper equation before citing as paper result |
| c07/challenges.md | SHAPEffects win must never be treated as usable fit | caveat-as-conclusion (C3) | `R² = −0.99` | DUPLICATE | same claim as c07/verified-claims.md SHAPEffects row |
| c07/challenges.md | Any system on 1461 numerics inherits the contradiction | resolution rule (C4) | none (struck) | DUPLICATE | same claim as c07/verified-claims.md 1461 row |
| c07/challenges.md | M(k) governor may overfit its single episode; multi-regime backtest owed | falsifier + backtest prescription (C5) | `5% vs 22.5% at ~12%` (under test) | QUEUED-RESEARCH | multi-asset, multi-regime backtest before wiring |
| c07/challenges.md | Precision-weighting regret gap is worst-case only; do not size on it | labeling rule (C6) | `0.0225 vs 0.0625` worst-case | DUPLICATE | same claim as c07/verified-claims.md 1160 row + label |
| c07/challenges.md | TAE HPD must stay a monitoring statistic, never a sizing input | use-restriction (C7) | `HPD (−1.08, −0.17)` | QUEUED-BUILDABLE | build B3 dashboard-only until prescriptive model validated |
| c07/challenges.md | Open contradictions must not be laundered (calibration snapshot, BDB, 2512.18858) | citation hygiene (C8) | none | DUPLICATE | same claims as c07/verified-claims.md contradiction rows |
| c07/challenges.md | Inflated numbers compound; downstream builds must re-source first | standing rule (C9) | `0643 figures; +0.41; 0270` STRUCK | DUPLICATE | same claims as c07/verified-claims.md struck rows |

## c07/buildable-systems.md (specs-in-waiting)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c07/buildable-systems.md | B1 calibration-first model selection with parent shrinkage | rank by ECE/reliability; p̂=(w+25·p̂_parent)/(n+25) | `ECE 0.10 → 0.050; +25 pseudo-count` | QUEUED-BUILDABLE | spec B1; re-tune +25 per sport/cell; single-season caveat |
| c07/buildable-systems.md | B2 fractional-Kelly + M(k) governor + γ≈0.4 decorrelated book | three-leg staking stack | `γ≈0.4; 5% vs 22.5% at ~12%` | QUEUED-BUILDABLE | spec B2; joint behavior untested — backtest stack jointly |
| c07/buildable-systems.md | B3 edge-decay monitor as dashboard, never sizer | half-life tracking + stale-edge haircut alerts | `θ = −0.62` | QUEUED-BUILDABLE | spec B3; diagnostic-not-prescriptive caveat |
| c07/buildable-systems.md | B4 OL-degradation → pressure-funnel detector with machine-checkable breaks | OL health → tackle ladder → theses + breaks | `PIT@CLE archetype; TTT/quick-game breaks` | QUEUED-BUILDABLE | spec B4; rest term excluded until re-sourced |
| c07/buildable-systems.md | B5 twCRPS-gated forecast combination with stated body cost | tail-weighted CRPS gating | `+44.81/+48.90/+49.28% at γ=5; EMOS −13.55%` | QUEUED-BUILDABLE | spec B5; other γ untested |
| c07/buildable-systems.md | B6 regime-posterior ratings are a research project, not a port | regime posterior + diffuse widening | `HMM 0.715` (weak) | QUEUED-RESEARCH | no joint recipe; 2 states unvalidated; data ends 2018 |
| c07/buildable-systems.md | SHAPEffects/1461-numerics/2512.18858/BDB-2026/momentum-staking are explicitly not buildable | exclusion list | none | DUPLICATE | same claims as c07/verified-claims.md + challenges rows |

## c08/verified-claims.md (canonical table; lanes hold the detail)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/verified-claims.md | Board top is anti-predictive (confidence ≥80 claims vs realizes) | BUILD-QUEUE measurement + z re-derivation | `claimed 0.8663, realized 0.5191, n=235, z=−10.7, Brier 0.3617 vs 0.25` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/scoring.ts` + `apps/web/lib/ranking/sort-key.ts` (mechanism confirmed in live code per lane) |
| c08/verified-claims.md | TOTAL path has no independent model (rankingP=confidence/100 stamp) | live code read | `rankingP=confidence/100` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/scoring.ts` (file verified present; lines per lane :1051-1052) |
| c08/verified-claims.md | rankingSource discriminator persists priced-vs-confidence separation | live code read | `scoring.ts:806,1407` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/scoring.ts` (file verified present) |
| c08/verified-claims.md | rankingSource-tiered remedy specified but never built (NOT BUILT commit) | repo absence + history note | none (unbuilt) | QUEUED-BUILDABLE | build SYS-8 rankingSource publish filter + census gate; remedy files absent per lane |
| c08/verified-claims.md | Calibration leaf 6.5–9.5 drift concentrated (p is lower-bound approx) | leaf table + Cochran Q | `n=576, 65.86%→57.12%, Δ=−8.74pp, z=−4.42, p=9.7e−06; Q=19.57, p=6.07e−04, I²=79.6%` | QUEUED-BUILDABLE | build SYS-7 leaf-band exclusion gate; remedy "not applied" per source |
| c08/verified-claims.md | Leaf-collapse remedy owner-gated, not executed | source "not applied" section | none (unexecuted) | DUPLICATE | same claim as c08/verified-claims.md leaf row (remedy half) |
| c08/verified-claims.md | On-ladder MLB totals underperform (ground truth self-reported corrupt) | win-rate table + 3.8σ derivation | `70/193=36.3% vs 136/275=49.5%` | QUEUED-BUILDABLE | build SYS-8 market-consensus anti-signal gate; direction durable, exact % soft |
| c08/verified-claims.md | On-ladder split measures market consensus, not placeability | book-count control | `8.32 vs 8.26 books` | DUPLICATE | same claim as c08/verified-claims.md on-ladder row (reading half) |
| c08/verified-claims.md | Late-steam coefficient is JRA horse-racing ex-post, not an NFL edge | parimutuel regression, 0887 | `β₂=−0.3386 (SE 0.0392), n=894,127, ~8.6σ, 14× at median odds 25.5` | QUEUED-BUILDABLE | engineer late-move velocity features; backtest on GSE Pinnacle archive first |
| c08/verified-claims.md | Engine is calibration-honest yet edge-empty (DSC−MCB derived identity) | frontier dossier arithmetic | `ECE 0.0044, Brier 0.2556 (baseline 0.2815), UNC 0.2499, suppression 0.0017, DSC−MCB≈−0.0057` | QUEUED-BUILDABLE | build SYS-9 resolution-first gate; calibration metrics alone must never promote |
| c08/verified-claims.md | No measured information beyond the close (p=0.060, not significant) | MI probe, BUILD_LOG | `I=0.0095 nats, p=0.060, n=1,871 games` | QUEUED-BUILDABLE | MI-probe leak-detection gate per SYS-9; no feature weighted without clearing it |
| c08/verified-claims.md | Verifier/preregistration lives only in open draft PR #914, not on main | rescue doc + PR state + checkout | `108/108 tests (shim); 28 factor specs; draft=True, merged=False` | QUEUED-BUILDABLE | `packages/verifier/` confirmed ABSENT in both checkouts; build SYS-10 on merge |
| c08/verified-claims.md | CQR n−1 clamp bug repaired (unclamped rank, fail-closes +∞); backtest owed | live code read | `rank=(1−α)(n+1)−1; +∞ at rank≥n` | IMPLEMENTED | wt-intel `apps/web/lib/calibration/cqr.ts` + `cqr-recipe-audit.ts` (+test) verified present |
| c08/verified-claims.md | 1492 messaging effects confirmed with subset conditioning intact | 2×2×2 within-subject, n=198 | `DO 61.9% vs 58.4%; shown 57.8% vs not 60.2%; wrong-subset 41.9%` | QUEUED-BUILDABLE | build SYS-3 deferral messaging; internal 40-matchup replication gates activation |
| c08/verified-claims.md | 1492 magnitudes not adopted; lab-artifact risk HIGH/MODERATE | authors caveats + file disposition | `Not ADOPT on magnitudes` | DUPLICATE | same claim as c08/verified-claims.md 1492 row (caveat half) |
| c08/verified-claims.md | 1776 per-class abstention formulation confirmed (additive safer; 0.05 is paper caps) | selective classifier + Phoneme precedent | `R0/R1 ≤0.05; Phoneme R0=0.0551 over cap; ≥15% less abstention gate` | QUEUED-BUILDABLE | build SYS-2 per-market gate; re-derive caps from bankroll, units not counts (v2) |
| c08/verified-claims.md | Live-class eligibility RED with maps-fix-reliability-only theorem | eligibility surface + reader-55 | `RES 0.002 / Brier 0.275 / ECE ~0.11 → RED` | IMPLEMENTED | wt-intel `docs/ops/ENGINE_RANKING_RES_NEAR_ZERO.md` + `apps/web/lib/ops/calibration-eligibility.ts` verified present |
| c08/verified-claims.md | LOPO 0.38 stands; 0.91 arm likely inflated (upper-bound gap) | Table 2 + file caveat | `cross-individual R²=0.38 vs within 0.91` | QUEUED-BUILDABLE | build SYS-4 lopo-challenge.json; quote 0.38 with caveat always |
| c08/verified-claims.md | ForecastBench-sim ρ=+0.43 is a signal (ρ²≈0.185), not a certificate | N=30 correlation | `ρ=+0.43, p=0.018, N=30` | QUEUED-BUILDABLE | build SYS-5 sim rubric; admissible as pick evidence only at ≥4 |
| c08/verified-claims.md | Isotonic plateaus destroy Kelly ranking while RES≈0; isotonic OFF | ISOTONIC_EXPLORATION + RES≈0 | `τ(pre,post) ≥ 0.95 else fail closed` | IMPLEMENTED | wt-intel `docs/ops/ISOTONIC_EXPLORATION.md` verified present; build SYS-6 joint check |
| c08/verified-claims.md | 1151 two-threshold conformal maps to post/lean/abstain with market-conditional β | quantiles of s=1−p_y | `q̂_predict/q̂_abstain; market-conditional β` | QUEUED-BUILDABLE | composes with 1776 into one gate (SYS-2); grid-search (α,β) chronologically |
| c08/verified-claims.md | ICI beats PW on Sharpe (median and global); ≥1% log-loss gate is proposed GSE test | view fusion, 0790 | `median PW 0.11/CU 0.16/CI 0.38/ICI 0.48; global 0.10→0.34` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/ensemble/covariance-intersection.ts` (+test) verified present; ICI itself NOT implemented — build SYS-1 |
| c08/verified-claims.md | RD-FGL cuts MSFE 60–70% on ECB macro data; NFL transfer untested | PCA→GL→Woodbury→Bates-Granger→Bai-Perron | `MSFE ratios ~0.31–0.44` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/ensemble/2209-01697-regime-factor-glasso.ts` (+test) verified present; mechanism is generic stacking scaffolding — replace with real FGL pipeline |
| c08/verified-claims.md | gSCAD best ASCFE; 70%+ variance cut belongs to boundary reflection, not gSCAD | ledger :17/:40 | `ASCFE 2.650×1000; >70% reflection cut` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/ensemble/2010-10435v1-time-varying-forecast-combination.ts` (+test) verified present; blocks are EWA/BOA, not local-linear+reflection+gSCAD — replace |
| c08/verified-claims.md | No CRPS doctrine/wired scoring (scrps/crpsmod exist unwired) | evaluation-path audit | `no crps.ts; nothing wired` | IMPLEMENTED | wt-intel `apps/web/lib/calibration/scrps.ts` + `packages/prediction-engine/src/crpsmod-loss.ts` verified present (unwired per headers) |
| c08/verified-claims.md | twCRPS+λ=0.6 tail gain is mean-to-max, single split, no multiplicity control | 0746 ledger :26/:32 | `~1.3% avg / ~2.5% max at 90th pct` | QUEUED-RESEARCH | adopt gate (≥1% tail, ≤0.5% body) unexecuted per available evidence |
| c08/verified-claims.md | Skellam Brier is soccer-paper result, not NFL measurement | ledger :46/:54 | `0.58 vs 0.65 climatology` | NOT-APPLICABLE | no NFL seam; NFL use is unexecuted experiment with adopt gates |
| c08/verified-claims.md | NOTEARS within-0.002-at-≤60% is proposed adopt gate, not measured result | 1962 ledger :58–61 | `Brier within 0.002 at ≤60% features` | QUEUED-BUILDABLE | run NOTEARS experiment with reject conditions before any claim |
| c08/verified-claims.md | 0004 extensions failed honestly (H2 p≈1; trace-norm < naive) | ledger :62/:72/:86 | `H2 p≈1; 45.89% [43.54%,48.21%]; two-stage p=7.8×10⁻⁵` | NOT-APPLICABLE | do-not-build list: two-factor/rank-four/trace-norm rejected by file itself |
| c08/verified-claims.md | Ensemble modules are staged scaffolding: CI without ICI, paper names on generic blocks | checkout inventory | `ENABLED=false; gates NOT EVALUATED` | IMPLEMENTED | wt-intel `packages/prediction-engine/src/ensemble/` (91 entries incl. `mafter-combiner.ts`, `conflict-abstention.ts`, `variance-em-aggregator.ts`, `disagreement-blend.ts`) verified present; dependency order: ICI → FGL → gSCAD |
| c08/verified-claims.md | Airwave 15-value enum + 3-level confidence + UNFALSIFIABLE/ injury gates verbatim | runbook lines | `15 claim_types; EMPHATIC/LEAN/HEDGED` | IMPLEMENTED | wt-intel `docs/ai/airwave/AIRWAVE_OPERATOR_RUNBOOK.md` verified present |
| c08/verified-claims.md | No-bet governor has seven codes, not five (debt + responsible-gaming matter) | methodology table | `7 codes; calibration_debt→PASS; responsible_gaming→HARD_PASS` | IMPLEMENTED | wt-intel `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md` verified present |
| c08/verified-claims.md | Governor is shadow-only posture, not engine brake | status line | `shadow-only` | QUEUED-BUILDABLE | wire pressure into decision path or inherit shadow-only limit (SYS-16) |
| c08/verified-claims.md | SHADOW_WOULD_REFUSE + signed receipts + ledger; enforcement opt-in SHADOW default | compliance matrix | `SRQC_ENFORCE=1` opts into enforcement | IMPLEMENTED | wt-intel `packages/governed/src/governed.ts`, `receipt-sign-ed25519.ts`, `keyring.ts`, `rotate-keys.ts`, `apps/web/lib/ai-control-plane/event-ledger.ts` verified present |
| c08/verified-claims.md | RED has teeth (gates/maps OFF, no PROVEN, advisory pause) on one live class | MASTER_PROMPT_V2 laws | `0.275/0.112/0.002 live class, not per-class` | IMPLEMENTED | wt-intel `docs/ops/MASTER_PROMPT_V2.md` verified present |
| c08/verified-claims.md | would_not_claim output contract real but tiny (4 items, fixture demo) | FABLE demo + harness test | `probability_delta 0.11 = abs(0.59−0.48)` | IMPLEMENTED | wt-intel `docs/fable/demo/DEMO_REPRODUCTION.md` (+ `PUBLIC_DATA_FORENSIC_REPORT.md`) verified present |
| c08/verified-claims.md | 30+ settled picks per model version before win-rate claims | monetization lanes | `30+ settled picks` | IMPLEMENTED | wt-intel `docs/intelligence/monetization-lanes.md` verified present |
| c08/verified-claims.md | Quote-precedence ladder is wired code with tests (6 tiers, divergence flags, hard wall) | precedence + snapshot code | `FREE_QUOTE_PRECEDENCE 6 tiers; stale_higher_tier; 5-min window` | IMPLEMENTED | wt-intel `packages/quote-plane/src/precedence.ts` + `situation-snapshot.ts` verified present |
| c08/verified-claims.md | NOVA five draft-state labels retire "landed" | convergence freeze addendum | `5 labels; Nothing is landed` | QUEUED-BUILDABLE | adopt as honesty vocabulary (SYS-16); source path not re-listed here |
| c08/verified-claims.md | JARVIS stub-mode honesty guard short-circuits to not-wired posture | memory protocol | `isStubMode() first; fabricated recall forbidden` | IMPLEMENTED | wt-intel `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md` verified present |
| c08/verified-claims.md | ARBY composition weights replicable; ARBY inputs proprietary | chart footnote | `65/35 seasons · 65/35 ARBY/YPC · 50/50 off/def` | QUEUED-BUILDABLE | rebuild run-blocking proxy on house data; composition portable only |
| c08/verified-claims.md | Peak ages are one modeler's spline zeros; author disavows causality | matt_barlowe notes | `RB 24.53 / WR 25.33 / QB 26.67; n=149,694 carries / 134,254 targets / 200,377 dropbacks` | QUEUED-RESEARCH | priors only with caveat; never calibration targets |
| c08/verified-claims.md | Radar paper REJECT stands; five load proxies are brief-author INFERENCE, unrun | second-pass ledger | `n=15; LOSO 91.55% ±14.39; 0.02-AUC gate unrun` | NOT-APPLICABLE | hardware system rejected; proxies need preregistered kill lines first |
| c08/verified-claims.md | Pressure-EPA superlative asserted in design brief, never measured | DESIGN_BRIEF:104 | `superlative, no comparison` | CONTRADICTS-DOCTRINE | doctrine: SYS-14 assert-vs-measure ladder — superlatives need measured comparison or `PRIOR:` tag |
| c08/verified-claims.md | Exposure-dominance ratio + Dirichlet-multinomial core are documented priors, not measurements | masterplan header + lines | `15% swamps 2%; DirichletMultinomial(α)` | QUEUED-BUILDABLE | wire structure (compositional shares must sum to 1); preregister magnitudes |
| c08/verified-claims.md | xFP/FPOE next-week-rank FAIL is preregistered with tamper guard; buildability verdict predates it | rescue study | `Δrho=−0.0165, CI [−0.0396,0.0086], n=6022` | CONTRADICTS-DOCTRINE | doctrine: REJECT-citation rule — weighting xFP as rank feature without citing guard + fresh preregistered test is a trust defect |
| c08/verified-claims.md | Drive linear form survives (GP kink DIED); ablation is form-vs-linearization only | REPORT_BOTTLENECK | `0.2007·ydstogo − 0.0446·yardline_100, AUC 0.6039 vs 0.5818 (~4σ, n=11,271)` | QUEUED-BUILDABLE | build SYS-13 linearization gate; incremental lift over production set untested |

## c08/laneA-calibration.md (detail behind A-rows; only non-duplicate claims listed)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/laneA-calibration.md | Claimed-rate SE would give |z|≈15.6, so quoted z=−10.7 is the conservative version | SE re-derivation at realized vs claimed rate | `SE 0.0326 vs 0.0222` | DUPLICATE | same claim as c08/verified-claims.md A1 (derivation half) |
| c08/laneA-calibration.md | ranking-basis census exists as read-only measurement on public-surface-truth | census + route wiring | `rankingP MONOTONE n=1,390; confidence ANTI-predictive n=2,385` | IMPLEMENTED | wt-intel `apps/web/lib/calibration/ranking-basis-census.ts` verified present; promote to gate (SYS-8) |
| c08/laneA-calibration.md | ×1.12 sharpness-stretch deletion landing status unverified after dossier | successor-logic audit gap | `homeP=0.5+(homeP−0.5)*1.12` | QUEUED-RESEARCH | open question for sibling lane; may still be live |
| c08/laneA-calibration.md | Leaf p-values are lower-bound approximations (train-n unpublished) | source self-critique | `p=9.7e−06 approx` | DUPLICATE | same claim as c08/verified-claims.md leaf row (caveat half) |

## c08/laneB-adversarial.md (detail behind B-rows; only non-duplicate claims listed)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/laneB-adversarial.md | 41.9% figure is model-wrong-subset-conditioned; general headline is 57.8% vs 60.2% | subset-condition audit | `41.9% subset; 57.8% vs 60.2% (p=0.003)` | DUPLICATE | same claim as c08/verified-claims.md B1 (conditioning half) |
| c08/laneB-adversarial.md | 1151 market-conditional-β and 1776 per-class gates are the same move discovered twice | architectural composition | `one implementation, one acceptance test` | QUEUED-BUILDABLE | build BS-1/SYS-2 combined gate, not two parallel systems |
| c08/laneB-adversarial.md | Per-class gates on correlated spread/ML classes may be one cap in disguise | error-correlation challenge | `>10% draw-influenced → cap review` | QUEUED-BUILDABLE | build BS-6 tiebreakAudit; log every draw with seed |
| c08/laneB-adversarial.md | DO-messaging direction may flip under experts; replication must be per-analyst | expertise-reversal challenge | `40 matchups; DO≥BM per analyst` | QUEUED-RESEARCH | standing policy wrong for some analysts until run |
| c08/laneB-adversarial.md | LOPO unit unstable under team changes; stratify stable vs cross-regime | regime-stratification demand | `LOPO-stable vs LOPO-cross-regime` | QUEUED-BUILDABLE | build BS-3 regime-stratified lopo-challenge.json |
| c08/laneB-adversarial.md | Unfrozen simulator can be tuned to pass its own ±0.05 gate | lock-hash requirement | `hash before comparison; season never tuned on` | QUEUED-BUILDABLE | build BS-4 simulationDistrust rubric item +2 |
| c08/laneB-adversarial.md | Count-loss abstention misprices unit-loss decisions; re-derive in expected units | objective-mismatch challenge | `v2 unit-loss objective` | QUEUED-BUILDABLE | SYS-2 v2; count-loss is v1 with discrepancy logged |
| c08/laneB-adversarial.md | CAP peak AUROC 22.19% is peak-over-weakest-baseline, not typical gain | baseline audit | `typical 1–3 pts accuracy` | QUEUED-RESEARCH | quote typical, parenthesize peak |

## c08/laneC-fusion.md (detail behind C-rows; only non-duplicate claims listed)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/laneC-fusion.md | PW formula is the exact shape of the four-legs-one-thesis funnel bug | 0790 PW → L4 mapping | `Σ̂=(Σ̂₁⁻¹+… )⁻¹ assumes zero cross-covariance` | QUEUED-BUILDABLE | build SYS-1 Channel A structural detection on trace today |
| c08/laneC-fusion.md | Overconfidence scored as OR + n_eff with TNF funnel n_eff≈1.1–1.5 | Bates–Granger MSFE + variance inflation | `OR=V_true/V_naive; n_eff=n/(1+(n−1)ρ̄); ρ̄≈0.7–0.9` | QUEUED-BUILDABLE | build SYS-1 §3.2 pure function; ρ estimated from chain overlap |
| c08/laneC-fusion.md | Channel B/C detection (PCA-strip+GL+Bates–Granger+Bai–Perron; group-SCAD prune) specified | RD-FGL + gSCAD recipes | `τ>0 mandatory; K_{γt} CV discount` | QUEUED-BUILDABLE | build SYS-1 Channels B/C on GSE source panel; break-aware weights |
| c08/laneC-fusion.md | Fusion choice rule CI/ICI/CU by source relationship; never PW on shared info | decision rule | `PW Sharpe 0.11 vs ICI 0.48 penalty` | QUEUED-BUILDABLE | build SYS-1 §3.4 + exposure bundling (one position, Kelly + 0822 governor) |
| c08/laneC-fusion.md | CQR repair re-confirmed + audit module found; backtest still owed | code + history read | `commits 1de6b69f6 → 1d3814010; ±1.5pp / ≤90% backtest` | DUPLICATE | same claim as c08/verified-claims.md CQR row (repair half) |

## c08/laneD-governance.md (detail behind D-rows; only non-duplicate claims listed)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/laneD-governance.md | No-bet governor is copy governance + schema, not an engine brake | wiring audit vs status line | `computeGseActionScore() shadow seam` | DUPLICATE | same claim as c08/verified-claims.md governor-posture row |
| c08/laneD-governance.md | JARVIS episodic memory is the canonical specified-but-never-wired case | default-off + no-caller audit | `JARVIS_MEMORY_WRITE_ENABLED default false` | IMPLEMENTED | wt-intel `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md` verified present; honesty exemplary, capability absent |
| c08/laneD-governance.md | Airwave intake is schema-adopted, production pipe UNVERIFIABLE, table still empty | flow audit | `player-signals table empty` | QUEUED-BUILDABLE | build intake pipe; "schema adopted, pipe unverified" not "wired" |
| c08/laneD-governance.md | Checklist validator per-track rules (qb/coaching/OL/trust/matchup) with gate predicates | spec §5 × corpus mapping | `UNCHECKED at L3+ → INVALID; 2+ CONFLICT → L5` | QUEUED-BUILDABLE | build SYS-15 validateChecklist + SYS-16 adversaryReview outputs |
| c08/laneD-governance.md | Wired means blocking step + signed receipts + shadow metrics + on-by-default caller | acceptance definition | `no default-off flags` | QUEUED-BUILDABLE | SYS-16 acceptance for every system; else NOVA draft label |

## c08/laneE-features.md (detail behind E-rows; only non-duplicate claims listed)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/laneE-features.md | Dispersion result ports from EA video games with selection-bias caveat | 0931 port + pre-filter flag | `500k+ games; close-skill pre-filter` | QUEUED-RESEARCH | testable OL-vs-DL within-unit std port, not established |
| c08/laneE-features.md | NGS-internal data can never be the public evidence (HARD doctrine audit) | doctrine test | `reasoning fuel only` | CONTRADICTS-DOCTRINE | doctrine: NGS 2026-09-28 HARD — any public claim supported only by NGS-fed feature fails audit |

## c08/buildable-systems.md (SYS-1..17 contracts)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/buildable-systems.md | SYS-1 correlated-thesis machinery (funnel killer) with TNF kill test | Channels A/B/C + CI/ICI/CU + bundling | `n_eff ≈ 1.1–1.5 → KILL` | QUEUED-BUILDABLE | implement ICI first (missing 0.48 method); CI alone is conservative half |
| c08/buildable-systems.md | SYS-2 per-market abstention gate with feasibility invariants | 1776×1151 contract | `≥15% lower abstention; cap breach >1/4 seasons = hard fail` | QUEUED-BUILDABLE | additive-only; logged-seed tiebreak; quarterly re-fit |
| c08/buildable-systems.md | SYS-3 deferral messaging + ≥140-char stamped override behind replication gate | 1492 review-UI rule | `≥140 chars; 40 matchups DO≥BM` | QUEUED-BUILDABLE | hypothesis with protocol until replication passes |
| c08/buildable-systems.md | SYS-4 pooled-parameter challenge with lopo-challenge.json artifact | pooled+LOPO side-by-side | `degradation ≥10% → gate path; Spearman ≥0.5` | QUEUED-BUILDABLE | quarantine memorization groups; regime-stratify |
| c08/buildable-systems.md | SYS-5 simulation distrust rubric (admissible only at ≥4) | 0–5 rubric + SIM-RESOLVED labeling | `version-lock +2; ±0.05 slope; N≥30; p reported` | QUEUED-BUILDABLE | quoting score-less SIM number is a reporting defect |
| c08/buildable-systems.md | SYS-6 calibration–sizing joint check (τ≥0.95 or sizing fails closed) | Kendall rank-preservation | `τ ≥ 0.95; isotonic OFF for sizing at RES≈0` | QUEUED-BUILDABLE | hard error, not warning; Kelly backtest kill test |
| c08/buildable-systems.md | SYS-7 leaf-band exclusion gate on 6.5–9.5 spread picks | calibration_drift no-bet code | `NFL spread [6.5,9.5] hard-block; n=576, Δ=−8.74pp` | QUEUED-BUILDABLE | interim adversary-side; totals/other bands unaffected |
| c08/buildable-systems.md | SYS-8 rankingSource publish filter + census gate (>50% start threshold) | demote confidence rows from featured slots | `z=−10.7; confidence share >50% → withhold` | QUEUED-BUILDABLE | TOTAL-path rows never featured; measurement exists, threshold+enforcement new |
| c08/buildable-systems.md | SYS-9 resolution-first promotion gate (grouping-loss + CORP DSC−MCB CI + MI probe) | replace ECE/Brier-only gates | `95% CI DSC−MCB ≤0 → do not promote` | QUEUED-BUILDABLE | ECE 0.0044 + zero resolution must never pass |
| c08/buildable-systems.md | SYS-10 pre-registration enforcement on PR #914 merge (108-test rerun + kill-line + full clone) | killLineCommitDate gate | `108 tests under real runner; fetch-depth 1 degrades` | QUEUED-BUILDABLE | until merge, scorecards provisional; `packages/verifier/` absent both checkouts |
| c08/buildable-systems.md | SYS-11 CQR acceptance backtest before public interval claims | fresh-holdout coverage + length | `90% coverage ±1.5pp; length ≤90% baseline, no clamp` | QUEUED-BUILDABLE | smallest open item in lane A; code fix already IMPLEMENTED |
| c08/buildable-systems.md | SYS-12 xFP/FPOE pre-registration gate + REJECT-citation rule | spec-review grep + counter-test | `narrow uses need own kill lines` | QUEUED-BUILDABLE | silent re-wire around FAIL is a trust defect |
| c08/buildable-systems.md | SYS-13 beat-your-own-linearization gate for symbolic forms | time-separated ablation | `0.6039 vs 0.5818 (~4σ, n=11,271)` | QUEUED-BUILDABLE | linearization wins → form dead, coefficients may live |
| c08/buildable-systems.md | SYS-14 assert-vs-measure quote ladder (documentation lint) | superlative → measurement or PRIOR tag | `links or PRIOR:` | QUEUED-BUILDABLE | DESIGN_BRIEF:104 pressure-EPA is the exemplar violation |
| c08/buildable-systems.md | SYS-15 checklist per-track build rules (five tracks × corpus vessels) | §5 mapping | `UNCHECKED→INVALID; DATA-GAP→worst-plausible; 2+ CONFLICT→L5` | QUEUED-BUILDABLE | build validateChecklist per lane-D §3.1 |
| c08/buildable-systems.md | SYS-16 adversary governance outputs with teeth (receipts, inheritance, default-NO) | SHADOW_WOULD_REFUSE + Ed25519 + would_not_claim | `signed append-only; ANALYSIS-DRAFT sub-L5` | IMPLEMENTED | wt-intel `packages/governed/src/` + `apps/web/lib/ai-control-plane/event-ledger.ts` verified present; wire as blocking step |
| c08/buildable-systems.md | SYS-17 tiebreak audit with >10% draw-share escalation | logged draws + weekly report | `>10% → cap-feasibility review` | QUEUED-BUILDABLE | measure inter-class error correlation in same report |

## c08/challenges.md (C1–C11 + W1–W15 + R1–R9; non-duplicates only)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/challenges.md | Sim-to-real needs version-locked sim + slope gate + SIM-RESOLVED labeling | feasibility resolution (C4) | `±0.05 slope; rubric <4 inadmissible` | DUPLICATE | same claim as SYS-5 row |
| c08/challenges.md | Isotonic display-fine/staking-harmful resolved by joint τ≥0.95 decision | resolution (C6) | `τ ≥ 0.95` | DUPLICATE | same claim as SYS-6 row |
| c08/challenges.md | Smooth weights + break detector both needed (1482 vs 1675 scales) | scale resolution (C7) | `both, not one` | QUEUED-BUILDABLE | engine needs smooth combiner AND break detector (1676 post-break EW default) |
| c08/challenges.md | Fusion is variance technology, not information technology (cannot invent resolution) | scope resolution (C8) | `MI 0.0095` floor | DUPLICATE | same claim as SYS-9 row (gate on resolution) |
| c08/challenges.md | xFP buildability ≠ performance; narrow theses need fresh tests | chronological resolution (C9) | `Δrho=−0.0165, CI [−0.0396,0.0086], n=6022` | DUPLICATE | same claim as c08/verified-claims.md xFP row |
| c08/challenges.md | Count-loss objective must be re-derived in expected-unit terms (v2) | ledger correction (C11) | `units, not counts` | DUPLICATE | same claim as lane-B Challenge-E row |
| c08/challenges.md | Map "already landed" verifier + ranking remedy overstate done-ness | brief-vs-repo audit (W2/W3) | `draft PR; NOT BUILT commit` | DUPLICATE | same claims as verified-claims A4/A13 rows |
| c08/challenges.md | twCRPS 1.3–2.5% is average-to-max, single split, no multiplicity control | mean-vs-max correction (W5) | `1.3% mean, 2.5% max` | DUPLICATE | same claim as verified-claims C7 row |
| c08/challenges.md | Skellam/NOTEARS/pressure-superlative/per-class-gates/peak-ages/ensemble-names/ARBY/Airwave readings corrected | inflation downgrades (W6–W15) | `as stated per item` | DUPLICATE | same claims as verified-claims C8/C9/D+E rows |
| c08/challenges.md | REJECT/FAIL register R1–R9 are guarded negatives with cite-don't-work-around rule | ledger table | `R1 Δrho=−0.0165 n=6022 … R9 Phoneme R0=0.0551` | QUEUED-BUILDABLE | build SYS-12 REJECT-citation rule; failures: 0004-H2, 1482-unpruned, 1675-τ=0, twCRPS-body, pressure superlative, product-ambiguity |

## c08/syntheses.md (S1–S10 compositions; non-duplicates only)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c08/syntheses.md | Master pattern: measurement without enforcement across six instances | six-case audit (S1) | `blocking step + receipts + shadow + on-by-default` | QUEUED-BUILDABLE | acceptance rule for every gate; else NOVA draft label |
| c08/syntheses.md | Correlated-sources lesson stated six ways incl. reviewer-engine 44.9% agreement-where-wrong | convergence (S3) | `44.9% agreement where model wrong` | QUEUED-BUILDABLE | same SYS-1 build; 1492 correlated-error leg added |
| c08/syntheses.md | Abstention architecture discovered twice composes into one system + test | 1776×1151 merge (S4) | `≥15% less abstention, all caps, walk-forward` | DUPLICATE | same claim as SYS-2 row |
| c08/syntheses.md | Human-in-the-loop rule bounded: direction survives, 3.5pp does not | 1492 bound (S5) | `3.5pp lay-labeler prior, Not ADOPT` | DUPLICATE | same claim as SYS-3 row |
| c08/syntheses.md | Consensus-at-rest-noise / path-near-close-signal composition with Pinnacle backtest owed | PLACEABILITY × 0887 (S6) | `36.3% consensus; β₂=−0.3386 (JRA)` | DUPLICATE | same claims as verified-claims A8–A10 rows |
| c08/syntheses.md | Scaffolding-is-not-implementation audit standard with ICI→FGL→gSCAD dependency order | wiring-lane order (S9) | `(1) ICI (2) FGL (3) gSCAD` | QUEUED-BUILDABLE | build in dependency order; run documented gates on walk-forward |
| c08/syntheses.md | Structures wire, magnitudes preregister; xFP/FPOE narrowed to denominator/luck/Clay-sign | lane-E posture (S10) | `own kill line each` | DUPLICATE | same claims as xFP + SYS-12/13 rows |

## c09/verified-claims.md (canonical synthesis; workers hold detail)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/verified-claims.md | Full-tables QB splits verified as transcription; underlying numbers UNVERIFIED | X-post transcription audit | `Mayfield 5.42 YPA; Purdy 8.71; Wilson 41.6% share; JSN Cover-4 58.7% 1st-read` | QUEUED-BUILDABLE | recompute from nflverse with min-attempt thresholds before engine use |
| c09/verified-claims.md | McConkey ON/OFF (+0.23/−0.67) is circular text-only amplification, feature idea only | provenance audit | `+0.23 on / −0.67 off` UNVERIFIED | QUEUED-RESEARCH | no chart, no source line; triplicated across accounts |
| c09/verified-claims.md | 21-QB matrix verified in-file with one-game-snapshot caveats + [2P] salaries | in-file measurement | `Rush CPOE −21.3 / P2S 80%; Geno 0.00% neg; Stroud 0.45 clean; Love 78.6%/35.7%` | QUEUED-BUILDABLE | build QB Behavioral Profile Store; flags snapshot until 2+ weeks |
| c09/verified-claims.md | DST/trench/TE/WR substance verified with in-source caveats + season-frame flag | phase files | `JAX 50.0% vs DEN 56.3%; PRWR approx; McBride 35% share` | QUEUED-BUILDABLE | build trench adjustment layer; official-report sourcing only |
| c09/verified-claims.md | Week-3 wire EPA + scheme fingerprints + OL outs verified | wire file | `Purdy 0.503 … Mayfield −0.306; motion/PA/shotgun rates; 4 OL outs` | QUEUED-BUILDABLE | build scheme fingerprint table; n_plays ≥150 floor |
| c09/verified-claims.md | Ötting 71.5% is second-hand survey pointer, portable as pointer only | survey caveat | `71.5% (77.9% Patriots, 60.2% Seahawks)` | QUEUED-RESEARCH | never validated in-repo; run Ötting-style read as primary |
| c09/verified-claims.md | CAMS supplies game-theoretic bounds (I-atomicity), not machinery | theory port | `t_r 0.60s ± 0.06s; multigrid hours` | QUEUED-BUILDABLE | play-call equilibrium pilot; do NOT build CAMS machinery |
| c09/verified-claims.md | EHCP decision grade verified with random-split/pressure/selection caveats | BART catch model | `MSE 0.086; Winston 26.8% vs Wilson 13.2%; Tate +11.8pp / Bryant −18.4pp` | QUEUED-BUILDABLE | QB Decision Grade with time-ordered validation |
| c09/verified-claims.md | JOI pair chemistry predictive (~18%); defensive JDI null; CatBoost ρ≥0.40 gate | joint-impact model | `RMSE 0.04464 vs 0.05448; ρ ≥ 0.40` | QUEUED-BUILDABLE | chemistry scorer + unseen-pair predictor; JDI path stays rejected |
| c09/verified-claims.md | Calibration crisis five-times corroborated but Aug-2026 vintage (stale) | ops cross-file | `Brier ≈0.275 / ECE ≈0.112 / RES ≈0.002 RED` | IMPLEMENTED | wt-intel `docs/ops/ENGINE_RANKING_RES_NEAR_ZERO.md` + `MASTER_PROMPT_V2*.md` verified present; refresh exact triple |
| c09/verified-claims.md | Fresher HERMES read: resolution 0.005, ≥80%-confidence inverted, AUC 0.4965 | graded picks + replay | `1,663 picks; 152 at ≥80% won 40%; AUC 0.4965 (p=0.41) on 13,646` | IMPLEMENTED | wt-intel `docs/ops/HERMES_ALL_NIGHT_2026-09-04.md` verified present |
| c09/verified-claims.md | First honest measurement: −5.48% overall ROI, void pre-#695 SPREAD backfills | post-fix replay | `6,967 games; 15,939 picks; −6.53/−5.44/−1.96%` | QUEUED-RESEARCH | only honest baseline; polarity-bug void noted |
| c09/verified-claims.md | Maps-stay-OFF-while-RES≈0 is standing law; 0715 makes it structural | isotonic debug + theorem | `ε_rank irreducible by monotone maps` | IMPLEMENTED | wt-intel `docs/ops/ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md` verified present |
| c09/verified-claims.md | Calibration floors + split CALIBRATION vs DISCRIMINATION gates verified | eligibility code via map | `Brier≤0.22 / ECE≤0.05 / MurphyRel≤0.05 / n≥100; RES≳0.03–0.05` | IMPLEMENTED | wt-intel `apps/web/lib/ops/calibration-eligibility.ts` verified present |
| c09/verified-claims.md | 0.22 floor leaves ~0.008 headroom over devigged baseline (discrimination binds) | Elo vs baseline | `Elo 0.2312 vs 0.2122 on 3,018 games` | QUEUED-BUILDABLE | resolution-raising signals unlock the gate, never polish |
| c09/verified-claims.md | Walsh & Joshi +69.86% is unvalidated second-hand pointer, not evidence | survey self-downgrade | `+69.86%` UNVERIFIED | QUEUED-RESEARCH | internal calibration-vs-accuracy bake-off converts pointer to evidence |
| c09/verified-claims.md | Classwise-ECE +34.69% vs −35.17% is map-cited; trace to primary | index pointer | `+34.69% vs −35.17%` | DUPLICATE | same claim as c07/verified-claims.md 0290 row |
| c09/verified-claims.md | Game-clustered bootstrap numbers verified; do NOT hard-code φ=0.35 | 0503 ledger | `4,101→2,291 (56%); 0.60±0.01 at 0.027 vs 0.90±0.01 at 0.063 (2.3×)` | QUEUED-BUILDABLE | tune φ on nflverse 2020–2024; tails stay ~85% near WP 0.3/0.7 |
| c09/verified-claims.md | MIS loss + DeepGLEAM hybrid verified with weak-config fine print | 0473 ledger | `L_MIS formula; 66.03 vs 73.59 vs 239.94` | QUEUED-BUILDABLE | MIS-95 interval engine; MC dropout deserves fair retune |
| c09/verified-claims.md | EP repair kit numbers verified (reweight + cluster bootstrap + catalytic prior) | 1801 ledger | `log-loss 0.7506 vs 0.7670; 95.6% vs ~83–86%` | QUEUED-BUILDABLE | ship with as-of bitemporal guard |
| c09/verified-claims.md | QOOB/ACI/AC-RAC stack verified with exchangeability + audit caveats | 1650/1640/2142 ledgers | `γ=0.005; 0.21–0.35% vs 3.35–4.70%; err_t on published` | IMPLEMENTED | wt-intel `apps/web/lib/calibration/aci-durable.ts`, `aci-state.ts`, `1910-10562-nested-conformal-qoob.ts` (+test) verified present; QOOB ENABLED=false — wire behind gate |
| c09/verified-claims.md | 0715 theorem: monotone calibration CANNOT reduce ε_rank | thesis theorem | `Δ̂(c) ≤ ε_Bayes+ε_approx+ε_rank+ε_stat+ε_misc` | QUEUED-BUILDABLE | explains structural RES≈0; money goes to features |
| c09/verified-claims.md | Scalarizer f1 + three documented DARKs verified | overnight prompt | `f1=0 ⟺ |r|≥0.08 AND |slope|>se; officials n=113 r=−0.09257; wind −0.135/mph se=0.1618 n=349; coaching r=−0.01363 n=255` | QUEUED-BUILDABLE | adopt verbatim + byte-for-byte DARK reproduction gate |
| c09/verified-claims.md | GP-PIT FAM ≥2.0 deployment gate verified | 1082 ledger | `FAM = ΔS̄/√Var(ΔS) ≥ 2.0` | QUEUED-BUILDABLE | predicts own Kelly winnings in bits; below → collect FOA data |
| c09/verified-claims.md | HS_in post-processing wins 11/12 at 180–215× lower cost | 1525 ledger | `+4.59%/+4.53% CRPSS` | QUEUED-BUILDABLE | default uncertainty layer; inherit game-clustering |
| c09/verified-claims.md | PredictIt consensus fails; whale 40% and ω₁≈0.15 are simulation-only | 0866/1359/1735 ledgers | `−$214.71 day-trader mean; δ_S=ρΔ_S; log2≈0.693 nats` | QUEUED-BUILDABLE | Market Informativeness Gate; re-estimate both thresholds on real odds |
| c09/verified-claims.md | δ/σ gate formula verified; re-derive for general decimal odds | 1748 ledger | `E[growth]=2(δ²−σ²)Φ(δ/σ)+2σδφ(δ/σ); stake iff δ_perc>1.5σ` | QUEUED-BUILDABLE | the single merged staking gate; even-odds/small-δ only as-is |
| c09/verified-claims.md | Multi-pick Kelly + L≥1,761 at p=0.51 verified (≈0.63 threshold is INFERENCE) | 0813 ledger | `f_K=2p−1; G≈G_K−1/(2L)` | QUEUED-BUILDABLE | Laplace-smoothed p̂ + L_min gate + correlation haircut |
| c09/verified-claims.md | Maximin-drawdown verified-but-misleading (one COVID window, preliminary) | 0834 ledger | `9.4%/−3.3% vs 5.7%/−6.1%` | QUEUED-RESEARCH | walk-forward vs fractional Kelly on 2024–2025 picks first |
| c09/verified-claims.md | Fractional vs full Kelly Vanguard numbers verified | 1222 ledger | `8.9%/41.9%/$576,464 vs 17.2%/89.8%/$3,002,829` | QUEUED-BUILDABLE | variance-budgeted α_t replaces fixed α=0.25 |
| c09/verified-claims.md | Multivariate Kelly closes kelly-investigation single-bet gap | 1212 ledger | `f = μ/(μ²+σ²); correlation reduces fractions` | QUEUED-BUILDABLE | constrained convex program; Σf≤1 + drawdown budget |
| c09/verified-claims.md | Generalized Kelly f* verified; known-p assumed — downstream of δ/σ only | 1630 ledger | `f*=(2p−1)(1+w/g); p=.6 → ≈.659 vs .2` | QUEUED-BUILDABLE | cap inflation at 2×; never standalone |
| c09/verified-claims.md | Kelly-gap identity verified (analytic, no empirics) | 1232 ledger | `g⋆−gπ = ½‖θ−σᵀπ‖²` | QUEUED-BUILDABLE | staking-rule attribution diagnostic |
| c09/verified-claims.md | 0791 constitution verified: optimize weights on CLV/P&L, never CRPS | trading profiter | `80–96% of crystal ball; CRPS ≈500× slower` | QUEUED-BUILDABLE | decision-metric ensemble weighting with equal-weight baseline |
| c09/verified-claims.md | 1172 puzzle verified; "1172 ranking lasso" is cataloging error | Frazier et al. | `standard size 0.0000–0.0004; one-step p 5.675e-05` | QUEUED-BUILDABLE | one-step constitution kills "not significant on 270 games" verdicts |
| c09/verified-claims.md | DAC/SPTD/CARL/1152/SCoRE abstention numbers verified with comparison caveats | 0693/0715/1008/1152/1777 | `DAC ≤25% removal gate; CARL worse than threshold at similar abstention` | QUEUED-BUILDABLE | three-stage DAC→SPTD→CARL stack + copy rule + e-value gate |
| c09/verified-claims.md | Phantom-BT verified with 2-orders δ disagreement flagged | 0544 ledger | `λ=0.01; δ=1.2589 vs 1/98≈0.0102; ρ=40` | QUEUED-BUILDABLE | choose tuning philosophy explicitly; re-scale ρ for 17 games |
| c09/verified-claims.md | Elo √K law + KRC + Elo-MMR + TVC + HFA-fixed + LS + MFM + GLMF + flexBART + GLMM verified | rating ledgers | `√K bound; KRC +0.27pp (noise); HFA 3.00 vs 3.37/3.26/3.13; GLMF 0.342 vs 0.344` | QUEUED-BUILDABLE | one three-way bake-off (phantom/KRC/Katz), not stacking; fixed-effects HFA; ridge GLMF |
| c09/verified-claims.md | Nested ZIGP/Sarmanov/ZI-Skellam/BBE/kneel/WPA2 numbers verified with artifact caveats | score-sim ledgers | `β₃ pilot ≥0.5%; AIC 1850.77; MCM ≈1000×; HGB R² 0.2129/0.2188` | QUEUED-BUILDABLE | end-state compositional simulator; rank-model bake-off first |
| c09/verified-claims.md | xFP/FPOE pre-registered FAIL + INVERTED sign convention verified | rescue + dossier | `Δrho=−0.0165 CI [−0.0396,0.0086] n=6022; negative FPOE = OUTscoring` | CONTRADICTS-DOCTRINE | doctrine: descriptive-only until definition-pinned re-run overturns; pin sign first |
| c09/verified-claims.md | Mediation/crossover/CATE/ITS/residual-correction recipes verified | causal ledgers | `G-misspec fatal 0.436→4.519; β-fragile +1.1→−5.1; CRAFTER gates` | QUEUED-BUILDABLE | wind→totals medshift; case-crossover stoppages; mob(Ŵ); ITS harness; residual-first intake |
| c09/verified-claims.md | NLP intake trio + weak-signal engine + routing + AIRWAVE legal spec verified | intake ledgers | `BERT 92% (never 99.8%); T3 +20.6pp/−62.8%; κ=0.68; 30-min spike; 3+ sources; 1.5pt move; 30-min EXPIRE` | QUEUED-BUILDABLE | injury-trust pipeline 1594→1722→1308; crawler BLOCKED (BLOCK-7) |
| c09/verified-claims.md | News sentiment portable idea is disagreement metric; level result is negative example | 1112 snooping flag | `0.57 vs labels; ~0.15 temporal; 0.55 compound lag −1` | QUEUED-RESEARCH | gate locked-2025 |r|≥0.10; REJECT if <0.05 |
| c09/verified-claims.md | Market Gravity G proposal verified (proposal, not backtest) | proposal doc | `G=1−(D_late/D_early) [−1,1]; nulls <2 books / D_early<0.25pp` | QUEUED-BUILDABLE | pure function + tests; divergence flags interesting state only |
| c09/verified-claims.md | ECDD/sliding-OGD/calibration-floors/honesty-demo/ledger/forensic/clean-rooms/CLV/crosswalk/PROVE caps rows verified | ops/r22 ledgers | `ARL_0=272; Beta-map 120-window; 25 calls / 100 picks; 23.0% vs 52.4%; gate_decisions 1,167 dead since 06-11; n=5 α=0.1 → 83.33%` | QUEUED-BUILDABLE | drift monitor + OGD diagnostics + same-book CLV grader + crosswalk service + claim ledger |
| c09/verified-claims.md | NGS pressure/completion specs verified as reported-by-NFL; discrepancies do-not-use | playbook | `>75%; 10.3% avg; 2.9s; XGBoost r²=0.98; Van Ness/Allen mismatches` | CONTRADICTS-DOCTRINE | doctrine: NGS internal-only + do-not-use tags — vendor outputs are calibration truth, never public evidence |
| c09/verified-claims.md | Misc ops verified (HF orgs [], LAC_BUF edge sum, DFS oracle bounds, 1349 oracle-by-construction, 1473 contradiction) | d37/r04 files | `orgs: []; 0.30259224777263855 / 0.68; 6/6 + 78/78 (optimizeOne only)` | QUEUED-BUILDABLE | extend oracle to N-unique path; diversity tested prospectively; forecast→ILP only |
| c09/verified-claims.md | Corrections (a)–(d) carried: 69.86% pointer, 1172 mislabel, transcription universes, FPOE sign+FAIL | task mandates | `as stated` | DUPLICATE | same claims as the respective canonical rows above |

## c09/buildable-systems.md (Tier 0–4 consolidated specs)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/buildable-systems.md | 0.1 trust-signal intake is headline gap #1 with non-negotiable legal spec | 0202+0332 retrieval over video + AIRWAVE + weak-signal engine | `30-min spike; 3+ sources; 1.5pt move; 30-min EXPIRE; 0844 masking` | QUEUED-BUILDABLE | no build exists in any chunk; crawler BLOCKED (BLOCK-7) |
| c09/buildable-systems.md | 0.2 QB Profile Store + clean-vs-pressured splits (DATA_GAP) with provenance discipline | d35 features + EHCP + JOI + shell + trust | `qbUnderPressure computed not imputed; [2P] tags; Spearman ≥0.5` | QUEUED-BUILDABLE | first consumer: pressure/coverage interaction matrix from nflverse |
| c09/buildable-systems.md | 0.3 scalarizer adopted verbatim + byte-for-byte DARK reproduction gate | f1 honesty gate | `|r|≥0.08 AND |slope|>se; n≥250, ECE≤0.06, drift≤0.10` | QUEUED-BUILDABLE | officials/wind/coaching DARKs are the regression suite |
| c09/buildable-systems.md | 0.4 OL→scheme→QB ordered pipeline with typed contexts + DATA_GAP states | 6-layer call order | `TrenchContext→SchemeContext→QBContext` | QUEUED-BUILDABLE | dependency order load-bearing; Ötting 71.5% informational bound only |
| c09/buildable-systems.md | 0.5 honesty machinery (evidence governor + ledger + triage + receipts) answers 17:34 challenge | graded outputs + schemas | `25 calls; 100-pick gate; CALIBRATION_AUTO_APPLY=false` | QUEUED-BUILDABLE | triage proposed, not running; landed counts no longer spend |
| c09/buildable-systems.md | 0.6 calibration store + resolution gate before any public surface | floors + split gates + shadow promotion | `Brier≤0.22 / ECE≤0.05 / MurphyRel≤0.05 / n≥100; RES≳0.03–0.05` | QUEUED-BUILDABLE | maps OFF at RES≈0; NGS internal-only; projections+rankings public only |
| c09/buildable-systems.md | 1.1 rating bake-off (one build: phantom/Mn-Dirichlet/√K/Elo-MMR/TVC/HFA/blend/MFM/SDI/LS) | nflverse 2020–2024 proper scoring | `δ=1.2589; Brier Δ−0.01 p=0.04; 3.00 vs 3.37/3.26/3.13; 6-week half-life` | QUEUED-BUILDABLE | priors ~6-week half-life; adopt forecast→ILP only for 1447 |
| c09/buildable-systems.md | 1.2–1.4 game-clustered uncertainty + EP repair + QOOB/ACI/AC-RAC nested stack | bootstrap + MIS + conformal | `φ tuned (never 0.35); 95.6% coverage; width ≤90% CQR at ±2pp; 0.21–0.35% critical` | QUEUED-BUILDABLE | enable disabled QOOB behind gate; err_t on published interval |
| c09/buildable-systems.md | 1.5 three-stage abstention DAC→SPTD→CARL with ≤25% removal + copy rule | denoise→calibrate→abstain | `≤25% removal; E[L·E]≤1; ε_rank irreducible` | QUEUED-BUILDABLE | 75% removal would delete a season; 1152 copy framing |
| c09/buildable-systems.md | 1.6 δ/σ staking gate (single merged gate) + supporting Kelly lanes | 1748 + 0813/0834/1630/1212/1222/1232/0964/1761 | `δ_perc > 1.5σ; Φ(δ/σ) scale; L≥1,761 at p=0.51` | QUEUED-BUILDABLE | re-derive for decimal odds first; 1761 principle only |
| c09/buildable-systems.md | 1.7 ensemble combination under decision-metric constitution (0791 load-bearing) | DM/White one-step + NSGA-III + Gibbs + BOA + PAS | `500× compute lost at P&L; 10–50× power loss; γ on decision metric` | QUEUED-BUILDABLE | EW until enough data post-break; peer-prediction cold-start only |
| c09/buildable-systems.md | 1.8 Market Informativeness Gate (0866/1359/1735 pre-deployment screen) | crowds-failure + whale + saturation checks | `~40% re-estimate; 0.693 nats / ω₁≈0.15 re-estimate` | QUEUED-BUILDABLE | failing line is settlement target, not signal |
| c09/buildable-systems.md | 1.9 same-book CLV grader (refuse on empty intersection, count refusals) | book-key intersection grading | `fixes 23.0%-vs-52.4% misread` | QUEUED-BUILDABLE | DATA-BLOCKED on OddsLineSnapshot archive |
| c09/buildable-systems.md | 2.1 end-state compositional simulator eats nested-dependency family | kneel/garbage + ZIGP + Skellam + Sarmanov | `β₃ pilot ≥0.5% log-loss` | QUEUED-BUILDABLE | rank-model bake-off first; nested wins may be artifacts |
| c09/buildable-systems.md | 2.2 residual-corrector layer (CRAFTER): new signals enter as corrector features only | frozen engine + gated candidates | `|ρ|>0.05 vs residual; ≤0.75 pairwise; ≤2/family` | QUEUED-BUILDABLE | answers how intelligence signals enter the engine |
| c09/buildable-systems.md | 2.3 causal toolkit (CATE/crossover/Hi-CI/pruning/mediation/ITS) | 0769/0533/1122/0272/0098 recipes | `strong-confounding-only adoption; null expected for wind` | QUEUED-BUILDABLE | ITS harness for practice-load/safety splits, not null conclusion |
| c09/buildable-systems.md | 2.4 drift & regime monitoring with every-weight refit trigger | ECDD + coreset + OGD | `ARL_0=272; 120-game window` | QUEUED-BUILDABLE | frozen-weights staleness answered per weight |
| c09/buildable-systems.md | 2.5–2.10 trajectories + NLP + weather + simulators + DFS + Hawkes lanes | 0604/0594/1594→1722→1308/HRRR/BBE/S5/1813 | `≥55% designations 30min early; 4→41 repair floor` | QUEUED-BUILDABLE | five proxies preregistered; distributions+c covariance rebuild; STAGED behind simulator |
| c09/buildable-systems.md | 3.1 CV charting PARKED pending 2026-path decision (0.74 recall, 57 frames) | keyframe→label→technique→boundary pipeline | `recall 0.74; Sloan 86.5%/72.3%` | QUEUED-RESEARCH | coordinator decision: CV vs licensed contracts; Harshraj [DERIVED] |
| c09/buildable-systems.md | 4.1–4.4 data ops + adjustment v1 + governance + market stack | crosswalk + bitemporal + +inf + NB2 + registry + sandbox | `0 rows signals table ("no fuel"); 7-code table whole` | QUEUED-BUILDABLE | fill signals table before rules matter; xFP/FPOE first kill-list entry |

## c09/challenges.md (consolidated contradictions)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/challenges.md | Discrimination binds (0.008 headroom); maps OFF at RES≈0; fix is wiring not scoring | gate-split map + 0715 | `0.22 vs 0.2122; RES≳0.03–0.05` | DUPLICATE | same claims as verified-claims calibration rows |
| c09/challenges.md | Provenance caveats across 0533/0493/0747/0574/0986 + second-hand/synthetic items | source audit (r02) | `102 ≠ 104 WC format; 40% conditional; ω₁≈0.15 synthetic` | QUEUED-RESEARCH | INGEST-AND-LEARN: UNTESTED/QUEUED, never SKIP/DEAD |
| c09/challenges.md | Empty brief dirs covered via dense-wave slug matching, 0 unmatched (matching-process claim) | coverage method | `299/299; mislabel inherits` | QUEUED-RESEARCH | spot-audit 5–10 load-bearing briefs (1172, 1447, 0791, 0503, 1748) |
| c09/challenges.md | Ledger-internal contradictions (1447/1473/0544/1594/0068/PROVE_EDGE/CARDS/CL1–CL9/wind) | contradiction log | `per-item as stated` | QUEUED-RESEARCH | adopt architecture only (1447 ILP, 0098 ITS design); use 92% never 99.8% |
| c09/challenges.md | Per-method fragility notes (φ=0.35, √K small-K, COVID window, decimal odds, singleton bias) | structural audit | `per-item as stated` | DUPLICATE | same claims as respective buildable-system gate rows |
| c09/challenges.md | Frozen weights without refit triggers are whole-class technical debt | staleness audit (CH-7) | `w=0.1 + priors + CLV grader all frozen` | QUEUED-BUILDABLE | every weight names refit trigger (open question #3) |
| c09/challenges.md | Trust-signal gap unfilled; gateway/crawler/rankings/triage/scalarizer-priors staleness listed | governance gaps | `map #1; BLOCK-7; 06-11 dead gate_decisions` | QUEUED-BUILDABLE | priority #1 build; review-queue proposed not running |
| c09/challenges.md | DATA-BLOCKED (odds archive, pressure splits, coverage splits) + PARKED + perishable + stale ledger | data audit | `0-row signals; W2 expiry; 06-11 readers fallback` | QUEUED-BUILDABLE | OddsLineSnapshot unblocks 1.9/1.6δσ/1.8-CLF |

## c09/syntheses.md (SYN-1..11 + corrections)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/syntheses.md | Closed calibration loop 0433→0473→0503→0564 as feature→interval→uncertainty order | four-paper composition | `56% equivalents; 2.3× width; √K discipline` | QUEUED-BUILDABLE | joints structure → heads → clusters → discipline |
| c09/syntheses.md | Uncertainty stack QOOB(wks1–6)→ACI(7+)→AC-RAC(decision) with published-interval audit | nested conformal pipeline | `≤90% width at ±2pp; γ=0.005; 0.21–0.35%` | QUEUED-BUILDABLE | wire-disabled QOOB exists; ACI files exist (IMPLEMENTED parts) |
| c09/syntheses.md | Three-stage abstention DAC→SPTD→CARL with ≤25% gate + copy constraint | architecture agreement | `≤25%; 62%→50%→55%; FNR 31%→41%→42%` | DUPLICATE | same claim as buildable-systems 1.5 row |
| c09/syntheses.md | 6-layer call order with OL→scheme→QB dependency + DATA_GAP states | r01S20 + d06 convergence | `qbUnderPressure computed not imputed` | DUPLICATE | same claim as buildable-systems 0.4 row |
| c09/syntheses.md | Residual-correction doctrine: three independent arrivals, corrector-first intake | CRAFTER + DeepGLEAM + map | `direct injection actively harmful` | DUPLICATE | same claim as buildable-systems 2.2 row |
| c09/syntheses.md | Sizing stack constitution→one-step→Kelly→gate→NSGA-III→slate→diagnostic with gate ordering | six-source composition | `stake iff δ>1.5σ post-scalarizer post-abstention` | DUPLICATE | same claim as buildable-systems 1.6 row |
| c09/syntheses.md | Trust assembly JOI+EHCP+AIRWAVE+weak-signals+0202/0332 with Tier-5 governance | four-leg composition (INFERENCE) | `ρ≥0.40; 30-min/3-source/1.5pt/30-min` | DUPLICATE | same claim as buildable-systems 0.1 row |
| c09/syntheses.md | Market gate 0866→1359→1735 + CL1–CL9 harness on 2020–2024 archive | screen composition | `whale/saturation/crowd-failure checks` | DUPLICATE | same claim as buildable-systems 1.8 row |
| c09/syntheses.md | Nested-dependency pattern (β₃ + kneel-outs) eaten by one simulator build | phenomenon identity (INFERENCE) | `β₃ ≥0.5% gate` | DUPLICATE | same claim as buildable-systems 2.1 row |
| c09/syntheses.md | Honesty triad scalarizer + ledger + evidence-grade governor between engine and surface | governance convergence | `byte-for-byte DARKs; ASSOCIATION_ONLY holdout` | DUPLICATE | same claims as buildable-systems 0.3/0.5 rows |
| c09/syntheses.md | QB intake inventory (clean/pressured + coverage + trust + shell matrix + governance) | six-source intake spec | `Stroud 0.45 clean; Rush 80% P2S; McConkey idea` | DUPLICATE | same claims as verified-claims §1 + 0.2 rows |
| c09/syntheses.md | Corrections (a)–(d): 69.86% pointer, 1172 mislabel, transcription universes, FPOE sign+FAIL | task mandates | `as stated` | DUPLICATE | same claims as verified-claims corrections rows |

## c09/working/c09-deep-d01.md (d00–d05: GLMF/ITS/1X2/flexBART/nested/medshift/survey/BBE/video/CAMS)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d01.md | GLMF rank-monotonicity is the result; margins thin; reimplement from Li & Gaynanova | 5-fold CV rank-3 | `0.342 vs 0.344; LL −0.854 vs −0.864` | QUEUED-BUILDABLE | build S2 sparse matchup engine; ridge required (2/144 failures) |
| c09/working/c09-deep-d01.md | 0098 ITS numbers verified; adopt design, not "no sustained increase" conclusion | mixed Poisson ITS | `701→804 +15%; RR 0.93/1.05/0.90/0.73` | QUEUED-BUILDABLE | build S9 regime-break harness with 2011/2021 positive controls |
| c09/working/c09-deep-d01.md | 1X2 static-θ numbers verified; durable insight is profit-not-ROI threshold policy | BN + threshold sweep | `θ=8%/£44.7/5.49%; θ=9%/£177.18/16.89%; 42%–296% max-odds` | QUEUED-BUILDABLE | build S6 EV-threshold policy on chronological NFL backtests |
| c09/working/c09-deep-d01.md | flexBART wins framing but DGP2 singleton failure needs diagnostic gate | MCMC categorical trees | `8.6% vs 18.4%; p=4.5×10⁻²⁶; 48min vs 2h` | QUEUED-BUILDABLE | build S5 with DGP2 singleton-outlier diagnostic every fit |
| c09/working/c09-deep-d01.md | Nested ZIGP adoptable piece is β₃ pilot only; no market baseline; Italy miss noted | two-stage sampler | `MDL 22 vs 26; Italy 4.8% won; ≥0.5% gate` | QUEUED-BUILDABLE | build S4 jointly with kneel-out adjustment |
| c09/working/c09-deep-d01.md | 0282 market numbers are pointer-map, not evidence (file says so at :50) | PRISMA survey audit | `69.86% et al. UNVERIFIED-to-primary` | DUPLICATE | same claim as verified-claims §2b 0282 row |
| c09/working/c09-deep-d01.md | BBE synthetic tapes terminal node with 10%-log-loss transfer gate | limit-order-book ABM | `MCM ≈1000×; CoV≈0.005; within 10%` | QUEUED-BUILDABLE | build S7 NFL-BBE; else stress-test tool only |
| c09/working/c09-deep-d01.md | Video stack composes ingest→detect→memory→denoise→keyframe with 0332 kill line | five-stage pipeline | `F1 49.1→67.5; ≥80% recall at ≥60% + ≥20pp` | QUEUED-BUILDABLE | build S8 denoiser + S10 sampler; captioner excluded |
| c09/working/c09-deep-d01.md | Play-call equilibrium pilot (≤I-atom mixture vs logistic) without CAMS machinery | latent mixture + Bonferroni | `≥0.005 nats + ≥3 teams` | QUEUED-BUILDABLE | build S1 scanner; Ötting predictability as primary |
| c09/working/c09-deep-d01.md | Mediation pilot resolves wind DARK (direct vs play-calling paths) | medshift δ=5/10mph | `PIIE significant 5%; sign stability; A3 defensible` | QUEUED-BUILDABLE | build S3 decomposer; expect informative null |
| c09/working/c09-deep-d01.md | 0302/0312/0352/0048/0068-margins/0342-trade/0232-benchmark/0176-hindsight/0118-fallbacks/0262-empty are rejections or kill-lined | adversarial reads | `per-item gates` | NOT-APPLICABLE | no GSE seam as stated; portable QA rules only (temporal splits, on-manifold metrics, leakage gates) |

## c09/working/c09-deep-d02.md (d06–d11: quant plumbing core)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d02.md | McByte gating pattern adapts (blind mask fusion harmful: IDF1 48.6→44.4) | ablation | `62.3/64.0/89.8; mf>0.05; mc>0.9; conf>0.6` | QUEUED-BUILDABLE | build S12 labeling-factory gating with lighter backbone |
| c09/working/c09-deep-d02.md | 0453/0463/0483/0513/0523 REJECTs verified (invented arithmetic, circular labels, no data) | verdict audit | `0.084 smuggled; 69.5% vs 100% circular` | NOT-APPLICABLE | correctly rejected; 0523 reporting discipline only salvage |
| c09/working/c09-deep-d02.md | MIS/DeepGLEAM verified; "rule out MC dropout" eroded by weak config | interval bake-off | `MIS-reg 179.96 vs 881.05; 66.03 vs 73.59 vs 239.94` | QUEUED-BUILDABLE | build S1 MIS-95 engine + S11 residual-vs-market learner |
| c09/working/c09-deep-d02.md | 0493 72.35% built on sand (no split, 9,839-overlap, Vegas category error) | split audit | `72.35% vs logistic 70.12%; ≥0.005 gate` | QUEUED-RESEARCH | paper number carries zero adoption weight; gate does the work |
| c09/working/c09-deep-d02.md | 0503 ADOPT game-clustered bootstrap (φ never hard-coded) | coverage restoration | `56%/31%/84% equivalents; 2.3× width` | DUPLICATE | same claim as verified-claims 0503 row; build S2 |
| c09/working/c09-deep-d02.md | 0544/0554/0564/0574/0584/0594/0604 verified with tuning-philosophy/caveat flags | rating/trajectory ledgers | `δ 100× split; +0.27pp no-CI; M2 beats M1 LPML; SMA(10%) worst` | QUEUED-BUILDABLE | build S3 rating stack v2 + S8 GP curves + S9 GARCH volatility |
| c09/working/c09-deep-d02.md | 0747 weakest paper; ADAPT attaches to CORRECTED highest-lower-bound rule only | sign-error audit | `figures-only; A/B both orientations` | QUEUED-BUILDABLE | build S4(b) corrected HR–LR with paired significance |
| c09/working/c09-deep-d02.md | 0769 mob(Ŵ) centering recipe verified (sandbox-only limits) | CATE benchmark | `0.663/0.148/0.707; 0.392/0.197; Setup B 1.000` | QUEUED-BUILDABLE | build S6 with overlap/positivity validation + semi-synthetic gate |
| c09/working/c09-deep-d02.md | 0791/0813/0834 verified; ≈0.63 threshold is worker INFERENCE not theorem | decision/sizing ledgers | `500× slower loses; L≥1,761 at p=0.51` | DUPLICATE | same claims as verified-claims sizing rows |
| c09/working/c09-deep-d02.md | 0844 masking protocol mandatory for every GSE text model (100% name recall) | leakage study | `69.02%/56.42%; mask names/teams/numerics` | QUEUED-BUILDABLE | build S10 draft lane; prerequisite for trust-signal intake |
| c09/working/c09-deep-d02.md | Design drives results (resampling/centering/baseline), not learner sophistication | meta-pattern | `cluster + center + EW over fancy learners` | QUEUED-BUILDABLE | overweight design choices in calibration/estimation effort |

## c09/working/c09-deep-d03.md (d12–d17: market/microstructure/NLP/weather/DFS/discovery)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d03.md | Market Informativeness Gate composes 0866+1359+1735 (INFERENCE composition) | diagnostics + ABM + IG-weighting | `≥2% log-loss; flag 5–30%; fade profitable after vig` | QUEUED-BUILDABLE | build system 1; whale/saturation re-estimated on Pinnacle |
| c09/working/c09-deep-d03.md | δ/σ gate + NSGA-III + SCoRE form one subsystem on shared calibration store | sizing/selection chain | `δ_perc>1.5σ; knee ROI ≥ logloss-opt at ≤2% loss; E[L·E]≤1` | QUEUED-BUILDABLE | build systems 2–4; σ from rolling calibration history |
| c09/working/c09-deep-d03.md | NLP intake pipeline 1594→1722→1308 with honest-92% rule + safeguards | classify→extract→monitor | `92% never 99.8%; +20.6pp/−62.8%; ≥70%/≥0.55; 30min early ≥55%` | QUEUED-BUILDABLE | build system 7; anonymization-perturbation mandatory |
| c09/working/c09-deep-d03.md | Weather postprocess + RQE tail audit composes HRRR + extremes check | LightGBM + RQE | `wind ≥10% / temp ≥5% RMSE; tail re-fit improves extremes` | QUEUED-BUILDABLE | build system 8; recipe transfers, JMA models don't |
| c09/working/c09-deep-d03.md | EP repair + ZI-Skellam2 margin + halftime copula form football uncertainty stack | cluster EP + margin dist | `0.7506; AIC ≥10; push ±0.5pp; copula beats independence` | QUEUED-BUILDABLE | build systems 5–6; MARKET_PROP firewall on p-side |
| c09/working/c09-deep-d03.md | DFS upgrades: dominance pruning + SCO continuation pricing as competing constraints | MILP + expected-prize | `exact optima ≥10× speedup; GPP ROI season test` | QUEUED-BUILDABLE | build system 9; 1473 forecast→ILP only, numbers not portable |
| c09/working/c09-deep-d03.md | LS ratings + listwise ranker + Hawkes credit + SR governance + redundancy flag (hard-gated) | ratings/rank/sequence/discovery | `MAE ≤ Elo+0.1; NDCG ≥0.005; FP<1%; OR>1 CI` | QUEUED-BUILDABLE | build systems 10–14; movement flag lowest confidence, design test first |
| c09/working/c09-deep-d03.md | 1473/1594-leak/1447-retrodictive/1483-n=2/0866-two-markets/second-hand/synthetic provenance items flagged | method audit | `per-item as stated` | DUPLICATE | same claims as verified-claims/challenges provenance rows |

## c09/working/c09-deep-d04.md (d18–d23: CRAFTER/drift/coreset/trust/calibration/closing-line)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d04.md | CRAFTER residual mandates verified; K=20 operating point; source-blind gate | black-box forecaster correction | `+6.4–27.2 lifts; p<0.01; ρ>0.05, |corr|<0.75, ≤2/family ≤10/round` | QUEUED-BUILDABLE | build residual-corrector layer with NONE floor + clustered SEs |
| c09/working/c09-deep-d04.md | ECDD ARL_0=272-game proposal + GNG/coreset equations verified (toy-scale caveat) | drift + continual learning | `λ=0.2; degree-7 L; 200-task coresets` | QUEUED-BUILDABLE | build ECDD on schedule-adjusted residuals + Stein buffer; EWC+Adam constraint |
| c09/working/c09-deep-d04.md | SR dummy audit + NED tie-break + FRANS/DIMA transfer gates verified | discovery governance | `45.1–100% dummy use; PCC 0.00466; ≥0.004 + leak audit` | QUEUED-BUILDABLE | build audit + NED selection; leakage-contaminated wins discounted |
| c09/working/c09-deep-d04.md | SIGNAL-GAPS/existing-map/NGS/master-index numbers verified as present-in-map (second-hand) | corpus audit | `35→5; 0.53–0.61; r²=0.98 vendor; 1,494 rows` | QUEUED-RESEARCH | do not wire map-cited numbers as constants until primary-traced |
| c09/working/c09-deep-d04.md | Routing/weak-signal/Dixon-Coles-soccer-only/revenue/content numbers verified | governance docs | `30min/3-source/1.5pt/2hr/BLOCK-7; ρ=−0.13 soccer` | QUEUED-BUILDABLE | build watchlist + shadow promotion pipeline; τ(ρ) never ported to NFL |
| c09/working/c09-deep-d04.md | FPOE contradiction resolved against weighting; inverted sign is live hazard | dossier vs rescue FAIL | `negative = OUTscoring; Δrho=−0.0165` | DUPLICATE | same claim as verified-claims §6 xFP row |
| c09/working/c09-deep-d04.md | NGS playbook+legal+map#9 compose spec+doctrine+schema; closing discipline coherent | three-doc loop | `75%/10.3%; 1:1 verified 2026-07-03; close=TARGET` | QUEUED-BUILDABLE | build 1851-routing + HANDOFF schema intake; FPOE re-test harness |
| c09/working/c09-deep-d04.md | HANDOFF weights sum 1.00 verified; 14,448 items 100% wired; WHAT REMAINS listed | wiring audit | `MARKET .34 vs EFFICIENCY .22; PageHinkley unwired` | QUEUED-BUILDABLE | market-weight migration is the program scoreboard; close DATA-BLOCKED archive first |

## c09/working/c09-deep-d05.md (d24–d29: full-tables/WPA2/total-signal/DFS/ethandojo/gravity/calibration)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d05.md | Full-tables splits are transcription with author universes; McConkey circular | transcription audit | `5.42/8.71/41.6%/58.7% universes; +0.23/−0.67 UNVERIFIED` | DUPLICATE | same claim as verified-claims §1a row |
| c09/working/c09-deep-d05.md | WPA2 GP collapse verified (constants; HGB cap; GLI-0.1 0.0037 vs 0.112/0.079) | symbolic-regression kill lab | `R²=−0.0787 CI [−0.0817,−0.0759]; HGB 0.2129/0.2188; down +0.21` | QUEUED-BUILDABLE | plain-MSE GP dead on heavy tails; Huberize fitness; pre-snap leverage features |
| c09/working/c09-deep-d05.md | Total-signal spec verified: 5,142 rows, 0-row player signals ("no fuel"), rule shape | wiring contract | `TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG` | QUEUED-BUILDABLE | build Adjustment Layer v1; fill ≥1 signal row/game with lineage |
| c09/working/c09-deep-d05.md | DFS optimizer contradiction: static legacy vs S5 distributional rebuild delta | optimizer audit | `4→41 repair; 38 TE-FLEX→0; 36 final` | QUEUED-BUILDABLE | S5 rebuild consuming distributions+c covariance; repair floor stays green |
| c09/working/c09-deep-d05.md | ethandojo 21–11 subject-claimed; recipe is consensus baseline, not clone | handoff audit | `10-6/11-5 captions; 10k sims` | QUEUED-RESEARCH | reverse-engineered modules are INFERENCE; feature list sane baseline |
| c09/working/c09-deep-d05.md | Market Gravity G math sound with honest nulls; divergence flags state only | proposal audit | `G=1−D_late/D_early; D_early<0.25pp null` | DUPLICATE | same claim as verified-claims Gravity row |
| c09/working/c09-deep-d05.md | Calibration doctrine arc d27→d28→d29 corroborates map #12/#13 with mechanics | plumbing→selector→floors→wound→law | `0.02/30-day; A~N(1,1)/B~N(0,1); ≤0.22 GREEN×3` | DUPLICATE | same claims as verified-claims calibration rows |
| c09/working/c09-deep-d05.md | QB interaction matrix + shell trust + gravity + resolution-gated pipeline are top builds | prioritization (INFERENCE) | `|r|≥0.08 AND |slope|>se; ρ gain; R²≥0.15` | QUEUED-BUILDABLE | builds 1–8; recompute, never transcribe; NB2 φ property test |

## c09/working/c09-deep-d06.md (d30–d37: QB matrix/DST/TE-WR/wire/scalarizer/rulers/oracle/CV)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-d06.md | QB matrix/DST/WR-TE/wire/props/edge-sheet/vision/NGS/misc verified per source:line | source audit | `per-item as stated (Rush/ Geno/ Stroud/ Love; JAX-DEN; McBride; Purdy 0.503…)` | DUPLICATE | same claims as verified-claims §1 + §5 + §10 rows |
| c09/working/c09-deep-d06.md | Scalarizer + calibration-weights + rulers/CLV + floors/launch-gates verified | governance audit | `f1 rule; w=0.1; 23.0% vs 52.4%; n=5→83.33%→+inf` | QUEUED-BUILDABLE | build BS-8 (byte-for-byte) + BS-9/10/11/12/13/14 |
| c09/working/c09-deep-d06.md | xFP FAIL narrow (rank only); wr/te descriptors survive it | scope resolution | `Δrho=−0.0165 covers zero; units 1/1/1` | DUPLICATE | same claim as verified-claims §6 row (narrow reading) |
| c09/working/c09-deep-d06.md | QB matrix is W1 snapshot in profile costume; salaries [2P]; edge-sheet volatile; oracle overstated | challenge audit | `n=1 mixes trait; 6th vs 6.5th drift; optimizeOne only` | QUEUED-RESEARCH | snapshot-until-2-weeks rule; [2P] tags; stability gates |
| c09/working/c09-deep-d06.md | BS-1..BS-14 systems (store, sensitivity, trust, scheme, trench, splits, kill-list, gates, grader, guards) | program build list | `per-system gates as stated` | QUEUED-BUILDABLE | STAGED sensitivity flips PARKED on sourcing; kill-list append-only |
| c09/working/c09-deep-d06.md | OL→scheme→QB typed-context ordering with residual-first intake + version stamps | integration order | `Trench→Scheme→QBContext; corrector-first` | QUEUED-BUILDABLE | ordering dependency + contracts + calibration wiring order |

## c09/working/c09-deep-r01.md (r00–r06: EHCP/cluster/calibration/GLMM/flexBART/CAMS/nested/Sarmanov/phantom/Elo/KRC/UQ/mediation/crossover/injury)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-r01.md | EHCP is the missing process grade for QB matrix (timing dominates reads) | BART completion + timing | `26.8% vs 13.2%; separation-at-throw 0.08%` | QUEUED-BUILDABLE | build S1 QB Decision Grade + EHEPA ρ+0.05 gate |
| c09/working/c09-deep-r01.md | Game-clustered bootstrap + calibration doctrine + GLMM joints + flexBART verified | four-method audit | `56%; 42%–296%; 22.2% vs 62.5%; 0232 p-values` | DUPLICATE | same claims as verified-claims §2 + d01 rows |
| c09/working/c09-deep-r01.md | CAMS atomicity + nested scoring + Sarmanov dependence + phantom/KRC/Elo verified | theory/rating audit | `I-atomic; β₃; −0.263…−0.395 vs −0.08 floor; δ 100×` | QUEUED-BUILDABLE | build S2/S4/S5/S6/S13/S15–S17; three-way rating bake-off |
| c09/working/c09-deep-r01.md | UQ benchmark + mediation + crossover + GLMF + injury + tennis/GP/GARCH/PCA/MFM verified | method audit | `MIS 179.96; G-misspec fatal; 76% matchup-missing; 0098 RR set` | QUEUED-BUILDABLE | build S7/S8/S10/S11/S12/S16/S18; Katz recency vs KRC vs phantom bake-off |
| c09/working/c09-deep-r01.md | Trust-signal legal spec (AIRWAVE paraphrase-only) + pipeline meta-build verified | intake + metasystem | `APPROVED + (OWNED/PUBLIC/LICENSED); typed contracts + citation stage` | QUEUED-BUILDABLE | build S19/S20; SiriusXM listen-only; dedup before ledger |
| c09/working/c09-deep-r01.md | +69.86% overstatement + 0533-null-in-significance + 0423-thin-lift + 0493-weak + tuning-split + KRC-luck + N=2-theory + soccer-models + form-posteriors + narrative-selection + in-sample-R² + descriptive-archetypes + analogy-mapping + small-test + vendor-n59 + honesty-fails + headline-systems + unmeasured-CoachAI + weak-REJECTs enumerated | challenge catalog | `per-item as stated` | QUEUED-RESEARCH | pointers stay pointers; ports need pre-registered interaction sets + bake-offs |

## c09/working/c09-deep-r02.md (r07–r13: ratings/ensembles/sizing/calibration/abstention/markets/vision)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-r02.md | Mn-Dirichlet/JOI/Elo-MMR/transfer/HFA/SyncRank/Foulley/TVC verified as stated | ratings floors audit | `Brier −0.01 p=0.04; 18% JOI; 6.8× runtime; 3.00 exact; 0.921 MSFE/EW` | QUEUED-BUILDABLE | build S1–S5 rating spine; volatility-farming audit; 6-week prior half-life |
| c09/working/c09-deep-d02.md | 1172/1162/1182/1559 puzzle/peer/Gibbs/BOA verified; 1172-lasso does not exist | combination audit | `size 0.0000–0.0004; 0.221 vs 0.290; ≥40 preds needed` | QUEUED-BUILDABLE | build S6–S9 combiners under S7 one-step constitution; EW baseline |
| c09/working/c09-deep-r02.md | 1212/1222/1232/0964/1060 sizing verified; 0964 independence is optimistic bound | portfolio audit | `μ/(μ²+σ²); 41.9% vs 89.8% DD; ~100 positions` | QUEUED-BUILDABLE | build S13–S17 sizer/monitor/entropy; correlation matrix realistic |
| c09/working/c09-deep-r02.md | GP-PIT/M4/GEFCom/0715/SPTD verified; HS must inherit clustering (unaddressed gap) | calibration audit | `FAM≥2.0; 11/12 at 200× cheaper; ε_rank bound` | QUEUED-BUILDABLE | build S10–S12; game-clustered residuals required |
| c09/working/c09-deep-d02.md | DAC/CARL/1152-FNR/1511/0645/1102/1112/Hi-CI/chain/CFSC/SPRINT/phase verified | abstention/market/vision audit | `≤25% DAC; FNR 42% elevated; α 0.62435; LR 10^19/10^30` | QUEUED-BUILDABLE | build S18–S22/S27–S28; copy rule + anomaly validation set |
| c09/working/c09-deep-r02.md | 1092/1192/1202/1549/1571 REJECTs verified; 1142/0645-count/0624-best rows flagged | verdict audit | `per-item as stated` | NOT-APPLICABLE | correctly rejected; qualitative rankings are priors |
| c09/working/c09-deep-r02.md | Abstention stack + combiner honesty + calibration chain + sizing completion + decay trilemma + Dirichlet spine + chemistry→DFS + observability + vision + market stack composed | integration compositions | `0693→0715→1008; 1212→1222→1232; S5 cheapest/S3 safest` | QUEUED-BUILDABLE | pipeline order availability→trust→ratings→calibration→sizing→no-bet with loop-closing regime flag |
| c09/working/c09-deep-r02.md | Would-bet / paper-trade / not-yet triage + 1172-invalidation + EIG-LS-tie + prior-decay + strawman-49% flagged | bet-test audit | `1050/1172/1222/1525/1082 bet; 1112/1142 not yet` | QUEUED-RESEARCH | fixed-effects HFA cheapest win; recheck DM/White verdicts program-wide |

## c09/working/c09-deep-r03.md (r14–r19: uncertainty/sizing/venue/synthetic/causal/mining/policy/video/margins)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-r03.md | QOOB+ACI+AC-RAC uncertainty pipeline assembles end-to-end with published-interval audit | nested conformal composition | `≤90% width at ±2pp; γ=0.005; 0.21–0.35%` | QUEUED-BUILDABLE | build S1–S3; flip ENABLED after gate; err_t on published |
| c09/working/c09-deep-r03.md | 1630 generalized Kelly extends chain with finite-horizon lattice + (1+w/g) inflation | binomial lattice | `.659 vs .2; cap 2×; horizon 17 weeks` | QUEUED-BUILDABLE | build S5 downstream of δ/σ; never on unfiltered p |
| c09/working/c09-deep-r03.md | AC-RAC replaces dead confidence pipeline with per-action certificate | max-min conformal actions | `2.72% action-2 selection; FDR 0.699 wide sets` | QUEUED-BUILDABLE | utility = realized profit; discretize stakes; backtest certificate |
| c09/working/c09-deep-r03.md | Soft-global vs 0791 tension resolved by tuning γ on decision metric with EW default | combination protocol | `MSFE/EW ≈0.921; EW until more data` | QUEUED-BUILDABLE | build S4 with 2020 negative control |
| c09/working/c09-deep-r03.md | Venue/weather three-stage build cheapest-falsifiable-first (density → GLMM → compositional) | physics + elsewhere + scaffold | `0.02s / 0.1+s; ≥0.3pt RMSE; ≥2% tail CV` | QUEUED-BUILDABLE | build S7; gate (a) on NGS top-speed sign |
| c09/working/c09-deep-r03.md | One-bake-off rule for Diff-MTS vs Diffuser vs TabDDPM (overlap risk) | generative audit | `0.611 vs 0.904; rank 1.62/1.73; 15-vs-16 count flag` | QUEUED-RESEARCH | map primitives to exactly one lane before building |
| c09/working/c09-deep-r03.md | PCMCI+ → NoCurl causal pruning pipeline with sufficiency/stationarity risks | discovery composition | `Brier within 0.002 at ≤60%; ≥10× speedup` | QUEUED-BUILDABLE | build S8; sliding-window regime extension is INFERENCE |
| c09/working/c09-deep-r03.md | AutoAlpha mines residual-corrector candidates with decision-metric filter | hierarchical GP + QD | `434 vs 35 vs 0 at IC>0.05; PCA>0.9 kill` | QUEUED-BUILDABLE | build S14; mined formulas enter frozen-residual path only |
| c09/working/c09-deep-r03.md | SHARP rubric governs scalarizer gates + discovery with A2-constraint evidence | auditable policy triad | `+0.6/+0.09 → +20.9/+1.83; −27.3% brittle arm` | QUEUED-BUILDABLE | build S12 with ≥60% attribution precision gate |
| c09/working/c09-deep-r03.md | TimeSoccer-MoFA + taxonomy + Lag-Llama-t + RB-CQL-weak + liquidity-disagreement + fix-ml/RealMLP-joint verified | video/margin/policy audit | `P@0.3 17.0; 0.48→0.99 D1; ν_t Student-t` | QUEUED-BUILDABLE | build S9/S10/S11/S15/S16/S17; bake Student-t vs quantiles |
| c09/working/c09-deep-r03.md | 1617/2062/2090/2046/1630/1676/2031/1605/1701/1711/2142/2152/1973/2125/1929/2011/1991/1946/2072/1963/1663/1911/1689 challenge catalog + INFERENCE list | method audit | `per-item as stated` | QUEUED-RESEARCH | theory-only and vendor-benchmark items stay sketches with backtest gates |

## c09/working/c09-deep-r04.md (r22–r29: gateway/patent/fable/crosswalk/calibration/rankings)

| file | claim (1 line) | method | numeric gate | disposition | repo evidence |
|---|---|---|---|---|---|
| c09/working/c09-deep-r04.md | AI Gateway pilot + patent FTO + uncertainty triad + forensic fixture + clean-rooms verified | infra/audit docs | `0% markup; 70%/5–6σ; 1−max(p); 0.11 delta; k≥50/100/25` | QUEUED-BUILDABLE | build cost pilot (#8) + film pipeline (#6); FTO review gates build |
| c09/working/c09-deep-r04.md | Calibration RED five-way corroborated (stale) + Murphy + OGD + floors + honesty + crosswalk verified | ops docs | `0.275/0.112/0.002; Beta-map 120; 25/100; MahoPa00 strings` | IMPLEMENTED | wt-intel `docs/ops/` (MASTER_PROMPT_V2, PLATT_AND_BRIER_DECOMP, SLIDING_WINDOW_OGD, PUBLIC_HONESTY_DEMO_SCRIPT era, NFLVERSE_GSIS_CROSSWALK) verified present |
| c09/working/c09-deep-r04.md | Rankings QUEUED behind Phase gates with no-fork rule + snapshot schema + Hold floor | program audit | `Phase 1/4/9; 9.2 Hold; {season,week,hashes,version}` | QUEUED-BUILDABLE | build #7 rankings engine; FantasyPros/FFA benchmarks second-hand priors |
| c09/working/c09-deep-r04.md | PROVE_EDGE two caps + stale triple + FP-framing + FFA + Vercel-mix + FTO-limits + demo-era + snapshots flagged | claim audit | `53–55% vs 52–56%; Aug vintage` | QUEUED-RESEARCH | adopt one cap; refresh constants; measured-spend pilot gate |
| c09/working/c09-deep-r04.md | Triage + disagreement + ledger + OGD-detector + crosswalk + film + rankings + cost-pilot systems | build list #1–8 | `≥2× top-decile error; deterministic fixtures` | QUEUED-BUILDABLE | outer honesty contract + dependency ordering for API |

---

## TOTALS (rows per disposition)

| Disposition | Rows |
|---|---|
| IMPLEMENTED | 30 |
| IMPLEMENTED-CALIB-BOUNDARY | 0 (ensemble dirs identical across checkouts; `packages/verifier/` absent in both — no boundary-only delta found at listed level) |
| QUEUED-BUILDABLE | 116 |
| QUEUED-RESEARCH | 46 |
| NOT-APPLICABLE | 12 |
| DUPLICATE | 57 |
| CONTRADICTS-DOCTRINE | 6 |
| **Total rows** | **267** |

## FILES READ

27 of 27 partition files read completely, 0 unreadable:
c07 (4): buildable-systems.md, challenges.md, syntheses.md, verified-claims.md.
c08 (9): buildable-systems.md, challenges.md, laneA-calibration.md, laneB-adversarial.md, laneC-fusion.md, laneD-governance.md, laneE-features.md, syntheses.md, verified-claims.md.
c09 (14): buildable-systems.md, challenges.md, syntheses.md, verified-claims.md, working/c09-deep-d01..d06.md (6), working/c09-deep-r01..r04.md (4).
No file yielded 0 rows. File checks were read-only directory/file listings on both checkouts; no git commands run. Vendor-checkout doc paths cited by the lanes were not re-listed in this pass (noted per-row); IMPLEMENTED was reserved for paths confirmed present in `Sports-wt-intel` listings above.

## 5 highest-leverage QUEUED-BUILDABLE items, ranked

1. **SYS-1 correlated-thesis machinery (c08)** — the funnel killer: Channel-A chain overlap shippable on the trace today (OR/n_eff pure function, TNF n_eff ≈ 1.1–1.5 → KILL), then implement the missing ICI (the actual 0.48-Sharpe method), then replace 2209/2010 scaffolding with real FGL and local-linear+reflection+gSCAD. Stops four-receipts-one-bet overstatement at the card level.
2. **Scalarizer activation gate + byte-for-byte DARK reproduction (c09 0.3 / d06 BS-8)** — verbatim spec (`|r|≥0.08 AND |slope|>se`, only g=0 LIVE) with three documented DARKs as the regression suite. Cheapest falsifiable promotion gate; every signal module enters through it.
3. **SYS-2 per-market abstention gate, 1776×1151 combined (c08)** — one implementation, one walk-forward test (`≥15%` less abstention, all classes under cap), additive-only, logged-seed tie-breaking, caps re-derived in unit-loss terms. Directly governs what reaches the card.
4. **δ/σ staking gate, single merged version (c09 1.6 / 1748)** — stake iff `δ_perc > 1.5σ`, scale Kelly by `Φ(δ/σ)`, re-derived for decimal odds, upstream of all Kelly variants. Converts the calibration crisis (RES≈0) into an enforceable sizing filter.
5. **SYS-9 resolution-first promotion gate (c08)** — grouping-loss lower bound + CORP DSC−MCB CI + MI-probe leak detection replace ECE/Brier-only gates (`95% CI DSC−MCB ≤0 → do not promote`). Stops dead-but-honest models (ECE 0.0044, MI p=0.060) from ever passing a publish gate.
