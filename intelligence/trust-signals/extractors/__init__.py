# Provenance: c06 deep research buildable-systems.md §2.2 (registration/discovery).
# v1: stdlib only.

"""Extractor registry: register decorator + REGISTRY. Discovery lives in discover.py."""

from __future__ import annotations

from .base import TrustExtractor

REGISTRY: dict[str, type[TrustExtractor]] = {}


def register(cls: type[TrustExtractor]) -> type[TrustExtractor]:
    """Class decorator registering a TrustExtractor subclass by name."""
    assert getattr(cls, "name", None), f"{cls.__name__} must set name"
    assert getattr(cls, "version", None), f"{cls.__name__} must set version"
    assert getattr(cls, "input_kinds", None), f"{cls.__name__} must set input_kinds"
    assert cls.name not in REGISTRY, f"duplicate extractor name: {cls.name}"
    REGISTRY[cls.name] = cls
    return cls
