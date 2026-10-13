"""Canonical doctrine name for the scheme primitive library.

The doctrine names this file `schemes.py`; the implementation lives in
`scheme.py`. Both import paths expose the same CATALOG object.
"""

from .scheme import CATALOG, select, MechanismEntry  # noqa: F401

__all__ = ["CATALOG", "select", "MechanismEntry"]
