"""Unit tests for atomic SHA-256 verified mmap trajectory checkpointing."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pytest

from gse_engine.storage.trajectory_checkpoint import (
    CheckpointIntegrityError,
    TrajectoryCheckpointer,
)


def test_atomic_save_and_mmap_load_roundtrip(tmp_path: Path) -> None:
    """Persists trajectory tensors cleanly and reloads zero-copy via mmap."""
    ckpt = TrajectoryCheckpointer(tmp_path)
    worlds = np.arange(200, dtype=np.float32).reshape(20, 10)
    mask = np.ones((20, 10), dtype=np.uint8)

    meta = ckpt.save(
        "s2026_w10_pit_cin",
        {"yards": worlds, "active": mask},
        season=2026,
        week=10,
        matchup="PIT@CIN",
    )

    assert meta.n_worlds == 20
    assert meta.n_snaps == 10
    assert len(meta.sha256) == 64
    assert [m.checkpoint_id for m in ckpt.list_checkpoints()] == ["s2026_w10_pit_cin"]

    loaded_meta, arrays = ckpt.load("s2026_w10_pit_cin", mmap=True)
    assert loaded_meta.sha256 == meta.sha256
    assert isinstance(arrays["yards"], np.memmap)
    assert np.array_equal(arrays["yards"], worlds)
    assert np.array_equal(arrays["active"], mask)


def test_refuses_corrupted_buffer_with_integrity_error(tmp_path: Path) -> None:
    """Bit-flipped checkpoint buffers must raise CheckpointIntegrityError on load."""
    ckpt = TrajectoryCheckpointer(tmp_path)
    ckpt.save(
        "tamper_case",
        {"yards": np.zeros((4, 4), dtype=np.float32)},
        season=2026,
        week=10,
        matchup="LAC@BAL",
    )

    buf_path = tmp_path / "tamper_case" / "yards.npy"
    data = bytearray(buf_path.read_bytes())
    data[-1] ^= 0xFF
    buf_path.write_bytes(bytes(data))

    with pytest.raises(CheckpointIntegrityError, match="Checksum mismatch"):
        ckpt.load("tamper_case", mmap=False)


def test_rejects_path_traversal_checkpoint_id_and_manifest_filename(tmp_path: Path) -> None:
    """Path traversal in checkpoint_id or tampered manifest filenames is blocked."""
    ckpt = TrajectoryCheckpointer(tmp_path)

    with pytest.raises(ValueError, match="path-safe identifier"):
        ckpt.save(
            "../escape",
            {"yards": np.zeros((2, 2), dtype=np.float32)},
            season=2026,
            week=10,
            matchup="PIT@CIN",
        )

    with pytest.raises(ValueError, match="path-safe identifier"):
        ckpt.load("../escape")

    target = tmp_path / "valid_case"
    target.mkdir(parents=True)
    escape_npy = tmp_path / "outside.npy"
    np.save(escape_npy, np.zeros((2, 2), dtype=np.float32), allow_pickle=False)
    arrays_spec = {
        "yards": {
            "filename": "../outside.npy",
            "shape": [2, 2],
            "dtype": "float32",
            "sha256": hashlib.sha256(escape_npy.read_bytes()).hexdigest(),
        }
    }
    digest = hashlib.sha256(json.dumps(arrays_spec, sort_keys=True).encode("utf-8")).hexdigest()
    (target / "manifest.json").write_text(
        json.dumps(
            {
                "checkpoint_id": "valid_case",
                "season": 2026,
                "week": 10,
                "matchup": "PIT@CIN",
                "n_worlds": 2,
                "n_snaps": 2,
                "sha256": digest,
                "created_utc": "2026-11-15T18:00:00Z",
                "arrays": arrays_spec,
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(CheckpointIntegrityError, match="Invalid or missing array buffer"):
        ckpt.load("valid_case", mmap=False)
