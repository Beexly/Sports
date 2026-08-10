"""Tests for the MaxEnt IRL stub.

These tests exist to pin a *safety* property, not an accuracy one. The module under test
deliberately implements nothing, so the things that can regress are:

1. someone "helpfully" makes ``simulate_game`` return a float (the original spec's
   ``np.mean([random.random() ...])``, which is ~0.5 noise ignoring both teams),
2. someone puts a number in the ``probability`` key,
3. someone replaces ``fit``'s ``NotImplementedError`` with a silent no-op.

Each of those turns an automatically-excluded stub into a fake prediction that the
ensemble would accept. :func:`test_response_is_rejected_by_the_ensemble_validator`
transcribes the actual acceptance rule from
``packages/prediction-engine/src/ensemble/remote-model-client.ts`` and asserts this
module's payload fails it -- with a positive control so the test cannot pass vacuously.

All randomness is explicitly seeded.
"""

from __future__ import annotations

import inspect
import json
import math
import typing
from typing import Any, Optional

import pytest
import torch

from app.models import irl
from app.models.irl import (
    MODEL_ID,
    REQUIRED_DATA,
    SIMULATION_UNAVAILABLE_REASON,
    MaxEntIRL,
    Trajectory,
    simulate_game,
)


# --------------------------------------------------------------------------------------
# Transcription of the TypeScript acceptance rule (the safety interlock)
# --------------------------------------------------------------------------------------
def extract_probability(body: Any) -> Optional[float]:
    """Faithful Python transcription of ``extractProbability`` in remote-model-client.ts.

    The TypeScript is::

        if (typeof body !== "object" || body === null) return null;
        const value = body["probability"];
        if (typeof value !== "number") return null;
        if (!Number.isFinite(value)) return null;
        if (value < 0 || value > 1) return null;
        return value;

    A ``null`` return makes ``fetchModelPrediction`` emit a ``malformed_response``
    failure, which ``getRemoteProbabilities`` sorts into ``failed`` -- never into the
    ``succeeded`` list that feeds consensus. This copy lives in the test (not in the
    module) precisely so the test can assert the interlock independently.
    """
    if not isinstance(body, dict):
        return None
    value = body.get("probability")
    # bool is a subclass of int in Python but is not a JS number; exclude it explicitly.
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value):
        return None
    if value < 0 or value > 1:
        return None
    return float(value)


# --------------------------------------------------------------------------------------
# simulate_game: unavailable, structured, input-independent
# --------------------------------------------------------------------------------------
def test_simulate_game_reports_unavailable_with_no_probability() -> None:
    result = simulate_game("Lakers", "Celtics")

    assert isinstance(result, dict)
    assert result["available"] is False
    assert result["probability"] is None
    assert result["model"] == MODEL_ID
    assert result["reason"] == SIMULATION_UNAVAILABLE_REASON
    assert result["required_data"] == REQUIRED_DATA


def test_simulate_game_is_not_a_bare_float() -> None:
    """The single most important assertion in this file.

    The rejected spec returned ``np.mean([random.random() ...])`` -- a float near 0.5 that
    a consumer could treat as a win probability. Nothing here may be coercible to one.
    """
    result = simulate_game("Yankees", "Red Sox")

    assert not isinstance(result, float)
    assert not isinstance(result, (int, bool))
    assert not isinstance(result, (torch.Tensor,))
    with pytest.raises(TypeError):
        float(result)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "pair_a,pair_b",
    [
        (("Lakers", "Celtics"), ("Yankees", "Red Sox")),
        (("Chiefs", "Eagles"), ("Chiefs", "Eagles")),
        (("", ""), ("A very strong team", "A very weak team")),
    ],
)
def test_different_team_pairs_give_the_identical_unavailable_result(
    pair_a: tuple, pair_b: tuple
) -> None:
    """Pins that the result is input-independent -- i.e. NOT secretly random.

    A random implementation would give different numbers for different (or even the same)
    inputs. Equality across unrelated matchups, plus equality across repeated calls, is
    what proves nothing is being sampled behind the scenes.
    """
    assert simulate_game(*pair_a) == simulate_game(*pair_b)


def test_repeated_calls_are_identical_and_seed_independent() -> None:
    torch.manual_seed(0)
    baseline = simulate_game("A", "B")
    torch.manual_seed(12345)
    assert simulate_game("A", "B") == baseline
    assert all(simulate_game("A", "B") == baseline for _ in range(50))


@pytest.mark.parametrize("num_rollouts", [0, 1, 1000, 10_000_000])
def test_num_rollouts_does_not_change_anything(num_rollouts: int) -> None:
    """``num_rollouts`` is accepted for signature compatibility and ignored."""
    assert simulate_game("A", "B", num_rollouts=num_rollouts) == simulate_game("A", "B")


def test_each_call_returns_a_fresh_dict() -> None:
    """A caller mutating one result must not poison the next call."""
    first = simulate_game("A", "B")
    second = simulate_game("A", "B")
    assert first is not second

    first["probability"] = 0.99  # a hostile/careless consumer
    third = simulate_game("A", "B")
    assert third["probability"] is None


def test_response_is_rejected_by_the_ensemble_validator() -> None:
    """The interlock, end to end: this payload is excluded from consensus by the client.

    Includes a positive control -- a well-formed response IS accepted -- so a broken
    transcription that rejects everything would fail this test rather than pass it.
    """
    payload = simulate_game("Lakers", "Celtics")

    assert extract_probability(payload) is None, (
        "the ensemble client would ACCEPT this stub's response -- it would be averaged "
        "into consensus as noise"
    )
    # Positive control: the validator is not simply rejecting everything.
    assert extract_probability({"probability": 0.62}) == pytest.approx(0.62)
    # And the shapes it must also reject, for context.
    for bad in ({"probability": "0.5"}, {"probability": float("nan")}, {"probability": 1.5}, {}):
        assert extract_probability(bad) is None


def test_payload_serialises_to_json_null_probability() -> None:
    """Over the wire the field must be JSON ``null``, which is what the client rejects."""
    encoded = json.loads(json.dumps(simulate_game("A", "B")))
    assert encoded["probability"] is None
    assert encoded["available"] is False
    assert isinstance(encoded["required_data"], list) and encoded["required_data"]


# --------------------------------------------------------------------------------------
# No public entry point may hand back a bare float
# --------------------------------------------------------------------------------------
def test_no_public_callable_is_annotated_to_return_a_bare_number() -> None:
    """Static guard against the regression this whole module exists to prevent.

    Walks every public callable exported by the module (and ``MaxEntIRL``'s public
    methods) and asserts none of them declares a bare ``float``/``int`` return type. A
    future edit that reintroduces ``def simulate_game(...) -> float`` fails here even
    before its body is examined.
    """
    checked = 0
    targets = [(name, getattr(irl, name)) for name in irl.__all__]
    targets += [
        (f"MaxEntIRL.{name}", member)
        for name, member in vars(MaxEntIRL).items()
        if not name.startswith("_") and callable(member)
    ]

    for name, obj in targets:
        if not (inspect.isfunction(obj) or inspect.ismethod(obj)):
            continue
        hints = typing.get_type_hints(obj)
        returns = hints.get("return", None)
        assert returns not in (float, int, bool), (
            f"{name} is annotated to return a bare number -- a consumer could read it as "
            "a probability"
        )
        checked += 1

    assert checked >= 2, "reflection found no functions to check -- the guard is vacuous"


def test_module_exports_no_module_level_float_constant_probability() -> None:
    """No stray numeric 'probability' constant to be picked up by accident."""
    for name in irl.__all__:
        value = getattr(irl, name)
        assert not isinstance(value, float), f"{name} is a bare float constant"


# --------------------------------------------------------------------------------------
# fit(): honest NotImplementedError
# --------------------------------------------------------------------------------------
def test_fit_raises_not_implemented_naming_the_missing_data() -> None:
    model = MaxEntIRL(state_dim=4)
    torch.manual_seed(0)
    trajectories = [
        Trajectory(states=torch.randn(5, 4), actions=torch.zeros(5, dtype=torch.int64))
    ]

    with pytest.raises(NotImplementedError) as excinfo:
        model.fit(trajectories)

    message = str(excinfo.value)
    assert "play-by-play" in message
    assert "odds" in message
    for requirement in REQUIRED_DATA:
        assert requirement in message


def test_fit_raises_even_with_empty_input() -> None:
    """No input shape short-circuits into a silent success path."""
    model = MaxEntIRL(state_dim=3)
    with pytest.raises(NotImplementedError):
        model.fit([])
    with pytest.raises(NotImplementedError):
        model.fit([], epochs=0, lr=0.0)


def test_fit_signature_is_the_real_one() -> None:
    """The scaffolding must expose a usable signature, not ``*args, **kwargs``."""
    params = inspect.signature(MaxEntIRL.fit).parameters
    assert list(params) == ["self", "trajectories", "epochs", "lr"]
    assert params["epochs"].default == 100
    assert params["lr"].default == pytest.approx(1e-3)


# --------------------------------------------------------------------------------------
# MaxEntIRL scaffolding: constructs and runs with documented shapes
# --------------------------------------------------------------------------------------
def test_module_constructs_and_forward_produces_documented_shapes() -> None:
    torch.manual_seed(42)
    model = MaxEntIRL(state_dim=6, hidden_dim=16, n_actions=5)
    states = torch.randn(9, 6)

    reward, value = model(states)

    assert reward.shape == (9,)
    assert value.shape == (9,)
    assert torch.isfinite(reward).all()
    assert torch.isfinite(value).all()
    assert model.n_actions == 5
    assert model.state_dim == 6


def test_forward_is_differentiable_and_reaches_both_networks() -> None:
    """The scaffolding is real: gradients flow to every parameter of both heads."""
    torch.manual_seed(7)
    model = MaxEntIRL(state_dim=5, hidden_dim=8)
    reward, value = model(torch.randn(12, 5))

    model.zero_grad(set_to_none=True)
    (reward.sum() + value.sum()).backward()

    for name, param in model.named_parameters():
        assert param.grad is not None, f"{name} received no gradient"
        assert torch.isfinite(param.grad).all(), f"{name} has a non-finite gradient"


def test_forward_is_deterministic_for_fixed_parameters() -> None:
    torch.manual_seed(3)
    model = MaxEntIRL(state_dim=4, hidden_dim=8)
    states = torch.randn(5, 4)
    first = model(states)
    second = model(states)
    assert torch.equal(first[0], second[0])
    assert torch.equal(first[1], second[1])


def test_forward_rejects_wrong_shapes() -> None:
    model = MaxEntIRL(state_dim=4)
    with pytest.raises(ValueError, match="batch, state_dim"):
        model(torch.randn(4))
    with pytest.raises(ValueError, match="state_dim"):
        model(torch.randn(2, 5))


def test_constructor_validation() -> None:
    with pytest.raises(ValueError, match="state_dim"):
        MaxEntIRL(state_dim=0)
    with pytest.raises(ValueError, match="hidden_dim"):
        MaxEntIRL(state_dim=3, hidden_dim=-4)
    with pytest.raises(ValueError, match="n_actions"):
        MaxEntIRL(state_dim=3, n_actions=0)


def test_model_has_no_predict_or_probability_method() -> None:
    """There is no per-class prediction entry point to mistake for a working model."""
    for forbidden in ("predict", "predict_proba", "probability", "simulate", "win_probability"):
        assert not hasattr(MaxEntIRL, forbidden), f"MaxEntIRL unexpectedly exposes {forbidden}"


# --------------------------------------------------------------------------------------
# Trajectory: the data contract fit() would consume
# --------------------------------------------------------------------------------------
def test_trajectory_accepts_well_formed_data() -> None:
    torch.manual_seed(1)
    traj = Trajectory(
        states=torch.randn(7, 3),
        actions=torch.randint(0, 4, (7,)),
        terminal_reward=1.0,
    )
    assert traj.states.shape == (7, 3)
    assert traj.actions.shape == (7,)
    assert traj.terminal_reward == pytest.approx(1.0)


@pytest.mark.parametrize(
    "states,actions,match",
    [
        (torch.zeros(3), torch.zeros(3, dtype=torch.int64), "states must be"),
        (torch.zeros(3, 2), torch.zeros(3, 1, dtype=torch.int64), "actions must be"),
        (torch.zeros(4, 2), torch.zeros(3, dtype=torch.int64), "disagree on T"),
    ],
)
def test_trajectory_rejects_malformed_data(
    states: torch.Tensor, actions: torch.Tensor, match: str
) -> None:
    with pytest.raises(ValueError, match=match):
        Trajectory(states=states, actions=actions)
