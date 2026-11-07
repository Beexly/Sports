"""Unified GSE Engine namespace bridging intelligence/engine and root engine packages."""
from pathlib import Path

_ROOT_ENGINE = str(Path(__file__).resolve().parents[2] / "engine")
if _ROOT_ENGINE not in __path__:
    __path__.append(_ROOT_ENGINE)
