# Family reliability — the measurement layer

**What this measures.** For every (signal family × bet type) cell, how
reliably did the published probability match the settled outcome? Not "does
this family raise win rate" — that is the presence-lift question, already
answered by `family-weight-evidence.ts`. This is the calibration question: when
the book says a pick is 0.67, does it win 0.67 of the time?

Both are needed. A family can raise win rate while making probabilities
*worse*, and that is the failure the program is about.

**Source of truth for the data.** `scripts/ops/sql/family-reliability-extract.sql`,
read-only against Neon project `summer-brook-99380762` (the `sports-db`
project's `main` branch is empty — 0 tables). The population is **3,499 settled
non-bootstrap picks** (1,229 MONEYLINE, 1,161 SPREAD, 1,109 TOTAL; VOID/PUSH
excluded). Probability is `picks.factorBreakdown->independentEdge->trueProb` —
the causally-safe retrospective blend, not `confidence` (V3-356: 0.52 of
moneyline picks win; 0.83 of those had confidence ≥ 80).

**Harness.** `packages/prediction-engine/src/calibration/family-reliability.ts`.
Pure, deterministic, no I/O. Fixture-clustered bootstrap; pick types are never
pooled.

---

## What the first real run found

### 1. Three of seven families cannot be measured at all

| verdict | cells | why |
|---|---|---|
| `no-contrast` | 7 | flag is true on **every** settled pick in that type |
| `no-probability` | 4 | **0 of 1,109** TOTAL picks carry any `trueProb` |
| `insufficient-evidence` | 5 | below 200 rows / 60 fixtures |

`hadOddsSignal` is true on 4,142 of 4,142 snapshots. `hadScheduleSignal` and
`hadLineMovementSignal` are true on 2,565 each and are **the same 2,565 rows** —
they are one flag under two names, and `line_movement/MONEYLINE` and
`schedule/MONEYLINE` produce byte-identical cells (level −0.186, slope 0.255)
in the report above. That is not two independent findings.

`h2h` is true on **11 of 4,142** snapshots. It is a schema promise, not an
instrument.

### 2. The probability is not calibrated anywhere it can be measured

Five cells clear the sample floor. All five are badly miscalibrated, and all
five have reliability curves that are **non-monotonic** — 3 to 5 rank
inversions each.

`ats_form/SPREAD` (444 scored rows, ECE **0.149**, worst bucket gap **0.397**):

| published | observed | gap |
|---|---|---|
| 0.159 | 0.432 | **+0.272** |
| 0.303 | 0.409 | +0.106 |
| 0.424 | 0.341 | −0.083 |
| 0.522 | 0.318 | **−0.204** |
| 0.578 | 0.364 | −0.214 |
| 0.669 | 0.591 | −0.079 |
| 0.775 | 0.378 | **−0.397** |

The published probability does not order outcomes. The top bucket is the
**worst** big bucket in the cell. A monotone-but-miscalibrated forecaster is
fixable with a reliability map; a curve that folds back on itself is not, and
no temperature or isotonic transform can repair it.

### 3. The two calibration instruments disagree, and that is the finding

`line_movement/MONEYLINE`: slope 0.255 (leans too hard) against level **−0.186**
(CI [−0.238, −0.134]) — published 18.6 points **too pessimistic**. A reader
shown only "overconfident" would sharpen a map that is already too low. The
harness reports `levelDirection` and states the contradiction in `reason`
rather than letting the shape label win.

### 4. `trueProb` on a SPREAD row is a team-win probability, not a cover probability

The writer's own rationale on the spread rows says so: *"team-win trueProb
(not ATS cover p — ranking/discrimination feature only)."* Scoring it against
a cover settlement is comparing two different questions. The harness refuses
this rather than quietly reporting a number: declare a `probabilityEvent` that
matches the `pickType` and the cell reports `semantics-mismatch` with the reason.
**The five measured cells above are SPREAD/MONEYLINE measurements and carry
this caveat.**

---

## A bug this harness caught in itself

The first version called **four cells `overconfident` on slope point estimates
of 0.013–0.255** whose 95% intervals were [−0.202, 0.278], [−0.243, 0.806],
[−0.190, 0.275] and [−0.145, 0.320]. Every one of those intervals contains 1.0,
the perfectly-calibrated slope. A shape verdict now requires the **interval** to
exclude 1.0, not just the point estimate to sit outside a band. Four false
calibration defects, on the exact families the program was about to act on.

The tolerance is applied once, not twice: `offSlope` asks where the point
estimate sits, `slopeExcludesOne` asks whether the data can distinguish the cell
from a calibrated one. Requiring the interval to clear the whole band
`[1−t, 1+t]` instead of just 1.0 silently filed real findings as
"insufficient-evidence".

## Reproduce

```bash
# read-only extract (single line — the embedded psql fails on embedded newlines)
neonctl psql main --project-id summer-brook-99380762 --role-name neondb_owner \
  --database-name neondb --output json -- -c "$(tr -d '\n' < scripts/ops/sql/family-reliability-extract.sql | sed 's/--[^"]*//g')"

node node_modules/tsx/dist/cli.mjs scripts/ops/family-reliability-harness.ts obs.json report.json
node node_modules/tsx/dist/cli.mjs packages/prediction-engine/src/calibration/family-reliability.run.ts
```

20 honesty tests pass. `vitest` cannot run in this environment —
`node_modules/@vitest/utils` is an empty directory in the main checkout, which
fails the untouched baseline test identically, so the suite is a standalone
runner with the same assertions.

## What this harness will not do

- Pool bet types. A MONEYLINE 0.67 and a SPREAD 0.47 are not the same claim.
- Report a verdict below 200 rows or 60 fixtures; it says "we do not know."
- Score a probability whose meaning was not declared against the `pickType`.
- Report skill as more than an **upper bound**: the climatology reference is
  fitted on the outcomes being scored (the Murphy in-sample term).
- Call a constant flag a well-calibrated family.
