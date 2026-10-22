"""
adversarial_test_harness.py
===========================
Adversarial Verification Harness for GSE Engine Gate & Live Roster Gate.
Executed by Challenger 1: Engine Gate & Roster Gate Adversarial Verifier.

Tests 8 Adversarial Vectors:
  1. Corrupt / Expired Timestamps (>30m old lines/odds, >7d old history, malformed strings)
  2. Banned Source Strings ("manual", "hand", "inline", "hardcoded", "llm", "assumed", None, whitespace/casing)
  3. Non-Sourced Primitive Floats/Types (bare float/int/list/dict/None into Candidate fields)
  4. Extreme Sample Counts (n=0, n=1, n=4, None-filtered, n=10,000 extreme, negative LCB edge)
  5. Stale Roster Candidates (David Montgomery on DET, Andy Dalton on CAR, Diontae Johnson on CAR, suffix mismatch)
  6. Inactive Players (marked 'out', 'ir', 'pup', 'doubtful', 'suspended', 'nfi', 'reserve', 'Last, First' format)
  7. Network Failure Simulation (ESPN HTTP error, Sleeper HTTP error, dual failure, malformed payload, JEV failure)
  8. Attempted Publication Guards (publishable() rejection of dicts, unstamped objects, gated failures, missing fields)
"""
import copy
import math
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from intelligence.roster.live_roster_gate import LiveRosterGate, norm_name, canon_team
from frontier.sports.engine_gate import (
    Candidate,
    EngineGate,
    Sourced,
    bootstrap_free_lcb,
    publishable,
    EmittedPick,
    GateLog,
    HAND_TYPED_SOURCES,
    DEFAULT_MAX_AGE_MIN,
)

NOW = datetime(2026, 10, 4, 23, 0, 0, tzinfo=timezone.utc)


def make_sourced(val: Any, src: str = "espn_odds_feed", age_min: float = 1.0) -> Sourced:
    return Sourced(val, src, (NOW - timedelta(minutes=age_min)).isoformat())


def make_clean_cand(player="Jahmyr Gibbs", team="DET", hist=None, **kw) -> Candidate:
    h = hist if hist is not None else [80, 92, 60, 101, 88, 95, 77, 110, 85, 99, 90, 104]
    data = dict(
        id="cand_test",
        player=player,
        team=team,
        market="rushing_yards",
        side="OVER",
        line=make_sourced(74.5, "espn_lines", 2.0),
        odds=make_sourced(-115.0, "espn_odds", 2.0),
        projection=make_sourced(88.0, "nflverse_proj", 60.0),
        history=make_sourced(h, "nflverse_pbp", 120.0),
        context="CAR",
        is_team_market=False,
        sport_key="americanfootball_nfl",
    )
    data.update(kw)
    return Candidate(**data)


def mock_jev_certified(qs, state):
    return {q["id"]: {"choice": "CERTIFIED", "confidence": 0.85} for q in qs}


# Build standard mock roster gate
def build_test_roster_gate(custom_fetch=None) -> LiveRosterGate:
    def _ath(i, name, pos, inj=None, status_type=None):
        a = {"id": str(i), "fullName": name, "position": {"abbreviation": pos}}
        if inj:
            a["injuries"] = [{"status": inj}]
        if status_type:
            a["status"] = {"type": status_type}
        return a

    espn_mock = {
        "det": [
            _ath(1, "Jahmyr Gibbs", "RB"),
            _ath(2, "Amon-Ra St. Brown", "WR"),
            _ath(3, "Jameson Williams", "WR"),
        ],
        "hou": [
            _ath(4, "David Montgomery", "RB"),  # Montgomery is on HOU!
        ],
        "phi": [
            _ath(5, "Saquon Barkley", "RB", inj="Out"),
            _ath(6, "Andy Dalton", "QB"),       # Dalton is on PHI!
        ],
        "car": [
            _ath(7, "Chuba Hubbard", "RB"),
            _ath(8, "Tetairoa McMillan", "WR"),
            _ath(9, "Bryce Young", "QB"),
            _ath(10, "Adam Thielen", "WR", inj="IR"),
            _ath(11, "Miles Sanders", "RB", status_type="PUP"),
        ],
        "ari": [
            _ath(12, "Marvin Harrison Jr.", "WR"),
        ],
    }

    sleeper_mock = {
        "1": {"full_name": "Jahmyr Gibbs", "team": "DET", "position": "RB"},
        "2": {"full_name": "Amon-Ra St. Brown", "team": "DET", "position": "WR"},
        "3": {"full_name": "Jameson Williams", "team": "DET", "position": "WR"},
        "4": {"full_name": "David Montgomery", "team": "HOU", "position": "RB"},
        "5": {"full_name": "Saquon Barkley", "team": "PHI", "position": "RB", "injury_status": "Out"},
        "6": {"full_name": "Andy Dalton", "team": "PHI", "position": "QB"},
        "7": {"full_name": "Chuba Hubbard", "team": "CAR", "position": "RB"},
        "8": {"full_name": "Tetairoa McMillan", "team": "CAR", "position": "WR"},
        "9": {"full_name": "Bryce Young", "team": "CAR", "position": "QB"},
        "10": {"full_name": "Adam Thielen", "team": "CAR", "position": "WR", "injury_status": "IR"},
        "11": {"full_name": "Miles Sanders", "team": "CAR", "position": "RB", "injury_status": "PUP"},
        "12": {"full_name": "Marvin Harrison", "team": "ARI", "position": "WR"}, # sleeper suffix omitted
    }

    def default_fetch(url: str):
        if "sleeper" in url:
            return sleeper_mock
        team = url.split("/teams/")[1].split("/")[0]
        if team not in espn_mock:
            raise IOError(f"Mock network error: team {team} not found")
        return {"athletes": [{"items": espn_mock[team]}]}

    fetch_fn = custom_fetch or default_fetch
    rg = LiveRosterGate(fetch=fetch_fn, use_sleeper=True)
    rg.load(["DET", "HOU", "PHI", "CAR", "ARI"])
    return rg


class AdversarialTestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results: List[Dict[str, Any]] = []

    def record(self, vector: str, name: str, passed: bool, detail: str = ""):
        if passed:
            self.passed += 1
            print(f"  [PASS] {vector} :: {name} -- {detail}")
        else:
            self.failed += 1
            print(f"  [FAIL] {vector} :: {name} -- {detail}")
        self.results.append({"vector": vector, "name": name, "passed": passed, "detail": detail})

    def run_all(self):
        print("=" * 90)
        print("RUNNING ADVERSARIAL STRESS TEST HARNESS")
        print("=" * 90)

        self.test_vector_1_timestamps()
        self.test_vector_2_banned_sources()
        self.test_vector_3_non_sourced_primitives()
        self.test_vector_4_extreme_sample_counts()
        self.test_vector_5_stale_rosters()
        self.test_vector_6_inactive_players()
        self.test_vector_7_network_failures()
        self.test_vector_8_publication_guards()
        self.test_vector_9_law9_boundaries()
        self.test_vector_10_parlay_adversarial()

        print("=" * 90)
        print(f"SUMMARY: Total Tests: {self.passed + self.failed} | Passed: {self.passed} | Failed: {self.failed}")
        print("=" * 90)
        return self.failed == 0

    # ---------------- VECTOR 1: TIMESTAMPS ----------------
    def test_vector_1_timestamps(self):
        print("\n--- VECTOR 1: Corrupt / Expired Timestamps ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # 1.1 Stale line (>30m)
        c = make_clean_cand(line=make_sourced(74.5, "espn", age_min=31))
        p = engine.evaluate([c], "test")[0]
        g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
        self.record("V1", "Line age 31 min (>30m max)", p.status == "ABSTAIN" and not publishable(p) and bool(g2),
                    f"Status={p.status}, G2 fail: {g2[0].detail if g2 else 'none'}")

        # 1.2 Stale odds (>30m)
        c = make_clean_cand(odds=make_sourced(-115, "espn", age_min=300))
        p = engine.evaluate([c], "test")[0]
        g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
        self.record("V1", "Odds age 300 min (>30m max)", p.status == "ABSTAIN" and not publishable(p) and bool(g2),
                    f"Status={p.status}, G2 fail: {g2[0].detail if g2 else 'none'}")

        # 1.3 Stale projection (>24h = 1440m)
        c = make_clean_cand(projection=make_sourced(88.0, "espn", age_min=1441))
        p = engine.evaluate([c], "test")[0]
        g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
        self.record("V1", "Projection age 1441 min (>24h max)", p.status == "ABSTAIN" and not publishable(p) and bool(g2),
                    f"Status={p.status}, G2 fail: {g2[0].detail if g2 else 'none'}")

        # 1.4 Stale history (>7d = 10080m)
        c = make_clean_cand(history=make_sourced([80, 90, 85, 95, 100], "pbp", age_min=10081))
        p = engine.evaluate([c], "test")[0]
        g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
        self.record("V1", "History age 10081 min (>7d max)", p.status == "ABSTAIN" and not publishable(p) and bool(g2),
                    f"Status={p.status}, G2 fail: {g2[0].detail if g2 else 'none'}")

        # 1.5 Corrupt timestamp strings
        for bad_ts in ["not_a_valid_date", "2026-99-99T99:99:99", "", "yesterday", "2026-13-45T00:00:00Z"]:
            c = make_clean_cand(line=Sourced(74.5, "espn", bad_ts))
            p = engine.evaluate([c], "test")[0]
            g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
            self.record("V1", f"Malformed captured_at {bad_ts!r}",
                        p.status == "ABSTAIN" and not publishable(p) and bool(g2) and "invalid captured_at" in g2[0].detail,
                        f"G2 detail: {g2[0].detail if g2 else 'none'}")

    # ---------------- VECTOR 2: BANNED SOURCES ----------------
    def test_vector_2_banned_sources(self):
        print("\n--- VECTOR 2: Banned Source Strings ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        banned_list = ["", "manual", "hand", "inline", "hardcoded", "llm", "assumed", None,
                       " MANUAL ", "Hand", "InLiNe", "  hardcoded  ", "LLM", "Assumed "]
        for src in banned_list:
            c = make_clean_cand(line=Sourced(74.5, src, NOW.isoformat()))
            p = engine.evaluate([c], "test")[0]
            g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
            ok = p.status == "ABSTAIN" and not publishable(p) and bool(g2) and "hand-typed/unsourced" in g2[0].detail
            self.record("V2", f"Banned source string {src!r} on line", ok,
                        f"G2 detail: {g2[0].detail if g2 else 'none'}")

        # Test across all 4 sourced fields with banned source
        for field_name in ["line", "odds", "projection", "history"]:
            kwargs = {}
            if field_name == "history":
                kwargs[field_name] = Sourced([80, 90, 85, 95, 100], "inline", NOW.isoformat())
            else:
                kwargs[field_name] = Sourced(50.0, "manual", NOW.isoformat())
            c = make_clean_cand(**kwargs)
            p = engine.evaluate([c], "test")[0]
            g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
            ok = p.status == "ABSTAIN" and not publishable(p) and any(field_name in g.detail for g in g2)
            self.record("V2", f"Banned source on field {field_name}", ok,
                        f"Flagged {field_name}: {[g.detail for g in g2]}")

    # ---------------- VECTOR 3: NON-SOURCED PRIMITIVES ----------------
    def test_vector_3_non_sourced_primitives(self):
        print("\n--- VECTOR 3: Non-Sourced Primitive Types Passed into Candidate ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # 3.1 Primitive float line -> raises AttributeError at evaluate (expected validation error)
        c_line = make_clean_cand(line=74.5)
        raised_attr_err = False
        try:
            p = engine.evaluate([c_line], "test")[0]
            ok = p.status == "ABSTAIN" and not publishable(p)
        except AttributeError as e:
            raised_attr_err = True
            ok = "value" in str(e)
        self.record("V3", "Bare float for line (74.5) blocked by validation error or ABSTAIN", ok,
                    f"Raised AttributeError: {raised_attr_err}")

        # 3.2 Primitive int/float odds -> fails closed to ABSTAIN via G2
        c_odds = make_clean_cand(odds=-115.0)
        p_odds = engine.evaluate([c_odds], "test")[0]
        g2_odds = [g for g in p_odds.gates if g.gate == "G2" and not g.ok]
        ok_odds = (p_odds.status == "ABSTAIN" and not publishable(p_odds)
                   and any("odds: bare value" in g.detail for g in g2_odds))
        self.record("V3", "Bare float for odds (-115.0) fails closed to ABSTAIN", ok_odds,
                    f"Status={p_odds.status}, G2 detail: {[g.detail for g in g2_odds]}")

        # 3.3 Primitive float projection -> fails closed to ABSTAIN via G2
        c_proj = make_clean_cand(projection=88.0)
        p_proj = engine.evaluate([c_proj], "test")[0]
        g2_proj = [g for g in p_proj.gates if g.gate == "G2" and not g.ok]
        ok_proj = (p_proj.status == "ABSTAIN" and not publishable(p_proj)
                   and any("projection: bare value" in g.detail for g in g2_proj))
        self.record("V3", "Bare float for projection (88.0) fails closed to ABSTAIN", ok_proj,
                    f"Status={p_proj.status}, G2 detail: {[g.detail for g in g2_proj]}")

        # 3.4 Primitive list history -> fails closed to ABSTAIN via G2
        c_hist = make_clean_cand(history=[80, 92, 100, 85, 90])
        p_hist = engine.evaluate([c_hist], "test")[0]
        g2_hist = [g for g in p_hist.gates if g.gate == "G2" and not g.ok]
        ok_hist = (p_hist.status == "ABSTAIN" and not publishable(p_hist)
                   and any("history: bare value" in g.detail for g in g2_hist))
        self.record("V3", "Bare list for history fails closed to ABSTAIN", ok_hist,
                    f"Status={p_hist.status}, G2 detail: {[g.detail for g in g2_hist]}")

        # 3.5 None passed for Sourced fields
        for field_name in ["odds", "projection", "history"]:
            c = make_clean_cand(**{field_name: None})
            p = engine.evaluate([c], "test")[0]
            g2 = [g for g in p.gates if g.gate == "G2" and not g.ok]
            ok = p.status == "ABSTAIN" and not publishable(p) and any(f"{field_name}: bare value" in g.detail for g in g2)
            self.record("V3", f"None passed for {field_name} fails closed to ABSTAIN", ok,
                        f"Status={p.status}, G2 detail: {[g.detail for g in g2]}")

        # None passed for line -> raises AttributeError or fails closed
        c_line_none = make_clean_cand(line=None)
        line_none_blocked = False
        try:
            p = engine.evaluate([c_line_none], "test")[0]
            line_none_blocked = p.status == "ABSTAIN" and not publishable(p)
        except AttributeError:
            line_none_blocked = True
        self.record("V3", "None passed for line blocked by validation error or ABSTAIN", line_none_blocked,
                    "AttributeError raised or ABSTAIN emitted")

        # 3.6 Arbitrary dict passed for odds / projection / history
        for field_name in ["odds", "projection", "history"]:
            c_dict = make_clean_cand(**{field_name: {"val": 50.0}})
            p_dict = engine.evaluate([c_dict], "test")[0]
            g2_d = [g for g in p_dict.gates if g.gate == "G2" and not g.ok]
            ok_d = (p_dict.status == "ABSTAIN" and not publishable(p_dict)
                    and any(f"{field_name}: bare value" in g.detail for g in g2_d))
            self.record("V3", f"Dict passed for {field_name} fails closed to ABSTAIN", ok_d,
                        f"Status={p_dict.status}, G2 detail: {[g.detail for g in g2_d]}")

    # ---------------- VECTOR 4: EXTREME SAMPLE COUNTS ----------------
    def test_vector_4_extreme_sample_counts(self):
        print("\n--- VECTOR 4: Extreme Sample Counts (n=0, 1, 4, 10000, etc.) ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # Direct function check: bootstrap_free_lcb
        # n = 0
        lcb_0 = bootstrap_free_lcb([], 74.5, "OVER")
        self.record("V4", "bootstrap_free_lcb on n=0 returns None", lcb_0 is None, f"Result={lcb_0}")

        # n = 1
        lcb_1 = bootstrap_free_lcb([85.0], 74.5, "OVER")
        self.record("V4", "bootstrap_free_lcb on n=1 returns None", lcb_1 is None, f"Result={lcb_1}")

        # n = 4 (all hits)
        lcb_4 = bootstrap_free_lcb([80.0, 85.0, 90.0, 95.0], 74.5, "OVER")
        self.record("V4", "bootstrap_free_lcb on n=4 (100% win rate) returns None", lcb_4 is None, f"Result={lcb_4}")

        # n = 5 with None items -> filtered to 3
        lcb_none = bootstrap_free_lcb([80.0, None, 90.0, None, 100.0], 74.5, "OVER")
        self.record("V4", "bootstrap_free_lcb on 5 items with 2 Nones (effective n=3) returns None",
                    lcb_none is None, f"Result={lcb_none}")

        # Gate execution with n = 0, 1, 4
        for n_count, hist in [(0, []), (1, [85.0]), (4, [80.0, 85.0, 90.0, 95.0])]:
            c = make_clean_cand(hist=hist)
            p = engine.evaluate([c], "test")[0]
            g4 = [g for g in p.gates if g.gate == "G4"]
            ok = p.status == "ABSTAIN" and not publishable(p) and bool(g4) and not g4[0].ok and f"n={n_count} < 5" in g4[0].detail
            self.record("V4", f"EngineGate execution with n={n_count} samples", ok,
                        f"Status={p.status}, G4 detail={g4[0].detail if g4 else 'none'}")

        # Valid n = 5 (all wins)
        c5 = make_clean_cand(hist=[80.0, 85.0, 90.0, 95.0, 100.0])
        p5 = engine.evaluate([c5], "test")[0]
        self.record("V4", "EngineGate execution with valid n=5 (100% win rate) evaluates properly",
                    p5.win_prob == 1.0 and p5.status == "PLAY" and publishable(p5),
                    f"Status={p5.status}, win_prob={p5.win_prob}, lcb_edge={p5.lcb_edge_pct:.1f}%")

        # Negative LCB edge: n=10, only 3 hits -> Law 9 fail-closed
        c_neg = make_clean_cand(hist=[50, 40, 30, 80, 85, 90, 45, 55, 60, 65])
        p_neg = engine.evaluate([c_neg], "test")[0]
        g4_neg = next(g for g in p_neg.gates if g.gate == "G4")
        self.record("V4", "Law 9 fail-closed on negative LCB edge (3 hits / 10 games)",
                    p_neg.status == "ABSTAIN" and not publishable(p_neg) and not g4_neg.ok and "lcb_edge=" in g4_neg.detail,
                    f"Status={p_neg.status}, G4 detail={g4_neg.detail}")

        # Extreme large sample count: n = 10,000
        t0 = time.perf_counter()
        large_hist = [80.0 if i % 3 != 0 else 60.0 for i in range(10000)] # 66.7% win rate
        lcb_large = bootstrap_free_lcb(large_hist, 74.5, "OVER")
        t_lcb = time.perf_counter() - t0
        self.record("V4", f"bootstrap_free_lcb on n=10,000 runs in {t_lcb*1000:.2f}ms",
                    lcb_large is not None and lcb_large["n"] == 10000 and 0.65 < lcb_large["p_hat"] < 0.68,
                    f"n={lcb_large['n']}, p_hat={lcb_large['p_hat']:.4f}, p_lcb={lcb_large['p_lcb']:.4f}")

        # EngineGate with n = 10,000
        t0 = time.perf_counter()
        c_large = make_clean_cand(hist=large_hist)
        p_large = engine.evaluate([c_large], "test")[0]
        t_gate = time.perf_counter() - t0
        self.record("V4", f"EngineGate evaluation on n=10,000 runs in {t_gate*1000:.2f}ms without overflow/NaN",
                    p_large.status == "PLAY" and publishable(p_large) and not math.isnan(p_large.lcb_edge_pct),
                    f"Status={p_large.status}, LCB edge={p_large.lcb_edge_pct:.2f}%")

    # ---------------- VECTOR 5: STALE ROSTERS ----------------
    def test_vector_5_stale_rosters(self):
        print("\n--- VECTOR 5: Stale Roster Candidates ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # 5.1 David Montgomery on DET (traded to HOU)
        v_mont = rg.verify("David Montgomery", "DET")
        c_mont = make_clean_cand(player="David Montgomery", team="DET")
        p_mont = engine.evaluate([c_mont], "test")[0]
        ok_mont = (not v_mont.ok and "stale roster" in v_mont.reason and "HOU" in v_mont.reason
                   and p_mont.status == "ABSTAIN" and not publishable(p_mont))
        self.record("V5", "David Montgomery on DET detected as stale (live team HOU)", ok_mont,
                    f"Roster reason: {v_mont.reason}; Gate status: {p_mont.status}")

        # 5.2 Andy Dalton on CAR (live team PHI)
        v_dalton = rg.verify("Andy Dalton", "CAR")
        c_dalton = make_clean_cand(player="Andy Dalton", team="CAR", market="passing_yards", line=make_sourced(210.5))
        p_dalton = engine.evaluate([c_dalton], "test")[0]
        ok_dalton = (not v_dalton.ok and "stale roster" in v_dalton.reason and "PHI" in v_dalton.reason
                     and p_dalton.status == "ABSTAIN" and not publishable(p_dalton))
        self.record("V5", "Andy Dalton on CAR detected as stale (live team PHI)", ok_dalton,
                    f"Roster reason: {v_dalton.reason}; Gate status: {p_dalton.status}")

        # 5.3 Diontae Johnson on CAR (not on active NFL roster)
        v_diontae = rg.verify("Diontae Johnson", "CAR")
        c_diontae = make_clean_cand(player="Diontae Johnson", team="CAR", market="receiving_yards", line=make_sourced(45.5))
        p_diontae = engine.evaluate([c_diontae], "test")[0]
        ok_diontae = (not v_diontae.ok and "not on any live NFL roster" in v_diontae.reason
                      and p_diontae.status == "ABSTAIN" and not publishable(p_diontae))
        self.record("V5", "Diontae Johnson on CAR blocked (unlisted on active rosters)", ok_diontae,
                    f"Roster reason: {v_diontae.reason}; Gate status: {p_diontae.status}")

        # 5.4 Completely synthetic player
        v_fake = rg.verify("Fake Player Jr.", "DET")
        c_fake = make_clean_cand(player="Fake Player Jr.", team="DET")
        p_fake = engine.evaluate([c_fake], "test")[0]
        ok_fake = (not v_fake.ok and "not on any live NFL roster" in v_fake.reason
                   and p_fake.status == "ABSTAIN" and not publishable(p_fake))
        self.record("V5", "Synthetic player 'Fake Player Jr.' blocked", ok_fake,
                    f"Roster reason: {v_fake.reason}; Gate status: {p_fake.status}")

        # 5.5 Suffix mismatch: "Marvin Harrison" vs "Marvin Harrison Jr."
        v_sr = rg.verify("Marvin Harrison", "ARI")
        c_sr = make_clean_cand(player="Marvin Harrison", team="ARI", market="receiving_yards", line=make_sourced(60.5))
        p_sr = engine.evaluate([c_sr], "test")[0]
        ok_sr = (not v_sr.ok and p_sr.status == "ABSTAIN" and not publishable(p_sr))
        self.record("V5", "Omission of suffix ('Marvin Harrison' for Jr.) blocked", ok_sr,
                    f"Roster reason: {v_sr.reason}; Gate status: {p_sr.status}")

        # 5.6 Correct suffix passes
        v_jr = rg.verify("Marvin Harrison Jr.", "ARI")
        self.record("V5", "Correct identity ('Marvin Harrison Jr.') passes Live Roster Gate",
                    v_jr.ok and v_jr.espn_id == "12", f"Reason: {v_jr.reason}, id: {v_jr.espn_id}")

    # ---------------- VECTOR 6: INACTIVE PLAYERS ----------------
    def test_vector_6_inactive_players(self):
        print("\n--- VECTOR 6: Inactive Players (OUT, IR, PUP, Doubtful, etc.) ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # 6.1 Saquon Barkley on PHI (marked Out)
        v_barkley = rg.verify("Saquon Barkley", "PHI")
        c_barkley = make_clean_cand(player="Saquon Barkley", team="PHI")
        p_barkley = engine.evaluate([c_barkley], "test")[0]
        ok_barkley = (not v_barkley.ok and "out" in v_barkley.reason.lower()
                      and p_barkley.status == "ABSTAIN" and not publishable(p_barkley))
        self.record("V6", "Saquon Barkley marked 'Out' blocked", ok_barkley,
                    f"Roster reason: {v_barkley.reason}; Gate status: {p_barkley.status}")

        # 6.2 Adam Thielen on CAR (marked IR)
        v_thielen = rg.verify("Adam Thielen", "CAR")
        c_thielen = make_clean_cand(player="Adam Thielen", team="CAR", market="receiving_yards", line=make_sourced(35.5))
        p_thielen = engine.evaluate([c_thielen], "test")[0]
        ok_thielen = (not v_thielen.ok and "ir" in v_thielen.reason.lower()
                      and p_thielen.status == "ABSTAIN" and not publishable(p_thielen))
        self.record("V6", "Adam Thielen marked 'IR' blocked", ok_thielen,
                    f"Roster reason: {v_thielen.reason}; Gate status: {p_thielen.status}")

        # 6.3 Miles Sanders on CAR (marked PUP)
        v_sanders = rg.verify("Miles Sanders", "CAR")
        c_sanders = make_clean_cand(player="Miles Sanders", team="CAR", market="rushing_yards", line=make_sourced(25.5))
        p_sanders = engine.evaluate([c_sanders], "test")[0]
        ok_sanders = (not v_sanders.ok and "pup" in v_sanders.reason.lower()
                      and p_sanders.status == "ABSTAIN" and not publishable(p_sanders))
        self.record("V6", "Miles Sanders marked 'PUP' blocked", ok_sanders,
                    f"Roster reason: {v_sanders.reason}; Gate status: {p_sanders.status}")

        # 6.4 Name formatting "Last, First" with inactive player
        v_lf = rg.verify("Barkley, Saquon", "PHI")
        c_lf = make_clean_cand(player="Barkley, Saquon", team="PHI")
        p_lf = engine.evaluate([c_lf], "test")[0]
        ok_lf = (not v_lf.ok and "out" in v_lf.reason.lower()
                 and p_lf.status == "ABSTAIN" and not publishable(p_lf))
        self.record("V6", "'Last, First' formatted inactive player ('Barkley, Saquon') blocked", ok_lf,
                    f"Roster reason: {v_lf.reason}; Gate status: {p_lf.status}")

        # 6.5 Sleeper-only inactive status test
        def sleeper_inactive_fetch(url: str):
            if "sleeper" in url:
                return {"1": {"full_name": "Jahmyr Gibbs", "team": "DET", "position": "RB", "injury_status": "Doubtful"}}
            return {"athletes": [{"items": [{"id": "1", "fullName": "Jahmyr Gibbs", "position": {"abbreviation": "RB"}}]}]}
        rg_sl_inj = LiveRosterGate(fetch=sleeper_inactive_fetch)
        rg_sl_inj.load(["DET"])
        v_sl_inj = rg_sl_inj.verify("Jahmyr Gibbs", "DET")
        self.record("V6", "Sleeper injury_status 'Doubtful' blocks even if ESPN is clean",
                    not v_sl_inj.ok and "doubtful" in v_sl_inj.reason.lower(), f"Reason: {v_sl_inj.reason}")

    # ---------------- VECTOR 7: NETWORK FAILURES ----------------
    def test_vector_7_network_failures(self):
        print("\n--- VECTOR 7: Network Failure Simulation (Fail-Closed) ---")

        # 7.1 ESPN API raises network exception (e.g., HTTP 500, ConnectionRefused)
        def espn_broken_fetch(url: str):
            if "sleeper" in url:
                return {"1": {"full_name": "Jahmyr Gibbs", "team": "DET", "position": "RB"}}
            raise ConnectionResetError("ESPN API connection reset by peer")

        rg_espn_down = LiveRosterGate(fetch=espn_broken_fetch)
        rg_espn_down.load(["DET"])
        v_espn_down = rg_espn_down.verify("Jahmyr Gibbs", "DET")
        engine_espn_down = EngineGate(rg_espn_down, jev=mock_jev_certified, now=NOW)
        p_espn_down = engine_espn_down.evaluate([make_clean_cand()], "test")[0]
        ok_espn = (not v_espn_down.ok and "unavailable (fail closed)" in v_espn_down.reason
                   and p_espn_down.status == "ABSTAIN" and not publishable(p_espn_down))
        self.record("V7", "ESPN network failure fails closed to ABSTAIN", ok_espn,
                    f"Feed errors: {rg_espn_down.feed_errors}; Reason: {v_espn_down.reason}")

        # 7.2 Sleeper API raises network exception
        def sleeper_broken_fetch(url: str):
            if "sleeper" in url:
                raise TimeoutError("Sleeper API timed out after 15s")
            return {"athletes": [{"items": [{"id": "1", "fullName": "Jahmyr Gibbs", "position": {"abbreviation": "RB"}}]}]}

        rg_sl_down = LiveRosterGate(fetch=sleeper_broken_fetch)
        rg_sl_down.load(["DET"])
        v_sl_down = rg_sl_down.verify("Jahmyr Gibbs", "DET")
        engine_sl_down = EngineGate(rg_sl_down, jev=mock_jev_certified, now=NOW)
        p_sl_down = engine_sl_down.evaluate([make_clean_cand()], "test")[0]
        ok_sl = (not v_sl_down.ok and "Sleeper cross-check unavailable (fail closed)" in v_sl_down.reason
                 and p_sl_down.status == "ABSTAIN" and not publishable(p_sl_down))
        self.record("V7", "Sleeper network failure fails closed to ABSTAIN", ok_sl,
                    f"Feed errors: {rg_sl_down.feed_errors}; Reason: {v_sl_down.reason}")

        # 7.3 Dual network failure (both ESPN and Sleeper down)
        def dual_broken_fetch(url: str):
            raise IOError("Total network blackout")

        rg_dual_down = LiveRosterGate(fetch=dual_broken_fetch)
        rg_dual_down.load(["DET"])
        v_dual = rg_dual_down.verify("Jahmyr Gibbs", "DET")
        self.record("V7", "Dual network failure fails closed to ABSTAIN",
                    not v_dual.ok and len(rg_dual_down.feed_errors) == 2,
                    f"Feed errors count: {len(rg_dual_down.feed_errors)}")

        # 7.4 Malformed ESPN response (missing athletes, empty dict, or non-json)
        def malformed_espn_fetch(url: str):
            if "sleeper" in url:
                return {}
            return {"status": "success"} # missing 'athletes' key -> raises ValueError
        rg_malformed = LiveRosterGate(fetch=malformed_espn_fetch)
        rg_malformed.load(["DET"])
        v_mal = rg_malformed.verify("Jahmyr Gibbs", "DET")
        self.record("V7", "Malformed ESPN response fails closed to ABSTAIN",
                    not v_mal.ok and "empty ESPN roster" in str(rg_malformed.feed_errors),
                    f"Feed errors: {rg_malformed.feed_errors}")

        # 7.5 JEV arbitration failure simulations
        rg_clean = build_test_roster_gate()

        # JEV timeout exception
        def jev_timeout(qs, s):
            raise TimeoutError("JEV subprocess timed out after 30s")
        p_jev_to = EngineGate(rg_clean, jev=jev_timeout, now=NOW).evaluate([make_clean_cand()], "test")[0]
        g3_to = next(g for g in p_jev_to.gates if g.gate == "G3")
        self.record("V7", "JEV timeout exception fails closed to ABSTAIN",
                    p_jev_to.status == "ABSTAIN" and not publishable(p_jev_to) and not g3_to.ok and "JEV unavailable" in g3_to.detail,
                    f"G3 detail: {g3_to.detail}")

        # JEV empty answer
        p_jev_empty = EngineGate(rg_clean, jev=lambda q, s: {}, now=NOW).evaluate([make_clean_cand()], "test")[0]
        g3_empty = next(g for g in p_jev_empty.gates if g.gate == "G3")
        self.record("V7", "JEV empty response fails closed to ABSTAIN",
                    p_jev_empty.status == "ABSTAIN" and not publishable(p_jev_empty) and not g3_empty.ok,
                    f"G3 detail: {g3_empty.detail}")

        # JEV TRAP_OR_PASS
        p_jev_trap = EngineGate(rg_clean, jev=lambda q, s: {q[0]["id"]: {"choice": "TRAP_OR_PASS", "confidence": 0.95}}, now=NOW).evaluate([make_clean_cand()], "test")[0]
        g3_trap = next(g for g in p_jev_trap.gates if g.gate == "G3")
        self.record("V7", "JEV TRAP_OR_PASS fails closed to ABSTAIN",
                    p_jev_trap.status == "ABSTAIN" and not publishable(p_jev_trap) and not g3_trap.ok and "TRAP_OR_PASS" in g3_trap.detail,
                    f"G3 detail: {g3_trap.detail}")

        # JEV CAUTION with high confidence (>0.70)
        p_jev_caution_high = EngineGate(rg_clean, jev=lambda q, s: {q[0]["id"]: {"choice": "CAUTION", "confidence": 0.85}}, now=NOW).evaluate([make_clean_cand()], "test")[0]
        g3_ch = next(g for g in p_jev_caution_high.gates if g.gate == "G3")
        self.record("V7", "JEV CAUTION with confidence > 0.70 fails closed to ABSTAIN",
                    p_jev_caution_high.status == "ABSTAIN" and not publishable(p_jev_caution_high) and not g3_ch.ok,
                    f"G3 detail: {g3_ch.detail}")

    # ---------------- VECTOR 8: PUBLICATION GUARDS ----------------
    def test_vector_8_publication_guards(self):
        print("\n--- VECTOR 8: Attempted Publication Guards (publishable()) ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # Baseline: clean pick passes publishable()
        clean_pick = engine.evaluate([make_clean_cand()], "test")[0]
        self.record("V8", "Clean pick passes publishable() baseline",
                    publishable(clean_pick) is True, f"Pick status: {clean_pick.status}")

        # 8.1 Raw dictionaries
        dict_cases = [
            {"status": "PLAY"},
            {"status": "PLAY", "stamp": "ENGINE_GATE_V1"},
            clean_pick.to_dict(),
        ]
        for idx, d in enumerate(dict_cases):
            self.record("V8", f"Raw dictionary variant {idx+1} rejected by publishable()",
                        publishable(d) is False, f"Dict type: {type(d)}")

        # 8.2 None and primitive objects
        for primitive in [None, "PLAY", 123, True, [], [clean_pick]]:
            self.record("V8", f"Non-EmittedPick primitive {primitive!r} rejected by publishable()",
                        publishable(primitive) is False, f"Type: {type(primitive)}")

        # 8.3 Unstamped or modified stamp
        for bad_stamp in ["ENGINE_GATE_V0", "", None, "LEGACY_V5", "UNSTAMPED"]:
            bad_pick = copy.deepcopy(clean_pick)
            bad_pick.stamp = bad_stamp
            self.record("V8", f"Invalid stamp {bad_stamp!r} rejected by publishable()",
                        publishable(bad_pick) is False, f"Stamp={bad_pick.stamp}")

        # 8.4 EmittedPick with status == 'ABSTAIN'
        abstain_pick = copy.deepcopy(clean_pick)
        abstain_pick.status = "ABSTAIN"
        self.record("V8", "EmittedPick with status='ABSTAIN' rejected by publishable()",
                    publishable(abstain_pick) is False, f"Status={abstain_pick.status}")

        # 8.5 EmittedPick with empty gates list
        no_gates_pick = copy.deepcopy(clean_pick)
        no_gates_pick.gates = []
        self.record("V8", "EmittedPick with empty gates list rejected by publishable()",
                    publishable(no_gates_pick) is False, f"Gates len={len(no_gates_pick.gates)}")

        # 8.6 EmittedPick with any single failed gate (G1, G2, G-Sig, G3, G4)
        gate_names = ["G1", "G2", "G-Sig", "G3", "G4"]
        for g_name in gate_names:
            fail_pick = copy.deepcopy(clean_pick)
            for g in fail_pick.gates:
                if g.gate == g_name:
                    g.ok = False
                    g.detail = f"Adversarial mock failure in {g_name}"
            self.record("V8", f"EmittedPick with failed {g_name} gate rejected by publishable()",
                        publishable(fail_pick) is False, f"Failed gate: {g_name}")

        # 8.7 EmittedPick with missing provenance field
        for prov_key in ["line", "odds", "projection", "history"]:
            prov_missing = copy.deepcopy(clean_pick)
            prov_missing.provenance[prov_key] = None
            self.record("V8", f"EmittedPick with missing provenance[{prov_key!r}] rejected by publishable()",
                        publishable(prov_missing) is False, f"Missing: {prov_key}")

        # 8.8 EmittedPick with signal_diagnostics == None
        no_sig = copy.deepcopy(clean_pick)
        no_sig.signal_diagnostics = None
        self.record("V8", "EmittedPick with signal_diagnostics=None rejected by publishable()",
                    publishable(no_sig) is False, "signal_diagnostics is None")

        # 8.9 EmittedPick with bayesian_kelly == None
        no_kelly = copy.deepcopy(clean_pick)
        no_kelly.bayesian_kelly = None
        self.record("V8", "EmittedPick with bayesian_kelly=None rejected by publishable()",
                    publishable(no_kelly) is False, "bayesian_kelly is None")

        # 8.10 Parlay evaluation fail-closed check
        c1 = make_clean_cand(id="c1", market="rushing_yards", line=make_sourced(74.5))
        c_bad = make_clean_cand(id="c_bad", player="David Montgomery", team="DET") # Stale roster
        parlay_res = engine.evaluate_parlay([c1, c_bad], state="test")
        self.record("V8", "Parlay containing stale roster leg fails closed to ABSTAIN",
                    parlay_res["ok"] is False and parlay_res["status"] == "ABSTAIN",
                    f"Parlay status: {parlay_res['status']}")

    # ---------------- VECTOR 9: LAW 9 BOUNDARIES & BDR-KELLY ----------------
    def test_vector_9_law9_boundaries(self):
        print("\n--- VECTOR 9: Law 9 Boundary Conditions & BDR-Kelly Mathematical Enforcement ---")
        rg = build_test_roster_gate()

        # 9.1 Nominal edge positive (+2.5%) but below min_edge (3.5%)
        # Gibbs line 74.5, odds -110 (implied 52.38%). Sample hits: 6 of 10 -> win_prob = 60.0%, edge = +7.62%.
        # Let's craft history: 7 hits out of 12 -> win_prob = 58.33%, implied = 55.0% (-122 odds), edge = 3.33% (< 3.5%)
        engine_strict = EngineGate(rg, jev=mock_jev_certified, now=NOW, min_edge_pct=5.0)
        c_sub_edge = make_clean_cand(odds=make_sourced(-115.0), # implied 53.49%
                                     hist=[80, 85, 90, 95, 100, 105, 60, 60, 60, 60]) # 6/10 = 60%, edge = 6.51%
        p_sub = engine_strict.evaluate([c_sub_edge], "test")[0]
        # With min_edge_pct=5.0 and lcb for 6/10: p_lcb = 0.354 -> lcb_edge is negative!
        self.record("V9", "Sub-threshold or negative LCB edge fails closed in G4",
                    p_sub.status == "ABSTAIN" and not publishable(p_sub),
                    f"Status={p_sub.status}, edge={p_sub.edge_pct}, lcb_edge={p_sub.lcb_edge_pct}")

        # 9.2 Zero edge: sample exactly matches implied probability
        # odds -100 (50.0%), hist: 5 wins, 5 losses -> p_hat = 0.50, edge = 0.0%
        c_zero = make_clean_cand(odds=make_sourced(100.0), hist=[80, 85, 90, 95, 100, 50, 50, 50, 50, 50])
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)
        p_zero = engine.evaluate([c_zero], "test")[0]
        g4_z = next(g for g in p_zero.gates if g.gate == "G4")
        self.record("V9", "Zero edge (50% vs 50%) fails closed to ABSTAIN",
                    p_zero.status == "ABSTAIN" and not publishable(p_zero) and not g4_z.ok,
                    f"G4 detail: {g4_z.detail}")

        # 9.3 Inverted odds / extreme underdog where model has no edge
        c_dog = make_clean_cand(odds=make_sourced(300.0), hist=[50, 50, 50, 50, 50, 50]) # 0% hit rate vs implied 25%
        p_dog = engine.evaluate([c_dog], "test")[0]
        self.record("V9", "Severe negative edge fails closed to ABSTAIN",
                    p_dog.status == "ABSTAIN" and not publishable(p_dog), f"Status={p_dog.status}")

    # ---------------- VECTOR 10: PARLAY & MULTI-LEG CORRUPTION ----------------
    def test_vector_10_parlay_adversarial(self):
        print("\n--- VECTOR 10: Parlay & Multi-Leg Corrupt Inputs ---")
        rg = build_test_roster_gate()
        engine = EngineGate(rg, jev=mock_jev_certified, now=NOW)

        # 10.1 Zero legs passed to parlay
        res_0 = engine.evaluate_parlay([], state="test")
        self.record("V10", "Parlay with 0 legs fails closed to ABSTAIN",
                    res_0["ok"] is False and res_0["status"] == "ABSTAIN", f"Reason: {res_0.get('reason')}")

        # 10.2 Single leg passed to parlay
        c1 = make_clean_cand(id="c1", market="rushing_yards", line=make_sourced(74.5))
        res_1 = engine.evaluate_parlay([c1], state="test")
        self.record("V10", "Parlay with 1 leg fails closed to ABSTAIN",
                    res_1["ok"] is False and res_1["status"] == "ABSTAIN", f"Reason: {res_1.get('reason')}")

        # 10.3 Two legs where second leg has stale timestamp
        c2_stale = make_clean_cand(id="c2", market="receiving_yards", line=make_sourced(50.0, age_min=50))
        res_stale = engine.evaluate_parlay([c1, c2_stale], state="test")
        self.record("V10", "Parlay with stale line leg fails closed to ABSTAIN",
                    res_stale["ok"] is False and res_stale["status"] == "ABSTAIN", f"Status: {res_stale['status']}")

        # 10.4 Two legs where second leg has JEV trap
        def jev_trap_leg2(qs, s):
            return {
                "c1": {"choice": "CERTIFIED", "confidence": 0.8},
                "c2": {"choice": "TRAP_OR_PASS", "confidence": 0.9},
            }
        engine_trap = EngineGate(rg, jev=jev_trap_leg2, now=NOW)
        c2_ok = make_clean_cand(id="c2", market="receiving_yards", line=make_sourced(50.0))
        res_trap = engine_trap.evaluate_parlay([c1, c2_ok], state="test")
        self.record("V10", "Parlay with JEV TRAP leg fails closed to ABSTAIN",
                    res_trap["ok"] is False and res_trap["status"] == "ABSTAIN", f"Status: {res_trap['status']}")

        # 10.5 Highly singular / non-positive definite correlation matrix (e.g. perfect correlation + noise)
        import numpy as np
        c2_valid = make_clean_cand(id="c2", market="receiving_yards", line=make_sourced(50.0),
                                   hist=[60, 70, 80, 90, 55, 65, 75, 85, 95, 60, 70, 80])
        bad_matrix = np.array([
            [1.0, 1.05],
            [1.05, 1.0],
        ]) # eigenvalues: [2.05, -0.05] -> NOT PSD!
        res_matrix = engine.evaluate_parlay([c1, c2_valid], corr_matrix=bad_matrix, state="test")
        self.record("V10", "Non-PSD correlation matrix is repaired by Higham repair and safely processed",
                    res_matrix["was_matrix_repaired"] is True and res_matrix["ok"] is True,
                    f"Repaired: {res_matrix['was_matrix_repaired']}, Status: {res_matrix['status']}")


if __name__ == "__main__":
    runner = AdversarialTestRunner()
    success = runner.run_all()
    sys.exit(0 if success else 1)
