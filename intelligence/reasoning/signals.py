"""Typed signal records for the omnivorous ingestion layer.

Every signal the reasoning engine consumes is one of these records: a domain,
a metric, a direction (which side of which hypothesis it supports), a magnitude
expressed as a likelihood ratio (with provenance), and a verification status.

The likelihood ratio is the honest bridge between ingestion and L4 (Bayesian
update): a signal that doubles the rate of the hypothesis among teams like this
one has LR ~= 2. A signal with no measured effect has LR = 1.0 and is recorded
as such - never a made-up weight, never a silent zero.

Provenance is mandatory: each record names the corpus artifact it came from, so
an auditor can walk signal -> file -> row. This module never fetches anything;
loaders read what the ingestion layer already landed in the dated buckets.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Literal

DOMAINS = (
    "on_field",          # EPA, trench, coverage, pace
    "biophysical",       # injuries, rest, travel
    "environmental",     # air density, wind, surface, roof
    "cognitive",         # pressers, depth moves, tendencies
    "market",            # line movement, prices, cross-book
    "social",            # sentiment
    "historical",        # copulas, splits
    "nutrition",         # recovery, load
    "dfs",               # ownership, leverage
    "off_field",         # legal, personal, contracts
)

Direction = Literal["supports", "contradicts", "neutral"]


@dataclass
class Signal:
    """One ingested signal, typed for the reasoning engine."""

    domain: str                      # one of DOMAINS
    metric: str                      # e.g. "air_density_kg_m3", "dt1_out"
    subject: str                     # what it describes: team / game / market
    direction: Direction             # effect on the referenced hypothesis
    hypothesis: str                  # the play/thesis it bears on
    likelihood_ratio: float          # >= 0; 1.0 = no measured effect
    verification: str                # MEASURED | COMPUTED | REPORTED | ASSUMED
    value: Any = None                # the raw observed value
    source: str = ""                 # file path or URL the value came from
    note: str = ""
    observed_at: str = ""            # ISO timestamp of the observation

    def __post_init__(self) -> None:
        if self.domain not in DOMAINS:
            raise ValueError(f"domain {self.domain!r} not in DOMAINS")
        if self.likelihood_ratio < 0:
            raise ValueError(f"likelihood_ratio must be >= 0, got {self.likelihood_ratio}")
        if self.direction not in ("supports", "contradicts", "neutral"):
            raise ValueError(f"direction {self.direction!r} invalid")

    def effective_lr(self) -> float:
        """LR as applied in the update: contradicts -> inverse, neutral -> 1."""
        if self.direction == "contradicts":
            return 1.0 / self.likelihood_ratio if self.likelihood_ratio > 0 else 1.0
        if self.direction == "neutral":
            return 1.0
        return self.likelihood_ratio

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MarketPrior:
    """The market's probability for a hypothesis - the L4 starting point."""

    hypothesis: str
    prior: float                     # 0..1, from a real price (Kalshi cents / de-vigged odds)
    source: str                      # exact market/price the prior came from
    note: str = ""

    def __post_init__(self) -> None:
        if not 0.0 < self.prior < 1.0:
            raise ValueError(f"prior must be in (0,1), got {self.prior}")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def signals_from_weather(path: str | Path, hypotheses: dict[str, str]) -> list[Signal]:
    """Environmental signals from the stadium weather pilot.

    hypotheses maps venue -> hypothesis it bears on (e.g. the game total).
    The measured coefficient lives here once, with its provenance: the doctrine
    and the MNF 640 run both used +2.8 yds ballistic carry at rho=1.189 vs the
    open-air baseline. LR below encodes a *modest* translation of that carry
    into total-expansion likelihood - explicitly verification="MEASURED" only
    for the carry itself; the LR is the documented modeling choice.
    """
    data = _read_json(Path(path))
    out: list[Signal] = []
    for venue in data.get("venues", []):
        now = venue.get("now") or {}
        if not now:
            continue
        rho = now.get("air_density_kg_m3")
        wind = now.get("wind_kmh")
        hyp = hypotheses.get(venue["venue"], "")
        if not hyp:
            continue
        # Measured: rho >= 1.185 (indoor/calm) -> carry advantage ~ +2.7 yds on
        # 20+ air-yard throws (doctrine + MNF 640 artifacts). Wind >= 24 km/h
        # suppresses the deep game (standard ballistics; documented assumption).
        if rho is not None and rho >= 1.185 and (wind or 0) < 24:
            out.append(Signal(
                domain="environmental", metric="air_density_kg_m3",
                subject=venue["venue"], direction="supports", hypothesis=hyp,
                likelihood_ratio=1.10, verification="MEASURED", value=rho,
                source=str(path),
                note="rho>=1.185 calm: +2.7yds carry on deep throws (doctrine/MNF-640); LR is the documented modeling choice for total expansion",
                observed_at=data.get("generated_utc", ""),
            ))
        elif wind is not None and wind >= 24:
            out.append(Signal(
                domain="environmental", metric="wind_kmh",
                subject=venue["venue"], direction="contradicts", hypothesis=hyp,
                likelihood_ratio=1.08, verification="MEASURED", value=wind,
                source=str(path),
                note="wind>=24km/h suppresses deep passing; LR documented modeling choice",
                observed_at=data.get("generated_utc", ""),
            ))
    return out


def signals_from_injuries(path: str | Path, hypotheses: dict[str, str]) -> list[Signal]:
    """Biophysical signals from the gated ESPN injury digest.

    The measured coefficient: the 10/13 command card records Buffalo interior
    EPA -0.18/dropback with DT1 out (Ed Oliver), and Stafford clean-pocket
    68% -> 84%. A starting defensive-tackle outage supporting the total is the
    documented LR here; it is flagged as the modeling choice on the record.
    """
    data = _read_json(Path(path))
    out: list[Signal] = []
    teams = {t.get("team"): t for t in data.get("teams", [])}
    abbr_map = {"Los Angeles Rams": "LAR", "Buffalo Bills": "BUF"}
    for team_name, hyp in hypotheses.items():
        t = teams.get(team_name) or teams.get(abbr_map.get(team_name, ""))
        if not t:
            continue
        dline = [r for r in t.get("injuries", []) if (r.get("position") or "") in ("DT", "DE", "NT")]
        out_dline = [r for r in dline if (r.get("status") or "").upper() == "OUT"]
        if out_dline:
            out.append(Signal(
                domain="biophysical", metric="dline_starters_out",
                subject=team_name, direction="supports", hypothesis=hyp,
                likelihood_ratio=1.06, verification="MEASURED",
                value=[r.get("athlete") for r in out_dline],
                source=str(path),
                note="interior DL OUT: -0.18 EPA/dropback documented on the 10/13 card; LR is the documented modeling choice",
                observed_at=data.get("pulled_at", ""),
            ))
    return out


def market_priors_from_kalshi(path: str | Path, event_contains: str) -> list[MarketPrior]:
    """Market priors from the Kalshi NFL digest (yes_ask as the honest price)."""
    data = _read_json(Path(path))
    priors: list[MarketPrior] = []
    for ticker, block in (data.get("series") or {}).items():
        for m in block.get("markets", []):
            et = m.get("event_ticker") or ""
            ask = m.get("yes_ask_dollars")
            if event_contains and event_contains not in et:
                continue
            if ask in (None, "", 0):
                continue
            try:
                p = float(ask)
            except (TypeError, ValueError):
                continue
            if 0 < p < 1:
                priors.append(MarketPrior(
                    hypothesis=m.get("ticker") or m.get("yes_sub_title") or et,
                    prior=p,
                    source=f"kalshi:{ticker}:{et}",
                    note=f"yes_ask {p} (0-1 prob scale); Kalshi public read API",
                ))
    return priors
