# A5 Synthesis — Corpus Slice c03 (Phase 2)

**Analyst:** Deep Analyst A5 (synthesis)
**Slice:** c03 — 300 files, 352 briefs (aggregators A0–A3)
**Written:** 2026-10-02
**Read first:** `~/workspace/corpus-intelligence/maps/c03-map.md` (full), `~/workspace/coaching-tendencies/code/compute_tendencies.py`, `~/workspace/coaching-tendencies/profiles/monken.md`, `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md` §5

This document connects, not lists. Each thread composes findings from multiple briefs into something bigger than any one brief, then maps the slice onto the coaching engine's concrete needs.

---

## THREAD 1 — The coaching adjustment-detection system

**Briefs involved:**
- `coaching-tendencies/profiles/monken.md` — Monken's quick-game shift (quick_game_rate 0.476 → 0.639, avg_air_yards 8.33 → 6.12, BAL→CLE 2026), the OL-injury compensation measured in Weeks 1–3 data that predicted the TNF outcome (Watson 14/17, 0 sacks, first half).
- r33/1905 (ADKL): task embedding z^t drift week-to-week as an *unsupervised regime-shift / scheme-change detector*; regime-conditioned similarity (rookie-QB/new-HC team-seasons weight priors differently).
- r04/0236 (doubly-online changepoint): P(changepoint) monitor on weekly series; team-level variant triggers model refits instead of fixed windows; covariate-dependent λ (injury history, snap load) as future work.
- r27/1575 (τ risk preferences): league risk tolerance *rose 2014–2022 in every WP×region cell* — a secular drift in the exact tendency the pipeline measures as go4th_rate.
- r43/full-tables README: 2026 league 2nd-&-1 pass rate 32.7% vs 20.6% in 2025; Ben Johnson "pass heaviest 2nd and 1 coach this century"; team splits (Panthers 87.5% pass after successful 1st-down run, Jets 0.0%).

**Composed insight:** These five findings are the five components of one system — a standing **coaching adjustment-detection engine** — and none of them is useful alone at the cadence the engine needs:

1. **Fingerprint** (what the pipeline already computes): per-coach team-season tendency rows — the Monken profile is the worked template: YoY deltas, team-switch deltas, league-relative z-scores.
2. **Drift alarm** (1905): z^t embedding over (game-context, EPA-margin) pairs per team-season; drift in z^t week-to-week flags *that something changed* without naming it. The reader's regime-prototype memory (INFERENCE) is the improvement: anchor the 2-game z^t against learned archetype prototypes (rookie-QB, new-HC, backup-QB regimes).
3. **Changepoint trigger** (0236): P(changepoint) > δ on the weekly tendency series (quick_game_rate, pass_rate_early, air-yards distribution) — this is the alarm that *fires mid-week*, naming the week and the metric. Its acceptance gate is already written (beat CUSUM on F1 vs injury/role-change ground truth 2019–2023, ≤2 flags/team-week).
4. **Aggression thermometer** (1575): τ̂ per region×WP tells you *which direction* the drift is going — Monken's go4th_rate 0.131 → 0.250 monotonic is the league-wide aggression trend (2014–2022, every cell) landing on one coach's card.
5. **Situational layer** (2nd-&-1 splits): the tendency that lives *below* the season aggregates — per-coach, per-situation fingerprints (Ben Johnson on 2nd-&-1) that the pipeline never computed because it stopped at down/distance/field/WP splits.

**What it enables:** (a) Mid-week regime-change alerts: "OC X's quick-game rate moved +12pp over 3 weeks; z^t drift exceeds threshold; historical comps: Monken 2026 CLE (OL-injury compensation)" — delivered *before* the market prices it. (b) Opponent-scout previews generated from the fingerprint + situational layer ("this DC's team allows 50% pressure but the OC throws it in 2.3s — the pressure won't land," the exact TNF miss). (c) The reasoning spec's Track 2 checklist answering "checked" with *current* numbers and a staleness flag — a profile that hasn't been drift-checked is a DATA-GAP, not a CLEAR. The Monken TNF case is the system's proof of concept: the adjustment was measured pre-kickoff in exactly the data this system would monitor; the failure was that nothing watched the series.

---

## THREAD 2 — Fourth-down τ replaces go4th_rate (and resolves the intake NULL)

**Briefs involved:**
- r27/1575: τ̂ per coach-team × field region × WP bin, 200 game-level bootstraps, 95% CIs. League conservative nearly everywhere; τ̂_opponent-half − τ̂_own-half > 0 until WP ≥ 0.8; ~half of coaches risk-seeking vs risk-neutral in the opponent half at low WP (Nagy, Gruden, McCarthy, Pederson exceed the 4th Down Bot); performance regression β_1(τ̂) = 0.769*** (SE 0.138), partial R² 0.048 — higher τ̂ → more average points gained; conservatism costs ~0.4 wins/year (Yam & Lopez 2019). Code released (github.com/nsandholtz/fourth_down_risk).
- `compute_tendencies.py`: `go4th_rate` — raw go/(go+punt+FG) per team-season, no region or WP stratification, team-attributed not coach-attributed.
- r56/reverse-engineering-intake: "Rank 9 fourth-down aggressiveness coaching prior: measured, walk-forward r = −0.014 on 255 games; rate stored, does not move the tilt."

**Composed insight:** There is an *apparent* contradiction here that dissolves on inspection — and the dissolution is the upgrade path. The intake NULL (r = −0.014) says a **raw team-season go-for-it rate does not tilt game outcomes**; 1575's β_1 = 0.769*** says **region×WP-binned τ̂ predicts 4th-down points gained**. Different estimands, different questions: outcome-tilt vs decision-quality. Both can be true, and both should live in the codebase coherently: keep the NULL where it belongs (do not put a go4th tilt into the game-outcome blend — the intake was right to leave it out), and wire τ̂ where *it* belongs (the 4th-down GO/FGA/PUNT decision classifier and the live-WP model, where the estimand is decision-level, not game-level).

The composition goes further. 1575's heterogeneity pattern is the attribution key the pipeline lacks: own-half τ̂ is *uniform across coaches* (not a fingerprint), opponent-half τ̂ is *widely varying* (the fingerprint lives there). So the upgrade is not "add a column" — it is: replace the single `go4th_rate` with `tau_own_half` / `tau_opp_half` (optionally × WP bins), coach-attributed via `coach_offense.csv`, with 1575's own publication gate enforced in-code (≥25 observed 4th-down decisions per region per WP range, else NaN — see Contradictions §3). The acceptance gate is already specified: team-specific τ̂ rule beats risk-neutral WP-max by ≥3pp Hamming accuracy in the opponent half on 2024–2025 4th downs. **What it enables:** a genuine 4th-down decision module (predict what the coach *will* do, not what he should), coach-specific live-WP edges on 4th-down plays, and opponent-tendency content with bootstrapped CIs instead of vibes.

---

## THREAD 3 — The regime-change response system (detect → respond)

**Briefs involved:**
- r37/2129 (ProbFM NIG): epistemic uncertainty = β/((α−1)·λ) from a single forward pass; epistemic → abstain/min-stake; **hard gate: REJECT if epistemic does not rise on held-out regime-shift games** (new-QB/new-coach). Crypto analog: Sharpe 1.33 vs 0.90.
- r07/0677 (bye mispricing): the post-2011 CBA *structural break* — bye PD effect fell +2.21 → +0.31 while the market priced it the wrong way (+0.39 → +0.97); markets overvalue the post-2011 bye by ~0.66 pts; the anti-bye fade is a standing edge. This is a regime change the market failed to detect for 12+ years.
- r28/1611 (in-play gap): markets move only ~6.4pp per 10pp of benchmark win-prob change (β=0.638); the residual Gap predicts 5–15 min drift (net ρ up to 0.484); executable-midpoint discipline; liquidity-gated blending.
- r05/0487 (Trace live WP): Bayesian shrinkage kappa *decays 640→160→40 as live evidence accumulates* — the shrinkage schedule is itself a regime response: trust the prior early, the data late.
- r56/morning-2026-09-27: pregame bridge holdout (Brier skill +0.026190, 95% CI excludes 0, P(skill>0)=0.9997 — eligible but NOT published pending the f2 dedup decision); officials scalarizer killed DARK (r=+0.0274, |r|≥0.08 fails).

**Composed insight:** These are not five separate findings; they are one closed loop — **detect the regime change, then respond to it** — and the slice contains every stage:

- **Detect:** 2129's epistemic rise on new-QB/new-coach games + 1905's z^t drift (Thread 1's alarm) are two independent sensors for "the model is operating outside its trained regime." The 0677 bye break is the cautionary tale for what happens when detection is absent: twelve years of mispricing because nobody re-estimated after the CBA changed the data-generating process.
- **Respond:** three calibrated responses, each with its own gate: (1) *Abstain/shrink* — ProbFM epistemic → min-stake or no-publish; Trace's kappa schedule (640→160→40) is the continuous version: widen the prior's grip when evidence is thin, release it as live data arrives. (2) *Blend by liquidity* — 1611's Gap→drift blender: trust the market in liquid states, the model in thin states; the functional form transfers, the NBA coefficients do not (NFL β must be measured on nflverse play-by-play). (3) *Fade the market's stale regime* — the 0677 anti-bye fade: when the market prices a pre-break regime, bet the post-break reality.
- **The morning-brief pair is the governance layer:** the pregame bridge shows a module can be *eligible but not published* (skill measured, dedup gate unresolved — the two-gate discipline), and the officials kill shows a measured NULL stays DARK rather than shipping as a feature. Regime response without this governance is just another way to overfit.

**What it enables:** the engine *knows when it doesn't know*. Monken-to-CLE, rookie-QB starts, post-CBA-style structural breaks — all land in the same handling path: epistemic alarm → shrinkage/abstain → liquidity-gated blending → publish gate. This is the operational form of the reasoning spec's DATA-GAP verdict: "we have no usable model for this regime" becomes a first-class, measured state instead of a silent extrapolation.

---

## THREAD 4 — Coach-QB attribution decomposition (whose fingerprint is it?)

**Briefs involved:**
- `coach_offense.csv`: playcaller-attributed team-season rows already exist (Monken, Fangio, Joseph, McCarthy, McVay, Shanahan profiles) — the attribution *scaffolding* is in place.
- `monken.md`: the BAL→CLE 2026 natural experiment. Which deltas traveled with the coach vs stayed with the team? quick_game_rate +0.121 and pass_rate_early +0.138 moved *with the team switch* (roster/QB-driven or scheme-adjustment-driven — the profile argues compensation for Watson + patchwork OL); go4th_rate's monotonic climb 0.131→0.250 spans *both* tenures (coach-driven secular trend, matching 1575's league-wide rise); shotgun_rate's collapse −0.199 happened *inside Baltimore* (roster/structure-driven, pre-dating the move).
- r27/1575: own-half τ̂ uniform across coaches (not attributable), opponent-half τ̂ heterogeneous (attributable) — the *existence proof* that some tendency dimensions are coach-signal and others are noise/system.
- r57/wr-phase2: QB-level rates (first-read %, aggressiveness %) concentrate targets *within* whatever scheme the coach calls — Love 78.6% first-read → Watson/Golden; Stroud 62.2% + 21% aggressiveness → Boutte X-role. These are QB-attributed, not coach-attributed.
- c03-map Gaps: "HC-vs-OC attribution — nothing"; "QB↔OC fit … named as strategy-doc signals with no deep-read brief behind them."

**Composed insight:** The coaching lane's single biggest gap (HC-vs-OC attribution: *nothing*) has an estimation strategy sitting in the slice, unassembled. The fingerprint decomposes as **fingerprint = coach_component + QB_component + roster/system_component**, and the slice provides all three estimators: (1) *Coach component*: coach-change natural experiments (Monken BAL→CLE; the 1905 z^t drift across the change quantifies how much of the old fingerprint died) + 1575's heterogeneity test (dimensions where coaches vary = coach-attributable; where they're uniform = not). (2) *QB component*: QB-change experiments + the wr-phase2 QB-level rates (first-read, aggressiveness) that move with the passer. (3) *Roster/system*: the residual — what neither coach-change nor QB-change explains (shotgun_rate's Baltimore-internal collapse lives here).

**What it enables:** the question the engine must answer before it trusts any tendency — "is this the coach or the quarterback?" When a coordinator gets hired (Monken to CLE), the engine can project *which* tendencies travel: go4th aggression travels (coach-secular), quick-game rate re-optimizes to the new roster (system), first-read concentration follows the QB. Without this decomposition, every coordinator change is a cold start; with it, the engine carries forward the coach-attributable half on day one and relearns only the rest. (Flag: the decomposition itself is INFERENCE from the assembled evidence, not a measured result — it needs the formal estimation run on coach-change/QB-change season pairs, 2014–2026.)

---

## ENGINE-NEEDS MAPPING

### (a) Team tendency computation — in the pipeline vs missing

**Already in `compute_tendencies.py`** (team-season, nflverse 2022–2026): pass-rate splits by down (1/2/3, early), distance (short/mid/long), field (own/midfield/red-zone), WP state (trailing/leading); shotgun_rate; no_huddle_rate; go4th_rate + n_4th; two_pt_rate + n_td; air-yards distribution (avg, quick_game_rate ≤5, deep_rate ≥20); pace_sec_median; defensive pressure proxies (sack/hit/TFL rates, with blitz/man/zone/shell honestly NaN); playcaller-attributed `coach_offense.csv`.

**Missing — and the slice supplies the spec for each:**
1. **τ̂ per region×WP (Thread 2):** the strict upgrade of `go4th_rate`. Estimand, code URL (nsandholtz/fourth_down_risk), gate (≥3pp Hamming over WP-max), and refit cadence (each offseason — stale τ̂ underrates aggression per the 2014–2022 trend) are all in r27/1575.
2. **Situational splits beyond 4th down:** 2nd-&-1 pass rate (32.7% league 2026 vs 20.6% 2025; per-coach extremes: Ben Johnson heaviest, Panthers 87.5% after successful 1st-down run, Jets 0.0%) and sequencing splits (post-incompletion, post-stuffed-run) from the Paganetti X sweep — flagged "never wired as standing engine features" in the map. Computable from the same nflverse pbp the pipeline already loads.
3. **Drift/change monitoring (Thread 1):** no z^t (1905) or changepoint (0236) monitor on the tendency series; the pipeline recomputes season aggregates but never asks "did this coach change mid-season."
4. **Play-action / RPO rates:** only week-2 snapshots (WAS RPO 14.7%); not in nflverse pbp as columns — needs charting or derivation; listed as the biggest named-lane gap in the map.
5. **Aggressiveness as a named Strategy factor (0936 Ω):** the pipeline has pace + go4th_rate + quick/deep as separate columns; 0936's packaging (Skill/Strategy/Experience named factors, QB as max-candidate) is the presentation/composition layer for publishable breakdowns.
6. **Motion rate** (LAC 84.3% week-2 snapshot): not in nflverse; charting/tracking only. Documented honestly in DATA_GAPS.md.
7. **Rest/travel direction:** contradiction #1 in the map (directional −1.75 adjustment live/unbacktested vs variance-only doctrine) — unresolved; the pipeline has no rest/travel features at all.
8. **In-game behavior** (timeouts, challenges, halftime adjustments, aggression shifts): nothing anywhere — slice and pipeline alike.

### (b) Coordinator fingerprints — what the slice provides for per-coach attribution

- **Scaffolding exists:** `coach_offense.csv` attributes every team-season row to a playcaller (coach + role columns); six profiles built (Monken, Fangio, Joseph, McCarthy, McVay, Shanahan); YoY-delta format is the fingerprint template.
- **1575 gives the coach-level estimand:** τ̂ with ≥25-decision publication gate, bootstrapped CIs, and the heterogeneity result that separates coach-signal dimensions (opponent-half) from non-signal (own-half). Named coach values: Nagy, Gruden, McCarthy, Pederson risk-seeking in opponent half at low WP.
- **Monken gives the worked natural experiment:** the BAL→CLE switch decomposes the fingerprint into traveling vs non-traveling components (Thread 4).
- **Still missing:** HC-vs-OC split when the HC isn't the playcaller (Monken 2026 CLE is "presumed"); in-game behavior; coordinator-change regime effects *measured* (1905/1888/2129 are pre-registered specs, not runs); scheme signatures beyond pass/air-yards rates (personnel, formations, motion — charting-gated); any DC-side fingerprint beyond pressure proxies (blitz/man/zone/shell all NaN by documentation).

### (c) Reasoning-depth spec §5, Track 2 ("Coaching / scheme tendencies") — what "checked" needs

The spec defines "checked" as: *HC + OC/playcaller + DC profiles loaded; YoY deltas; situational fingerprints (early-down pass, 4th-down aggression, quick-game rate).*

| Requirement | Status |
|---|---|
| Playcaller profiles with YoY deltas | ✅ 6 profiles; `coach_offense.csv` + `off_tendencies.csv` league context |
| 4th-down aggression per coach | ⚠️ Raw `go4th_rate` only; τ̂ (region×WP, CIs) specified but unwired — Thread 2 |
| Situational fingerprints | ⚠️ Down/distance/field/WP splits yes; 2nd-&-1 + sequencing splits no — Thread 1 item 5 |
| DC profiles | ⚠️ `coach_defense.csv` exists but only pressure proxies; blitz/coverage/shell are documented NaN → must return DATA-GAP, never NOTHING-MATERIAL |
| Freshness / staleness | ❌ No drift monitor; a profile from Week 3 answers "checked" in Week 12 with no alarm — Thread 1's 1905/0236 layer |
| QB↔OC interaction | ⚠️ wr-phase2 QB rates exist as research; not joined to coach profiles — Thread 4 |
| Worst-plausible assumption on gaps | ✅ DATA_GAPS.md gives the honest inventory the L4 adversary needs |

The TNF post-mortem's lesson restated in checklist terms: Track 2 *was* checkable pre-kickoff (Monken 0.639 quick-game sat in the profile) — the data layer was CLEAR; the failure was the reasoning layer never walking the hall. The checklist needs the drift alarm and the τ̂ upgrade to stay CLEAR as the season moves.

---

## CONTRADICTIONS / DUPLICATIONS WITH THE EXISTING PIPELINE

**1. Apparent contradiction — RESOLVED (not a real conflict).**
r56/reverse-engineering-intake: fourth-down aggressiveness prior, walk-forward r = −0.014 on 255 games → "coaching decisions add no predictive tilt" (left out of the game-outcome blend). r27/1575: β_1(τ̂) = 0.769*** → higher risk tolerance predicts more 4th-down points gained. **Resolution:** different estimands. The NULL is about a raw team-season rate tilting *game outcomes* — keep it out of the outcome blend, the intake was right. The 1575 result is about binned τ̂ predicting *4th-down decision quality* — wire it into the decision classifier and live-WP, not the pregame blend. Both statements survive; they govern different modules.

**2. Duplication — UPGRADE (slice strictly improves the pipeline).**
Pipeline `go4th_rate` (raw, team-season, unstratified, no uncertainty) vs 1575's τ̂ (region×WP-binned, coach-attributed, 200 bootstraps, publication gate). The pipeline column is a degraded version of the slice's estimand. Action: augment/replace with `tau_own_half`, `tau_opp_half` per the 1575 spec. Note the 1575 staleness warning cuts *in favor of* the pipeline's window: τ̂ must be refit on recent seasons because league aggression rose 2014–2022 — the pipeline's 2022–2026 nflverse window is the right estimation sample; a τ̂ fit only on 2014–2022 would systematically underrate current aggression.

**3. Duplication — FORMALIZE (both sides already agree; make it a rule).**
`monken.md` Limits: "2026 is 3 games (164 plays) — two_pt_rate (0.200 on 5 TDs) and go4th_rate (24 4th downs) are especially noisy." 1575's methods: coach plots restricted to ≥25 observed 4th-down decisions per region per WP range. **Same gate, stated twice, enforced nowhere in code.** By 1575's own standard, Monken's 2026 CLE τ̂ is unpublishable today. Action: encode the n-floor in `compute_tendencies.py` (emit NaN + small-sample flag below the floor; the profile already hand-flags it — make it mechanical).

**4. Tension — SPEC TEST LANGUAGE vs DATA REALITY.**
The reasoning spec's T1 breaking condition is written as `TTT > 2.6s or quick-game < 0.55`. TTT (time-to-throw) is documented UNAVAILABLE in nflverse (DATA_GAPS.md §6: "quick_game_rate … is NOT time-to-throw"). The test as written mixes a measurable proxy with an unwired metric. Action: restate T1's breaking condition in `quick_game_rate` terms only until the NGS TTT build (map: 12 NGS metric builds with adoption gates) lands; do not let a test assert on a column the pipeline cannot produce.

**5. No numeric contradictions found.** The pipeline's Monken numbers match `monken.md` exactly (same computation, verified against `coach_offense.csv` — e.g., 2026 CLE quick_game_rate 0.6386, avg_air_yards 6.1205). The 2nd-&-1 splits (32.7% league 2026) describe a different situation than any pipeline column and do not conflict with them. Week-2 motion/RPO snapshots (LAC 84.3%, WAS RPO 14.7%) measure things the pipeline doesn't attempt. The map's internal contradictions (short-rest direction, market-in-confidence-path, Brier-vs-ECE) touch schedule/model layers, not the tendency computations.

**Net assessment:** the slice does not overturn anything the pipeline computed — it *upgrades the estimands* (τ̂ over go4th_rate), *adds the missing layers* (situational splits, drift monitoring, attribution decomposition), and *formalizes the gates* (n-floors, DATA-GAP honesty) the pipeline already gestures at. The pipeline is the fingerprint; the slice is the nervous system around it.

---

*Strongest thread, in the analyst's judgment: **Thread 1 — the coaching adjustment-detection system.** It is the only thread that converts the TNF post-mortem's exact failure ("the data was in the building, nothing walked it down the hall") into standing machinery, it has a worked proof-of-concept (Monken Weeks 1–3 → TNF), every component carries a numeric acceptance gate already written in the briefs, and it directly serves the reasoning spec's Track 2 checklist — which is currently checkable only as a snapshot, never as a monitored system.*
