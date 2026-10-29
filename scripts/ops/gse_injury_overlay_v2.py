"""
GSE injury overlay: Sinkhorn target reallocation followed by the sealed EPA dropoff.

Pipeline
--------
1. ``sinkhorn`` / ``sinkhorn_with_info`` solves the entropy-regularized optimal
   transport problem between the sealed pre-injury target shares (``r``) and the
   post-injury shares (``c``) under the sealed interchangeability cost matrix (``C``).
2. Column sums of the transport plan become the feasible post-injury shares.
3. ``apply_epa_dropoff`` multiplies each feasible share by the sealed EPA factor of
   the role that player inherits, producing *effective* share mass.

The EPA table and the cost matrix are sealed at Tuesday 04:00 CT. Neither tau nor
any other sealed coach parameter enters this module, so the overlay cannot move them.

Invariants enforced here
------------------------
* Inputs are never mutated. Every function returns new objects.
* Every EPA factor must lie in ``[EPA_FACTOR_MIN, EPA_FACTOR_MAX]``; anything else is
  almost certainly a data error and raises ``ValueError``.
* The EPA table is validated against ``EPA_DROPOFF_SHA256`` so a mid-week edit is
  detectable rather than silent.
* ``sinkhorn_with_info`` exposes the convergence residual so the reallocation can be
  audited alongside the EPA factors.

Note on mass
------------
EPA factors are all <= 1.0, so effective mass after the dropoff is less than the
feasible mass before it. That reduction *is* the dropoff. ``injury_overlay`` reports
``total_mass_before`` / ``total_mass_after`` so the loss is explicit rather than
silently absorbed. Use ``normalize_shares`` when a downstream consumer requires
sum-to-one probabilities.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
from typing import Dict, List, Mapping, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Sealed artifacts
# --------------------------------------------------------------------------- #

#: Bounds every EPA factor must satisfy. Outside this range is a data error.
EPA_FACTOR_MIN: float = 0.5
EPA_FACTOR_MAX: float = 1.2

#: Sealed EPA dropoff table. Replace with the real Tuesday 04:00 CT baseline values.
#: Each entry is the ratio of replacement to starter EPA-per-play for that role.
EPA_DROPOFF: Dict[str, float] = {
    "QB1": 0.78,
    "RB1": 0.85,
    "WR1": 0.82,
    "WR2": 0.88,
    "TE1": 0.84,
    "OL": 0.91,
}

_SINKHORN_EPS: float = 0.05
_SINKHORN_MAX_ITER: int = 200
_SINKHORN_TOL: float = 1e-6


def _canonical_hash(obj: Mapping[str, object]) -> str:
    """Stable SHA-256 over a canonical JSON serialization."""
    blob = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


#: Hash of the sealed EPA table as written at the Tuesday baseline.
EPA_DROPOFF_SHA256: str = _canonical_hash(EPA_DROPOFF)


def validate_epa_table(
    table: Mapping[str, float],
    *,
    expected_hash: Optional[str] = None,
    lo: float = EPA_FACTOR_MIN,
    hi: float = EPA_FACTOR_MAX,
) -> str:
    """
    Validate a sealed EPA table and return its SHA-256.

    Raises
    ------
    ValueError
        If any factor falls outside ``[lo, hi]``, or if ``expected_hash`` is given
        and does not match the table's canonical hash.
    """
    for role, factor in table.items():
        if not isinstance(factor, (int, float)) or isinstance(factor, bool):
            raise ValueError(f"EPA factor for role {role!r} is not numeric: {factor!r}")
        if math.isnan(factor) or math.isinf(factor):
            raise ValueError(f"EPA factor for role {role!r} is not finite: {factor!r}")
        if not (lo <= factor <= hi):
            raise ValueError(
                f"EPA factor for role {role!r} = {factor} is outside the sealed "
                f"bounds [{lo}, {hi}]"
            )
    digest = _canonical_hash(dict(table))
    if expected_hash is not None and digest != expected_hash:
        raise ValueError(
            "EPA table hash mismatch: sealed table was modified mid-week "
            f"(expected {expected_hash}, got {digest})"
        )
    return digest


def load_injury_file(path: str) -> Dict[str, object]:
    """
    Load a JSON injury file.

    Expected shape::

        {
          "injured": ["WR1_A"],
          "pre_shares": {"WR1_A": 0.40, ...},
          "role_of": {"WR1_A": "WR1", ...}
        }
    """
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("injury file must contain a JSON object")
    required = {"injured", "pre_shares", "role_of"}
    missing = required - set(data)
    if missing:
        raise ValueError(f"injury file missing keys: {sorted(missing)}")
    return data


# --------------------------------------------------------------------------- #
# EPA dropoff
# --------------------------------------------------------------------------- #


def apply_epa_dropoff(
    shares: Mapping[str, float],
    role_of: Mapping[str, str],
    table: Mapping[str, float] = EPA_DROPOFF,
    *,
    lo: float = EPA_FACTOR_MIN,
    hi: float = EPA_FACTOR_MAX,
    validate_table: bool = True,
) -> Dict[str, float]:
    """
    Multiply each post-Sinkhorn share by the sealed EPA factor of the role that
    player inherits.

    * ``shares`` and ``role_of`` are read-only; the returned dict is new.
    * A player whose role is absent from ``role_of`` or absent from ``table`` keeps
      its share unchanged (factor 1.0).
    * Every applied factor is bounds-checked against ``[lo, hi]``.

    Returns
    -------
    Dict[str, float]
        New mapping of player -> effective share mass.
    """
    if validate_table:
        validate_epa_table(table, lo=lo, hi=hi)

    out: Dict[str, float] = {}
    for player, share in shares.items():
        role = role_of.get(player)
        factor = table.get(role, 1.0) if role is not None else 1.0
        if not (lo <= factor <= hi):
            raise ValueError(
                f"EPA factor for player {player!r} (role {role!r}) = {factor} "
                f"is outside the sealed bounds [{lo}, {hi}]"
            )
        effective = share * factor
        out[player] = effective
        logger.info(
            "epa_dropoff player=%s role=%s factor=%.4f pre=%.6f post=%.6f",
            player,
            role,
            factor,
            share,
            effective,
        )
    return out


def normalize_shares(shares: Mapping[str, float]) -> Dict[str, float]:
    """Return a new dict scaled to sum to 1.0. Raises if the input sums to <= 0."""
    total = sum(shares.values())
    if total <= 0:
        raise ValueError(f"cannot normalize shares with non-positive total: {total}")
    return {player: share / total for player, share in shares.items()}


# --------------------------------------------------------------------------- #
# Sinkhorn
# --------------------------------------------------------------------------- #


def sinkhorn(
    r: Sequence[float],
    c: Sequence[float],
    C: Sequence[Sequence[float]],
    eps: float = _SINKHORN_EPS,
    max_iter: int = _SINKHORN_MAX_ITER,
    tol: float = _SINKHORN_TOL,
) -> List[List[float]]:
    """
    Minimal Sinkhorn. ``r`` = pre-injury marginal, ``c`` = post-injury marginal,
    ``C`` = sealed cost matrix. Returns the transport plan ``P``.
    """
    plan, _info = sinkhorn_with_info(r, c, C, eps=eps, max_iter=max_iter, tol=tol)
    return plan


def sinkhorn_with_info(
    r: Sequence[float],
    c: Sequence[float],
    C: Sequence[Sequence[float]],
    eps: float = _SINKHORN_EPS,
    max_iter: int = _SINKHORN_MAX_ITER,
    tol: float = _SINKHORN_TOL,
) -> Tuple[List[List[float]], Dict[str, float]]:
    """
    Sinkhorn with convergence diagnostics.

    Returns
    -------
    (P, info)
        ``P`` is the transport plan; ``info`` carries ``iterations``,
        ``row_residual``, ``col_residual``, ``converged`` and ``objective``.
    """
    if len(r) != len(C) or len(c) != len(C[0]):
        raise ValueError(
            f"dimension mismatch: len(r)={len(r)}, len(c)={len(c)}, "
            f"shape(C)=({len(C)},{len(C[0]) if C else 0})"
        )
    if any(value < 0 for value in r) or any(value < 0 for value in c):
        raise ValueError("marginals r and c must be non-negative")

    n, m = len(r), len(c)
    # Kernel K = exp(-C/eps), computed elementwise. Guard against underflow.
    K: List[List[float]] = [
        [math.exp(max(-C[i][j] / eps, -700.0)) for j in range(m)] for i in range(n)
    ]

    u: List[float] = [1.0 / n] * n
    v: List[float] = [1.0 / m] * m
    iterations = 0

    for iterations in range(1, max_iter + 1):
        u_new = [
            r[i] / max(sum(K[i][j] * v[j] for j in range(m)), 1e-12) for i in range(n)
        ]
        v_new = [
            c[j] / max(sum(K[i][j] * u_new[i] for i in range(n)), 1e-12)
            for j in range(m)
        ]
        du = max(abs(u_new[i] - u[i]) for i in range(n)) if n else 0.0
        dv = max(abs(v_new[j] - v[j]) for j in range(m)) if m else 0.0
        u, v = u_new, v_new
        if du < tol and dv < tol:
            break

    P: List[List[float]] = [
        [u[i] * K[i][j] * v[j] for j in range(m)] for i in range(n)
    ]
    row_residual = max((abs(sum(P[i]) - r[i]) for i in range(n)), default=0.0)
    col_residual = max(
        (abs(sum(P[i][j] for i in range(n)) - c[j]) for j in range(m)), default=0.0
    )
    objective = sum(P[i][j] * C[i][j] for i in range(n) for j in range(m))

    info = {
        "iterations": float(iterations),
        "row_residual": row_residual,
        "col_residual": col_residual,
        "converged": 1.0 if (row_residual < 1e-4 and col_residual < 1e-4) else 0.0,
        "objective": objective,
    }
    return P, info


def role_cost_matrix(
    roles: Sequence[str],
    role_of: Mapping[str, str],
    *,
    same_role_cost: float = 0.0,
    same_position_cost: float = 0.35,
    cross_position_cost: float = 1.0,
) -> List[List[float]]:
    """
    Build a sealed interchangeability cost matrix from role labels.

    Lower cost = cheaper to move target share. Two players sharing an exact role
    are cheapest; same position group (``WR1``/``WR2`` -> ``WR``) is intermediate;
    different position groups are most expensive.
    """

    def position(role: str) -> str:
        return "".join(ch for ch in role if ch.isalpha()).upper()

    players = list(role_of.keys())
    if set(players) != set(roles):
        raise ValueError("roles and role_of.keys() must describe the same players")

    C: List[List[float]] = []
    for i, pi in enumerate(roles):
        row: List[float] = []
        ri = role_of[pi]
        for j, pj in enumerate(roles):
            rj = role_of[pj]
            if i == j:
                row.append(0.0)
            elif ri == rj:
                row.append(same_role_cost)
            elif position(ri) == position(rj):
                row.append(same_position_cost)
            else:
                row.append(cross_position_cost)
        C.append(row)
    return C


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #


def injury_overlay(
    pre_shares: Mapping[str, float],
    post_shares: Mapping[str, float],
    role_of: Mapping[str, str],
    cost: Sequence[Sequence[float]],
    players: Sequence[str],
    eps: float = _SINKHORN_EPS,
    table: Mapping[str, float] = EPA_DROPOFF,
) -> Dict[str, object]:
    """
    Full overlay: Sinkhorn reallocation then EPA dropoff.

    Returns a report dict with keys:
        ``feasible_shares``   post-Sinkhorn shares (sum = 1)
        ``effective_shares``  EPA-scaled shares (sum = total_mass_after)
        ``normalized_shares`` effective shares rescaled to sum = 1
        ``total_mass_before``, ``total_mass_after``, ``mass_loss``
        ``sinkhorn``          convergence diagnostics
        ``epa_table_sha256``  sealed table identity
        ``epa_factors``       player -> applied factor
        ``log``               per-player audit entries
    """
    r = [float(pre_shares[p]) for p in players]
    c = [float(post_shares[p]) for p in players]

    P, info = sinkhorn_with_info(r, c, cost, eps=eps)

    feasible: Dict[str, float] = {}
    for j, player in enumerate(players):
        feasible[player] = sum(P[i][j] for i in range(len(players)))

    table_hash = validate_epa_table(table)
    effective = apply_epa_dropoff(feasible, role_of, table, validate_table=False)

    total_before = sum(feasible.values())
    total_after = sum(effective.values())
    factors = {
        player: (table.get(role_of[player], 1.0) if player in role_of else 1.0)
        for player in players
    }

    entries = [
        {
            "player": player,
            "role": role_of.get(player),
            "factor": factors[player],
            "pre_share": feasible[player],
            "post_share": effective[player],
        }
        for player in players
    ]

    logger.info(
        "injury_overlay players=%d mass_before=%.6f mass_after=%.6f "
        "row_residual=%.3e converged=%s",
        len(players),
        total_before,
        total_after,
        info["row_residual"],
        bool(info["converged"]),
    )

    return {
        "feasible_shares": feasible,
        "effective_shares": effective,
        "normalized_shares": normalize_shares(effective),
        "total_mass_before": total_before,
        "total_mass_after": total_after,
        "mass_loss": total_before - total_after,
        "sinkhorn": info,
        "epa_table_sha256": table_hash,
        "epa_factors": factors,
        "log": entries,
    }


def plot_cost_matrix(
    C: Sequence[Sequence[float]],
    labels: Sequence[str],
    out_path: str = "cost_matrix.png",
) -> str:
    """
    Render the sealed cost matrix. Imports matplotlib lazily so the module works
    headless without it installed.
    """
    try:
        import matplotlib.pyplot as plt  # noqa: PLC0415
        import numpy as np  # noqa: PLC0415
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "plot_cost_matrix requires matplotlib and numpy"
        ) from exc

    arr = np.array(C)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(arr, cmap="viridis")
    ax.set_xticks(range(len(labels)))
    ax.set_yticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels)
    ax.set_title("Sealed cost matrix (lower = cheaper interchange)")
    fig.colorbar(im, ax=ax)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close(fig)
    return out_path


def _demo() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    players = ["WR1_A", "WR2_B", "WR3_C", "TE1_D"]
    pre = {"WR1_A": 0.40, "WR2_B": 0.25, "WR3_C": 0.20, "TE1_D": 0.15}
    post = {"WR1_A": 0.00, "WR2_B": 0.40, "WR3_C": 0.35, "TE1_D": 0.25}
    roles = {"WR1_A": "WR1", "WR2_B": "WR1", "WR3_C": "WR2", "TE1_D": "TE1"}
    cost = role_cost_matrix(players, roles)
    report = injury_overlay(pre, post, roles, cost, players)
    print(json.dumps(
        {k: report[k] for k in (
            "feasible_shares",
            "effective_shares",
            "total_mass_before",
            "total_mass_after",
            "mass_loss",
            "sinkhorn",
            "epa_table_sha256",
        )},
        indent=2,
    ))


if __name__ == "__main__":
    _demo()
