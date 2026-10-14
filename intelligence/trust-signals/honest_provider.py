"""Honest trust provider: empty intake -> DATA-GAP, not CLEAR.

Fixes the silent-CLEAR trap measured earlier this session:
    trust=None                    -> UNCHECKED -> ChecklistInvalid (14/14 withheld)
    FileStoreTrustSignalProvider  -> CLEAR when store empty  -> L5/FINAL on no data
This provider's get_trust_signals raises DataGapError when the intake store has
never been populated (no signals for the team AND the store root has no signal
files at all), so api.py:352 records trust_signals=DATA-GAP — recorded, not
rejected, and never a silent CLEAR.

The distinguishing question is: has the intake EVER run? A store that ran and
found nothing for this team is legitimately CLEAR (swept, nothing material).
A store that never ran is DATA-GAP. IntakeStore keeps signals under
<root>/<handle>/*.json; an empty root means never ran.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any


class HonestTrustSignalProvider:
    """Wraps FileStoreTrustSignalProvider; distinguishes never-ran from swept."""

    name = "honest-trust"
    is_mock = False

    def __init__(self, store: Any, inner: Any = None) -> None:
        self._inner = inner
        self._store = store

    @property
    def root(self) -> Path | None:
        return getattr(self._store, "root", None)

    def _store_ever_populated(self) -> bool:
        root = self.root
        if root is None:
            return False
        root = Path(root)
        if not root.exists():
            return False
        # any .md/.json under any handle dir means the intake wrote something
        for _p in root.rglob("*"):
            if _p.is_file() and _p.suffix in (".md", ".json", ".jsonl"):
                return True
        return False

    def get_trust_signals(self, team: str, week: int, season: int) -> list:
        if not self._store_ever_populated():
            from integration.providers import DataGapError
            raise DataGapError(
                "trust_signals",
                f"trust intake has never been populated (store root "
                f"{self.root} empty) - never-ran is DATA-GAP, not CLEAR")
        if self._inner is not None:
            return self._inner.get_trust_signals(team, week, season)
        from .provider import FileStoreTrustSignalProvider
        return FileStoreTrustSignalProvider(store=self._store).get_trust_signals(team, week, season)

    def _store_signals(self, team: str) -> list:
        return self._store.signals_for_team(team)


def wrap(store: Any, inner: Any = None) -> HonestTrustSignalProvider:
    return HonestTrustSignalProvider(store=store, inner=inner)
