# Deep Analyst A4 — Adversarial Challenge Report, Slice c03 (Phase 2)

**Analyst:** Deep Analyst A4 (challenge/adversarial) · **Date:** 2026-10-02
**Method:** read the cited briefs AND the referenced `~/workspace/vendor/Sports/docs/` sources AND the live code, then rendered verdicts with engine actions. This is a stress-test, not a summary.

---

## Part 1 — Contradiction verdicts (with engine action each)

### Contradiction #1 — Short rest: directional adjustment (live, unbacktested) vs variance-only doctrine

**The evidence as of today:**
- The live signal `packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts` still ships the unbacktested magnitudes: **−1.75 baseline**, −0.65 over 1500 miles, −0.35 over 800 miles, −0.50 opponent-rest asymmetry, +0.40 division dampener, +0.60 home-both-short-rest. Docstring asserts "−1.85 to −2.30 points" as "Empirical Domain Characteristics" with no source — note the docstring range doesn't even match the code's −1.75, i.e. the docstring is self-inconsistent.
- A real backtest was run 2026-09-28 (`docs/calibration-proposals/2026-09-28-short-week-road-deficit-backtest.md`; test `src/backtest/short-week-road-deficit.backtest.test.ts`): nflverse games 2015–2024, **n=2,622 games**, graded against the **closing** spread:
  - short-week (≤4 days rest) group n=157: mean vs close **−0.471**, sd 12.206
  - control n=2,465: mean **+0.063**, sd 12.815
  - **Raw differential: −0.534 points. Welch t = −0.53 — not distinguishable from zero.**
- The shipped −1.75 is **3.3× the point estimate**, and the point estimate is statistically zero. The backtest author deliberately did NOT rescale (founder decision), so the unsupported magnitude is still live in the projection path 4 days later.
- The "34% increase in 4th-quarter explosive plays" is recorded in the backtest doc as **UNSUPPORTED** (not testable from the games-level corpus; never measured anywhere).
- The backtest also caught a **self-confirming backtest** bug in its first version (adding the shipped adjustment to observed margins reproduces −1.77 by construction) — worth remembering as a methodology lesson, now fixed.
- The variance-doctrine side (`docs/gse/research-brief-rest-travel.md`) is the weaker of the two evidence-wise: it is a **qualitative Level-1 interpretation brief, draft-only, no formulas, no numbers, owner review required**. Its "wider uncertainty bands" prescription is defensible hygiene but has no measured variance evidence behind it in this slice — and the backtest's own sds (12.206 short-week vs 12.815 control) point, if anything, at *slightly lower* variance on short rest, not higher. The variance claim is not refuted by that comparison (game-level margin variance is dominated by everything else), but it is *not supported* by any measurement either.

**Verdict:** The backtest is the strongest evidence in the room. It does not say "the effect is zero" — it says the effect is **not distinguishable from −0.5 ± ~1.0**, and definitely not −1.75.

**Engine action:** Neither side's prescription survives intact.
1. **Demote the shipped −1.75.** Do not silently rescale to −0.53 (single backtest, wrong to hard-code). Ship one of: (a) a variance-only widening for short-rest spots at weight 0 in the point path, or (b) a −0.5 point estimate **with an explicit wide interval and n=157 caveat logged in the signal's docstring**. 
2. **Retire the "34% 4Q explosive" claim and the docstring's "−1.85 to −2.30" range** — both are unsourced; the docstring range doesn't even match the code.
3. The backtest should be widened (play-level rest data, more seasons) before the magnitude earns a live weight — this is the backtest doc's own recommendation (option c), and it's right.

### Contradiction #2 — Market in the confidence path: exploit vs remove

**The evidence as of today:**
- `session-handoff-2026-09-12`: selective path (δ=0.1, rank on marketFairProb) turned ON; filtered set Brier 0.150, RES 0.041. This is the **ranking/slate layer**.
- `REDTEAM-AUDIT-2026-09-27` Wave 4 (commit `ce4e2b711`, owner-authorized): removed `edgeComponentScore` ("no model in it; it is the vig asymmetry") and `crossMarketScore` from SPREAD/TOTAL confidence; invariance now machine-pinned with **0-movement** tests; MONEYLINE deliberately stays market-anchored (gate `fairProb ≥ 0.58`, MIN_PUBLISH_CONFIDENCE=50 → favorite needs de-vigged fair ≳ 0.83). This is the **published confidence layer**.
- `confidence-market-leak-2026-09-27` documents the original 7-point leak on byte-identical bets (57→50, 61→54), deliberately left unpatched in the production scorer as a labeling problem.
- Code verification today: `confidence-market-independence.test.ts` still pins published-confidence invariance to marketFairProb; `fairProb` still feeds `marketFairProb` in game-context (the ranking layer), and the test header explicitly describes this two-layer arrangement.

**Verdict:** There is no real contradiction — the two briefs describe **two different layers**, and the redteam resolved the apparent conflict in code. The map's INFERENCE ("marketFairProb belongs in the ranking/slate layer, not in published confidence") is confirmed by the current codebase.

**Engine action:**
1. **Keep the split:** marketFairProb in the slate/ranking layer (selective δ path); published `confidence` market-independent for SPREAD/TOTAL with the 0-movement pin in place.
2. **Do not let the MONEYLINE market anchor become precedent for spread/total.** The `fairProb ≥ 0.58` moneyline anchor is a documented founder choice, not an empirically validated calibration gain — if anyone proposes re-anchoring spread/total, they must re-run the leak measurement first.
3. The confidence-leak `it.fails` guards are now inverted pins (fail on fix); keep them green — they are the machine-checked proof this stays resolved.

### Contradiction #3 — Which gate statistic binds: Brier vs ECE

**The evidence as of today:**
- `CALIBRATION_GATE_SCALE_2026-09-06` is a measurement, not an opinion: a **constant 0.69 forecaster clears Brier 0.22** (UNC=0.2139); RES has **no floor**, so a zero-skill base-rate forecaster reads GREEN; the Murphy REL floor 0.05 is 4.47× looser than ECE's 5-point band. This is arithmetic, not model-tuning.
- `LEVERAGE_LOOP_2026-08-10` operationalizes Brier ≤ 0.22 with live snapshot n=339, Brier 0.2467, ECE 0.0387, Murphy RES live ≈ **0.002** vs ~0.03–0.05 needed — and correctly diagnoses the binding problem as **resolution lift, not reliability**: monotone transforms cut REL only; only new conditioning information creates RES.
- `path-to-70` repeats the Brier/ECE floors as the publish gate.

**Verdict:** The r48 critique wins on arithmetic. Brier 0.22 cannot reject a constant forecaster — it is a floor, not a skill test. LEVERAGE_LOOP's own snapshot (RES ≈ 0.002, needs 0.03–0.05) shows the program already knows the truth: the binding constraint is resolution, and Brier-as-operationalized-target is being gamed by REL-only improvements.

**Engine action:**
1. **Add the RES floor** (≥ ~0.03, debiased) as the binding gate constraint — a zero-skill forecaster must read RED.
2. **Gate ECE on the debiased estimator** `Σ_k w_k √(max(0, g_k² − v_k))`, not raw binned ECE — the slice's own ledger (C-290) shows a perfect forecaster reads ≈0.09 at n=100, so raw ECE gates punish small samples mechanically.
3. Keep Brier ≤ 0.22 as a guardrail, but stop treating "projected Brier under 0.22" as evidence of skill; the metric that unlocks publishing is RES lift (new conditioning information), per LEVERAGE_LOOP's own standing doctrine.

### Contradiction #4 — CLV blocker: model problem vs data-quality problem

**The evidence as of today:**
- session-handoff-2026-09-12: CLV beat-close **23.0% vs 52.4%** required = "a model problem, not a gate problem."
- `AGENT_LEDGER` brief confirms the line-integrity defect class: **355/725 MLB spreads were off-ladder arithmetic means** (fingerprints like −1.375, −1.4375); **73% of TOTAL picks** graded on a line ≠ the displayed line (34 outcome-flipping); **69.5% of settled picks lack an ESPN event id** and are unauditable; 297 settled ML picks with bookmakerCount=0 (no recoverable price ever existed).
- `deepseek-adversary-round3` ranks **CLV close contamination (stale/model-derived/non-executable closes) as the #1 false-certification mode** (0.30×0.95), ahead of slate dependence and exploratory leakage. Its prescription: monitor must reject any close not a real executable timestamped price from a sharp book, cross-checked across books.

**Verdict:** The line-integrity evidence is the stronger side, and it changes the reading of the 23.0%: that number was measured on a corpus where the grading line differs from the displayed line on ~¾ of totals and most picks are unauditable. "Model problem" is an unidentified claim when the ruler is broken. However — and this is the adversarial point — the ledger's defects mostly *flatter* the record (~3.8 pts on the off-ladder means; 34 outcome-flipping totals), so fixing the ruler likely makes CLV look *worse*, not better. The two claims compose: data quality is the blocker for *measurement*, and the model has no demonstrated edge either way until the ruler is fixed.

**Engine action:**
1. **Fix the ruler before re-litigating "model vs gate":** ship only quoted-ladder lines (`isPublishableSpreadLine`, published-line snapping, write-once bet terms are the guards); grade on ESPN event-id evidence only; re-run CLV beat-close on the clean subset.
2. Adopt the redteam's poison fix as a standing rule: `entryPrice ?? null` — a pick with no entry price has **no CLV**, never a fabricated-price CLV.
3. Until CLV is remeasured on executable closes, no CLV-based claim (model problem *or* edge) is evidence-grade. Both positions are currently hypotheses.

---

## Part 2 — Verdict stress-tests

### Stress-test A: Does 1575's τ transfer to 2026 coaches?

The estimand is sound (inverse-optimization, 200 game-level bootstraps, bootstrapped CIs, code released, 9 seasons nflfastR). The *portability to 2026* has four problems:

1. **The headline coach-level heterogeneity is measured on fired coaches.** The four named examples of risk-seeking-vs-bot behavior in the opponent half — **Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson** — are all out of NFL head-coaching jobs in 2026. This is selection bias in the presentation layer: the most extreme τ̂ coaches are the ones who got fired, so the 2026 active-coach τ distribution is systematically compressed relative to the paper's headline examples. The *estimand* transfers; the *intuition from the examples* does not — no current coach should inherit a narrative built on fired ones.
2. **τ̂ is stale by construction.** The paper's own limitation section notes the league-wide aggression trend 2014–2022 means 2023–2026 τ̂ would be higher. The brief's action says "refit each offseason (stale τ̂ systematically underrates aggression)" — that is not a nice-to-have, it's the whole battle: NFL coaching turnover is ~5–8 new HCs/year, and each new HC arrives with τ̂=undefined. A league-average τ prior for new coaches inherits the 2014–2022 aggression deficit.
3. **Circularity is acknowledged, not solved.** WP estimates (Carl & Baldwin tree) price in coaching tendencies — the stratification variable is contaminated by the thing being estimated. The paper calls this "mild circularity"; mild is doing a lot of work there. It biases τ̂ toward the reference (the Bot also uses WP), compressing measured heterogeneity.
4. **Effect size is small.** β_1=0.769*** sounds strong; partial R²=0.048 says τ̂ explains ~5% of 4th-down points variance at the coach-season-WP-region cell level (N=622 coarse cells). The "0.4 wins/year" cost figure is Yam & Lopez 2019's citation, not measured here. The brief's acceptance gate (≥3pp Hamming accuracy over risk-neutral in the opponent half on 2024–2025) is the right shape — but it must be run on refit 2023–2025 τ̂, not the paper's 2014–2022 estimates, or it will credit stale numbers.

**Action:** ADAPT stands for the *estimand* and the pipeline (`gse_coach_risk.py` on nflverse 2014–2025, 200 game-level bootstraps), with two conditions: (a) annual refit + a documented league-prior for new coaches (never borrow a fired coach's τ̂), (b) the Hamming-accuracy gate runs on 2024–2025 data only, evaluated against a refit baseline.

### Stress-test B: Does 0677's anti-bye fade survive the market having 3 more years of data?

The structural estimate is honest (5,679 games, Bayesian state-space, posteriors on the decline P=96.6%). The *betting action* — fade teams getting >0.97 pts of market bye credit — has three decay vectors:

1. **The market moved the wrong way once; it can move again.** Post-2011 market pricing went +0.39 → +0.97 while reality went +2.21 → +0.31. The paper's data ends 2023. If 2024–2026 books have repriced (and Pinnacle-style markets update priors continuously), the ~0.66 pt gap is a *measured 2023 artifact*, not a law. The ADOPT gate in the map ("permanent if replication confirms post-2011 bye PD < 1.0 with market pricing ≥0.5 pts above it") correctly anticipates this — but no replication on 2024–2026 is cited anywhere in the slice.
2. **The map's own "edge flipped anti-bye" phrasing overstates the paper.** Cover rates 2011–2023: home 44.6% (fade-able, below 52.4% break-even) but **away 52.7% — still positive.** A blanket anti-bye fade eats the away-side profit. The action must be home-bye only, or home/away-split, which the map's one-liner doesn't say.
3. **The post-2011 PD estimate is +0.31 with CI (−1.01, +1.64).** The CI includes effects larger than the market's +0.97 pricing. P(decline)=96.6% is about the *change*, not about the level being exploitable. At the top of the CI, the fade loses money.

**Action:** ADOPT-with-gate stands, but the replication must be run on **2023–2026 market pricing vs outcomes** before any live fade, and the fade is **home-bye only** until away-side evidence exists. The current map line over-promises.

### Stress-test C: Does 1638's aggressiveness template generalize from its sample?

1638 (`docs/arxiv-program/research/2026-09-21/arxiv-deep/1638-coaching-tactics-home-advantage-serie-a.md`, arXiv:2509.22683, ADAPT) — the weakest of the three under adversarial light:

1. **It is a soccer paper, and old soccer.** 1,140 Serie A matches from **2011/12–2013/14** — tactics from 12–15 years ago, hand-coded from *commentary text*, not tracking. The NFL analog (pass-rate-over-expectation as "offensiveness index") is a far noisier construct than formation roles (defenders×1 + midfielders×2 + forwards×3), and modern NFL play-calling heterogeneity dwarfs 2012 Serie A formation variance.
2. **No out-of-sample prediction.** The paper is inference-only (triple-outcome triangulation, AIC/BIC selection, BCa CIs). Model 2 accuracy 0.75 is *in-sample*. The GSE improvement spec (triple-outcome panel on 2020–2024 NFL) is the actual evidentiary test and has not been run.
3. **The headline asymmetry smells of reverse causality.** Initial scheme: +0.30 goal diff (aggressive openings good). Final scheme: **−0.25/−0.50/−0.49** (aggressive closings bad). A negative coefficient on *final* aggressiveness is exactly what trailing teams do — they push attackers forward when losing. The authors' endogeneity caveat (coach assignment endogenous) doesn't cover *within-game* scoreboard endogeneity, and team fixed effects absorb persistent heterogeneity, not minute-level game state. If the final-scheme coefficient is confounded by score state, the initial-scheme coefficient is vulnerable to the same family of confound (strong teams can afford aggressive openings; ranking-difference control (+1.47, p<0.001) is a pre-match proxy, not a minute-level state control). The 9.44–16.17% WP marginal effect inherits this uncertainty.
4. **No code, no data.** "Reconstructable in principle" from public commentary is not reproducible.

**Action:** Demote the ADAPT to **ADAPT-with-a-causal-gate**: the NFL port (triple-outcome panel, 2020–2024) must include minute/drive-level **score-differential and WP controls** (not just pre-match ranking difference) before any marginal-effect claim is believed; require the initial-aggressiveness sign to survive those controls with BCa CIs excluding zero. Until then the 9–16% number is descriptive, not a feature weight.

---

## Part 3 — Weakest claims in the top-20 touching coaching/scheme

Ranked by likelihood of being wrong or misleading, with what's wrong:

1. **Item 16 — RB zone/gap scheme-matchup matrix (weakest).** One-game Week 1 samples presented as a "matrix": Bijan Robinson "57% zone vs CAR 124.9 zone yards allowed (2.6× league avg)", Hampton "75% zone into LV's 11.7". A "2.6× league average" from *one week* of defensive data is Week-1 noise with a multiplier on it; sub-10-attempt splits are admitted "directional-only" but the matrix's *form* (46 RBs × opponent) invites exactly the over-reading the flag warns against. The action line ("use rolling-season rates") is the honest version — the item as presented is not.
2. **Item 17 — QB first-read/aggressiveness → WR concentration.** Love 78.6% first-read, Stroud 21% aggressiveness "force-feed combo" — causal language ("force-feed") on **one game of third-party charting** (@GridironInfo X-metric dumps, which the slice's own Gaps section flags as "intake-grade only, unverified"). Single-week charting rates are wildly unstable; the correlation-to-causation jump ("high first-read + high aggressiveness = force-feed") ignores that Q1 game script drives both.
3. **Item 5 — Fisher/James-Stein shrinkage, −16.8% NFL win% MSE.** The headline number is **one season (NFL2016)**, n=32 teams, via parametric blocked bootstrap. The semi-synthetic −51% is a simulation. Early-season small-data is exactly where this should help, but the gate (≥2 of 3 seasons 2023–2025) is the real test and hasn't run. Presented as validated; it's pre-registered.
4. **Item 1 (τ) — the "β_1=0.769***" as behavioral law.** Partial R²=0.048, N=622 coarse cells, and the coach examples are all fired (see Stress-test A). The number is real; its portability to 2026 coaching decisions is the weak link.
5. **Item 3 (0677) — the anti-bye fade one-liner.** Overstates the paper (away-bye still covers 52.7%; CI includes the market's price) and has no 2024–2026 replication (see Stress-test B).
6. **Item 15 — 2025 prop regression slopes as standing weights.** Passing slope 0.623 (n=583), rushing 0.837, etc. — these are **one-season** slopes from the 2025 projection system, which itself may be the thing that's miscalibrated. "Ready-to-use shrinkage weights" from a single season of one system's errors is circular: if 2025's projections over-extrapolated passing, the slope corrects *that system's* 2025 bias, not a universal truth. Needs multi-system, multi-season pooling before it's a standing weight.
7. **Item 20 — pregame bridge "eligible but NOT published."** The honesty framing is right, but the ECE 0.0519 it gates on is **raw binned ECE at n=285** — the slice's own C-290 result says a perfect forecaster reads ≈0.09 at n=100, i.e. raw binned ECE is upward-biased and the debiased estimator would read lower. The "eligible" call is arguably *too conservative* under the slice's own estimator doctrine — a rare case where the bias cuts toward humility. Gate on the debiased estimator and re-evaluate; the f2 deduplication decision (the real blocker) is the one that matters.
8. **Cross-item: the map's "market prices HA near-perfectly" (0677, 2023 PD +1.65 vs market +1.74).** One endpoint-year comparison presented as a settled fact; HA declined ~1 pt/game over the period while markets tracked it — the *tracking* is the impressive claim and it's supported, but "near-perfectly" on a single year invites over-trust in current HA pricing.

**Not weak (held up under challenge):** the CBTM omitted-covariate result (1451, theory + NBA validation), the Murphy RES-floor arithmetic (r48), the confidence-leak measurement (machine-pinned), the 1634 Whitrow O(ε⁴) singles result (asymptotics, not data), the KellyBench integration-test prescription (process, not claim).

---

## Single strongest challenge (the claim most likely to be wrong)

**The −1.75 short-week road penalty still live in the projection path.**

It is the only claim in the coaching/scheme set that is (a) asserted with false precision ("Empirical Domain Characteristics," docstring ranges that don't match the code), (b) **directly falsified by a real backtest** on 2,622 games (measured −0.53 ± ~1.0, t=−0.53, vs the shipped −1.75 = 3.3× overclaim), (c) still emitting into live projections 4 days after the backtest because the rescale was deferred as a "founder decision," and (d) carrying an attached "34% increase in 4th-quarter explosive plays" that was never measured anywhere and is now on record as UNSUPPORTED. Every other challenged claim has a gate, a replication plan, or honest caveats standing between it and production. This one has none — it's live, it's wrong by a factor of ~3, and the evidence killing it was produced by the program's own backtest discipline. Demote to unweighted observation or variance-only widening today; do not wait for the founder rescale.
