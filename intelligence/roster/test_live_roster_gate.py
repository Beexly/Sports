"""Offline tests for the mandatory live roster gate (no network)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from intelligence.roster.live_roster_gate import LiveRosterGate, norm_name  # noqa: E402


def _ath(i, name, pos, inj=None):
    a = {"id": i, "fullName": name, "position": {"abbreviation": pos}}
    if inj:
        a["injuries"] = [{"status": inj}]
    return a


ESPN = {
    "det": [_ath(1, "Jahmyr Gibbs", "RB"), _ath(2, "Amon-Ra St. Brown", "WR")],
    "hou": [_ath(3, "David Montgomery", "RB")],
    "phi": [_ath(4, "Saquon Barkley", "RB", "Out")],
    "ari": [_ath(5, "Marvin Harrison Jr.", "WR")],
    "car": [_ath(6, "Chuba Hubbard", "RB")],
}
SLEEPER = {
    "a": {"full_name": "Jahmyr Gibbs", "team": "DET", "position": "RB"},
    "b": {"full_name": "Amon-Ra St. Brown", "team": "DET", "position": "WR"},
    "c": {"full_name": "David Montgomery", "team": "HOU", "position": "RB"},
    "d": {"full_name": "Saquon Barkley", "team": "PHI", "position": "RB", "injury_status": "Out"},
    "e": {"full_name": "Marvin Harrison", "team": "ARI", "position": "WR"},
    "f": {"full_name": "Chuba Hubbard", "team": "DET", "position": "RB"},  # deliberate disagreement
}


def fake_fetch(url):
    if "sleeper" in url:
        return SLEEPER
    team = url.split("/teams/")[1].split("/")[0]
    if team not in ESPN:
        raise IOError("down")
    return {"athletes": [{"items": ESPN[team]}]}


def gate(**kw):
    g = LiveRosterGate(fetch=fake_fetch, **kw)
    g.load(["DET", "HOU", "PHI", "ARI", "CAR"])
    return g


def test_valid_player_passes():
    v = gate().verify("Jahmyr Gibbs", "DET")
    assert v.ok and v.espn_id == "1"


def test_stale_team_blocked_montgomery():
    v = gate().verify("David Montgomery", "DET")
    assert not v.ok and "HOU" in v.reason


def test_not_in_league_blocked_diontae():
    assert not gate().verify("Diontae Johnson", "CAR").ok


def test_inactive_blocked():
    v = gate().verify("Saquon Barkley", "PHI")
    assert not v.ok and "out" in v.reason.lower()


def test_last_first_order_resolves_and_still_blocks_inactive():
    v = gate().verify("Barkley, Saquon", "PHI")
    assert not v.ok and "out" in v.reason.lower()


def test_suffix_is_identity_no_false_block():
    assert gate().verify("Marvin Harrison Jr.", "ARI").ok


def test_suffix_missing_does_not_resolve_to_junior():
    assert norm_name("Marvin Harrison") != norm_name("Marvin Harrison Jr.")
    assert not gate().verify("Marvin Harrison", "ARI").ok


def test_sleeper_disagreement_blocks():
    v = gate().verify("Chuba Hubbard", "CAR")
    assert not v.ok and "Sleeper" in v.reason


def test_espn_feed_failure_fails_closed():
    g = LiveRosterGate(fetch=fake_fetch)
    g.load(["DET", "NYJ"])
    assert not g.verify("Garrett Wilson", "NYJ").ok
    assert g.feed_errors


def test_sleeper_failure_fails_closed():
    def f(url):
        if "sleeper" in url:
            raise IOError("down")
        return fake_fetch(url)
    g = LiveRosterGate(fetch=f)
    g.load(["DET"])
    assert not g.verify("Jahmyr Gibbs", "DET").ok


def test_empty_report_does_not_pass():
    assert not gate().verify_players([]).passed
