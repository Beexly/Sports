# H1 Prop-Market Gap Research — Underserved Player Prop Lines

> Research pass for the H1 edge hunt (Sports-h0-next, Wave K). Scope: find **player
> prop lines that are (a) offered by sportsbooks, (b) backed by *free* NFLVerse
> data, (c) NOT already covered by H0 binds or the EDGE_FACTORY §4 catalog, and
> (d) weakly modeled by public repos — i.e. genuine H1+ edge candidates.
>
> Sources mined: NFLVerse docs + `nflverse-data` GitHub release assets (verified
> by fetching real release CSVs), local repo coverage docs, GitHub public repos
> (prop modeling), and sportsbook prop guides. See §9 Sources for full citations.
>
> **Status: all findings are HYPOTHESIS tier** — magnitudes to be verified
> in-house per `docs/data/EDGE_FACTORY_MASTERPLAN.md` §6 before pricing
> (`priced: false` until validated).

---

## 0. TL;DR

The **single biggest structural gap** is not a missing prop line — it is a missing
**data ingestion**. NFLVerse publishes two whole player-stat families as free
CC-BY-4.0 release assets — `player_stats_def` (tackles, sacks, QB hits, INT,
passes defended, fumbles forced/recovered) and `player_stats_kicking` (FG made /
attempts / %-by-distance, PATs, game-winning FGs) — but the local adapter
(`packages/data-ingestion/src/nflverse-source.ts`, `NFLVERSE_CATALOG`) ingests
**only the offense `player_stats_week`** and **no defensive or kicking stats at
all** (verified: the only `fg_made` reference in `packages/` is a *basketball*
column in `stats-api/src/catalog.ts`, not NFL). Every H1 prop line below derives
from those two not-yet-onboarded assets.

The EDGE_FACTORY §4 catalog (~36 edges, E-A1…E-G5) is saturated on **offensive
skill-position** props and the QB-*sacked* sack market, but has **no defensive-
player** or **kicking/special-teams** prop models. H0 binds
(CPOE, YAC, SEP, catch-cushion, rec-TD-cushion, rush-yards, INT, sack-TTT,
comp-air-yards-diff) are all offensive too. → **Defense + ST = the H1 blind
spot**, despite these being high-volume book markets with weaker lines than
offense.

## 8 underserved prop lines (ranked by edge strength)

| # | Prop line | NFLVerse data asset | Gap in coverage | Edge |
|---|-----------|---------------------|-----------------|------|
| 1 | Def. tackles (solo/combined) O/U | `player_stats_def` | not ingested; §4 has no def-player volume model | **HIGH** |
| 2 | Defensive sacks (pass-rusher) O/U | `player_stats_def` + `pfr_advstats` def | §4 sacks = QB-sacked only (offense) | **HIGH** |
| 3 | First TD scorer (binary) | `pbp` scoring seq + `depth_charts` + `snap_counts` | not enumerated in §4 (only anytime-TD via joint sim) | **MED-HIGH** |
| 4 | Kicker FG made / attempts / % / bucket O/U | `player_stats_kicking` + `schedules` (weather) | not ingested; §4 mentions kickers only for wind/altitude | **MEDIUM** |
| 5 | Defensive passes defended O/U | `player_stats_def` | not ingested; §4 has no DB PD model | **MEDIUM** |
| 6 | Player fumbles (lost/forced/recovered) O/U | `player_stats` + `player_stats_def` + `pbp` | not modeled anywhere (§4 E-D3 only "modest effects") | **LOW-MED** |
| 7 | Defensive interceptions O/U | `player_stats_def` + `pfr_advstats` def | §4 has no DB-INT prop model (INT bind = QB-thrown, H0) | **LOW** |
| 8 | Returner / ST scoring TD O/U | `player_stats` (`special_teams_tds`) + `pbp` returns | not ingested as a model; §4 silent | **LOW** |

---

### 1. Defensive tackles — solo/combined O/U  ·  EDGE: HIGH

**(1) Prop line.** "Player X over/under Y tackles (solo / combined)." Offered weekly
by all major books for LB, CB, S, and even DE/DT (e.g. Fred Warner, Roquan Smith,
Trevon Diggs tackle lines). One of the highest-volume defensive props.

**(2) Data source.** NFLVerse `player_stats_def` (verified header, release
`player_stats/player_stats_def_<season>.csv`):
`def_tackles_solo`, `def_tackles_with_assist`, `def_tackle_assists`,
`def_tackles_for_loss`, `def_tackles_for_loss_yards`, `def_tds`, joined on
`gsis_id`+`season`+`week` ← `player_stats_def`. Layer with:
- `snap_counts` — defensive snap share (cleanest workload/opportunity signal)
- `depth_charts` — starter role (`position` in def file)
- `schedules` — opponent run rate, `spread_line`/`total_line` (game script → run
  frequency, which sets tackle *opportunity*, not the raw tackle rate books use)
- `pbp` — `tackle_for_loss_*` events; opponent rushing attempts as a denominator

**(3) Gap in coverage.**
- **Ingestion:** `player_stats_def` is **not** in `NFLVERSE_CATALOG`
  (`packages/data-ingestion/src/nflverse-source.ts` lines 62–190). Only
  `player_stats_week` (offense-filtered: `PLAYER_STATS_OFFENSE_POSITIONS` =
  QB/RB/WR/TE/FB, line 397) is defined. Confirmed no def stats consumed anywhere
  in `packages/` (repo grep for `def_tackles_solo|def_sacks|def_pass_defended|
  def_interceptions|player_stats_def` = 0 NFL matches).
- **Model plan:** EDGE_FACTORY §4 lists no defensive-**player** volume model.
  §4-E1 "shrunken role-specific DVP" is a *team-offense vs position* random
  effect (opponent-adjusted), **not** a per-player tackle model. Defensive props
  are entirely absent from the §4 catalog.
- **Public models:** the dominant open-source NFL-prop repo
  (`quantgalore/nfl-props` — star ★5, forks 3) models **receptions only**. No
  public NFL repo (surveyed) models defensive tackle totals from snap share +
  script. Defensive props are the least-sharp large-volume market.

**(4) Edge strength — HIGH.** Books set tackle lines from rolling tackle averages
+ light opponent adjustment and ignore the biggest driver: defensive-snap
**opportunity** (snap share × game script × opponent run rate). Tackle totals are
right-skewed by snap volume, which is measurable from `snap_counts` + `schedules`,
sign-stable across seasons (starter status and snap share persist), and the
defensive market is thinly-priced (less public sharp money than offense). This is
the cleanest H1 win because the data exists, the pricing inefficiency is large, and
the ingest gap is a one-asset fix.

---

### 2. Defensive sacks (pass-rusher) O/U  ·  EDGE: HIGH

**(1) Prop line.** "Player X over/under Y sacks." Starred market (Myles Garrett,
Nick Bosa,Maxx Crosby) — high limits, high volume.

**(2) Data source.** `player_stats_def`: `def_sacks`, `def_sack_yards`,
`def_qb_hits`; plus `pfr_advstats` def variant: `def_times_pressured`,
`def_times_blitzed`, `def_times_hurried`; `snap_counts` (snap share → opportunity
ceiling); `schedules` (`spread_line`/`total_line` → opponent pass rate via
game script). Join `gsis_id`.

**(3) Gap in coverage.** EDGE_FACTORY §4 *does* engage sacks — but only on the
**QB-sacked** side:
- §4-E-A3 "Sack rate is a sticky QB trait" → "Props: **sacks props on QBs
  changing teams**"; it explicitly calls out "O-line reputation is the market's
  anchor."
- §4-E-E3 "pressure chains … sack prop up" → framed as *opponent* pressure shaping
  the QB's sack line.
Neither builds a **defensive pass-rusher's own sack total** model from
`def_sacks`/`def_qb_hits` + snap-opportunity + opponent dropback volume. The
defensive-player sack market is unwired.

**(4) Edge strength — HIGH.** Direct, explicit gap in the masterplan. Hit rate
regresses, but `def_qb_hits` and pressure-per-dropback are the leading indicators
that persist across O-line changes (the masterplan already proves pressure traits
stick); books anchor to O-line reputation. Sack *opportunity* (pass-rusher snaps
× opponent pass-play rate × blitz frequency) is fully CC-BY and unpriced. Star
edge rusher markets are deep. HIGH — and low-effort to stand up because
`player_stats_def` already carries `def_qb_hits`.

---

### 3. First TD scorer (binary)  ·  EDGE: MEDIUM-HIGH

**(1) Prop line.** "Will Player X score the FIRST touchdown?" / head-to-head
first-TD fields. Very popular single-game prop.

**(2) Data source.** `pbp` — scoring sequence: `scoring`, `scoring_1h`,
`play_type` (TD), `yardline_100`, `goal_to_go`, `half_seconds_remaining`,
ordered by game time → "who scores first" is directly reconstructable.
Layer: `depth_charts` (starter = near-zero first-TD probability if inactive),
`snap_counts`/`player_stats` (first-half target & rush share, `target_share`),
`pbp` red-zone usage (`yardline_100` ≤ 10, `goal_to_go`), `schedules` script
(`total_line`/spread → favorite scores first more).

**(3) Gap in coverage.** §4 touches TD only as **anytime TD** (ATD): §3.5
"longest-rec line, and ATD for the same player come from one joint draw" and
§4-E-C4 red-zone bifurcation. **First-TD-scorer sequence pricing** (who scores
*before anyone else*) is not enumerated. Public repos model ATD/reception
proportions, not first-score ordering. H0 had `rec-td-cushion` (anytime-TD
market), not the first-TD sequence market.

**(4) Edge strength — MEDIUM-HIGH.** Books price first-TD fields on season-long
TD% priors, ignoring first-half/goal-line/red-zone usage ordering and script.
The first scorer of a game is strongly scripted (favorites + early down/red-zone
roles), which is reconstructable from `pbp` scoring timestamps + `target_share`/
rush share + `goal_to_go`. Sign-stable across seasons for goal-line backs/TEs.
High-popularity prop → real CLV surface once an archive exists (see blocker §8).

---

### 4. Kicker FG made / attempts / % / distance-bucket O/U  ·  EDGE: MEDIUM

**(1) Prop line.** "Kicker X over/under Y FG made" / "FG attempts" / "FG%";
sometimes split by distance ("FGs 40–49 made").

**(2) Data source.** NFLVerse `player_stats_kicking` (verified header,
`player_stats/player_stats_kicking_<season>.csv`): `fg_made`, `fg_att`,
`fg_missed`, `fg_blocked`, `fg_long`, `fg_pct`, `fg_made_20_29`…`fg_made_60_`,
`fg_missed_*`, `pat_made`/`pat_att`, `gwfg_att`/`gwfg_made` (game-winning
attempts). Join `team`+`season`+`week`. Layer: `schedules` (`roof`, `surface`,
`temp`, `wind`); `pbp` FG events (`kick_distance`, `blocked` flag) for opponent
FG-block rate; `depth_charts`/team red-zone TD share for FG volume expectation.

**(3) Gap in coverage.**
- **Ingestion:** `player_stats_kicking` is **not** in `NFLVERSE_CATALOG`.
- **Model plan:** §4 mentions kickers only incidentally (§4-E-D2 "wind collapses
  deep-attempt rate and aDOT … kicker effects"; §4-E-D4 altitude → "kick
  distance"). No FG-volume / make-probability model. The repo's
  `STAT_INTAKE_COVERAGE_MATRIX.md` lists data types without `kicking`.
- **Public models:** none of the surveyed NFL-prop repos model kicker attempt
  volume (wind + dome + script + opponent block rate).

**(4) Edge strength — MEDIUM.** FG volume is strongly scripted (blowout leaders
attempt fewer; trailing teams foul-trade more FG attempts) and weather-conditioned
(dome vs. open + `wind`/`temp` already in `schedules`). Books lean on raw attempt
averages + a generic wind flag. The distance-bucket columns let calibrated
make-probability. Edge is real but **low line limits on ST props cap turnover**,
hence MEDIUM (not HIGH) despite a clean signal.

---

### 5. Defensive passes defended (PD) O/U  ·  EDGE: MEDIUM

**(1) Prop line.** "Player X over/under Y passes defended." Offered for CBs/Ss
(Sauce Gardner, Minkah) — more frequent than INTs.

**(2) Data source.** `player_stats_def`: `def_pass_defended`, `def_targets`,
`def_completions_allowed`, `def_completion_pct`; `depth_charts`/`snap_counts`
(role + snap share = opportunity). Join `gsis_id`.

**(3) Gap in coverage.** §4 has no DB/PD model. E-E5 "coverage-shell proxy" uses
team `pass_location` + opponent aDOT-allowed as a *team* shell fingerprint, not
per-player PD opportunity. `player_stats_def` not ingested. Public repos:
receptions-only.

**(4) Edge strength — MEDIUM.** PD is more frequent/stable than INT, and
`def_targets` + snap share set a cleaner opportunity floor books under-weight
(raw PD averages regress slowly). Less public sharp money than offense → softer
lines. Real but moderate signal; books do shade on targets.

---

### 6. Player fumbles (lost / forced / recovered) O/U  ·  EDGE: LOW-MEDIUM

**(1) Prop line.** "Player X over/under Y fumbles" (lost / forced / recovered by
defensive players).

**(2) Data source.** `player_stats` (offense): `sack_fumbles`,
`sack_fumbles_lost`, `rushing_fumbles`, `rushing_fumbles_lost`,
`receiving_fumbles`, `receiving_fumbles_lost`;
`player_stats_def`: `def_fumbles_forced`, `def_fumbles`,
`def_fumble_recovery_own`, `def_fumble_recovery_opp`; `snap_counts` (exposure);
`pbp` fumble events; `injuries`/weather context for wet-ball effects.

**(3) Gap in coverage.** §4-E-D3 notes only "Modest cold/precip … fumble effects;
verify." No fumble model exists anywhere in §4; H0 had `sack-ttt` (time-to-throw
→ pressure) but **not** a fumble-lost/forced prop. Not ingested as a model.

**(4) Edge strength — LOW-MEDIUM.** Fumbles are low-frequency and largely luck,
but **sack-fumbles** (QB) and **rush-fumbles** (RB) scale with pressure exposure
(§4-E-A3/E-E3 pressure signal) + snap volume + wet conditions + team ball-security
philosophy — measurable, weak, sign-fragile. Useful as a supplement, not a
primary edge; low market limits. LOW-MEDIUM.

---

### 7. Defensive interceptions O/U  ·  EDGE: LOW

**(1) Prop line.** "DB X over/under Y interceptions."

**(2) Data source.** `player_stats_def`: `def_interceptions`,
`def_interception_yards`, `def_targets`, `def_pass_defended`;
`pfr_advstats` def: `def_completions_allowed`/`def_targets` (INT proxy);
`depth_charts` (CB/S role + starter). Join `gsis_id`.

**(3) Gap in coverage.** §4 has no DB-INT prop model. The only INT mention is the
H0 **INT bind** (QB *throwing* interceptions) and §4-E-C3 "INT mix shifts"
(pass-rush pressure → QB INT *thrown*), i.e. both are **offensive-QB-INT**
direction. The defensive DB's *interceptions caught* is unwired, and
`player_stats_def` is not ingested.

**(4) Edge strength — LOW.** INTs are the noisiest single-game counting stat —
rare, tip/luck-driven, and books know it. `def_pass_defended` (§5) is the stable
input; INT itself is mostly a coin-flip on targets. Edge exists only for extreme
target-volume CBs in soft games. Keep as a low-priority, low-limit edge. LOW.

---

### 8. Returner / special-teams TD O/U  ·  EDGE: LOW

**(1) Prop line.** "Returner X over/under Y return TDs" / "Anytime TD scorer —
special teams." Often a lotto prop.

**(2) Data source.** `player_stats`: `special_teams_tds` (verified column in the
offense file header — the one ST column that *is* in the offense asset);
`pbp` return events (`return`, `return_touchdown`, `touchback`,
`kick_distance`, `kick_blocked`); `depth_charts` (returner role); opponent
kickoff/punt coverage rates from `pbp`. Join `gsis_id`.

**(3) Gap in coverage.** `player_stats_kicking` is not ingested; the offense
`player_stats_week` only carries `special_teams_tds` (a 0/1 flag), not return
*yardage* (no `pr_yds`/`kr_yds`/`pr_td` in the offense header — the return volume
lives in NFL's separate returns feed, not in the three ingested/inventory families).
§4 is silent on return props. Not modeled.

**(4) Edge strength — LOW.** Very low frequency; books price return TDs as lotto.
Signal (returner role + opponent coverage + weather/wind for hang time) is thin.
Include mainly for completeness / low-limit darts. LOW.

---

## §5. Data-source verification (how each asset was confirmed)

| Asset | Provenance | Verified how |
|---|---|---|
| `player_stats_def` | nflverse-data release `player_stats` tag, `player_stats_def_2023.csv` | `curl` CSV header: `def_tackles,def_tackles_solo,...,def_sacks,def_qb_hits,def_interceptions,...,def_pass_defended,def_fumbles_forced,...,def_safety,def_penalty` |
| `player_stats_kicking` | nflverse-data release `player_stats`, `player_stats_kicking_2023.csv` | `curl` header: `fg_made,fg_att,fg_missed,fg_blocked,fg_pct,fg_made_0_19…fg_made_60_,…,pat_made,pat_att,pat_missed,pat_pct,gwfg_att,gwfg_distance,gwfg_made,gwfg_missed,gwfg_blocked` |
| `player_stats` (offense) | nflverse-data release `player_stats`, `player_stats.csv` | header includes `special_teams_tds`, `sacks` (QB), `sack_fumbles_lost`, `rushing_fumbles_lost`, `receiving_fumbles_lost` |
| `snap_counts` | nflverse-data release `snap_counts` | local adapter `NFLVERSE_CATALOG.snap_counts` ✓ (`since:2012`) |
| `depth_charts` | nflverse-data release `depth_charts` | local adapter ✓ (`since:2001`) |
| `schedules` | nflverse-data release `schedules` | local adapter ✓ (`roof/surface/rest/spread/total/temp/wind` per `nflverse-data-catalog.md` & EDGE_FACTORY §4-E-E5) |
| `pbp` | nflverse-data release `pbp` | local adapter ✓ (`since:1999`, 372-col, scoring/`goal_to_go`/`yardline_100`/`half_seconds_remaining`) |
| `pfr_advstats` (def) | nflverse-data release `pfr_advstats`, `advstats_week_def_2023.csv` | header: `def_ints,def_targets,def_completions_allowed,def_yards_allowed,def_passer_rating_allowed,def_adot,...,def_times_pressured,def_sacks,def_tackles_combined,...` |

## §6. Why these are NOT already H0 / §4

H0 completed binds (per task brief + `docs/data/EDGE_FACTORY_MASTERPLAN.md` §7 P2
slice list + `EDGE-HUNT-LAUNCH.md`): covariate bus, SEP, YAC, CPOE binds, CLF v0,
incentive calendar, rush-yards/INT binds, and the four completed binds
catch-cushion, rec-td-cushion, sack-ttt, comp-air-yards-diff. **All offensive.**
EDGE_FACTORY §4 (E-A1…E-G5) likewise saturates offensive skill props, QB
*passing* INTs, QB *sacked* sacks (E-A3), ATD via joint sim (§3.5), wind/refs
incidentally. The eight lines above are the defensive-player + ST + first-score
markets the masterplan does **not** enumerate — hence "H1+."

## §7. Ingest prerequisites (the cheap unlock)

All defensive/ST edges are gated on a single, license-clean (~5-line) addition to
`NFLVERSE_CATALOG`:
```ts
player_stats_def: ds({ key:"player_stats_def", tag:"player_stats",
  grain:"player-week", since:1999, seasonal:true,
  file:(s)=>`player_stats_def_${s}.csv`,   // CC-BY-4.0
  description:"Per-player defensive counting stats (tackles, sacks, QB hits, INT, PD, fumbles).",
  unlocks:"Defensive-player prop volume models + opportunity-weighted def counting stats." }),
player_stats_kicking: ds({ key:"player_stats_kicking", tag:"player_stats",
  grain:"player-week", since:2009, seasonal:true,
  file:(s)=>`player_stats_kicking_${s}.csv`, // CC-BY-4.0
  ... }),
```
Plus the ST-return yardage lives in NFL's returns feed — classify its license
before ingest (§5 nets-to-cast caution). Per the repo's "Phase-A persistence" gap
(`STAT_INTAKE_COVERAGE_MATRIX.md`), adding these as **CONSUMED/PERSISTED** players
is the founder-gated MODEL_VERSION step the adapter already says it "performs no
writes" and is "not yet wired into the live pipeline."

## §8. Validation blockers (honest — not yet resolvable here)

- **Prop-line close archive does not exist.** `docs/data/CARDS_EDGE_VALIDATE.md`
  EV1 explicitly states: "no prop-line close archive exists … the CLV referee
  **cannot run** for prop families yet" and "must refuse `no_market_feed`, never
  proxy a close." So none of these edges can reach VALIDATED/LIVE without a
  books-closed prop feed (The Odds API is the in-house option per
  `STAT_INTAKE_COVERAGE_MATRIX.md` "Betting market (The Odds API) ✅"). The
  `stats-api/catalog.ts` `fg_made` hit is *basketball* — there is no NFL prop
  ingest at all. → These remain **HYPOTHESIS** until a prop-clv feed lands and
  the §6 protocol (walk-forward + CRPS + 8-week marginal-contribution retirement)
  can run.
- **start.me OSINT4ALL source (login-gated).** `https://start.me/p/GLQNK7/
  copy-of-osint4all` returns a sign-in wall (verified via `web_extract` →
  "Sign in"; confirmed via `browser_exec` → title "Sign in - start.me",
  `HAS_PASSWORD_FIELD: True`, body 65 chars). The Wayback CDX API returns
  `{"archived_snapshots": {}}` (no public snapshot). **Could not be read.**
  OSINT-relevant NFL betting data sources were instead confirmed via the public,
  license-clean NFLVerse stack (CC-BY-4.0) + NOAA/NWS METAR (US public domain)
  + OverTheCap contracts (public) — the same class of public sources an
  OSINT4ALL collection aggregates.

## §9. Sources (cited)

1. NFLVerse data catalog / data-stack (CC-BY-4.0):
   - Local: `docs/nflverse-data-catalog.md`; adapter
     `packages/data-ingestion/src/nflverse-source.ts` (`NFLVERSE_CATALOG`,
     `PLAYER_STATS_OFFENSE_POSITIONS` line 397),
     `docs/STAT_INTAKE_COVERAGE_MATRIX.md` ("only player/stat/snap/injury/depth/
     historical-game/team-efficiency are persisted").
   - Web: NFLVerse Data Update & Availability Schedule,
     https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html
     (NGS nightly, PFR adv daily 7 AM UTC, snap_counts 0/6/12/18 UTC).
2. NFLVerse release assets — **verified by fetching real CSVs** from
   https://github.com/nflverse/nflverse-data/releases/tag/player_stats :
   `player_stats.csv` (header retrieved), `player_stats_def_2023.csv` (header
   retrieved: def_tackles_solo, def_sacks, def_qb_hits, def_interceptions,
   def_pass_defended, def_fumbles_forced, def_fumble_recovery_own/opp, …),
   `player_stats_kicking_2023.csv` (header retrieved: fg_made, fg_att, fg_pct,
   fg_made_20_29…fg_made_60_, pat_made, gwfg_*). Also
   `advstats_week_def_2023.csv` (pfr_advstats def: def_ints, def_targets,
   def_completions_allowed, def_times_pressured, def_pressures, …). API asset
   listing confirmed via GitHub Releases API (`player_stats_def`,
   `player_stats_kicking`, `player_stats`, `player_stats_season` families exist;
   no `player_stats_return`/`special` family → returns not in those bundles).
3. NGS data dictionary (verified columns):
   https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html
   (avg_separation, avg_cushion, completion_percentage_above_expectation,
   rush_yards_over_expected, avg_yac, avg_expected_yac [NGS-yards-after-catch
   alternative to the H0 comp-air-yards-diff]).
4. PFR passing dictionary (pressure/throw-quality columns):
   https://nflreadr.nflverse.com/articles/dictionary_pfr_passing.html
   (batted_balls, drops, pocket_time, times_blitzed/hurried/hit/pressured,
   pressure_pct — backs the QB-sack signal, §4-E-A3/E-E3).
   PFR 2023 Advanced Defense page:
   https://www.pro-football-reference.com/years/2023/defense_advanced.htm
5. EDGE_FACTORY masterplan (in-repo, verified):
   `docs/data/EDGE_FACTORY_MASTERPLAN.md` §2–§7 (§4 = EDGE_CATALOG seed
   E-A1…E-G5; §6 = validation protocol; §7 = P2 slice order).
   `docs/ops/hermes/EDGE-HUNT-LAUNCH.md` (H0 completed: covariate bus, SEP, YAC,
   CPOE binds, CLF v0, incentive calendar, rush-yards/INT binds, catch-cushion,
   rec-td-cushion, sack-ttt, comp-air-yards-diff).
   `docs/data/CARDS_EDGE_VALIDATE.md` EV1 (no prop-line close archive; CLV
   referee cannot run on props yet).
6. Public NFL prop repos (coverage saturation signal):
   `github.com/quantgalore/nfl-props` — "NFL Reception Player Props" only
   (receptions); star/forks low; confirms offensive-reception props are the
   saturated, public-model focus and that defensive/ST lines have no public
   counterpart.
7. Sportsbook prop-market confirmation (offered lines):
   - Rotowire NFL player props: https://www.rotowire.com/betting/nfl/player-props.php
   - Sports Betting Dime, "Best NFL Player Prop Betting Strategies":
     https://www.sportsbettingdime.com/guides/how-to/nfl-player-prop-bets/
     (confirms passing/rushing/receiving yards, receptions, anytime TD; mentions
     sacks, INT, FG, first-TD among offered types in search index).
   - Vegas Insider NFL player props: https://www.vegasinsider.com/nfl/odds/player-props/
8. OSINT source status: start.me `copy-of-osint4all` page
   (https://start.me/p/GLQNK7/copy-of-osint4all) — **login-gated, no Wayback
   snapshot**; documented as a blocker in §8. (OSINT4ALL is canonically a
   public-source intelligence collection; NFL-relevant public sources were
   confirmed directly as cited above.)
