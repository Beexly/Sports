# Prop covariate gap — house audit (P0)

**Status:** inventory only. No math added. No `MODEL_VERSION`. No live `p`.
**Branch:** `grok/prop-covariate-gap` off `origin/main` @ `b7ede3d0` (#544).
**Purpose:** Hermes must not rediscover these paths. Bind covariates onto
existing HB. 10Hz frames are L3; most of the gap is L1/L2 already in-repo.

Layers: **L0** box/exposure · **L1** event PBP · **L2** tracking aggregates /
GSE residuals · **L3** 10Hz frames.

`may-enter-p`: `exposure` | `covariate` | `y-axis` | `log` | `never`.

---

## 1. Prop HB modules on main (L0 — shipped, priced:false)

| Module | Tag | Exposure | Process | Deep gap |
|---|---|---|---|---|
| `props-hb-catch.ts` | `props_hb_catch_v1` | targets | Beta-Binomial catch | no aDOT/sep/QB in the base |
| `props-hb-adot-catch.ts` | `props_hb_adot_catch_v1` | targets | catch prior **by aDOT bucket** | buckets from PBP aDOT, not NGS weekly |
| `props-hb-adot-sep.ts` | `props_hb_adot_sep_v1` | targets | aDOT × tight/open sep | sep is a **number the caller passes**, not weekly NGS join |
| `props-hb-air-yac.ts` | (air+YAC) | receptions | air + YAC convolution | no GSE-xYAC residual, no NGS xYAC y-axis in the mix |
| `props-hb-rec-td.ts` | `props_hb_rec_td_v1` | targets | TD-per-target NB / Poisson | no red-zone / aDOT / sep |
| `props-hb.ts` / nested / obs | receptions~NB | games→fixed to targets elsewhere | volume | no WOPR / snap offset in the rate |
| `props-hb-rush.ts` | rush yards \| att | attempts | Gamma-Poisson yards | no box / RYOE residual |
| `props-hb-rush-td.ts` | rush TD \| att | rush att | TD-per-att | no goal-line / box |
| `props-hb-atd.ts` | ATD \| touches | rush att + rec | do not add recTD+rushTD | — |
| `props-hb-comp.ts` | completions \| att | attempts | wraps catch math | no air / qb_hit / TTT / GSE-CPOE |
| `props-hb-int.ts` | INT \| att | attempts | rare NB / Poisson | no air / pressure / aggressiveness |
| `props-hb-pass-td.ts` | pass TD \| att | attempts | TD-per-att | no red-zone / aDOT |
| `props-hb-sacks.ts` | sacks \| dropbacks | dropbacks | bounded BB | no TTT vs time-to-pressure |
| `props-hb-snap-exposure.ts` | snap share | snaps | injury ZIP | not wired as T offset |
| `props-hb-pass-yards.ts` | **#542 Hermes, not this tree** | attempts | yards \| att | leave Hermes |

Quote / friction (not p): juice floor, line shop, fire gate, Kaunitz, Kalshi
taker friction, Kalshi-vs-book. Do not mix into independent p.

---

## 2. NGS aggregates we already parse (`nflverse-ngs.ts`)

Grain: player × season × week (`week=0` is **season total**). Join: `gsisId`.
License: nflverse CC-BY-4.0. Value-identical to nextgenstats.nfl.com.
**Consumers today:** intelligence pages, `ngsReceivingToSeparationTruth` /
`ngsPassingToCpoeTruth` (y-axis), #541 measurement loop, `playerResearchLog`.
**Not joined into any props HB.** Typical loaders keep `week=0` only.

### Receiving (`NgsReceivingRow`)

| Field | Layer | may-enter-p | Bind onto |
|---|---|---|---|
| `avgSeparation` | L2 | covariate (honesty: **weekly mean ≠ catch-frame sep**) | adot-sep, catch |
| `avgCushion` | L2 | covariate (pre-snap, not arrival) | catch, rec TD |
| `avgIntendedAirYards` | L2 | covariate | aDOT prior, rec yards air |
| `airYardsShare` | L2 | covariate on **volume** T, not catch rate | props-hb targets |
| `avgYac` | L2 | covariate | air-yac |
| `avgExpectedYac` | L2 vendor model | **y-axis / never as p** | GSE-xYAC referee |
| `yacAboveExpected` | L2 vendor residual | y-axis; prefer GSE-xYAC as covariate | air-yac |
| `catchPct` / `targets` / `receptions` / `yards` / `touchdowns` | L0 duplicate | never (box already in HB) | — |

### Rushing (`NgsRushingRow`)

| Field | Layer | may-enter-p | Bind onto |
|---|---|---|---|
| `eightPlusBoxPct` | L2 | covariate | rush yards, rush TD |
| `avgTimeToLos` | L2 | covariate | rush yards |
| `efficiency` | L2 | log | — |
| `expectedRushYards` | L2 vendor | **never as p** | GSE-RYOE referee |
| `ryoe` / `ryoePerAtt` / `rushPctOverExpected` | L2 vendor residual | y-axis; prefer GSE-RYOE as covariate | rush |

### Passing (`NgsPassingRow`)

| Field | Layer | may-enter-p | Bind onto |
|---|---|---|---|
| `avgTimeToThrow` | L2 | covariate | sacks, INT, completions |
| `avgCompletedAirYards` / `avgIntendedAirYards` / `avgAirYardsDifferential` | L2 | covariate | completions, pass yards, INT |
| `aggressiveness` | L2 (% into &lt;1 yd sep) | covariate | INT, completions |
| `avgAirYardsToSticks` | L2 | covariate | pass TD, completions |
| `expectedCompletionPct` | L2 vendor | **never as p** | GSE-CPOE referee |
| `cpoe` | L2 vendor residual | y-axis; prefer GSE-CPOE as covariate | completions |
| `attempts` / `completions` / `interceptions` / `passTouchdowns` | L0 | never | — |

---

## 3. GSE expected metrics (our IP — `packages/prediction-engine/src/expected-metrics`)

Thesis (`docs/math/GSE_EXPECTED_METRICS.md`): compute expected from CC-BY PBP;
NGS is referee. **Not imported by any `props-hb-*`.**

| Metric | Features used | may-enter-p |
|---|---|---|
| GSE-CPOE | airYards, airYards², qbHit, isMiddle, isLeft, down, ydstogo, yardline100, shotgun, noHuddle | covariate on completions / INT |
| GSE-RYOE | (see rush expected module) | covariate on rush yards |
| GSE-xYAC | (see yac expected module) | covariate on air+YAC |
| nflverse `ep`/`epa`/`wp`/`wpa` | referee only in mapper | **y-axis, never p** |

PBP columns the CPOE mapper **allows** (`NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS`,
40 of ~372): identity, clock, down/distance, scores, play_type, yards_gained,
INT/fumble, rusher/receiver ids, drive, ep/epa/wp/wpa.

**Deliberately excluded (CC-BY-SA):** `ftn_*`, participation, `defenders_in_box`
via participation, `was_pressure`, `route`, `time_to_throw` on the PBP file if
it is an NGS-join column — **confirm license before Hermes binds.** If unsure,
STOP FOR GROK.

PBP facts that *are* CC-BY on the main pbp asset and **not** in the 40-column
allowlist (candidates for a **separate** projection, not by widening CPOE):
`air_yards`, `complete_pass`, `pass_location`, `qb_hit`, `shotgun`, `no_huddle`,
`xyac`, `cp`, `cpoe` (play-level nflfastR), `run_location`, `run_gap`,
`goal_to_go` (already in allowlist), `two_point_attempt`.

---

## 4. Intelligence / reconstruction (log or shadow — not p)

| Path | What | may-enter-p |
|---|---|---|
| `apps/web/lib/nflverse/edge-signals.ts` | NGS sep + YAC OE + air-yards share vs PPR z; `gap = underlyingZ − productionZ` | log (`playerResearchLog.edgeGap`) |
| `apps/web/lib/intelligence/receiving-opportunity.ts` | WOPR, target share, air-yards share, aDOT, RACR | covariate on **T**, not catch |
| `apps/web/lib/intelligence/qb-consensus.ts` | ESPN QBR vs NGS CPOE | log |
| `apps/web/lib/intelligence/rushing-efficiency.ts` | (efficiency board) | log |
| `apps/web/lib/reconstruction/*` | sep estimate, `RECONSTRUCTED` provenance | covariate if labeled; never as MEASURED |
| `edge-lab/ngs-measurement-loop.ts` | pred vs NGS y-axis | y-axis only |
| `edge-lab/player-research-log.ts` | bag: edgeGap, sep, cpoe, ryoe, qbConsensusDiv | log until hold-out |
| `edge-lab/nfl-epa-path.ts` | TeamGameEfficiency empty-row status | NFL game p, not props |

---

## 5. Other nflverse families (adapter exists, not in prop p)

From `docs/nflverse-data-catalog.md`:

| Family | License | Use |
|---|---|---|
| `snap_counts` | CC-BY | offset for T / att (`props-hb-snap-exposure` exists, unwired) |
| `injuries` | CC-BY | ZIP / `injuryOut` |
| `depth_charts` | CC-BY | role prior |
| `schedules` | CC-BY | rest, roof, surface |
| `player_stats` | CC-BY | weekly usage (already the HB samples) |
| `pfr_advstats` | facts via nflverse CC-BY | broken tackles, pressures — covariate candidates |
| `espn_data` QBR | nflverse | log / QB quality, not p |
| `pbp_participation` | **CC-BY-SA** | **never** in derived p |
| `ftn_charting` | **CC-BY-SA** | **never** |

---

## 6. L3 — not in house

| Source | Status |
|---|---|
| Zebra / Genius 10Hz XY | exclusive through 2029 — buy last |
| SkillCorner XY ~10 fps + get-off / max speed | buy; GSIS+PFF ids; indemnity required |
| NFL.com / NFL+ recorder | **blocked** (ToS) |
| Big Data Bowl frames | **destroy**; methods only |
| Reconstruction 10Hz *clock* | ABSENT (engine estimates features, not a frame list) |

Honesty: weekly `avgSeparation` is **not** sep at arrival. TTT weekly is **not**
time-to-pressure. Closing speed has **no** L2 proxy — fail-closed, do not invent.

---

## 7. Default P2 bind (Hermes, after Grok APPROVE)

**Weekly** NGS `avgSeparation` (`week >= 1`) as the sep argument to
`props-hb-adot-sep` / catch. Fail-closed if that week is missing. File header
must say: *weekly mean, not catch-frame.* `priced:false`. Do not treat as L3.

---

## 8. Hermes: do not rewrite this file

Extend via `METRIC_TAXONOMY.md` / `PROP_FORMULA_MAP.md` / `TENHZ_PROXY_TABLE.md`.
If a row here is wrong, STOP FOR GROK — do not silently replace.
