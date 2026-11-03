"""Tests for intelligence/voice_brain/live_voice_app.py and morning_digest.py.

No network calls: the router is injected as a stub, and TTS/STT are stubbed at the
module boundary. Tests assert the app reports "not configured" honestly instead of
inventing audio or transcripts.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

from intelligence.voice_brain import live_voice_app as appmod  # noqa: E402
from intelligence.voice_brain import morning_digest as digestmod  # noqa: E402


class StubRouter:
    """Deterministic router stub; records what it was asked."""

    def __init__(self, answer: str = "Stub answer."):
        self.answer = answer
        self.calls: list[dict] = []

    def route_query(self, prompt, system_instruction="", conversation_history=None, temperature=0.2):
        self.calls.append({"prompt": prompt, "system_instruction": system_instruction})
        return self.answer, "stub:model", 0.0


class BoomRouter:
    def route_query(self, *a, **k):
        raise RuntimeError("router down")


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(appmod, "speak", lambda *a, **k: True)
    monkeypatch.setattr(appmod, "fish_audio_available", lambda: False)
    monkeypatch.setattr(appmod, "sapi_available", lambda: True)
    monkeypatch.setattr(appmod, "stt_available", lambda: False)
    app = appmod.create_app(router=StubRouter())
    return TestClient(app)


def test_health_reports_providers(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["service"] == "gse_live_voice_app"
    assert set(body["providers"]) == {"tts", "stt", "router"}
    assert body["providers"]["stt"]["configured"] is False
    assert isinstance(body["artifacts"]["ledger"], bool)


def test_ask_returns_routed_answer(client):
    r = client.post("/ask", json={"question": "What is the ledger record?"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["answer"] == "Stub answer."
    assert body["provider"] == "stub:model"
    assert body["spoken"] is False


def test_ask_rejects_empty_question(client):
    r = client.post("/ask", json={"question": "   "})
    assert r.status_code == 400


def test_ask_reports_router_failure(monkeypatch):
    monkeypatch.setattr(appmod, "speak", lambda *a, **k: True)
    app = appmod.create_app(router=BoomRouter())
    c = TestClient(app)
    r = c.post("/ask", json={"question": "hello"})
    assert r.status_code == 502
    body = r.json()
    assert body["ok"] is False
    assert "router_failed" in body["error"]


def test_voice_endpoint_reports_missing_stt(client):
    r = client.post(
        "/voice",
        files={"audio": ("clip.wav", b"RIFF0000WAVEfake", "audio/wav")},
        data={"speak_reply": "false"},
    )
    assert r.status_code == 422
    body = r.json()
    assert body["stage"] == "transcription"
    assert body["ok"] is False
    assert "GSE_STT_API_KEY" in body["hint"]


def test_voice_endpoint_transcribes_then_answers(monkeypatch):
    monkeypatch.setattr(appmod, "speak", lambda *a, **k: True)
    monkeypatch.setattr(
        appmod, "transcribe_audio_bytes",
        lambda raw, filename="audio.wav": {
            "ok": True, "transcript": "who leads the division", "provider": "stub_stt", "error": None,
        },
    )
    app = appmod.create_app(router=StubRouter("Baltimore leads."))
    c = TestClient(app)
    r = c.post(
        "/voice",
        files={"audio": ("clip.wav", b"RIFFfake", "audio/wav")},
        data={"speak_reply": "true"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["transcript"] == "who leads the division"
    assert body["answer"] == "Baltimore leads."
    assert body["spoken"] is True
    assert body["stage"] == "answered"


def test_voice_endpoint_rejects_empty_upload(client):
    r = client.post("/voice", files={"audio": ("empty.wav", b"", "audio/wav")})
    assert r.status_code == 400


def test_digest_endpoint_reads_disk_artifacts(client):
    r = client.get("/digest")
    assert r.status_code == 200
    body = r.json()
    assert body["framing"] == "morning"
    assert "text" in body and len(body["text"]) > 40
    sections = body["sections"]
    assert set(sections) == {"ledger", "replay_trainer", "workflow_run", "dfs"}
    # the ledger file is on disk in this repo, so the digest must have parsed it
    assert sections["ledger"]["available"] is True
    assert sections["ledger"]["verified_record"] == "36-13-1"


def test_digest_evening_framing(client):
    r = client.get("/digest", params={"evening": True})
    assert r.json()["framing"] == "evening"


# --------------------------------------------------------------------------
# morning_digest module
# --------------------------------------------------------------------------
def test_build_digest_never_invents_numbers(tmp_path, monkeypatch):
    monkeypatch.setattr(digestmod, "LEDGER", tmp_path / "nope.json")
    monkeypatch.setattr(digestmod, "PRIORS", tmp_path / "nope2.json")
    monkeypatch.setattr(digestmod, "RUNS_DIR", tmp_path / "no_runs")
    monkeypatch.setattr(digestmod, "DFS_DIR", tmp_path / "no_dfs")
    monkeypatch.setattr(digestmod, "DFS_DOCS", tmp_path / "no_docs")
    d = digestmod.build_digest()
    assert d["sections"]["ledger"]["available"] is False
    assert d["sections"]["replay_trainer"]["available"] is False
    assert "unavailable" in d["text"].lower()
    assert "nothing is estimated" in d["text"].lower()


def test_build_digest_parses_real_artifacts():
    d = digestmod.build_digest()
    led = d["sections"]["ledger"]
    if led["available"]:
        assert led["verified_record"] == "36-13-1"
        assert led["net_units"] == "+20.14u"
        names = {v["name"] for v in led["secondary_views"] if v.get("name")}
        assert any("38-13-1" in str(v.get("record")) for v in led["secondary_views"]) or names


def test_priors_section_reports_epoch_metrics():
    d = digestmod.build_digest()
    pri = d["sections"]["replay_trainer"]
    assert pri["available"] is True, "team priors artifact must be present for this check"
    assert pri["epochs_run"] >= 1
    assert pri["team_priors_count"] >= 1
    assert pri["week8_status"] in {"ABSENT_FROM_SOURCE_PARQUET", "INCLUDED"}
    # The trainer emits brier_pass/logloss_pass/ece_pass. If the digest reads the
    # wrong keys these come back None and the spoken briefing silently loses every
    # calibration number -- so assert them non-None, not truthy-if-present.
    last = pri["last_epoch"]
    assert last["brier"] is not None, last
    assert last["log_loss"] is not None, last
    assert last["ece"] is not None, last
    assert 0.0 < last["brier"] < 0.5


def test_speak_digest_uses_voice_interface(monkeypatch):
    monkeypatch.setattr(
        "intelligence.voice_brain.voice_interface.speak", lambda text, **k: True, raising=False
    )
    monkeypatch.setattr(
        "intelligence.voice_brain.voice_interface.fish_audio_available", lambda: False, raising=False
    )
    out = digestmod.speak_digest({"text": "short digest"})
    assert out["spoken"] is True
    assert out["voice_provider"] == "sapi"


def test_main_json_output(tmp_path, capsys):
    out = tmp_path / "digest.json"
    rc = digestmod.main(["--json", "--out", str(out)])
    assert rc == 0
    assert out.exists()
    payload = json.loads(out.read_text(encoding="utf-8"))
    assert "sections" in payload
