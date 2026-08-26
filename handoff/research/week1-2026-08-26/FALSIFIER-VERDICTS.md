# Falsifier verdict log — session `claude/gse-week1-launch-bh0nqo`, 2026-08-26

Evidence SHA: `932fa2bd7` (verified with `git rev-parse --verify`).

## GATE FIRST — instrument acceptance

An instrument's verdict does not count until it passes known-bad and
known-planted-good. `MISSING: a pre-existing C-76 9/9 acceptance harness` — no
harness matching "planted / pure-noise / inverted at n = 100 / 1k / 5k" exists
in the repo. `falsify.test.ts` (21 tests) covers the same properties but not as
that grid; `research/null-acceptance.test.ts` is the R-9 capital engine, not the
falsifier. So the grid was BUILT this session:
`packages/prediction-engine/src/edge-lab/__tests__/falsify-acceptance-grid.test.ts`.

### The 9 cells, as measured

| fixture | n=100 | n=1,000 | n=5,000 |
|---|---|---|---|
| planted edge (p=0.68 vs 0.50) | KILLED | KILLED | **SURVIVOR** |
| pure noise | KILLED | KILLED | KILLED |
| inverted signal | KILLED | KILLED | KILLED |

**7 of 9 cells matched the naive expectation; 2 did not, and the instrument was
right both times.** The planted edge is KILLED at n=100 and n=1,000. The binding
gate is SHUFFLE, a permutation test:

| n | shuffle result |
|---|---|
| 100 | model LLR 0.0663/row beats 144/200 permutations |
| 1,000 | 0.0678/row beats 147/200 |
| 5,000 | 0.0654/row beats **197/200** (>= p95) |

At n=100 the permutation distribution is genuinely too wide to separate a
0.066 LLR/row effect from relabelling. Refusing there is correct conservatism,
not a false negative — asserting SURVIVOR would demand the instrument overfit
small samples. The harness now asserts the property that actually matters:
**discrimination** — at n=5,000 planted SURVIVES while noise and inverted do
NOT. An instrument that KILLED everything would pass both refusal checks
trivially while being useless.

**Load-bearing detail: the e-process is NOT the binding constraint.** At n=100
the planted edge already shows logM = 6.628, well past log(1/alpha) = 2.996.
Evidence accumulates fast; permutation POWER is what lags. The grid asserts this
explicitly, so a future change that makes the e-process the blocker fails the test.

Acceptance grid: **13/13 green.** Verdicts below therefore count.

## VERDICTS — CORRECTED AFTER ADVERSARIAL REVIEW

Vocabulary is fixed: SURVIVOR / KILLED / STARVED / PARKED.

**The first pass of this file reported two clean SURVIVORs. That was wrong, and
the correction is below.** An adversarial red team (a cold Claude subagent with
no memory of the build, default verdict REFUTED — DeepSeek was NOT reachable
from this container, so per the fallback a Claude red team was used and is named
here) refuted three of five claims. Every refutation was then re-verified
independently by me from the raw data before being accepted.

```
avgSeparation | SURVIVOR | logM=73.52 vs true base rate | n=997 | UNPRICED; 4.9% base-rate artifact; ~2% content beyond persistence | sha 932fa2bd7
targets       | KILLED   | logM= 2.91 vs true base rate | n=997 | FAILS the 1/alpha bar (2.91 < 2.996) once base rate is corrected | sha 932fa2bd7
props-hb-int  | NOT RUN  | e=n/a | n=0 | MISSING: historical player-prop lines and prop outcomes | sha 932fa2bd7
props-hb-pd   | NOT RUN  | e=n/a | n=0 | MISSING: historical player-prop lines and prop outcomes | sha 932fa2bd7
kickoff-return-yards | NOT RUN | e=n/a | n=0 | MISSING: historical player-prop lines and prop outcomes | sha 932fa2bd7
```

### Why `targets` flipped SURVIVOR -> KILLED

`falsifyBind` scores the model against a **hard-coded market proxy of q = 0.5**
when no real `marketProb` is supplied. The `targets` outcome has a base rate of
**0.7071**, not 0.5. So a model with literally zero signal — a constant
`p = baseRate` — already scores `logM = 88.17` against `q = 0.5`.

| signal | n | base rate | logM vs q=0.5 | logM vs q=base rate | base-rate artifact |
|---|---|---|---|---|---|
| avgSeparation | 997 | 0.4564 | 77.32 | **73.52** | **4.9%** |
| targets | 997 | 0.7071 | 91.08 | **2.91** | **96.8%** |

Corrected for its own base rate, `targets` scores **2.91, below the
log(1/alpha) = 2.996 bar**. It does not clear the threshold at all. The
reported SURVIVOR was 96.8% arithmetic artifact. Recorded as **KILLED**, not
softened, not re-run with different parameters.

`avgSeparation` survives this correction (4.9% artifact, logM 73.52 >> 2.996).

### The selection-on-outcome leak, and why the falsifier could not see it

The first run required **next-season targets >= 20** for a row to be included.
That is a look-ahead: unknowable at prediction time, and for `targets` it is a
monotone function of the outcome itself. Verified independently:

| | n | outcome rate |
|---|---|---|
| season-*t* qualifiers with any *t+1* data | 997 | — |
| INCLUDED (t+1 targets >= 20) | 821 | 0.8587 |
| **EXCLUDED by the filter** | **176** | **0.0000** |

**Every one of the 176 deleted rows had outcome = 0.** The sample was built by
removing guaranteed negatives.

`falsifyBind` nonetheless reported **`leakage: PASS`**, because its leakage gate
is `rows.find(r => r.knownAtWeek >= r.outcomeWeek)` — a comparison of two integer
week indices. It detects temporal lookahead in labels and is **structurally
blind to selection leakage in sample construction**. That is a real gap in the
instrument, not a misuse of it, and it is the most dangerous finding here: a
four-gate funnel returning PASS on a sample selected by its own outcome variable
gives false assurance exactly where assurance is being bought.

Re-running WITHOUT the filter (n=997) did not flip the verdict on its own —
logM rose, 69.600 -> 77.321 for avgSeparation. The leak was not what
manufactured the result. It is corrected anyway because the sample was invalid.

### The deeper objection: there is almost no independent content

Somers' D (2·AUC−1) of prior-season percentile against the binarized outcome,
versus the plain Spearman on the same pairs:

| signal | Spearman(prior, next) | 2·AUC − 1 | independent content |
|---|---|---|---|
| avgSeparation | +0.5560 | +0.5431 | **~2%** |
| targets | +0.5204 | +0.4595 | ~12% |

`modelProb` is a monotone transform of prior rank; the outcome is a binarization
of next rank. So this falsifier run is the persistence measurement **re-expressed
and then binarized**, discarding information, scored against an arbitrary
constant. The first draft called this "largely re-measures persistence"; the
accurate statement is that it re-measures it **almost entirely**, and the
surviving verdict should not be read as a second, independent confirmation.

### Read the UNPRICED tag before reading anything else

The falsifier flags its own limitation, verbatim:

> "0/997 rows carried real marketProb — every market-relative statistic in this
> run (leakage excepted) was computed against a uniform 0.5 baseline, not real
> market prices. **A SURVIVOR here means 'beat a coin flip', not 'beat the
> market'.**"

There are no historical player-prop lines anywhere in the repo
(`games_harness_rows.jsonl` is game-level: spread, total, moneyline), so the
three built prop binds could not be fired on real rows at all. **No priced test
was run.** Door B is neither opened nor closed by this session.

## N_eff — THE EARLIER ARITHMETIC IS RETRACTED

The first pass of this file concluded "E > 20 in under one week". **That is
withdrawn.** Three independent defects, all verified:

**(a) The qualifying filter was inert.** `targets >= 3` selects 12,853 of 12,853
NGS weekly rows — 100%. The minimum weekly target count in the file is 5, so
nothing was ever filtered. "73.4 measured qualifying observations per week" is
just every NGS weekly row divided by 175 season-weeks.

**(b) Unit mismatch — fatal, and the reason the conclusion was wrong by ~2
orders of magnitude.** The 997 falsifier rows are **player-SEASON pairs**. The
73.4 figure is **player-WEEKS per season-week**. Dividing one by the other is a
category error. The 997 rows span 9 season transitions ~ 111 rows per season,
and because every outcome is defined as "above *next-season* league median",
**no row resolves until a full season completes**. Real latency is >= 1 season,
not 0.48 weeks.

**(c) threshold / drift is a first-passage misuse.** `logM` is a sum, so
`logM/n` is a legitimate sample mean — the division is not the error.
Extrapolating it to "rows needed" is. With per-row drift 0.105 and SD 0.616,
at n = 29 the crossing probability is ~50%, not ~100%. Bootstrapped first
crossing: median row 20, p75 36, **p95 = 94**, max 389. A single number hid a
right-skewed distribution spanning an order of magnitude — and the drift was
estimated on the very rows that produced the verdict, so it carries winner's
curse.

### What can honestly be said about N_eff

Not "certification is reachable in half a week". The defensible statements:

1. **Observation volume is genuinely large.** 12,853 NGS player-week rows over
   10 seasons, ~73 per in-season week. C-33's 2027 date rests on ~2-4 qualifying
   bets per week; a player-prop track operates 20-35x above that. **Volume is
   not the binding constraint.**
2. **Latency is bounded below by the resolution horizon, not by row count.** A
   season-over-season outcome cannot resolve faster than a season. A *weekly*
   prop outcome would resolve weekly — but that experiment has not been built,
   because there are no prop lines.
3. **The market-relative effect size is UNMEASURED**, and it is the only input
   that matters. Every logM above is against a coin flip. If the market-relative
   effect is ~0 — what C-75 measured at game level — N_eff is unbounded and no
   volume certifies anything.

**The actionable conclusion is unchanged and is now the only one supported:
acquire historical player-prop lines.** Until that lands, no certification
timeline of any kind is supportable, and none is asserted here.

## Honest status

- No SHIP claim. Honesty law 5 requires a falsify SURVIVOR on real rows *priced*;
  these are unpriced.
- No published number. Nothing here goes on a public surface.
- Nothing softened. `targets` is recorded KILLED and stays KILLED; it was not
  re-run with different parameters hoping for a different answer.
- The earlier SURVIVOR verdicts and the earlier N_eff conclusion are RETRACTED
  in place above rather than quietly edited away, so the error is auditable.
- Three of five session claims were refuted by adversarial review and every
  refutation was independently re-verified before acceptance. The red team was a
  cold Claude subagent; `MISSING: DeepSeek statistical red team` — not reachable
  from this container.
