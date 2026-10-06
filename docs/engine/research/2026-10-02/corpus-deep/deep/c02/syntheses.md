# c02 Deep Research — Syntheses

**Coordinator:** c02 Phase 2+ · **Date:** 2026-10-02
**Purpose:** connect findings across the six analyst reports into buildable intelligence. Each synthesis states what composes, what conflicts, and what the engine does about it.

---

## S1. The rights architecture (the master synthesis)

The six reports converge on one structural fact: **the corpus has a three-tier data-rights architecture, and every qb-behavior computation must be classified into it before it is built.**

| Tier | Data | Engine-eligible? | Examples in this slice |
|---|---|---|---|
| **T1 — nflverse pbp** (CC-BY-4.0) | play-by-play, 372 cols, 2010–2026 | **YES — full** | `interception`, `qb_hit`, `sack`, `epa`, `air_yards`, targets, `down`/`ydstogo`/`qtr`/`score_differential`/`yardline_100` |
| **T2 — FTN charting** (CC-BY-SA-4.0) | 2022–2025, 29 cols, joins on `(nflverse_game_id, nflverse_play_id)` | **Display/research ONLY** — L7 share-alike model-ineligibility; `resolveFeatureRights` pins `modelEligible: false` | `is_interception_worthy`, `read_thrown`, `n_blitzers`, `is_throw_away`, `is_contested_ball` |
| **T3 — NGS** (no explicit grant) | tracking-derived fields | **NO until founder clears** | `avgTimeToThrow`, `aggressiveness`, `avgSeparation`, `avgCushion`, `cpoe` (NGS model) |

**Consequences for the build:**
- The INT-by-situation engine uses **actual `interception` occurrence** (T1), never the worthy-rate × 52.3% formula (T2, props-lane only). (a06)
- Blitz splits in the engine are **blocked** — nflverse has no blitz column; FTN `n_blitzers` is T2. Engine ships pressure-floor splits (sack+hit); blitz-conditioned rates wait for a founder rights decision. (a06)
- First-read measurement: FTN `read_thrown` (T2) can validate a pbp proxy, but the engine's first-read feature must be pbp-native (air-yard band / throw-depth proxy) or stay display-only. (a05 + coordinator correction)
- TTT is **not emitted at all** — no T1 proxy exists; NULL per the governing rule. (a02)
- Every T2-derived number shown to an analyst carries its CC-BY-SA attribution; nothing T2 enters a training export. The acceptance test: no FTN-derived column in any training export (a06).

## S2. The pressure story (a01 + a03 + a06 + a02)

Four reports touch pressure; they compose into one coherent system with one structural hole:

1. **Evaluative pressure (EPA):** `sensitivity = EPA/db(clean) − EPA/db(pressured)` (proposal, a01-pending/a06-extracted). Guards: ≥100 pressured dropbacks, ≥95% FTN join coverage, REG only. This is the QB's *response* to pressure — a behavioral trait.
2. **Evaluative pressure (INT):** INT rate by pressure-floor vs clean, EB-shrunk (a06 buildable spec). The QB's *danger* response — partially independent of EPA response (a QB can take sacks without throwing picks, or vice versa).
3. **The veto boundary:** pressure-to-sack conversion R² < 0.005 kills *sack prediction*, not pressure evaluation. The module evaluates QBs under pressure; it never projects sack totals. (a03 V4)
4. **The structural hole:** no hurries anywhere (nflverse or FTN). `pressured = qb_hit==1 OR sack==1` is a **floor** — the clean cell is contaminated with hurried-but-unflagged dropbacks, which *attenuates* every clean-vs-pressured contrast toward zero. All pressure contrasts are thus conservative (understated), never overstated. Name everything `pressure_floor_*`. (a02, a03, a06)

**The confounding challenge (from a01's mission, unresolved until a01 lands):** bad QBs face more pressure AND perform worse under it — is `sensitivity` measuring the QB or his OL? The proposal's `Protection Stress = pressure_rate_allowed − league_expected(blitz_rate_faced)` is the OL-side decomposition. The module must report both: the QB's sensitivity *and* the protection context, never the raw contrast alone.

## S3. The INT story (a03 + a06)

1. **Two INT quantities, two lanes:** *danger volume* (worthy rate, T2, props/analyst lane) vs *occurrence* (actual INTs, T1, engine lane). The doc's core insight — Allen's 3.66% worthy rate is the signal, his 10 INTs the noise — is a display-lane framing. The engine models occurrence because occurrence is what's rights-cleared, and occurrence is "weakly repeatable" QB skill while recovery is "near-pure noise" (46.3% league mean). (a06 §EVIDENCE-2)
2. **The shrinkage ladder is the method:** `cell = (w + M·p̂_parent)/(n + M)`, M=25, league → team → QB; null floors at n<30 (leaf) and <100 pressured dropbacks (pressure splits); 3-season pooling with regime-change resets. This is corpus-precedent (c02-r36 denoised-rate auditor), not invention. (a06)
3. **The cost of an INT is complementary:** +0.6–1.0 pts/drive to the opponent, +21 yards field position, median post-turnover start own 41 (verified: 0678 paper L27-28). The INT module's rates feed the complementary channel, not just the QB's own EPA. (a06)
4. **Bands, not points:** single-game INTs are Poisson noise (doc, twice). The module projects rates with wide bands; game-count point estimates are theater. (a03 CH-INT-5)

## S4. The trust-target story (a05 + coordinator FTN verification)

1. **What c02 actually has:** one attributed predictive rule (PRFFBall triple: 25+ first-read / 35%+ air-yard share / 0.25+ TPRR → 64%/84.2%/92%, n=25, nested conditioning, never independently recomputed); one week of third-party read-progression charting (Love 78.6% first-read, Rodgers 60.5%, ...); receiver-side coverage splits (JSN 35% TPRR vs 2-high) with no QB-side complement; zero HHI-in-football-sense; zero concentration-under-pressure; zero share models.
2. **What the FTN inventory adds (coordinator-verified, not in any analyst report):** `read_thrown` (which read the QB threw on — a direct first-read measurement, 2022+), `is_throw_away` (throwaway handling the docs never addressed), `is_qb_out_of_pocket`, `is_contested_ball`/`is_catchable_ball`/`is_drop`/`is_created_reception` (receiver-side outcomes). These upgrade the trust-target module from proxies to measurements — in the display lane (T2), validating pbp proxies for the engine lane (T1).
3. **What the module computes from T1 today:** HHI + N_eff + top_share + top2_share per QB×week×situation (all/rz/3rd/2min/trailing/pressure-floor); target-share volatility (4-week CV of top_share); the PRFFBall legs re-implemented pbp-natively where possible (air-yard share: yes; TPRR: needs routes — no; first-read: proxy only).
4. **Validation gates (a05, adopted):** reproduce Dynatyze's 21% median WR1 share ±2pp from raw pbp (grounds the target definition); backtest the triple's ordering on 2021–2025 GSE-owned data with pre-registered conditioning (no retrospective survivorship); week-to-week autocorrelation of hhi/top_share (persistence gate — descriptive vs predictive); point-in-time week boundaries (KONTOGRAPH anti-leakage).

## S5. The CPOE / completion story (a04 + a02)

1. **The portable kernel is discipline, not features:** grouped CV, AUC primary, debiased ECE ≤ 0.05, calibration slope [0.9, 1.1], temporal holdouts. The 0.88 AUC / 0.998 calibration / 86.92% target-ID do not port to pbp — 20 of 32 features are tracking-bound. Never quote them as pbp capabilities. (a04)
2. **The skill-prior differentiator is real and specified:** hierarchical logistic with EB-shrunk receiver intercepts + defense effects → independent QB_CPOE on the residual. This is a **c01 core-engine** build (not this module), but this module consumes its outputs for situational CPOE splits. Interface via the provider ABC. (a04 §SKILL-PRIOR-DESIGN)
3. **The naming contract governs every number:** pbp-derived stand-ins carry `_pbp`/`_proxy`/`_floor` suffixes; NGS measurement names never appear on non-NGS numbers; TTT is NULL, not proxied; small samples refuse (NULL below minN), never clamp. (a02)
4. **Target SELECTION is the gap the paper doesn't cover:** the paper models completion-given-target; the qb-behavior module needs P(target=r | state). That's S4's trust-target system — the two compose (selection × completion = reception expectation) but neither substitutes for the other. (a04 B-3)

## S6. Connection to the reasoning spec (T1 test)

The reasoning-depth spec's mandatory T1 test ("the funnel must die at L4") needs, from THIS module, pre-kickoff:
- Watson's INT-under-pressure vs clean splits (S2+S3) — the adversary's steelman ("pressure converts to hits→INTs") runs on these numbers.
- Rodgers' trust-target HHI (S4) — the behavior-agent's Wilson read runs on concentration data.
- EPA sensitivity for both QBs (S2) — the L3 chain's "pressure neutralization" link needs the QB-side response number, not just the OL injury fact.
- All at **week grain, point-in-time** (through Week 3 for a Week 4 test), with nulls where floors aren't met — the checklist's DATA-GAP verdicts are load-bearing for the adversary's worst-plausible assumption. (spec §5)

If this module serves a season aggregate where the trace needs last-3-weeks, T1 fails on grain. **Weekly computation is not a nice-to-have; it is the T1 requirement.**

## S7. What stays dark (honest inventory)

- True time-to-throw (T3 NGS, founder-gated). No proxy.
- True tight-window aggressiveness (T3 NGS, founder-gated). Deep-throw-rate proxy only.
- Cushion/separation/coverage exposure (T3 NGS, founder-gated).
- Blitz-conditioned engine splits (T2, founder rights decision).
- Hurry-inclusive pressure (no source anywhere in reach — structural).
- Dirichlet-multinomial share smoothing (genuinely absent program-wide; adopt only if the stability gate shows small-sample blowups).
- First-read-by-coverage-shell (needs charting × coverage classification; greenfield).
- In-game aggressiveness-by-game-state series (map gap, confirmed absent).
