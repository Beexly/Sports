"""Content-type integrity guard for downloaded sports data feeds.

Uses google/magika when installed plus strict magic-byte and HTML error-page
checks so upstream Cloudflare/403/502 HTML payloads saved under .csv/.parquet
paths fail closed prior to ingestion.
"""

from __future__ import annotations

import hashlib
import json

from gse_engine.models import FeedGuardVerdict, FeedKind

_HTML_MARKERS = (b"<!doctype html", b"<html", b"<head", b"<title>attention required")


def _detect_with_magika(raw_bytes: bytes) -> str | None:
    """Inspects bytes with google/magika when the package is available."""
    try:
        from magika import Magika  # type: ignore[import-not-found]
    except ImportError:
        return None
    result = Magika().identify_bytes(raw_bytes)
    output = getattr(result, "output", None)
    ct_label = getattr(output, "label", None)
    return str(ct_label).lower() if ct_label else None


def verify_feed_payload(raw_bytes: bytes, expected_kind: FeedKind) -> FeedGuardVerdict:
    """Verifies downloaded bytes match the expected CSV, Parquet, or JSON format.

    Args:
        raw_bytes: Raw HTTP payload bytes retrieved by an ingestion adapter.
        expected_kind: Expected format ("csv", "parquet", or "json").

    Returns:
        A FeedGuardVerdict marking whether parsing may proceed.
    """
    digest = hashlib.sha256(raw_bytes).hexdigest()
    if not raw_bytes or len(raw_bytes) < 2:
        return FeedGuardVerdict(
            ok=False,
            expected_kind=expected_kind,
            detected_kind="empty",
            reason="Empty feed payload rejected.",
            sha256=digest,
        )

    head_lower = raw_bytes[:512].lstrip().lower()
    if any(marker in head_lower for marker in _HTML_MARKERS):
        return FeedGuardVerdict(
            ok=False,
            expected_kind=expected_kind,
            detected_kind="html",
            reason="HTML error or challenge page rejected before parser.",
            sha256=digest,
        )

    magika_label = _detect_with_magika(raw_bytes)
    if magika_label in {"html", "xml", "pebin", "elf"}:
        return FeedGuardVerdict(
            ok=False,
            expected_kind=expected_kind,
            detected_kind=magika_label,
            reason=f"Magika classified payload as disallowed type '{magika_label}'.",
            sha256=digest,
        )

    if expected_kind == "parquet":
        valid_parquet = (
            len(raw_bytes) >= 8 and raw_bytes[:4] == b"PAR1" and raw_bytes[-4:] == b"PAR1"
        )
        return FeedGuardVerdict(
            ok=valid_parquet,
            expected_kind=expected_kind,
            detected_kind="parquet" if valid_parquet else (magika_label or "unknown"),
            reason="Valid PAR1 Parquet magic header/footer."
            if valid_parquet
            else "Missing PAR1 Parquet header/footer.",
            sha256=digest,
        )

    if expected_kind == "json":
        try:
            text = raw_bytes.decode("utf-8")
            json.loads(text)
            return FeedGuardVerdict(
                ok=True,
                expected_kind=expected_kind,
                detected_kind="json",
                reason="Valid UTF-8 JSON payload.",
                sha256=digest,
            )
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            return FeedGuardVerdict(
                ok=False,
                expected_kind=expected_kind,
                detected_kind=magika_label or "malformed",
                reason=f"Invalid JSON payload: {exc}",
                sha256=digest,
            )

    # CSV verification: valid UTF-8 text without NUL bytes and >= 1 delimiter/newline.
    if b"\x00" in raw_bytes[:4096]:
        return FeedGuardVerdict(
            ok=False,
            expected_kind=expected_kind,
            detected_kind="binary",
            reason="Binary NUL bytes detected inside CSV stream.",
            sha256=digest,
        )
    try:
        sample = raw_bytes[:8192].decode("utf-8")
    except UnicodeDecodeError:
        return FeedGuardVerdict(
            ok=False,
            expected_kind=expected_kind,
            detected_kind=magika_label or "non-utf8",
            reason="CSV payload failed UTF-8 decoding.",
            sha256=digest,
        )
    has_structure = "," in sample and ("\n" in sample or "\r" in sample)
    return FeedGuardVerdict(
        ok=has_structure,
        expected_kind=expected_kind,
        detected_kind="csv" if has_structure else (magika_label or "plain"),
        reason="Valid CSV tabular payload." if has_structure else "CSV lacks column/row structure.",
        sha256=digest,
    )
