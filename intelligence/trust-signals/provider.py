# Provenance: gse-intelligence-build/contracts/integration-contracts.md §1
# (TrustSignalProvider ABC; TrustSignal shape; frozen dataclasses; verification on
# every numeric claim; None + data_gap for missing data). Verified in
# deep/c05/verified-claims.md §4.
# Implements buildable-systems.md System 5. Syntheses.md S7: signal_origin VIDEO is
# reserved for c06's video/social extraction framework writing the same shape.
# Honesty: challenges.md C12/S8 — live=False (shadow) by default; served signals
# are marked shadow=True until a deliberate, logged promotion.

"""TrustSignalProvider: serves decayed, trust-weighted signals to the reasoning layer.

The integration contract's ABCs live in integration/providers.py (c09's module,
not yet written). This module defines a local ABC mirroring that contract exactly
so the provider is usable now; c09 should re-export or subclass it.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from . import decay as decay_mod
from .models import SignalOrigin, TrustSignal, TrustTier, Verification, utcnow
from .sources import SOURCES, get_source
from .store import IntakeStore
from .tipster import TipsterBoard


class TrustSignalProviderABC(ABC):
    """Mirrors integration-contracts.md §1. c09's integration/providers.py owns the
    canonical version; this ABC is signature-identical."""

    @abstractmethod
    def get_trust_signals(self, team: str, week: int, season: int) -> list[TrustSignal]:
        """Trust signals for a team/week/season. Empty list = no data (the
        checklist layer maps this to DATA-GAP, never to a silent zero)."""


class FileStoreTrustSignalProvider(TrustSignalProviderABC):
    """Provider backed by the IntakeStore.

    At query time each signal's served weight = magnitude × freshness_decay ×
    tipster_weight. Decay is computed, never stored (signals are frozen facts).
    """

    def __init__(
        self,
        store: IntakeStore,
        board: TipsterBoard | None = None,
        live: bool = False,
        now: datetime | None = None,
    ):
        self.store = store
        self.live = live
        self._now = now
        self.board = board or TipsterBoard(
            {s.handle: s.trust_tier for s in SOURCES}
        )

    def _now_dt(self) -> datetime:
        return self._now or utcnow()

    def _served_weight(self, s: TrustSignal) -> float:
        now = self._now_dt()
        decayed = decay_mod.decayed_weight(s.magnitude, s.signal_type, s.observed_at, now)
        tier = get_source(s.source_handle).trust_tier if self._known(s.source_handle) else TrustTier.T3_NATIONAL
        return round(decayed * self.board.weight_for(s.source_handle, tier), 6)

    @staticmethod
    def _known(handle: str) -> bool:
        try:
            get_source(handle)
            return True
        except KeyError:
            return False

    def get_trust_signals(self, team: str, week: int, season: int) -> list[TrustSignal]:
        """Signals for the team, decayed + trust-weighted, strongest first.

        week/season scope future game-date filtering; currently all stored
        signals for the team are returned (decay handles staleness). Signals
        whose entity resolution failed (data_gap set) are excluded — the
        checklist layer must see DATA-GAP, not a team-less signal.
        """
        out: list[TrustSignal] = []
        for d in self.store.signals_for_team(team):
            if d.get("data_gap"):
                continue
            sig = self._dict_to_signal(d)
            out.append(sig)
        # Attach served weight via a lightweight wrapper dict? No — keep the
        # frozen dataclass pure. Consumers that need the weight call served_weight().
        out.sort(key=self._served_weight, reverse=True)
        return out

    def served_weight(self, signal: TrustSignal) -> float:
        """The query-time weight for one signal (magnitude × decay × tipster)."""
        return self._served_weight(signal)

    def _dict_to_signal(self, d: dict) -> TrustSignal:
        from .models import SignalType, TrackTag, TrustDirection, SpeakerRole, CalibrationState

        def dt(v):
            return datetime.fromisoformat(v) if isinstance(v, str) else v

        def enum_or(cls, v, default):
            try:
                return cls(v)
            except (ValueError, TypeError):
                return default

        return TrustSignal(
            signal_id=d["signal_id"],
            team=d.get("team"),
            player_id=d.get("player_id"),
            player_name=d.get("player_name"),
            signal_type=SignalType(d["signal_type"]),
            signal_origin=SignalOrigin(d.get("signal_origin", "text")),
            text=d.get("text", ""),
            source_handle=d.get("source_handle", ""),
            source_url=d.get("source_url"),
            observed_at=dt(d["observed_at"]),
            verification=Verification(d.get("verification", "INFERENCE")),
            track_tags=tuple(TrackTag(t) for t in d.get("track_tags", [])),
            polarity=float(d.get("polarity", 0.0)),
            magnitude=float(d.get("magnitude", 0.0)),
            provenance_gap=d.get("provenance_gap"),
            data_gap=d.get("data_gap"),
            shadow=not self.live,
            # --- c06 v1.1.0 extension: all defaulted, old rows read unchanged ---
            schema_version=d.get("schema_version", "1.0.0"),
            extractor_name=d.get("extractor_name"),
            extractor_version=d.get("extractor_version"),
            speaker_id=d.get("speaker_id"),
            speaker_name=d.get("speaker_name"),
            speaker_role=enum_or(SpeakerRole, d.get("speaker_role"), SpeakerRole.UNKNOWN),
            target_id=d.get("target_id"),
            target_name=d.get("target_name"),
            quote_text=d.get("quote_text"),
            claim_text=d.get("claim_text"),
            claim_stance=d.get("claim_stance"),
            story_cluster_id=d.get("story_cluster_id"),
            role_weight=float(d.get("role_weight", 1.0)),
            extraction_confidence=float(d.get("extraction_confidence", 0.0)),
            frozen_pre_kickoff=d.get("frozen_pre_kickoff"),
            supersedes=d.get("supersedes"),
            correction_of=d.get("correction_of"),
            calibration_state=enum_or(CalibrationState, d.get("calibration_state"),
                                      CalibrationState.UNCALIBRATED),
            trust_direction=enum_or(TrustDirection, d.get("trust_direction"),
                                    TrustDirection.UNKNOWN),
            merged_provenance=tuple(d.get("merged_provenance", [])),
            dedup_of=d.get("dedup_of"),
        )
