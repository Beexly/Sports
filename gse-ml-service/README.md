# gse-ml-service

CPU-only FastAPI sidecar wrapping five numerical modules from the prediction-engine
research notes. Stateless: every request carries everything the model needs, nothing is
cached or persisted, and every stochastic path is seeded from a request field, so the
same request always produces the same response.

**Read the next section before wiring anything into a pick.** It is the reason this
README exists.

---

## Which of these are real predictors? One of five.

| Model | Endpoint | Real signal? | Usable as a predictor today? | Returns `probability`? |
|---|---|---|---|---|
| **ETKF** | `POST /predict/etkf` | **Yes** — exact ensemble Kalman filter maths | **Yes, once the link is calibrated** | **Yes** |
| **TDA** | `POST /predict/tda` | **Yes** — real topological features | **No** — it is a *feature extractor* | No |
| **Free energy** | `POST /predict/free-energy` | **No** — untrained network | **No** | No |
| **MPS / tensor-train** | `POST /predict/mps` | **No** — it is a *layer*, not a model | **No** | No |
| **IRL** | `POST /predict/irl` | **No** — not implemented at all | **No** | No (`null`, deliberately) |

In detail, and bluntly:

- **ETKF — real, and the only probability here.** A deterministic square-root ensemble
  Kalman filter over latent team strength. The linear algebra is exact and has no fitted
  parameters. The map from posterior latent margin to probability integrates over the
  posterior (MacKay moment matching), so a barely-observed team cannot produce a
  confident pick. **But the link is not calibrated**: `logistic_scale` (latent units per
  logit) and `home_advantage` are *request inputs*, defaulting to the bare convention
  "one latent unit = one log-odd, no home edge". Fit them against settled results before
  treating the output as a win probability. The response repeats this in its
  `calibration` field.

- **TDA — real signal, but not a prediction.** Persistent homology (H0 + H1) of player
  positions, vectorised as persistence images. A ring of players (a defensive shell)
  produces far more H1 mass than a random blob of the same size — that difference is
  asserted in the tests, not asserted in prose. It returns a fixed-length feature vector.
  Feed it to a downstream model. It has no probability to give and does not pretend to.

- **Free energy — untrained; its outputs are noise.** A two-level hierarchical VAE. This
  repository ships **no trained weights and no training data**, so the network is
  randomly initialised from the request's `seed` on every call. `loss` is a density
  objective in nats and may be negative. It is not a score, not a confidence, not a
  prediction. Useful today for wiring/shape checks and as the reference implementation to
  train later.

- **MPS — a layer, not a model.** A tensor-train (MPO) replacement for `nn.Linear`.
  Random weights in, random linear projection out. Its honest value is the compression
  accounting: `compression_ratio` below 1 means the TT form costs *more* parameters than
  the dense layer it replaces, which is what happens at small dimensions.

- **IRL — does not exist.** MaxEnt IRL needs expert play-by-play action trajectories;
  this project ingests odds and lines only. Nothing was built. The endpoint exists so the
  gap is visible and machine-readable rather than folklore.

### How the ensemble is protected from the four that aren't ready

`packages/prediction-engine/src/ensemble/remote-model-client.ts` admits a remote model's
response **only** when the JSON body carries a finite numeric `probability` in `[0, 1]`.
Anything else — a missing field, `null`, a string, `NaN`, out of range — is classified
`malformed_response` and lands in `getRemoteProbabilities().failed`, never in
`succeeded`.

So the four non-predictors here omit `probability` (or, for IRL, return it as `null`) and
are **automatically excluded from consensus**. That is the whole safety mechanism, and it
is load-bearing:

- `IrlResponse.probability` is annotated as `NoneType`, not `Optional[float]`. If someone
  later makes the stub return a float, FastAPI's response validation fails loudly (500)
  instead of leaking a fabricated number into the ensemble average. Verified by mutation:
  patching the stub to return `0.5` turns the endpoint into a 500.
- `app/tests/test_main.py` contains a Python port of the client's own
  `extractProbability` rule and asserts that exactly one endpoint — ETKF — is admitted.

Never "fix" a missing `probability` by returning `0.5`. A model that does not exist
voting 0.5 is not neutral; it drags every real signal toward the middle.

---

## Endpoints

Base URL in the intended deployment: `http://gse-ml-service:8000`.

Error contract, uniform across every endpoint:

| Status | When |
|---|---|
| `422` | Bad body: wrong JSON shape or types, unknown field, size over a cap, or a value the model itself rejects (unknown team, ragged matrix, non-finite coordinate, a persistence-image spec that does not tile). `detail` carries the message. |
| `503` | That model's module failed to import in this deployment (e.g. a missing optional dependency). The other endpoints keep serving; `GET /health` names the failure. |

Bad input never produces a 500 traceback — asserted for every endpoint in the tests.

### `GET /health`

Liveness plus an honest inventory. No request body.

```json
{
  "status": "ok",
  "service": "gse-ml-service",
  "version": "0.1.0",
  "python": "3.11.15",
  "models": {
    "tda": {
      "importable": true,
      "endpoint": "/predict/tda",
      "kind": "feature_extractor",
      "returns_probability": false,
      "usable_as_predictor": false,
      "signal": "real",
      "summary": "...",
      "import_error": null
    }
  },
  "consensus_eligible": ["etkf"]
}
```

`status` is `"ok"` only when all five modules imported; otherwise `"degraded"` with the
offending `import_error` filled in. `consensus_eligible` lists the models whose responses
carry a numeric probability. It is short on purpose.

### `POST /predict/etkf` — the one predictor

Stateless: the caller supplies the roster and the whole observation history each time.

Request:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `teams` | `string[]` (2–512, unique) | required | Roster. Team identity is by name. |
| `home_team`, `away_team` | `string` | required | Must be in `teams` and differ. |
| `observations` | `Observation[]` (≤ 4096) | `[]` | Assimilated in order. |
| `observations[].home_team` / `.away_team` | `string` | required | Must be in `teams`. |
| `observations[].margin` | `number` (finite) | required | Observed home-minus-away margin, in latent units. |
| `observations[].obs_var` | `number ≥ 0` | request `obs_var` | Per-observation error variance. |
| `state_dim` | `int` 1–16 | `1` | Latent components per team; only component 0 is read by the matchup operator. |
| `ensemble_size` | `int` 2–4096 | `50` | A 1-member ensemble is rejected (the update would be a no-op). |
| `seed` | `int` | `0` | Initial-ensemble seed. Same seed + same observations = identical response. |
| `initial_spread` | `number ≥ 0` | `1.0` | Prior spread. |
| `obs_var` | `number ≥ 0` | `1.0` | Default observation-error variance. |
| `logistic_scale` | `number > 0` | `1.0` | **Not calibrated.** Latent units per logit. |
| `home_advantage` | `number` | `0.0` | **Not calibrated.** Latent-unit offset. |
| `inflation` | `number ≥ 0` \| `null` | `null` | Multiplicative covariance inflation applied after each assimilation. There is no dynamics model, so without it the spread only ever shrinks across a long history. |

```bash
curl -sX POST localhost:8000/predict/etkf -H 'content-type: application/json' -d '{
  "teams": ["A", "B", "C"], "home_team": "A", "away_team": "B",
  "observations": [{"home_team": "A", "away_team": "B", "margin": 2.0}]
}'
```

Response:

```json
{
  "model": "etkf",
  "available": true,
  "probability": 0.7688608309512989,
  "home_team": "A",
  "away_team": "B",
  "latent_margin": 1.3520452901896898,
  "margin_spread": 0.8222059626972095,
  "team_strengths": {"A": 0.614, "B": -0.738, "C": -0.076},
  "team_strength_spreads": {"A": 0.746, "B": 0.786, "C": 0.958},
  "observations_assimilated": 1,
  "calibration": "UNCALIBRATED: logistic_scale and home_advantage are request inputs, not fitted values. ..."
}
```

`probability` is strictly inside `(0, 1)`, exactly `0.5` with no observations and no home
advantage, and antisymmetric to bit-exactness when `home_advantage == 0`
(`p(A,B) + p(B,A) == 1.0`).

### `POST /predict/tda` — features, not a prediction

Request:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `frames` | `[[x, y], ...][]` (≤ 512 frames, ≤ 128 points each) | required | One frame per time slice. Frames with < 3 points are skipped, not rejected. |
| `spec` | object \| `null` | module default | `birth_range`, `pers_range` (default `[0, 2]`), `pixel_size` (`0.2`), `sigma` (`0.2`), `weight_cap` (`null` → `pers_range[1]`). Each range must tile into whole pixels or you get a 422. |
| `include_features` | `bool` | `true` | `false` returns diagnostics only. |

Response: `feature_length`, `frames_submitted` / `frames_used` / `frames_skipped`,
`h0_slice` and `h1_slice` (`[start, stop)` index pairs into `features`), `features`
(finite, all `≥ 0`, length `feature_length`; all zeros if every frame was skipped), and
`truncation_warning`.

**Scale matters.** The persistence image covers a *fixed* window, `[0, 2] × [0, 2]` by
default, i.e. coordinates on a roughly unit scale. Raw court/field coordinates (feet,
metres) push the whole diagram off the window and produce a saturated, uninformative
vector — in which case `truncation_warning` is non-null and says so. Rescale the
coordinates (divide by field length) or widen `spec`.

### `POST /predict/free-energy` — objective terms only, no probability

Request: `observations` (`number[][]`, rectangular, finite, 1–256 rows), `hidden_dim`
(default 64), `z1_dim` (16), `z2_dim` (8), `seed` (0), `sample` (default `false` — uses
posterior means, keeping the response deterministic), `include_latents` (`true`).

Response: `loss`, `reconstruction`, `kl_z1`, `kl_z2`, `batch`, `input_dim`, `z1`, `z2`,
`seed`, `trained: false`, and a `note` saying the weights are random. `loss` equals
`reconstruction + kl_z1 + kl_z2`.

There is no `probability` field and there will not be one until the model is trained and
calibrated. Changing `seed` changes the answer — that *is* the demonstration that the
output reflects the random initialisation, not learned structure.

### `POST /predict/mps` — layer output and compression accounting

Request: `inputs` (`number[][]`, rectangular, finite; `in_features` is inferred from the
row width), `out_features` (required), `num_cores` (default 3, ≤ 8), `max_rank` (4, ≤ 64),
`bias` (`true`), `seed` (0), optional `in_factors` / `out_factors` (length must equal
`num_cores`, product must equal the feature size), `include_outputs` (`true`).

Response: `in_features`, `out_features`, `in_factors`, `out_factors`, `ranks`
(boundary ranks pinned to 1), `num_core_parameters`, `dense_equivalent_parameters`,
`compression_ratio`, `outputs`, `trained: false`.

`compression_ratio = dense_equivalent_parameters / num_core_parameters`. **Below 1 means
the TT form is bigger than the dense layer**; e.g. 50 → 2 with 3 cores and rank 4 gives
~0.78. It only pays at large, well-factorable dimensions.

### `POST /predict/irl` — a deliberate non-answer

Accepts the TypeScript client's `GameContext` body as-is: camelCase keys
(`gameId`, `homeTeam`, `awayTeam`) and arbitrary extra fields are allowed, so the call
reaches the intended path instead of 422-ing (a 422 would be logged as `http_error`, which
reads like an outage rather than "this model was never built").

Always returns **HTTP 200** with, byte for byte, the stub's shape:

```json
{
  "available": false,
  "model": "maxent_irl",
  "probability": null,
  "reason": "MaxEnt IRL is not implemented: it requires expert play-by-play action trajectories, which this project does not ingest ...",
  "required_data": ["play-by-play event streams with one row per possession/action", "..."]
}
```

`probability: null` is the point: it makes remote-model-client reject the response as
malformed and drop this model from consensus. The response is identical for every input
— different teams do not get different answers, because there is nothing here that could
tell them apart.

---

## Running it

### Locally

```bash
cd gse-ml-service
python -m pip install --no-deps -r requirements.txt   # --no-deps is required, see below
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
curl localhost:8000/health
```

Interactive API docs (FastAPI's generated Swagger UI) at `/docs`; the raw schema at
`/openapi.json`.

### Tests

```bash
cd gse-ml-service
python3 -m pytest app/tests -q      # 328 passed
```

The package tree is deliberately `__init__.py`-free. `gse-ml-service/conftest.py` puts
the service root on `sys.path`, which is what makes `from app.models.x import y` resolve;
without it collection fails, so do not delete it. It also lets the suite run from the
repo root (`python3 -m pytest gse-ml-service/app/tests -q`), which is what CI does.

### Docker

```bash
docker build -t gse-ml-service:local gse-ml-service/
docker run --rm -p 8000:8000 gse-ml-service:local
curl localhost:8000/health
```

Multi-stage: `build-essential` lives in the builder stage only, so the runtime image
carries the finished virtualenv and no compilers. ripser publishes cp311 wheels for
manylinux/musllinux on x86_64 and aarch64, so nothing normally compiles — the toolchain
is insurance for an index or platform where the wheel does not apply.

The image runs as a non-root user, exposes 8000, and has a `HEALTHCHECK` that hits
`/health` using only the standard library (slim has no curl). The tests are copied in
too: `docker run --rm gse-ml-service:local pytest app/tests -q`.

### `--no-deps`, and why persim is not here

`requirements.txt` is a **complete pinned lock** and must be installed with `--no-deps`.

`ripser` declares `persim` as a runtime dependency; `persim` depends on `hopcroftkarp`,
which is sdist-only (no wheel on any platform) and must be compiled at install time —
a build that has failed on Python 3.11 with setuptools' removed `install_layout` API.
persim also drags in matplotlib, pillow, fonttools and the rest of a plotting stack that
a headless API has no use for.

None of it is needed: `app/models/tda.py` calls `ripser.ripser()` only and implements its
own persistence-image vectorisation (integrating each Gaussian exactly per pixel via
`erf`), precisely because `PersistenceImager` was unavailable. Verified: a clean
virtualenv with ripser installed `--no-deps` and no persim present runs all 328 tests
green.

Adding a dependency therefore means adding its transitive closure: install it normally in
a scratch venv, run `pip freeze`, and update both sections of `requirements.txt`.

### Wiring the TypeScript client at it

`remote-model-client.ts` hard-codes no endpoints — the caller owns the list. Point it
here with something like:

```ts
const endpoints: ModelEndpoint[] = [
  { name: "etkf", url: "http://gse-ml-service:8000/predict/etkf", enabled: true, timeoutMs: 2000 },
];
const { succeeded, failed } = await getRemoteProbabilities(endpoints, ctx);
```

Two things to know before you do:

1. **The client POSTs a `GameContext`** (`{gameId, sport, homeTeam, awayTeam, ...}`) as
   the body. `/predict/irl` accepts that shape directly. `/predict/etkf` does **not** — it
   needs a roster and an observation history, which a `GameContext` does not carry. Give
   it an adapter on the TypeScript side that assembles the request from settled results,
   or add a thin endpoint here that does the assembly. Do not point the client straight at
   `/predict/etkf` and expect it to work.
2. **Calibrate first.** `logistic_scale` and `home_advantage` are unfitted inputs. An
   uncalibrated probability admitted to consensus is worse than no probability, because
   it looks like a signal.

Adding `/predict/tda`, `/predict/free-energy`, `/predict/mps` or `/predict/irl` to that
endpoint list is harmless — the client rejects all four as malformed — but it is also
pointless, and it will fill the failure log with entries that look like outages. Leave
them out until they can answer with a real probability.

---

## What has actually been verified

Everything below was run in this repository, not inferred:

- `python3 -m pytest app/tests -q` → **328 passed** (252 model tests + 76 for this HTTP
  surface), from the service root and from the repo root.
- The same 328 in a **clean Python 3.11 virtualenv** built from `requirements.txt` with
  `--no-deps` and no persim/Cython installed.
- A live `uvicorn app.main:app` process serving `GET /health`, `POST /predict/etkf`
  (probability `0.769`), `POST /predict/irl` (200 with `probability: null`), and a
  malformed body (422).
- Mutation check on the IRL contract: forcing the stub to return `0.5` makes the endpoint
  fail response validation instead of emitting a number.

Not verified here: **the Docker image has never been built** — the sandbox has the docker
CLI but no daemon. Build it once before relying on it in a pipeline. The CI workflow has
likewise not been executed on a GitHub runner.

## Still missing

- No caller consumes this service in production. Wiring is described above; it has not
  been done.
- ETKF's logistic link is uncalibrated, so nothing here moves Brier/ECE yet.
- Free energy has no training loop, no data, and no checkpoint.
- IRL has no implementation and no data path to one.
