# Placeability and performance — what C-119 turned into

2026-09-07, 23:1x UTC. Read-only SELECT via the Neon MCP; no writes. Every figure below is
**MEASURED** unless marked otherwise.

I opened C-119 to add a step guard for MLB totals, the way `isPublishableSpreadLine`
(`packages/prediction-engine/src/scoring.ts:930`) already guards spreads. I did not implement it,
for a reason given in section 1, and the measurement I ran instead found something more important
than the guard.

## 1. Why C-119 was NOT implemented tonight

`line: avgTotal` (`scoring.ts:856`) is an average across books, so it lands off any real ladder
whenever books disagree. Two fixes are available and they are **not** equivalent:

- **Refuse to publish** an off-ladder line, mirroring the spread guard. Measured cost: this
  suppresses **56.4% of published MLB totals** and 47.6% of MLB spreads.
- **Snap to the nearest real step.** This changes the line a pick is graded on, which changes
  edge, confidence and CLV. That is engine behaviour under a frozen `MODEL_VERSION`.

Both are founder decisions, and both prejudge **C-143**, which asks which line is canonical in the
first place. Implementing either tonight would answer C-143 by accident. So C-119 stays open and
this brief exists to make the decision fast rather than to make it for you.

## 2. Placeability, measured

A line is "placeable" if a book actually quotes it: the 1.5/2.5/3.5 ladder for MLB run lines, and
half-point steps elsewhere.

| market | published | off-ladder | share |
|---|---|---|---|
| MLB total | 677 | 382 | **56.4%** |
| MLB spread | 739 | 352 | 47.6% |
| NCAAF total | 108 | 79 | 73.1% |
| NCAAF spread | 172 | 118 | 68.6% |
| MLS total | 75 | 53 | 70.7% |
| NFL spread | 117 | 72 | 61.5% |

Worst distance from a real line: **0.25**. So these are not rounding artifacts, they are averages
sitting squarely between two quotable numbers.

## 3. The finding that matters more than the guard

Settled, published, **non-bootstrap** picks with a decided result (WIN or LOSS; pushes and voids
excluded):

| MLB market | cohort | decided | wins | win rate |
|---|---|---|---|---|
| TOTAL | on-ladder | 193 | 70 | **36.3%** |
| TOTAL | off-ladder | 275 | 136 | 49.5% |
| SPREAD | on-ladder | 294 | 127 | **43.2%** |
| SPREAD | off-ladder | 232 | 116 | 50.0% |

**The picks you could actually place are the ones performing worst.** Spreads and totals are
near-even-money markets, so break-even is about 52.4% and the win rate is approximately the
profitability metric. On that basis both on-ladder cohorts are losing, and MLB totals at 36.3% over
193 decided picks are roughly 3.8 standard deviations below a coin flip. That is not sampling noise.

Two controls, both run:

- **Bootstrap.** All four cohorts are `isBootstrap = false`. The split is not an artifact of
  pre-canonical rows.
- **Book coverage.** Mean `bookmakerCount` is 8.32 on-ladder against 8.26 off-ladder for totals.
  The cohorts are not separated by how much data we had.

## 4. The confound, named rather than buried

With ~8 books, an average landing exactly on a step means the books **agreed**; an off-ladder
average means they **disagreed**. So this contrast is "market consensus" as much as it is
"placeability", and the two cannot be separated with this query. [INFERRED]

That does not weaken the actionable part, and arguably strengthens it: **the engine does materially
worse on the games where the market is confident**, which is the opposite of where an edge should
live. Whichever label you put on the split, the placeable subset is the honest denominator for any
public performance claim, and on that subset MLB totals read 36.3%.

**Also not established:** these are *stored* results, and `GROUND_TRUTH_AUDIT_2026-09-07.md`
measured 68 of 590 published moneyline results wrong and 187 of 670 game rows carrying another
fixture's final. The corruption is not known to be balanced across these cohorts. Nobody has
re-derived spread and total results against ESPN, because C-143 means "the correct result" is not
yet a well-defined question for those markets.

## 5. A launch warning that follows directly

Win rate by market, non-bootstrap, decided:

| sport / market | decided | win rate |
|---|---|---|
| NCAAF moneyline | 102 | 94.1% |
| MLB moneyline | 608 | 62.8% |
| MLB spread | 526 | 46.2% |
| MLB total | 468 | 44.0% |

**A blended win rate across these markets would be a misleading number**, and it would be
misleading in our favour. Moneyline win rate is not a performance claim without price: the engine
only takes sides at `fairProb >= 0.58` (`scoring.ts`), so a high moneyline win rate is what backing
favourites looks like, not what an edge looks like. NCAAF at 94.1% is early-season mismatches, not
skill. Meanwhile the near-even-money markets, where win rate *is* roughly the profitability metric,
sit below break-even.

`PERFORMANCE_STATS_ENABLED` is currently off. **Before it is flipped, the performance surface must
be checked for exactly this mixing**, and the CLV and calibration framing the positioning doc
already prefers should carry the claim instead of win rate. This is a gate, so an agent does not
touch it; this brief is the evidence for the person who does.

## 6. What is being asked of the founder

1. **C-143 first**: which line is canonical, displayed or graded. C-119 cannot be answered before it.
2. **Then C-119**: refuse off-ladder lines, or snap them. Section 2 has the cost of each.
3. **Before any performance publication**: decide that no blended win rate is shown, or show why
   one would be honest.
