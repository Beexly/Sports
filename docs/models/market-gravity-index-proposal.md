# Market Gravity Index — math proposal (pre-build, per tracker)

> Tracker law: "math proposal first." No code ships until this math is
> owner-approved. Everything below derives ONLY from data we already capture
> (multi-book odds snapshots over the capture window, de-vigged via
> `packages/prediction-engine/src/market-read.ts`). No new sources, no
> fabricated inputs.

## What it measures (one sentence)

How strongly the market is pulling individual books toward the consensus
fair price over our capture window — convergence as "gravity."

## The math

For a game market with ≥2 books and ≥2 snapshots per book:

1. De-vig every book's earliest and latest quote in the capture window
   (existing `market-read` machinery — same inputs the drift column uses).
2. Dispersion at each end: `D_early = mean |book_fair_i − consensus_fair|`
   across books at their earliest quotes; `D_late` likewise at latest.
3. **Gravity** `G = 1 − (D_late / D_early)`, clamped to [−1, 1].

Reading: `G → 1` books are collapsing onto consensus (strong gravity);
`G ≈ 0` dispersion unchanged; `G < 0` books are *diverging* — the market is
arguing, which is exactly when disagreement signals matter most.

## Nulls and guards (no fake certainty)

- `< 2 books` or `< 2` distinct snapshot times → **null** (never 0 — absence
  of data is not "no gravity").
- `D_early < 0.25` percentage points → **null**: books already agreed; a
  ratio on near-zero dispersion is noise, not signal.
- Output carries `computed_from` (book count, window start/end) like the
  drift column does.

## Known weaknesses (stated on the surface, per stat commandment)

- **Capture-window bounded** — this is gravity across *our* snapshots, not
  tick-by-tick market microstructure.
- Convergence ≠ correctness: books can converge on a wrong number.
- Book composition changes mid-window bias the dispersion comparison; the
  guard is to compare only books present at both ends.

## Where it surfaces

Market Fair Board (`/observatory`), one column next to Drift: value styled
like existing numerics, magenta when `G < 0` (divergence = the interesting
state), tooltip carrying the weakness line. Engine math lands in
`packages/prediction-engine/src/market-read.ts` with tests pinning: a
converging fixture, a diverging fixture, every null guard.

## Acceptance criteria

- [ ] Owner approves this math (or amends it here, in this file)
- [ ] Pure function + tests in prediction-engine (no I/O in the math)
- [ ] Board column renders null honestly (em-dash, no zero-cosplay)
- [ ] Tracker line moves to DONE in the same commit
