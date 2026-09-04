# NFL replay — the first honest number about the model

Run 2026-09-04, after the nflverse spread-sign fix (`0d2116cbb`). Every figure here
is output I saw from a command in this document; nothing is estimated.

## Command

```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backfill/historical-settlement-backfill.ts \
  --from=1999 --to=2024 --type=REG
```

Dry-run (the default): zero DB writes. Data is nflverse `games.csv` —
`approved_open_license`, CC-BY-4.0. *Data via nflverse (nflverse-data), licensed CC BY 4.0.*

## Result

```
in-range games: 6695
settled picks: 15308  (SPREAD 6695, TOTAL 6695, MONEYLINE 1918)
results: 7906 W / 7111 L / 291 P
win rate (excl. pushes): 52.6%
lookahead errors: 0
proof receipts minted: 15308 (skipped 0)
unique idempotency keys: 15308 / 15308
CLV: 15308 MATCHED_CLOSE
```

## What that number means

| | |
|---|---|
| Decisive picks (W+L) | 15,017 |
| Win rate | **52.647%** |
| 95% CI | **[51.85%, 53.45%]** |
| Break-even at −110 | 52.381% |
| Edge over break-even | **+0.266 pts** |
| z vs break-even | **0.652** |
| ROI per unit at −110 | +0.51% |

**The edge is not distinguishable from zero.** z = 0.65 (95% needs 1.96), and the
confidence interval contains break-even. Replayed against 26 seasons of closing
lines, the frozen model is **at break-even, not above it**.

## Read this before quoting the number

Three caveats, all of which cut against over-claiming:

1. **This is the hardest possible benchmark.** Entry line == closing line by
   construction — every pick grades `MATCHED_CLOSE`, because the archive gives one
   closing number per market. So this asks "can the model beat the close?" A live
   operation bets earlier and captures CLV, which this replay structurally cannot
   show. The real edge could be higher. It could also not exist.
2. **There is no holdout.** All 26 seasons are in-sample. A held-out split can only
   move this number down, not up.
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

- **The ≥70% north-star claim is contradicted by our own model's 26-season replay.**
  It was already a regulatory exposure (state AGs have required disclosure of real
  user success rates). It is now also falsified in-house. It must not ship.
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

## Reproducing

Both numbers in the "before" comparison come from the same command on
`--from=2023 --to=2023 --weeks=1-4`, run once with `scripts/backfill/historical-settlement-backfill.ts`
stashed to its pre-fix state and once after. The significance figures come from
`W=7906, L=7111` under a normal approximation, break-even `110/210`.
