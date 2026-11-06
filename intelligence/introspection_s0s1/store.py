"""SPEC-C S0 store: append-only, hash-chained, server-stamped record storage.

Layout (SPEC-C §1.9), relative to the store root (the `introspection/` dir):

    dossiers/{season}/{week}/{game_id}/v{n}.json
    resolutions/{season}/{week}/{game_id}.jsonl
    postmortems/{season}/{week}/{game_id}.json
    commitments/fired.jsonl
    versions.jsonl
    trackrecords/            (derived output only)

Rules enforced here, mechanically:
  * Append-only: records are never edited or deleted. Corrections are new
    records. Chain verification detects any tampering after the fact.
  * Hash chain: every record carries `prev_sha` (the previous record's
    `record_sha` in the same chain; GENESIS_SHA for the first) and
    `record_sha` = SHA-256 over the canonical form of the record without
    `record_sha`. Canonical form = JSON, sorted keys, separators (",", ":"),
    UTF-8.
  * Server stamping (SPEC-C §1.9): every stamp is UTC taken from the server
    clock at write time. Callers never supply timestamps: any author-supplied
    timestamp field in a payload is rejected (StampAuthorityError).

SPEC-C is DRAFT (Freeze-1-C pending Garrett's ratification). This module
builds the plumbing exactly as drafted; it changes no defaults.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone

GENESIS_SHA = "0" * 64

# Fields a caller may never supply: all stamps come from the server clock.
AUTHOR_TIMESTAMP_FIELDS = frozenset(
    {
        "authored_utc",
        "stamped_utc",
        "resolved_utc",
        "graded_utc",
        "fired_utc",
        "created_at",
        "updated_at",
        "timestamp",
        "ts",
    }
)


class StampAuthorityError(ValueError):
    """Raised when a caller tries to supply a timestamp."""


class ChainError(ValueError):
    """Raised when a hash chain fails verification."""


def canonical_bytes(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def record_sha(record: dict) -> str:
    """SHA-256 over the canonical form of the record, excluding `record_sha`."""
    body = {k: v for k, v in record.items() if k != "record_sha"}
    return sha256_hex(canonical_bytes(body))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _reject_author_timestamps(payload: dict, where: str) -> None:
    bad = AUTHOR_TIMESTAMP_FIELDS.intersection(payload.keys())
    if bad:
        raise StampAuthorityError(
            f"{where}: author-supplied timestamp field(s) {sorted(bad)} rejected; "
            "all stamps are taken from the server clock at write time (SPEC-C §1.9)"
        )


class Store:
    """The introspection store rooted at a directory (the `introspection/` dir)."""

    def __init__(self, root: str):
        self.root = root

    # -- paths ----------------------------------------------------------
    def _path(self, rel: str) -> str:
        return os.path.join(self.root, rel)

    def dossier_rel(self, season, week, game_id, version: int) -> str:
        return os.path.join("dossiers", str(season), str(week), str(game_id), f"v{version}.json")

    def resolutions_rel(self, season, week, game_id) -> str:
        return os.path.join("resolutions", str(season), str(week), str(game_id) + ".jsonl")

    # -- JSONL chains ---------------------------------------------------
    def read_chain(self, rel: str) -> list:
        path = self._path(rel)
        if not os.path.exists(path):
            return []
        records = []
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records

    def chain_head_sha(self, rel: str) -> str:
        records = self.read_chain(rel)
        return records[-1]["record_sha"] if records else GENESIS_SHA

    def append_jsonl(self, rel: str, payload: dict, stamp_field: str = "stamped_utc") -> dict:
        """Append one record to a JSONL chain, stamping it server-side.

        Returns the full stored record (including prev_sha / record_sha).
        """
        _reject_author_timestamps(payload, f"append_jsonl({rel})")
        record = dict(payload)
        record[stamp_field] = iso_z(now_utc())
        record["prev_sha"] = self.chain_head_sha(rel)
        record["record_sha"] = record_sha(record)
        path = self._path(rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n")
        return record

    # -- dossier versions ----------------------------------------------
    def next_dossier_version(self, season, week, game_id) -> int:
        n = 1
        while os.path.exists(self._path(self.dossier_rel(season, week, game_id, n))):
            n += 1
        return n

    def write_dossier(self, season, week, game_id, payload: dict) -> dict:
        """Write the next immutable dossier version for a game.

        The store stamps `authored_utc` from the server clock and chains the
        version to the previous version's record_sha. Revisions are new
        versions; existing versions are never edited (§1.2.2).
        """
        _reject_author_timestamps(payload, f"write_dossier({game_id})")
        version = self.next_dossier_version(season, week, game_id)
        doc = dict(payload)
        doc["game_id"] = game_id
        doc["version"] = version
        doc["authored_utc"] = iso_z(now_utc())
        if version > 1:
            prev = self.read_dossier(season, week, game_id, version - 1)
            doc["prev_sha"] = prev["record_sha"]
            doc.setdefault("revises", version - 1)
        else:
            doc["prev_sha"] = GENESIS_SHA
        doc["record_sha"] = record_sha(doc)
        path = self._path(self.dossier_rel(season, week, game_id, version))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(doc, fh, indent=2, sort_keys=True, ensure_ascii=False)
            fh.write("\n")
        return doc

    def read_dossier(self, season, week, game_id, version: int) -> dict:
        with open(self._path(self.dossier_rel(season, week, game_id, version)), "r", encoding="utf-8") as fh:
            return json.load(fh)

    def dossier_versions(self, season, week, game_id) -> list:
        out = []
        n = 1
        while os.path.exists(self._path(self.dossier_rel(season, week, game_id, n))):
            out.append(self.read_dossier(season, week, game_id, n))
            n += 1
        return out

    # -- verification ----------------------------------------------------
    def verify_jsonl_chain(self, rel: str) -> list:
        """Return a list of problems (empty = chain intact)."""
        problems = []
        prev = GENESIS_SHA
        for i, rec in enumerate(self.read_chain(rel)):
            if rec.get("prev_sha") != prev:
                problems.append(f"{rel} line {i + 1}: prev_sha mismatch (chain broken)")
            if rec.get("record_sha") != record_sha(rec):
                problems.append(f"{rel} line {i + 1}: record_sha mismatch (record tampered)")
            prev = rec.get("record_sha", prev)
        return problems

    def verify_dossier_chain(self, season, week, game_id) -> list:
        problems = []
        prev = GENESIS_SHA
        for doc in self.dossier_versions(season, week, game_id):
            if doc.get("prev_sha") != prev:
                problems.append(f"dossier {game_id} v{doc.get('version')}: prev_sha mismatch")
            if doc.get("record_sha") != record_sha(doc):
                problems.append(f"dossier {game_id} v{doc.get('version')}: record_sha mismatch (tampered)")
            prev = doc.get("record_sha", prev)
        return problems

    def verify_all(self) -> list:
        """Verify every chain in the store. Empty result = fully intact."""
        problems = []
        for dirpath, _dirnames, filenames in os.walk(self.root):
            for name in sorted(filenames):
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, self.root)
                if name.endswith(".jsonl"):
                    problems.extend(self.verify_jsonl_chain(rel))
                elif name.startswith("v") and name.endswith(".json") and "dossiers" in rel:
                    with open(full, "r", encoding="utf-8") as fh:
                        doc = json.load(fh)
                    if doc.get("record_sha") != record_sha(doc):
                        problems.append(f"{rel}: record_sha mismatch (tampered)")
        return problems
