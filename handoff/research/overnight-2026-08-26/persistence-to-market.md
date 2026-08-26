# Persistence→Market Test — do falsifier SURVIVOR signals predict COVER rates?

Written 2026-08-26, round 2. This is the missing link from the earlier sweep:
avgSeparation and targets-volume passed all four falsifier gates on raw
outcome persistence (logM 44.3 / 33.1), but persistence ≠ edge. An edge
requires beating the closing line after vig (breakeven cover ≈ 0.5238 at
-110; here we use simple >0.5 vs the consensus close as a first-pass filter).

Design: team-level aggregation of PFR advanced stats (weighted by targets /
max-attempts QB row), signal in season t → next-season (t+1) team cover rate
vs spreadLineHome (sign convention verified: positive = home favored).
Median split, min 14 games next season. Seasons 2018–2024 pairs.

## Exact results

| Signal | n pairs | Spearman(signal → next cover rate) | High-half next cover | Low-half next cover |
|---|---|---|---|---|
| REC ybc_r (targets-weighted) | 223 | **−0.1279** | 0.4704 (n=112) | 0.5069 (n=111) |
| REC adot (targets-weighted) | 223 | −0.1189 | 0.4801 (n=112) | 0.4971 (n=111) |
| Team pass attempts/game | 213 | +0.0416 | 0.4950 (n=107) | 0.4792 (n=106) |

## Honest reading

1. ybc_r: negative rank correlation (−0.13) means HIGH yards-before-catch
   teams covered slightly LESS the following season. Both halves sit below
   the −110 breakeven of 52.4%, and the spread between halves (~3.6pp) is
   within noise for n≈110 per side (SE ≈ 4.7pp). No bettable gap.
2. adot: same shape, weaker. Nothing.
3. Pass volume (the targets-SURVIVOR analog at team level): r≈+0.04,
   halves differ by 1.6pp. Dead.

## Verdict

**KILLED as market edges (first pass).** The player-level persistence
signals that survived the falsifier do NOT translate into next-season cover
rate differences at team level with these aggregations. The persistence is
real but the market already prices it — consistent with the efficiency
finding in market-atlas.md.

Caveats: median-split halves are a coarse first pass (no e-process yet);
team aggregation may wash out player-level separation signal; only three
of many possible mappings tested (documented BEFORE computing, in order:
ybc_r, adot, volume). A definitive kill requires falsifyBind over
game-level rows with modelProb vs devigged marketProb — flagged as the
next-cycle design if any half-split had cleared breakeven by >2 SE. None did.
