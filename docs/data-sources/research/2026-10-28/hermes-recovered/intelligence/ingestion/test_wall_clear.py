"""Tests for the Cloudflare wall-clear. Offline except the marked live case."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "intelligence"))

from ingestion import wall_clear as wc


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(wc, "CACHE", tmp_path / "cache")


def test_interstitial_detected_from_title():
    assert wc.is_interstitial("<html></html>", "Just a moment...")
    assert wc.is_interstitial("<html>checking your browser</html>")
    assert wc.is_interstitial('<div id="cf-challenge-running"></div>')


def test_real_page_is_not_interstitial():
    html = "<html><title>Pro Football Stats, History, Scores</title><table></table></html>"
    assert not wc.is_interstitial(html, "Pro Football Stats, History, Scores")


def test_host_requires_absolute_url():
    assert wc._host("https://example.com/a") == "example.com"
    with pytest.raises(ValueError):
        wc._host("/relative")


def test_clearance_round_trips():
    rec = wc.save_clearance("example.com", {"cf_clearance": "abc"}, "UA/1")
    assert rec["cookies"] == {"cf_clearance": "abc"}
    got = wc.load_clearance("example.com")
    assert got is not None and got["user_agent"] == "UA/1"


def test_expired_clearance_is_not_returned():
    wc.save_clearance("example.com", {"cf_clearance": "abc"}, "UA/1")
    assert wc.load_clearance("example.com", ttl=-1) is None


def test_empty_cookie_jar_is_not_returned():
    wc.save_clearance("example.com", {}, "UA/1")
    assert wc.load_clearance("example.com") is None


def test_corrupt_cache_file_is_tolerated():
    p = wc._cache_path("example.com")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("{not json", encoding="utf-8")
    assert wc.load_clearance("example.com") is None


def test_cache_path_encodes_port():
    assert wc._cache_path("example.com:8443").name == "example.com_8443.json"


def test_solve_raises_cleanly_without_browser_stack(monkeypatch):
    import builtins

    real_import = builtins.__import__

    def fake(name, *a, **k):
        if name.startswith(("patchright", "pypasser")):
            raise ImportError(name)
        return real_import(name, *a, **k)

    monkeypatch.setattr(builtins, "__import__", fake)
    with pytest.raises(wc.WallClearUnavailable):
        wc.solve("https://example.com/")


@pytest.mark.network
def test_live_pfr_clears_and_replays():
    """Live: PFR is 403 to curl. The wall-clear must return real page bytes."""
    r = wc.fetch("https://www.pro-football-reference.com/", force=True)
    assert r.status_code == 200
    assert len(r.text) > 100_000
    assert not wc.is_interstitial(r.text, "")
