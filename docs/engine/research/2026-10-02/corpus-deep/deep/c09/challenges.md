# c09 Challenges — Phase 2 consolidated challenges & contradictions

**Slice:** c09 (NFL intelligence: qb-behavior, coaching, trust-signals, reasoning) — 10 deep-analysis chunks, 2026-10-02.

Every challenge/contradiction across the slice, consolidated and deduped. INFERENCE items are marked as such. Structure: (1) the calibration crisis, (2) provenance/verification challenges, (3) empty-brief-dir methodology, (4) ledger-internal contradictions, (5) structural/fragility challenges per method, (6) governance gaps, (7) data-blocked and perishable items.

---

## 1. The calibration crisis — maps stay OFF while RES≈0

**State:** Last recorded state is the Aug-2026 vintage: Brier ≈ 0.275 / ECE ≈ 0.112 / RES ≈ 0.002 RED, 5× corroborated across ops files (`MASTER_PROMPT_V2_COMPRESSED.md:6`, `ENGINE_RANKING_RES_NEAR_ZERO.md:4`, `LAUNCH_MAX_PATH_2026-08-09.md:6`, `MASTER_PROMPT_V2.md:17`, `MASTER_PROMPT_V3_COMPRESSED.md:13`). Fresher read: 2026-09-04 HERMES_ALL_NIGHT — resolution 0.005 on 1,663 graded picks; 152 picks at ≥80% confidence won only 40% (**inverted**); 27-season replay confidence AUC 0.4965 (p=0.41) on 13,646 picks. **This vintage is stale; the exact triple must be refreshed.**

**The binding constraint is discrimination, not calibration.** The 0.22 Brier floor sits just above the 0.2122 devigged-price baseline (`reasoning/calibration-weights.md:30-31`; Elo measured 0.2312 on 3,018 games — worse than the baseline). Headroom: ~0.008. Per the calibration-gate split map, BS≤0.22 requires RES≳0.03–0.05 — "calibration work alone cannot close the discrimination half."

**Standing rule:** maps fix REL/NLL, not RES; if bestByLogLoss improves but RES≈0 → do not apply, raise ranking first; **"maps stay OFF while resolution≈0"** (`ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md:3,30`). And 0715's theorem makes this structural: monotone post-hoc calibration *cannot* reduce the ranking term ε_rank. The calibration crisis is not a data accident — it is a missing-discrimination problem, and discrimination comes from the QB-behavior/trench/scheme signal stack, never from more calibration polish.

**Garrett's WIRE-FIRST sequencing is aligned with this:** he rejects scoring calibration on old-model picks as a progress measure. The crisis is real, but the fix is wiring, not scoring.

## 2. Provenance/verification challenges

- **Provenance caveats (r02):** 0533 (hydrate/momentum) data doesn't reconcile with the real 2026 WC format (99 = 67 group + 32 knockout, 3 dropped → 102 ≠ 104; group should be 72); 0493 (halftime) has no train/test split described; 0747 (Sankey football) is figures-only with no verifiable numbers; 0574's "+0.27pp superiority" is within margin and no CI reported; 0986 draft-lane port is a strawman (random baselines).
- **Second-hand, synthetic, or provisional items (r02):** 0282 (Walsh & Joshi +69.86% pointer, see §1 correction); 1359 (40% threshold explicitly parameter-conditional, simulation not market fact); 1735 (ω₁≈0.15 synthetic-only, re-estimate on real odds); 1112 (news sentiment — ledger's own snooping flag, treat result as negative example); 1511 (market stack — prediction, not retrospective); 1102 (FPPG plan, no results); 0964 (independence assumption, untested port).
- **Map-level cataloging errors:** 1172 is "ranking lasso" in the map — wrong; it is the forecast-combination puzzle (correction (b)). 1447's slug says soccer, content is USAU frisbee — cataloging hazard.
- **Third-hand anchors:** Harshraj parameters [DERIVED] clean-room (not author-stated); top-kernels anchors (Craig 75%, Goyal 80%, Newman 85%) via thesis bibliography; ryanjheath note-taker is an INFERENCE (no evidence of an intelligence role).
- **Do-not-use zones:** NGS open discrepancies (Van Ness <2.5s mismatch; Allen 55.3% CPOE vs blitz-rate mismatch) explicitly marked do-not-use; PFR is DO-NOT-SCRAPE (legal frame: Feist + NBA v. Motorola + hiQ).
- **Untested ≠ dead (INGEST-AND-LEARN doctrine, Garrett 2026-09-28 HARD):** 0503 toy-simulator, 0834 one-window result, 1493 (no transfer evidence), 1748 approximations, 1463 (no ablation), 1581 (site-specific), 1836 (saturated benchmarks), 1594 leakage caveats, 1112 snooping, 0442 (small sample + high dimensionality), 1473 retrodictive + internal contradiction, 1538 (54 samples), 1826 (luck confounds "what wins"), 1846 (benchmark saturation), 1530 (synthetic-only), 1813 (proprietary), 1761 (poker numbers don't transfer), 1349 (oracle by construction), 0888 (web-only), 0964 — all default to UNTESTED, QUEUED FOR EVALUATION, never SKIP/DEAD. **The challenge is sequencing 100+ untested builds under real budget constraints, not declaring them dead.**

## 3. Empty brief dirs — covered via dense-wave slug matching, 0 unmatched

- Empty brief dirs: r23/r26, r16/r19, r01/r02/r05/r06, r08 — all covered via dense-wave slug matching of the map's 299-brief inventory against reader files; **0 unmatched** (map claims 299/299 briefs covered; spot-checked dense waves confirmed coverage).
- **INFERENCE (methodological caveat):** "0 unmatched" is a claim about the *matching process*, not an independent re-audit of each match. If a slug was mislabeled at map time (as with 1172's "ranking lasso" and 1447's soccer/frisbee slug), the dense wave inherits the mislabel. A mislabeled-brief spot-audit (re-read the 5–10 briefs most load-bearing to downstream builds — 1172, 1447, 0791, 0503, 1748) would close this.
- r02 flags that 1172's one-step constitution may invalidate program-wide weighting comparisons that used standard DM/White tests on ~270 games ("not significant, keep equal weights" is the predicted artifact of using the wrong test, not a finding).

## 4. Ledger-internal contradictions

- **1447 LS vs USAU (d03 #10):** reported internal contradiction — "outperformed USAU on all tested metrics" vs "performed comparably to USAU"; adopt forecast→ILP architecture only.
- **1473 FPL (r02):** claimed 3,718-point dream team + overforecast 87; per-player best RMSEs (Vardy 2.539 at 60/40, Sagna 2.013 at 30/70) contradict the chosen 40/60 blend.
- **0544 phantom-BT (r01):** expert-calibrated δ=1/98≈0.0102 vs CV-selected δ=1.2589 — 2 orders of magnitude apart, unreconciled in-ledger.
- **1594 (d03):** 99.8% (shuffled holdout) vs 92% (new source) — the 99.8% leaks same-game sentences; always use 92%.
- **0068 GLMF:** headline rank-3 RMSE 0.342 vs mean 0.344 is noise-scale — the real result is rank-monotonicity; IRLS equations garbled in PDF (2/144 convergence failures → ridge required).
- **PROVE_THE_EDGE (r04):** "53–55% ATS; 57% sustained is legendary" (line 26) vs "~52–56%" task ask (line 38) — two win-rate caps in one doc; adopt one, delete the other.
- **d22/mkt #16:** CARDS_CLOSING_LINE has exactly one table; `closing_lines` is not an nflverse table name (nflverse keeps `spread_line` inside game data); `market_line_age` described but not implemented.
- **d04 #5:** CL1–CL9 (Danny's table) is an untested nine-claim table — each claim needs its own test before it becomes a feature.
- **d34 wind DARK:** null mediation result (medshift) is *expected* — the null resolves the DARK either way; the risk is treating "wind failed the scalarizer" as "wind doesn't matter."

## 5. Structural/fragility challenges per method

- **0503 (d02 C6):** toy simulator — "real data doesn't obey the paper's autocorrelation law"; do NOT hard-code φ=0.35.
- **0564 (r01):** all numerics N=2, one (b,K,L); no convergence rate in t; needs correct model spec; computing actual bias is open; √K law valid only for small K.
- **0473 (d02):** no significance tests; weak MC-dropout config; "deep fails under shift" partly straw-man; residual |y−f| tail behavior ignored.
- **0834 (d02):** single 3-month COVID window; author calls it "preliminary"; NFL bet correlation ≠ S&P correlation.
- **1748 (d03):** even-odds/small-δ/normal-ξ; must re-derive for general decimal odds.
- **0769 (d02):** Gaussian-additive sandbox only (P≤20, N≤1600); propensity errors propagate; real-world calibration of the causal-forest-vs-CATE choice is unrun.
- **0068 (d02):** rank-monotonicity is the result; the margin is noise.
- **0232 (d02):** flexBART DGP2 failure — balanced-partition bias on singleton-outlier partitions; singleton diagnostic is mandatory for the QB-profile program.
- **0242 (r01):** no bookmaker/market baseline; α₀⁽³⁾ duplicate coefficient (typeset slip); step-3 ad-hoc averaging should be joint; only the β₃ pilot is adoptable.
- **0584 (r01):** Elo ranks wrong (stale-form lock-in, WC 2018 failure); 0242's ranks never reported — the 3–6pp RPS wins may be rank-model artifacts; the "ZIGP ≥ SARMANOV → adopt" reading is conditional on a rank-model bake-off.
- **0402 EHCP (r01):** random (not time-ordered) splits; no pressure features; thrown-passes-only selection bias — the *one* QB decision metric most in need of the clean-vs-pressured split it lacks.
- **1868/2205 (d04):** 1868 transfer needs the four-line portability test; 2205 must prove "QB-relevant beyond generic reasoning" before it touches any build.
- **CARDS (d22):** single-claim table; don't build a closing-line program on it.
- **d34 late-and-close (d35):** the late-and-close-only slice *is* the late-game-only dataset — do not compare raw rates across game states; fix by full-game-state modeling with interactions.
- **d35 QB matrix (d05):** one-game snapshot wearing a behavioral costume (Rush's [WEAK]s, Cooper Rush 80% P2S at n=1, week-to-week QB drift; salaries [2P] second-party).
- **d37 DFS oracle (d06):** "proof" is overstated — only `optimizeOne` oracle-checked; N-unique portfolio path bounded-budget, NOT oracle-verified; synthetic-vs-real asymmetry (real slates hit optimum more often than synthetic — INFERENCE: real slates have sharper dominance structure; keep synthetic slates as the pessimistic test set).
- **Top-5 tables (d06):** top-5 averages erase the 0.34↔1.29 variance; rank reversals (ARI > TB > LAC > DEN ≠ the top-5 claim order); tables measure *market pricing*, not *defense quality*.
- **Frozen weights (d06 CH-7):** w=0.1 confidence weight, position weights, scalarizer 16 priors (doctrine v1), CLV grader, Bayesian-bake-off weights — all frozen without a drift-triggered refit rule → staleness. **This is a whole-class challenge: any weight that can't name its refit trigger is technical debt.**

## 6. Governance gaps

- **Trust-signal gap (map #1) is unfilled by any c09 chunk** — no social/video quote mining, no QB–receiver public trust dynamics anywhere in c09-d00..d05; the AIRWAVE spec (r01 S19) is the legal answer but the *build* doesn't exist yet. This is the intelligence program's headline gap and the #1 priority.
- **AI Gateway pilot (r04 #8):** decided but not executed; the cost/consistency gains are claims, not measurements. Agent-fleet LLM cost accounting sits behind it.
- **Rankings program (r04 #7):** QUEUED behind Phase 1/4/9 + total-signal plumbing + calibration fixes — no separate projection fork; the "when" is gated, not staffed.
- **Review queue triage (r04 #1):** exists as a proposed daily loop (stale-state, stale-caps, stale-build-queue, provenance mixes) but is not running as a scheduled job — the four staleness bugs it would have caught are the evidence for running it.
- **Weak-signal crawler BLOCKED on source-policy approval (BLOCK-7)** — the intake substrate exists in spec but not in production.
- **Scalarizer 16 priors are doctrine v1** — no owner, no refit cadence (d06 open question #2).
- **`gate_decisions` dead since 2026-06-11** — readers on fallback paths 3+ months; the gate-monitoring telemetry that would have caught this doesn't exist.
- **OddsLineSnapshot archive (r04):** DATA-BLOCKED — no odds store, no settlement feed, no CLV baseline; blocks the same-book CLV grader (BS-9), the δ/σ backtest (S4), and the CL1–CL9 ablation harness.

## 7. Data-blocked & perishable

- **DATA-BLOCKED:** OddsLineSnapshot archive (no odds store/settlement feed); clean-vs-pressured splits for ALL 21 in-file QBs (DATA_GAP); WR coverage splits (no per-route split dataset).
- **PARKED (buildable, deferred):** vision tracker (CV corpus re-scoped to measurement, needs Garrett's mandate); CV charting (0.74 recall on 57 frames — the 2026-path question vs licensed-data contracts); blur ball detector 0342 (parked at map's #8).
- **Perishable (d06):** 2026 Week-2 corpus expires next week — use it now or lose it; Mac Jones W2 salary UNKNOWN; wr-verify season-frame mismatch (Week-2 form vs 2025-26 season YPRR).
- **Stale (r04):** PROVE_THE_EDGE two caps; RED state constants; FP debunk (self-source citations); FFA (second-hand X claims); vercel-ai provenance mixes; FTO archived demo script; rankings RED state; FTO disclaimer "not legal advice."
