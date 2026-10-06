# c06 Calibration-Chain Verification Report

Adversarial verification of the c06 map's calibration/sizing/benchmark claims ("compose chain" findings 7–18), done 2026-10-01. Method: every headline number was checked against the arxiv-deep ledger source docs and GSE ops docs under `~/workspace/vendor/Sports/docs/` (read-only; greps at exact line level). Ledger = the arxiv-deep reader's authored doc; paper = the underlying research paper.

**Bottom line:** the numbers are real — I could not find a single fabricated headline number. Every numeric acceptance gate in the compose chain is stated in a source file (the arxiv-deep ledger's own "Acceptance / rejection gate" sections), not invented by the brief layer. What I did find: (a) three genuine internal contradictions in the floor values, (b) one MSFE/RMSFE mislabel in a brief summary, (c) the "unanimous RES≈0" verdict is one measurement family repeated across many ops docs, not independent corroboration, (d) the map slightly overstates the wiring manifest's floors.

---

## 1. Verified numbers (with source paths)

| Claim in map/brief | Number | Source doc (path under `~/workspace/vendor/Sports/docs/`) | Status |
|---|---|---|---|
| Market beats structural model; pooling weight boundary | RPS 0.1905 [0.1856,0.1957] vs 0.1972 [0.1921,0.2024]; ŵ=0.000; paired ΔRPS +0.0067 [0.0046,0.0088]; n=2,660 | `arxiv-program/research/2026-09-21/arxiv-deep/0670-does-a-structural-model-add.md:35` | VERIFIED |
| Spread→win-prob map | LD ~ N(mean −0.009, sd 13.588), n=2,560; Φ(p/13.588); p=7 → 0.697 model vs 0.689 actual | `arxiv-program/research/2026-09-21/arxiv-deep/1614-performance-of-betting-lines-predicting-nfl-games.md:17,26,37` | VERIFIED |
| Line-movement steam null | ~20% of games moved >1 pt; ~10% ≥2 pts; >2,000/2,560 moved ≤1 | same file `:42` | VERIFIED |
| 1614 home-underdog self-contradiction | abstract claims 53.5% ATS; Table 1 shows 409–396 = 50.8% | same file (brief documents it; paper's own discrepancy) | VERIFIED as real paper discrepancy |
| Partial-Kelly smoothing rule | s_t = s_{t−1} + ε(s*_t − s_{t−1}); interior-optimal ε beats optimal-T intermittent at both fee levels; GARCH(1,1) same pattern | `arxiv-program/research/2026-09-21/arxiv-deep/1755-transaction-fees-optimal-rebalancing-growth-optimal.md:12,30` | VERIFIED. Note: no single headline number in paper (results are figure curves). The "vig (−110≈4.55%) as fee mapping" is the ledger's own stated INFERENCE, not a paper claim — brief tags it INFERENCE, map states it flatly |
| Margin-as-gate + feasibility ceiling | selective acc ≤ min(1, p/c); top-two margin: 10% coverage at 29.0% acc vs 13.3% overall; Prop.1 unidentifiability | `arxiv-program/research/2026-09-21/arxiv-deep/1784-one-score-two-decisions-selective-prediction.md:14,31` | VERIFIED |
| Conformal conditional-coverage defect | m=10: 19% of calibration sets <85% conditional coverage vs 90% nominal; Vovk-2012 bound vacuous at small m | `arxiv-program/research/2026-09-21/arxiv-deep/0450-a-critical-perspective-on-finite-sample.md:35` | VERIFIED. Source adds `:49` — "the 19%-below-85% figure is illustrative, not a universal constant" — the map omits this caveat |
| Bridge calibration bar | bridge Brier 0.2237 vs spread-bucket 0.2120 on 285 sealed 2025 games; fit N=6,955; 36 games skipped | `reasoning/bridge-fit.md:5,7` | VERIFIED |
| LEAP elicitation | ECE 0.1840→0.0876 (halved), overconfidence 0.3167→0.1500; Brier −16.5 macro (0.4806→0.3157); removing prior drops FutureX below baseline (0.6427 vs 0.6512) | `arxiv-program/research/2026-09-21/arxiv-deep/0440-leap-likelihood-elicitation-and-aggregation-for.md:40,42` | VERIFIED |
| Calibration-selected vs accuracy-selected | +34.69% avg ROI vs −35.17% avg ROI; eighth-Kelly; accuracy branch Kelly lost 75.9% of bankroll ($10,000→$2,410); SVM won both branches; single season only | `arxiv-program/research/2026-09-21/arxiv-deep/1079-calibration-vs-accuracy-sports-betting.md:16` | VERIFIED. Caveat (in source): one season, one model family winning both branches |
| Hierarchical BT shrinkage | Apr 15 mean-abs win error 8.82 (Bayes) vs 24.65 (MLE); prior-season σ̂ 0.235–0.316; tied from ~Aug on | `arxiv-program/research/2026-09-21/arxiv-deep/0611-hierarchical-bayesian-bradleyterry-for-applications-in.md:37` | VERIFIED (2017 MLB season; NFL transfer is the ledger's extrapolation) |
| γ=0.5 error correction | mean+γ0.5: relative MSFE 0.5132 (−49%); mean+γ0.65: 0.4663; OLS-optimal: 1.0315 (the puzzle); COVID in-sample flips to 1.16–1.53 | `arxiv-program/research/2026-09-21/arxiv-deep/1556-corrected-forecast-combinations.md:39,43` | VERIFIED. See mislabel note below |
| Net pressure tilt entry | r=+0.24135 (n=250, walk-forward, home-minus-away qb_hits/dropbacks); entry bar \|r\|>0.03 in useful direction; fourth-down go rate −0.0136 and ST EPA −0.0648 stay dark | `reasoning/situational-edges.md:7,13` | VERIFIED |
| NGS week-3 gate | 5/8 components pass \|r\|≥0.08: CPOE +0.176, TTT +0.110, air-yards diff +0.184, RYOE +0.124, YACOE +0.171 (n=255); capped at 0.15 of signed family value | `reasoning/ngs-st-pace.md:3,7-13` | VERIFIED. Source explicitly states these are same-season associations, NOT walk-forward — map carries the caveat |
| Production Murphy decomposition | Brier 0.275 (fails ≤0.22); REL 0.026; RES 0.002; UNC 0.250 | `ops/MURPHY_COMPONENTS_EXPLORE.md:6-8` | VERIFIED |
| Inverted confidence (production) | ≥80 score won 43.7% claiming 86.2% (n=167); confidence AUC 0.4965 on 13,646 picks | `ops/LAUNCH_FINISH_LINE_2026-09-05.md:30,239` | VERIFIED |
| Replay confidence-band inversion (27 seasons) | 70–79 band 48.33% (n=3,770, ROI −7.52%) vs 65–69 band 49.47% (n=9,693, ROI −5.46%); z=−1.19, p=0.235 (not significant, wrong direction); overall ROI −5.48% | `data/NFL_REPLAY_CALIBRATION_2026-09-04.md:81-82,112-115` | VERIFIED |
| Publish floors (launch doc) | Brier ≤0.22, ECE ≤0.05 (10 equal-width), Murphy REL ≤0.05, n≥100, three consecutive green 6h cron runs | `ops/LAUNCH_FINISH_LINE_2026-09-05.md:161,169-189` | VERIFIED |
| Checklist floors | N≥500, ECE≤0.05, MCE≤0.12 — each explicitly labeled "(strawman)" | `ops/CALIBRATION_PUBLISH_CHECKLIST.md:9,13-14` | VERIFIED — but see contradiction §3: they are provisional, not ratified |
| Wiring-manifest floors | Calibration: Brier ≤0.22, ECE ≤0.04; Knowability ≥0.35 / Evidence health ≥0.3 (separate WITHHOLD rule) | `engine/research/2026-09-24/FULL_REPO_WIRING_MANIFEST.md:114-115,118` | VERIFIED — ECE floor is 0.04 here, not 0.05 |

---

## 2. Real vs invented gates

**Finding: no gate was invented by the brief layer.** Every numeric acceptance gate in the compose chain is stated verbatim in the corresponding arxiv-deep ledger's "Acceptance / rejection gate" section (sections 13/14) or the 1079 "Numeric gate" section. The crucial disclosure: **these gates are the ledger author's authored ADOPT/REJECT decision rules for GSE — they are NOT claims of the underlying papers.** They are "real" in the sense the map claims (stated in the source file), but they carry the authority of one reader's engineering judgment, not peer-reviewed findings.

| Stage | Gate as stated in map/brief | Verdict | Where it lives in source |
|---|---|---|---|
| shrink (0611) | beat dynamic Elo on 2015–2025 walk-forward | REAL — brief simplified; full gate is three-part: (a) log loss beats dynamic Elo by ≥0.003 averaged Weeks 2–8 partitions; AND (b) no worse than Elo (within 0.001) at Weeks 13–16; AND (c) reliability-diagram slope in [0.9,1.1] | `arxiv-deep/0611…md` §13 |
| elicit (0440 LEAP) | Brier ≥0.010 better AND ECE ≥25% relative improvement, no accuracy degradation; reject if engine-prior-removal performs comparably | REAL — matches source §13 verbatim; brief also carries the §13 ADAPT-fallback (overconfidence −30% → adopt as auditability layer only) | `arxiv-deep/0440…md` §13 |
| correct (1556) | ACF(1)≥0.15 premise; ≥3% margin-RMSE reduction AND ≥1% ATS-Brier improvement on 2024 holdout; no single week >25% of gain; skip after \|e_t\|>3σ | REAL — §13 has the ACF(1)≥0.15 / 3% / 1% / 25% figures; the 3σ skip is in the source doc's guardrails list (`:65`), not brief-invented | `arxiv-deep/1556…md` §13 + `:65` |
| combine (1169 log-pool) | brief: log-pooling as default ensemble operator; test = beats linear on 2025 full-season log loss | QUALITATIVE — no numeric threshold in source; the "mandated by log-loss" phrasing in the map is ledger framing, not a stated gate. Weakest gate in the chain | `arxiv-deep/1169…md` connections text |
| combine (1673 hierarchical stack) | brief: must beat global stacking with ≤1 added week of compute discipline | QUALITATIVE — budget-discipline gate, no score threshold | brief-level (source proposes build + held-out comparison) |
| combine (1490 Bates–Granger) | beats equal weights AND best single source by ≥0.002 Brier on held-out 2026 in ≥2 of 3 markets | REAL — verbatim from source §13 | `arxiv-deep/1490…md` §13 |
| gate (1784 margin) | margin gating beats top-score by ≥2 points selective hit-rate at posted-card coverage on walk-forward seasons; feasibility ceiling adopted unconditionally (it's arithmetic) | REAL — verbatim from source §13 | `arxiv-deep/1784…md` §13 |
| gate (0700 dual-threshold) | beats fixed 70%-confidence cutoff on published ROI by ≥1pp at comparable coverage; empirical coverage within ±3pp of 1−α | REAL — verbatim from source §13 | `arxiv-deep/0700…md` §13 |
| size (1755 partial Kelly) | ADOPT ε-damping iff tuned ε<1 beats ε=1 on net terminal log growth by ≥2% annualized; REJECT if ε=1 wins | REAL — verbatim from source §14 ("Gate:" label) | `arxiv-deep/1755…md` §14 |
| size (1732 proper bet) | beats flat AND Kelly on realized ROI (paired bootstrap 5%) with ≥60% of gain from score-gap term | REAL — from the 1732 brief's gate; marked in brief as improvement-test (I did not re-verify against the 1732 source doc §13 — flagged as BRIEF-LEVEL, unverified) |
| benchmark-vs-close (0670 ŵ) | adopt protocol if ŵ stable across two independent 20-week folds with interior (non-boundary) loss-profile minimum | REAL — in 0670 source doc (builds section `:50`; the gate text "report the diagnostic as unstable" if boundary) | `arxiv-deep/0670…md` `:50,53` |
| benchmark-vs-close (1614 Φ map) | adopt Φ(p/13.588) if 2012–2025 Brier within 0.002 of GSE's current conversion; reject home-dog system unless 2012–2025 ATS ≥52.38% with p<0.05 | REAL — verbatim from source §13 | `arxiv-deep/1614…md` §13 |
| benchmark bar (bridge) | new model must beat bridge 0.2237 AND spread-bucket 0.2120 on the same sealed 2025 set, leak-free priors, unclamped outputs | REAL — brief's engine-actionable; reflects the source doc's framing | `reasoning/bridge-fit.md` + d22 brief |
| bake-off selection (1079) | ECE-selected model must beat accuracy-selected on bankroll ROI under eighth-Kelly over ≥2 NFL seasons | REAL — verbatim from source "Numeric gate" (§68) | `arxiv-deep/1079…md` §68 |

Gates that are QUALITATIVE or weak: the 1169 combine step ("beats linear on log loss" — no threshold), 1673 (compute-budget gate), situational/NGS entry rules (|r|>0.03, |r|≥0.08 — these ARE stated in their source docs but are author-set knobs, not derived thresholds).

---

## 3. Internal contradictions (catalog)

1. **ECE floor: 0.04 vs 0.05.** `FULL_REPO_WIRING_MANIFEST.md:118` says Calibration: Brier ≤0.22, **ECE ≤0.04**. `LAUNCH_FINISH_LINE_2026-09-05.md:161` says ECE floor 0.05. Two live docs disagree on the floor by a full point. (The launch doc itself shows how tight this is: first live run read ECE 0.0553 — misses 0.05 by 0.0053, misses 0.04 by 0.0153 — and notes "at n 223 the 0.05 floor sits inside the estimator's own interval", `:421`.)
2. **Sample-size floor: n≥100 vs N≥500.** Launch doc floors say n≥100 with three consecutive green cron runs (`:161`); `CALIBRATION_PUBLISH_CHECKLIST.md:9` says N≥500. Reconciler: the checklist values are all labeled "(strawman)" — provisional, not ratified — while the launch doc's n≥100 + streak-of-three-green is the operationalized rule. The map presents the checklist floors without the strawman qualifier, inflating their authority.
3. **1614's home-underdog claim vs its own Table 1.** Abstract: 53.5% ATS; Table 1: 409–396 = 50.8% (53.5% matches the pick-em row 15–13). This is a real self-contradiction inside the paper — the map correctly flags it as a dead-edge exhibit, and the ledger's gate (reject unless 2012–2025 ATS ≥52.38%, p<0.05) correctly encodes rejection as the expected outcome. Not a slice error.
4. **"nflverse has no closing lines" vs repo data.** Multiple reviews asserted it; `games.csv` has 7,276 rows with spread_line/total_line/moneylines (corr(spread_line,result)=+0.4260). Map lists it; confirmed by d02 work referenced in map. Corpus hygiene note.
5. **MSFE vs RMSFE mislabel (minor).** 1556 source `:43` reports relative **MSFE** 0.4663–0.5132 vs OLS-optimal 1.0315. The 1556 brief's "What it is" summary calls these "relative RMSFE" (its Findings section gets it right). The map's compose chain says "cut MSFE ~50% (0.466–0.513 vs 1.03 OLS-optimal)" — the comparison is also slightly apples-to-oranges as written: 0.466–0.513 are relative to the uncorrected MEAN (=1.0), 1.03 is the uncorrected OLS-optimal relative to that same mean. Numbers right, framing loose.
6. **Map inflates the wiring manifest's floors.** Map's "Metrics that recur" says "publish floors Brier ≤0.22 / ECE ≤0.05 / Murphy REL ≤0.05 appear in the wiring manifest (Knowability ≥0.35, Evidence health ≥0.3)". In reality the manifest says ECE ≤**0.04** (contradiction #1) and the Knowability/Evidence-health numbers are a separate WITHHOLD rule (`:114-115`), not calibration floors.
7. **Bridge-vs-1614 tension (not a contradiction, a scope note).** Bridge Brier 0.2237 on sealed 2025 (logistic on leak-free priors) loses to spread-bucket 0.2120 — while 1614's Φ map validated on 2002–2011. The sealed-2025 benchmark set is the same 285 games for both, so the comparison is apples-to-apples; the tension is substantive (a closed-form spread map beats a fitted logistic), not a data error.
8. **LEAP Brier baseline mismatch (watch, not error).** LEAP's Brier gains are on forecasting-benchmark tasks (0.4806→0.3157), not sports outcomes — the −16.5 is macro-average on FutureX/GAIA/BrowseComp. The map presents it in the compose chain without restating the domain; the ledger's §13 gate (Brier ≥0.010 on 2024–2025 NFL window) is the correct sports-transfer test. Don't quote LEAP's Brier numbers as sports numbers.

---

## 4. RES-verdict trace — is "resolution is the binding constraint" independently corroborated?

**The single measured decomposition:** Brier 0.275 = REL 0.026 − RES 0.002 + UNC 0.250 comes from ONE file: `ops/MURPHY_COMPONENTS_EXPLORE.md:6-8` (live production picks corpus, binning scheme unspecified per the brief's honest note). 

**It is repeated, not independently re-measured.** I found ~12 ops files echoing "RES ~0.002 / Brier 0.275" (`BRIER_DECOMPOSITION_EXPLORE.md:11`, `CLOSEOUT_STATUS_2026-08-10.md:12`, `DASE_PREDICTIONIO_MAP.md:38`, `INDEPENDENT_TRUEPROB_BACKFILL_AND_CALIBRATION.md:12`, `LAUNCH_MAX_PATH_2026-08-09.md:6`, `LEVERAGE_LOOP_2026-08-10.md:49`, `MASTER_PROMPT_V2.md:17`, `MASTER_PROMPT_V3_COMPRESSED.md:13`, `MATRIX_COMPLETION_AUDIT_2026-08-09.md:13`, `MODEL_VERSION_INDEPENDENT_RANKING.md:38`). These are echoes of the same live-corpus measurement, not independent experiments. One partial exception: `ops/BAKEOFF_IDENTICAL_ROWS_2026-08-08.md:116` reports RES 0.0023 on a different sample (independent_trueProb, n=1132, Brier 0.2475) — same order of magnitude, different sample, so weak corroboration. And `CLOSEOUT_STATUS_2026-08-10.md:12` notes RES ~0.01 ("was 0.002") — one measurement of improvement, no context on what moved it.

**The phenomenon it diagnoses IS corroborated independently by three separate measurement programs:**
- Production confidence has no ranking power: AUC 0.4965 on 13,646 picks; ≥80 tail inverted 43.7% vs 86.2% claimed (`LAUNCH_FINISH_LINE:30,239`).
- 27-season nflverse replay: confidence bands 70–79 at 48.33% vs 65–69 at 49.47% (z=−1.19) — confidence anti-informative (`NFL_REPLAY_CALIBRATION:81-82,112-115`).
- The ledger's own cross-domain reads (0611, 1169, 1784) all converge on discrimination-over-calibration ordering: "Maps reduce REL; they cannot invent RES" (`BRIER_DECOMPOSITION_EXPLORE.md`).

**Scoping correction the map needs:** RES≈0 was measured on the engine's own probabilities (pre-v5.2.8 the displayed p was confidence-based). The market-anchored v5.2.8 system (displayed p = de-vigged market p) shows Brier 0.1444–0.1692 with REL 0.0044–0.0071 — the market's probabilities DO carry resolution. So "RES≈0 is the blocker" applies to the engine's own model probabilities, not to the market-anchored public surface. The trust-signals module should inherit this scope: the RES mandate is about engine-native signals, and the 0670 ŵ protocol (does the engine add anything beyond the de-vigged close?) is the test that measures it.

**INFERENCE (mine, marked):** the unanimous framing is about 80% real — the measured number is one corpus's state, but the conclusion "fix discrimination before recalibration" is independently supported by the AUC evidence, the replay inversion, and the formal decomposition literature the ledgers cite. Do not present RES=0.002 as replicated across independent datasets.

---

## 5. Calibration discipline for new signals (extracted from the slice — not invented)

For a trust-signals family with no history, the slice's actual guidance composes into this sequence:

1. **Beat the close, or stay dark (0670).** Fit the log-opinion-pool weight ŵ of the new signal against the de-vigged closing price on a walk-forward validation window, minimizing log loss. Adopt only if ŵ is materially positive and the loss-profile minimum is interior (not a boundary artifact like the paper's ŵ=0.000). Stable across two independent 20-week folds. This is the headline market-benchmark protocol (0670 ledger `:50,53`).
2. **Beat the sealed bridge bar (d22).** On the identical sealed 2025 set (or its successor): leak-free priors only, unclamped outputs, must beat BOTH the bridge's 0.2237 and the spread-bucket table's 0.2120 Brier (bridge-fit brief; `reasoning/bridge-fit.md:5,7`).
3. **Entry gate with a stated numeric bar (d23 pattern).** Walk-forward correlation (earlier-weeks-only) with |r| above an explicit bar in the useful direction (situational-edges uses 0.03; NGS gate uses 0.08). Same-season association is explicitly disallowed as evidence ("not a claim that NGS beats the close" — ngs-st-pace brief). Wrong-direction correlations are kept dark, never sign-flipped (situational-edges `:13`).
4. **Discrimination before calibration (the RES ordering).** Fix resolution first — selective publish, better features, dead-group pruning — and only then recalibrate (Platt/temperature/isotonic); recalibration maps reduce REL but cannot invent RES (`MURPHY_COMPONENTS_EXPLORE` brief; `BRIER_DECOMPOSITION_EXPLORE.md`: "Maps reduce REL; they cannot invent RES"). **Never lower floors to greenwash** (explicit anti-greenwashing rule in the Murphy explore doc).
5. **Select the model by calibration, not accuracy (1079).** Bake-off branches: minimum classwise-ECE vs maximum accuracy; adopt ECE-selection only if it wins on eighth-Kelly bankroll ROI over ≥2 NFL seasons (1079 "Numeric gate", `:68`). Fractional-Kelly sizing must be gated on a live calibration check — fall back to flat stakes if ECE exceeds threshold (1079 brief: "if the live model's calibration error exceeds a threshold, fall back to flat stakes").
6. **Gate the card on the margin, not the top score (1784).** Gate on model-prob minus market-prob (edge over the alternative), not raw confidence — after computing the feasibility ceiling min(1,p/c) as an arithmetic pre-check. Adopt margin gating only if it wins ≥2 points of selective hit-rate at posted coverage (Prop. 1: decided empirically, not assumed).
7. **Correction layer discipline (1556).** γ=0.5 error-autocorrelation correction only if baseline ACF(1)≥0.15; skip after |e_t|>3σ weeks (COVID lesson); auto-set γ=0 if ACF(1) collapses; require ≥3% margin-RMSE / ≥1% ATS-Brier on holdout with no week contributing >25% of gain.
8. **Conformal intervals: audit conditional coverage (0450).** At small calibration windows (weekly slates, short seasons — exactly the trust-signal regime), marginal guarantees mislead: bootstrap the calibration window, report P(coverage < nominal−5pp), and size minimum-m from the Vovk bound (m=10: expect ~19% of sets below 85%; m=200: shortfall vanishes).
9. **Sizing is last and fee-aware (1755, 1732, 1079).** Kelly amplifies miscalibration into ruin (1079: accuracy-selected + eighth-Kelly lost 75.9% of bankroll). Implement ε-damped stake updates (adopt iff ε<1 beats ε=1 by ≥2% annualized net of vig); consider proper-bet sizing as the Kelly replacement (1732) only if it beats flat and Kelly with ≥60% of gain from the score-gap term.
10. **Display discipline (d16).** Displayed probability = de-vigged market probability of the picked side (receipt-immutable), never confidence-as-probability (confidence AUC 0.4965; ≥80 tail inverted). Structural exclusions (three-way markets, non-moneyline pooled separately); one row per game; seeded bootstrap intervals.

**What the slice does NOT give you:** no new-signal-family protocol specific to behavioral/trust signals (all gates are for outcome-probability models); no prescribed |r| bar for non-game signals (0.03/0.08 are the author's knobs for game-outcome correlations); the 0670 ŵ protocol is the closest thing to a general "does this family add anything" test — use it.

---

## Appendix: adversarial notes for the coordinator

- **INFERENCE tags in briefs are honest** — the 1755 brief explicitly marks the vig-as-fee mapping as the ledger's INFERENCE; the 0440 brief marks dome/neutral coefficient-direction readings as INFERENCE. These are labeled, not smuggled. The map occasionally drops the tag (e.g., finding 15's "vig (−110≈4.55%) as fee mapping").
- **The map's "Cross-file patterns" metrics paragraph** slightly over-claims: "publish floors Brier ≤0.22 / ECE ≤0.05 / Murphy REL ≤0.05 appear in … FULL_REPO_WIRING_MANIFEST.md" — the manifest says ECE ≤0.04, and Knowability ≥0.35/Evidence health ≥0.3 are a separate WITHHOLD rule, not calibration floors.
- **One arithmetic check:** Murphy identity 0.026 − 0.002 + 0.250 = 0.274 ≈ 0.275 (rounding-consistent).
- **Nothing in this verification required the live browser.** All sources were local docs; all numbers traced to exact file:line.
