# gse-ml-service

> ================================================================================
> **EXPERIMENTAL RESEARCH SIDECAR — NOT CONNECTED TO PRODUCTION PICK GENERATION**
> ================================================================================
>
> This is a standalone Python research service. It is **not** part of the
> npm workspaces (`apps/`, `packages/`, `workers/`) in this repository, has
> **no database connection**, and is **not deployed anywhere production
> traffic reaches**. Nothing it returns should be treated as a real
> prediction, a calibrated probability, or a production-quality pick.

## What this is

`gse-ml-service` is a small FastAPI service that exposes five experimental,
research-stage model components as HTTP endpoints, for offline
experimentation and future backtesting:

| Endpoint | Model | What it is |
|---|---|---|
| `POST /predict/tda` | `app/models/tda.py` | Topological data analysis (persistence-image) features over 2-D point-cloud sequences (`ripser` + `persim`) |
| `POST /predict/irl` | `app/models/irl.py` | A Maximum-Entropy Inverse Reinforcement Learning reward-model scaffold |
| `POST /predict/etkf` | `app/models/etkf.py` | An Ensemble Transform Kalman Filter over per-team latent state |
| `POST /predict/free-energy` | `app/models/free_energy_coder.py` | A two-level hierarchical VAE-style encoder with a real ELBO loss |
| `POST /predict/mps` | `app/models/mps_layer.py` | A tensor-network-inspired (MPS-flavored) linear layer |

`GET /` and `GET /health` both report
`"status": "experimental-research-sidecar-not-in-production"`.

## Why this is explicitly non-production (and why that matters here)

This repository's root `CLAUDE.md` states, as **non-negotiable rules**:

> - **No fake data** — all picks sourced from real API data
> - **No fabricated stats** — content is data-backed only

and, under Prediction Engine Rules:

> Structured odds/line data is source of truth

(the Claude/AI layer is explicitly described as "content generation only —
not source of truth").

None of the models in this service have been trained on real historical
sports outcome data. This service has no database, no data-ingestion
pipeline, and no access to `packages/data-ingestion`. Concretely:

- **`app/models/mps_layer.py`** (`MPSLinear`) and
  **`app/models/free_energy_coder.py`** (`FreeEnergyCoder`) are `torch`
  modules with **randomly initialized weights**. Their forward-pass output
  is mathematically well-defined (the ELBO loss computation, in
  particular, is a correct implementation) but **carries no real predictive
  signal** until trained on real data.
- **`app/models/etkf.py`** (`ETKF`) starts every team's latent state at a
  small random perturbation around zero. Before any `update()` calls (i.e.
  with no real observations assimilated), `predict()` returns
  approximately 0.5 for any matchup — an honest "no information yet" output.
- **`app/models/irl.py`**'s `LinearRewardModel` starts with an **all-zero
  weight vector, not random noise**. `simulate_game()` on an untrained model
  is *guaranteed* — by construction, not by luck — to return exactly `0.5`
  for any input. This replaces an earlier draft that literally computed
  `np.mean([random.random() for _ in range(num_rollouts)])`: pure noise
  dressed up as a probability, and also one that (in that earlier draft)
  took opaque team-name strings as input even though this standalone
  service has no team database to resolve them against. See the module
  docstring in `app/models/irl.py` for the full explanation.
- **`app/models/tda.py`** never fabricates a value for point clouds it
  can't meaningfully process — frames with fewer than 3 points are skipped,
  and empty/all-degenerate input returns a documented, correctly-derived
  zero vector (see the module for how that vector's length — 50 — is
  actually derived from a real `PersistenceImager.transform()` call rather
  than a guessed constant).

Every model here is designed to **fail safe to a neutral/uninformative
output** when untrained, rather than emit confident-looking noise. That is
the entire point of this service's design: it is safe to poke at, safe to
extend, and safe to reason about — but it is not safe to wire into a real
pick until it has been trained, backtested, and explicitly promoted (see
below).

## Disabled by default on the TypeScript side

The only code in the main application that is even aware this service could
exist is `packages/prediction-engine/src/remote-model-client.ts` (built in
parallel with this service). Every one of its built-in remote-model configs
ships with `enabled: false`. Nothing in `apps/web`, `workers/`, or
`packages/prediction-engine/src/scoring.ts` calls out to this service — on
localhost or anywhere else — unless an operator explicitly opts a given
sidecar in via its `REMOTE_MODEL_<NAME>_ENABLED` environment variable, which,
as of this writing, no deployment does.

## Running locally

```bash
cd gse-ml-service
python3 -m venv .venv
source .venv/bin/activate        # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The service listens on `http://127.0.0.1:8000` by default. Try:

```bash
curl http://127.0.0.1:8000/health
```

`ripser` and `torch` are heavy C-extension / large binary dependencies; the
first install can take a few minutes.

## Running tests

```bash
source .venv/bin/activate
pytest
```

Tests for the `ripser`/`persim`-dependent module (`test_tda.py`) and the
`torch`-dependent modules (`test_free_energy_coder.py`, `test_mps_layer.py`)
each start with `pytest.importorskip(...)`, so the suite degrades
gracefully (skipping rather than failing) in an environment where those
heavy dependencies didn't install — while still running everything else.

## Integration path to production

This service must **never** be pointed at by
`packages/prediction-engine/src/remote-model-client.ts` in a live deployment
until all of the following have happened, mirroring the promotion-gate
language already used elsewhere in this repository's prediction engine
(e.g. `packages/prediction-engine/src/index.ts`'s independent fair-value
estimators, which are "Fed into `independentFairValues` ONLY after
calibration proves it"):

1. **Real training data.** Each model needs real historical data —
   real game outcomes, real tracked positions, real line/odds history as
   appropriate — sourced the way this repo's non-negotiable rules require
   (via `packages/data-ingestion`, never fabricated or scraped outside the
   Scraping Clearance Engine's rules). No model here has been trained on
   anything yet.
2. **A real backtest**, run through this repo's existing calibration
   tooling in `packages/prediction-engine` (e.g. its calibration/temperature-
   scaling and Brier/log-loss style evaluation, the same tooling the
   in-repo independent estimators are held to) — not an ad hoc script, and
   not this service's own unit tests, which only verify the *math* is
   implemented correctly, not that the *predictions* are any good.
3. **An explicit promotion-gate decision**, made by a human with the
   backtest results in hand, that a specific trained model version is fit to
   move from "shadow signal fetched by `remote-model-client.ts` for offline
   analysis" to "blended into a pick's confidence/edge score." Per
   `remote-model-client.ts`'s own module docstring, that client's job today
   is to fetch and return **raw shadow probabilities for future offline
   backtesting/analysis only** — it must never blend them into a pick's
   confidence or edge score on its own authority, and neither should this
   service's existence be read as pre-authorizing that blend.
4. Only after (1)-(3): an operator sets the relevant
   `<NAME>_SERVICE_URL` and flips the matching `REMOTE_MODEL_<NAME>_ENABLED`
   environment variable to `"true"` for that one, specific, backtested,
   promoted model — not as a blanket "turn the sidecar on."

Until that sequence has happened, this service exists purely as research
scaffolding: correct math, honest fail-safe behavior, real tests, and
nothing wired into a real pick.
