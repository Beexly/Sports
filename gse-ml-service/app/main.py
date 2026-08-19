"""HTTP surface for the gse-ml-service numerical modules.

What this service IS
--------------------
A thin, stateless FastAPI wrapper around the five modules in ``app/models/``. It owns
no state between requests: every request carries everything the underlying module
needs, and nothing is cached, persisted, or learned. Two identical requests produce
identical responses (every stochastic path is seeded from a request field).

What this service IS NOT
------------------------
It is **not** five predictors. Only one endpoint here returns a ``probability``:

    POST /predict/etkf   -> {"probability": <float in (0, 1)>, ...}

Every other endpoint deliberately omits a numeric ``probability`` field, and that
omission is load-bearing. The intended caller,
``packages/prediction-engine/src/ensemble/remote-model-client.ts``, accepts a remote
model response **only** when the body has a finite ``probability`` in ``[0, 1]``;
anything else is classified ``malformed_response`` and lands in
``getRemoteProbabilities().failed`` instead of ``succeeded``. So an endpoint with no
usable probability is automatically excluded from consensus rather than averaged in as
noise. That is the mechanism protecting the ensemble from this service's unfinished
parts — do not "fix" it by adding a 0.5.

Endpoint map (see README.md for the full request/response contracts):

===================== ============================ ==========================
Endpoint              Underlying module            Returns a probability?
===================== ============================ ==========================
GET  /health          --                           n/a
POST /predict/tda     app.models.tda               NO -- feature vector
POST /predict/etkf    app.models.etkf              YES -- see calibration note
POST /predict/free-energy app.models.free_energy_coder  NO -- untrained
POST /predict/mps     app.models.mps_layer         NO -- a layer, not a model
POST /predict/irl     app.models.irl               NO -- unimplemented stub
===================== ============================ ==========================

Error contract
--------------
Bad input is answered with a 4xx and a readable ``detail``, never a 500 traceback:

* Structural problems (wrong JSON shape, wrong types, unknown fields, sizes over the
  caps below) are rejected by the pydantic request models -> **422**.
* Semantic problems the models raise as ``ValueError`` (unknown team, ragged matrix,
  non-finite coordinate, a persistence-image spec that does not tile) are caught and
  re-raised as **422** with the module's own message.
* A model module that failed to import (a missing optional dependency, e.g. ``ripser``
  or ``torch``) makes its endpoint return **503**; ``GET /health`` reports which. The
  service still starts and the healthy endpoints still serve.
"""

from __future__ import annotations

import math
import sys
import threading
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

# The package tree is deliberately ``__init__.py``-free (see ../conftest.py), so
# ``app.models.*`` only resolves when the service root is on sys.path. uvicorn inserts
# the CWD, which covers ``uvicorn app.main:app`` from the service root (and from /app in
# the container), but doing it here as well makes the import work from any CWD.
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel, ConfigDict, Field, field_validator  # noqa: E402

# ---------------------------------------------------------------------------
# Optional model imports
#
# Each module is imported independently so one broken/absent dependency degrades a
# single endpoint instead of taking the whole service down. The failure is recorded and
# surfaced by /health rather than swallowed.
# ---------------------------------------------------------------------------

_IMPORT_ERRORS: Dict[str, str] = {}

try:
    from app.models import tda as tda_module
except Exception as exc:  # pragma: no cover - exercised only with a broken install
    tda_module = None  # type: ignore[assignment]
    _IMPORT_ERRORS["tda"] = f"{type(exc).__name__}: {exc}"

try:
    from app.models import etkf as etkf_module
except Exception as exc:  # pragma: no cover
    etkf_module = None  # type: ignore[assignment]
    _IMPORT_ERRORS["etkf"] = f"{type(exc).__name__}: {exc}"

try:
    from app.models import free_energy_coder as free_energy_module
except Exception as exc:  # pragma: no cover
    free_energy_module = None  # type: ignore[assignment]
    _IMPORT_ERRORS["free_energy"] = f"{type(exc).__name__}: {exc}"

try:
    from app.models import mps_layer as mps_module
except Exception as exc:  # pragma: no cover
    mps_module = None  # type: ignore[assignment]
    _IMPORT_ERRORS["mps"] = f"{type(exc).__name__}: {exc}"

try:
    from app.models import irl as irl_module
except Exception as exc:  # pragma: no cover
    irl_module = None  # type: ignore[assignment]
    _IMPORT_ERRORS["irl"] = f"{type(exc).__name__}: {exc}"

try:  # torch is needed directly for seeding and tensor construction
    import torch
except Exception as exc:  # pragma: no cover
    torch = None  # type: ignore[assignment]
    _IMPORT_ERRORS.setdefault("free_energy", f"torch unavailable: {exc}")
    _IMPORT_ERRORS.setdefault("mps", f"torch unavailable: {exc}")

SERVICE_NAME = "gse-ml-service"
SERVICE_VERSION = "0.1.0"

# torch's default RNG is process-global, and FastAPI runs these ``def`` (non-async)
# endpoints in a threadpool — so two concurrent seeded requests would otherwise
# interleave their draws and neither would be reproducible. Holding this lock across
# seed + build + forward makes "same request in, same response out" true under
# concurrency; ``torch.random.fork_rng()`` additionally restores the process RNG
# afterwards so a request cannot perturb any other torch user in the process.
_TORCH_RNG_LOCK = threading.Lock()

# ``warnings.catch_warnings`` is documented as NOT thread-safe: entering it swaps the
# process-global ``warnings.showwarning`` and filter list. These ``def`` endpoints run in
# FastAPI's threadpool, so two concurrent /predict/tda calls used to cross-wire their
# capture buffers — a unit-scale request could be handed another request's
# TDATruncationWarning ("your features are saturated") while the genuinely saturated
# request got ``truncation_warning: null``, i.e. a false all-clear on a useless vector.
# Measured before this lock existed: 22/72 false alarms and 51/72 missed warnings under
# 12 concurrent clients. Serialising the capture region is the same trade already made
# for torch's global RNG above.
_WARNINGS_LOCK = threading.Lock()

# ---------------------------------------------------------------------------
# Request-size caps
#
# These exist so a single request cannot pin the CPU: persistent homology is
# super-linear in points per frame, and every torch endpoint builds its network from
# request fields. Exceeding a cap is a 422, not a 500.
# ---------------------------------------------------------------------------

MAX_FRAMES = 512
MAX_POINTS_PER_FRAME = 128
MAX_TEAMS = 512
MAX_OBSERVATIONS = 4096
MAX_ENSEMBLE_SIZE = 4096
MAX_BATCH = 256
MAX_FEATURES = 4096
MAX_HIDDEN_DIM = 1024
MAX_LATENT_DIM = 512
MAX_CORES = 8
MAX_RANK = 64

# Cap on the persistence-image grid a request may ask for, per homology degree. Without
# it a ~200-byte body — spec {birth_range: [0, 100], pers_range: [0, 100], pixel_size:
# 0.001} — asks for a 100000 x 100000 pixel image, i.e. two 80 GB float64 arrays, and the
# worker dies with a MemoryError (a 500, or an OOM kill) instead of answering. 1e6 pixels
# per degree is ~8 MB per image and far above any sane spec: the default 10x10 grid is
# 100. Exceeding it is a 422 like every other cap here.
MAX_IMAGE_PIXELS = 1_000_000

Point = Tuple[float, float]


# ---------------------------------------------------------------------------
# Model cards — the honest, static description of what each module is.
#
# Served by /health so an operator can see, without reading this file, which
# endpoints are predictors and which are not.
# ---------------------------------------------------------------------------

MODEL_CARDS: Dict[str, Dict[str, Any]] = {
    "tda": {
        "endpoint": "/predict/tda",
        "kind": "feature_extractor",
        "returns_probability": False,
        "usable_as_predictor": False,
        "signal": "real",
        "summary": (
            "Persistent-homology (H0/H1) persistence-image features over player-position "
            "frames. Real, deterministic signal -- but a feature vector, not a "
            "prediction. Feed it to a downstream model; it has no probability to give."
        ),
    },
    "etkf": {
        "endpoint": "/predict/etkf",
        "kind": "filter",
        "returns_probability": True,
        "usable_as_predictor": True,
        "signal": "real",
        "summary": (
            "Ensemble transform Kalman filter over latent team strength. The only "
            "endpoint here that returns a probability. The filter maths are exact; the "
            "logit link is NOT calibrated -- logistic_scale and home_advantage are "
            "request inputs you must fit against settled results before trusting the "
            "number."
        ),
    },
    "free_energy": {
        "endpoint": "/predict/free-energy",
        "kind": "unsupervised_objective",
        "returns_probability": False,
        "usable_as_predictor": False,
        "signal": "none_until_trained",
        "summary": (
            "Hierarchical predictive-coding VAE. Weights are randomly initialised per "
            "request from the supplied seed -- there are no trained weights in this "
            "repository. Returns the free-energy terms and latents only. An untrained "
            "instance emits noise; nothing here is a prediction."
        ),
    },
    "mps": {
        "endpoint": "/predict/mps",
        "kind": "layer",
        "returns_probability": False,
        "usable_as_predictor": False,
        "signal": "none_until_trained",
        "summary": (
            "Tensor-train (MPS/MPO) linear layer. A parameter-efficient nn.Linear "
            "replacement, not a model: with random weights its outputs are a random "
            "projection. Useful for compression accounting and shape checks."
        ),
    },
    "irl": {
        "endpoint": "/predict/irl",
        "kind": "stub",
        "returns_probability": False,
        "usable_as_predictor": False,
        "signal": "none",
        "summary": (
            "MaxEnt IRL is NOT IMPLEMENTED -- it needs play-by-play trajectories this "
            "project does not ingest. The endpoint answers 200 with probability=null so "
            "remote-model-client rejects it as malformed and drops it from consensus."
        ),
    },
}


def _module_for(name: str) -> Any:
    return {
        "tda": tda_module,
        "etkf": etkf_module,
        "free_energy": free_energy_module,
        "mps": mps_module,
        "irl": irl_module,
    }[name]


def _require(name: str) -> Any:
    """Return the model module, or raise 503 if it failed to import."""
    module = _module_for(name)
    if module is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"model '{name}' is unavailable in this deployment: "
                f"{_IMPORT_ERRORS.get(name, 'import failed')}"
            ),
        )
    return module


def _bad_request(exc: Exception) -> HTTPException:
    """Turn a model-raised ValueError into a 422 carrying the module's own message."""
    return HTTPException(status_code=422, detail=str(exc))


def _finite_matrix(rows: Sequence[Sequence[float]], field: str) -> Tuple[int, int]:
    """Validate a non-empty rectangular matrix of finite floats; return ``(n_rows, n_cols)``.

    Raises ``ValueError`` (mapped to 422 by the caller) on empty, ragged, or non-finite
    input. Non-finite values are rejected here rather than being allowed to reach torch,
    where they would silently turn every downstream number into NaN.
    """
    if not rows:
        raise ValueError(f"{field} must contain at least one row")
    width = len(rows[0])
    if width == 0:
        raise ValueError(f"{field} rows must be non-empty")
    for i, row in enumerate(rows):
        if len(row) != width:
            raise ValueError(
                f"{field} is ragged: row 0 has {width} columns but row {i} has {len(row)}"
            )
        for j, value in enumerate(row):
            if not math.isfinite(value):
                raise ValueError(f"{field}[{i}][{j}] must be finite, got {value!r}")
    return len(rows), width


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class ModelHealth(BaseModel):
    """Per-model health entry. ``importable`` is liveness; the rest is honesty."""

    importable: bool
    endpoint: str
    kind: str
    returns_probability: bool
    usable_as_predictor: bool
    signal: str
    summary: str
    import_error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = Field(description="'ok' when every model imported, else 'degraded'")
    service: str
    version: str
    python: str
    models: Dict[str, ModelHealth]
    consensus_eligible: List[str] = Field(
        description=(
            "Models whose response carries a numeric probability, i.e. the only ones "
            "remote-model-client can admit to consensus."
        )
    )


# ---------------------------------------------------------------------------
# TDA
# ---------------------------------------------------------------------------


class PersistenceImageSpecRequest(BaseModel):
    """Optional override of the persistence-image geometry.

    Defaults mirror ``app.models.tda.PersistenceImageSpec``'s own defaults; the test
    suite asserts they stay in sync so this cannot drift silently.
    """

    model_config = ConfigDict(extra="forbid")

    birth_range: Tuple[float, float] = (0.0, 2.0)
    pers_range: Tuple[float, float] = (0.0, 2.0)
    pixel_size: float = 0.2
    sigma: float = 0.2
    weight_cap: Optional[float] = None


class TdaRequest(BaseModel):
    """Player-position frames to vectorise.

    ``frames[i]`` is one time-slice: a list of ``(x, y)`` positions. Frames with fewer
    than ``tda.MIN_POINTS_PER_FRAME`` points are skipped by the module (and counted in
    ``frames_skipped``), not rejected.

    Coordinates are expected on a roughly unit scale (cloud diameter ~2) unless ``spec``
    says otherwise -- raw court/field coordinates saturate the image window and the
    response's ``truncation_warning`` will say so.
    """

    model_config = ConfigDict(extra="forbid")

    frames: List[List[Point]] = Field(..., max_length=MAX_FRAMES)
    spec: Optional[PersistenceImageSpecRequest] = None
    include_features: bool = Field(
        default=True,
        description="Set false to get only the metadata/diagnostics, not the vector.",
    )

    @field_validator("frames")
    @classmethod
    def _cap_points(cls, frames: List[List[Point]]) -> List[List[Point]]:
        for i, frame in enumerate(frames):
            if len(frame) > MAX_POINTS_PER_FRAME:
                raise ValueError(
                    f"frame {i} has {len(frame)} points, cap is {MAX_POINTS_PER_FRAME}"
                )
        return frames


class TdaResponse(BaseModel):
    """Persistence-image features. Note there is no ``probability`` field, by design."""

    model: str = "tda"
    available: bool = True
    kind: str = "feature_extractor"
    feature_length: int
    frames_submitted: int
    frames_used: int
    frames_skipped: int
    h0_slice: Tuple[int, int] = Field(description="[start, stop) of the H0 block")
    h1_slice: Tuple[int, int] = Field(description="[start, stop) of the H1 block")
    features: Optional[List[float]]
    truncation_warning: Optional[str] = Field(
        default=None,
        description=(
            "Set when most of the persistence diagram fell outside the image window, "
            "i.e. the coordinate scale does not match the spec. The vector is then "
            "saturated and largely uninformative."
        ),
    )
    note: str


# ---------------------------------------------------------------------------
# ETKF
# ---------------------------------------------------------------------------


class EtkfObservation(BaseModel):
    """One settled result to assimilate: an observed home-minus-away latent margin."""

    model_config = ConfigDict(extra="forbid")

    home_team: str
    away_team: str
    margin: float = Field(
        description="Observed home-minus-away margin in latent units (finite)."
    )
    obs_var: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Per-observation error variance; falls back to the request's obs_var.",
    )

    @field_validator("margin")
    @classmethod
    def _finite_margin(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError(f"margin must be finite, got {value!r}")
        return value


class EtkfRequest(BaseModel):
    """A full assimilation + prediction in one stateless call.

    The service keeps no filter between requests, so the caller supplies the whole
    history every time: ``teams`` is the roster, ``observations`` are assimilated in
    order, and the probability is read off the posterior for ``home_team`` vs
    ``away_team``.
    """

    model_config = ConfigDict(extra="forbid")

    teams: List[str] = Field(..., min_length=2, max_length=MAX_TEAMS)
    home_team: str
    away_team: str
    observations: List[EtkfObservation] = Field(
        default_factory=list, max_length=MAX_OBSERVATIONS
    )
    state_dim: int = Field(default=1, ge=1, le=16)
    ensemble_size: int = Field(default=50, ge=2, le=MAX_ENSEMBLE_SIZE)
    seed: int = Field(default=0, ge=0, le=2**32 - 1)
    initial_spread: float = Field(default=1.0, ge=0.0)
    obs_var: float = Field(default=1.0, ge=0.0)
    logistic_scale: float = Field(
        default=1.0, gt=0.0, description="Latent units per logit. NOT calibrated here."
    )
    home_advantage: float = Field(
        default=0.0, description="Latent-unit home offset. NOT calibrated here."
    )
    inflation: Optional[float] = Field(
        default=None,
        ge=0.0,
        description=(
            "If set, ensemble perturbations are multiplicatively inflated by this factor "
            "after each assimilation. There is no dynamics model, so without inflation "
            "the spread only ever shrinks across a long observation history."
        ),
    )

    @field_validator("teams")
    @classmethod
    def _unique_teams(cls, teams: List[str]) -> List[str]:
        seen = set()
        for team in teams:
            if team in seen:
                raise ValueError(f"duplicate team in roster: {team!r}")
            seen.add(team)
        return teams


class EtkfResponse(BaseModel):
    """The one response in this service that carries a consensus-eligible probability."""

    model: str = "etkf"
    available: bool = True
    probability: float = Field(
        ge=0.0, le=1.0, description="P(home_team beats away_team), strictly in (0, 1)."
    )
    home_team: str
    away_team: str
    latent_margin: float = Field(
        description="Posterior mean of strength(home) - strength(away), plus home_advantage."
    )
    margin_spread: float = Field(
        description="Ensemble std of the latent margin; larger pulls probability to 0.5."
    )
    team_strengths: Dict[str, float]
    team_strength_spreads: Dict[str, float]
    observations_assimilated: int
    calibration: str


# ---------------------------------------------------------------------------
# Free energy
# ---------------------------------------------------------------------------


class FreeEnergyRequest(BaseModel):
    """Observations to push through a *freshly initialised* predictive coder.

    ``seed`` fully determines the weights, so the response is reproducible -- but it is
    reproducible noise: there are no trained weights in this repository.
    """

    model_config = ConfigDict(extra="forbid")

    observations: List[List[float]] = Field(..., min_length=1, max_length=MAX_BATCH)
    hidden_dim: int = Field(default=64, ge=1, le=MAX_HIDDEN_DIM)
    z1_dim: int = Field(default=16, ge=1, le=MAX_LATENT_DIM)
    z2_dim: int = Field(default=8, ge=1, le=MAX_LATENT_DIM)
    seed: int = Field(default=0, ge=0, le=2**32 - 1)
    sample: bool = Field(
        default=False,
        description=(
            "True draws latents with the reparameterisation trick; False (default here) "
            "uses posterior means, which keeps the response deterministic given seed."
        ),
    )
    include_latents: bool = True


class FreeEnergyResponse(BaseModel):
    """Free-energy terms and latents. Deliberately no ``probability`` -- see the docstring."""

    model: str = "free_energy"
    available: bool = True
    trained: bool = False
    kind: str = "unsupervised_objective"
    loss: float = Field(description="Variational free energy (negative ELBO), nats. May be < 0.")
    reconstruction: float
    kl_z1: float
    kl_z2: float
    batch: int
    input_dim: int
    z1: Optional[List[List[float]]]
    z2: Optional[List[List[float]]]
    seed: int
    note: str


# ---------------------------------------------------------------------------
# MPS / tensor-train layer
# ---------------------------------------------------------------------------


class MpsRequest(BaseModel):
    """Inputs to push through a freshly initialised tensor-train linear layer.

    ``in_features`` is inferred from the width of ``inputs``.
    """

    model_config = ConfigDict(extra="forbid")

    inputs: List[List[float]] = Field(..., min_length=1, max_length=MAX_BATCH)
    out_features: int = Field(..., ge=1, le=MAX_FEATURES)
    num_cores: int = Field(default=3, ge=1, le=MAX_CORES)
    max_rank: int = Field(default=4, ge=1, le=MAX_RANK)
    bias: bool = True
    seed: int = Field(default=0, ge=0, le=2**32 - 1)
    in_factors: Optional[List[int]] = Field(default=None, max_length=MAX_CORES)
    out_factors: Optional[List[int]] = Field(default=None, max_length=MAX_CORES)
    include_outputs: bool = True


class MpsResponse(BaseModel):
    """Layer outputs plus compression accounting. No ``probability`` -- this is a layer."""

    model: str = "mps"
    available: bool = True
    trained: bool = False
    kind: str = "layer"
    in_features: int
    out_features: int
    num_cores: int
    max_rank: int
    in_factors: List[int]
    out_factors: List[int]
    ranks: List[int]
    num_core_parameters: int
    dense_equivalent_parameters: int
    compression_ratio: float = Field(
        description="Dense weights / TT core parameters. < 1 means the TT form is BIGGER."
    )
    outputs: Optional[List[List[float]]]
    seed: int
    note: str


# ---------------------------------------------------------------------------
# IRL (stub)
# ---------------------------------------------------------------------------


class IrlRequest(BaseModel):
    """Loose game context.

    ``extra="allow"`` and the camelCase aliases exist so the TypeScript client's
    ``GameContext`` body (``{gameId, sport, homeTeam, awayTeam, ...}``) posts cleanly and
    gets the intended 200-with-null-probability rather than a 422 -- a 422 would be
    recorded as ``http_error``, which reads like an outage instead of "this model does
    not exist yet".
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    game_id: Optional[str] = Field(default=None, alias="gameId")
    home_team: Optional[str] = Field(default=None, alias="homeTeam")
    away_team: Optional[str] = Field(default=None, alias="awayTeam")
    num_rollouts: int = Field(default=1000, ge=1, le=10**7, alias="numRollouts")


class IrlResponse(BaseModel):
    """Exactly the shape ``app.models.irl.simulate_game`` returns.

    ``probability`` is annotated ``None`` -- not ``Optional[float]`` -- ON PURPOSE. This
    endpoint must never be able to emit a number: remote-model-client only admits a
    response with a finite numeric ``probability``, so ``null`` is what keeps this
    unimplemented model out of consensus. Typing the field as NoneType makes any future
    attempt to return a float fail loudly here instead of quietly contaminating the
    ensemble average. See the comment in ``predict_irl`` below.
    """

    available: bool
    model: str
    probability: None = None
    reason: str
    required_data: List[str]


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title=SERVICE_NAME,
    version=SERVICE_VERSION,
    description=(
        "Numerical model sidecar for the sports prediction platform. Only /predict/etkf "
        "returns a probability; every other endpoint omits one deliberately so the "
        "TypeScript ensemble client excludes it from consensus."
    ),
)


@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health() -> HealthResponse:
    """Liveness plus an honest inventory of what this deployment can actually do.

    ``status`` is ``"ok"`` only when every model module imported. A module that failed
    to import (e.g. ``ripser`` missing from the image) leaves the service up and
    ``"degraded"``, with that model's ``import_error`` filled in and its endpoint
    answering 503.

    ``consensus_eligible`` lists the models whose responses carry a numeric
    ``probability``. It is short on purpose.
    """
    models: Dict[str, ModelHealth] = {}
    for name, card in MODEL_CARDS.items():
        importable = _module_for(name) is not None
        models[name] = ModelHealth(
            importable=importable,
            import_error=None if importable else _IMPORT_ERRORS.get(name, "import failed"),
            **card,
        )

    all_up = all(entry.importable for entry in models.values())
    return HealthResponse(
        status="ok" if all_up else "degraded",
        service=SERVICE_NAME,
        version=SERVICE_VERSION,
        python=sys.version.split()[0],
        models=models,
        consensus_eligible=[
            name
            for name, card in MODEL_CARDS.items()
            if card["returns_probability"] and models[name].importable
        ],
    )


@app.post("/predict/tda", response_model=TdaResponse, tags=["models"])
def predict_tda(request: TdaRequest) -> TdaResponse:
    """Vectorise player-position frames into persistence-image (H0 + H1) features.

    This is a **feature extractor, not a predictor**, and the response carries no
    ``probability`` field for exactly that reason: there is no probability to give, and
    emitting a placeholder would let a real-but-unrelated number into consensus. Consume
    ``features`` in a downstream model instead.

    The signal is real: a ring of players (a defensive shell) produces a large, long-lived
    H1 class that a random blob of the same size and scale does not.

    Returns 422 on a ragged/non-finite frame, a persistence-image spec whose ranges do
    not tile into whole pixels, or a spec whose grid exceeds ``MAX_IMAGE_PIXELS``.
    """
    module = _require("tda")

    if request.spec is None:
        spec = module.DEFAULT_SPEC
    else:
        try:
            spec = module.PersistenceImageSpec(**request.spec.model_dump())
        except ValueError as exc:
            raise _bad_request(exc) from exc
        # The module deliberately puts no upper bound on the grid; the HTTP surface must,
        # or a tiny body allocates tens of GB. See MAX_IMAGE_PIXELS.
        if spec.image_length > MAX_IMAGE_PIXELS:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"spec asks for {spec.n_birth_pixels} x {spec.n_pers_pixels} = "
                    f"{spec.image_length} pixels per homology degree, cap is "
                    f"{MAX_IMAGE_PIXELS}; widen pixel_size or narrow the ranges"
                ),
            )

    frames_used = sum(
        1 for frame in request.frames if len(frame) >= module.MIN_POINTS_PER_FRAME
    )

    # compute_tda_features warns (rather than raises) when the diagram overflows the
    # image window; capture it so the caller learns their coordinates are mis-scaled
    # instead of quietly receiving a saturated vector.
    #
    # _WARNINGS_LOCK is load-bearing, not defensive: catch_warnings mutates global state
    # and these endpoints run concurrently in a threadpool, so without it this capture
    # both invents and loses truncation warnings across requests. See its definition.
    with _WARNINGS_LOCK, warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            features = module.compute_tda_features(request.frames, spec)
        except ValueError as exc:
            raise _bad_request(exc) from exc

    truncation = next(
        (str(w.message) for w in caught if issubclass(w.category, module.TDATruncationWarning)),
        None,
    )

    h0 = spec.slice_for_dim(0)
    h1 = spec.slice_for_dim(1)
    return TdaResponse(
        feature_length=int(spec.feature_length),
        frames_submitted=len(request.frames),
        frames_used=frames_used,
        frames_skipped=len(request.frames) - frames_used,
        h0_slice=(h0.start, h0.stop),
        h1_slice=(h1.start, h1.stop),
        features=[float(v) for v in features] if request.include_features else None,
        truncation_warning=truncation,
        note=(
            "Feature vector, not a prediction: this response has no 'probability' field "
            "on purpose. All entries are finite and >= 0; an all-zero vector means every "
            f"frame had fewer than {module.MIN_POINTS_PER_FRAME} points."
        ),
    )


@app.post("/predict/etkf", response_model=EtkfResponse, tags=["models"])
def predict_etkf(request: EtkfRequest) -> EtkfResponse:
    """Assimilate observed margins and return P(home beats away).

    **This is the only endpoint that returns a probability**, and the only one
    remote-model-client can admit to consensus.

    The filter itself is exact linear algebra with no free parameters. The map from the
    posterior latent margin to a probability is a logistic link that integrates over the
    posterior (MacKay moment-matching), so a wide/barely-observed posterior is pulled
    toward 0.5 rather than reported confidently. But its scale is **not fitted here**:
    ``logistic_scale`` and ``home_advantage`` are request inputs, defaulting to the bare
    convention "one latent unit is one log-odd, no home edge". Calibrate them against
    settled results before treating the number as a win probability.

    Returns 422 for an unknown/duplicate team, a same-team matchup, a non-finite margin,
    or a filter that goes numerically non-finite during assimilation, inflation, or the
    final projection. In particular an extreme ``inflation`` or ``initial_spread`` can
    drive the ensemble out of float64 range; that is answered as a 422 naming the cause,
    never as a NaN "probability".
    """
    module = _require("etkf")

    index = {team: i for i, team in enumerate(request.teams)}
    for label, team in (("home_team", request.home_team), ("away_team", request.away_team)):
        if team not in index:
            raise HTTPException(
                status_code=422, detail=f"{label} {team!r} is not in the supplied roster"
            )
    if request.home_team == request.away_team:
        raise HTTPException(
            status_code=422,
            detail=f"home_team and away_team must differ, both were {request.home_team!r}",
        )
    for i, obs in enumerate(request.observations):
        for label, team in (("home_team", obs.home_team), ("away_team", obs.away_team)):
            if team not in index:
                raise HTTPException(
                    status_code=422,
                    detail=f"observations[{i}].{label} {team!r} is not in the supplied roster",
                )
        if obs.home_team == obs.away_team:
            raise HTTPException(
                status_code=422,
                detail=f"observations[{i}] has the same team on both sides: {obs.home_team!r}",
            )

    try:
        filt = module.ETKF(
            n_teams=len(request.teams),
            state_dim=request.state_dim,
            ensemble_size=request.ensemble_size,
            seed=request.seed,
            initial_spread=request.initial_spread,
            obs_var=request.obs_var,
            logistic_scale=request.logistic_scale,
            home_advantage=request.home_advantage,
        )

        for obs in request.observations:
            operator = filt.matchup_operator(index[obs.home_team], index[obs.away_team])
            filt.update([obs.margin], operator, R=obs.obs_var)
            if request.inflation is not None:
                filt.inflate(request.inflation)

        probability = filt.predict(index[request.home_team], index[request.away_team])
    except module.ETKFNumericalError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"the filter became numerically non-finite: {exc}",
        ) from exc
    except ValueError as exc:
        raise _bad_request(exc) from exc

    operator = filt.matchup_operator(index[request.home_team], index[request.away_team])
    margins = (operator @ filt.ensemble).ravel()

    return EtkfResponse(
        probability=float(probability),
        home_team=request.home_team,
        away_team=request.away_team,
        latent_margin=float(margins.mean()) + request.home_advantage,
        margin_spread=float(margins.std(ddof=1)),
        team_strengths={t: filt.team_strength(i) for t, i in index.items()},
        team_strength_spreads={t: filt.team_strength_spread(i) for t, i in index.items()},
        observations_assimilated=len(request.observations),
        calibration=(
            "UNCALIBRATED: logistic_scale and home_advantage are request inputs, not "
            "fitted values. Fit them against settled results before using this "
            "probability as a win probability."
        ),
    )


@app.post("/predict/free-energy", response_model=FreeEnergyResponse, tags=["models"])
def predict_free_energy(request: FreeEnergyRequest) -> FreeEnergyResponse:
    """Return the variational free energy and latent codes for a batch of observations.

    **NOT A PROBABILITY, and this response has no ``probability`` field.** The model is
    a hierarchical VAE that ships **no trained weights** -- this repository contains no
    training data and no checkpoint, so the network is randomly initialised from
    ``seed`` on every request. Its outputs are a deterministic (given the seed) but
    otherwise arbitrary function of the input. ``loss`` is a density objective in nats
    and may be negative; that is normal, and it is not a score, a confidence, or a
    prediction. Nothing here should reach a pick.

    What it is good for today: shape/wiring checks, and a reference implementation to
    train later.

    Returns 422 on an empty, ragged, or non-finite observation matrix.
    """
    module = _require("free_energy")
    if torch is None:  # pragma: no cover - only without torch installed
        raise HTTPException(status_code=503, detail="torch is unavailable in this deployment")

    try:
        batch, input_dim = _finite_matrix(request.observations, "observations")
    except ValueError as exc:
        raise _bad_request(exc) from exc
    if input_dim > MAX_FEATURES:
        raise HTTPException(
            status_code=422,
            detail=f"observations have {input_dim} columns, cap is {MAX_FEATURES}",
        )

    try:
        with _TORCH_RNG_LOCK, torch.random.fork_rng():
            torch.manual_seed(request.seed)
            coder = module.HierarchicalPredictiveCoder(
                input_dim=input_dim,
                hidden_dim=request.hidden_dim,
                z1_dim=request.z1_dim,
                z2_dim=request.z2_dim,
            )
            x = torch.tensor(request.observations, dtype=torch.float32)
            with torch.no_grad():
                out = coder(x, sample=request.sample)
    except ValueError as exc:
        raise _bad_request(exc) from exc

    return FreeEnergyResponse(
        loss=float(out.loss),
        reconstruction=float(out.reconstruction),
        kl_z1=float(out.kl_z1),
        kl_z2=float(out.kl_z2),
        batch=batch,
        input_dim=input_dim,
        z1=out.z1.tolist() if request.include_latents else None,
        z2=out.z2.tolist() if request.include_latents else None,
        seed=request.seed,
        note=(
            "UNTRAINED: weights are randomly initialised from 'seed' on every request. "
            "loss/latents are diagnostics, not predictions -- this response has no "
            "'probability' field on purpose."
        ),
    )


@app.post("/predict/mps", response_model=MpsResponse, tags=["models"])
def predict_mps(request: MpsRequest) -> MpsResponse:
    """Apply a tensor-train (MPS/MPO) linear layer and report its compression accounting.

    **A layer is not a predictor**, so this response has no ``probability`` field. The
    layer is constructed fresh per request with random weights seeded by ``seed``; its
    ``outputs`` are a random linear projection of ``inputs``, useful for shape and
    wiring checks, not for inference.

    ``compression_ratio`` is dense weights divided by TT core parameters. It is honestly
    **below 1 at small dimensions** -- the TT form is then bigger than the dense layer it
    replaces.

    Returns 422 on a ragged/non-finite input matrix or factor lists whose length or
    product disagree with ``num_cores`` / the feature sizes.
    """
    module = _require("mps")
    if torch is None:  # pragma: no cover - only without torch installed
        raise HTTPException(status_code=503, detail="torch is unavailable in this deployment")

    try:
        _, in_features = _finite_matrix(request.inputs, "inputs")
    except ValueError as exc:
        raise _bad_request(exc) from exc
    if in_features > MAX_FEATURES:
        raise HTTPException(
            status_code=422, detail=f"inputs have {in_features} columns, cap is {MAX_FEATURES}"
        )

    try:
        with _TORCH_RNG_LOCK, torch.random.fork_rng():
            torch.manual_seed(request.seed)
            layer = module.TTLinear(
                in_features=in_features,
                out_features=request.out_features,
                num_cores=request.num_cores,
                max_rank=request.max_rank,
                bias=request.bias,
                in_factors=request.in_factors,
                out_factors=request.out_factors,
            )
            x = torch.tensor(request.inputs, dtype=torch.float32)
            with torch.no_grad():
                outputs = layer(x)
    except ValueError as exc:
        raise _bad_request(exc) from exc

    return MpsResponse(
        in_features=in_features,
        out_features=request.out_features,
        num_cores=request.num_cores,
        max_rank=request.max_rank,
        in_factors=list(layer.in_factors),
        out_factors=list(layer.out_factors),
        ranks=list(layer.ranks),
        num_core_parameters=layer.num_core_parameters(),
        dense_equivalent_parameters=layer.dense_equivalent_parameters(),
        compression_ratio=layer.compression_ratio(),
        outputs=outputs.tolist() if request.include_outputs else None,
        seed=request.seed,
        note=(
            "UNTRAINED LAYER, not a model: outputs are a random linear projection. No "
            "'probability' field on purpose. compression_ratio < 1 means the TT form "
            "costs MORE parameters than the dense layer it replaces."
        ),
    )


@app.post("/predict/irl", response_model=IrlResponse, tags=["models"])
def predict_irl(request: IrlRequest) -> IrlResponse:
    """Report that MaxEnt IRL is unavailable. Never returns a numeric probability.

    MaxEnt IRL is not implemented: it needs expert play-by-play action trajectories,
    which this project does not ingest (the data layer is odds/lines only).

    DELIBERATE DESIGN -- do not "fix" this:

    This endpoint answers **200 with ``"probability": null``** rather than a number or an
    error status. That combination is chosen so the existing TypeScript client
    (``packages/prediction-engine/src/ensemble/remote-model-client.ts``) does exactly the
    right thing with no changes: its ``extractProbability`` accepts only a finite number
    in ``[0, 1]``, so ``null`` is classified ``malformed_response`` and the endpoint
    lands in ``getRemoteProbabilities().failed`` -- **excluded from consensus** instead of
    averaged in. Returning ``0.5`` (or any float) would silently contaminate the ensemble
    with a model that does not exist. A 4xx/5xx would work too, but would read as an
    outage in dashboards rather than "this model was never built".

    The ``IrlResponse`` model types ``probability`` as NoneType so a future edit that
    tries to return a float fails here, loudly, instead of leaking into the ensemble.
    """
    module = _require("irl")
    result = module.simulate_game(
        team_a=request.home_team or "",
        team_b=request.away_team or "",
        num_rollouts=request.num_rollouts,
    )
    return IrlResponse(
        available=result["available"],
        model=result["model"],
        probability=result["probability"],
        reason=result["reason"],
        required_data=list(result["required_data"]),
    )
