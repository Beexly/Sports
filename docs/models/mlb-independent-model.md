# MLB Independent Model: Design and Shadow Scaffold

**Status:** Design and disabled shadow scaffold only.
**Owner:** Engineering lane for C-22.
**Promotion state:** Not eligible for production or publishing.
**Canonical model version:** Unchanged. This work must not change `MODEL_VERSION`.

## Purpose

The current confidence path is a weighted score and is not a genuine independent
win probability. Its near-zero resolution is a model problem, not a reason to
retune the existing consensus scorer. This lane creates a separate MLB
pregame model whose probability is conditioned on baseball information rather
than on bookmaker consensus.

The first target is a joint run-count forecast for an MLB game. The forecast
will expose binary probabilities for moneyline and total-side targets without
reading sportsbook prices, implied probabilities, consensus percentages, or
confidence scores.

This PR ships only the contract and a fail-closed API. The model is not fitted,
the probability is always `null`, and no caller can publish the result.

## Non-goals

- No change to `packages/prediction-engine/src/scoring.ts`.
- No change to `MODEL_VERSION` or any model-freeze artifact.
- No live ingestion, database write, cloud execution, Cursor execution, or
  vendor API call.
- No Odds API key, sportsbook key, or other secret.
- No market-derived feature may enter the model.
- No tip-sheet copy, customer-facing pick language, or public performance claim.
- No use of `confidence / 100` as a substitute for `modelProb`.

## Model boundary

The independent model receives only facts and provenance captured before first
pitch. The initial feature contract has five families:

1. **Team ratings:** opponent-adjusted offense and defense ratings, fitted from
   completed games, with sample size and as-of time.
2. **Starting pitcher:** starter identity, rest, workload, and observed run
   prevention or run allowance inputs from an approved source.
3. **Park:** venue identity, run factor, handedness interaction, roof status,
   and the effective sample behind the factor.
4. **Lineup:** projected or confirmed batting order, player availability state,
   lineup continuity, and the source timestamp.
5. **Weather:** temperature, precipitation probability, wind speed, outward
   wind component, and roof state at the venue.

No feature is allowed to be a sportsbook price, a de-vigged market
probability, a consensus score, or a transform of one of those values.

## Proposed statistical shape

The first fitted implementation will use an overdispersed count model rather
than the existing Poisson helper. The count response is allowed to vary by
pitcher, park, lineup, weather, and team-strength state.

For each side, the model will estimate a run mean on the log scale from:

- league baseline;
- opponent-adjusted team offense and defense;
- starting-pitcher effect;
- park effect and relevant interactions;
- lineup and availability effect;
- weather effect;
- home-field effect estimated from historical outcomes.

The run distribution will be overdispersed, with a dispersion parameter
estimated from completed games. A joint home-runs and away-runs distribution
will produce:

- `homeWinProbability`;
- `awayWinProbability`;
- `P(total > line)` and `P(total < line)` for a supplied evaluation line;
- expected home runs, expected away runs, and expected total runs.

The line is an evaluation threshold, not a model feature. The model must be
able to produce its run distribution before any market line is supplied.

## Shadow API

The additive API lives at
`packages/prediction-engine/src/mlb-independent-model.ts` and is exported from
the prediction-engine barrel.

The request contract is `MlbIndependentModelInput`:

- `gameId` and `target` identify the shadow observation;
- `pitcher` carries home and away starter facts;
- `park` carries venue facts;
- `lineup` carries home and away lineup facts;
- `weather` carries game-time conditions;
- `teamRatings` carries home and away rating facts;
- `totalLine` is optional and is used only to evaluate a total-side target.

The response contract is `MlbIndependentModelResult`:

- `modelVersion` is the shadow model identifier;
- `mode` is always `shadow`;
- `enabled` is always `false`;
- `status` is always `shadow`;
- `modelProb` is `number | null` and is `null` until a fitted model passes all
  gates;
- the run forecast fields are `null` until the model is implemented;
- `publishable` is always `false`;
- `reason` explains the refusal, currently `MODEL_DISABLED`.

`getMlbIndependentModelProb` is pure. It performs no I/O, reads no environment
variable, and cannot fall back to a consensus or a made-up probability.

## Rights-aware data sources

Every adapter must use an existing `source-registry.ts` entry and preserve its
verdict, attribution, rate limit, and observed timestamp. The initial source
map is:

| Registry id | Use | Rights posture | Constraint |
|---|---|---|---|
| `retrosheet` | completed play-by-play, box scores, and historical team inputs | `cleared-with-attribution` | bulk download and cache locally; carry the required notice |
| `lahman-db` | season-level team and player context | `cleared-with-attribution` | preserve CC BY-SA attribution and share-alike obligations |
| `baseball-savant` | Statcast-derived starter and player facts | `use-with-caution` | facts as model inputs only; never re-expose the feed |
| `nws-weather` | venue forecast and observation | `cleared` | send a reasonable User-Agent and cache politely |
| `espn-public-api` | narrow schedule or box-score facts only | `use-with-caution` | derived analytics only; no commercial display of the feed |

The official MLB Stats API and any other unlisted provider are not silently
added to this lane. A new adapter requires a registry entry and a recorded
rights decision first. A source with a `forbidden` or `paid-required` verdict
must not be fetched by this model.

## Data-quality rules

- Every feature carries an `asOf` timestamp and a source identifier.
- Missing pitcher, park, lineup, weather, or rating data produces a missing
  feature marker, not a zero or an imputation.
- A model observation generated after first pitch is invalid for pregame
  validation and is excluded with a counted reason.
- Bootstrap-era records remain flagged and cannot be silently mixed with
  settled historical games.
- A source outage, stale feature, or malformed row returns no probability.
- The run distribution and binary probability are reproducible from the same
  frozen input snapshot.

## Acceptance gates

These gates are for a future fitted model. They are not passed by this scaffold.
The thresholds below must be frozen in a pre-registration before labels are
inspected.

### Data and leakage gates

1. Every training and validation row is pregame and has source provenance.
2. Features are grouped by game for train and validation splits. A game cannot
   appear in both sides of a split.
3. No market price, implied probability, consensus percentage, or confidence
   score is present in the feature vector.
4. A null-data test must produce a null forecast without changing the public
   scoring path.
5. The model must run with a synthetic null where all covariates are shuffled;
   the null test must not show apparent skill.

### Independent-model gates

1. The probability is finite and lies in `[0, 1]` for every eligible row.
2. The forecast has non-trivial resolution. The initial pre-registration floor
   is a probability standard deviation of at least `0.10` and a 10th-to-90th
   percentile span of at least `0.20` on the held-out target.
3. Calibration is reported with Brier score and log loss, with reliability
   plotted by sport and market target. The initial ECE ceiling is `0.05`, with
   the raw value and sample size shown beside it.
4. The model is compared with a team-rating-only baseline and a league-average
   baseline on the same held-out games.
5. The improvement is not produced by a single pitcher, park, or weather
   subgroup. Any subgroup with fewer than `30` settled games is reported as
   descriptive only.

### Market-close comparison gates

The benchmark is the de-vigged probability from a timestamped, pregame closing
market snapshot. The model does not receive that snapshot as an input.

1. The same settled game, target, and market side are used for both the model
   and the market close.
2. In-play generations are excluded before scoring.
3. Market close is reconstructed or de-vigged with the repository's documented
   method and the source timestamp is retained.
4. The primary pass condition is a positive out-of-time skill difference:
   `Brier(model) - Brier(market close) <= -0.01`, with a game-grouped bootstrap
   confidence interval excluding zero on the preregistered primary market.
5. The model must also beat the market close on log loss without a material
   calibration deterioration. If either condition fails, the model remains
   research-only.
6. A favorable mean result does not pass the gate if the model is materially
   dependent on post-close or in-play information.

### Promotion gate

No result from this PR promotes the model. A later promotion requires:

- all data, leakage, resolution, calibration, and market-close gates passing on
  a frozen holdout;
- a prospective shadow period with no publication side effects;
- an explicit owner decision;
- a new canonical `MODEL_VERSION` and a separately reviewed integration change.

Until then, `ENABLED=false`, `mode="shadow"`, and `publishable=false` are
intentional.

## PR definition of done

- This design document exists.
- The prediction-engine package contains the additive API and disabled shadow
  constants.
- A focused Vitest suite proves the API returns a null probability, cannot
  publish, and does not fabricate a fallback.
- `scoring.ts` is unchanged.
- `MODEL_VERSION` is unchanged.
- No env flag, market key, cloud job, database write, or public surface is
  added.
