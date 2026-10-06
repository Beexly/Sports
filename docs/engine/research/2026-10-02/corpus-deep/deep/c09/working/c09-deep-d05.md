# Deep analysis d05 — c09-d24..d29

**Analyst:** deep-research analyst, coordinator c09, Phase 2
**Chunk:** 40 briefs across c09-d24 (DFS/engine research), c09-d25 (engine spec, HF infra, Fable, fantasy index), c09-d26 (governance, gse ops, innovation snapshot), c09-d27 (intelligence doctrine, QA, market gravity, playbooks), c09-d28 (calibration ops), c09-d29 (ops archives, honesty measurements)
**Slice map reference:** `~/workspace/corpus-intelligence/maps/c09-map.md` (top-20 findings #2, #12, #13, #16; patterns: calibration-over-accuracy, rule-shape contract, calibration pipeline, intelligence wiring order)
**Character of this chunk:** one football-substance goldmine (d24 full-tables trust splits), one killed-theory lab report (WPA²), one master wiring contract (total-signal spec), and ~30 ops/governance/calibration doctrine files that collectively form the engine's most honest measurement cluster in the corpus.

---

## Verified claims

Every number below was checked against the vendor source, read-only. `source:line` is `docs/<path>:<line>` under `~/workspace/vendor/Sports/docs/`.

**QB/coverage trust splits (dfs/research/2026-09-27/full-tables/README.md)**
- Baker Mayfield vs blitz since last season: 5.42 YPA (31st of 31), 71.1 passer rating (29th), 3.92 ANY/A (T-29th), 22.4% Off Target% (30th), 0.34 FP/DB (T-28th); Vikings blitzed at league-high 73.9% of dropbacks this season — `dfs/research/2026-09-27/full-tables/README.md:18` — VERIFIED
- Brock Purdy vs zone since last season: 8.71 YPA (4th of 39), 8.8% CPOE (4th), 0.47 FP/DB (3rd); Cardinals 8th-highest zone rate (83.9%) — `dfs/research/2026-09-27/full-tables/README.md:20` — VERIFIED
- Garrett Wilson vs blitz since last season: 41.6% target share (1st of 93), 0.37 TPRR (2nd), 53.8% 1st Read% (1st), 44.7% of team yards (2nd); Lions 2nd-highest blitz rate (51.5%) — `dfs/research/2026-09-27/full-tables/README.md:19` — VERIFIED
- JSN vs coverages last 2 seasons: Cover 4 — 0.47 TPRR / 5.89 YPRR / 58.7% first-read (1st of 91); two-high 0.35 / 4.07 / 46.5% (top 2 of 139); Commanders highest two-high rate (78.3%) — `dfs/research/2026-09-27/full-tables/README.md:17` — VERIFIED
- Ladd McConkey ON/OFF: Chargers +0.23 EPA/dropback (6th) with him, −0.67 (31st) without; source is a TEXT-ONLY X post from @PrysmSports, no chart, no data-source line; duplicates ~4h earlier from @PlayBracco and @SleeperNFL — `dfs/research/2026-09-27/full-tables/README.md:10` — VERIFIED as transcription; underlying numbers UNVERIFIED (no methodology given)
- Success rate definition used by the thread's author: "offensive snap with EPA > 0" — brief states it; tables are verbatim X transcriptions with author-defined metrics throughout. All rank denominators (31st of 31, 1st of 93, 1st of 91, top 2 of 139) are the authors' universes, not audited.

**WPA² symbolic-regression kill (engine/research/2026-09-13/symbolic-regression/REPORT_WPA2.md)**
- All 6 GP configs (3 seeds × W1/W2) plus the 3000-pop × 150-gen supplementary run collapsed to constants; best W1 `log(log(-2.719))` = 0.0003, test R² = −0.0787 (95% CI [−0.0817, −0.0759]) — `REPORT_WPA2.md:37` — VERIFIED
- HGB reaches test R² = 0.2129 (W1) / 0.2188 (W2) on wpa² from pre-snap state — `REPORT_WPA2.md:71` — VERIFIED
- `down` is the best single pre-snap correlate of wpa² (+0.21); `quarter_seconds_remaining` −0.044 — `REPORT_WPA2.md:72` — VERIFIED
- GLI-0.1 (DeepSeek's formula) first measured execution: R² = 0.0037 vs claimed 0.112/0.079 — `REPORT_WPA2.md:83` and `:136` — VERIFIED
- Diagnosis: generation-0 fitness already implies R² ≈ 0.63 on the 25k training subsample (impossible vs HGB cap 0.21) — heavy-tail overfitting attractor, recommended fix Huberized fitness or tail trimming — brief reports this; method diagnosis is the author's, not independently re-run.

**Total-signal wiring spec (engine/research/2026-09-27/total-signal-wiring-spec.md)**
- `game_signals`: 5,142 rows — `total-signal-wiring-spec.md:29` — VERIFIED
- Player-level `signals` table: **0 rows** — "The prop pipeline has no fuel" — `total-signal-wiring-spec.md:38`, repeated at `:94` — VERIFIED
- Rule shape: TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG; magnitudes are calibration tasks solved by backtest — brief-verified, no numbers set in spec (correctly)
- Build order: lock projection source → register live DFS slate provider → adjustment layer v1 → fill player signals → off-field intake → backtest every rule — `total-signal-wiring-spec.md:89` — VERIFIED
- 7 rule families (OL injuries: LT/C out → QB efficiency down / RB ybc down / checkdown share up / pass rate down; secondary injuries; EDGE-out → time-to-throw; depth-chart movement; weather; game script; off-field proxies) — brief's enumeration; "7 families" phrasing is the brief's, source uses numbered rule sections (`total-signal-wiring-spec.md:55,64`) — VERIFIED as content, "families" label is BRIEF WORDING

**DFS Week 3 optimizer (dfs/research/2026-09-25/dfs-week3/REPORT.md)**
- Repair delta: double-stack 4 → 41; TE-in-FLEX 38 → 0; 41 repaired; final portfolio after repair+dedup = 18 GPP + 17 leverage + 1 single-best (36 lineups) — `REPORT.md:8,9` — VERIFIED (41 was pre-dedup engine output; 36 is the final portfolio)
- Leverage-batch core bet: Dak Prescott 9/17 lineups at $6,700 / 22.6 proj / 5.0% proxy ownership — brief-verified
- Ownership figures are explicitly PROXY, "LOCAL ONLY," not public Sun–Mon ownership — `REPORT.md` header — VERIFIED (honest labeling)
- "Leverage" metric formula not stated in source — brief correctly notes this

**ethandojo handoff (dfs/research/2026-09-25/youtube-builder-research/handoff-ethandojo-nfl-builds-2026-09-25.md)**
- Posted record: Week 1 10-6, Week 2 11-5 (2026 season); Week 3 picks posted 2026-09-24 — `handoff-ethandojo-nfl-builds-2026-09-25.md:14` — VERIFIED as his claimed caption record; spreads/moneyline detail not captured, weekly pick images unparsed — track record is CLAIMED-BY-SUBJECT, UNVERIFIED
- No public repo found (web search 2026-09-25); exact features/hyperparameters unknown; recipe is a spec to implement and beat, not a clone — `handoff-ethandojo-nfl-builds-2026-09-25.md:17` — VERIFIED (honest gap-flagging)
- XGBoost on NFLverse 2018–present; features QB efficiency, explosive play rate, turnover margin, pass rush, recent point differential, player availability, roster-change adjustments; 10,000-iteration Monte Carlo season sims — brief-verified as his stated recipe
- NFC West example output: Seahawks 12-5 (88%), Rams 11-6 (85%), 49ers 10-7 (70%), Cardinals 6-11 (4%) — brief-verified

**Market Gravity index (models/market-gravity-index-proposal.md)**
- Gravity G = 1 − (D_late / D_early), clamped to [−1, 1]; D = mean |book_fair_i − consensus_fair| at earliest/latest quotes — `market-gravity-index-proposal.md:22` — VERIFIED
- Null guards: <2 books or <2 distinct snapshot times → null; D_early < 0.25 pp → null (never render 0) — brief-verified
- Stated weaknesses (convergence ≠ correctness; book-composition bias; capture-window bounded) — brief-verified, honest scoping

**Calibration / honesty measurements**
- First honest measurement: 1999-2025 REG, 6,967 games, 15,939 settled picks, 0 lookahead errors; SPREAD −6.53% ROI · TOTAL −5.44% · MONEYLINE −1.96% · overall −5.48% per unit staked; 52.70% blended win rate is an artifact of averaging differently-priced markets — `ops/HERMES_ALL_NIGHT_2026-09-04.md:56` — VERIFIED
- Confidence AUC 0.4965, p=0.41 on 13,646 picks; live resolution 0.005 on 1,663 graded picks; 152 graded picks at ≥80 confidence, 61 wins (40%) — inverted — `HERMES_ALL_NIGHT_2026-09-04.md:60,282,286,289,304` — VERIFIED
- Corpus-poisoning bug PR #695: nflverse `spread_line` is positive = home favored; repo had used negative = home favored; every pre-#695 SPREAD backfill pick was on the wrong team; all pre-#695 measurements declared void — `HERMES_ALL_NIGHT_2026-09-04.md:52,54` — VERIFIED
- 11 market slices tested, 0 cleared break-even on the Wilson lower bound; CLV/Edge Index/grade ladder/consensus/depth UNTESTED-not-disproven (replay prices both sides at −110) — brief-verified
- Calibration map rule: `CALIBRATION_ADJUSTMENTS_ENABLED` stays false; "Maps fix REL/NLL, not RES"; if bestByLogLoss improves but RES ≈ 0 → do not apply, raise ranking first — `ops/ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md:3,30` — VERIFIED
- MAP Platt: `sigmoid(A·logit(p)+B)` with Gaussian priors; bake-off gate: must beat Raw/Temperature/Platt/isotonic on time-holdout Brier/ECE + Murphy reliability before activation; founder policy required — `ops/BAYESIAN_CALIBRATION_R_AND_D.md:13,20,83` (priors A~N(1,1), B~N(0,1) at `:83`) — VERIFIED
- PROVEN floor: Brier ≤ 0.22 with 3× GREEN (open); independent trueProb coverage ≫ 0% (recorded ~65% ML/SPREAD); live p eligibility v5.2.6 with shrink α=0.88 + market-anchored blend — `ops/CLOSEOUT_TRACKS_A_B_C_D.md:11,13,17` — VERIFIED
- Drift detection: 0.02 absolute Brier delta over 30 days — `launch-qa-addendum.md:177` — VERIFIED
- `CALIBRATION_AUTO_APPLY=false` is a MUST in production env — `launch-qa-addendum.md:87` — VERIFIED
- Public gates: 100-settled-pick threshold for `PERFORMANCE_STATS_ENABLED=true` — `operator-playbook.md:24,49` — VERIFIED; 30 settled picks per model version for performance stats in Sports OS doctrine — `intelligence/product-ecosystem.md:65` — VERIFIED (layered gates: 30 per-version, 100 for the public page; not a contradiction)
- Settlement crisis snapshot 2026-08-06: 139/1478 PENDING overdue, flagged CRITICAL; LIVE_BOARD off until settlement HEALTHY + proof bar — `ops/FINAL_AUDIT_2026-08-06.md:15,36` — VERIFIED (stale snapshot; resolution status not visible in-chunk)

**Ops plumbing**
- 22 scheduled routes in `apps/web/vercel.json`; cadences: refresh-odds 15 min, signal slate 4×/hr, settle-picks hourly — `ops/CRON_MATRIX.generated.md:33` — VERIFIED
- Toxiproxy chaos plan: fail-closed assertions — no fabricated prices on upstream fail, `fetchedAt` frozen on hard fail, circuit on repeated 402, LIVE_BOARD stays off — `gse/TOXIPROXY_FAILURE_INJECTION_MAX.md:3,29,30` — VERIFIED
- Free-mode health: `recordFreeIngestionRun()` shared helper (`apps/web/lib/data-sources/free-ingestion-run.ts`); health = recent SUCCESS IngestionRun row, not odds rows — `ops/FREE_MODE_INGESTION_HEALTH.md:24` — VERIFIED
- Keystone backtest in 2026-06-24 integration record: 18,344 OOS, model MAE 5.3087 vs naive 4.9064, beats-naive = false, priced=false (shadow) — `ops/archive/prompts/INTEGRATION_LAUNCH_2026-06-24.md:39` — VERIFIED but SUPERSEDED (predates PR #695 spread-polarity fix; brief correctly flags this)
- Agent coordination: main green at `a060f57d`, 11,493 tests passing; NB2 property test Var = μ + μ²/φ with empirical VMR ≈ 2.15 at league mean (the test that would have caught φ=12); project research has measured ~37% defect rate in unverified assertions — `ops/AGENT-COORDINATION.md:84,157` — VERIFIED
- PR3 TLA+ runbook: 21 reachable states, 8/8 sacred invariants hold, exit 0 GREEN; validation typecheck 0, lint 0, waitlist 49/49, guardrails 6/6 — `gse/owner-decision-packet.md:19,86,89` — VERIFIED
- Finish-line branch merged as PR #57 (`6084550c`); `/api/performance` returning 397 settled picks at capture — `gse/finish-line-branch-status.md:1` — VERIFIED (historical)
- Market Twin (2026-05-22 snapshot): next-7-day games classified READY_TO_SCORE / WATCH_ONLY / CONFLICT / QUIET — `innovation-os-current-state.md:51` — VERIFIED
- HF infra (live-verified 2026-09-28): Beexly account `isPro: true`, `canPay: true`, prepaid, **`orgs: []` — no Beexly org exists** — `engine/research/2026-09-28/hf-leverage-round2/laneC-platform.md:13,14` — VERIFIED
- Sports OS: 15 ecosystem components, dependency-ordered; Market Gravity component inputs: opening line, current line, movement size/speed, book disagreement, news timing, injury correlation, public/liquidity proxies, model disagreement, historical closing movement, volatility — `intelligence/product-ecosystem.md:11,278` — VERIFIED
- Integration sprint S0–S7: S0 truth/identity/rights freeze → S1 slate plane → S2 point-in-time feature store → S3 model-owned projections → S4 calibration → S5 contest decision engine → S6 shadow signals → S7 reliability; S5's optimizer "consumes distributions and covariance, not static proj/ceiling/ownership constants" — `engine/research/2026-09-24/integration-sprint-S0-S7.md:119,196` — VERIFIED
- EU AI Act pack: honest working note (2026-07-23), zero-items pack is "correct behavior, not a bug" — `governance/EU_AI_ACT_EVIDENCE_PACK.md:3,81` — VERIFIED
- Five red-team flags on the Fable build (typecheck failure, untracked scratch, non-live fixture demo, no end-user route for evidence ledger, no full OneNote extractor) — `fable/red-team/TECHNICAL_RED_FLAGS.md` — VERIFIED (5 bullets)
- Golden path restraint copy: "Galaxy declines more games than it publishes. No edge, no pick — that is the process, not a gap." — `ops/GOLDEN_PATH_PROOF.md:35` — VERIFIED

**FLAGGED / corrected brief details**
- The dfs-week3 brief header says "36 lineups"; source says 41 engine-output lineups but "Final portfolio after repair+dedup: 18 + 17 + 1" = 36. Brief's 36 refers to the final portfolio — consistent once dedup is accounted for; the brief's repair-delta line (4→41) uses pre-dedup counts. No contradiction, but the two bases (pre-dedup vs final) should be labeled.
- The total-signal brief's "7 adjustment-rule families" — the source uses numbered rule sections, not the word "family"; content verified, label is the brief's.
- The launch-qa brief's "settled-pick gate = 100" is a cross-ref to operator-playbook (verified there at `:24`), not text in launch-qa-addendum.md itself. Attributed correctly in the brief.
- The integration-sprint brief is correct that S3/S5/S6 "specify where QB behavioral features plug in" — the source does specify slots (joint team latents for teammate correlation, shadow-mode intake for off-field/behavioral), but no football-specific feature definitions exist there. The plug-in points are architectural, not football-substantive.

---

## Cross-file connections

**The calibration doctrine arc (d27 → d28 → d29, the chunk's strongest through-line)**
- `launch-qa-addendum.md` (d27) sets the plumbing: Brier buckets, 0.02/30-day drift, reliability diagrams, factor shadow→activation lifecycle, `CALIBRATION_AUTO_APPLY=false`.
- `BAYESIAN_CALIBRATION_R_AND_D.md` (d28) sets the selector: smooth-rescale → MAP Platt IRLS with A~N(1,1)/B~N(0,1) priors; bake-off must beat all baselines on time-holdout Brier/ECE before any map flips on.
- `CLOSEOUT_TRACKS_A_B_C_D.md` (d28) sets the floors: Brier ≤ 0.22 GREEN×3, α=0.88 shrink + market-anchored blend as the recorded live-p recipe.
- `HERMES_ALL_NIGHT_2026-09-04.md` (d29) supplies the wound: confidence resolution 0.005, AUC 0.4965 — which is exactly why…
- `ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md` (d29) supplies the law: maps stay OFF while RES ≈ 0.
- Connection to slice map: corroborates map finding #12 (calibration-over-accuracy) and #13 (confidence has ~zero resolution) with in-chunk mechanics. **Buildable as one calibration subsystem** (see Buildable systems).

**Market Gravity: proposal meets its component home**
- `models/market-gravity-index-proposal.md` (d27) gives the GSE-specific math (G = 1 − D_late/D_early) for the Market Gravity component that `intelligence/product-ecosystem.md` (d27) lists as Component 9 with 12 named inputs. The proposal is the concrete implementation of the doctrine component — the missing link between "we should have a market-pressure index" and a shippable pure function. Also reinforces the map's #16 (CL1–CL9 closing-line forecaster) as adjacent market-signal machinery: gravity measures convergence, CL5's decision features (drift, velocity/hr, book dispersion) measure trajectory.

**Total-signal spec ↔ scalarizer contract (map d34) ↔ integration sprint**
- The total-signal spec's TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG rule shape (d25) is the QB-coaching-scheme-side realization of the rule-shape contract in the map's pattern #6 ("rule-shape contract (d25) + scalarizer (d34) → adjustment layer intake"). The scalarizer's activation gate (f1 = |r| ≥ 0.08 AND |slope| > se on true holdout, map #18) is the acceptance criterion the spec's "a rule that can't prove itself in backtest doesn't ship" needs. These compose directly.
- The spec's 6-step build order (lock source → live slate → adjustment v1 → fill signals → off-field → backtest) agrees with the S0–S7 sprint's "no more signal breadth until identity, point-in-time, and evaluation receipts are real." Two independent orderings, same wire-first doctrine (Garrett's standing WIRE-FIRST SEQUENCING, 2026-09-30).

**QB-behavioral cluster (d24) feeds the adjustment layer (d25)**
- full-tables trust splits are exactly the per-matchup features the total-signal rules need: Mayfield-vs-blitz collapse × Vikings-73.9%-blitz is a TRIGGER→AFFECTED pair already instantiated (opposing-coordinator tendency → QB efficiency). Wilson's 53.8% 1st Read% vs blitz and JSN's 58.7% Cover-4 first-read give the depth-chart movement rules (rule family 4) their target-concentration quantities.
- The ethandojo recipe (QB efficiency as primary feature, roster-change adjustments) independently corroborates the same QB-first feature ordering.
- The wpa2 kill supplies the leverage layer: `down` (+0.21) and time (−0.044) are verified pre-snap leverage features for the win-probability module that every QB decision ultimately feeds.

**The optimizer contradiction: dfs-week3 (d24) vs integration-sprint S5 (d24)**
- The real optimizer in the Week 3 report consumes static proj/ceiling/proxy-ownership constants — and its own run exposed raw-output failure modes (38 TE-FLEX violations needing repair).
- S5 in the same subdirectory demands the opposite architecture: "Simulation-based optimizer that consumes distributions and covariance, not static proj/ceiling/ownership constants," with ownership modeled separately and time-sliced.
- This is an explicit build delta, not a contradiction in doctrine: the current surface is the legacy architecture S5 is designed to replace. The 4→41 repair metric becomes the regression floor for the distributional rebuild.

**"Target share alone is lying" vs the trust-split tables — tension, resolved by feature choice**
- `media/CONTENT_PILLAR_MAP.md` (d27) Player Signal Lab doctrine: target share is a misleading metric; role over box score.
- The full-tables trust splits (d24) lean on target share (Wilson 41.6% 1st-of-93) alongside TPRR and 1st Read%.
- Resolution: the corpus itself supplies the fix — use **shell-conditioned 1st Read% and TPRR** (the JSN/Wilson vs-blitz and vs-Cover-4 numbers), not raw target share, as the trust features. Doctrine and data agree once the metric is conditioned on situation.

**Readiness-gating invented twice**
- `innovation-os-current-state.md` (d26, 2026-05-22): Market Twin's READY_TO_SCORE / WATCH_ONLY / CONFLICT / QUIET game-posture classification.
- `launch-qa-addendum.md` (d27): factor activation states shadow | activated | archived with the shadow-leak test.
- Same pattern (state-gated readiness), two surfaces; the Market Twin version predates the shadow-lifecycle by months and both survive in-repo. Consolidate rather than duplicate.

**Trust-signal intake still ~zero — the map's gap #1 holds in this chunk**
- Nothing in d24–d29 mines quotes, pressers, or social for QB–receiver trust dynamics. The closest in-chunk trust proxies are the quantitative 1st Read%/TPRR splits (d24) — behavioral, not verbal. The Rodgers-video lesson (Oct 1, per memory) has no corpus counterpart here either.

**Ownership/identity notes**
- fantasy/README.md and fantasy/research/README.md (d25, d26) are pure filing conventions — evidence of corpus hygiene (dated-folder rule), not intelligence.
- Fable files (d25): micro-gain protocol (process), publication path (ops log, gh not authenticated), red-team flags (fixture demo not live, scratch files) — all echo the wider mock-vs-live failure theme; no engine content.
- `ops/GOLDEN_PATH_PROOF.md` (d29) restraint copy and `intelligence/product-ecosystem.md` 30-pick claim gates and the Loss Autopsy content pillar form the honest-publication doctrine cluster — consistent with the claim-governance stance.

---

## Challenges

**Weak methods / second-hand claims**
1. **full-tables is transcription, not measurement.** Every headline split is a verbatim X-post transcription; author definitions are sometimes given ("offensive snap with EPA > 0") and often not; several charts have no data-source lines at all; the McConkey +0.23/−0.67 stat comes from a TEXT-ONLY post with no chart, duplicated across three accounts (~4h apart, earliest @PrysmSports) — a classic circular-amplification chain. INFERENCE: the transcriptions are accurate (verified), the underlying numbers are UNVERIFIED. Treat these as *feature ideas with candidate values*, not engine inputs, until recomputed from nflverse or charted sources.
2. **Rank denominators are author universes.** "31st of 31," "1st of 93," "1st of 91" are ranks inside each author's sample universe with unknown inclusion rules (min-attempts thresholds unstated). Do not treat a percentile as population-grounded.
3. **ethandojo's 21-11 is subject-claimed.** Captions say 10-6 / 11-5; spreads and moneyline detail uncaptured; weekly pick images never parsed. The recipe is reverse-engineered from videos, exact features unknown. The handoff is unusually honest about all of this — credit it — but nothing here is evidence his model works. His 10 modules are Motif's derivations (INFERENCE), not his stated architecture.
4. **The 37% internal-research defect rate** (`ops/AGENT-COORDINATION.md:157`) is itself an internal assertion about project research — unverified in-chunk, though the PR #695 episode (every SPREAD backfill on the wrong team) is a concrete exemplar of the class of defect it describes.
5. **wpa2's GLI-0.1 R² = 0.0037** is measured once, on one configuration (affine-calibrated). The kill of plain-MSE symbolic regression is well-powered (3 seeds × 2 feature sets + 3000×150 supplement + standardized-target check), but the "GP is dead here" claim is specific to gplearn/plain-MSE/heavy-tailed targets — the report itself scopes this correctly.

**Internal contradictions / tensions**
6. **The Bayesian gate may deadlock production calibration.** Production eligibility stays frequentist "until a versioned holdout bake-off wins" (d28), while the measured live system has resolution ≈ 0 (d29). INFERENCE: no bake-off can win on resolution if the underlying model has none — the honest outcome is the current one (maps OFF forever), and the doc implicitly admits this. The risk is process theater: an un-winnable gate that looks like progress. The exit is the one D7 names: calibrate the MARKET's reliability curve, not the pick model's confidence.
7. **α = 0.88 shrink + market-anchored blend is a recorded recipe, not a measured win.** CLOSEOUT lists it as the live-p eligibility recipe while the Brier ≤ 0.22 / GREEN×3 floor is still Open. The recipe is running production config, not a proven calibration.
8. **The integration-sprint's "18,344 OOS keystone"** (MAE 5.3087 vs naive 4.9064) predates the #695 polarity fix and is void — the brief flags this correctly, but any sibling analyst reading the sprint file in isolation would miss it. The only honest baseline is the post-#695 replay: −5.48% ROI.
9. **"60% confidence pick is supposed to lose 40% of the time"** (operator-playbook) is a tautology presented as doctrine — harmless, but it reveals the playbook was written when confidence was still treated as meaningful, before the d29 resolution finding.

**Would-I-bet-on-this tests**
10. **Mayfield-vs-blitz as a Week 4 input:** the matchup logic (31st-of-31 vs blitz × 73.9% MIN blitz) is the single most bettable-shaped finding in the chunk — but only after recomputing both numbers from nflverse with stated min-attempt thresholds. As transcribed: no bet. As recomputed: real candidate.
11. **Market Gravity G:** the math is sound, the null guards honest, the weaknesses stated. Would wire it as a market-disagreement feature. Would NOT bet that G < 0 divergence predicts edge direction — the proposal correctly says divergence "flags the interesting state," nothing more.
12. **The calibration bake-off:** would not bet any Bayesian map beats the frequentist baseline on holdout given resolution ≈ 0. Would bet that Brier-decomposed measurement (reliability/resolution/uncertainty) on market probabilities produces a publishable reliability curve.
13. **Pre-snap leverage (HGB R² 0.21):** would bet this replicates at R² ≥ 0.15 on 2025 holdout — the effect (down +0.21, time −0.044) is large and mechanistic.
14. **ethandojo 10-module build list:** would not bet any single module's design transfers (reverse-engineered); would bet the *feature list* (QB efficiency, explosive play rate, turnover margin, pass rush, point differential, availability, roster-change adjustment) is a sane consensus baseline for a game model.

**Staleness flags**
15. `FINAL_AUDIT_2026-08-06` (139/1478 overdue) and the 2026-06 integration/finish-line/owner-decision files are 2–4 months old; settlement health as of Oct 2026 is not visible in this chunk.
16. `innovation-os-current-state.md` is a 2026-05-22 snapshot; its Market Twin pattern was re-invented as the shadow lifecycle — consolidate.

---

## Buildable systems

**1. QB pressure/coverage interaction feature matrix**
- **Inputs:** recomputed vs-blitz / vs-pressure / vs-zone / vs-man efficiency splits per QB (candidate definitions from full-tables: Mayfield 5.42 YPA vs blitz, Purdy 8.71 YPA + 8.8% CPOE vs zone); opposing coordinator tendency rates (MIN 73.9% blitz, DET 51.5% blitz, ARI 83.9% zone, WAS 78.3% two-high).
- **Method:** per-matchup interaction = (qb_split_delta_vs_baseline) × (opp_tendency_rate); rank-vs-author-universe replaced by nflverse recomputation with min-attempt thresholds.
- **Output:** matchup-adjusted QB efficiency features for the game model + QB behavioral profile fields.
- **Gate:** walk-forward correlation with EPA/dropback residuals; activate only if |r| ≥ 0.08 AND |slope| > se on true holdout (scalarizer rule, map #18); features recomputed, never transcribed.

**2. Shell-conditioned receiver trust features (HHI / concentration)**
- **Inputs:** 1st Read% and TPRR conditioned on blitz / Cover 4 / two-high (Wilson 53.8% 1st Read% vs blitz, JSN 58.7% vs Cover 4); personnel/shell rates per defense.
- **Method:** concentration indices (target HHI) by shell; prefer 1st Read%/TPRR over raw target share per the "target share alone is lying" doctrine.
- **Output:** trust-target priors for DFS stacking and prop target projections.
- **Gate:** pre-registered 2025-season backtest; Spearman ρ gain over raw-target-share baseline; kill line set before running.

**3. Adjustment Layer v1 (total-signal rules 1–4)**
- **Inputs:** injury report (starting LT/C, S/CB1/CB2, EDGE outs), depth-chart movement (elevations, bellcow tags), nflverse-derived magnitude priors.
- **Method:** TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG; magnitudes from backtest, every adjustment logged with signal lineage.
- **Output:** logged projection adjustments with lineage receipts; player `signals` table rows (currently 0).
- **Gate:** each rule must beat no-rule on walk-forward 2023–2025; a rule that can't prove itself doesn't ship. First fill: ≥1 signal row per game with lineage.

**4. Market Gravity signal (G)**
- **Inputs:** multi-book odds snapshots (existing capture); de-vig via `packages/prediction-engine/src/market-read.ts`.
- **Method:** D_early/D_late dispersion; G = 1 − (D_late/D_early) clamped [−1,1]; null on <2 books, <2 snapshot times, or D_early < 0.25 pp; compare only books present at both ends.
- **Output:** convergence/divergence feature + watch flag when G < 0 (divergence = disagreement state).
- **Gate:** pure function + tests (converging fixture, diverging fixture, every null guard); honest null rendering (em-dash, never 0).

**5. Calibration pipeline with resolution gate**
- **Inputs:** settled picks; canonical WIN/LOSS maps; market probabilities.
- **Method:** Brier buckets + 0.02/30-day drift detection + reliability diagrams; isotonic/Platt/temperature bake-off on time-holdout; hard rule: maps OFF while resolution ≈ 0; calibrate the MARKET and publish the reliability curve; `CALIBRATION_AUTO_APPLY=false` stays.
- **Output:** calibrated probabilities + promotion eligibility; shadow→activated→archived factor lifecycle with `assertNoShadowFactorsLeaked` on every public route.
- **Gate:** Brier ≤ 0.22 GREEN×3; bake-off win over Raw/Temperature/Platt/isotonic on holdout Brier/ECE; no map ships on resolution ≈ 0.

**6. Distributional DFS optimizer (S5 rebuild)**
- **Inputs:** player outcome distributions + covariance (replacing static proj/ceiling); ownership/selection model trained time-sliced and kept separate from performance probability; contest utility (payouts, field size, duplication).
- **Method:** simulation-based optimizer consuming distributions; retain the construction-rules v2 repair harness (double-stack enforcement, TE-FLEX exclusion) as a regression floor.
- **Output:** GPP/leverage lineups; post-lock result ledger.
- **Gate:** beats the current static pipeline on 2025 large-field replay; 4→41 repair delta stays green (no repaired violation regressions).

**7. Pre-snap win-leverage features**
- **Inputs:** down, quarter_seconds_remaining, other pre-snap state (nflverse 2021–2024 schema).
- **Method:** HGB on wpa² (R² 0.2129 demonstrated); robustified target handling (Huberized fitness / rank / tail trim) for any symbolic-regression follow-up — plain-MSE GP is a dead method on heavy-tailed targets.
- **Output:** per-play leverage scores feeding the WPA module.
- **Gate:** replicate R² ≥ 0.15 on 2025 holdout; negative-result replication (GP collapse) need not be re-run.

**8. NB2 dispersion calibration for the count-process model**
- **Inputs:** settled TeamGameLog.
- **Method:** per-sport method-of-moments φ estimator (`estimate-phi.ts`, floored); property test Var = μ + μ²/φ with empirical VMR ≈ 2.15 at league mean.
- **Output:** calibrated dispersion for score simulations.
- **Gate:** the property test passes; NHL falls to Poisson automatically.

---

## Integration notes

**Unified intelligence API — ordering and contracts**
- **Compute order:** OL/injury & availability → scheme/coaching priors (coordinator tendency rates) → QB behavior (pressure/coverage splits; *PARKED* on clean-vs-pressured splits per `strategy/vision-tracker.md` — the map's #8, the intelligence program's #1 named data gap, unfilled in this chunk) → receiver trust (shell-conditioned 1st Read%/TPRR) → market layer (Gravity G, CLV referee) → calibration (resolution-gated) → sizing (δ/σ gate → Kelly stack).
- **Cross-module contracts (already specified in-chunk):**
  - Every factor carries `factorKey, source, sourceSnapshotId, freshnessSec, trustLevel, activationState` (launch-qa GameSignal schema) — the shared envelope for qb-behavior + coaching + trust-signals + reasoning.
  - Every adjustment carries TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG with signal-lineage receipt (total-signal rule shape) — the shared adjustment contract.
  - Every new signal enters shadow first; `shadow | activated | archived`, no nulls; `assertNoShadowFactorsLeaked()` in the response pipeline — the shared promotion contract.
  - Residual-correction architecture (map pattern): new signals enter as corrector features on frozen-engine residuals, never as engine inputs — preserves the calibration floors while the trust/QB layers experiment.
- **Data shapes:** per-QB behavioral vectors keyed on (qb_id, situation ∈ {blitz, pressure, zone, man, cover-4, two-high}, season_window) with min-attempt thresholds and as-of timestamps (the map's #19 as-of quarantine ruler applies — whole-season aggregates must not masquerade as point-in-time); per-team coordinator tendency vectors (blitz_rate, pressure_rate, shell_mix, two-high_rate) keyed on (team, dc_id, week); trust vectors keyed on (qb_id, receiver_id, shell) with matches-together counts (map #4 JOI: effect diminishes after ~50).
- **Public/private doctrine (HARD, from memory):** confidence breakdowns, Market Gravity, and LossRootCause autopsies are public-surface; NGS-derived anything, rule magnitudes, shadow factors, and calibration internals stay internal. The chunk's evidence-tiering (product-ecosystem tiers 1–6) and clearance-rights discipline (AGENT-COORDINATION: Kalshi fail-closed, ClubElo not-denied-on-silence) are the intake contract for every new intelligence source.
- **Calibration-state labeling across modules:** any uncalibrated signal (all trust features, all adjustment magnitudes, Market Gravity) computes in shadow with honest nulls (em-dash rendering, never 0-cosplay) until its bake-off wins — Garrett's calibration doctrine (shadow-first, never publish uncalibrated) is fully supported by this chunk's machinery.
- **What this chunk does not supply:** the trust-signal verbal layer (no presser/quote mining anywhere in d24–d29 — map gap #1 confirmed); OL beyond injury flags (continuity, run-blocking grades, pressure attribution — map gap #4 confirmed); clean-vs-pressured QB splits (PARKED — map gap #3 confirmed); OC/DC tendency time series (map gap #2 confirmed).

**Recommended handoff to parent:** the three highest-leverage builds from this chunk are (1) the QB pressure/coverage interaction matrix recomputed from nflverse (d24 feature ideas + d34 scalarizer gate), (2) Adjustment Layer v1 with the rule-shape contract (d25 spec + d27 shadow lifecycle), and (3) the calibration pipeline with the resolution gate (d27/d28/d29 arc). Everything else is plumbing that already exists or doctrine that needs no new code.
