"""In-process CacheCloud telemetry, FlatBuffers envelope framing & gVisor runsc profiles."""

from __future__ import annotations

import hashlib
import struct
import zlib
from collections import OrderedDict
from dataclasses import dataclass

_MAGIC = b"GSEF"


@dataclass(frozen=True, slots=True)
class CacheStatsSnapshot:
    """Hit-rate and capacity telemetry avoiding external managed Redis spend."""

    hits: int
    misses: int
    evictions: int
    entries: int
    hit_rate: float


class InProcessCacheGovernor:
    """Bounded LRU+TTL in-process cache governor modeled after sohutv/cachecloud."""

    def __init__(self, max_entries: int = 512, default_ttl_s: float = 300.0) -> None:
        """Initializes bounded capacity and default TTL in seconds."""
        if max_entries < 1:
            raise ValueError("max_entries must be >= 1.")
        if default_ttl_s <= 0.0:
            raise ValueError("default_ttl_s must be positive.")
        self.max_entries = max_entries
        self.default_ttl_s = default_ttl_s
        self._items: OrderedDict[str, tuple[float, str]] = OrderedDict()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def put(self, key: str, value: str, now_epoch_s: float, ttl_s: float | None = None) -> None:
        """Inserts or refreshes an entry and evicts oldest entry when over capacity."""
        expiry = now_epoch_s + (ttl_s if ttl_s is not None else self.default_ttl_s)
        if key in self._items:
            self._items.move_to_end(key)
        self._items[key] = (expiry, value)
        while len(self._items) > self.max_entries:
            self._items.popitem(last=False)
            self._evictions += 1

    def get(self, key: str, now_epoch_s: float) -> str | None:
        """Retrieves an unexpired entry and updates hit/miss telemetry."""
        entry = self._items.get(key)
        if entry is None:
            self._misses += 1
            return None
        expiry, value = entry
        if now_epoch_s > expiry:
            del self._items[key]
            self._misses += 1
            return None
        self._items.move_to_end(key)
        self._hits += 1
        return value

    def stats(self) -> CacheStatsSnapshot:
        """Returns immutable hit/miss/eviction snapshot."""
        total = self._hits + self._misses
        hit_rate = round(self._hits / total, 4) if total > 0 else 0.0
        return CacheStatsSnapshot(
            hits=self._hits,
            misses=self._misses,
            evictions=self._evictions,
            entries=len(self._items),
            hit_rate=hit_rate,
        )


def pack_flatbuffer_envelope(schema_tag: str, payload: bytes) -> bytes:
    """Packs a binary envelope with magic header, tag, payload length, and CRC32."""
    tag_bytes = schema_tag.encode("utf-8")
    if len(tag_bytes) > 64:
        raise ValueError("schema_tag must fit within 64 UTF-8 bytes.")
    header = struct.pack(">4sHI", _MAGIC, len(tag_bytes), len(payload))
    body = header + tag_bytes + payload
    crc = zlib.crc32(body) & 0xFFFFFFFF
    return body + struct.pack(">I", crc)


def unpack_flatbuffer_envelope(blob: bytes) -> tuple[str, bytes, str]:
    """Unpacks and verifies CRC32 + SHA-256 of a packed FlatBuffer-style envelope."""
    if len(blob) < 14:
        raise ValueError("Truncated envelope.")
    body, crc_bytes = blob[:-4], blob[-4:]
    (expected_crc,) = struct.unpack(">I", crc_bytes)
    actual_crc = zlib.crc32(body) & 0xFFFFFFFF
    if actual_crc != expected_crc:
        raise ValueError("CRC32 mismatch on binary envelope.")
    magic, tag_len, payload_len = struct.unpack(">4sHI", body[:10])
    if magic != _MAGIC:
        raise ValueError("Invalid GSE envelope magic header.")
    if len(body) != 10 + tag_len + payload_len:
        raise ValueError("Envelope length mismatch.")
    tag = body[10 : 10 + tag_len].decode("utf-8")
    payload = body[10 + tag_len :]
    return tag, payload, hashlib.sha256(payload).hexdigest()


def build_gvisor_runsc_profile(worker_name: str, memory_mb: int = 1024) -> tuple[str, ...]:
    """Builds least-privilege gVisor runsc runtime arguments for isolated workers."""
    safe_name = "".join(c for c in worker_name if c.isalnum() or c in {"-", "_"}) or "worker"
    clamped_mem = max(128, min(8192, memory_mb))
    return (
        "runsc",
        "--platform=systrap",
        "--network=none",
        "--file-access=exclusive",
        f"--root=/var/run/runsc/{safe_name}",
        f"--memory-limit-mb={clamped_mem}",
        "--read-only",
    )
