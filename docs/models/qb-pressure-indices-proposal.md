# QB Pressure Sensitivity & Protection Stress — math proposal (pre-build)

> Tracker law: math proposal first; owner approves here before code ships
> (same pattern as `market-gravity-index-proposal.md`). Everything below
> derives ONLY from datasets already in the ingestion registry:
> `pfr_advstats` (live in `lib/nflverse/pressure-coverage.ts`), `pbp`, and
> `ftn_charting`. No new sources.

## Index 1 — QB Pressure Sensitivity

**What it claims:** how much a QB's per-play value degrades when pressured.

**Math:** from play-by-play joined to FTN per-play charting (both nflverse):

```
sensitivity = EPA/dropback (clean pockets) − EPA/dropback (pressured)
```

Reported in EPA per dropback, season-to-date, REG only. Higher = more
pressure-fragile.

**Null guards:**
- < 100 pressured dropbacks in the window → null (never a guessed split)
- Join coverage check: if < 95% of the QB's dropbacks match an FTN row,
  null — a partial join is a silent bias

**Stated weaknesses (rendered with the number):**
- Pressure is FTN's human charting call — subjective at the margins
- Sensitivity conflates QB and his line: a QB pressured instantly has no
  clean baseline to be measured against
- EPA inherits opponent strength; no opponent adjustment in v1

## Index 2 — Protection Stress (team, weekly)

**What it claims:** how hard the offensive line is being stressed,
separated from blitz volume.

**Math:** from `pfr_advstats` (pressures, blitzes faced) per team-week:

```
stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)
```

where `league_expected_rate` is the season-to-date league regression of
pressure rate on blitz rate (linear, refit weekly). Positive = the line
gives up more pressure than its blitz exposure explains — losing
one-on-ones.

**Null guards:** < 3 team games → null; league fit uses ≥ batch of 32
team-weeks before any output (early-season → null, stated).

**Stated weakness:** blitz count ≠ rusher quality; a simple linear
expectation can't see scheme. v1 is a screen, not a verdict.

## Where they surface

Players Lab (QB view) and matchup surfaces, each value carrying the Stat
Stability Grade (existing) and its weakness line per the stat
commandment. No pick-engine input in v1 — display + analyst use only
until calibration says otherwise.

## Acceptance criteria

- [ ] Owner approves the math (amend in this file)
- [ ] Pure derivations + tests (clean/pressured split fixtures, join
      coverage guard, blitz regression null path)
- [ ] Loader stays bounded + cached like `pressure-coverage.ts`
- [ ] Tracker line moves in the same commit
