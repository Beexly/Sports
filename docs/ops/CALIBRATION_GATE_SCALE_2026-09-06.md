# Only one of the four calibration floors binds

**Measured 2026-09-06, production. Docs only. No floor, threshold, exclusion or
engine change is proposed here or made anywhere in this commit.**

## Why this exists

The 2026-09-06 16:40 UTC note in `AGENTS.md` says that on the eligibility read
"three of the four floors pass comfortably ... ECE is the only failure and it is
narrow." Both halves are literally true and together they read as three
independent pieces of corroborating evidence against one narrow objection.

That reading is wrong, and this file corrects it. Two of the three passing floors
would also pass for a model with no skill at all, or for one whose per-bin
calibration gaps average four times the size ECE is rejecting. They are not
corroboration. **ECE is the only floor that constrains calibration quality at the
sample sizes and base rate this product actually has.**

## The measurement

Source: `/api/ops/public-surface-truth` `calibrationEligibility`, `generatedAt`
2026-09-06T17:09:56.032Z, read from the surface itself.

```
n          458    floor 100     PASS
Brier      0.1926 floor 0.22    PASS
MurphyRel  0.0053 floor 0.05    PASS
ECE        0.0524 floor 0.05    FAIL
baseRate   0.6900   (hitRate on the pooled MONEYLINE sample)
uncertainty 0.2139  (reported by the surface)
```

### 1. The Brier floor is passed by a forecast with zero skill

Murphy's decomposition, as implemented in
`packages/prediction-engine/src/probability-calibration.ts`, is
`Brier = REL - RES + UNC`, with `UNC = baseRate * (1 - baseRate)`.

At this sample's base rate of 0.6900, `UNC = 0.2139`. A constant forecast that
always says "0.6900" has `REL = 0` (perfectly calibrated) and `RES = 0` (no
discrimination at all), so it scores `Brier = 0.2139` and clears the 0.22 floor
with 0.0061 to spare.

The floor therefore certifies that the model is not materially worse than naming
the base rate. It does not certify skill, and it cannot fail on miscalibration
alone unless the miscalibration is severe enough to overwhelm the resolution term.

### 2. The Murphy reliability floor is 4.47x looser than the ECE floor

The two statistics measure the same thing, the per-bin gap between mean forecast
and observed rate, on different scales:

| Statistic | What it averages | Floor 0.05 means a per-bin gap of |
|---|---|---|
| ECE (`apps/web/lib/calibration/ece.ts`) | count-weighted **absolute** gap | 5.0 points |
| Murphy REL (`probability-calibration.ts:355`, `nk * (fk - ok) ** 2`) | count-weighted **squared** gap | sqrt(0.05) = 22.4 points RMS |

Both are compared against the literal number 0.05. In gap units that is a 4.47x
difference in strictness. A pass on one and a fail on the other is not two
estimators disagreeing; it is one quantity read against two floors that are not
on the same scale.

The strata make it concrete. Every model version passes the Murphy floor, and the
implied RMS gap for the worst of them is 20.8 points:

| Version | n | REL | implied RMS gap | ECE | REL floor headroom |
|---|---|---|---|---|---|
| v5.2.7 (deployed) | 245 | 0.0184 | 0.1356 | 0.1089 | 0.0316 |
| v5.2.6 | 110 | 0.0213 | 0.1459 | 0.0587 | 0.0287 |
| v5.1.0 | 74 | 0.0071 | 0.0843 | 0.0729 | 0.0429 |
| v5.0.0 | 29 | 0.0432 | 0.2078 | 0.1531 | 0.0068 |

Consistency check on the pooled sample: REL 0.0053 implies an RMS gap of 0.0728,
against an ECE (mean absolute gap) of 0.0524. RMS is at or above the mean
absolute value for any set of gaps, so the two readings are arithmetically
consistent. Nothing here suggests either statistic is computed wrongly.

### 3. The n floor is a sample-size floor

`n >= 100` says the sample is large enough to measure. It says nothing about what
the measurement found.

## What this changes and what it does not

It does not change the verdict. Eligibility is RED, ECE 0.0524 exceeds its floor,
and the deployed v5.2.7 measures 0.1089 on its own 245 rows. Nothing may be
published on that basis, and this file argues in the same direction: there is
**less** corroborating evidence than the four-line summary suggests, not more.

It does change how the passing lines should be quoted. "Three of four floors pass"
should be read as "the sample is large enough, the model is not worse than naming
the base rate, and the squared-gap floor is set loosely enough that a 20-point RMS
gap clears it." Only the ECE line carries information about calibration quality.

## Not done here, and why

No floor is changed. Tightening the Brier or Murphy floor so that they bind is a
gate change, and gates are the honesty boundary: an agent does not move one in
either direction (`AGENTS.md` law 3, law 9). The observation is recorded for the
founder; whether the gate should be re-scoped is theirs to decide, and doing
nothing is a defensible answer, because the binding floor is already the strict one.

No engine or threshold change. `MODEL_VERSION` is frozen and the levers on the
underlying number remain what they were: more settled rows, and a real calibration
pass.

## Reproducing this

```bash
curl -s https://www.galaxysportsedge.com/api/ops/public-surface-truth \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d,indent=1))" \
  | grep -A40 calibrationEligibility
```

The two derivations are one line each: `0.69 * (1 - 0.69) = 0.2139` against the
0.22 Brier floor, and `sqrt(0.05) = 0.2236` against the 0.05 ECE floor.
