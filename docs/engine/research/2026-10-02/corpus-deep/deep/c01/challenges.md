# c01 Deep Research — Challenges (canonical, merged across all five partitions)

Ranked by severity: **wrong numbers > contradictions > thin samples**. Where two analysts disagree, both sides are stated and the resolution is given. INFERENCE marks analyst composition, never source claims.

---

## WRONG NUMBERS

### C1. ECE has four values in one month — and the "publishable" one is the outlier (P04 §3#3)

0.112 (Aug 9 live audit, RED) → **0.0044** (Aug 19 competitive intel brief, "publishable, FTC-safe") → debiased 0.0374 (Sep 9 PROVEN pool n=380) → 0.0582 (Sep 9 deployed v5.2.7 n=258). The 0.0044 claim is two orders of magnitude below the Aug 9 measurement and predates the debiasing corrections (C-290/C-292); it is not sample-labeled. **Any public calibration claim must name its sample and estimator version.** The C-290/C-292 debiasing (max(0, raw−noise)) plus mandatory sample+estimator-version labels on any published calibration claim is the fix.

Files: `ops/WORKING_LOG_2026-08-09_WORLD_CLASS.md` · `docs/ops/edge/2026-08-19-competitive-intel-brief.md` · `ops/AGENTS-history-main-2026-09-26.md:842-843` · partition-04 §1#19, partition-05

### C2. Purdy EPA/dropback is 96th percentile, NOT 99th (P05 integrity note)

The @xEP_Network transcription reads: 80.4% completion (99th), +14.9 CPOE (99th), +0.63 EPA/dropback (**96th**), 0 sacks taken. The phrasing "99th-percentile CPOE/EPA-DB" conflates CPOE (99th) with EPA/DB (96th). Verified in source (`dfs/research/2026-09-25/full-tables/README.md:26`). Two-week sample regardless: a 99th-percentile claim on n=2 games is noise-rich display-bait, not an engine input.

Files: `dfs/research/2026-09-25/full-tables/README.md:26` · partition-05 §1#2

### C3. The 0.53–0.61 / 0.13–0.19 correlation gap is the most-cited and least-sourced number in the corpus (P04 §3#2)

"Passing efficiency vs wins corr ~0.53–0.61 vs rushing ~0.13–0.19" appears 4× in AGENTS-history as "the single most actionable number in the dossier for feature weighting" — yet carries **no cited study, no sample size, no window, no correlation target defined** (wins? future wins? at what aggregation?). The same document explicitly admits "no peer-reviewed EPA forward-validity study exists" — "v2's biggest literature gap." **Feature weights are being set on an orphan number.** Fix: source the correlation (or measure it from the lab's own filtered sample) before any weight is anchored to it.

Files: `ops/AGENTS-history-main-2026-09-26.md:1470,1548,1751,1799` · partition-04 §1#10

### C4. The TacticAI ≥5% log-loss gate is reader-invented, not the paper's (P01 §3F, P05 §1#10)

The brief's acceptance gate (≥5% holdout log-loss improvement, paired bootstrap, p<0.05) is the READER'S proposal, not the paper's. The paper (arXiv:2310.10553v2) contributes the decomposition equation and the F1 numbers (0.521→0.677, 0.712 with D₂); its domain is soccer corners with exact D₂ pitch symmetry and a random 80/20 split (mild same-match leakage). P02's ledger also carries the ≥5% gate and the mirror-doubling claim — and P02 is explicit that these are the *ledger's*, "faithful to the paper's geometry, per source." **Both sides agree on substance:** the gate is ledger/reader-side, not paper-side. The portable part is the receiver-conditional decomposition MATH; the 22-node pre-snap GATv2 on NGS data is speculative and needs its own held-out proof. Downgrade the GNN port to QUEUED.

Files: `arxiv-deep/0912-tacticai-ai-assistant-football-tactics.md` · partition-01 §3F · partition-02 §1#12 · partition-03 §1#4 · partition-05 §1#10

### C5. MinervaScore's Seal ≠ edge — the paper's own pre-registered test says scores don't predict forward returns (P03 §3)

Seal = 1[DSR≥0.95 ∧ PBO≤0.50 ∧ SPA≤0.10 ∧ T≥MinTRL ∧ ρ≥0.60] with synthetic AUROC 0.989. But the paper's own pre-registered real-market test shows **no forward relationship** (Spearman 0.013, p=0.40), and the authors' own caveat is that the score's value "remains close to the corrected DSR-alone baseline." The Seal is an **audit grade**, not an edge signal. Anyone wiring the Seal to stake sizing is making a category error; it belongs as the production-entry validation gate (plus the ledger's sports sixth gate: edge must survive residualization against closing-line movement), never as a predictor.

Files: `arxiv-deep/2048-minervascore-*.md` (arXiv:2608.23808v2) · partition-03 §1#2

### C6. ARBY and Baldwin are competitor formulas mislabeled as lab inventory (P04 §3#6)

The slice map treats ARBY (65/35 + 50/50 + 65/35 blend) and the Baldwin pass-protection composite (40/40/20 re-scaled 0–100) as the "lab metric inventory." Both are **verbatim quotes from third-party X threads** (StatRankings' @MagicSportsGuy; @benbbaldwin) — competitor formulas, not lab results. Worse, the ARBY formula **changed between posts** — Sep 19: 65/35 with a 2025/35-2026 season blend; Sep 23 TNF edition: 7-game window with 5/2 game-weighting. Version drift inside a quoted formula. Adopt the *method families* (opponent-adjusted RB matchup rating; composite OL grade with cross-system disagreement tracking) by clean-room rebuild from cleared data — never paste their numbers, never version-track a third party's tweet as a lab spec.

Files: `ops/AGENTS-history-main-2026-09-26.md:3541,3552,3953` · partition-04 §1#11–12

### C7. The 52.4% CLV threshold is never derived anywhere in-repo (P04 §3#8)

Stated as the ESTABLISHED blocker, but no file derives it. INFERENCE: it is 110/210 = 52.38%, the standard −110 vig break-even beat rate — yet it is applied **uniformly across markets including moneylines where it does not apply**. The blocker inherits this unexamined uniformity. Fix: derive per-market break-even thresholds from the engine's own historical staking, or keep 52.4% labeled explicitly as the -110-spread convention.

Files: `ops/calibration/2026-08-19-l9-clv-slices/RESULTS.md:27` · partition-04 §1#24

### C8. "The engine's Brier" depends on which artifact you ask (P04 §3#4)

LEVERAGE_STATUS says 0.247 (Sep 4, no sample/CI/market split). The Aug 9 working log says ~0.275. The conf-80+ band reads 0.3617 (n=2,385, z=−10.7 — the inversion). The PROVEN pool reads 0.2099 (n=380). The 0.247-vs-0.22 framing understates the true spread and the worst readings. Fix: report Brier as a tuple (value, n, window, market slice, estimator version) — single numbers are the mislabeling vector that produced the 0.0044 ECE case.

Files: `intelligence/LEVERAGE_STATUS.md:189,212` · `ops/WORKING_LOG_2026-08-09_WORLD_CLASS.md` · `ops/AGENTS-history-main-2026-09-26.md:3718,842-843` · partition-04 §1#6,15,18,20

### C9. The TOTAL 58.5% "validated signal" is arithmetically clean and evidentially hollow (P04 §3#1)

The math recomputes exactly (p=0.5847, CI [0.5283, 0.6390]) — but the source doc flags as BLOCKED: **909/909 locks have no `odds_batch` row — every lock price is model-derived, not book-captured**; 59/140 ML locks sit below −1000 (min −21200, one impossible +105). The "beats" are measured against the model's own generated prices. The lower CI bound (52.8%) clears the 52.4% bar by **0.4pp**; the July sub-slice alone (103/183, CI [49.0%, 63.3%]) fails the bar; the denominator is decided-only (pushes excluded); all of it measured while the line archive was dead (2026-08-22 → 2026-09-13). Cite only with the provenance asterisk. The lock-provenance QC rule (buildable-systems #2) would have invalidated both the 23.0% blocker panic and the 58.5% celebration.

Files: `ops/calibration/2026-08-19-l9-clv-slices/RESULTS.md:25-26` · partition-04 §1#7

### C10. 0495's betting claims are statistically unsupported — keep the method, reject the narrative (P03 §3)

The brief correctly reports the paper's betting numbers, but the paper's own 90% CI ([−21%,+48%]) includes negative and the +128% ROI is 2 bets. What transfers: the hierarchical Bayesian log5 method and the log-loss-vs-decision-WPA dissociation (~1 win/season from recency that barely moves log-loss). Cost flag: NUTS on ~2,000-play windows per unit — budget 2–4 weeks. Also: model never bet the home team (no HFA term — acknowledged flaw); any NFL port must include the home-covariate gate (1449 Thm 4.3).

Files: `arxiv-deep/0495-the-impacts-*.md` (arXiv:2511.17733v1) · partition-03 §1#3

---

## CONTRADICTIONS (both sides stated)

### C11. Pressure-to-sack: veto vs trait — RESOLVED with a level-of-analysis split (P01 §3A, P02 §3C1, P04 §3#9, P05 §3C3.1)

- **Side A (veto — stronger evidence):** the build plan's KILL — "conversion luck explains under half a percent of outcome variance," do not model conversion rate as skill (`parallel-build-plan.md:389`, marked "Measured"). The metric bible's R²<0.005 veto (team level, PFF basis). Both are variance-level statements about predictive contribution.
- **Side B (trait):** sweep-2026-09-21's YoY-moving QB trait (Young 23.3%→10.5%); the PFF 2026 leaderboard; the c01 map's input nomination — with no measured gain.
- **Resolution:** veto wins on the evidence in front of us. **The veto STANDS for props — never price an individual sack prop from conversion rates.** The QB-level trait is UNTESTED — wire it only with empirical-Bayes shrinkage toward the ~18% league baseline and a regime-stability gate (Minerva/D-S-I), never as raw single-season rates; keep the <2.5s split for *attribution* (coverage sacks vs true rush wins) and behavioral description. No experiment is currently queued to test the QB-level version — one should be, because the veto permanently closes a lane the trait finding could price.

Files: `docs/architecture/2026-09-18-parallel-build-plan.md:389` · `our-metric-stack.md` · `sweep-2026-09-21.md:22` · partition-01 §3A · partition-02 §3C1 · partition-04 §3#9 · partition-05 §3C3.1

### C12. Brief-provenance imprecision: AGENTS-history vs the true sources (P04 §3#10)

The c01 AGENTS-history brief's "replay corpus" numbers (Brier 0.2106, AUC 0.4965, 11 slices) actually live in `ops/CHAOS_CAMPAIGN_2026-09-04.md` and `ops/HERMES_NIGHT_LOG_2026-09-04.md`. The numbers verify; the attribution doesn't. Downstream analysts citing "AGENTS-history" for these would mis-cite. Fix: point citations at the true sources.

Files: partition-04 §1#16

### C13. The n=12 graduation gate is statistically weak (P04 §3#5)

Pearson r on a 12-player join: r=0.60 carries a 95% CI of roughly [0.04, 0.87]. A "graduated" verdict can be pure noise. The honesty gates are excellent at the input side (null on degenerate) but the exit bar needs a CI-width or shrinkage condition before reuse as the standard intake contract.

Files: `math/GSE_EXPECTED_METRICS.md:192-201` · partition-04 §1#9

### C14. OpenSkill-vs-Elo and nfelo-vs-Elo baselines disagree on which simple rating to benchmark (P01 §3L)

Out of the QB lane proper, but it touches the team-strength features the QB numbers roll up into — treat both as baselines and pick by walk-forward rather than by argument.

Files: partition-01 §3L

---

## THIN SAMPLES / METHOD FAILURES

### C15. Bryce Young's 23.3%→10.5% is <2σ noise, not a stabilized trait (P01 §3A)

Each season is n=29–38 pressured dropbacks (se≈7pp); the 13pp four-year move is <2σ, and the 2026 reading (2 games, "unranked") is noise. The trait read is consistent with noise *as well as* improvement. Do not treat as a stabilized trait; any profile use requires EB shrinkage toward ~18% and n≥30 flags.

Files: `sweep-2026-09-21.md` · partition-01 §1#1

### C16. W1-2026 single-game extremes must not enter profiles (P01 §3E, P05 §3C3.2)

Lawrence +0.81 pressure EPA/db vs DEN (W1 only); Rush 80% pressure-to-sack and 2.6 QBR (W1 only); Watson PFF grade 40.1 with 3 TWP vs 1 BTT (W1 only); Purdy 0.0% pressure-to-sack (0/15 — P(0/15 | p=0.18) ≈ 0.05, borderline significant one-sided, but compounded in the 9-24 brief with CPOE +10.7 and 10.71% uncatchable from *different sources with different minimums* on 2-game samples); the entire 2026 X-sweep percentile leaderboards on denominators of 13–24. All are one-game numbers — legitimate slate reads, but nothing enters a behavioral profile without accumulation. Enforce the pipeline's 100-dropback minimum and add an n<30 flag on any dashboard surface.

Files: `research/2026-09-19-dk-week2/deep/qb-phase2.md` · `research/2026-09-24/full-tables/README.md` · partition-01 §1#6, §3B,E · partition-05 §1#11, §3C3.2

### C17. Pitts/London magnitudes are a template, not parameters (P01 §3C, P05 §3C3.4)

The without-London sample size is unstated (London durable — likely 2–6 games across 2024–2026), the post is text-only with no stated data source, and 19.0 FPG [TE1] on a tiny sample will regress. Keep the METHOD (recompute trust metrics conditional on receiver absence), do not keep the NUMBERS as priors. Concentration shifts are receiver-role-specific (WR1-out ≠ TE-out) — needs multi-case estimation before becoming priors.

Files: `dfs/research/2026-09-25/full-tables/README.md:25` · partition-01 §1#3 · partition-05 §1#1

### C18. X-sweep selection, survivorship, and fidelity bias (P05 §3C3.2–C3.3)

- Charts are posted *because they're extreme*: "Worst aDOT," "highest pressure rate allowed," tails-only leaderboards. A feature table built from transcriptions inherits tail bias.
- The RaritosFootball note makes it explicit: "no explicit early-sample disclaimer" — 1–3 game samples with no disclaimers throughout the X sweeps.
- In-file data-quality flags: 31 of 32 rows (one cropped, not reconstructed); Keenum/HOU logo misread; McDuffie 0.0 man-coverage passer-rating publicly disputed in replies ("Fake News"); post title "Through Week 2" vs chart "Week 3"; OneWeekSeason salary extract heavily corrupted (garbled CJK cells, Derek Carr as NO starter, Mike Evans on SF) — usable only as a historical ownership *calibration point* after filtering, never as player/team intel.
- "Generational prospects" cohort: 77 players with n=1–2 games of 2026 data mixed in.
- Prescription: any engine feature derived from the sweeps needs a sample-size floor + shrinkage (HB 150-rep / 80-attempt conventions are the template); approximation flags must be preserved through the pipeline (an intake ledger, not a feed).

Files: partition-05 §2 (claim 8 caveat) · partition-05 §3C3.2–C3.3 · partition-01 §1#11 (Keenum flag)

### C19. The Monken case's real threat is the QB confound, not the sample size (P02 §3C2)

The numbers are verified (0.639 quick_game_rate, 8.33→6.12 air yards, deep_rate 0.120→0.060). 2026 CLE n=164 plays: SE(0.639) ≈ 3.8pp — the 95% CI (0.564–0.714) still clears the 2026 league average 0.508, so the small sample does not kill the claim. **The real threat:** 2023–25 BAL QB was Lamar Jackson; 2026 CLE QB is Deshaun Watson. Quick-game rate and air yards are co-determined by the QB's release profile and mobility; "presumed playcaller" (first HC job) means the fingerprint may blend Monken with his OC. Treat the +0.162 as a **team-season fingerprint**, not a pure playcaller effect, until a QB-fixed comparison (same QB under different playcallers, or playcaller-fixed across QBs) is computed. Corroboration the profile carries: the shift began in BAL 2025 (+0.042 within-team) before the team switch.

Files: `coaching-tendencies/profiles/monken.md` · partition-02 §1#1

### C20. Single-game NGS extremes are observations, not tendencies (P02 §3C3)

Sheppard 55.3% blitz (one game vs Allen), Shanahan 65.6% motion (one game), Gibbs 55.3% of team air yards (one half). Any coaching-tendency feature built from them must aggregate multi-game with shrinkage — the 0586 brief's own small-sample doctrine: shrink low-sample players toward the shared simplex rather than fabricating individual styles.

Files: `post-inventory-2026-09-21.md` · partition-02 §1#3–5

### C21. Concepcion vs single-high flagged in-file as a betting recommendation, not research (P01 §3D, P05 §2.4)

TPRR 0.22→0.33 (+50%) carries "The Play: Over 3.5 receptions" in the source. Do not wire the instance. The scheme-conditional target profile method is fine; this instance is tainted.

Files: partition-01 §3D · partition-05 §2.4

### C22. First-read × EPA/att scatter rests on visual approximations (P01 §3G)

The 9-24 README explicitly flags the Patton scatter values as VISUAL APPROXIMATIONS off chart axes. Directional read only; do not quote ≈+0.48/~48% (Caleb) as measured values.

Files: `research/2026-09-24/full-tables/README.md` · partition-01 §1#16

### C23. The `x-intake-registry` as a named spec does not exist (P05 §3C3.5)

No file named `x-intake-registry` (or variant) exists in the local `~/workspace/vendor/Sports` checkout or in any c01 brief (repo-wide filename + content search; zero "x-intake" hits across briefs). The map's gap #4 ("spec'd but no automation") references something outside this slice or not yet written — **do not treat it as an existing artifact**. What exists: the X dossiers (25-account follow list), competitive-intel intake memo, manual X sweeps with harvest methodology, the staleness gate's queued personnel/news source. What breaks if the registry is spec'd as an automated feed: (1) source fragility — sweeps run on read-only browser tasks, no API; X scraping at intake cadence is ToS-risky; (2) fidelity — intake is text-only transcriptions and visual approximations; (3) subjective trust scoring without a track-record harness; (4) the missing-news problem (absence of a post ≠ absence of news; big model-market disagreements must be flagged `missingNewsSuspected`). Implementable version: a **ledger**, not a feed — account registry + harvest log + trust tiers + approximation flags + analyst-in-the-loop promotion to the feature catalog. The registry feeds the *catalog*, never features directly.

Files: `data-sources/research/2026-09-17/dossiers/nfl-analytics-x-dossier.md` · `research/2026-09-24/full-tables/README.md` · `reasoning/competitive-intel-intake-2026-09-26.md` · partition-05 §3C3.5

### C24. Baselines are 2025-anchored in a moving season (P04 §3#7)

The 1.867%/0.640% baselines and all 29,239-play CSVs are the 2025 REG filtered sample. The 2026 W1 lab run already caught structural breaks (Montgomery→HOU, DJ Moore→BUF) that 2025 baselines misprice. Nothing schedules re-anchoring; turnover-luck projections built on 2025 rates drift further every week. Fix: rolling-window recomputation with the structural-break detector (team-change flags) as the trigger.

Files: `our-metric-stack.md` · partition-04 §1#1–5

### C25. Weak-source and composite-score exclusions (P01 §3H–J)

- **@joe307bad QB composite scores** (Lawrence 100.00, Dart 94.62, C. Williams 91.40 …) — weak source, account not verified; the 9-17 brief flags it itself. Exclude.
- **PattonAnalytics' Y-Aware PCA play-caller tendency rating** (Shanahan top … Slowik bottom): no numeric values on bars, methodology incomplete, concept critique in-thread. Directional color only — cannot be a numeric coaching prior.
- **Composite QB formula** (EPA/Play + Success Rate + CPOE + Air Yds/Rec): explicitly "still tuning"; DAKOTA is a third-party all-in-one. Do not bake either into the pipeline as canonical — the corpus's canonical QB efficiency unit is EPA/dropback (+ CPOE as the over-expected kernel with pre-registered bars).

Files: partition-01 §1#18, §3H,I · partition-02 §3C4

### C26. Baseline disagreement between rating benchmarks is unresolved (P01 §3L, P04 briefs)

OpenSkill-vs-Elo and nfelo-vs-Elo baselines disagree on which simple rating to benchmark against (map contradiction #3). Treat both as baselines; pick by walk-forward.

Files: partition-01 §3L

---

*26 challenges. Mandatory-inclusion audit: Purdy 96th-not-99th → C2 · ARBY/Baldwin mislabeled → C6 · TacticAI ≥5% reader-invented → C4 · orphan 0.53–0.61/0.13–0.19 → C3 · ECE four values → C1 · veto-vs-trait resolution → C11 (veto stands for props, trait only with EB shrinkage toward ~18%) · Bryce Young <2σ → C15 · W1-2026 single-game extremes → C16 · 2048 Seal ≠ edge (Spearman 0.013, p=0.40) → C5. All present.*
