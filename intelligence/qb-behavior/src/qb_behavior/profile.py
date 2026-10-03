# Provenance: the machine-readable profile object.
# Implements: reasoning-depth-spec.md §6.2 verification enum
# (CORPUS/COMPUTED/SINGLE_SOURCE/INFERENCE) — every value the engine emits
# carries one; §5 Track 1 (QB behavioral profile) is served from here.
# Extends: qb-behavioral-profiles/code/gen_profiles.py (markdown rendering
# becomes a view over QBProfile, not the store).
"""Structured QB behavioral profiles with verification statuses."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class Verification(str, Enum):
    """Closed enum per reasoning-depth-spec §6.2."""
    CORPUS = "CORPUS"            # ingested from sourced data; traceable to file/row
    COMPUTED = "COMPUTED"        # derived by this engine; reproducible
    SINGLE_SOURCE = "SINGLE_SOURCE"  # one outlet, uncorroborated; never load-bearing unflagged
    INFERENCE = "INFERENCE"      # model judgment; must carry a breaking condition


@dataclass
class MetricValue:
    """One profile number with its provenance."""
    value: Any
    verification: Verification = Verification.COMPUTED
    n: int | None = None          # sample size behind the value
    source: str = ""              # file/row or computation name
    note: str = ""                # caveats, breaking conditions for INFERENCE
    ci_low: float | None = None   # Wilson interval where applicable
    ci_high: float | None = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["verification"] = self.verification.value
        return d


@dataclass
class SeasonProfile:
    """One QB-season of behavioral metrics."""
    season: int
    qb_id: str
    qb_name: str
    dropbacks: int
    metrics: dict[str, MetricValue] = field(default_factory=dict)

    def get(self, key: str) -> MetricValue | None:
        return self.metrics.get(key)

    def to_dict(self) -> dict:
        return {
            "season": self.season, "qb_id": self.qb_id, "qb_name": self.qb_name,
            "dropbacks": self.dropbacks,
            "metrics": {k: v.to_dict() for k, v in self.metrics.items()},
        }


@dataclass
class QBProfile:
    """The behavioral profile for one QB: all qualifying seasons + form."""
    qb_id: str
    qb_name: str
    seasons: list[SeasonProfile] = field(default_factory=list)
    rolling_form: list[dict] = field(default_factory=list)  # game-ordered form rows
    engine_version: str = "0.1.0"

    def season(self, year: int) -> SeasonProfile | None:
        for s in self.seasons:
            if s.season == year:
                return s
        return None

    def latest(self) -> SeasonProfile | None:
        return max(self.seasons, key=lambda s: s.season) if self.seasons else None

    def weak_links(self) -> list[str]:
        """Metric keys whose verification is INFERENCE or SINGLE_SOURCE —
        the L4 weak-link flag (reasoning-depth-spec T5)."""
        out = []
        for s in self.seasons:
            for k, m in s.metrics.items():
                if m.verification in (Verification.INFERENCE, Verification.SINGLE_SOURCE):
                    out.append(f"{s.season}.{k}")
        return out

    def to_dict(self) -> dict:
        return {
            "qb_id": self.qb_id, "qb_name": self.qb_name,
            "engine_version": self.engine_version,
            "seasons": [s.to_dict() for s in self.seasons],
            "rolling_form": self.rolling_form,
        }

    def to_markdown(self) -> str:
        """Human-readable rendering (replaces gen_profiles.py output shape)."""
        L = [f"# QB Behavioral Profile: {self.qb_name}",
             f"\nEngine v{self.engine_version}. Seasons: "
             f"{min((s.season for s in self.seasons), default='—')}–"
             f"{max((s.season for s in self.seasons), default='—')}."]
        for s in sorted(self.seasons, key=lambda x: x.season):
            L.append(f"\n## {s.season} ({s.dropbacks} dropbacks)")
            for k, m in s.metrics.items():
                n = f" n={m.n}" if m.n is not None else ""
                L.append(f"- {k}: {m.value}{n} [{m.verification.value}]"
                         + (f" — {m.note}" if m.note else ""))
        wl = self.weak_links()
        if wl:
            L.append("\n## Weak links (INFERENCE/SINGLE_SOURCE — flag at L4)")
            L += [f"- {w}" for w in wl]
        return "\n".join(L) + "\n"
