"""Unit tests for Polyglot Cloud SDK, Serverless Zero-AWS-Spend, and E2E CI contracts."""

from __future__ import annotations

from gse_engine.cloud.polyglot_cloud_and_ci_adapters import (
    CiE2eRunnerSpec,
    ServerlessEventFanoutSpec,
    build_e2e_ci_and_remote_harness_plan,
    build_polyglot_gcp_client_envelope,
    validate_serverless_and_event_fanout_spec,
)


def test_serverless_fanout_blocks_live_aws_spend() -> None:
    """Rejects live AWS paid flags and approves LocalStack/Cloudflare R2 idle-zero."""
    ok, errs = validate_serverless_and_event_fanout_spec(
        ServerlessEventFanoutSpec(
            service_name="gse-receipt-fanout",
            storage_backend="cloudflare-r2",
            idempotency_key="evt_w10_001",
            min_instances=0,
            live_aws_action=False,
            paid_resource_required=False,
        )
    )
    assert ok is True
    assert errs == ()

    bad_ok, bad_errs = validate_serverless_and_event_fanout_spec(
        ServerlessEventFanoutSpec(
            service_name="bad",
            storage_backend="aws-s3",
            idempotency_key="",
            min_instances=2,
            live_aws_action=True,
            paid_resource_required=True,
        )
    )
    assert bad_ok is False
    assert len(bad_errs) == 5


def test_polyglot_gcp_client_and_ci_runner_contracts() -> None:
    """Validates all 6 GCP SDK targets and multi-CI unattended E2E runners."""
    for lang in ("python", "node", "go", "java", "j2cl", "ruby"):
        contract = build_polyglot_gcp_client_envelope(lang)  # type: ignore[arg-type]
        assert contract.ok is True
        assert f"sdk:{lang}" in contract.attribution_agent

    over_cap = build_polyglot_gcp_client_envelope("go", bq_max_bytes_billed=10**11)
    assert over_cap.ok is False

    ci_ok, ci_issues = build_e2e_ci_and_remote_harness_plan(
        [
            CiE2eRunnerSpec("github-actions", "npx leapwork run", True, True),
            CiE2eRunnerSpec("jenkins", "leapwork-cli --suite smoke", True, True),
            CiE2eRunnerSpec("azure-devops", "az devops run", True, True),
            CiE2eRunnerSpec("mobly", "python -m mobly.suite", True, True),
        ]
    )
    assert ci_ok is True
    assert ci_issues == ()
