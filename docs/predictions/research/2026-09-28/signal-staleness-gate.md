# Signal staleness gate: the Bears pick could not have shipped after this (2026-09-28)

**Bucket: predictions.** This is a defect found in production during a live
game, built, wired into the write path, and verified against real production
rows. It is the direct consequence of a finding recorded in AGENTS.md on
2026-09-13 that nobody had turned into code.

## What happened

Live check, 2026-09-28 ~19:00 UTC, roughly 15 minutes before an NFL kickoff. The
founder asked whether a quarterback change had been in the engine's reasoning.
The published pick for that game was:

| Field | Value |
|---|---|
| Selection | `Chicago Bears ML (model signal)` |
| Generated | 2026-09-28 16:07:11.662Z |
| Kickoff | 2026-09-29 00:15:00Z |
| **Age at kickoff** | **8h 07m 48.338s** |
| confidence | 60 |
| `rankingP` | 0.6036 |
| `agreement` | `SOLO` |
| `sources` | `["elo"]` |
| `marketFairProb` | `null` (never saw the market) |
| `expectedClv` | 0 |
| `independentEdge.decision` | `LEAN` |
| shrunkEdge | 0.0725 (from rawEdge 0.1036, a 30% solo-source haircut) |
| Published | **true** |

The complete factor list was: elo fair value (weight 60), prereg leakage gate
(3 probes clean), Kelly log-growth (weight 9), cover probability (weight 4,
negative), and a leakage gate that **did not run** ("fixtures unavailable. Not a
clean bill").

So: no quarterback signal, no injury flag, no weather, no scheme, no pace of
play. The opinion was formed 8 hours before kickoff on a single model and
published as if it were current.

## Why it was allowed

`generate-signal-slate.ts` on CREATE wrote:

```ts
isPublished: gates.canExposePublicPicks,
```

One global gate, no per-pick judgement at all. The gate answers "may the
platform publish signal picks"; it does not answer "should THIS pick publish".
The file's own comments argue carefully about gate-closed and gate-open
asymmetry and about preserving operator judgement, and in doing so assume the
only thing standing between a pick and the public is the global switch. It is not.

## What AGENTS.md already knew

From the 2026-09-13 entry, filed 15 days earlier:

> All 5 signal picks are SINGLE-source Elo (`sources:["elo"]`,
> `agreement:"SOLO"`)... The gate should require agreement>=2 or shrink
> solo-source edges harder.

The diagnosis was correct and complete. It was never implemented. That is the
actual root cause, and it is the one to be angry about: a finding that lives in
a markdown file changes nothing.

## What was built

`packages/ingestion-pipeline/src/signal-staleness.ts`, wired into the CREATE
path of the signal slate generator.

- Solo-source-elo reads are judged for AGE only, and only inside a
  **pre-kickoff window** (12h). Outside that window age is not evidence of
  anything, because a future board is legitimately built days ahead.
- Bound: 90 minutes. A solo-source read older than that, for a fixture inside
  12 hours, does not publish.
- Corroboration is reported, not blocking. Every signal pick today is solo-elo;
  a gate that refused all of them would publish an empty board, which is worse
  than the failure it prevents.
- `PASS` is not blocked here. "Never publish on PASS" is a separate v5.3.0 rule
  and belongs in the caller; merging them would let one edit satisfy one by
  breaking the other.

## Verified against production, not just unit tests

Simulated over all **158** real pending production signal picks:

```
rows: 158
VETOED: 1  (0.6%)
ALLOWED: 157
  Chicago Bears ML (model signal) | 8.13h before | solo_source_stale | published=true
```

Exactly the specimen, and nothing else.

## The bug I shipped first, and caught by measuring

My first cut applied an unconditional age bound. Simulated against the same
158 rows it would have vetoed **all 158**, because pending picks average
1,695 hours before their fixture (a September board includes December and
January games). A gate that is green in unit tests and blackouts production is
worse than no gate. The pre-kickoff window is what makes it a gate.

Second bug: the boundary treated age exactly 0 as stale, vetoing a read
stamped at kickoff. Caught by an existing test that was right and I was wrong.

## What this does NOT do

It does not add a quarterback or injury signal. The gate does not make the
engine smarter; it makes a known weakness visible before publication instead of
after. The real fix is a personnel/news source feeding the independent blend,
and that is queued, not done.

It also does not unpublish the Bears row. It is already live and already
settling-or-settled; `isPublished` is a bare Boolean with no provenance column
(the C-158 gap this same file documents), so a retroactive correction is a
founder call, not a code change.
