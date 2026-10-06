# Challenges — Corpus Slice c03, Coaching Lane (Phase 2)

**Written:** 2026-10-02 · **Coordinator synthesis** of working report A4 (`deep/c03/working/A4-challenges.md`).
Method: the analyst read the cited briefs AND the referenced `~/workspace/vendor/Sports/docs/` sources AND the live code, then rendered verdicts with engine actions. This is a stress-test, not a summary.

---

## Contradiction verdicts

### #1 — Short rest: directional adjustment (live, unbacktested) vs variance-only doctrine

**Evidence:** The live signal `packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts` still ships unbacktested magnitudes: **−1.75 baseline**, −0.65 over 1500 mi, −0.35 over 800 mi, −0.50 opponent-rest asymmetry, +0.40 division dampener, +0.60 home-both-short-rest. Its docstring asserts "−1.85 to −2.30 points" as "Empirical Domain Characteristics" — a range that doesn't even match the code's −1.75 (self-inconsistent).
The 2026-09-28 backtest (`docs/calibration-proposals/2026-09-28-short-week-road-deficit-backtest.md`; nflverse 2015–2024, **n=2,622 games**, graded vs closing): short-week (≤4 days rest) group n=157: mean vs close −0.471, sd 12.206; control n=2,465: +0.063, sd 12.815. **Raw differential: −0.534 points. Welch t=−0.53 — not distinguishable from zero.** The shipped −1.75 is 3.3× the point estimate. The "34% increase in 4th-quarter explosive plays" is recorded in the backtest doc as **UNSUPPORTED** (never measured anywhere). The backtest deliberately did NOT rescale (founder decision) — the unsupported magnitude is still live in the projection path.
The variance-doctrine side (`docs/gse/research-brief-rest-travel.md`) is weaker evidence than it looks: a qualitative Level-1 interpretation brief, draft-only, no numbers — and the backtest's own sds (12.206 short-week vs 12.815 control) point at slightly *lower* variance on short rest, not higher.

**Verdict:** The backtest is the strongest evidence. The effect is not distinguishable from −0.5 ± ~1.0, and definitely not −1.75.
**Engine action:** Demote the shipped −1.75 (do not silently rescale to −0.53); retire the "34% 4Q explosive" claim and the docstring range; widen the backtest (play-level rest data, more seasons) before any magnitude earns live weight. This is the program's own backtest discipline — follow it.

### #2 — Market in the confidence path: exploit vs remove

**Evidence:** Two layers were conflated. The ranking/slate layer (δ=0.1 selective path on marketFairProb; filtered set Brier 0.150, RES 0.041) vs the published-confidence layer (REDTEAM Wave 4, commit `ce4e2b711`: `edgeComponentScore` and `crossMarketScore` removed from SPREAD/TOTAL confidence; invariance machine-pinned with 0-movement tests; MONEYLINE deliberately market-anchored per founder choice, gate fairProb ≥ 0.58). Code verified: `confidence-market-independence.test.ts` still pins published-confidence invariance; `fairProb` still feeds `marketFairProb` in game-context (the ranking layer), and the test header documents the two-layer arrangement.

**Verdict:** No real contradiction — the redteam resolved it in code. The map's INFERENCE (marketFairProb belongs in the ranking/slate layer, not published confidence) is confirmed.
**Engine action:** Keep the split. Do not let the MONEYLINE anchor become precedent for spread/total (it's a documented founder choice, not a validated calibration gain). Keep the `it.fails` guards green — they are the machine-checked proof this stays resolved.

### #3 — Which gate statistic binds: Brier vs ECE

**Evidence:** CALIBRATION_GATE_SCALE_2026-09-06 is arithmetic, not opinion: a **constant 0.69 forecaster clears Brier 0.22** (UNC=0.2139); RES has no floor, so zero-skill reads GREEN; Murphy REL floor 0.05 is 4.47× looser than ECE's 5-point band. LEVERAGE_LOOP's own snapshot (n=339, Brier 0.2467, ECE 0.0387, RES ≈ 0.002 vs ~0.03–0.05 needed) already diagnoses the binding problem as resolution lift, not reliability.

**Verdict:** The r48 critique wins on arithmetic. Brier 0.22 is a floor, not a skill test.
**Engine action:** Add the RES floor (≥ ~0.03, debiased) as the binding gate — a zero-skill forecaster must read RED. Gate ECE on the debiased estimator `Σ_k w_k √(max(0, g_k² − v_k))` (the slice's own C-290 shows a perfect forecaster reads ≈0.09 at n=100). Keep Brier ≤ 0.22 as a guardrail, not a skill claim.

### #4 — CLV blocker: model problem vs data-quality problem

**Evidence:** "CLV beat-close 23.0% vs 52.4% = model problem" was measured on a corpus where 355/725 MLB spreads were off-ladder arithmetic means, 73% of TOTAL picks graded on a line ≠ the displayed line (34 outcome-flipping), 69.5% of settled picks lack an ESPN event id (unauditable), and 297 settled ML picks had bookmakerCount=0. Adversarial ranking puts CLV close contamination (stale/model-derived/non-executable closes) as the #1 false-certification mode. But the ledger's defects mostly *flatter* the record (~3.8 pts on off-ladder means; 34 outcome-flipping totals) — fixing the ruler likely makes CLV look *worse*, not better.

**Verdict:** Line-integrity evidence is stronger, but the composition is: data quality blocks *measurement*; the model has no demonstrated edge either way until the ruler is fixed.
**Engine action:** Fix the ruler (quoted-ladder-only publishing, ESPN event-id grading, `entryPrice ?? null`) before re-litigating "model vs gate." Until CLV is remeasured on executable closes, no CLV-based claim is evidence-grade.

---

## Verdict stress-tests

### Does 1575's τ transfer to 2026 coaches?

The estimand is sound. Portability has four problems: (1) the headline coach heterogeneity is measured on **fired coaches** (Nagy, Gruden, McCarthy, Pederson all out of NFL HC jobs in 2026) — the 2026 active-coach τ distribution is systematically compressed vs the paper's presentation; (2) τ̂ is stale by construction — NFL turnover is ~5–8 new HCs/year, each arriving with τ̂=undefined, and a league-average prior inherits the 2014–2022 aggression deficit; (3) WP-stratifier circularity is acknowledged, not solved (markets price coaching tendencies; the paper's "mild" is doing work); (4) effect size is small — partial R² 0.048, and the "0.4 wins/year" figure is Yam & Lopez's citation, not measured here.
**Action:** ADAPT stands for the estimand and pipeline, with annual refit + a documented new-coach prior (never borrow a fired coach's τ̂), and the Hamming gate run on 2024–2025 data against a refit baseline.

### Does 0677's anti-bye fade survive?

Three decay vectors: (1) no replication on 2024–2026 market pricing vs outcomes — the ~0.66 pt gap is a measured-2023 artifact, not a law; (2) the map's "edge flipped anti-bye" one-liner overstates the paper — **away-bye still covers 52.7%**; a blanket fade eats the away-side profit; the fade is home-bye only; (3) the post-2011 PD CI (−1.01, +1.64) includes effects larger than the market's +0.97 pricing — P(decline)=96.6% is about the *change*, not exploitability.
**Action:** ADOPT-with-gate stands; run the replication on 2023–2026 pricing before any live fade; fade is home-bye only until away-side evidence exists.

### Does 1638's aggressiveness template generalize?

It is the weakest of the three under adversarial light: (1) a soccer paper, old soccer — 1,140 Serie A matches from 2011/12–2013/14, hand-coded from commentary text; (2) **no out-of-sample prediction** — Model 2's 0.75 accuracy is in-sample; (3) the headline asymmetry smells of reverse causality — initial scheme +0.30 (aggressive openings good), final scheme −0.25/−0.50/−0.49 (aggressive closings bad) is exactly what trailing teams do; the endogeneity caveat doesn't cover within-game scoreboard endogeneity, and if the final-scheme coefficient is confounded, the 9.44–16.17% WP marginal effect inherits the uncertainty; (4) no code, no data.
**Action:** Demote to **ADAPT-with-a-causal-gate**: the NFL port must include drive-level score-differential and WP controls (not just pre-match ranking difference); require the initial-aggressiveness sign to survive with BCa CIs excluding zero. Until then, the 9–16% number is descriptive, not a feature weight.

---

## Weakest claims (coaching/scheme-touching)

1. **Item 16 — RB zone/gap "matrix."** One-game Week-1 samples (a "2.6× league average" from one week of defensive data is Week-1 noise with a multiplier); the 46-RB form invites the over-reading its own "directional-only" flag warns against.
2. **Item 17 — QB first-read "force-feed."** Causal language on one game of third-party charting (the slice's own gaps flag it "intake-grade only, unverified"); game script drives both variables.
3. **Item 5 — Fisher/James-Stein −16.8%.** One season (NFL2016), n=32; the real gate (≥2 of 3 seasons 2023–2025) hasn't run.
4. **Item 1 — β_1=0.769*** as behavioral law.** Partial R² 0.048, N=622 coarse cells, coach examples all fired.
5. **Item 3 — anti-bye fade one-liner.** Overstates the paper (away-bye 52.7%; CI includes market price); no 2024–2026 replication.
6. **Item 15 — 2025 prop slopes as standing weights.** One season of one system's errors — circular if 2025's projections over-extrapolated passing. Needs multi-system, multi-season pooling.
7. **Item 20 — pregame bridge "eligible but NOT published."** Gates on raw binned ECE 0.0519 at n=285 — the slice's own C-290 says a perfect forecaster reads ≈0.09 at n=100; arguably *too conservative*. Re-gate on the debiased estimator; the f2 dedup decision is the real blocker.
8. **Map phrasing: "market prices HA near-perfectly" (0677).** One endpoint-year comparison (2023) presented as settled fact.

**Held up under challenge:** CBTM omitted-covariate (1451), Murphy RES-floor arithmetic (r48), confidence-leak measurement (machine-pinned), 1634 Whitrow O(ε⁴) asymptotics, KellyBench integration-test prescription.

---

## Single strongest challenge — the claim most likely to be wrong

**The −1.75 short-week road penalty, still live in the projection path.** It is the only coaching/scheme claim that is (a) asserted with false precision ("Empirical Domain Characteristics," a docstring range that doesn't match the code), (b) **directly falsified by the program's own backtest** (n=2,622, measured −0.53 ± ~1.0, t=−0.53, vs shipped −1.75 = 3.3× overclaim), (c) still emitting into live projections 4 days after the falsifying evidence landed, and (d) carrying an attached "34% 4Q explosive plays" claim that was never measured anywhere. Every other challenged claim has a gate, a replication plan, or honest caveats between it and production. This one has none.
**Recommendation to the parent:** demote to unweighted observation or variance-only widening; do not wait for the founder rescale.
