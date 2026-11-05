# TNF `JAX @ BAL` — W1–8 nflverse PBP Reproduction Receipt

**Generated:** 2026-11-05 | **Kickoff:** 2026-11-06 01:15 UTC (7:15 PM CST)
**Data window:** 2026 regular season Weeks 1–8 (`play_by_play_2026.parquet`, 21,191 plays, 121 games; 14,910 filtered pass/run plays) + FTN charting Weeks 1–7
**Official ledger:** 16-5 (76.2%, +10.45u) — `data/engine/new_engine_official_ledger_2026.json`

Source-of-truth JSON: `data/engine/tnf_jax_bal_pbp_reproductions_2026_11_05.json`
Script: `scripts/ops/tnf_jax_bal_matchup_reproductions.py`

## Stage 1 data closure

| Gap | Before | After | Source |
|---|---|---|---|
| Week 9 injury rows | Weeks 1–8 only (2,388 rows) | 2,725 rows, 266 Week 9 rows, 26 teams | nflverse `injuries_2026.csv` release |
| Week 8 PBP | 1 game / 188 plays | 14 games / 2,453 plays | nflverse `play_by_play_2026.parquet` release |
| Week 9 game scripts | no 15-game staging file | 15 games staged with live total + home spread | ESPN scoreboard odds snapshot |
| Bhayshul Tuten | unresolved | **Questionable, ankle, DNP** | nflverse Week 9 row + startwho (Alexandria) |
| Lamar Jackson | hard-excluded | confirmed **Out, thumb** | nflverse Week 9 row |
| Travis Etienne Jr. | hard-excluded (legacy) | **Not on the JAX 2026 roster**; nflverse shows NO 31 carries / CAR 8. No board impact. | nflverse pbp |
| Mike Evans | ruling SF | 49ers Week 9 practice DNP (ribs/achilles), no game designation | nflverse |
| Geno Smith | ruling NYJ | Jets QB1 in Stage-0 config | Stage-0 config |

## Reproduction status of the five claims

| Claim | Status | Computed |
|---|---|---|
| F6 BAL light-box rate `53.2%`, 3rd | **Rank corroborated, level not** | 77.95% on dropbacks (n=263), 70.64% on all plays (n=419), rank **2nd** of 32 |
| F6 BAL dime rate `28.3%`, 2nd | **Reproduced within proxy tolerance** | 30.7% on the FTN <=5-in-box proxy (all defensive plays); no free team-level dime charting exists |
| F6 BAL two-high rate `59.7%`, 7th | **Reproduced** | 59.5% Sharp Football middle-open rate (charting, updated 2026-10-27) |
| F6 TLaw EPA/dropback vs two-high `-0.17` | **Proxy only** | Rate validated at 59.5%, but per-shell EPA is not public. Box split: vs light box (≤6) **+0.3521** (n=137); vs heavy box (≥7) **+0.1091** (n=56) |
| W2 JAX backside A-gap / Fire Zone | **Film-only, rates computed** | Blitz 30.9%, pressure 16.67%, PA blitz 34.78%, under-center pressure 27.5% |
| W8 Zay Flowers MOF | **Reproduced at counts, definition differs** | Flowers 58 tgts / 40 rec / 608 yds; `pass_location == middle` 22 tgts / 14 rec / 258 yds. Published line (29 tgts / 22 rec / 339 yds) uses over-the-middle charting, not pass location. The 34.8% / 76.8% figures are Brissett QB-level MOF rates, not a team share. |
| W10 Catchable Ball Rate | **Reproduced** | TLaw 70.47% (193 charted) EPA/dropback +0.2878; BAL: Jackson 72.28%, Huntley 68.97%; Fagnano uncharted (Week 8 only). Brissett's 69.15% is Arizona, excluded after the team filter. |
| W3 Mismatch Manifesto sums | **Reproduced** | See table below; RB YBC now measured from PFR 2026 |

### W3 combined sums (offense value + opponent defense allowed)

| Pillar | JAX offense | Rank | BAL defense allowed | Rank | Combined |
|---|---|---|---|---|---|
| EPA/play | 0.1636 | 3 | 0.0124 | 17 | 0.1760 |
| Pass yds/dropback | 7.649 | 1 | 6.450 | 17 | 14.099 |
| Rush yds/rush | 4.464 | 12 | 3.837 | 7 | 8.301 |
| Pressure rate allowed | 0.1622 | 20 | 0.1700 | 7 | 0.3322 |
| Explosive rate | 0.1106 | 4 | 0.0832 | 10 | 0.1938 |

Rank convention: 1 = best in the league for EPA, pass yards, rush yards and explosive rate. For pressure, rank 1 = highest pressure rate allowed, i.e. the defense that generates the most pressure; Baltimore's 7 means 7th-most pressure generated. RB YBC is now measured from Pro-Football-Reference 2026 Advanced Rushing: BAL 2.52 YBC/Att (231 att, 582 YBC), JAX 1.92 (200 att, 384 YBC). The nflverse pbp file still has no contact field, so PFR is the source of record.

## What this means for the TNF board

- Jacksonville's offense is a top-3 EPA/play and **No. 1 pass-yards-per-dropback** unit through eight weeks; Baltimore's defense is league-average against both (17th).
- Baltimore's defense is a genuinely light-box unit (2nd) but the popular 53.2% figure is not reproducible on this data; do not present the level as verified.
- Baltimore's two-high rate validates at 59.5% and its dime rate at 30.7% on public proxies, so the scheme-profile claims stand. Trevor Lawrence's per-shell EPA delta still cannot be computed from public data, so any market leg that depends on that delta remains **PASS (publishAllowed: false)**.
- Tuten is Questionable with a DNP, so Jacksonville RB volume is unstable; prop exposure requires a status re-check at 90 minutes pre-kick.

## Watchlist correction (2026-11-05 capture)

`@SumerSports` (2026-11-04) states the MOF claim directly: Brissett throws over the middle 34.8% of the time and completes 76.8% of those; Flowers over the middle has 29 targets (3rd), 22 catches (T-2nd), 339 yards (4th). Those are QB-level and charting-level numbers, not the team pass-location share computed here. The count gap is definitional, not an error in either source.

## Reproducibility boundary

Reproduced: BAL light-box rate, BAL two-high rate (Sharp middle-open 59.5%), BAL dime rate (FTN <=5-box 30.7%), RB YBC (PFR 2026), TLaw box-split EPA/dropback, JAX blitz/pressure rates, Zay Flowers MOF profile, BAL MOF pass profile, Catchable Ball Rate, Mismatch Manifesto components.

Still not reproducible from public data: per-shell TLaw EPA delta, A-gap/Fire Zone attribution. Those remain external claims and are never model inputs. Dime is a labeled proxy (FTN box count), not charted personnel.
