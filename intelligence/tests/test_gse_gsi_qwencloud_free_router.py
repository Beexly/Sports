"""Tests for intelligence.ops.gse_gsi_qwencloud_free_router."""

import io
import json
import urllib.error
from email.message import Message
from unittest.mock import patch

import pytest

from intelligence.ops.gse_gsi_qwencloud_free_router import SovereignDualCloudRouter


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._data = json.dumps(payload).encode("utf-8")

    def read(self) -> bytes:
        return self._data

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_dual_cloud_router_fails_over_on_429_and_enforces_line_guard(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "test-dash-key")
    monkeypatch.setenv("DASHSCOPE_BASE_URL", "https://example-alibaba.local/compatible-mode/v1")
    monkeypatch.setenv("NVIDIA_GSE_API_KEY", "test-nv-key")

    router = SovereignDualCloudRouter(entity="GSE", timeout_seconds=15)
    calls = []

    def fake_urlopen(req, timeout=15):
        calls.append(req.full_url)
        if len(calls) == 1:
            raise urllib.error.HTTPError(
                req.full_url,
                429,
                "Rate Limited",
                hdrs=Message(),
                fp=io.BytesIO(b'{"error":"rate_limit"}'),
            )
        return _FakeResponse(
            {
                "choices": [{"message": {"content": "Formal kinematic state transition verified."}}],
                "usage": {"prompt_tokens": 20, "completion_tokens": 12},
            }
        )

    with patch("urllib.request.urlopen", side_effect=fake_urlopen):
        res = router.call_with_dual_cloud_failover(
            agent_profile="GSE-Coach-Mind-Crucible-v1",
            user_prompt="Summarize force transition operator.",
            lane="fast_reasoning_shard",
        )

    assert res["status"] == "ok"
    assert res["cost_usd"] == 0.0
    assert len(calls) == 2


def test_dual_cloud_router_rejects_sportsbook_jargon(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DASHSCOPE_API_KEY", "test-dash-key")
    monkeypatch.setenv("NVIDIA_GSE_API_KEY", "test-nv-key")

    router = SovereignDualCloudRouter(entity="GSE", timeout_seconds=15)

    def bad_urlopen(req, timeout=15):
        return _FakeResponse(
            {
                "choices": [{"message": {"content": "The point spread is -3.5 on DraftKings."}}],
            }
        )

    with patch("urllib.request.urlopen", side_effect=bad_urlopen):
        with pytest.raises(RuntimeError, match="All configured dual-cloud free models failed"):
            router.call_with_dual_cloud_failover(
                agent_profile="GSE-Coach-Mind-Crucible-v1",
                user_prompt="Test line guard",
                lane="fast_reasoning_shard",
            )
