"""Tests for scripts/research/nfl_deep_sweep_v2_2026_11_04.py — no network."""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "research"))

import nfl_deep_sweep_v2_2026_11_04 as sweep


def _http429(url="https://export.arxiv.org/api/query?x"):
    import urllib.error
    return urllib.error.HTTPError(url, 429, "Too Many Requests", {}, io.BytesIO(b"429"))


class _FakeResp:
    def __init__(self, payload: bytes):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return self._payload


# -- _done_clusters -----------------------------------------------------------

def test_done_clusters_returns_cluster_names(tmp_path):
    p = tmp_path / "out.jsonl"
    p.write_text(
        json.dumps({"cluster": "coverage_shells", "id": "1"}) + "\n"
        + json.dumps({"cluster": "qb_epa", "id": "2"}) + "\n"
        + "\n"  # blank line tolerated
        + json.dumps({"cluster": "coverage_shells", "id": "3"}) + "\n",
        encoding="utf-8",
    )
    assert sweep._done_clusters(p) == {"coverage_shells", "qb_epa"}


def test_done_clusters_missing_file_returns_empty(tmp_path):
    assert sweep._done_clusters(tmp_path / "does-not-exist.jsonl") == set()
    assert sweep._done_clusters(str(tmp_path / "also-missing.jsonl")) == set()


def test_done_clusters_tolerates_bad_json_lines(tmp_path):
    p = tmp_path / "out.jsonl"
    p.write_text("not json\n" + json.dumps({"cluster": "weather"}) + "\n", encoding="utf-8")
    assert sweep._done_clusters(p) == {"weather"}


# -- _throttle ----------------------------------------------------------------

def test_throttle_sleeps_when_interval_not_elapsed(monkeypatch):
    sleeps: list[float] = []
    times = iter([101.0, 101.0])
    monkeypatch.setattr(sweep.time, "sleep", lambda d: sleeps.append(d))
    monkeypatch.setattr(sweep.time, "time", lambda: next(times))
    result = sweep._throttle(100.0, 3.5)
    assert result == pytest.approx(101.0)
    assert sleeps == pytest.approx([2.5])


def test_throttle_no_sleep_when_interval_elapsed(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr(sweep.time, "sleep", lambda d: sleeps.append(d))
    monkeypatch.setattr(sweep.time, "time", lambda: 110.0)
    result = sweep._throttle(100.0, 3.5)
    assert result == pytest.approx(110.0)
    assert sleeps == []


# -- _fetch -------------------------------------------------------------------

def test_fetch_returns_bytes_on_success(monkeypatch):
    calls = []

    def fake_urlopen(req, timeout=None):
        calls.append((req, timeout))
        return _FakeResp(b"<xml>ok</xml>")

    monkeypatch.setattr(sweep.urllib.request, "urlopen", fake_urlopen)
    out = sweep._fetch("https://export.arxiv.org/api/query?x", timeout=7)
    assert out == b"<xml>ok</xml>"
    assert len(calls) == 1
    assert calls[0][1] == 7


def test_fetch_retries_on_429_then_raises_with_backoff(monkeypatch):
    import urllib.error
    sleeps: list[float] = []
    calls = {"n": 0}

    def fake_urlopen(req, timeout=None):
        calls["n"] += 1
        raise _http429()

    monkeypatch.setattr(sweep.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(sweep.time, "sleep", lambda d: sleeps.append(d))

    with pytest.raises(urllib.error.HTTPError) as exc:
        sweep._fetch("https://export.arxiv.org/api/query?x")

    assert exc.value.code == 429
    # 1 initial attempt + MAX_RETRIES retries
    assert calls["n"] == sweep.MAX_RETRIES + 1
    # backoff schedule followed for each retryable attempt
    assert sleeps == sweep.BACKOFF[: sweep.MAX_RETRIES]


def test_fetch_succeeds_after_transient_429s(monkeypatch):
    sleeps: list[float] = []
    calls = {"n": 0}

    def fake_urlopen(req, timeout=None):
        calls["n"] += 1
        if calls["n"] <= 2:
            raise _http429()
        return _FakeResp(b"recovered")

    monkeypatch.setattr(sweep.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(sweep.time, "sleep", lambda d: sleeps.append(d))

    assert sweep._fetch("https://export.arxiv.org/api/query?x") == b"recovered"
    assert calls["n"] == 3
    assert sleeps == sweep.BACKOFF[:2]


def test_fetch_non_429_raises_immediately(monkeypatch):
    import urllib.error
    sleeps: list[float] = []

    def fake_urlopen(req, timeout=None):
        raise urllib.error.HTTPError("https://x", 500, "err", {}, io.BytesIO(b""))

    monkeypatch.setattr(sweep.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(sweep.time, "sleep", lambda d: sleeps.append(d))

    with pytest.raises(urllib.error.HTTPError) as exc:
        sweep._fetch("https://x")
    assert exc.value.code == 500
    assert sleeps == []


# -- cluster tables -----------------------------------------------------------

def test_ax_clusters_length_and_unique():
    assert len(sweep.AX) == 20
    tags = [t for t, _ in sweep.AX]
    assert len(tags) == len(set(tags)), f"dup AX tags: {tags}"


def test_oa_clusters_length_and_unique():
    assert len(sweep.OA) == 10
    tags = [t for t, _ in sweep.OA]
    assert len(tags) == len(set(tags)), f"dup OA tags: {tags}"
