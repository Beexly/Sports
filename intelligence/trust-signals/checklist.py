# Provenance: c06 deep research buildable-systems.md §1.5 (checklist sweep output)
# and B7. Research basis: reasoning-depth-spec §5 (mandatory track, verdict
# enum, gate rules) and §8 T2 (verbatim: team with no signals -> DATA-GAP, not
# UNCHECKED, not silent; worst_plausible_assumption recorded); contracts §3
# (precedence, DATA-GAP handling). This is what the reasoning layer's
# validate_checklist calls for the trust_signals track. v1: stdlib only.

"""Trust checklist sweep: provider signals -> TrustScore -> TrustSweep verdict.

Verdict logic:
- no signals -> DATA-GAP (never UNCHECKED at L3+; T2 verbatim)
- any group with direction CONFLICT -> CONFLICT (names the story_cluster_ids)
- aligned multi-cluster experts (n_clusters >= 2, consensus_hhi >= hhi_clear)
  -> CLEAR
- otherwise (checked but thin / single-cluster only) -> NOTHING-MATERIAL
  ("silence is not evidence" — recorded, not silent)
"""

from __future__ import annotations

from dataclasses import dataclass, field

from reasoning.enums import ChecklistVerdict

from .models import TrustDirection, Verification
from .scoring import AGG_DEFAULTS, TrustScore, aggregate_all


@dataclass(frozen=True)
class TrustSweep:
    """Checklist output for the trust_signals track (spec §5, T2)."""
    team: str
    week: int
    season: int
    verdict: ChecklistVerdict
    n_signals: int
    n_scores: int
    top_scores: tuple[TrustScore, ...] = ()   # by |trust_score| * precision, max 5
    conflicts: tuple[str, ...] = ()           # story_cluster_ids with CONFLICT
    data_gap_note: str | None = None          # set when verdict == DATA-GAP
    worst_plausible_assumption: str | None = None  # DATA-GAP + load-bearing (T2)
    verification: Verification = Verification.INFERENCE


def _precision(score: TrustScore) -> float:
    return 1.0 / (score.width ** 2) if score.width > 0 else 0.0


def sweep_trust_signals(team: str, week: int, season: int,
                        provider, scorer=aggregate_all,
                        load_bearing: bool = True,
                        defaults: dict | None = None) -> TrustSweep:
    """Run the trust-signals checklist sweep for one team/week/season.

    provider: TrustSignalProviderABC (get_trust_signals). scorer: aggregate_all.
    T2: zero signals -> DATA-GAP with worst_plausible_assumption, never
    UNCHECKED and never a silent zero.
    """
    defaults = defaults or AGG_DEFAULTS
    signals = [s for s in provider.get_trust_signals(team, week, season)
               if not s.dedup_of]

    if not signals:
        return TrustSweep(
            team=team, week=week, season=season,
            verdict=ChecklistVerdict.DATA_GAP,
            n_signals=0, n_scores=0,
            data_gap_note=(f"trust_signals: no signals for {team} week {week} "
                           f"{season} — no press-conference, clip, or social "
                           f"items ingested for this team/week"),
            worst_plausible_assumption=(
                "assume neutral-to-negative QB-WR trust; the adversary treats "
                "trust as unknown-negative for concentration props"
                if load_bearing else None),
        )

    scores = scorer(signals, defaults=defaults)
    top = tuple(sorted(scores, key=lambda s: abs(s.trust_score) * _precision(s),
                       reverse=True)[:5])
    conflicts = tuple(sorted({c for s in scores
                              if s.direction == TrustDirection.CONFLICT
                              for c in s.story_cluster_ids}))
    if conflicts:
        verdict = ChecklistVerdict.CONFLICT
    elif any(s.n_clusters >= 2 and s.consensus_hhi >= defaults["hhi_clear"]
             for s in scores):
        verdict = ChecklistVerdict.CLEAR
    else:
        verdict = ChecklistVerdict.NOTHING_MATERIAL

    return TrustSweep(
        team=team, week=week, season=season, verdict=verdict,
        n_signals=len(signals), n_scores=len(scores),
        top_scores=top, conflicts=conflicts,
    )
