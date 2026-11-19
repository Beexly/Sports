"""Atomic mmap-ready trajectory checkpointing inspired by google/orbax & google/flatbuffers.

Eliminates repeated 1,750,000-snap recalculation during T-90m pre-kickoff
differential adjustments by atomically committing uncompressed float32/float64
NumPy buffers alongside a SHA-256 integrity manifest and zero-copy mmap loads.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import numpy as np


class CheckpointIntegrityError(ValueError):
    """Raised when a trajectory checkpoint fails SHA-256 or manifest verification."""


@dataclass(frozen=True, slots=True)
class TrajectoryCheckpointMetadata:
    """Verified trajectory checkpoint descriptor."""

    checkpoint_id: str
    season: int
    week: int
    matchup: str
    n_worlds: int
    n_snaps: int
    sha256: str
    created_utc: str


def _sha256_file(path: Path) -> str:
    """Computes hex SHA-256 digest of a binary file using chunked reads."""
    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(65_536)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def _validate_checkpoint_id(checkpoint_id: str) -> None:
    """Ensures checkpoint_id is a single safe directory name (no path traversal)."""
    if (
        not checkpoint_id
        or checkpoint_id in {".", ".."}
        or ".." in checkpoint_id
        or "/" in checkpoint_id
        or "\\" in checkpoint_id
    ):
        raise ValueError("checkpoint_id must be a single path-safe identifier.")


class TrajectoryCheckpointer:
    """Manages atomic save and verified mmap load of simulated world tensors."""

    def __init__(self, root_dir: Path | str) -> None:
        """Initializes checkpoint directory storage."""
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def save(
        self,
        checkpoint_id: str,
        arrays: Mapping[str, np.ndarray],
        *,
        season: int,
        week: int,
        matchup: str,
    ) -> TrajectoryCheckpointMetadata:
        """Atomically persists trajectory arrays with per-tensor SHA-256 verification."""
        _validate_checkpoint_id(checkpoint_id)
        if not arrays:
            raise ValueError("arrays mapping must contain at least one NumPy tensor.")

        target_dir = self.root_dir / checkpoint_id
        target_dir.mkdir(parents=True, exist_ok=True)

        array_manifest: dict[str, dict[str, object]] = {}
        first_shape = (0, 0)
        for idx, (name, arr) in enumerate(sorted(arrays.items())):
            if not name.isidentifier():
                raise ValueError(f"Invalid array buffer name: {name!r}")
            tensor = np.ascontiguousarray(arr)
            if idx == 0:
                n_worlds = int(tensor.shape[0]) if tensor.ndim >= 1 else 0
                n_snaps = int(tensor.shape[1]) if tensor.ndim >= 2 else 1
                first_shape = (n_worlds, n_snaps)

            tmp_npy = target_dir / f"{name}.tmp.npy"
            final_npy = target_dir / f"{name}.npy"
            with tmp_npy.open("wb") as fh:
                np.save(fh, tensor, allow_pickle=False)
            os.replace(tmp_npy, final_npy)

            array_manifest[name] = {
                "filename": final_npy.name,
                "shape": list(tensor.shape),
                "dtype": str(tensor.dtype),
                "sha256": _sha256_file(final_npy),
            }

        created_utc = datetime.now(UTC).isoformat()
        canonical_arrays = json.dumps(array_manifest, sort_keys=True).encode("utf-8")
        digest = hashlib.sha256(canonical_arrays).hexdigest()

        manifest = {
            "schema": "gse-trajectory-checkpoint-v1",
            "checkpoint_id": checkpoint_id,
            "season": season,
            "week": week,
            "matchup": matchup,
            "n_worlds": first_shape[0],
            "n_snaps": first_shape[1],
            "sha256": digest,
            "created_utc": created_utc,
            "arrays": array_manifest,
        }
        tmp_manifest = target_dir / "manifest.tmp.json"
        final_manifest = target_dir / "manifest.json"
        tmp_manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
        os.replace(tmp_manifest, final_manifest)

        return TrajectoryCheckpointMetadata(
            checkpoint_id=checkpoint_id,
            season=season,
            week=week,
            matchup=matchup,
            n_worlds=first_shape[0],
            n_snaps=first_shape[1],
            sha256=digest,
            created_utc=created_utc,
        )

    def load(
        self,
        checkpoint_id: str,
        *,
        mmap: bool = True,
    ) -> tuple[TrajectoryCheckpointMetadata, dict[str, np.ndarray]]:
        """Verifies SHA-256 manifest integrity and loads tensors (mmap by default)."""
        _validate_checkpoint_id(checkpoint_id)
        target_dir = (self.root_dir / checkpoint_id).resolve()
        manifest_path = target_dir / "manifest.json"
        if not manifest_path.is_file():
            raise CheckpointIntegrityError(f"Missing checkpoint manifest for {checkpoint_id!r}.")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        arrays_spec = manifest.get("arrays")
        if not isinstance(arrays_spec, dict):
            raise CheckpointIntegrityError("Malformed arrays entry in checkpoint manifest.")

        expected_digest = hashlib.sha256(
            json.dumps(arrays_spec, sort_keys=True).encode("utf-8")
        ).hexdigest()
        if expected_digest != manifest.get("sha256"):
            raise CheckpointIntegrityError("Manifest SHA-256 checksum mismatch.")

        loaded: dict[str, np.ndarray] = {}
        mmap_mode: Literal["r"] | None = "r" if mmap else None
        for name, spec in arrays_spec.items():
            filename = str(spec["filename"])
            npy_path = (target_dir / filename).resolve()
            if npy_path.parent != target_dir or not npy_path.is_file():
                raise CheckpointIntegrityError(f"Invalid or missing array buffer {filename!r}.")
            actual_sha = _sha256_file(npy_path)
            if actual_sha != spec.get("sha256"):
                raise CheckpointIntegrityError(f"Checksum mismatch for buffer {name!r}.")
            loaded[name] = np.load(npy_path, mmap_mode=mmap_mode, allow_pickle=False)

        meta = TrajectoryCheckpointMetadata(
            checkpoint_id=str(manifest["checkpoint_id"]),
            season=int(manifest["season"]),
            week=int(manifest["week"]),
            matchup=str(manifest["matchup"]),
            n_worlds=int(manifest["n_worlds"]),
            n_snaps=int(manifest["n_snaps"]),
            sha256=str(manifest["sha256"]),
            created_utc=str(manifest["created_utc"]),
        )
        return meta, loaded

    def list_checkpoints(self) -> list[TrajectoryCheckpointMetadata]:
        """Enumerates all valid checkpoint manifests in `root_dir`."""
        items: list[TrajectoryCheckpointMetadata] = []
        for child in sorted(self.root_dir.iterdir()):
            if not child.is_dir():
                continue
            mpath = child / "manifest.json"
            if not mpath.is_file():
                continue
            try:
                m = json.loads(mpath.read_text(encoding="utf-8"))
                items.append(
                    TrajectoryCheckpointMetadata(
                        checkpoint_id=str(m["checkpoint_id"]),
                        season=int(m["season"]),
                        week=int(m["week"]),
                        matchup=str(m["matchup"]),
                        n_worlds=int(m["n_worlds"]),
                        n_snaps=int(m["n_snaps"]),
                        sha256=str(m["sha256"]),
                        created_utc=str(m["created_utc"]),
                    )
                )
            except Exception:
                continue
        return items
