# Consensus & Accuracy Engine

*New, separate from the DFS optimizer work (`claude/dfs-optimizer-edge`). This
branch implements a real gap identified in the FantasyPros NFL teardown
([.firecrawl research](../.firecrawl), summarized below) directly into GSE's
own fantasy engines, on top of GSE's existing player model
(`apps/web/lib/fantasy/players.ts`).*

## The gap this closes

FantasyPros runs a genuinely well-designed, fully-published **Expert Accuracy**
grading system — but their default **Expert Consensus Rankings (ECR)** don't
use it. ECR sums "Rank Points" across every tracked expert **equally**; the
accuracy grades are a separate public report, not a weighting input. Their own
FAQ: *"We add these Rank Points up for each player across all experts."*

Their accuracy methodology also has a **documented, gameable soft spot**: a
source that fails to rank a player is charged an implied rank of *"the last
player the expert ranked + 1"* — meaning the penalty ceiling for any omission
is tied to **the omitting source's own list length**, not the true pool.
Ranking fewer players caps your downside exposure to deep busts.

## What GSE builds instead

Two files, `apps/web/lib/fantasy/`:

| File | What it does |
|---|---|
| `expert-accuracy.ts` | The Accuracy Gap methodology — rank → curve-implied point value → `\|implied − actual\|` → position-relevance weighting (reused: FantasyPros' own multiplier-taper design is genuinely sound). **Fix 1:** an omitted player is always charged the pool's worst implied value, full stop — proven independent of the omitting source's own list length (see test below). |
| `consensus-rankings.ts` | Borda-style Rank-Points consensus. **Fix 2:** accuracy-weighted is the *default* the moment grading history exists (`consensusRank(pos, sources, { grades })`); equal-weight is an explicit, flagged fallback (`mode: 'equal'`) — never a silent default. |

Both are pure, position-generic (`QB`/`RB`/`WR`/`TE`, matching GSE's existing
`Pos` type), and interoperate directly with the real illustrative player pool
(`consensus-integration.test.ts` runs the engine on the actual WR pool from
`players.ts`, not just synthetic fixtures).

## Proof, not assertion — hand-verified, all 14 tests pass on first run

**The core benchmark** (`consensus-rankings.test.ts`): a 6-player panel with a
perfect, a mediocre, and a deliberately bad source. Every number below was
hand-computed before the test ran, then confirmed exactly by `vitest`:

```
Grades (Accuracy Gap, lower = better):
  perfect  = 0
  mediocre = 100
  bad      = 260

Board vs TRUE order (rank-distance error = Σ|consensus rank − true rank|):
  equal-weight consensus    → p1,p2,p4,p6,p3,p5   error = 6
  accuracy-weighted consensus → p1,p2,p3,p4,p5,p6  error = 0  (EXACT recovery)
```

Letting the bad source's scrambled opinions count equally distorts four of six
player positions. Weighting by measured accuracy (near-zero weight on the bad
source) recovers the true order exactly.

**The loophole fix** (`expert-accuracy.test.ts`): two sources omit the same
player (actual points 40, not the pool's true worst). One source has a
1-player list, the other a 3-player list. Under GSE's fixed worst-in-pool rule,
the marginal cost of that omission is **exactly 20 points for both** —
independent of list length. Under FantasyPros' documented last-rank+1 rule,
the short list would have implied a far more forgiving value (curve slot 2 vs
slot 4) — precisely the lever GSE's engine removes.

## Honest limits

- The benchmark is a small, hand-constructed synthetic panel — it proves the
  *mechanism* (accuracy-weighting can recover truth that equal-weighting
  loses when skill varies), not a claim about real-world expert panels, which
  are noisier and less cleanly separable. Calibrate against real historical
  rankings before any live accuracy claim (GSE's standing proof-of-accuracy
  discipline).
- The position-relevance multiplier bands (`RELEVANCE_BAND` in
  `expert-accuracy.ts`) are GSE's own reconstruction of the *shape* FantasyPros
  describes (linear taper from 1.0 to 0.5 between named rank thresholds) — not
  a claim to replicate their undisclosed exact formula image.
- The Rank-Points scale (`pointsForRank` in `consensus-rankings.ts`) is a
  standard, self-consistent Borda scheme (own-list-length − rank + 1) — again
  not a claim to their proprietary exact point values, which were never
  disclosed.
- No live multi-source data feed exists yet. This is the pure engine +
  illustrative-pool integration; wiring a real panel of ranking sources is a
  founder-gated follow-up, same pattern as every other GSE data seam
  (`ProjectionsProvider`, `DfsSlateProvider`).

## Where it fits

`docs/fantasy-os-vision.md` already frames GSE Fantasy's differentiation as
process transparency over black-box authority. This engine is a concrete
instance: it makes the "why" of a ranking *inspectable* — glass-box linear
weights, not a softmax black box — and it makes accuracy-proof the default
behavior rather than a report nobody reads.
