# The fantasy variance model, and why the McCaffrey spot-check failed

**Built 2026-09-28. Measured on production Neon (read-only), `player_game_stats`.**
Every number below traces to `.hermes/scratch/varfit.py` / `varfit2.py` run against
32,894 player-weeks. Reproduce before trusting any of it.

## THE HEADLINE: the posted spot-check is a label leak, and its band is arithmetically impossible

The spec asked for a spot-check: **McCaffrey proj=417, floor=313, ceiling=584**,
"if they aren't consistent with the method, the method is wrong and the
spot-check fails." They are not consistent. Two independent falsifiers, both
arithmetic, neither a judgement call.

### Falsifier 1 — proj=417 is the ANSWER, not a forecast

| quantity | value | source |
|---|---|---|
| McCaffrey's realized **2025** season total, PPR | **416.6** | `player_game_stats`, season 2025 REG, 17 games |
| posted "projection" | **417** | = `round(416.6)` |

The posted projection is the outcome it would be scored against. A model fit on
seasons **< 2025** has never seen 2025 and cannot emit that number. Fitting the
method exactly as specified (6-week half-life, EB shrinkage toward the RB mean,
train 2020-2024):

| remaining games | proj | floor | ceiling |
|---|---|---|---|
| 16 | 233.5 | 116.1 | 350.9 |
| 17 | **248.0** | 123.3 | 372.8 |
| 18 | 262.6 | 130.6 | 394.7 |

`proj` never reaches 417 under any remaining-game count. The spot-check target
is unreachable without looking at the answer key.

### Falsifier 2 — 313/584 cannot be a band this method emits

The band is `floor = proj*(1-CV)`, `ceiling = proj*(1+CV)`. That is **symmetric in
CV by construction**, so it must satisfy `floor + ceiling = 2*proj` for every CV:

```
313 + 584 = 897
2 * 417   = 834        897 != 834
```

The posted band's midpoint is **448.5**, not 417. Each endpoint demands a
different CV:

```
CV implied by floor   = 1 - 313/417 = 0.2494
CV implied by ceiling = 584/417 - 1 = 0.4005
gap = 0.1511
```

No single CV produces this pair. These are feed numbers wearing our variable
names. **Not run to green. Pinned as falsifiers in
`packages/prediction-engine/src/__tests__/fantasy-variance.test.ts`.**

## THE POSTED CV PRIORS DO NOT MATCH THIS DATA

Spec: "use the measured positional coefficients of variation as the prior: QB
45%, RB 55%, WR 65%, TE 67%." Those are not what production measures.

Measured 2026-09-28, seasons 2020-2024 REG, players with >= 8 training games,
**mean of per-player within-player CV** (n=771 players):

| pos | spec prior | MEASURED | delta | n players |
|---|---|---|---|---|
| QB | 0.45 | **0.993** | +0.543 | 96 |
| RB | 0.55 | **0.872** | +0.322 | 206 |
| WR | 0.65 | **0.876** | +0.226 | 304 |
| TE | 0.67 | **0.936** | +0.266 | 165 |

The **ordering is also wrong**. The spec makes QB the most consistent and WR/TE the
least. The data says QB is the single most volatile position. Pooled-per-game CV
(pooling the position's rows, which also absorbs between-player variance) reads
QB 0.661 / RB 0.910 / WR 0.916 / TE 0.970 — higher than the spec everywhere too,
so this is not a pooling-choice artifact.

Shipping the spec priors would publish a claimed ±25% band on a QB whose weekly
output genuinely swings ±99%. The measured table is the default;
`SPEC_POSTED_POSITIONAL_CV` is kept as a named export for the record, and
`classifyCvSource()` reports which table a caller passed so this can never drift
silently again.

## OUT-OF-SAMPLE, because a model that only passes in-sample is decoration

Fit on 2020-2024, scored against realized 2025, players with >= 8 training games
(remaining = 16):

```
n = 287   MAPE = 0.3359   median absolute error = 30.8 points
```

Largest misses:

| player | pos | proj | actual | err |
|---|---|---|---|---|
| Christian McCaffrey | RB | 248.0 | 416.6 | **+168.6** |
| Adam Thielen | WR | 200.4 | 39.6 | -160.8 |
| Jonnu Smith | TE | 227.9 | 85.2 | -142.7 |
| Jacoby Brissett | QB | 89.8 | 227.4 | +137.7 |
| Kenny Gainwell | RB | 85.2 | 221.3 | +136.1 |

**A 6-week half-life makes this model structurally pessimistic on a player
coming off a bad season.** McCaffrey's 2024 weekly tail is
`[4.8, 7.4, 2.7, 4.9, 1.5, 1.8, 3.3, 0.0, 1.8, 3.3, 1.0, 2.3]` — the injury
year. Six weeks of exponential decay puts almost all the weight on exactly those
weeks. Fitted rate **14.59/game** against a realized **24.51**. That single
mechanism is a 40% under-projection, and it is the largest single error in the
table. A half-life tuned to the data is the obvious next calibration and is
**not** shipped here: the founder specified 6, and silently retuning it is the
same category of error as the leak above.

## WHAT IS SHIPPED

- `packages/prediction-engine/src/fantasy-variance.ts` — the model. Recency
  weight, EB shrinkage (`reliability = n/(n+8)`) on both the rate and the CV,
  band from the shrunk CV. Pure, no I/O, 0 type errors, 10 tests.
- `apps/web/lib/integrations/variance-projections.ts` — production adapter with a
  **fail-loud freshness gate** (`StaleTrainingWindowError`; a window more than
  one season behind the forecast throws instead of returning a number).
- `variance-provider.ts` / `variance-wiring.ts` — the provider, behind the
  existing `PROJECTIONS_PROVIDER` gate. **`graded-pool.ts` re-exports these but
  does not call them**: the process grade keeps feeding the fantasy suite. See
  the wiring note below.

## THE HONESTY RULES, AS ENFORCED CODE

1. `canPublishProjections` stays `false` on the process grade. Asserted by a
   test that runs against a **network-disabled fetcher**, so the flag is proven
   false on the error path too, not just the happy path.
2. The process grade is context, never a forecast. Nothing in this change
   converts a grade into a projection.
3. A stale source is a hard failure, never a quiet number.
4. `PROJECTIONS_PROVIDER` is **unchanged**. Not flipped by this commit.

## WIRING STATUS — read before using the suite

The fantasy suite (draft/waivers/optimizer/DFS/trade) still runs on the
`floor * 0.75` / `* 1.4` band computed inside `graded-pool.ts` from the process
grade, because `registerVarianceProjectionsFromProduction()` is not yet called
from `instrumentation.ts`. Enabling it is a one-line switch **plus a decision**:
at MAPE 0.34 this model would move every draft rank, waiver recommendation, and
DFS optimizer price. That is a founder go-live decision, not an implementation
detail, and it is the next step — not one this commit makes silently.

## REPRODUCTION

```bash
python .hermes/scratch/varfit.py    # positional CV, first pass
python .hermes/scratch/varfit2.py   # the McCaffrey falsifiers + 2025 eval
```

Both read a local CSV exported read-only from `player_game_stats` (seasons
2020-2026 REG + POST, 32,894 rows). No production write, no default-branch
mutation — branch-only-testing rule respected.
