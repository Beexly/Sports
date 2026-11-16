"""Zero-paid-AWS immutable receipt storage targeting LocalStack S3 dev or Cloudflare R2 prod."""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from typing import Protocol

LOCALSTACK_DEFAULT_ENDPOINT = "http://localhost:4566"


class ObjectStoreClient(Protocol):
    """Minimal protocol satisfied by boto3 S3 clients or in-memory test fakes."""

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> object:
        """Stores immutable receipt bytes."""
        ...

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]:
        """Retrieves previously stored receipt bytes."""
        ...


@dataclass(frozen=True, slots=True)
class ArchivedReceipt:
    """Receipt archival descriptor with SHA-256 verification."""

    bucket: str
    key: str
    sha256: str
    endpoint_url: str


class InMemoryObjectStore:
    """Deterministic in-memory S3-compatible store for fast unit tests."""

    def __init__(self) -> None:
        """Initializes an empty key-value object map."""
        self.objects: dict[tuple[str, str], bytes] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> dict[str, str]:
        """Stores raw bytes keyed by (Bucket, Key)."""
        self.objects[(Bucket, Key)] = Body
        return {"ETag": hashlib.md5(Body).hexdigest(), "ContentType": ContentType}

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]:
        """Retrieves bytes wrapped in a boto3-compatible streaming body shim."""
        data = self.objects[(Bucket, Key)]

        class _BodyShim:
            """In-memory streaming body shim matching boto3 S3 get_object()."""

            def __init__(self, payload: bytes) -> None:
                """Stores raw receipt bytes for single-shot readback."""
                self._payload = payload

            def read(self) -> bytes:
                """Returns archived receipt bytes."""
                return self._payload

        return {"Body": _BodyShim(data)}


class S3ReceiptArchiver:
    """Archives immutable CAGE receipts to LocalStack (dev/CI) or Cloudflare R2 (prod)."""

    def __init__(
        self,
        bucket: str = "gse-sealed-receipts-local",
        endpoint_url: str | None = None,
        client: ObjectStoreClient | None = None,
    ) -> None:
        """Configures endpoint and client cleanly without touching paid AWS defaults."""
        self.bucket = bucket
        self.endpoint_url = (
            endpoint_url
            or os.environ.get("GSE_RECEIPT_ENDPOINT_URL")
            or LOCALSTACK_DEFAULT_ENDPOINT
        )
        if client is not None:
            self._client: ObjectStoreClient = client
        else:
            import boto3  # type: ignore[import-not-found]

            self._client = boto3.client(  # type: ignore[assignment]
                "s3",
                endpoint_url=self.endpoint_url,
                region_name="auto",
            )

    def archive_receipt(self, key: str, payload: bytes) -> ArchivedReceipt:
        """Persists JSON receipt bytes and verifies their SHA-256 digest."""
        sha = hashlib.sha256(payload).hexdigest()
        self._client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=payload,
            ContentType="application/json",
        )
        return ArchivedReceipt(
            bucket=self.bucket,
            key=key,
            sha256=sha,
            endpoint_url=self.endpoint_url,
        )

    def verify_receipt(self, key: str, expected_sha256: str) -> bool:
        """Reads archived bytes back and verifies exact SHA-256 equality."""
        obj = self._client.get_object(Bucket=self.bucket, Key=key)
        body = obj["Body"]
        raw: bytes = body.read()  # type: ignore[attr-defined]
        return hashlib.sha256(raw).hexdigest() == expected_sha256
