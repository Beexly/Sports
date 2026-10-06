# Projection Methods — BUF vs DET, 2026-09-17 (Workstream 2)

Research only. Nothing here becomes a public pick. Every number traces to
computed data; every judgment call is stated. Where the data could not
support a projection, the row is NULL and the reason is one line.

## 1. Data sources

- **nflverse play-by-play**, `play_by_play_2025.csv.gz` (48,771 raw plays)
  and `play_by_play_2026.csv.gz` (2,756 raw plays), downloaded 2026-09-17
  from `https://github.com/nflverse/nflverse-data/releases/download/pbp/`.
  License CC-BY 4.0, attribute "nflverse". Files kept at
  `props-consensus/scratch/` (not in `nfl-2026/`, per brief).
- **FTN charting 2025** (`ftn_charting_2025.csv`, same release path,
  `.../ftn_charting/`), joined on `(nflverse_game_id, nflverse_play_id)` for
  `is_interception_worthy` only. License CC-BY-SA 4.0, attribute
  "FTN Data via nflverse".
- **Team metrics** `~/workspace/gse-research/nfl-2026/team_metrics_2025.csv`
  and `team_metrics_2026.csv` (Worker B, same filters), read-only, used for
  team EPA splits, pace, and defensive adjustments.
- **Methods literature**: `docs/2026-09-17-advanced-analytics-landscape-v2.md`
  Part III (turnover regression: Stuart/Burke; pressure stability: PFF,
  STRAIN; EPA predictive validity: PFF hot-start, Zhou 2026).

## 2. Filters (identical to COMPUTATION_NOTES.md)

REG only; `play_type` in (`pass`,`run`); `qb_kneel==0`, `qb_spike==0`;
garbage time excluded (`qtr==4` AND (`wp>0.95` OR `wp<0.05`)); OT kept.
Reproduced counts exactly: 29,239 plays (2025), 1,673 (2026 Wk1).
Definitions: success = EPA > 0; dropback = `pass_attempt==1` OR
`qb_scramble==1`; official pass attempts = `pass_attempt` minus sacks
(sack implies `pass_attempt==1`, verified); scrambles count as QB rushing.

## 3. Base prior, the 2026 Week 1 rule, and roster corrections

Base prior = **2025 full-season per-game means**, computed from the filtered
sample (not quoted from anywhere). 2026 Week 1 is a **one-game check only**:
used to (a) confirm role continuity (target/carry shares, active status),
(b) flag structural breaks. **Efficiency levels are never blended**
(100% 2025 / 0% Wk1 for rates); the weighting is stated per row.

Two structural breaks forced share-basis changes (verified in play-by-play,
2026-09-17):

- **David Montgomery plays for HOUSTON in 2026** (20 carries in
  `2026_01_BUF_HOU`; zero DET touches). His DET rows are VOID, not
  re-projected. Detroit's backfield is now Gibbs + backups; the nominal
  RB2 by Wk1 usage is **Sion Vaki** (2 carries), who had **zero** 2025
  filtered touches — too thin to price (NULL, stated).
- **DJ Moore plays for BUFFALO in 2026** (traded from CHI; 8 targets in
  `2026_01_BUF_HOU`). BUF's 2025 target distribution is therefore stale.
  For BUF receivers the **share basis is Wk1 2026** (29 team targets:
  Moore 27.6%, Kincaid 20.7%, Shakir 20.7%, Cook 13.8%), explicitly
  labeled n=1 with SE ~8pp; **efficiency stays 2025** (Moore: 2025 CHI
  17g, 59.5% catch, 7.86 YPT). Cross-check: Shakir's Wk1 share (20.7%)
  ~= his 2025 share (21.0%), so his projection barely moves; Kincaid's
  Wk1 share (20.7%) exceeds his 2025 active share (16.8%), so his moves up.
  Using stale 2025 shares would systematically misprice the BUF pass
  game; the n=1 caveat is the honest price of currency.

## 3b. Garbage-time adjustment (full-game expectations)

Props settle on full games; our filters exclude ~11% of plays (garbage
time). Filtered per-game means therefore understate full-game volume.
Correction: each volume projection is multiplied by the measured
**unfiltered/filtered per-game ratio** for that exact stat:

| player | stat | ratio |
|--------|------|-------|
| Allen | att 1.025, yds 1.031 | team plays 1.112 |
| Goff | att 1.105, yds 1.094 | team plays 1.113 |
| Cook | att 1.069, yds 1.035 | |
| Gibbs | att 1.052, yds 1.098 | |
| Targets | StB 1.103, JWi 1.133, LaP 1.195, Gib 1.093, Sha 1.078, Kin 1.042, Moo 1.076, Coo 1.081 | |
| TDs | team plays ratio (BUF 1.112 / DET 1.113) | |

Bands are scaled by the same ratio. This is a measured bias correction,
not a fudge: without it every volume prop would be systematically short
of how the bet settles. It moves Allen 195->201 and St. Brown rec 6.5->8.0.

## 3c. Shootout-script check (dropped as immaterial)

Using `total_line` in the pbp: BUF dropback rate in 2025 games lined >=52
was 56.9% (n=2) vs 56.1% season; DET 62.0% (n=5) vs 59.1%. Directionally
supports a small shootout bump at tonight's 54.5-55.5 total, but n=2/n=5
is too thin and the shift (+1-3pp) is immaterial vs the bands. Dropped
from the numbers per the complexity directive; noted here.

## 4. Volume model (script-adjusted)

Bills are -5.5 favorites. Trailing teams throw more; leading teams run more.
Measured 2025 dropback rates by possession-WP bucket (filtered sample):

| team | leading (wp>.65) | neutral | trailing (wp<.35) | season |
|------|-----------------|---------|------------------|--------|
| BUF  | 50.0% (n=328)   | 57.2%   | 61.8%            | 56.3%  |
| DET  | 54.2% (n=284)   | 57.1%   | 68.2%            | 59.5%  |

Tonight's script assumption: BUF leads more than average -> **53%**
(between leading and season); DET trails more -> **63%** (between season
and trailing). Expected plays: BUF 56 (2025: 56.35/g), DET 55 (2025: 55.5/g).

- BUF dropbacks = 56 x 0.53 = 29.7. Allen's share of team dropbacks in his
  own games = 464/510 = **91.0%** -> 27.0 Allen dropbacks ->
  x 92.24% (428/464) = **24.9 attempts**.
- DET dropbacks = 55 x 0.63 = 34.7. Goff's share = 554/562 = **98.6%** ->
  34.2 -> x 94.04% (521/554) = **32.1 attempts**.
- Designed rushes = plays x (1 - dropback rate): BUF 26.3, DET 20.4.
  Carry shares: Cook 289/419 = 69.0% (Wk1: 13/19 = 68%, confirms);
  Gibbs ~88% of DET designed rushes as the lead back with Montgomery on
  HOU (Wk1 2026: 29/32 = 91%; stated compromise, see sections 3 and 8).

Honesty note on the script adjustment (per the complexity directive): vs
flat season averages the script moves Allen -14 pass yards and Goff +13,
which is **second-order against the +-65-yard bands**. It is kept because
the effect is measured in our own data (8-12pp swing), not modeled — but
it is not the driver of any projection, and the flat-average alternative
is the right mental anchor.

## 5. Efficiency baselines (2025)

- Yds/attempt: Allen 7.83 (3350/428), Goff 8.01 (4172/521).
- YPC: Cook 5.42, Gibbs 4.82, Montgomery 4.60.
- Target shares (% of QB attempts, overlap games): St. Brown 29.9%,
  J. Williams 17.3%, Gibbs 16.5%, LaPorta 17.2% (active), Shakir 21.0%,
  Kincaid 16.8% (active), Cook 8.6%, Montgomery 5.4%.
- Catch rates: LaPorta 85.4%, Montgomery 85.7%, Gibbs 81.4%, Cook 81.1%,
  Kincaid 77.1%, Shakir 74.4%, St. Brown 67.9%, J. Williams 65.6%.
- YPT: Kincaid 11.42, J. Williams 11.07, LaPorta 10.85, St. Brown 8.29,
  Cook 7.41, Shakir 7.16, Montgomery 6.86, Gibbs 6.57.
- Per-game TD means: Allen pass 1.375 / rush 0.875; Goff pass 1.706;
  Cook rush 0.706; Gibbs rush 0.647; Montgomery rush 0.353.
- Tackles/g (solo+assist, pbp credits): Campbell 8.47 (sd 2.9),
  Anzalone 5.00 (sd 2.45), Bishop 4.47 (sd 2.12).

## 5b. Market comparison (indicative lines, DraftKings via SI, 2026-09-16)

Our data cannot pull live lines; these were read from published previews
on 2026-09-17 and will have moved. Recorded for the agreement/disagreement
audit only — not as picks:

| prop | market line | our projection | read |
|------|-------------|----------------|------|
| Allen pass yds | 250.5 | 201 (band 135-265) | **DISAGREE (under)**. ~50-yd gap, the slate's largest. Market weights W1 form (334 yds), DET secondary injuries (see below), 55.5 total. Model weights 2025 base + favorite script. The DET safety absences are a genuine unmodeled upside risk: lean under, not a strong call. |
| Gibbs rush yds | 89.5 | 95 (band 50-140) | **AGREE-ish (no edge)**. Line sits at our number; a coin flip. SI's published "over" is not supported or refuted by our data. |
| St. Brown receptions | 7.5 | 8.0 (band 4-12) | **MILD DISAGREE (over)**. Note the garbage-time correction moved this from 6.5 to 8.0; the correction is measured (ratio 1.103), not a fudge. Still a weak lean. |

No other market lines were sourced; the parent can pull live lines via
odds tooling for the remaining props before any agreement/disagreement
call is made. Nothing here is a pick.

## 6. Deeper metrics actually used (complexity)

- **Success rate / EPA by unit** (team_metrics_2025): BUF pass O +0.174/db
  vs DET pass D +0.014 (avg); DET pass O +0.168/db vs BUF pass D +0.108
  (good); BUF rush O +0.078 vs DET rush D -0.001 (avg); DET rush O -0.055
  vs BUF rush D -0.064 (bad). Applied as **qualitative modifiers only**:
  mild efficiency risk for Goff (good BUF pass D), mild positive for DET
  backs (bad BUF rush D). Numbers are NOT opponent-adjusted; stated
  everywhere. Both defenses allow low success rates (42.5-42.6%).
- **Drive stats** (recomputed from pbp, garbage-time excluded; XP/FG from
  unfiltered scoring plays): BUF 9.0 drives/g, 35.3% TD rate, 20.3%
  three-and-out, 2.71 pts/drive; DET 9.5 drives/g, 29.0% TD rate, 20.4%
  three-and-out, 2.46 pts/drive. Used as mechanism support for TD
  projections (both offenses finish drives; neither goes 3-and-out much).
- **Early- vs late-down splits** (designed rushes, 2025): Cook 95.5% of
  carries on downs 1-2 (5.45 YPC early / 4.77 late); Gibbs 89.6% early
  (5.01 / 3.13); Montgomery 86.6% early (4.86 / 2.94). All three backs are
  early-down dependent -> **game-script sensitive**: if their team trails
  and abandons the run, volume evaporates. This is the central risk on
  every RB row, stated in `key_assumptions`.
- **Explosive-play rates**: BUF generates 15.9% / allows 13.9%; DET
  generates 14.8% / allows 14.2%. Neutral for the deep threats
  (J. Williams 12.6 aDOT); noted, not priced.

## 7. Originality angles (from v2 methods literature)

- **Turnover luck -> INT props.** FTN `is_interception_worthy`, 2025:
  Allen 17 worthy throws in 464 dropbacks (3.66%) but only 10 actual INTs;
  Goff 8 in 554 (1.44%), 8 actual. League worthy->INT conversion 52.3%.
  Allen projection = 27.0 exp db x 3.66% x 52.3% = **0.5** (band 0-2);
  Goff = 34.2 x 1.44% x 52.3% = **0.3** (band 0-1). The signal is Allen's
  *danger volume* (3.66% worthy rate, 2.5x Goff's), not his 10 INTs.
  Against a typical 0.5 market line: Allen = coin flip (no edge),
  Goff = mild under lean (weak; single-game INTs are noise).
- **Fumble recovery luck (team-level, qualitative):** DET recovered 26.3%
  of opponent fumbles in 2025 (expect positive takeaway regression);
  BUF's defense generated +4.1 INTs over expected (expect negative
  regression). Net: no player-prop edge strong enough to price; noted.
- **Pressure stability -> sack props = deliberate NULL.** Literature:
  pressure generation is sticky, pressure-to-sack conversion is luck
  (R^2 < 0.005). Hutchinson's 11.5 sacks rest on 27 credited QB hits
  (real, sticky pressure); Rousseau's 7 on 23. But single-game sack
  totals are conversion noise, so **no sack projection for any player**.
  Our `qb_hit`/`sack_rate` columns are lower-bound proxies (hurries
  invisible); stated as such. This is the literature applied as a veto,
  which is the honest use.
- **Allen scramble composition (found angle):** 45 of his 89 rushes were
  scrambles, producing 387 of 543 rush yards (71%). His rushing prop is a
  *pressure + script* derivative, not a designed-run projection. And his
  goal-line role is the slate's best TD mechanism: 27 RZ rushes -> 13 TDs
  (48.1%), 0.875 rush TD/g.

## 8. Assumptions, all of them

1. Pace: BUF 56 / DET 55 offensive plays (2025 filtered means 56.35 / 55.53),
   then garbage-time-adjusted to full-game expectations (section 3b).
2. Script: BUF 53% / DET 63% dropback rates (section 4). Bills -5.5
   confirmed by market (multiple books 2026-09-17); total 54.5-55.5.
3. QB availability and full-game shares (91.0% / 98.6%).
4. **Montgomery is on HOU** (verified). Gibbs base case = lead back at
   ~88% of designed rushes (Wk1 91%, stated compromise; Vaki takes the rest).
5. BUF target shares from Wk1 2026 (n=1, SE ~8pp) because Moore's arrival
   makes 2025 shares stale (section 3); DET shares from 2025 (Moore-free,
   structurally intact).
6. Missed-game shares use overlap-game denominators (section 3).
7. Efficiency rates (yds/att, YPC, YPT, catch%) carry forward at 2025
   levels; no opponent adjustment applied to numbers.
8. Unmodeled qualitative factors (not smuggled into numbers):
   - DET down LG Christian Mahogany + RT Blake Miller (both **ruled out**
     9/17, USA Today). Goff was already hit on 18.9% of 2025 dropbacks
     (2nd-highest allowed) -> downside risk on Goff efficiency, and mild
     downside on Gibbs' early-down run game.
   - DET without safeties Brian Branch + Kerby Joseph (USA Today 9/17):
     upside risk for the entire BUF pass game (Allen/Shakir/Kincaid/Moore)
     and a tackle-redistribution bump candidate for Campbell/Anzalone.
     This is the main counterweight to our Allen-under-250.5 lean.
   - DET CB D.J. Reed questionable (tackle-prop depth note).
   - BUF home opener in the new $2.1B Highmark Stadium (crowd noise):
     no quantitative effect modeled.
9. Tackle credits from pbp slightly undercount official tackles.
10. Short-week Thursday road game for DET (played OT in Wk1): fatigue is
    real but unquantified; not modeled.

## 9. Nulls and why

- **David Montgomery (DET)**: VOID — verified on HOU's 2026 roster
  (20 carries Wk1). Roster correction applied; play-by-play trusted over
  the brief's assumptions.
- **Sion Vaki (DET) rushing**: NULL — nominal RB2 by Wk1 usage (2 carries)
  but zero 2025 filtered touches; no projectable role. Identified from
  play-by-play per the roster-correction task.
- **Longest reception** (any player): single-play extreme = pure noise.
- **Individual sacks** (incl. Hutchinson): conversion luck per literature.
- **Milano / Bernard tackles**: per-game sd ~= mean (rotational noise);
  Bernard's 11-tackle Wk1 is n=1, not a new baseline.
- Receptions were projected **only** where target-share stability was
  verifiable: split-half shares — St. Brown 29.5%/27.0%, J. Williams
  14.1%/17.5%, Gibbs 12.3%/17.5%, Cook 6.4%/8.4%. Kincaid (14.5%/5.9%) and
  LaPorta (16.8%/1.2%) fail the naive split-half because of injury-missed
  games; projected on the **when-active** share with Wk1-2026 role
  confirmation (6 and 8 targets). BUF's Wk1 shares (Moore/Shakir/Kincaid)
  are n=1: projected anyway because the alternative (stale 2025 shares
  that omit Moore) is strictly worse, with the SE ~8pp caveat on every row.

## 10. Known weaknesses

- No opponent adjustment anywhere; cross-unit EPA used qualitatively only.
- One-game Wk1 sample cannot confirm or deny anything; used for roles only.
- TD projections are per-game means with wide bands — the honest shape of
  a low-count process, not precision.
- YPC outliers (Cook 5.42) will regress toward ~4.5 eventually; the band
  (50-145) carries it but the point estimate does not haircut it.
- `qb_hit` undercounts true pressure (no hurries); sack/hit proxies are
  floors.
- INT projections rest on FTN charting (2025 only) and a league-average
  conversion; single-game INTs remain ~Poisson noise.
- Market direction comparison was not possible from our data alone; needs
  live lines (parent can pull via odds tooling) before any agreement/
  disagreement call is made. Nothing here is a pick.

## 11. What would change these numbers before kickoff

Inactives for the tackle props (Campbell/Anzalone/Bishop every-down
confirmation); D.J. Reed's status (DET CB, questionable); any further OL
news beyond Mahogany/Miller; weather (open-air stadium — check game-day);
official confirmation of Vaki as DET's RB2 vs a deeper rotation (only
moves the Gibbs share assumption at the margin).

---
*Data: nflverse (CC-BY 4.0). FTN charting via nflverse (CC-BY-SA 4.0).
Computed 2026-09-17 by Workstream 2. Methods: sections 2-5 above.*
