"""gse-ml-service — FastAPI entrypoint.

================================================================================
 EXPERIMENTAL RESEARCH SIDECAR — NOT CONNECTED TO PRODUCTION PICK GENERATION
================================================================================

This service is standalone research infrastructure for the sports-prediction
platform documented in the repository root `CLAUDE.md`. It is NOT part of the
npm workspace (`apps/`, `packages/`, `workers/`), has no database connection,
and is not deployed anywhere production traffic reaches.

Per CLAUDE.md's non-negotiable rules — "No fake data — all picks sourced from
real API data" and "No fabricated stats — content is data-backed only" — and
the Prediction Engine Rules section — "Structured odds/line data is source of
truth" (the Claude/AI layer is explicitly "content generation only — not
source of truth") — every model exposed here is UNTRAINED research
scaffolding:

  - No model in `app/models/` has been trained on real historical sports
    data. Weights are either randomly initialized (torch modules) or start
    at an explicit neutral zero (`LinearRewardModel` in `app/models/irl.py`).
  - Every endpoint below therefore returns output that fails safe to a
    neutral/uninformative signal (e.g. `simulate_game` returns exactly 0.5
    for an untrained/zero-weight reward model) rather than confident-looking
    noise. None of it should be interpreted as a real prediction.
  - Before ANY of this can influence a real pick, it needs: (1) real
    training data, (2) a real backtest against historical outcomes using the
    calibration tooling already in `packages/prediction-engine`, and (3) an
    explicit promotion-gate decision — mirroring how this repo already gates
    its other independent estimators into `independentFairValues` "ONLY
    after calibration proves it" (see `packages/prediction-engine/src/index.ts`).
    See this repo's README.md "Integration path to production" section for
    the full checklist.

Disabled by default on the TypeScript side: the sibling module
`packages/prediction-engine/src/remote-model-client.ts` is the only code in
the main app that is even aware this service could exist, and every one of
its built-in remote-model configs ships with `enabled: false`. Nothing calls
out to this service (on localhost or anywhere else) unless an operator
explicitly opts a given sidecar in via its `REMOTE_MODEL_<NAME>_ENABLED`
environment variable — which, as of this writing, no deployment does.

Run locally: `uvicorn app.main:app --reload` (see README.md for full setup).
================================================================================
"""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.models.etkf import ETKF
from app.models.irl import LinearRewardModel, simulate_game

# NOTE: app.models.tda (ripser + persim) and the torch-backed modules
# (app.models.free_energy_coder, app.models.mps_layer) are deliberately
# imported lazily, inside their respective route handlers below, rather
# than at module scope. ripser/persim/torch are heavy C-extension/binary
# dependencies that can fail to install in constrained environments; a
# missing one of them should only break its own endpoint, not prevent this
# whole app (including GET /health) from booting at all.

SERVICE_STATUS = "experimental-research-sidecar-not-in-production"

app = FastAPI(
    title="gse-ml-service",
    description=(
        "Experimental research sidecar for the sports-prediction platform. "
        "NOT connected to production pick generation. See README.md."
    ),
    version="0.1.0",
)


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------


class TDARequest(BaseModel):
    """One sequence of 2-D point-cloud frames (e.g. tracked positions per tick)."""

    frames: list[list[tuple[float, float]]] = Field(
        default_factory=list,
        description="A list of frames; each frame is a list of (x, y) points.",
    )


class TDAResponse(BaseModel):
    features: list[float]
    feature_length: int
    status: str = SERVICE_STATUS


class IRLRequest(BaseModel):
    """Numeric feature vectors for home/away — never bare team-name strings
    (this standalone service has no team database to resolve those against).
    """

    home_features: list[float]
    away_features: list[float]
    weights: list[float] | None = Field(
        default=None,
        description=(
            "Optional pre-trained reward-model weight vector, same length as "
            "home_features/away_features. Omit to use the neutral all-zero "
            "(untrained) model, which always yields probability 0.5."
        ),
    )


class IRLResponse(BaseModel):
    probability: float
    trained: bool
    status: str = SERVICE_STATUS


class ETKFUpdateRequest(BaseModel):
    y: float
    obs_operator: list[float]


class ETKFRequest(BaseModel):
    n_teams: int
    state_dim: int
    ensemble_size: int = 50
    seed: int | None = None
    updates: list[ETKFUpdateRequest] = Field(
        default_factory=list,
        description="Sequence of observations to assimilate, in order, before predicting.",
    )
    home_idx: int
    away_idx: int


class ETKFResponse(BaseModel):
    probability: float
    updates_applied: int
    status: str = SERVICE_STATUS


class FreeEnergyRequest(BaseModel):
    x: list[list[float]] = Field(description="Batch of input rows, each of length x_dim.")
    z1_dim: int = 4
    z2_dim: int = 2
    hidden_dim: int = 64
    seed: int | None = None


class FreeEnergyResponse(BaseModel):
    loss: float
    z1: list[list[float]]
    z2: list[list[float]]
    status: str = SERVICE_STATUS


class MPSRequest(BaseModel):
    x: list[list[float]] = Field(description="Batch of input rows, each of length in_features.")
    out_features: int
    bond_dim: int = 4
    seed: int | None = None


class MPSResponse(BaseModel):
    logits: list[list[float]]
    status: str = SERVICE_STATUS


# ---------------------------------------------------------------------------
# Health / status
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> dict:
    return {
        "service": "gse-ml-service",
        "status": SERVICE_STATUS,
        "message": (
            "Experimental research sidecar. Not connected to production pick "
            "generation. See README.md for the integration path to production."
        ),
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": SERVICE_STATUS,
        "healthy": True,
        "models": ["tda", "irl", "etkf", "free_energy", "mps"],
    }


# ---------------------------------------------------------------------------
# /predict/tda
# ---------------------------------------------------------------------------


@app.post("/predict/tda", response_model=TDAResponse)
def predict_tda(request: TDARequest) -> TDAResponse:
    from app.models.tda import TDA_FEATURE_LENGTH, compute_tda_features

    features = compute_tda_features(request.frames)
    return TDAResponse(features=features.tolist(), feature_length=TDA_FEATURE_LENGTH)


# ---------------------------------------------------------------------------
# /predict/irl
# ---------------------------------------------------------------------------


@app.post("/predict/irl", response_model=IRLResponse)
def predict_irl(request: IRLRequest) -> IRLResponse:
    n_features = len(request.home_features)
    if n_features == 0 or len(request.away_features) != n_features:
        raise HTTPException(
            status_code=422,
            detail="home_features and away_features must be equal-length, non-empty vectors",
        )

    model = LinearRewardModel(n_features=n_features)
    trained = False
    if request.weights is not None:
        if len(request.weights) != n_features:
            raise HTTPException(
                status_code=422,
                detail="weights must have the same length as home_features/away_features",
            )
        model.weights = np.asarray(request.weights, dtype=float)
        trained = bool(np.any(model.weights != 0.0))

    try:
        probability = simulate_game(model, request.home_features, request.away_features)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return IRLResponse(probability=probability, trained=trained)


# ---------------------------------------------------------------------------
# /predict/etkf
# ---------------------------------------------------------------------------


@app.post("/predict/etkf", response_model=ETKFResponse)
def predict_etkf(request: ETKFRequest) -> ETKFResponse:
    try:
        filt = ETKF(
            n_teams=request.n_teams,
            state_dim=request.state_dim,
            ensemble_size=request.ensemble_size,
            seed=request.seed,
        )
        for update in request.updates:
            filt.update(update.y, np.asarray(update.obs_operator, dtype=float))
        probability = filt.predict(request.home_idx, request.away_idx)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ETKFResponse(probability=probability, updates_applied=len(request.updates))


# ---------------------------------------------------------------------------
# /predict/free-energy
# ---------------------------------------------------------------------------


@app.post("/predict/free-energy", response_model=FreeEnergyResponse)
def predict_free_energy(request: FreeEnergyRequest) -> FreeEnergyResponse:
    # Imported lazily so a torch-less environment can still boot the app and
    # serve the non-torch endpoints; see README.md's install notes.
    import torch

    from app.models.free_energy_coder import FreeEnergyCoder

    if not request.x or not request.x[0]:
        raise HTTPException(status_code=422, detail="x must be a non-empty batch of non-empty rows")

    x_dim = len(request.x[0])
    if any(len(row) != x_dim for row in request.x):
        raise HTTPException(status_code=422, detail="all rows in x must have the same length")

    if request.seed is not None:
        torch.manual_seed(request.seed)

    try:
        coder = FreeEnergyCoder(
            x_dim=x_dim,
            z1_dim=request.z1_dim,
            z2_dim=request.z2_dim,
            hidden_dim=request.hidden_dim,
        )
        x_tensor = torch.tensor(request.x, dtype=torch.float32)
        loss, z1, z2 = coder(x_tensor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return FreeEnergyResponse(
        loss=float(loss.item()),
        z1=z1.detach().tolist(),
        z2=z2.detach().tolist(),
    )


# ---------------------------------------------------------------------------
# /predict/mps
# ---------------------------------------------------------------------------


@app.post("/predict/mps", response_model=MPSResponse)
def predict_mps(request: MPSRequest) -> MPSResponse:
    import torch

    from app.models.mps_layer import MPSLinear

    if not request.x or not request.x[0]:
        raise HTTPException(status_code=422, detail="x must be a non-empty batch of non-empty rows")

    in_features = len(request.x[0])
    if any(len(row) != in_features for row in request.x):
        raise HTTPException(status_code=422, detail="all rows in x must have the same length")

    if request.seed is not None:
        torch.manual_seed(request.seed)

    try:
        layer = MPSLinear(
            in_features=in_features, out_features=request.out_features, bond_dim=request.bond_dim
        )
        x_tensor = torch.tensor(request.x, dtype=torch.float32)
        logits = layer(x_tensor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return MPSResponse(logits=logits.detach().tolist())
