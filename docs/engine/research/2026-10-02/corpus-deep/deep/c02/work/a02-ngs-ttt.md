# a02 — NGS Time-to-Throw: Verification & Buildable Spec (c02 deep slice)

**Source file (read completely):** `~/workspace/vendor/Sports/docs/data-sources/research/2026-09-18/2026-09-18-ngs-replacement-spec.md` (126 lines)
**Corroborating repo reads (read-only):**
- `~/workspace/vendor/Sports/packages/data-ingestion/src/__tests__/nflverse-ngs.test.ts` (fixture header + pinned values)
- `~/workspace/vendor/Sports/reports/rights/pfr-advstats-verdict-2026-07-16.md` (rights language)
- `~/workspace/corpus-intelligence/briefs/c02/c02-r34/docs__data-sources__research__2026-09-18__2026-09-18-ngs-replacement-spec.md.brief.md` (phase-1 brief; checked, no conflict)
**Analyst note:** everything not quoted or cited below is marked INFERENCE. Nothing is inflated beyond what the source says.

---

## VERIFIED CLAIMS

| # | Claim | Source | Confidence |
|---|---|---|---|
| V1 | Two QBs at **9.1 avg intended air yards** read **2.799s and 2.970s** time-to-throw. The QBs are **Matthew Stafford (LAR)** — fixture `avg_time_to_throw = 2.79925252525253` — and **Drake Maye (NE)** — `2.97`. Both rows are **2025, REG, week 0** (= season aggregate in nflverse NGS convention: Stafford's row also carries 4,707 pass yards, 46 TD, 8 INT — a full season, not a week). | spec L66-69; test file `PASSING_CSV` rows 2-3 | **High** — values pinned to the decimal in the test fixture |
| V2 | The test values were **"verified live against the source to the decimal on 2026-07-03"** (fixture header comment; Stafford cross-checked against nextgenstats.nfl.com: TT 2.8, xCOMP% 63.5, CPOE +1.5, RATE 109.2). | spec L66-68; test file header comment | **High** — header records the live verification date and the cross-check |
| V3 | The heuristic "intermediate 4.0s" constant is **35-43% above** the measured band. Math checks: 4.0/2.799 − 1 = **42.9%**; 4.0/2.970 − 1 = **34.7%**. | spec L69; arithmetic verified by this analyst | **High** — exact arithmetic |
| V4 | The heuristic timing profile (attributed to `agents_website_list/AdvancedDataEnrichment.py`) sets **deep 2.5s / short 3.0s / intermediate 4.0s** — ordering is **inverted** (deep BELOW short) and non-monotone (intermediate above both), contradicting the measured reality that time-to-throw rises with route depth. | spec L71-73 | **Medium** — the inversion logic is sound, BUT the profile constants could not be verified in-repo (see CHALLENGES C1) |
| V5 | The profile misdefines the interval as **"seconds before snap"**; time-to-throw and time-to-pressure are both measured **from the snap FORWARD**. "A model trained to predict a pre-snap quantity that does not exist will fit noise and report it as skill." | spec L74-77 | **Medium** — same C1 caveat; the measurement-definition claim itself is correct |
| V6 | **Naming contract (hard rules):** `coverage_exposure_*`, **never** `per_defender_*`; `time_to_throw_*`, **never** pressure; matchup = receiver-vs-defense differential, **never** an assignment. "Time to THROW is not time to PRESSURE." | spec L38-44, L52-54, L78-86 | **High** — verbatim in the source |
| V7 | **Governing rule:** "A measurement is a number produced by observing the world. A heuristic constant is a number produced by someone's judgement. Substituting the second for the first while keeping the first's name is how a track record stops meaning anything." Absent sources stay absent — never closed by defaults, heuristic profiles, rule matrices, or priority weights. | spec L88-97 | **High** — verbatim in the source |
| V8 | **Grain:** `NextGenStat` is **player-week** (unique on `(gsisId, season, week, seasonType, statType)`), never per-play. Every row carries `rightsSnapshot` and `fetchedAt`. Written daily by the `refresh-player-stats` cron via `ingestNextGenStats` for statType in {passing, receiving, rushing}. | spec L12-20 | **High** — schema-level claim, verifiable in `packages/db/prisma/schema.prisma` (not re-read here; taken as stated) |
| V9 | Per-play kinematics (speed/acceleration/separation per frame) are **not reachable** from this table; that is the NFL's enterprise-only tracking feed. | spec L101-103 | **High** — verbatim; grain makes it structurally true |
| V10 | Small-sample honesty pattern: `conformal-calibration.ts:174` returns **+∞ below minN 20** rather than clamping (correct); `cqr.ts:12-15` **clamps and is a known defect**. Rule: a small-sample interval refuses rather than pretending to coverage it does not have. | spec L120-126 | **Medium** — code not re-read by this analyst; taken as stated |

---

## FIELD INVENTORY — the full `NextGenStat` table

Grain: **player-week** for every field (unique key `(gsisId, season, week, seasonType, statType)`). Column names are the Prisma schema names, not the upstream CSV spellings (spec L22).

| Prisma field | statType | What it measures (per source) | Computable from nflverse play-by-play WITHOUT NGS? | How / why not |
|---|---|---|---|---|
| `avgCushion` | receiving | defender alignment distance at snap | **N — strictly NGS-only** | Tracking-derived; no defender-alignment data in pbp |
| `avgSeparation` | receiving | receiver separation at the catch point | **N — strictly NGS-only** | Tracking-derived; INFERENCE: no separation proxy exists in pbp |
| `avgYac` | receiving | actual yards after catch | **Y** | `mean(yards_after_catch)` per receiver-week |
| `avgExpectedYac` | receiving | expected YAC (tracking model) | **N — strictly NGS-only** | Needs the NGS expected-YAC model on tracking features |
| `avgYacAboveExpectation` | receiving | actual − expected YAC residual | **N — strictly NGS-only** | Residual of the above; uncomputable without the model |
| `catchPct` | receiving | conversion | **Y** | `sum(reception)/sum(targets)` per receiver-week |
| `pctShareIntendedAirYards` | receiving | target share of air yards | **Y** | `sum(air_yards on targets) / team sum(air_yards on targets)` per week |
| `avgTimeToThrow` | passing | snap → release, seconds | **N — strictly NGS-only** | No snap-to-release timing in nflverse pbp; THE critical gap (see BUILDABLE SPEC) |
| `avgIntendedAirYards` | passing | depth | **Y** | `mean(air_yards)` over pass attempts per passer-week |
| `avgCompletedAirYards` | passing | depth on completions | **Y** | `mean(air_yards)` where `complete_pass==1` |
| `avgAirYardsToSticks` | passing | depth relative to sticks | **Y (INFERENCE)** | `mean(air_yards − ydstogo)` over attempts; approximates the NGS definition |
| `cpoe` | passing | completion % over expected | **Y — with a naming caveat** | `mean(cpoe)` of the nflverse pbp `cpoe` column per passer-week. CAVEAT: this is nflverse's own expected-completion model, NOT the NGS tracking model. Per the governing rule, name it `cpoe_nflverse_pbp_*`, never `cpoe`. |
| `expectedCompletionPct` | passing | model-expected completion % | **Y (INFERENCE)** | Via the algebraic identity CPOE = comp% − xComp%: `xComp ≈ completionPct − mean(cpoe)` at the passer-week aggregate. INFERENCE: assumes the pbp `cpoe` column is present and additive-consistent. |
| `completionPct` | passing | completions / attempts | **Y** | `sum(complete_pass)/sum(pass_attempt)` |
| `aggressiveness` | passing | throws into tight windows (<1 yd separation) | **N — strictly NGS-only** | Needs defender proximity at throw (tracking). Proxies only (see BUILDABLE SPEC); name `aggressiveness_proxy_*`, never `aggressiveness`. |
| `avgTimeToLos` | rushing | snap → line of scrimmage, seconds | **N — strictly NGS-only** | Tracking timing |
| `pctAttemptsGte8Defenders` | rushing | stacked-box exposure rate | **N from pbp** | Box counts not in nflverse pbp. NOTE: the rights verdict says personnel/box counts are clean **CC-BY-SA via FTN charting** (`load_ftn_charting()` 2022+) — a cleared non-NGS route exists for this one. |
| `rushYardsOverExpected` | rushing | tracking-expected rushing residual | **N — strictly NGS-only** | Tracking model residual |
| `rushYardsOverExpectedPerAtt` | rushing | RYOE per attempt | **N — strictly NGS-only** | Same |
| `expectedRushYards` | rushing | tracking-model expectation | **N — strictly NGS-only** | Same |

**Tally: 8 of 20 fields computable from pbp alone** (avgYac, catchPct, pctShareIntendedAirYards, avgIntendedAirYards, avgCompletedAirYards, avgAirYardsToSticks, cpoe, expectedCompletionPct, completionPct — with cpoe/xComp carrying model-substitution caveats). **The two fields the qb-behavior module most wants — `avgTimeToThrow` and `aggressiveness` — are strictly NGS-only.** Coverage fields (cushion/separation) and the entire rushing residual family are strictly NGS-only.

---

## RIGHTS BLOCKER

**Exact quote** (spec L113-115, quoting the rights verdict `reports/rights/pfr-advstats-verdict-2026-07-16.md:19-20`):

> "`nextgen_stats` via nflverse is flagged ... as **'equally third-party-sourced with no explicit grant, not a safe substitute'**."

The verdict's full same-pattern caution (verdict L19-20): "**nextgen_stats via nflverse** is equally third-party-sourced with no explicit grant — not a safe substitute." Context from the verdict: it was adjudicating `pfr_advstats` (Sportradar-licensed content scraped by nflverse; verdict YELLOW internal / RED public commercial display, SRL ToS §5(j) banning ML use), and extended the same caution to NGS because nflverse's repo-level CC-BY-4.0 is self-declared and cannot grant rights nflverse doesn't own.

**The precise live founder question** (spec L115-117, verbatim):

> "The platform already persists it with a `rightsSnapshot` on every row, so **this is a live founder question rather than a data question, and it should be answered before anything built on it is served to a customer.**"

So the question, stated plainly: **may anything built on the nflverse NGS feed (ingested daily into `NextGenStat` with per-row `rightsSnapshot`) be served to customers — or even used in internal modeling — given there is no explicit grant from the rights holder?** The verdict's unlock for the sibling feed was "written confirmation from Sports Reference LLC covering redistribution AND the §5(j) ML restriction — not from nflverse maintainers"; no analogous unlock is stated for NGS.

---

## CHALLENGES

- **C1 — The heuristic profile source is missing from this checkout.** The spec attributes the deep 2.5s / short 3.0s / intermediate 4.0s profile and the "seconds before snap" definition to `agents_website_list/AdvancedDataEnrichment.py`. That file (and the `agents_website_list/` directory) **does not exist** in `~/workspace/vendor/Sports` as checked out. A repo-wide search for the constants (`2.5`, `3.0`, `4.0` in that profile shape) found no match. **Consequence:** claims V4/V5 (inversion, misdefinition, and the 35-43% scale critique) are conditional on a module the analyst could not verify. The scale arithmetic is exact *if* the 4.0s constant is as stated; the inversion critique is logically sound *if* the profile is as stated — but neither was independently confirmed in-repo.
- **C2 — The pinned band is season-aggregate, not weekly.** Both pinned rows are 2025/REG/**week 0** (Stafford 4,707 yds; Maye 4,394 yds) — full-season aggregates. The spec's "measured band" therefore says nothing about week-to-week variance at the player-week grain the table actually uses. A weekly TTT feature will be noisier than 2.799s/2.970s implies; small-sample guards (V10, minN) matter.
- **C3 — "Intermediate depth" is the spec author's framing, not an NGS category.** NGS does not label 9.1 air yards "intermediate"; the band is two QBs who happened to average 9.1. Do not generalize "intermediate = 9.1 air yards = ~2.8-3.0s" into a rule.
- **C4 — nflverse pbp CPOE ≠ NGS CPOE.** nflverse's expected-completion model and NGS's tracking-based model are different estimators of the same concept. Using `mean(cpoe)` from pbp and calling it `cpoe` is exactly the substitution-while-keeping-the-name failure the governing rule forbids. Any pbp-derived field must carry a `_pbp` / `_proxy` suffix (see BUILDABLE SPEC).
- **C5 — TTT has no honest pbp proxy.** Nothing in nflverse play-by-play measures snap-to-release time. Sack rate, pressure proxies, and dropback duration correlates exist, but the spec's own rule says time-to-throw ≠ time-to-pressure and a hypothesis needs its own test. The buildable spec therefore emits NULL for TTT rather than a proxy — the honest move.
- **C6 — The "two quarterbacks" are the only real rows in the fixture.** The test file's third passing row ("Low Volume QB", team XXX) is synthetic scaffolding; the spec correctly cites only Stafford and Maye.
- **C7 — CSV has fields the Prisma table drops.** The upstream NGS CSV header includes `avg_air_yards_differential`, `max_completed_air_distance`, `avg_air_distance`, `max_air_distance` (passing) and `efficiency`, `rush_pct_over_expected` (rushing) — none appear in the spec's field table or (per the spec) the schema. INFERENCE: dropped at ingestion; do not assume they are queryable.

---

## BUILDABLE SPEC — what a coder builds TODAY from nflverse play-by-play alone (no NGS)

Scope: per **passer-week** and **receiver-week** features for the qb-behavior module, honest under the spec's naming contract. Nothing below touches the NGS feed, so it is **not gated by the rights blocker** (nflverse pbp is the already-used base feed).

### Per passer-week (grain: passer × season × week, REG only)

| Feature | Formula (nflverse pbp columns) | Naming |
|---|---|---|
| `time_to_throw` | **DO NOT EMIT.** Strictly NGS-only; no pbp proxy exists. Row stays absent per the governing rule. | — |
| `cpoe_nflverse_pbp` | `mean(cpoe)` over rows with `pass_attempt==1` | `_nflverse_pbp` suffix mandatory (C4) |
| `xcomp_nflverse_pbp` | `completion_pct − cpoe_nflverse_pbp` (CPOE identity; INFERENCE on additivity) | `_nflverse_pbp` suffix mandatory |
| `completion_pct_pbp` | `sum(complete_pass)/sum(pass_attempt)` | plain; directly measured |
| `intended_air_yards_pbp` | `mean(air_yards)` over `pass_attempt==1` (include negative/behind-LOS values; exclude sacks where `air_yards` is NA) | `_pbp` suffix; approximates NGS `avgIntendedAirYards` |
| `completed_air_yards_pbp` | `mean(air_yards)` over `complete_pass==1` | `_pbp` suffix |
| `air_yards_to_sticks_pbp` | `mean(air_yards − ydstogo)` over `pass_attempt==1` (INFERENCE: approximates NGS definition) | `_pbp` suffix |
| `aggressiveness_proxy_deep_rate` | `P(air_yards ≥ 20 \| pass_attempt==1)` — deep-throw rate as the observable correlate of tight-window throwing | `aggressiveness_proxy_*` — NEVER `aggressiveness`; document that tight-window rate itself is unobservable without tracking |
| `pressure_floor_rate` | `(sacks + qb_hits) / dropbacks`, where `dropbacks = pass_attempt + sacks`. Explicit FLOOR proxy: hurries are absent from nflverse (spec L59-62; signal-architecture doc records same). | `pressure_floor_*` — never "pressure rate" unqualified |

### Per receiver-week (grain: receiver × season × week)

| Feature | Formula | Naming |
|---|---|---|
| `catch_pct_pbp` | `sum(reception)/sum(targets)` | plain |
| `air_yards_share_pbp` | `sum(air_yards on targets)/team sum(air_yards on targets)` per week | `_pbp`; approximates NGS `pctShareIntendedAirYards` |
| `yac_pbp` | `mean(yards_after_catch)` | `_pbp`; approximates NGS `avgYac` |
| Coverage differential | **NOT BUILDABLE without NGS.** `avgCushion`/`avgSeparation` are strictly NGS-only (no pbp proxy). INFERENCE option: receiver `yards_per_target` vs defense-allowed `yards_per_target` differential as a strictly weaker substitute — label `coverage_exposure_proxy_*` and document the downgrade. | never `coverage_exposure_*` unqualified for the proxy |

### Rushing (per rusher-week)

`avgTimeToLos`, `rushYardsOverExpected*`, `expectedRushYards`: **not buildable from pbp — emit NULL.** `pctAttemptsGte8Defenders`: not in pbp, but the rights verdict names a **cleared route — FTN charting via `load_ftn_charting()` (2022+, CC-BY-SA-4.0 with attribution "FTN Data via nflverse")** — which charts personnel/box counts. A coder may source stacked-box exposure from FTN rather than NGS.

### Honesty guards (wire these in, not optional)

1. **Small-sample refusal:** per V10, any weekly feature computed below the module's `minN` returns NULL (the `conformal-calibration.ts:174` +∞ pattern), never a clamped or default value. Do not repeat the `cqr.ts:12-15` clamp defect.
2. **Suffix discipline:** every pbp-derived stand-in for an NGS field carries `_pbp` or `_proxy`; NGS measurement names (`avgTimeToThrow`, `aggressiveness`, `cpoe`, `avgSeparation`, …) never appear on non-NGS numbers.
3. **No defaults for absent sources:** TTT, true aggressiveness, cushion, separation, RYOE stay NULL until the rights question is answered and the NGS feed is cleared — or until a cleared substitute (FTN charting for box counts) is wired.
4. **Validation test:** add a `vitest` fixture test in the style of `nflverse-ngs.test.ts` pinning one known passer-week's `cpoe_nflverse_pbp` / `intended_air_yards_pbp` to pbp-computed decimals, so proxy drift is caught the same way the NGS values were pinned on 2026-07-03.

### What this unlocks vs. what stays dark

- **Unlocks today:** CPOE-style QB grading (on the nflverse model, honestly labeled), air-yard depth profiles per passer-week, a deep-throw aggressiveness proxy, sack-and-hit pressure floors, receiver target-share/YAC features.
- **Stays dark until rights clear:** true time-to-throw, true tight-window aggressiveness, cushion/separation coverage exposure, YAC-over-expected, RYOE family, time-to-LOS. These are the fields the founder question gates.
