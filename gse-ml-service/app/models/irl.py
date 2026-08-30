"""Maximum-Entropy Inverse Reinforcement Learning -- EXPLICIT, UNIMPLEMENTED STUB.

STATUS: NOT IMPLEMENTED. NOT A MODEL. DO NOT USE FOR PREDICTIONS.
=================================================================
This module deliberately ships **no** working game simulator. ``simulate_game`` always
reports that it is unavailable, and ``MaxEntIRL.fit`` always raises
``NotImplementedError``. Everything below explains why that is the correct thing to ship
and how the unavailability is enforced rather than merely documented.

Why there is no implementation
------------------------------
The design this module was specified from proposed:

    def simulate_game(team_a, team_b, num_rollouts=1000):
        return np.mean([random.random() for _ in range(num_rollouts)])

That function returns ``0.5`` plus sampling noise (the mean of ``num_rollouts`` uniform
draws) and **ignores both teams entirely**. It is a random number generator wearing the
signature of a model. Shipping it would inject a fake ~0.5 "win probability" into any
consumer that averaged it, and because its output is a plausible-looking float in
``[0, 1]``, nothing downstream could tell it from a real estimate.

A real MaxEnt IRL model (Ziebart et al., 2008) recovers a reward function from *expert
trajectories*: sequences of (state, action) pairs. For a sports application that means
play-by-play action sequences -- possession-level events with the acting team/player, the
action taken, the resulting state, and the terminal outcome. **This project does not
ingest play-by-play data.** Its data layer is odds and lines (The Odds API); there are no
trajectories anywhere in the system to learn from. No amount of code here changes that.

So the honest options were: (a) fabricate output, (b) omit the module, or (c) ship an
explicit stub plus real algorithmic scaffolding that fails loudly. This is (c).

THE SAFETY PROPERTY: why a stub is shippable at all
---------------------------------------------------
``simulate_game`` does **not** return a bare float. It returns a structured mapping whose
``probability`` key is ``None``::

    {"available": False, "model": "maxent_irl", "probability": None, "reason": ..., ...}

That shape is chosen to interlock with the already-built TypeScript ensemble client,
``packages/prediction-engine/src/ensemble/remote-model-client.ts``. Its
``extractProbability`` helper accepts a response **only** when ``probability`` is a
``number`` that is finite and within ``[0, 1]``; anything else -- ``null``, a missing
field, a string, ``NaN``, ``Infinity``, out of range -- returns ``null``, which
``fetchModelPrediction`` converts into a ``RemoteModelFailure`` with reason
``"malformed_response"``. ``getRemoteProbabilities`` then partitions that outcome into
``failed`` rather than ``succeeded``.

The consequence is the whole point: **a consumer that serves this stub over HTTP has its
response rejected by the ensemble client and excluded from consensus automatically.** The
stub cannot be silently averaged in as noise, cannot drag a consensus toward 0.5, and
cannot be mistaken for an abstention-shaped 50/50 opinion. The exclusion is enforced by
the client's validator, not by anyone remembering to special-case this model.

Corollary for anyone editing this file: **never make any function here return a bare
float, and never put a number in the ``probability`` key.** Doing so silently converts an
excluded stub into an accepted "prediction" made of nothing. ``test_irl.py`` guards this.

What IS real here
-----------------
``MaxEntIRL`` is genuine algorithmic scaffolding: a ``torch.nn.Module`` holding the two
networks a MaxEnt IRL implementation needs -- a state reward function ``r_theta(s)`` and a
soft value function ``V(s)``. Its ``forward`` runs and produces documented shapes, so it
is a real starting point rather than a comment. What it does *not* have is the learning
algorithm, because the learning algorithm needs data that does not exist here; ``fit``
therefore raises ``NotImplementedError`` naming exactly what is missing. An honest
exception is strictly better than a function that quietly returns noise.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence, Tuple

from torch import Tensor, nn

__all__ = [
    "MODEL_ID",
    "SIMULATION_UNAVAILABLE_REASON",
    "REQUIRED_DATA",
    "Trajectory",
    "MaxEntIRL",
    "simulate_game",
]

#: Stable identifier for this model in logs and ensemble bookkeeping.
MODEL_ID = "maxent_irl"

SIMULATION_UNAVAILABLE_REASON = (
    "MaxEnt IRL is not implemented: it requires expert play-by-play action trajectories, "
    "which this project does not ingest (the data layer is odds/lines only). No estimate "
    "is produced, and `probability` is deliberately None so the ensemble client rejects "
    "this response as malformed and excludes it from consensus."
)

#: Exactly what a real implementation would need before it could produce anything.
#: Named here (and echoed in ``MaxEntIRL.fit``'s error) so the gap is auditable rather
#: than folklore.
REQUIRED_DATA: Tuple[str, ...] = (
    "play-by-play event streams with one row per possession/action",
    "a discrete action space shared across trajectories",
    "per-event state features (score margin, time remaining, field/court position, "
    "possession)",
    "terminal outcomes per trajectory, to anchor the reward scale",
    "a transition model or enough trajectories to estimate expected state-visitation "
    "frequencies",
)


@dataclass(frozen=True)
class Trajectory:
    """One expert demonstration: the data a real ``fit`` would consume.

    This type exists to make ``fit``'s signature meaningful and to document the required
    shape precisely. Nothing in this repository currently produces one.

    Attributes
    ----------
    states:
        ``(T, state_dim)`` float tensor of per-step state features, ordered in time.
    actions:
        ``(T,)`` int64 tensor of action indices taken from each state.
    terminal_reward:
        Optional scalar outcome for the trajectory (e.g. margin or win/loss), used to
        anchor the otherwise scale-free recovered reward.
    """

    states: Tensor
    actions: Tensor
    terminal_reward: Optional[float] = None

    def __post_init__(self) -> None:
        if self.states.dim() != 2:
            raise ValueError(
                f"states must be (T, state_dim), got shape {tuple(self.states.shape)}"
            )
        if self.actions.dim() != 1:
            raise ValueError(f"actions must be (T,), got shape {tuple(self.actions.shape)}")
        if self.states.shape[0] != self.actions.shape[0]:
            raise ValueError(
                f"states and actions disagree on T: {self.states.shape[0]} vs "
                f"{self.actions.shape[0]}"
            )


def _mlp(in_dim: int, hidden_dim: int, out_dim: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Linear(in_dim, hidden_dim),
        nn.ReLU(),
        nn.Linear(hidden_dim, hidden_dim),
        nn.ReLU(),
        nn.Linear(hidden_dim, out_dim),
    )


class MaxEntIRL(nn.Module):
    """Reward and soft-value networks for MaxEnt IRL. **Untrained; ``fit`` is not implemented.**

    The module constructs and ``forward`` runs, so this is real scaffolding rather than a
    placeholder comment. But the parameters are random initialisations and there is no
    training procedure, so:

    * ``forward`` output is a random function of its input. It is NOT a reward, NOT a
      value, and NOT a probability -- it is noise with the right shape.
    * There is no ``predict``/``simulate`` method on this class by design. The only
      simulation entry point is the module-level :func:`simulate_game`, which reports
      unavailability.

    Parameters
    ----------
    state_dim:
        Width of the per-step state feature vector.
    hidden_dim:
        Hidden width of both networks.
    n_actions:
        Size of the discrete action space. Stored for a future policy/partition-function
        implementation; the current networks are state-only, so it is metadata, not a
        layer shape. It is validated but otherwise unused, and that is stated rather than
        hidden.
    """

    def __init__(self, state_dim: int, hidden_dim: int = 64, n_actions: int = 2) -> None:
        super().__init__()
        for name, value in (
            ("state_dim", state_dim),
            ("hidden_dim", hidden_dim),
            ("n_actions", n_actions),
        ):
            if not isinstance(value, int) or isinstance(value, bool) or value < 1:
                raise ValueError(f"{name} must be a positive int, got {value!r}")

        self.state_dim = state_dim
        self.hidden_dim = hidden_dim
        self.n_actions = n_actions

        #: r_theta(s) -- the reward function MaxEnt IRL would recover.
        self.reward_net = _mlp(state_dim, hidden_dim, 1)
        #: V(s) -- the soft value function used in the soft-Bellman backup.
        self.value_net = _mlp(state_dim, hidden_dim, 1)

    def forward(self, states: Tensor) -> Tuple[Tensor, Tensor]:
        """Evaluate both networks on a batch of states.

        Parameters
        ----------
        states:
            ``(batch, state_dim)`` float tensor.

        Returns
        -------
        (reward, value):
            Two tensors of shape ``(batch,)`` -- one scalar per state from each network.
            **Untrained output is noise**; see the class docstring.
        """
        if states.dim() != 2:
            raise ValueError(f"states must be (batch, state_dim), got {tuple(states.shape)}")
        if states.shape[1] != self.state_dim:
            raise ValueError(
                f"states has {states.shape[1]} features but state_dim is {self.state_dim}"
            )
        reward = self.reward_net(states).squeeze(-1)
        value = self.value_net(states).squeeze(-1)
        return reward, value

    def fit(
        self,
        trajectories: Sequence[Trajectory],
        epochs: int = 100,
        lr: float = 1e-3,
    ) -> None:
        """Recover ``r_theta`` from expert trajectories. **NOT IMPLEMENTED -- always raises.**

        The intended algorithm is the standard MaxEnt IRL loop (Ziebart et al., 2008):
        compute empirical feature expectations from the demonstrations, solve the soft
        Bellman backup under the current reward to get a policy, roll that policy forward
        to get expected state-visitation frequencies, and take a gradient step on the
        difference between the two expectations.

        Every one of those steps needs trajectory data. This repository ingests odds and
        lines, not play-by-play events, so there is nothing to fit against.

        Parameters
        ----------
        trajectories:
            Expert demonstrations. See :class:`Trajectory`.
        epochs, lr:
            Optimisation hyper-parameters for the unimplemented loop; accepted so the
            signature is the real one, not a placeholder.

        Raises
        ------
        NotImplementedError
            Always. The message names the missing data explicitly. This is intentional:
            an exception is safe, whereas returning a plausible number from an untrained
            model is not.
        """
        raise NotImplementedError(
            "MaxEntIRL.fit is not implemented. MaxEnt IRL requires expert action "
            "trajectories, and this project ingests odds/lines only -- there is no "
            "play-by-play data anywhere in the system to learn from. Required before this "
            "can be implemented: " + "; ".join(REQUIRED_DATA) + ". "
            f"(received {len(trajectories)} trajectories, epochs={epochs}, lr={lr})"
        )


def simulate_game(
    team_a: str,
    team_b: str,
    num_rollouts: int = 1000,
) -> Dict[str, Any]:
    """Report that MaxEnt IRL game simulation is UNAVAILABLE. Never returns a probability.

    This is the honest replacement for a simulator that does not exist. It performs no
    rollouts, consults no data, and does not look at ``team_a`` or ``team_b`` -- because it
    has nothing to say about them. The arguments are accepted so the call site is the real
    one a future implementation would use.

    Returns
    -------
    dict
        Always exactly::

            {
                "available": False,
                "model": "maxent_irl",
                "probability": None,
                "reason": SIMULATION_UNAVAILABLE_REASON,
                "required_data": REQUIRED_DATA,
            }

        A **fresh** dict each call, so a caller mutating one result cannot affect another.
        The value is identical for every input -- there is no hidden randomness, and
        different teams do not produce different answers.

    Why ``probability`` is ``None`` and not a number
    ------------------------------------------------
    ``packages/prediction-engine/src/ensemble/remote-model-client.ts`` accepts a remote
    model response only if ``probability`` is a finite ``number`` in ``[0, 1]``. ``null``
    fails that check, so the response is classified ``malformed_response`` and lands in
    ``getRemoteProbabilities().failed`` instead of ``succeeded``. This stub is therefore
    **automatically excluded from consensus** rather than averaged in as noise. Returning
    ``0.5`` -- or any float -- would defeat that and silently contaminate the ensemble.

    Notes
    -----
    ``num_rollouts`` is ignored. It is part of the eventual signature and is echoed
    nowhere, so the returned value stays input-independent.
    """
    del team_a, team_b, num_rollouts  # Intentionally unused: nothing here can use them.
    return {
        "available": False,
        "model": MODEL_ID,
        "probability": None,
        "reason": SIMULATION_UNAVAILABLE_REASON,
        "required_data": REQUIRED_DATA,
    }
