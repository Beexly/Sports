# Provenance: c06 deep research buildable-systems.md §2.2.
# The plugin mechanism itself is INFERENCE (no corpus source specifies one);
# the d07 spec's "run manifests" discipline is the closest in-corpus precedent.

"""importlib-based extractor discovery: import every module under extractors/
so @register decorators fire, then return REGISTRY."""

from __future__ import annotations

import importlib
import pkgutil

from . import REGISTRY
from . import base  # noqa: F401  (ensures base symbols importable)


def discover(package_name: str = __package__) -> dict:
    """Import all extractor modules under the package and return the registry."""
    pkg = importlib.import_module(package_name)
    for mod_info in pkgutil.iter_modules(pkg.__path__):
        if mod_info.name in ("base", "discover", "pipeline"):
            continue
        importlib.import_module(f"{package_name}.{mod_info.name}")
    return REGISTRY
