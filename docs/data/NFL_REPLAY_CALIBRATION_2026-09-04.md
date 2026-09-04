# NFL replay — the first honest number about the model

Run 2026-09-04, after the nflverse spread-sign fix (`0d2116cbb`). Every figure here
is output I saw from a command in this document; nothing is estimated.

## Command

```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backfill/historical-settlement-backfill.ts \
  --from=1999 --to=2025 --type=REG
```

Dry-run (the default): zero DB writes. Data is nflverse `games.csv` —
`approved_open_license`, CC-BY-4.0. *Data via nflverse (nflverse-data), licensed CC BY 4.0.*

## Result

```
in-range games: 6967
settled picks: 15939  (SPREAD 6967, TOTAL 6967, MONEYLINE 2005)
results: 8246 W / 7401 L / 292 P
win rate (excl. pushes): 52.7%
lookahead errors: 0
CLV: 15939 MATCHED_CLOSE
```

## What that number means

| Window | Decisive | Win rate | 95% CI | vs 52.381% BE | z | Significant? |
|---|---|---|---|---|---|---|
| **1999-2025 (headline)** | 15,647 | **52.700%** | [51.92%, 53.48%] | +0.319 pts | **0.799** | **NO** |
| 1999-2024 | 15,017 | 52.647% | [51.85%, 53.45%] | +0.266 pts | 0.652 | NO |
| **2025 alone** | 630 | **53.968%** | [50.08%, 57.86%] | +1.587 pts | 0.797 | **NO** |

Break-even at −110 is 52.381%.

**The edge is not distinguishable from zero in any window.** Every confidence
interval contains break-even; no z-score approaches 1.96. Replayed against 27
seasons of closing lines, the frozen model is **at break-even, not above it**.

The 2025 season alone looks better at 53.97% — and is the single most tempting
number in this document. It should not be quoted on its own. On 630 decisive picks
the interval runs from 50.08% to 57.86%: it is equally consistent with losing money
and with a large edge, and its z-score (0.797) is no better than the full-history
one. One season is not evidence of an edge; it is evidence of a wide interval.

**Note on scope:** the first run of this analysis stopped at 2024 and omitted 2025
entirely — a completed season, and the most recent and relevant one. Adding it moved
the headline from 52.647% to 52.700% and changed no conclusion.

## Read this before quoting the number

Three caveats, all of which cut against over-claiming:

1. **This is the hardest possible benchmark.** Entry line == closing line by
   construction — every pick grades `MATCHED_CLOSE`, because the archive gives one
   closing number per market. So this asks "can the model beat the close?" A live
   operation bets earlier and captures CLV, which this replay structurally cannot
   show. The real edge could be higher. It could also not exist.
2. **There is no holdout split — but the corpus was never fit on.** Worth stating
   precisely, because "no holdout" and "overfit" are not the same claim.
   `constants.ts` describes the scoring weights as heuristic and records
   *"Heuristic confidence / composite weights UNCHANGED"* through the v5.2.x line.
   The one fitted component is the isotonic calibration layer activated in v5.1.0,
   and it was fit on live settled picks (the 2026 samples), not on this nflverse
   corpus. So these 27 seasons are genuinely out-of-sample with respect to any
   fitting that has happened — this is not a train-set score. It is still not a
   *designed* holdout, and a proper walk-forward split remains the honest next
   measurement.
3. **Book depth is synthetic.** One consensus close is replicated across the
   scorer's ideal book count, so dispersion and volatility factors are degenerate
   rather than real. That is documented and deliberate in `buildHistoricalOddsInput`,
   but it means the depth-sensitive parts of the model are untested here.

## Why this run is trustworthy where the last one wasn't

`lookahead errors: 0` over 15,308 picks. The replay splits each row into disjoint
pre-game and settlement halves and `PreGameFeatures` has no score field at all, so
the scorer structurally cannot read a result.

Before the spread-sign fix the same pipeline returned **36.0%** on a 139-pick sample
(50 W / 89 L / **0 P**) because every spread pick was on the wrong team. The zero
pushes were the tell: an inverted line almost never lands exactly on the number.
Post-fix the same sample returns 49.3% with 5 pushes.

## What this obliges us to do

- **The ≥70% target is contradicted by our own model's 27-season replay** — no longer
  merely unsubstantiated. It lives in `docs/path-to-70.md` and is referenced from
  `constants.ts` (*"v5.1.0: isotonic calibration activated (path-to-70.md §7)"*).
  It needs retracting there, and `path-to-70.md` should carry this result.
  **Correction to an earlier reading of mine:** it does *not* appear as a
  performance claim in shipped customer copy. A sweep of `apps/web/app` and
  `apps/web/components` finds "70%" almost entirely in CSS gradients; the one
  substantive hit, `cockpit/calibration/page.tsx:504`, is an operator-facing
  description of a *tier threshold* ("the conviction 70% tier requires a calibrated
  win probability of at least…"), not an assertion that we achieve 70%. The
  `no-unsupported-performance-claims` guardrail also passes. So this is an internal
  goal to retract, not a live customer-facing lie — a materially smaller problem
  than "it must not ship" implied.
- Publishing 52.6% with this CI attached is defensible and on-brand: it is math
  someone can read and check. Publishing it as an edge is not.
- The honest next measurement is CLV against an **opening** line, which requires a
  lines archive carrying both open and close. nflverse gives only the close.

## Rights posture — why this number is ours to publish

Checked against `.claude/rules/scraping.md` before writing anything down, because
this is the point where an internal measurement becomes a public claim.

- **What we took from nflverse are facts** — closing lines, final scores, schedule.
  The rule's "What may be extracted" list is explicit: *facts (scores, standings,
  fixtures), timestamps, metadata, **derived signals we generate**, source
  references.*
- **What we are publishing is a derived signal we generated** — our own frozen
  model's win rate and its confidence interval. It is not nflverse's number, not
  anyone's proprietary prediction, and not a redistribution of their file. The rule's
  "Never extract" list bars article bodies, **proprietary predictions**, graphics and
  site copy; none of that is in play here.
- **Source status:** `nflverse` → `approved_open_license`, CC-BY-4.0
  (`apps/web/lib/scraping/source-rights-registry.ts:111`). Commercial and derivative
  use permitted; attribution required.
- **Attribution propagates**, as the rule's key invariant requires: *Data via
  nflverse (nflverse-data), licensed CC BY 4.0.* That string is emitted by the
  backfill run itself and must appear anywhere this figure does.
- **Share-alike does not apply here.** The SA-class content this platform excludes
  from published derivatives is the third-party charting inside nflverse (FTN via
  nflverse, `pfr-advstats-via-nflverse`). `games.csv` is a core nflverse release
  under plain CC-BY-4.0, and none of those releases were touched.

So: publishing 52.6% with its CI and the attribution line is inside the posture.
Reproducing nflverse's file, or presenting their data as our own, would not be.

## One correction for the source-survey work

A parallel review of candidate corpora recorded *"nflverse-data — closing lines NOT
OBSERVED in the opened parts; primarily play-by-play."* That is wrong, and it matters
because it would push the college-football search toward weaker sources.

Directly disproved by this run: `games.csv` carries `spread_line`, `total_line`,
`home_moneyline` and `away_moneyline` on **7,276 rows** with finals attached, and
every number in this document was computed from them. The reviewer opened a
play-by-play release; the lines live in the `schedules` / `games.csv` release.

The same survey reports that CFBD's terms (effective 2026-08-12) permit commercial
use of API data and derived outputs, forbid resale as a standalone dataset, and that
its `/lines` endpoint does not clearly distinguish opening from closing prices.
That would resolve the registry's `vendor_candidate` blocker if true — but it is
**NOT VERIFIED here**: it comes from a JSON file on the owner's Windows machine that
this container cannot read. It stays unverified until someone opens the terms page
directly. Do not flip the registry entry on the strength of this paragraph.

## Reproducing

Both numbers in the "before" comparison come from the same command on
`--from=2023 --to=2023 --weeks=1-4`, run once with `scripts/backfill/historical-settlement-backfill.ts`
stashed to its pre-fix state and once after. The significance figures come from
the W/L counts of each window under a normal approximation, break-even `110/210`:
`W=8246, L=7401` (1999-2025), `W=7906, L=7111` (1999-2024), `W=340, L=290` (2025).
