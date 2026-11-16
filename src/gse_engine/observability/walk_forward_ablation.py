"""Bitemporal ASOF freeze, 3-wk purged CPCV, ES/VS & Holm-Bonferroni (Deliverable 5)."""

from __future__ import annotations

import itertools
import math
from collections.abc import Sequence
from dataclasses import dataclass


class SourceCannotSpeakAsOfError(RuntimeError):
    """Raised on any attempt to ingest rows visible_at > decision_timestamp_utc (AP-12)."""


@dataclass(frozen=True, slots=True)
class BitemporalRecord:
    """Stamped feature/odds observation guarded against future lookahead."""

    record_id: str
    season: int
    week: int
    visible_at_utc: int
    forecast_init_utc: int
    payload: float


@dataclass(frozen=True, slots=True)
class CpcvFold:
    """Purged & embargoed chronological cross-validation split grouped by (Season, Week)."""

    fold_id: int
    train_weeks: tuple[tuple[int, int], ...]
    test_weeks: tuple[tuple[int, int], ...]
    purged_weeks: tuple[tuple[int, int], ...]


def enforce_bitemporal_asof_freeze(
    records: Sequence[BitemporalRecord],
    *,
    decision_timestamp_utc: int,
    strict_fail: bool = True,
) -> list[BitemporalRecord]:
    """Ensure only information strictly observable at or before decision_t enters features."""
    out: list[BitemporalRecord] = []
    cutoff = int(decision_timestamp_utc)
    for rec in records:
        if rec.visible_at_utc > cutoff or rec.forecast_init_utc > cutoff:
            if strict_fail:
                raise SourceCannotSpeakAsOfError(
                    f"Record {rec.record_id} leaked future timestamp "
                    f"(visible={rec.visible_at_utc}, init={rec.forecast_init_utc} > {cutoff})."
                )
            continue
        out.append(rec)
    return out


def build_purged_embargoed_cpcv_folds(
    season_weeks: Sequence[tuple[int, int]],
    *,
    test_block_len: int = 2,
    purge_weeks: int = 3,
    embargo_weeks: int = 1,
) -> list[CpcvFold]:
    """Generate (Season, Week)-grouped CPCV folds with 3-week purge + 1-week embargo."""
    unique_sw = sorted(set((int(s), int(w)) for s, w in season_weeks))
    n = len(unique_sw)
    folds: list[CpcvFold] = []
    if n < test_block_len + purge_weeks + 2:
        return folds

    chunks = [
        list(range(start, min(n, start + test_block_len)))
        for start in range(0, n, max(1, int(test_block_len)))
        if len(range(start, min(n, start + test_block_len))) > 0
    ]
    n_groups = len(chunks)
    if n_groups < 2:
        return folds

    fold_idx = 0
    for g1, g2 in itertools.combinations(range(n_groups), 2):
        test_idx_set = set(chunks[g1]) | set(chunks[g2])
        purge_idx_set: set[int] = set()
        for g_idx in (g1, g2):
            c_start = chunks[g_idx][0]
            c_end = chunks[g_idx][-1] + 1
            for p_i in range(max(0, c_start - purge_weeks), c_start):
                if p_i not in test_idx_set:
                    purge_idx_set.add(p_i)
            for p_i in range(c_end, min(n, c_end + purge_weeks + embargo_weeks)):
                if p_i not in test_idx_set:
                    purge_idx_set.add(p_i)

        test_set = {unique_sw[i] for i in test_idx_set}
        purge_set = {unique_sw[i] for i in purge_idx_set}
        train_sw = tuple(sw for sw in unique_sw if sw not in test_set and sw not in purge_set)
        if train_sw:
            folds.append(
                CpcvFold(
                    fold_id=fold_idx,
                    train_weeks=train_sw,
                    test_weeks=tuple(sorted(test_set)),
                    purged_weeks=tuple(sorted(purge_set)),
                )
            )
            fold_idx += 1
    return folds


def energy_score(ensemble_draws: Sequence[Sequence[float]], target_y: Sequence[float]) -> float:
    """Compute multivariate proper Energy Score ES(F, y) = E||X-y|| - 0.5 E||X-X'||."""
    m = len(ensemble_draws)
    d = len(target_y)
    if m < 2 or d == 0:
        raise ValueError("Need m >= 2 multivariate ensemble draws.")
    t_sum = 0.0
    for x in ensemble_draws:
        t_sum += math.sqrt(sum((float(x[k]) - float(target_y[k])) ** 2 for k in range(d)))
    term1 = t_sum / float(m)

    pair_sum = 0.0
    for i in range(m):
        xi = ensemble_draws[i]
        for j in range(i + 1, m):
            xj = ensemble_draws[j]
            pair_sum += 2.0 * math.sqrt(sum((float(xi[k]) - float(xj[k])) ** 2 for k in range(d)))
    term2 = pair_sum / float(2 * m * m)
    return max(0.0, term1 - term2)


def variogram_score_p05(
    ensemble_draws: Sequence[Sequence[float]],
    target_y: Sequence[float],
    *,
    p: float = 0.5,
) -> float:
    """Compute multivariate Variogram Score of order p=0.5 (Scheuerer & Hamill 2015)."""
    m = len(ensemble_draws)
    d = len(target_y)
    if m < 2 or d < 2:
        raise ValueError("Need m >= 2 draws and d >= 2 variables for Variogram Score.")
    total = 0.0
    for i in range(d):
        for j in range(i + 1, d):
            obs_diff = abs(float(target_y[i]) - float(target_y[j])) ** p
            ens_diff = sum(
                abs(float(x[i]) - float(x[j])) ** p for x in ensemble_draws
            ) / float(m)
            total += 2.0 * ((obs_diff - ens_diff) ** 2)
    return total


def holm_bonferroni_stepdown(p_values: Sequence[float], alpha: float = 0.05) -> list[bool]:
    """Return boolean acceptance flags clearing Holm-Bonferroni p_{(j)} <= alpha / (M - j + 1)."""
    m = len(p_values)
    if m == 0:
        return []
    indexed = sorted(enumerate(float(p) for p in p_values), key=lambda kv: kv[1])
    accepted = [False] * m
    for rank_0, (orig_idx, p_val) in enumerate(indexed):
        thresh = float(alpha) / float(m - rank_0)
        if p_val <= thresh:
            accepted[orig_idx] = True
        else:
            break
    return accepted
