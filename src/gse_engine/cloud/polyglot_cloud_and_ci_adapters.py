"""Polyglot Cloud SDK, Serverless Zero-AWS-Spend, and CI/E2E runner contracts."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

CloudSdkLanguage = Literal["python", "node", "go", "java", "j2cl", "ruby"]
CiPlatform = Literal["github-actions", "jenkins", "azure-devops", "leapwork-play", "mobly"]

_SUPPORTED_TARGET_STORES: frozenset[str] = frozenset({"localstack", "cloudflare-r2"})


@dataclass(frozen=True, slots=True)
class ServerlessEventFanoutSpec:
    """Serverless + webhook fanout policy enforcing Zero-AWS-Spend parity."""

    service_name: str
    storage_backend: str
    idempotency_key: str
    min_instances: int = 0
    live_aws_action: bool = False
    paid_resource_required: bool = False


@dataclass(frozen=True, slots=True)
class PolyglotSdkContract:
    """Timeout, retry, and dry-run cap envelope across all GCP SDK languages."""

    language: CloudSdkLanguage
    timeout_ms: int
    max_retries: int
    bq_max_bytes_billed: int
    attribution_agent: str
    ok: bool
    warnings: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class CiE2eRunnerSpec:
    """CI/E2E runner and SSH remote operator harness posture validation."""

    platform: CiPlatform
    command_prefix: str
    ssh_loopback_or_key_only: bool
    unattended_safe: bool


def validate_serverless_and_event_fanout_spec(
    spec: ServerlessEventFanoutSpec,
) -> tuple[bool, tuple[str, ...]]:
    """Enforces Zero-AWS-Spend policy, idempotency, and zero idle VM minimums."""
    errors: list[str] = []
    if spec.live_aws_action:
        errors.append("live_aws_action_forbidden")
    if spec.paid_resource_required:
        errors.append("paid_resource_required_forbidden")
    if spec.storage_backend not in _SUPPORTED_TARGET_STORES:
        errors.append(f"unsupported_storage_backend:{spec.storage_backend}")
    if spec.min_instances != 0:
        errors.append(f"non_zero_min_instances:{spec.min_instances}")
    if not spec.idempotency_key.strip():
        errors.append("missing_idempotency_key")
    return len(errors) == 0, tuple(errors)


def build_polyglot_gcp_client_envelope(
    language: CloudSdkLanguage,
    *,
    timeout_ms: int = 8000,
    max_retries: int = 2,
    bq_max_bytes_billed: int = 1024 * 1024 * 1024,
) -> PolyglotSdkContract:
    """Builds bounded GCP client retry, timeout, and 1 GiB BigQuery dry-run caps."""
    warnings: list[str] = []
    if timeout_ms <= 0 or timeout_ms > 10_000:
        warnings.append(f"timeout_out_of_bounds:{timeout_ms}")
    if max_retries < 0 or max_retries > 3:
        warnings.append(f"retries_out_of_bounds:{max_retries}")
    cap_1gib = 1024 * 1024 * 1024
    if bq_max_bytes_billed <= 0 or bq_max_bytes_billed > cap_1gib:
        warnings.append(f"bq_bytes_cap_exceeds_1gib:{bq_max_bytes_billed}")
    return PolyglotSdkContract(
        language=language,
        timeout_ms=timeout_ms,
        max_retries=max_retries,
        bq_max_bytes_billed=bq_max_bytes_billed,
        attribution_agent=f"agent-skills/1.0 (sdk:{language})",
        ok=len(warnings) == 0,
        warnings=tuple(warnings),
    )


def build_e2e_ci_and_remote_harness_plan(
    runners: Sequence[CiE2eRunnerSpec],
) -> tuple[bool, tuple[str, ...]]:
    """Verifies cross-platform CI E2E runners and key-only remote mobile harnesses."""
    if not runners:
        return False, ("empty_runner_plan",)
    issues: list[str] = []
    for r in runners:
        if not r.ssh_loopback_or_key_only:
            issues.append(f"insecure_remote_auth:{r.platform}")
        if not r.command_prefix.strip():
            issues.append(f"empty_command:{r.platform}")
        if not r.unattended_safe:
            issues.append(f"interactive_prompt_risk:{r.platform}")
    return len(issues) == 0, tuple(issues)
