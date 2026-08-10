"""End-to-end tests for the FastAPI surface in ``app/main.py``.

These exercise the real app through ``fastapi.testclient.TestClient`` — every request
goes through the actual routing, pydantic validation and model code. Nothing is mocked
except the deliberate 503 test, which blanks a module reference to simulate a missing
optional dependency.

Three things are asserted repeatedly because they are the contract that protects the
ensemble, not incidental detail:

1. Only ``/predict/etkf`` returns a numeric ``probability``.
2. ``/predict/irl`` returns 200 with a non-numeric ``probability`` so the TypeScript
   client classifies it ``malformed_response`` and drops it from consensus.
3. Bad input is a 4xx with a readable message, never a 500 traceback.

``_extract_probability`` below is a line-for-line port of ``extractProbability`` in
``packages/prediction-engine/src/ensemble/remote-model-client.ts``. Testing against a
copy of the client's own admission rule is what makes claim (1) and (2) checkable here
rather than aspirational.

All randomness is explicitly seeded (``np.random.default_rng(...)`` for inputs, a
request-body ``seed`` field for anything torch touches), so every assertion below is
reproducible.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import main
from app.main import app
from app.models import tda as tda_module

client = TestClient(app)

# Seed for every synthetic point cloud in this file. Fixed so the topology assertions
# (ring vs blob) are the same run to run.
FRAME_SEED = 20240810


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extract_probability(body: Any) -> Optional[float]:
    """Port of remote-model-client.ts ``extractProbability``.

    Returns the probability only when the body is an object carrying a finite numeric
    ``probability`` in ``[0, 1]``; ``None`` (the client's ``malformed_response``) for
    anything else. ``bool`` is excluded because it is an ``int`` subclass in Python but
    is not ``typeof value === "number"`` in JS.
    """
    if not isinstance(body, dict):
        return None
    value = body.get("probability")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value):
        return None
    if value < 0.0 or value > 1.0:
        return None
    return float(value)


def _ring(n: int = 16, radius: float = 1.0, noise: float = 0.05, seed: int = FRAME_SEED):
    """A noisy circle of ``n`` points — a shape with one long-lived H1 (loop) class."""
    rng = np.random.default_rng(seed)
    theta = np.linspace(0.0, 2.0 * np.pi, n, endpoint=False)
    points = radius * np.stack([np.cos(theta), np.sin(theta)], axis=1)
    points = points + rng.normal(0.0, noise, points.shape)
    return [[float(x), float(y)] for x, y in points]


def _blob(n: int = 16, seed: int = FRAME_SEED + 1):
    """A uniform blob over the same extent as ``_ring`` — no loop, so no H1 signal."""
    rng = np.random.default_rng(seed)
    points = rng.uniform(-1.0, 1.0, (n, 2))
    return [[float(x), float(y)] for x, y in points]


def _block(body: Dict[str, Any], key: str) -> List[float]:
    start, stop = body[key]
    return body["features"][start:stop]


ETKF_BASE: Dict[str, Any] = {
    "teams": ["A", "B", "C"],
    "home_team": "A",
    "away_team": "B",
    "ensemble_size": 64,
    "seed": 1,
}

FREE_ENERGY_BASE: Dict[str, Any] = {
    "observations": [[0.1, 0.2, 0.3, 0.4], [1.0, -1.0, 0.5, 0.0], [0.0, 0.0, 0.0, 0.0]],
    "hidden_dim": 16,
    "z1_dim": 4,
    "z2_dim": 2,
    "seed": 11,
}

MPS_BASE: Dict[str, Any] = {
    "inputs": [[0.5] * 12, [-1.0] * 12],
    "out_features": 8,
    "num_cores": 2,
    "max_rank": 3,
    "seed": 5,
}


def _happy_bodies() -> Dict[str, Tuple[str, Dict[str, Any]]]:
    """One valid request per predict endpoint, keyed by model name."""
    return {
        "tda": ("/predict/tda", {"frames": [_ring()]}),
        "etkf": ("/predict/etkf", dict(ETKF_BASE)),
        "free_energy": ("/predict/free-energy", dict(FREE_ENERGY_BASE)),
        "mps": ("/predict/mps", dict(MPS_BASE)),
        "irl": ("/predict/irl", {"gameId": "g-1", "homeTeam": "LAL", "awayTeam": "BOS"}),
    }


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


def test_health_is_ok_and_reports_every_model() -> None:
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "gse-ml-service"
    assert set(body["models"]) == {"tda", "etkf", "free_energy", "mps", "irl"}
    for name, entry in body["models"].items():
        assert entry["importable"] is True, f"{name} failed to import: {entry['import_error']}"
        assert entry["import_error"] is None
        assert entry["endpoint"].startswith("/predict/")


def test_health_marks_only_etkf_consensus_eligible() -> None:
    body = client.get("/health").json()
    assert body["consensus_eligible"] == ["etkf"]

    # The card metadata must agree with the eligibility list — the list is derived from
    # it, and both are what an operator reads to decide what to wire up.
    assert body["models"]["etkf"]["returns_probability"] is True
    for name in ("tda", "free_energy", "mps", "irl"):
        assert body["models"][name]["returns_probability"] is False
        assert body["models"][name]["usable_as_predictor"] is False


def test_health_goes_degraded_and_endpoint_503s_when_a_module_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A model that failed to import degrades one endpoint, not the whole service."""
    monkeypatch.setattr(main, "tda_module", None)
    monkeypatch.setitem(main._IMPORT_ERRORS, "tda", "ModuleNotFoundError: No module named 'ripser'")

    body = client.get("/health").json()
    assert body["status"] == "degraded"
    assert body["models"]["tda"]["importable"] is False
    assert "ripser" in body["models"]["tda"]["import_error"]
    # Everything else still serves.
    assert body["models"]["etkf"]["importable"] is True
    assert body["consensus_eligible"] == ["etkf"]

    response = client.post("/predict/tda", json={"frames": [_ring()]})
    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"]

    assert client.post("/predict/etkf", json=dict(ETKF_BASE)).status_code == 200


# ---------------------------------------------------------------------------
# /predict/tda
# ---------------------------------------------------------------------------


def test_tda_happy_path_returns_a_finite_non_negative_feature_vector() -> None:
    response = client.post("/predict/tda", json={"frames": [_ring(), _ring(seed=99)]})
    assert response.status_code == 200

    body = response.json()
    spec = tda_module.DEFAULT_SPEC
    assert body["feature_length"] == spec.feature_length
    assert len(body["features"]) == spec.feature_length
    assert body["frames_submitted"] == 2
    assert body["frames_used"] == 2
    assert body["frames_skipped"] == 0
    assert body["h0_slice"] == [0, spec.image_length]
    assert body["h1_slice"] == [spec.image_length, 2 * spec.image_length]
    assert all(math.isfinite(v) and v >= 0.0 for v in body["features"])
    assert body["truncation_warning"] is None


def test_tda_spec_defaults_match_the_module(monkeypatch: pytest.MonkeyPatch) -> None:
    """Drift guard: the request model's defaults must equal PersistenceImageSpec's own.

    They are duplicated in main.py (the request model must be constructible even if the
    tda module failed to import), so this pins them together.
    """
    request_defaults = main.PersistenceImageSpecRequest()
    module_default = tda_module.PersistenceImageSpec()
    assert tuple(request_defaults.birth_range) == module_default.birth_range
    assert tuple(request_defaults.pers_range) == module_default.pers_range
    assert request_defaults.pixel_size == module_default.pixel_size
    assert request_defaults.sigma == module_default.sigma
    assert request_defaults.weight_cap == module_default.weight_cap


def test_tda_ring_carries_far_more_h1_mass_than_a_blob() -> None:
    """The endpoint transports real topological signal, not just a well-shaped array.

    A ring of players encloses a loop; a blob of the same size and extent does not. If
    this ratio ever collapses toward 1 the vectorisation has stopped distinguishing
    shape, whatever the response schema says.
    """
    ring = client.post("/predict/tda", json={"frames": [_ring()]}).json()
    blob = client.post("/predict/tda", json={"frames": [_blob()]}).json()

    ring_h1 = sum(_block(ring, "h1_slice"))
    blob_h1 = sum(_block(blob, "h1_slice"))

    assert ring_h1 > 0.3
    assert ring_h1 > 5.0 * blob_h1


def test_tda_is_deterministic() -> None:
    payload = {"frames": [_ring(), _blob()]}
    first = client.post("/predict/tda", json=payload).json()
    second = client.post("/predict/tda", json=payload).json()
    assert first == second


def test_tda_response_has_no_probability_field() -> None:
    body = client.post("/predict/tda", json={"frames": [_ring()]}).json()
    assert "probability" not in body
    assert _extract_probability(body) is None


def test_tda_empty_input_returns_a_zero_vector_not_an_error() -> None:
    body = client.post("/predict/tda", json={"frames": []}).json()
    assert body["frames_used"] == 0
    assert len(body["features"]) == tda_module.DEFAULT_SPEC.feature_length
    assert all(v == 0.0 for v in body["features"])


def test_tda_skips_frames_below_the_minimum_point_count() -> None:
    body = client.post("/predict/tda", json={"frames": [_ring(), [[0.0, 0.0], [1.0, 1.0]]]}).json()
    assert body["frames_submitted"] == 2
    assert body["frames_used"] == 1
    assert body["frames_skipped"] == 1


def test_tda_reports_truncation_for_raw_court_coordinates() -> None:
    """Feet-scale coordinates saturate the fixed image window; the caller must be told."""
    court = [[0.0, 0.0], [47.0, 25.0], [94.0, 50.0], [20.0, 40.0]]
    body = client.post("/predict/tda", json={"frames": [court]}).json()
    assert body["truncation_warning"] is not None
    assert "saturated" in body["truncation_warning"]


def test_tda_accepts_a_custom_spec() -> None:
    body = client.post(
        "/predict/tda",
        json={"frames": [_ring(radius=40.0, noise=1.0)], "spec": {"pers_range": [0.0, 100.0],
                                                                 "birth_range": [0.0, 100.0],
                                                                 "pixel_size": 10.0,
                                                                 "sigma": 10.0}},
    ).json()
    assert body["feature_length"] == 200  # 10x10 pixels x 2 homology degrees
    assert body["truncation_warning"] is None


@pytest.mark.parametrize(
    "payload,reason",
    [
        ({"frames": [[[1.0, 2.0, 3.0]]]}, "a point is not a 2-tuple"),
        ({"frames": "not-a-list"}, "frames is not a list"),
        ({"frames": [[["x", "y"]]]}, "coordinates are not numbers"),
        ({"frames": [], "bogus": 1}, "unknown field"),
        ({}, "frames is required"),
        ({"frames": [[[0.0, 0.0]] * (main.MAX_POINTS_PER_FRAME + 1)]}, "frame over the cap"),
        ({"frames": [[[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]], "spec": {"pixel_size": 0.3}},
         "spec does not tile into whole pixels"),
        ({"frames": [[[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]]], "spec": {"sigma": 0.0}},
         "sigma must be > 0"),
    ],
)
def test_tda_malformed_body_is_422(payload: Dict[str, Any], reason: str) -> None:
    response = client.post("/predict/tda", json=payload)
    assert response.status_code == 422, f"{reason}: got {response.status_code}"
    assert response.json()["detail"]


# ---------------------------------------------------------------------------
# /predict/etkf
# ---------------------------------------------------------------------------


def test_etkf_prior_with_no_observations_is_exactly_one_half() -> None:
    body = client.post("/predict/etkf", json=dict(ETKF_BASE)).json()
    assert body["probability"] == 0.5
    assert body["observations_assimilated"] == 0


def test_etkf_assimilation_moves_the_probability_toward_the_observed_winner() -> None:
    wins = [{"home_team": "A", "away_team": "B", "margin": 3.0} for _ in range(5)]
    body = client.post("/predict/etkf", json={**ETKF_BASE, "observations": wins}).json()

    assert body["observations_assimilated"] == 5
    assert body["probability"] > 0.75
    assert body["latent_margin"] > 1.0
    assert body["team_strengths"]["A"] > body["team_strengths"]["B"]
    # An unobserved team stays near its prior while the observed pair separates.
    assert abs(body["team_strengths"]["C"]) < abs(body["team_strengths"]["A"])
    # Assimilation shrinks the spread of the observed pair.
    assert body["team_strength_spreads"]["A"] < body["team_strength_spreads"]["C"]


def test_etkf_is_antisymmetric_without_home_advantage() -> None:
    wins = [{"home_team": "A", "away_team": "B", "margin": 3.0} for _ in range(5)]
    forward = client.post("/predict/etkf", json={**ETKF_BASE, "observations": wins}).json()
    reverse = client.post(
        "/predict/etkf",
        json={**ETKF_BASE, "home_team": "B", "away_team": "A", "observations": wins},
    ).json()
    assert forward["probability"] + reverse["probability"] == pytest.approx(1.0, abs=1e-12)


def test_etkf_home_advantage_shifts_the_probability_up() -> None:
    neutral = client.post("/predict/etkf", json=dict(ETKF_BASE)).json()["probability"]
    with_edge = client.post(
        "/predict/etkf", json={**ETKF_BASE, "home_advantage": 0.5}
    ).json()["probability"]
    assert with_edge > neutral


def test_etkf_probability_is_consensus_eligible_and_strictly_inside_the_unit_interval() -> None:
    body = client.post("/predict/etkf", json=dict(ETKF_BASE)).json()
    probability = _extract_probability(body)
    assert probability is not None, "remote-model-client must admit the ETKF response"
    assert 0.0 < probability < 1.0
    # The response says out loud that the link is not fitted.
    assert "UNCALIBRATED" in body["calibration"]


def test_etkf_is_deterministic() -> None:
    payload = {
        **ETKF_BASE,
        "observations": [{"home_team": "A", "away_team": "C", "margin": 1.25}],
    }
    first = client.post("/predict/etkf", json=payload).json()
    second = client.post("/predict/etkf", json=payload).json()
    assert first == second


@pytest.mark.parametrize(
    "payload,reason",
    [
        ({"teams": ["A", "B"], "home_team": "Z", "away_team": "B"}, "home team not in roster"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "Z"}, "away team not in roster"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "A"}, "same team both sides"),
        ({"teams": ["A", "A"], "home_team": "A", "away_team": "A"}, "duplicate roster entry"),
        ({"teams": ["A"], "home_team": "A", "away_team": "A"}, "roster shorter than 2"),
        ({"teams": ["A", "B"]}, "missing home_team/away_team"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "B", "logistic_scale": 0.0},
         "logistic_scale must be > 0"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "B", "ensemble_size": 1},
         "single-member ensemble is a no-op"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "B",
          "observations": [{"home_team": "A", "away_team": "Q", "margin": 1.0}]},
         "observation references an unknown team"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "B",
          "observations": [{"home_team": "A", "away_team": "B"}]}, "observation missing margin"),
        ({"teams": ["A", "B"], "home_team": "A", "away_team": "B", "bogus": True},
         "unknown field"),
        ("not-an-object", "body is not an object"),
    ],
)
def test_etkf_malformed_body_is_422(payload: Any, reason: str) -> None:
    response = client.post("/predict/etkf", json=payload)
    assert response.status_code == 422, f"{reason}: got {response.status_code}"
    assert response.json()["detail"]


# ---------------------------------------------------------------------------
# /predict/free-energy
# ---------------------------------------------------------------------------


def test_free_energy_happy_path_returns_the_objective_terms_and_latents() -> None:
    response = client.post("/predict/free-energy", json=dict(FREE_ENERGY_BASE))
    assert response.status_code == 200

    body = response.json()
    assert body["batch"] == 3
    assert body["input_dim"] == 4
    assert body["trained"] is False
    assert len(body["z1"]) == 3 and len(body["z1"][0]) == 4
    assert len(body["z2"]) == 3 and len(body["z2"][0]) == 2
    for key in ("loss", "reconstruction", "kl_z1", "kl_z2"):
        assert math.isfinite(body[key])
    assert body["kl_z1"] >= 0.0 and body["kl_z2"] >= 0.0
    # The free energy is exactly the sum of its reported parts.
    assert body["loss"] == pytest.approx(
        body["reconstruction"] + body["kl_z1"] + body["kl_z2"], rel=1e-5, abs=1e-5
    )


def test_free_energy_never_presents_a_probability() -> None:
    """The model is untrained, so there is nothing here that may be read as a forecast."""
    body = client.post("/predict/free-energy", json=dict(FREE_ENERGY_BASE)).json()
    assert "probability" not in body
    assert _extract_probability(body) is None
    assert body["trained"] is False
    assert "UNTRAINED" in body["note"]


def test_free_energy_is_deterministic_for_a_seed_and_changes_with_it() -> None:
    first = client.post("/predict/free-energy", json=dict(FREE_ENERGY_BASE)).json()
    second = client.post("/predict/free-energy", json=dict(FREE_ENERGY_BASE)).json()
    assert first == second

    other = client.post(
        "/predict/free-energy", json={**FREE_ENERGY_BASE, "seed": FREE_ENERGY_BASE["seed"] + 1}
    ).json()
    # Different random init => different numbers. This is the honest demonstration that
    # the output is a function of the seed, i.e. noise, not of learned structure.
    assert other["loss"] != first["loss"]


def test_free_energy_sampling_flag_is_accepted() -> None:
    body = client.post("/predict/free-energy", json={**FREE_ENERGY_BASE, "sample": True}).json()
    assert math.isfinite(body["loss"])


@pytest.mark.parametrize(
    "payload,reason",
    [
        ({"observations": [[1.0, 2.0], [3.0]]}, "ragged matrix"),
        ({"observations": []}, "empty batch"),
        ({"observations": [[]]}, "empty row"),
        ({"observations": [["a", "b"]]}, "non-numeric entries"),
        ({"observations": [[1.0]], "z1_dim": 0}, "z1_dim below 1"),
        ({"observations": [[1.0]], "hidden_dim": main.MAX_HIDDEN_DIM + 1}, "hidden_dim over cap"),
        ({"observations": [[1.0]], "bogus": 1}, "unknown field"),
        ({}, "observations is required"),
        ([1, 2, 3], "body is not an object"),
    ],
)
def test_free_energy_malformed_body_is_422(payload: Any, reason: str) -> None:
    response = client.post("/predict/free-energy", json=payload)
    assert response.status_code == 422, f"{reason}: got {response.status_code}"
    assert response.json()["detail"]


# ---------------------------------------------------------------------------
# /predict/mps
# ---------------------------------------------------------------------------


def test_mps_happy_path_returns_outputs_and_consistent_compression_accounting() -> None:
    response = client.post("/predict/mps", json=dict(MPS_BASE))
    assert response.status_code == 200

    body = response.json()
    assert body["in_features"] == 12
    assert body["out_features"] == 8
    assert len(body["outputs"]) == 2
    assert all(len(row) == 8 for row in body["outputs"])
    assert all(math.isfinite(v) for row in body["outputs"] for v in row)

    assert math.prod(body["in_factors"]) == body["in_features"]
    assert math.prod(body["out_factors"]) == body["out_features"]
    assert body["ranks"][0] == 1 and body["ranks"][-1] == 1
    assert len(body["ranks"]) == body["num_cores"] + 1
    assert body["dense_equivalent_parameters"] == 12 * 8
    expected_cores = sum(
        body["ranks"][k] * body["out_factors"][k] * body["in_factors"][k] * body["ranks"][k + 1]
        for k in range(body["num_cores"])
    )
    assert body["num_core_parameters"] == expected_cores
    assert body["compression_ratio"] == pytest.approx(
        body["dense_equivalent_parameters"] / body["num_core_parameters"]
    )


def test_mps_reports_a_compression_ratio_below_one_at_small_dimensions() -> None:
    """The layer honestly costs MORE than dense when the dimensions are small."""
    body = client.post(
        "/predict/mps", json={"inputs": [[0.1] * 50], "out_features": 2, "num_cores": 3,
                              "max_rank": 4, "seed": 0}
    ).json()
    assert body["compression_ratio"] < 1.0


def test_mps_response_has_no_probability_field() -> None:
    body = client.post("/predict/mps", json=dict(MPS_BASE)).json()
    assert "probability" not in body
    assert _extract_probability(body) is None
    assert body["trained"] is False


def test_mps_is_deterministic_for_a_seed() -> None:
    first = client.post("/predict/mps", json=dict(MPS_BASE)).json()
    second = client.post("/predict/mps", json=dict(MPS_BASE)).json()
    assert first == second

    other = client.post("/predict/mps", json={**MPS_BASE, "seed": MPS_BASE["seed"] + 1}).json()
    assert other["outputs"] != first["outputs"]


@pytest.mark.parametrize(
    "payload,reason",
    [
        ({"inputs": [[1.0, 2.0], [3.0]], "out_features": 2}, "ragged matrix"),
        ({"inputs": [], "out_features": 2}, "empty batch"),
        ({"inputs": [[1.0, 2.0]]}, "out_features is required"),
        ({"inputs": [[1.0, 2.0]], "out_features": 0}, "out_features below 1"),
        ({"inputs": [[1.0] * 4], "out_features": 4, "num_cores": 2, "in_factors": [3, 3]},
         "in_factors product disagrees with in_features"),
        ({"inputs": [[1.0] * 4], "out_features": 4, "num_cores": 2, "out_factors": [4]},
         "out_factors length disagrees with num_cores"),
        ({"inputs": [[1.0, 2.0]], "out_features": 2, "max_rank": 0}, "max_rank below 1"),
        ({"inputs": [[1.0, 2.0]], "out_features": 2, "bogus": "x"}, "unknown field"),
        ("nope", "body is not an object"),
    ],
)
def test_mps_malformed_body_is_422(payload: Any, reason: str) -> None:
    response = client.post("/predict/mps", json=payload)
    assert response.status_code == 422, f"{reason}: got {response.status_code}"
    assert response.json()["detail"]


# ---------------------------------------------------------------------------
# /predict/irl — the deliberate non-answer
# ---------------------------------------------------------------------------


def test_irl_returns_200_without_a_numeric_probability() -> None:
    """THE load-bearing test for this endpoint.

    200 + non-numeric ``probability`` is what makes remote-model-client classify the
    response ``malformed_response`` and exclude this unimplemented model from consensus.
    If someone ever makes this return a float, this test fails and the ensemble is
    protected.
    """
    response = client.post(
        "/predict/irl", json={"gameId": "g-1", "homeTeam": "LAL", "awayTeam": "BOS"}
    )
    assert response.status_code == 200

    body = response.json()
    assert body["available"] is False
    assert body["model"] == "maxent_irl"
    assert "probability" in body
    assert body["probability"] is None
    assert not isinstance(body["probability"], (int, float))
    assert _extract_probability(body) is None
    assert body["reason"]
    assert len(body["required_data"]) >= 1


def test_irl_accepts_the_typescript_client_game_context_body() -> None:
    """The client posts a GameContext with camelCase keys and arbitrary extra fields.

    It must reach the 200-with-null-probability path, not a 422 — a 422 would be logged
    as ``http_error`` (an outage) rather than "this model was never built".
    """
    response = client.post(
        "/predict/irl",
        json={
            "gameId": "2026-08-10-LAL-BOS",
            "sport": "basketball_nba",
            "homeTeam": "LAL",
            "awayTeam": "BOS",
            "anythingElse": {"nested": [1, 2, 3]},
        },
    )
    assert response.status_code == 200
    assert response.json()["probability"] is None


def test_irl_is_input_independent() -> None:
    first = client.post("/predict/irl", json={"homeTeam": "AAA", "awayTeam": "BBB"}).json()
    second = client.post(
        "/predict/irl", json={"homeTeam": "CCC", "awayTeam": "DDD", "num_rollouts": 25}
    ).json()
    assert first == second, "the stub must not pretend different teams give different answers"


def test_irl_accepts_an_empty_body() -> None:
    assert client.post("/predict/irl", json={}).status_code == 200


@pytest.mark.parametrize(
    "payload,reason",
    [
        ([1, 2, 3], "body is not an object"),
        ("string-body", "body is not an object"),
        ({"homeTeam": 123}, "homeTeam is not a string"),
        ({"num_rollouts": 0}, "num_rollouts below 1"),
        ({"num_rollouts": "many"}, "num_rollouts is not an int"),
    ],
)
def test_irl_malformed_body_is_422(payload: Any, reason: str) -> None:
    response = client.post("/predict/irl", json=payload)
    assert response.status_code == 422, f"{reason}: got {response.status_code}"
    assert response.json()["detail"]


# ---------------------------------------------------------------------------
# Cross-cutting contract
# ---------------------------------------------------------------------------


def test_only_etkf_is_admitted_to_consensus_by_the_client_rule() -> None:
    """Run every endpoint's happy path through the client's own admission rule.

    This is the whole safety story in one assertion: four of the five models cannot
    reach a pick, no matter how someone wires them up, because their responses carry no
    number the client will accept.
    """
    admitted = {}
    for name, (path, payload) in _happy_bodies().items():
        response = client.post(path, json=payload)
        assert response.status_code == 200, f"{name} happy path failed: {response.text}"
        admitted[name] = _extract_probability(response.json())

    assert admitted["etkf"] is not None and 0.0 < admitted["etkf"] < 1.0
    assert admitted["tda"] is None
    assert admitted["free_energy"] is None
    assert admitted["mps"] is None
    assert admitted["irl"] is None


def test_bad_input_never_produces_a_server_error() -> None:
    """A garbage body on any endpoint is a 4xx with a message, never a 500."""
    # Only structurally-invalid bodies: /predict/irl accepts unknown keys on purpose, so
    # an object with stray fields is legitimately a 200 there.
    garbage: List[Any] = [[], "x", 42, [{"frames": []}]]
    paths = [
        "/predict/tda",
        "/predict/etkf",
        "/predict/free-energy",
        "/predict/mps",
        "/predict/irl",
    ]
    for path in paths:
        for payload in garbage:
            response = client.post(path, json=payload)
            assert 400 <= response.status_code < 500, (
                f"{path} with {payload!r} returned {response.status_code}: {response.text}"
            )
            assert response.json()["detail"]


def test_openapi_schema_is_generated() -> None:
    """The schema is the contract other teams read; a broken response model breaks here."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert set(paths) >= {
        "/health",
        "/predict/tda",
        "/predict/etkf",
        "/predict/free-energy",
        "/predict/mps",
        "/predict/irl",
    }
