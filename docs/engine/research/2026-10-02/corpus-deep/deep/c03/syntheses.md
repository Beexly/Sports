# Syntheses — Corpus Slice c03, Coaching Lane (Phase 2)

**Written:** 2026-10-02 · **Coordinator synthesis** of working report A5 (`deep/c03/working/A5-syntheses.md`).
Cross-checked against `~/workspace/coaching-tendencies/` (compute_tendencies.py, coach_tenures.py, profiles/monken.md) and the reasoning-depth spec's Track 2 checklist.

---

## Thread 1 — The coaching adjustment-detection system

**Briefs:** monken.md (profile) + 1905 (ADKL z^t drift) + 0236 (doubly-online changepoint) + 1575 (aggression trend) + Paganetti 2nd-&-1 splits.

**Composed insight:** Five findings are the five components of one standing machine, and none is useful alone at the cadence the engine needs:

1. **Fingerprint** (pipeline already computes): per-coach team-season tendency rows. The Monken profile is the worked template — YoY deltas, team-switch deltas, league z-scores. His Weeks 1–3 quick-game shift (0.476 → 0.639) predicted the TNF outcome pre-kickoff.
2. **Drift alarm** (1905): z^t embedding over (game-context, EPA-margin) pairs; week-to-week drift flags that something changed without naming it. Improvement: regime-prototype memory (rookie-QB / new-HC / backup-QB archetypes) to label the drift.
3. **Changepoint trigger** (0236): P(changepoint) > δ on the weekly tendency series fires mid-week, naming the week and the metric. Gate already written: beat CUSUM on F1 vs injury/role-change ground truth 2019–2023, ≤2 flags/team-week.
4. **Aggression thermometer** (1575): τ̂ per region×WP tells you which direction the drift goes — Monken's go4th_rate 0.131→0.250 monotonic is the league-wide aggression trend landing on one coach.
5. **Situational layer** (2nd-&-1 splits): per-coach, per-situation fingerprints (32.7% league pass in 2026 vs 20.6% in 2025; Ben Johnson heaviest this century; Panthers 87.5% / Jets 0.0% after successful 1st-down run) that the pipeline never computed.

**What it enables:** mid-week regime-change alerts before the market prices them; opponent-scout previews from fingerprint + situational layer ("this DC allows 50% pressure but the OC throws in 2.3s"); the reasoning spec's Track 2 checklist as a *monitored* system — a profile that hasn't been drift-checked is a DATA-GAP, not a CLEAR. The TNF post-mortem is the proof of concept: the adjustment was measured pre-kickoff; the failure was that nothing watched the series.

---

## Thread 2 — Fourth-down τ replaces go4th_rate (and resolves the intake NULL)

**Briefs:** 1575 + compute_tendencies.py + reverse-engineering-intake (NULL r=−0.014).

**Composed insight:** The apparent contradiction dissolves on inspection. The intake NULL says a **raw team-season go-for-it rate does not tilt game outcomes** — keep it out of the game-outcome blend; the intake was right. 1575's β_1=0.769*** says **region×WP-binned τ̂ predicts 4th-down points gained** — wire it into the decision classifier and live-WP. Different estimands, different modules; both survive.

Further: 1575's heterogeneity is the attribution key the pipeline lacks — own-half τ̂ is uniform across coaches (not a fingerprint), opponent-half τ̂ varies widely (the fingerprint lives there). Upgrade: replace `go4th_rate` with `tau_own_half` / `tau_opp_half` (optionally × WP bins), coach-attributed, with 1575's publication gate enforced in code (≥25 decisions per region per WP range, else NaN). Gate: team-specific τ̂ rule beats risk-neutral WP-max by ≥3pp Hamming accuracy in the opponent half on 2024–2025 4th downs.

**What it enables:** a genuine 4th-down decision module (predict what the coach *will* do), coach-specific live-WP edges, opponent-tendency content with bootstrapped CIs.

---

## Thread 3 — The regime-change response system (detect → respond)

**Briefs:** 2129 (ProbFM epistemic) + 0677 (bye break) + 1611 (in-play Gap) + 0487 (Trace kappa schedule) + morning-2026-09-27 (pregame bridge eligible-not-published; officials DARK).

**Composed insight:** One closed loop — detect, then respond — with every stage in the slice:

- **Detect:** 2129's epistemic rise + 1905's z^t drift are two independent "operating outside trained regime" sensors. 0677's bye break is the cautionary tale: twelve years of mispricing because nobody re-estimated after the CBA changed the data-generating process.
- **Respond:** (1) *Abstain/shrink* — epistemic → min-stake/no-publish; Trace's kappa 640→160→40 is the continuous version. (2) *Blend by liquidity* — 1611's Gap→drift blender (functional form transfers; NBA coefficients do not). (3) *Fade the market's stale regime* — the 0677 anti-bye fade.
- **Governance:** pregame bridge (eligible but not published — the two-gate discipline) and officials DARK (measured NULL stays dark) are the brakes that keep regime response from becoming overfitting.

**What it enables:** the engine knows when it doesn't know — Monken-to-CLE, rookie-QB starts, structural breaks all land in one handling path: epistemic alarm → shrink/abstain → liquidity-gated blending → publish gate.

---

## Thread 4 — Coach-QB attribution decomposition (whose fingerprint is it?)

**Briefs:** coach_offense.csv + monken.md (BAL→CLE natural experiment) + 1575 (heterogeneity test) + wr-phase2 (QB-level rates) + map gaps (HC-vs-OC: nothing).

**Composed insight:** The biggest attribution gap has an unassembled estimation strategy sitting in the slice:
**fingerprint = coach_component + QB_component + roster/system_component.**
(1) *Coach*: coach-change experiments (Monken BAL→CLE) + 1575's heterogeneity test (varying dimensions = coach-attributable; uniform = not). (2) *QB*: QB-change experiments + first-read/aggressiveness rates that move with the passer. (3) *Roster/system*: the residual — what neither explains (shotgun_rate's Baltimore-internal collapse). Monken's worked case: quick_game_rate +0.121 moved with the team switch (roster/QB-driven compensation), go4th_rate's climb spanned both tenures (coach-secular trend), shotgun_rate's −0.199 collapse predated the move (structure-driven).

**What it enables:** when a coordinator is hired, the engine projects which tendencies travel (go4th aggression travels; quick-game re-optimizes to roster; first-read concentration follows the QB). Without the decomposition every coordinator change is a cold start. **Flag:** the decomposition itself is INFERENCE from assembled evidence — it needs the formal estimation run on coach-change/QB-change season pairs, 2014–2026.

---

## Engine-needs mapping

### (a) Tendency computation — pipeline vs slice

In `compute_tendencies.py` already: pass-rate splits by down/distance/field/WP, shotgun, no-huddle, go4th_rate, two_pt_rate, air-yards distribution, quick_game_rate, pace, defensive pressure proxies, playcaller-attributed coach_offense.csv.

Missing, with slice-supplied specs: τ̂ per region×WP (Thread 2); 2nd-&-1 + sequencing splits (Paganetti — computable from the same pbp, never wired); drift/change monitoring (Thread 1 — no 1905/0236 layer); play-action/RPO rates (charting-gated, honest NaN); motion rate (charting-gated); rest/travel features (contradiction #1, unresolved); in-game behavior (timeouts, challenges, halftime — nothing anywhere).

### (b) Coordinator fingerprints

Scaffolding exists (coach_offense.csv attribution, 6 profiles, YoY-delta template). 1575 supplies the coach-level estimand with publication gate and heterogeneity result. Monken supplies the worked natural experiment. Still missing: HC-vs-OC split when the HC isn't the playcaller; in-game behavior; *measured* coordinator-change regime effects; scheme signatures beyond pass/air-yards (personnel, formations, motion — charting-gated); DC fingerprints beyond pressure proxies (blitz/man/zone/shell documented NaN).

### (c) Reasoning-depth spec §5, Track 2 — "checked" status

| Requirement | Status |
|---|---|
| Playcaller profiles + YoY deltas | ✅ 6 profiles; league context present |
| 4th-down aggression per coach | ⚠️ raw go4th_rate only; τ̂ specified but unwired |
| Situational fingerprints | ⚠️ down/distance/field/WP yes; 2nd-&-1 + sequencing no |
| DC profiles | ⚠️ pressure proxies only; blitz/coverage/shell NaN → must return DATA-GAP, never NOTHING-MATERIAL |
| Freshness / staleness | ❌ no drift monitor; Week-3 profile answers "checked" in Week 12 with no alarm |
| QB↔OC interaction | ⚠️ wr-phase2 QB rates exist as research; not joined to coach profiles |
| Worst-plausible on gaps | ✅ DATA_GAPS.md is the honest inventory the L4 adversary needs |

---

## Pipeline contradictions / duplications

1. **Apparent contradiction RESOLVED:** intake NULL (r=−0.014, game-outcome tilt) vs 1575 (β_1=0.769***, decision quality) — different estimands, different modules; both survive.
2. **Duplication = UPGRADE:** pipeline `go4th_rate` is a degraded 1575 τ̂. Action: augment/replace with `tau_own_half`/`tau_opp_half`. Staleness warning favors the pipeline's 2022–2026 window as the estimation sample.
3. **Duplication = FORMALIZE:** 1575's ≥25-decision gate and monken.md's small-sample flags are the same rule stated twice, enforced nowhere. Encode the n-floor in code (NaN + flag below floor).
4. **Tension — spec vs data reality:** reasoning spec T1's breaking condition (`TTT > 2.6s`) asserts on time-to-throw, which DATA_GAPS.md documents as unavailable in nflverse. Restate in `quick_game_rate` terms until the NGS build lands.
5. **No numeric contradictions** between the slice and the pipeline's computed tendencies (Monken numbers match coach_offense.csv exactly).
