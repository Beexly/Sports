# GLMF shrinkage law: quarantined contract guards

Target under test (read only, never modified by this work):
`packages/prediction-engine/src/experimental/2402-01914v1-glmf-matchup-matrices.ts`

Guard file: `packages/prediction-engine/src/experimental/glmf-shrinkage-law.guard.ts`

These guards encode the **unblock condition** for a known contract violation in
that module. They are **expected to fail today**. Nobody has fixed the violation,
so the guards document what "fixed" has to mean and fail loudly when someone runs
them.

## Why the file is named `.guard.ts` and not `.test.ts`

`packages/prediction-engine/vitest.config.ts` sets `include` to
`["src/**/*.test.ts"]`. A `.test.ts` guard would be collected by the default
engine suite and turn the whole suite red for a violation that is not anyone's
assigned work. Quarantining as `.guard.ts` keeps the default suite green while
the violation stays written down, runnable, and impossible to forget silently.

## How to run them

The obvious command does **not** work, and this was observed rather than assumed:

```
$ npx vitest run --root packages/prediction-engine glmf-shrinkage-law.guard
filter:  "glmf-shrinkage-law.guard"
include: "src/**/*.test.ts"
No test files found, exiting with code 1
```

A positional argument to `vitest run` is a **filter applied on top of the
configured `include` glob**, not a replacement for it, and vitest 2.1.9 exposes
no `--include` CLI flag. So a `.guard.ts` file is never collected under the
package config. The guards are run with a config whose `include` covers guards,
kept **outside the repository** so this work still adds exactly two files:

```powershell
# from the repo root
$cfg = Join-Path $env:TEMP "glmf-guard.vitest.config.mjs"
Set-Content -Path $cfg -Encoding utf8 -Value `
  'export default { test: { globals: true, environment: "node", include: ["src/**/*.guard.ts"] } };'
npx vitest run --root packages/prediction-engine --config $cfg
```

If the project later wants this to be a first class command, the maintainable
form is a second committed config (for example `vitest.guard.config.ts`) plus a
`test:guard` script. That was deliberately **not** added here, because this task
was scoped to two files.

## Guard 1: the observation model must be binomial, not Gaussian

Contract claim under test: the module header declares X is a **binomial** matrix,
a proportion over a known denominator (completions/targets, EPA>0 plays/snaps).
Under contract section 3.A a proportion requires beta-binomial empirical Bayes or
a logit-normal. `alsFactorize` is instead a Gaussian alternating least-squares
fit with a ridge `lambda` on those ratio values, which is the forbidden pairing.

### 1a. Fitted cells must stay inside the probability range

Asserts: after fitting, `glmfPredict` returns a value in `[0, 1]` for every
`(u, i)` cell.

Why it fails today: the prediction is an unconstrained linear form,
`mu + bu[u] + bi[i] + P[u] . Q[i]`, with nothing holding it inside the valid
range of a proportion. On a sparse matrix with a light ridge the fit produces a
**negative probability** (see the pasted output below: `-0.00557` for cell
`(9, 6)`). No binomial observation model can emit that value.

What would make it pass: a fit whose cell value is a probability by construction
(beta-binomial EB mean, a logit-normal back-transform, or any constrained link).

### 1b. The fit must respond to the binomial trial count

Asserts: two datasets with **identical observed proportions** but different
denominators (1 trial versus 3 and 4000 trials behind each cell) produce
different predictions for the same probe cell. Trial counts are already carried
on the records, so the check needs no change to any calling convention.

Why it fails today: the two predictions are bit-identical
(`0.2968873230459855` both ways, difference exactly 0). The module never reads a
denominator, which is the direct, observable signature of a response model that
treats a proportion as a continuous reading instead of as a count over trials.
`3/3` and `3000/4000` are the same rate but wildly different evidence, and this
fit cannot tell them apart.

What would make it pass: an input contract that carries the binomial denominator
and a likelihood whose contribution is weighted by it.

### 1c. The module must carry a binomial family likelihood primitive

Asserts: after stripping comments, the module source contains at least one
binomial family token (`lgamma`, `lchoose`, `binomial`, `beta`, `logit`,
`deviance`, `irls`, `exposure`, `trials`, `denominator`, `successes`, `failures`).

Why it fails today: the match is empty. The only numeric kernel in the module is
`solveAls`, a Gauss-Jordan linear solve driven by ridge-damped normal equations.
There is no likelihood anywhere, binomial or otherwise.

Notes on this check: comments are stripped first so the guard asks what the
**code** models rather than what the prose calls it, since the header comment
legitimately contains the word "binomial". The token list is substring tolerant
on purpose: the requirement is that some binomial family likelihood exists, not
that it was given one particular name.

## Guard 2: the shrink target must not come from the same sample

The module's shrinkage target `mu` is the arithmetic mean of the **same** ratings
array being factorized. That is a reverse-Stein target: the quantity every rating
is shrunk toward is computed from those ratings themselves.

### 2a. The target must not be the sample mean

Asserts: `fit.mu` differs from the arithmetic mean of the input ratings.

Why it fails today: the difference is exactly `0`. `alsFactorize` computes
`mu = ratings.reduce((s, x) => s + x.r, 0) / ratings.length` at line 35, which is
the assertion's own expression, so it matches bit for bit.

What would make it pass: a target from a genuinely separate source, for example a
caller-supplied league prior, or a hyper-mean estimated from a pooled sample that
is not the sample being shrunk.

### 2b. The target must not echo the sample one for one

Asserts: shifting **every** observation by a constant moves the target by
strictly less than that constant, measured as a slope against the shift. A target
estimated from outside the sample has slope 0; an EB target is damped (slope
below 1). A sample mean has slope exactly 1.

Why it fails today: the measured slope is exactly `1`. The fixture sanity check
confirming the shift really does move the sample mean by the full amount passes,
so the slope of 1 is the target tracking the data, not a broken fixture.

What would make it pass: any target that is not a one for one function of the
sample's own level.

### 2c. One extreme observation must not move the target by the arithmetic increment

Asserts: replacing a single observation moves `mu` by something other than
`(new - old) / n`, which is exactly what a sample mean does.

Why it fails today: the observed movement is `0.0032132067013945775` against an
arithmetic increment of `0.0032132067013945836`, a difference of `6.07e-18`,
which is floating point noise. The single observation moves the shrink target by
precisely its one-over-n share.

## Real observed output

Command actually run (config file in the OS temp directory, as above):

```
 RUN  v2.1.9 C:/Users/Garrett/Sports-wt-wire-2026-09-26-propsdfs/packages/prediction-engine

 ❯ src/experimental/glmf-shrinkage-law.guard.ts (6 tests | 6 failed) 92ms
   × glmf guard 1: the observation model for a BINOMIAL matrix must be binomial, not Gaussian least squares > every fitted cell prediction must stay a valid probability in [0, 1] 46ms
     → expected [ { u: 9, i: 6, …(1) } ] to deeply equal []
   × glmf guard 1: the observation model for a BINOMIAL matrix must be binomial, not Gaussian least squares > the fit must respond to the binomial trial count behind each cell 16ms
     → expected 0.2968873230459855 to not be close to 0.2968873230459855, received difference is 0, but expected 5e-11
   × glmf guard 1: the observation model for a BINOMIAL matrix must be binomial, not Gaussian least squares > the module must carry a binomial-family likelihood primitive, not only a ridge least-squares solve 2ms
     → expected [] to not deeply equal []
   × glmf guard 2: the shrink target must not be derived from the same sample being shrunk > the shrink target must not be the arithmetic mean of the ratings being factorized 6ms
     → expected 0 to be greater than 1e-9
   × glmf guard 2: the shrink target must not be derived from the same sample being shrunk > the shrink target must not move one-for-one with a uniform shift in the sample 10ms
     → expected 1 to be less than 1
   × glmf guard 2: the shrink target must not be derived from the same sample being shrunk > one extreme observation must not move the shrink target by the raw arithmetic-mean increment 9ms
     → expected 0.0032132067013945775 to not be close to 0.0032132067013945836, received difference is 6.071532165918825e-18, but expected 5e-10

 Test Files  1 failed (1)
      Tests  6 failed (6)
   Duration  1.49s
```

The negative probability, in full, from the same run:

```
AssertionError: expected [ { u: 9, i: 6, …(1) } ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   Object {
+     "i": 6,
+     "predicted": -0.0055721839644593246,
+     "u": 9,
+   },
]

 ❯ src/experimental/glmf-shrinkage-law.guard.ts:163:24
    163|     expect(outOfRange).toEqual([]);
```

## Confirmation the default suite ignores these guards

Two independent observations:

1. The default package config resolves to `include: "src/**/*.test.ts"`, and
   filtering for the guard under that config reports `No test files found`.
2. A full default run of the package collected **841 test files / 6115 tests, all
   passing**, and `glmf-shrinkage-law.guard.ts` was not among them. The engine
   suite is green; these guards are outside it.

## Other verification

* `npx tsc --noEmit` in `packages/prediction-engine` reports **one pre-existing
  error unrelated to this work**:
  `src/hierarchical-pool.ts(11,10): error TS2305: Module '"@sports/types"' has
  no exported member 'SignalFamily'.` The guard file is included in the
  package typecheck (the tsconfig excludes only `*.test.ts`) and produced **no**
  errors of its own.
* `git status` confirms this work added only the guard file (and this document).
  `2402-01914v1-glmf-matchup-matrices.ts` and its `.test.ts` are untouched.

## Scope

These guards assert only. This task did **not** fix the module, and no change to
`2402-01914v1-glmf-matchup-matrices.ts`, its test, `src/index.ts`, or the
`odds/` `markets/` `signals/` directories was made.
