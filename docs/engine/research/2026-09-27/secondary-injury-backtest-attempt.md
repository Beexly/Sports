# §2 SECONDARY_INJURY backtest — attempted, and it does NOT resolve

Date: 2026-09-28. Branch `hermes/shard-rotation`. Read-only production SQL (neonctl `hermes_ro`).
Predecessor: TSW-1 built the adjustment layer with `DEFAULT_MAGNITUDES` labelled uncalibrated.
This note records why the §2 backtest could not produce a number, and what the numbers that
*were* computed do and do not mean.

## Verdict

**Backtest-or-CUT is undecidable today, in the direction of "not enough data," not "the rule
failed."** No magnitude is claimed. `DEFAULT_MAGNITUDES.SECONDARY_INJURY_*` stay uncalibrated.

## What was confirmed about the premise

Both of the prior session's corrections reproduce exactly.

- The S-code omission is real: §2 fires on `pos === "S" || pos === "CB"`. In prod,
  `position='S' AND reportStatus='Out'` = **125** rows all-time, **22** in 2026; CB/Out = 187.
  So §2 is backtestable in principle. (Casing matters: the column holds `'Out'`, not `'OUT'`;
  a `'OUT'` predicate silently returns 0 rows and looks like "no data.")
- The join key really is dead. `player_game_stats.team` is NULL for **all** 2025 (6,396 rows)
  and 2026 (1,068 rows) rows; 2020-2024 are 100% populated. Fix `ffd0330c1` is correct and
  its re-ingest has not run — prod still reads the old values.

## The blocker: injuries do not overlap the stat seasons

| Source | Seasons present |
|---|---|
| `injuries` | 2025 (wks 1-22), 2026 (wks 1-3) only |
| `player_game_stats` with `team` non-null | 2020-2024 only |

Join on season yields **0 rows**. There is no season in which a §2 trigger and a team-keyed
stat row coexist. This is not fixable by a re-ingest of either table alone.

`opponent` is the one key that survives the nflverse rename — 100% populated in every season
including 2025/2026 — and it *does* join: all 245 exposed team-weeks are matchable. So a
naive §2 measurement is runnable. It is also wrong, for two independent reasons below.

## Why the naive measurement must not be published

**1. The sign flips with an unverified week convention.** Injury reports are published *before*
the game; `injuries.ts` calls the source "the lagged weekly report." Shifting the exposure week
and holding everything else fixed:

| shift | defenses w/ both | per-player diff | t | pct |
|---|---|---|---|---|
| -1 | 44 | +0.332 | 1.16 | +4.66% |
| 0 | 46 | -0.390 | -1.67 | -5.12% |
| +1 | 48 | -0.192 | -0.65 | -2.51% |

A causal claim whose sign is chosen by a join convention is measuring the convention. The
`shift=0` row is the *most negative* and would have been the number to publish had I not tested
the neighbours. It is also the one consistent with the spec's assumed positive sign at `shift=-1`,
which is exactly why it needs to be falsified rather than picked.

**2. No shift is statistically distinguishable from zero.** |t| = 1.16 / 1.67 / 0.65 at n = 44-48
paired defenses. Per-player normalization was required: exposed weeks average 11.2 offensive
players vs 10.1 in clean weeks, so a raw sum compares different-sized player pools.

## The confound that cannot be removed with current data

The cross-section is also confounded by team quality, and `team` being NULL in 2025/2026 is
precisely what prevents controlling for it:

- Raw cross-section: exposed 83.19 mean fPPR vs clean 85.83 (245 vs 3,235 team-weeks).
- Within-defense paired: 80.83 vs 84.03, n=46.

Both point *against* §2's assumed direction, which is the opposite of what the spec assumes and
of what `shift=-1` shows. Three mutually inconsistent readings from the same data means the
design is not identified, not that the rule is refuted.

A valid design needs offense identity for 2025/2026 so the same offense can be compared to
itself across weeks. That is exactly the `team` column `ffd0330c1` restores. **The re-ingest is
the unblock, and it has not run.**

## Also unresolvable right now: the alignment cross-check

The natural way to settle the week convention is to ask whether a player reported Out in week W
still appears in week W's stats. That test cannot run:

- `injuries.playerId` is populated on **2 of 312** secondary-Out rows.
- Bridging via `players.gsisId` resolves only **17 rows / 11 of 166 distinct gsisIds** — the
  depth-chart backfill from `72138b69f` has not been applied in prod either.

`depth_chart_entries` holds only 2026 wks 1-3 (2,293 rows, 32 teams), so it cannot bridge
2025. `team_week_stats` — the natural outcome table — has **0 rows**.

## What would unblock this, in order

1. Re-ingest `injuries` so the depth-chart crosswalk lands (fixes `playerId` and the gsisId
   coverage). This alone makes the alignment test runnable.
2. Re-ingest `player_game_stats` so `team` is populated for 2025/2026 (`ffd0330c1`).
3. Re-run the alignment test and pin the week convention from evidence, not from the sign.
4. Only then re-measure, with offense fixed effects and per-player normalization.

Steps 1 and 2 are the same idempotent re-ingest. Until it runs, no §2 magnitude is defensible.

## What this does NOT say

- It does not say §2 is wrong. The effect is simply not measurable at this n with this join.
- It does not license editing `DEFAULT_MAGNITUDES` in either direction. Law 3 and TSW-1's own
  honesty rule both hold: an uncalibrated magnitude is labelled uncalibrated until a backtest
  replaces it. The backtest did not run.
- The TSW-1 fixes stand on their own. They made the rules *able* to fire. This note is only
  about whether firing on real data moves a number in the predicted direction.
