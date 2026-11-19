"""Unit tests for InProcessCacheGovernor, binary envelope framing, and gVisor profile."""

from __future__ import annotations

import pytest

from gse_engine.storage.cache_and_sandbox_governor import (
    InProcessCacheGovernor,
    build_gvisor_runsc_profile,
    pack_flatbuffer_envelope,
    unpack_flatbuffer_envelope,
)


def test_inprocess_cache_governor_evicts_lru_and_expires_ttl() -> None:
    """Tracks hits, misses, TTL expiry, and capacity evictions deterministically."""
    cache = InProcessCacheGovernor(max_entries=2, default_ttl_s=60.0)
    cache.put("k1", "v1", now_epoch_s=100.0)
    cache.put("k2", "v2", now_epoch_s=101.0)
    assert cache.get("k1", now_epoch_s=102.0) == "v1"
    cache.put("k3", "v3", now_epoch_s=103.0)
    assert cache.get("k2", now_epoch_s=104.0) is None
    assert cache.get("k1", now_epoch_s=200.0) is None
    stats = cache.stats()
    assert stats.hits == 1
    assert stats.misses == 2
    assert stats.evictions == 1


def test_flatbuffer_envelope_roundtrip_and_tamper_detection() -> None:
    """Verifies CRC32 tamper rejection and zero-corruption payload recovery."""
    packed = pack_flatbuffer_envelope("pbp.trajectory.v1", b'{"worlds":10000}')
    tag, payload, digest = unpack_flatbuffer_envelope(packed)
    assert tag == "pbp.trajectory.v1"
    assert payload == b'{"worlds":10000}'
    assert len(digest) == 64

    corrupted = bytearray(packed)
    corrupted[15] ^= 0xFF
    with pytest.raises(ValueError, match="CRC32"):
        unpack_flatbuffer_envelope(bytes(corrupted))


def test_gvisor_runsc_profile_enforces_network_none() -> None:
    """Ensures untrusted worker profiles isolate network and root filesystem."""
    args = build_gvisor_runsc_profile("gse-ml-worker", memory_mb=2048)
    assert args[0] == "runsc"
    assert "--network=none" in args
    assert "--read-only" in args
    assert "--memory-limit-mb=2048" in args
