"""Tests for the NFL replay VL harvester.

Covers the logic that decides *what* gets sent to the vision model — the part
that silently wastes calls when it is wrong. Network paths are monkeypatched.

Regression this file locks in: the free Nemotron VL endpoint is a reasoning
model that returns content=None with finish_reason="length" when max_tokens is
too small. audit_batch must escalate the budget rather than silently emitting
an empty result, because an empty result looks identical to "no plays here".
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from intelligence.vision import nfl_video_vl_harvester as h


REPLAY_HTML = """
<html><head><title>Chicago Bears vs. Seattle Seahawks - Full Game Replay - NFL Week 08</title></head>
<body>
<div id="video-player">
  <p>Server #1 OK</p>
  <a href="https://nhlgamestoday.com/nhl-games-on-tv-today-saturday-november-9-2024"
     target="_blank">Watch</a>
  <p>Server #2 DM</p>
  <a href="https://guidedesgemmes.com/cristaux" target="_blank">Watch</a>
</div>
</body></html>
"""


def test_parse_replay_page_finds_server_links_but_no_video():
    cat = h.parse_replay_page(REPLAY_HTML, "https://nfl-video.com/chicago-bears-vs-seattle-seahawks")
    assert cat.slug == "chicago-bears-vs-seattle-seahawks"
    assert "Full Game Replay" in cat.title
    # The page itself embeds nothing playable; the buttons are third-party.
    assert cat.video_embed_id is None
    assert len(cat.server_links) == 2
    assert all("nfl-video.com" not in u for u in cat.server_links)
    assert cat.status == "unresolved"


def test_parse_replay_page_picks_up_inline_ok_embed():
    html = '<iframe src="https://ok.ru/videoembed/16728570989228"></iframe>'
    cat = h.parse_replay_page(html, "https://nfl-video.com/some-game")
    assert cat.video_embed_id == "16728570989228"
    assert cat.resolved_from == "inline_embed"


def test_select_candidates_drops_non_turf_frames():
    scored = [
        {"frame": "s_0001.jpg", "green": 0.02},   # graphic
        {"frame": "s_0002.jpg", "green": 0.85},   # wide live shot
        {"frame": "s_0003.jpg", "green": 0.00},   # commercial
        {"frame": "s_0004.jpg", "green": 0.55},   # live shot
    ]
    picked = h.select_candidates(scored, threshold=0.18, limit=10)
    names = [p["frame"] for p in picked]
    assert names == ["s_0002.jpg", "s_0004.jpg"]


def test_select_candidates_spreads_across_window():
    scored = [{"frame": f"s_{i:04d}.jpg", "green": 0.5} for i in range(1, 101)]
    picked = h.select_candidates(scored, threshold=0.18, limit=12)
    assert len(picked) == 12
    assert picked[0]["frame"] == "s_0001.jpg"
    assert picked[-1]["frame"] == "s_0100.jpg"
    # no duplicates from rounding
    assert len({p["frame"] for p in picked}) == 12


def test_turf_green_scores_ranks_field_above_dark(tmp_path):
    cv2 = pytest.importorskip("cv2")
    import numpy as np

    field = tmp_path / "field.jpg"
    dark = tmp_path / "dark.jpg"
    cv2.imwrite(str(field), np.full((120, 200, 3), (40, 120, 40), dtype=np.uint8))
    cv2.imwrite(str(dark), np.full((120, 200, 3), (12, 14, 18), dtype=np.uint8))
    scored = {r["frame"]: r["green"] for r in h.turf_green_scores([field, dark])}
    assert scored[str(field)] > 0.8
    assert scored[str(dark)] < 0.05


def test_audit_batch_escalates_budget_when_reasoning_eats_output(monkeypatch, tmp_path):
    """content=None + finish_reason=length must retry with a bigger budget."""
    img = tmp_path / "f.jpg"
    img.write_bytes(b"\xff\xd8\xff\xd9")
    budgets: list[int] = []

    def fake_post(body, key, timeout=300):
        budgets.append(body["max_tokens"])
        if len(budgets) == 1:
            return {"choices": [{"message": {"content": None}, "finish_reason": "length"}]}
        return {"choices": [{"message": {"content": '[{"frame":1,"frame_type":"live_presnap"}]'},
                             "finish_reason": "stop"}]}

    monkeypatch.setattr(h, "_post", fake_post)
    out = h.audit_batch([img], "fake-key", max_tokens=3000)
    assert out == [{"frame": 1, "frame_type": "live_presnap"}]
    assert budgets[0] == 3000
    assert budgets[1] > budgets[0], "budget must escalate on a length-truncated reply"


def test_audit_batch_parses_fenced_json(monkeypatch, tmp_path):
    img = tmp_path / "f.jpg"
    img.write_bytes(b"\xff\xd8\xff\xd9")

    monkeypatch.setattr(h, "_post", lambda body, key, timeout=300: {
        "choices": [{"message": {"content": '```json\n[{"frame":1,"frame_type":"replay"}]\n```'},
                     "finish_reason": "stop"}]})
    out = h.audit_batch([img], "fake-key")
    assert out == [{"frame": 1, "frame_type": "replay"}]


def test_read_key_from_parses_env_file(tmp_path):
    env = tmp_path / ".env"
    env.write_text("FOO=1\nOPENROUTER_API_KEY=sk-or-test-value\nBAR=2\n", encoding="utf-8")
    assert h.read_key_from(env) == "sk-or-test-value"


def test_read_key_from_returns_none_when_absent(tmp_path):
    env = tmp_path / ".env"
    env.write_text("FOO=1\n", encoding="utf-8")
    assert h.read_key_from(env) is None
    assert h.read_key_from(tmp_path / "missing.env") is None


def test_load_api_key_prefers_environment(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-from-env")
    assert h.load_api_key() == "sk-or-from-env"


# ---------------------------------------------------------------------------
# halftime / out-of-town cut-in quarantine
# ---------------------------------------------------------------------------
def test_matchup_filter_quarantines_other_game_cutin():
    """The real failure: at t=5400s a CHI@SEA broadcast showed DET at 13-9.

    A halftime highlight of another game is a wide turf shot, so it survives
    the green mask and reads as live football. It must not enter CHI@SEA
    tendencies.
    """
    results = [
        {"frame_type": "live_presnap", "teams": "CHI offense vs SEA defense",
         "formation": "shotgun"},
        {"frame_type": "live_inplay", "teams": "DET offense vs CHI defense",
         "formation": "singleback"},
        {"frame_type": "live_inplay", "teams": "unknown"},
        {"frame_type": "graphic", "teams": "CHI vs SEA"},
    ]
    keep, quarantine = h.filter_live_frames_for_matchup(results, ("CHI", "SEA"))
    assert len(keep) == 1
    assert keep[0]["teams"].startswith("CHI offense")
    reasons = sorted(q["_quarantine"] for q in quarantine)
    assert reasons == ["halftime_cutin_other_game", "teams_unreadable"]


def test_matchup_filter_keeps_both_sides():
    results = [
        {"frame_type": "live_presnap", "teams": "SEA offense vs CHI defense"},
        {"frame_type": "live_inplay", "teams": "CHI offense vs SEA defense"},
    ]
    keep, quarantine = h.filter_live_frames_for_matchup(results, ("CHI", "SEA"))
    assert len(keep) == 2
    assert quarantine == []


def test_matchup_filter_no_expected_teams_keeps_unreadable():
    results = [{"frame_type": "live_inplay", "teams": "unknown"}]
    keep, quarantine = h.filter_live_frames_for_matchup(results, None)
    assert keep == []
    assert quarantine[0]["_quarantine"] == "teams_unreadable"
