"""Tests for the analytics instrumentation coverage audit."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
_MOD = REPO / "scripts" / "ops" / "analytics_coverage.py"

_spec = importlib.util.spec_from_file_location("analytics_coverage", _MOD)
ac = importlib.util.module_from_spec(_spec)
sys.modules["analytics_coverage"] = ac
_spec.loader.exec_module(ac)  # type: ignore[union-attr]


TAXONOMY = '''
export type AnalyticsEvent =
  | "pricing_page_view"
  | "plan_card_view"
  // a comment between members must not become an event
  | "locked_pick_click"
  | "feature_lock_click";
'''


def _write(tmp_path, name, body):
    p = tmp_path / name
    p.write_text(body, encoding="utf-8")
    return p


# --- taxonomy parsing -----------------------------------------------------

def test_parse_taxonomy_finds_every_member():
    assert ac.parse_taxonomy(TAXONOMY) == [
        "pricing_page_view", "plan_card_view", "locked_pick_click", "feature_lock_click",
    ]


def test_parse_taxonomy_ignores_comments_between_members():
    events = ac.parse_taxonomy(TAXONOMY)
    assert not any("comment" in e for e in events)


def test_parse_taxonomy_deduplicates():
    text = 'export type AnalyticsEvent = | "a" | "a" | "b";'
    assert ac.parse_taxonomy(text) == ["a", "b"]


# --- call-site counting ---------------------------------------------------

def test_fired_events_counts_both_quote_styles(tmp_path):
    f1 = _write(tmp_path, "a.ts", 'track("pricing_page_view", {tier});\n')
    f2 = _write(tmp_path, "b.tsx", "track('plan_card_view');\n")
    counts = ac.fired_events([f1, f2], ["pricing_page_view", "plan_card_view", "locked_pick_click"])
    assert counts["pricing_page_view"] == 1
    assert counts["plan_card_view"] == 1
    assert counts["locked_pick_click"] == 0


def test_fired_events_counts_multiple_files(tmp_path):
    f1 = _write(tmp_path, "a.ts", 'track("x_event");\n')
    f2 = _write(tmp_path, "b.ts", 'track("x_event");\n')
    assert ac.fired_events([f1, f2], ["x_event"])["x_event"] == 2


def test_fired_events_ignores_a_bare_mention_of_the_name(tmp_path):
    """A string that is not a track() call must not count as emission."""
    f = _write(tmp_path, "a.ts", 'const label = "locked_pick_click";\n')
    assert ac.fired_events([f], ["locked_pick_click"])["locked_pick_click"] == 0


# --- sink detection -------------------------------------------------------

def test_strip_comments_removes_line_and_block_comments():
    code = "a(); // fetch(x)\n/* posthog */ b();"
    out = ac.strip_comments(code)
    assert "fetch(" not in out
    assert "posthog" not in out
    assert "a();" in out and "b();" in out


def test_sink_is_not_wired_when_only_a_comment_mentions_the_provider():
    """Regression: the real track() documents window.analytics in a COMMENT.

    A naive token scan read that as a wired sink and reported the opposite of
    the truth.
    """
    text = '''
export function track(event, context = {}) {
  // When a provider is wired, dispatch here (e.g. window.analytics?.track(...)).
  // Intentionally inert for now - no network, no identity.
  return { event, context };
}
'''
    status = ac.sink_status(text)
    assert status["wired"] is False
    assert status["explicitly_inert"] is True


def test_sink_is_wired_when_the_body_actually_calls_fetch():
    text = '''
export function track(event, context = {}) {
  fetch("/api/events", { method: "POST", body: JSON.stringify({ event }) });
  return { event, context };
}
'''
    assert ac.sink_status(text)["wired"] is True


def test_sink_detects_sendbeacon():
    text = '''
export function track(e, c = {}) {
  navigator.sendBeacon("/e", JSON.stringify(c));
  return e;
}
'''
    assert ac.sink_status(text)["wired"] is True


# --- stage grouping -------------------------------------------------------

def test_every_declared_event_in_the_real_taxonomy_is_staged():
    """A taxonomy event with no stage is invisible in the funnel report."""
    text = (REPO / "apps" / "web" / "lib" / "analytics" / "events.ts").read_text(encoding="utf-8")
    events = set(ac.parse_taxonomy(text))
    staged = {e for members in ac.STAGES.values() for e in members}
    unstaged = events - staged
    assert not unstaged, f"events with no funnel stage: {sorted(unstaged)}"


def test_stage_members_are_all_real_events():
    text = (REPO / "apps" / "web" / "lib" / "analytics" / "events.ts").read_text(encoding="utf-8")
    events = set(ac.parse_taxonomy(text))
    staged = {e for members in ac.STAGES.values() for e in members}
    phantom = staged - events
    assert not phantom, f"staged events that do not exist: {sorted(phantom)}"
