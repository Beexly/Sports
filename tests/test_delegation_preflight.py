"""Tests for the delegation preflight.

The regression: three batches died on HTTP 401 after each child had started.
Every one was a config problem detectable before dispatch.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

_SRC = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "delegation_preflight.py"


@pytest.fixture(scope="module")
def pf():
    spec = importlib.util.spec_from_file_location("delegation_preflight", _SRC)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["delegation_preflight"] = mod
    spec.loader.exec_module(mod)
    return mod


def _config(tmp_path, body: str) -> Path:
    p = tmp_path / "config.yaml"
    p.write_text(body, encoding="utf-8")
    return p


GOOD = """models:
  aliases:
    smart: x
delegation:
  model: stealth/crouton-alpha
  provider: openrouter
approvals:
  mode: 'off'
"""


def test_read_config_extracts_delegation_block(pf, tmp_path):
    cfg = _config(tmp_path, GOOD)
    # _read_config reads the module-level CONFIG, so swap it for the fixture.
    old = pf.CONFIG
    try:
        pf.CONFIG = cfg
        got = pf._read_config()
    finally:
        pf.CONFIG = old
    assert got["provider"] == "openrouter"
    assert got["model"] == "stealth/crouton-alpha"
    assert "approvals" not in got, "reader must stop at the next top-level key"


def test_missing_config_returns_2(pf, tmp_path, monkeypatch):
    monkeypatch.setattr(pf, "CONFIG", tmp_path / "nope.yaml")
    assert pf.main([]) == 2


def test_unset_provider_returns_2(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, "delegation:\n  model: x\n")
    monkeypatch.setattr(pf, "CONFIG", cfg)
    assert pf.main([]) == 2


def test_unknown_provider_returns_2(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, "delegation:\n  provider: made-up\n  model: x\n")
    monkeypatch.setattr(pf, "CONFIG", cfg)
    assert pf.main([]) == 2


def test_missing_api_key_returns_1(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    for name in ("OPENROUTER_API_KEY",):
        monkeypatch.delenv(name, raising=False)
    assert pf.main([]) == 1


def test_base_url_override_is_warned(pf, tmp_path, monkeypatch, capsys):
    body = GOOD.replace("  provider: openrouter",
                        "  provider: openrouter\n  base_url: http://wrong-host/v1")
    cfg = _config(tmp_path, body)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (200, {"data": [{"id": "stealth/crouton-alpha"}]}))
    monkeypatch.setattr(pf, "_post", lambda *a, **k: (200, {"choices": [{"message": {"content": ""}}]}))
    rc = pf.main([])
    out = capsys.readouterr().out
    assert rc == 0
    assert "overrides the provider URL" in out


def test_401_from_models_returns_1(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (401, "invalid api key"))
    assert pf.main([]) == 1


def test_model_absent_from_provider_returns_1(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (200, {"data": [{"id": "other/model"}]}))
    assert pf.main([]) == 1


def test_network_failure_returns_3(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (0, "URLError: unreachable"))
    assert pf.main([]) == 3


def test_healthy_config_returns_0(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (200, {"data": [{"id": "stealth/crouton-alpha"}]}))
    monkeypatch.setattr(pf, "_post", lambda *a, **k: (200, {"choices": []}))
    assert pf.main([]) == 0


def test_completion_401_returns_1(pf, tmp_path, monkeypatch):
    cfg = _config(tmp_path, GOOD)
    monkeypatch.setattr(pf, "CONFIG", cfg)
    monkeypatch.setenv("OPENROUTER_API_KEY", "k" * 40)
    monkeypatch.setattr(pf, "_get", lambda *a, **k: (200, {"data": [{"id": "stealth/crouton-alpha"}]}))
    monkeypatch.setattr(pf, "_post", lambda *a, **k: (401, "unauthorized"))
    assert pf.main([]) == 1
