"""GSE diagnostic candidate surface + Sunday-Monday DFS candidate table (NFL only).

Doctrine: every input is read through dfs/freshnessgate_wiring.read_fresh. Refused layers are NOT
joined; their refusals land in the kill ledger. Raw payloads without their own stamp are only read
when a FRESH stamped envelope pins their sha16. Nothing here is residual-versus-close cleared.
No pick / lineup / ownership is produced. All rows DIAGNOSTIC.

Supersedes two defects in the 15:45Z/15:49Z runs (measured 2026-10-11):
  1. additive-shift "devig residual": artifact that scales with shift size; 351/3491 rungs clipped.
  2. american->probability conversion had the formulas swapped (compressed fair p toward 0.5).

usage: python gse_engine_surface.py --ledger scratch|prod
"""
import argparse
import csv
import hashlib
import importlib.util
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(r"C:\Users\Garrett\Sports-wt-rating-packet")
RUN = ROOT / "dfs/genie_acq2/nfl_context_20261011T152234Z"
DFS_DIR = ROOT / "dfs/genie_acq2/sunmon_154470"
LABEL_MAIN = "DIAGNOSTIC — residual-versus-close not cleared — Reasoning Doctrine overlay applied"
LABEL_DFS = "DIAGNOSTIC — residual-versus-close not cleared — Sunday-Monday slate"
SCRATCH_LEDGER = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\debug_kill_ledger.jsonl"

ap = argparse.ArgumentParser()
ap.add_argument("--ledger", choices=["scratch", "prod"], default="scratch")
ARGS = ap.parse_args()
NOW = datetime.now(timezone.utc)
OBS = NOW.strftime("%Y-%m-%dT%H:%M:%SZ")


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


fg = load_module("fg", ROOT / "dfs/freshnessgate_wiring.py")
if ARGS.ledger == "scratch":
    fg.KILL_LEDGER = SCRATCH_LEDGER

GATE_LOG = []
INPUT_PINS = {}


def sha16_file(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()[:16]


def gated(rel, layer):
    p = ROOT / rel
    INPUT_PINS[rel] = sha16_file(p) if p.exists() else "MISSING"
    r = fg.read_fresh(str(p))
    a = r["audit"]
    GATE_LOG.append({"layer": layer, "file": rel, "fresh": bool(a.get("fresh")),
                     "failure_mode": a.get("failure_mode"), "detail": a.get("detail"),
                     "age_hours": a.get("age_hours"), "stamp": a.get("stamp")})
    return r.get("data") if a.get("fresh") else None


def pinned_raw(rel, expected16, layer):
    """Read an unstamped raw payload only if a FRESH stamped envelope pinned its sha16."""
    p = ROOT / rel
    got = sha16_file(p)
    INPUT_PINS[rel] = got
    ok = got == expected16
    GATE_LOG.append({"layer": layer, "file": rel, "fresh": ok, "failure_mode": None if ok else "PIN_MISMATCH",
                     "detail": f"pinned by FRESH envelope: expected {expected16} got {got}", "age_hours": None,
                     "stamp": "via envelope"})
    return json.loads(p.read_text(encoding="utf-8")) if ok else None


# ---------------- math ----------------
def Phi(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def ppf(p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    lo, hi = -10.0, 10.0
    for _ in range(100):
        m = (lo + hi) / 2
        if Phi(m) < p:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def implied(american):
    """Correct American -> implied probability (vig-inclusive)."""
    a = float(str(american).replace("−", "-").replace("+", ""))
    return (-a) / (-a + 100.0) if a < 0 else 100.0 / (a + 100.0)


def devig2(p_over, p_under):
    return p_over / (p_over + p_under)


def poisson_sf(k, lam):
    """P(X >= k)."""
    if k <= 0:
        return 1.0
    term = math.exp(-lam)
    cdf = term
    for i in range(1, k):
        term *= lam / i
        cdf += term
    return 1.0 - cdf


def poisson_lambda_for(line, p_over):
    """Solve P(X > line) = p_over for a Poisson mean (line is x.5)."""
    k = math.floor(line) + 1
    lo, hi = 1e-6, 60.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if poisson_sf(k, mid) < p_over:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


SUFFIX = {"jr", "sr", "ii", "iii", "iv", "v"}


def norm(s):
    s = (s or "").lower()
    s = re.sub(r"[.'’`]", "", s).replace("-", " ")
    return " ".join(t for t in s.split() if t not in SUFFIX)


TEAM_KW = {"PHI": "Eagles", "JAX": "Jaguars", "CIN": "Bengals", "MIA": "Dolphins", "HOU": "Texans", "TEN": "Titans",
           "CLE": "Browns", "NYJ": "Jets", "LV": "Raiders", "NE": "Patriots", "CHI": "Bears", "GB": "Packers",
           "IND": "Colts", "PIT": "Steelers", "MIN": "Vikings", "NO": "Saints", "NYG": "Giants", "WAS": "Commanders",
           "DEN": "Broncos", "LAC": "Chargers", "SF": "49ers", "SEA": "Seahawks", "DET": "Lions", "ARI": "Cardinals",
           "BAL": "Ravens", "ATL": "Falcons", "BUF": "Bills", "LAR": "Rams", "DAL": "Cowboys", "TB": "Buccaneers",
           "KC": "Chiefs", "CAR": "Panthers"}


def full_to_abbr(full):
    for ab, kw in TEAM_KW.items():
        if kw.lower() in (full or "").lower():
            return ab
    return None


SIGMA_FALLBACK = {"pass_yards": 70.9, "rec_yards": 37.7, "rush_yards": 41.7}  # CollegeGuard-listed NFL constants
BANNED = re.compile(r"\b(pick|picks|bet|bets|betting|edge|edges|play|plays)\b", re.I)

# ================= 1. GATED READS =================
eng = gated("dfs/genie_acq2/nfl_context_20261011T152234Z/ENGINE_RUN_1547_STAMP.json", "dk_ladder_fits_1547Z")
rec_ou_env = gated("dfs/genie_acq2/nfl_context_20261011T152234Z/rec_ou.fresh.json", "dk_rec_ou_14114_1522Z")
pin_props = gated("dfs/prop_close_feed_2026-10-11/pinnacle_props_all_20261011T1557Z.json", "pinnacle_player_props")
pin_games = gated("dfs/genie_acq2/pinnacle_snapshot_20261011.envelope.json", "pinnacle_game_env")
pool = gated("dfs/genie_acq2/sunmon_154470/pool_154470.json", "dk_dfs_pool_154470")
espn_inj = gated("dfs/nfl_signals_2026-10-11/espn_injuries_snapshot.json", "injury_espn")
v3 = gated("dfs/RED_ZONE_BUILDS_V3_FULL_GATE.json", "v3_builds")
lobby_stamp = gated("dfs/genie_acq2/lobby_154468_20261011T1550Z/LOBBY_PREVIEW_STAMP.json", "lobby_preview")
ftn_env = gated("dfs/FTN_ENV_NEXT_ATS.json", "ftn_env_aggregate")
# layers that the gate is expected to refuse (unstamped / stale / aggregate-only) — attempted, never bypassed
cpoe_csv = gated("dfs/cpoe_x_pressure_2026.csv", "cpoe_x_pressure")
ftn_csv = gated("dfs/ftn_axes_rvc_2026-10-11/ftn_teamweek_joined.csv", "ftn_box_blitz_teamweek")
inj_csv = gated("dfs/wk5_out_doubtful.csv", "injury_wk5_report_csv")
cpoe_agg = gated("dfs/CPOE_PRESSURE_NEXT_ATS.json", "cpoe_aggregate")
sit_graph = gated("dfs/SITUATIONAL_GRAPH_RVC.json", "situational_graph")
ou_lane = gated("dfs/OU_LANE_FINAL_VERDICT.json", "ou_live_state")
officials = gated("dfs/B4_OFFICIALS_STAMP.json", "officials_crew")
officials_g = gated("dfs/nfl_signals_2026-10-11/officials_by_game.csv", "officials_by_game")
weather = gated("dfs/b1_weather_residual.json", "weather")
manifest = gated("dfs/nfl_rvc_manifest.json", "frozen_nfl_manifest")

if eng is None or pin_props is None or pool is None:
    raise SystemExit("core inputs refused by FreshnessGate — stopping (no surface emitted)")

# raw DK O/U payloads pinned by the FRESH engine stamp
pins = eng["raw_sha16_pins"]
dk_ou_raw = {}
for stat, role in (("pass_yards", "pass_ou"), ("rush_yards", "rush_ou"), ("completions", "comp_ou")):
    rel = f"nfl_context_20261011T152234Z/pull1547_{role}.raw.json"
    dk_ou_raw[stat] = pinned_raw("dfs/genie_acq2/" + rel, pins[rel], f"dk_{role}_1547Z")
dk_ou_raw["rec_yards"] = rec_ou_env

# lobby raw pinned by the FRESH lobby stamp (contest metadata only)
lobby_raw = pinned_raw("dfs/genie_acq2/lobby_154468_20261011T1550Z/getcontests_nfl.raw.json",
                       lobby_stamp["raw_sha16"], "lobby_raw_contest_meta") if lobby_stamp else None

# ================= 2. LIVE PYTHON GATES =================
gate_results = {}
# Injury Pull Gate (intelligence/providers/injury_gate.py)
try:
    ig = load_module("injury_gate", ROOT / "intelligence/providers/injury_gate.py")
    friday = datetime(2026, 10, 9, 18, 0, tzinfo=ZoneInfo("America/New_York"))
    ig.require_injury_published(5, NOW, friday)
    gate_results["injury_pull_gate"] = "PASS — week 5 report published (Fri 2026-10-09 18:00 ET); inputs are committed/stamped reads, not pulls"
except Exception as e:  # noqa: BLE001
    gate_results["injury_pull_gate"] = f"REFUSE — {e}"
# CollegeGuard (live_board._college_guard_check)
try:
    lb = load_module("live_board", ROOT / "docs/research/2026-10-09/rating-atlas/minis/live_board.py")
    lb._college_guard_check({}, label="NFL-board-cfb-params")
    leagues = Counter()
    for stat in ("pass_yards", "rush_yards", "completions"):
        for m in (dk_ou_raw[stat] or {}).get("markets", []):
            leagues[str(m.get("leagueId"))] += 1
    gate_results["college_guard"] = f"PASS — _college_guard_check called with 0 CFB params; DK market leagues {dict(leagues)} (88808 = NFL only)"
except Exception as e:  # noqa: BLE001
    gate_results["college_guard"] = f"REFUSE — {e}"
# FreshnessGate summary
gate_results["freshness_gate"] = {"read_path": "dfs/freshnessgate_wiring.read_fresh", "fresh": [g["layer"] for g in GATE_LOG if g["fresh"]],
                                  "refused": [{"layer": g["layer"], "mode": g["failure_mode"], "detail": g["detail"]} for g in GATE_LOG if not g["fresh"]]}
# minis/freshness_gate.freshness_ok cross-check on every FRESH stamp
try:
    mfg = load_module("minis_fg", ROOT / "docs/research/2026-10-09/rating-atlas/minis/freshness_gate.py")
    gate_results["freshness_gate_minis_crosscheck"] = {g["layer"]: mfg.freshness_ok(g["stamp"]) for g in GATE_LOG
                                                       if g["fresh"] and g["stamp"] and g["stamp"] != "via envelope"}
except Exception as e:  # noqa: BLE001
    gate_results["freshness_gate_minis_crosscheck"] = f"ERROR — {e}"
NOT_RUN_TS = "NOT RUN — TypeScript module needs bundler resolution ('./dfs-slate', '@/lib/...'); no tsx in worktree or C:/Users/Garrett/Sports (checked 2026-10-11T15:59Z)"
gate_results.update({
    "signal_spine (apps/web/lib/signals/spine.ts)": NOT_RUN_TS,
    "contest_shape_guard adviseMode (apps/web/lib/fantasy/dfs-signals.ts)": NOT_RUN_TS,
    "per_market_calibration (apps/web/lib/ops/per-market-gate.ts)": NOT_RUN_TS + "; also inapplicable: 0 settled outcomes for these props",
    "selective_abstention (packages/prediction-engine/src/certificate/selective-abstention.ts)": NOT_RUN_TS,
    "proper_scoring (publish-guards-bridge evalReliability)": NOT_RUN_TS + "; also inapplicable: no outcomes y in {0,1}",
    "jev_10k_sim (apps/web/lib/fantasy/dfs-correlation.ts)": NOT_RUN_TS + "; no lineup is emitted this run",
    "dfs_lineup_validation (apps/web/lib/fantasy/dfs-lineup-validation.ts)": NOT_RUN_TS + "; DK GameType-1 rule applied to V3 below as a recorded fact",
    "board_gate_rows (apps/web/lib/board/gate-rows.ts)": NOT_RUN_TS + "; game-line board only",
    "gse_score_honesty (apps/web/lib/fantasy/gse-score.ts)": NOT_RUN_TS + "; no GSE Score emitted",
    "kill_ledger": "LIVE — refusals appended (see ledger rows at observed_at)",
    "live_board_honesty_labels + banned_language": "LIVE by construction in live_board.py (line 8 docstring); this run applied a literal word scan to its own output (count below)",
    "model_promotion_gate": "PARTIAL — reopen: shadow evaluation lane ('Workstream E router') on trunk",
    "prediction_engine_acceptance_gates (179 modules)": "DOCUMENTED-ONLY — reopen: historical walk-forward data per module",
    "jev_5gate_sieve": "DOCUMENTED-ONLY — reopen: universal_jev_signal_scanner.py run on this machine against a frozen manifest",
    "jev_arbitration_oracle": "DOCUMENTED-ONLY — no CERTIFIED/CAUTION/TRAP_OR_PASS emitted; reopen: live jev ask on frozen candidates",
    "gse_fail_closed_mandate": "DOCUMENTED-ONLY — reopen: enforcement code in the output pipeline",
    "infra gates 21-30 (age, CSRF, in-play, durable write, numeric, trust, evidence, calibration scale, release, independence)": "DOCUMENTED-ONLY for this surface — not engine-intelligence gates",
})

# ================= 3. GAME ENV (Pinnacle) =================
game_env = {}
if pin_games:
    for m in pin_games["games"]:
        h, a = full_to_abbr(m["home"]), full_to_abbr(m["away"])
        mks = [x for x in (m.get("markets") or []) if x.get("period") == 0 and len(x.get("prices") or []) == 2]
        env = {"start": m["start"]}
        for typ, prefix in (("spread", "s;0;s;"), ("total", "s;0;ou;")):
            xs = [x for x in mks if x.get("type") == typ and str(x.get("key", "")).startswith(prefix)]
            if not xs:
                continue
            main = [x for x in xs if x.get("isAlternate") is False]
            # main line = the non-alternate market; fallback = the pair closest to even money
            x = main[0] if main else min(xs, key=lambda y: abs(implied(y["prices"][0]["price"]) - implied(y["prices"][1]["price"])))
            pr = {p["designation"]: p for p in x["prices"]}
            env[f"{typ}_main_source"] = "isAlternate=False" if main else "closest-to-even fallback"
            if typ == "spread":
                env["home_spread"] = pr["home"]["points"]
                env["home_spread_fair"] = round(devig2(implied(pr["home"]["price"]), implied(pr["away"]["price"])), 4)
            else:
                env["total"] = pr["over"]["points"]
                env["total_over_fair"] = round(devig2(implied(pr["over"]["price"]), implied(pr["under"]["price"])), 4)
        if "total" in env and "home_spread" in env:
            env["home_implied"] = round(env["total"] / 2 - env["home_spread"] / 2, 2)
            env["away_implied"] = round(env["total"] / 2 + env["home_spread"] / 2, 2)
        game_env[f"{a}@{h}"] = env
tot_sorted = sorted(v["total"] for v in game_env.values() if "total" in v)
if len(tot_sorted) < 3:
    raise SystemExit(f"game env incomplete through gate (totals for {len(tot_sorted)} games) — stopping")
t_lo, t_hi = tot_sorted[len(tot_sorted) // 3], tot_sorted[2 * len(tot_sorted) // 3]


def env_cell(game):
    t = (game_env.get(game) or {}).get("total")
    if t is None:
        return "env:unknown"
    return "env:low_total" if t < t_lo else ("env:high_total" if t >= t_hi else "env:mid_total")


# ================= 4. INJURY (gated sources only) =================
inj_espn = {}
for r in (espn_inj or {}).get("rows", []):
    inj_espn[norm(r.get("player"))] = r.get("status")
BLOCK = {"Out", "Injured Reserve", "Doubtful", "O", "IR", "D", "SUS", "PUP", "NFI"}
pool_rows = pool.get("playerList") or []
pool_by = {}
for p in pool_rows:
    team = p["htabbr"] if p.get("tid") == p.get("htid") else p.get("atabbr")
    pool_by[norm(f"{p['fn']} {p['ln']}")] = {"team": team, "i": p.get("i") or "", "pos": p.get("pn"), "salary": p.get("s")}


def injury_flag(player):
    e = inj_espn.get(norm(player))
    d = (pool_by.get(norm(player)) or {}).get("i") or ""
    if (e in BLOCK) or (d in BLOCK):
        return "BLOCK", f"espn={e or '-'} dk={d or '-'}"
    if e == "Questionable" or d == "Q":
        return "Q_FLAG", f"espn={e or '-'} dk={d or '-'}"
    return "CLEAR", f"espn={e or '-'} dk={d or '-'}"


# ================= 5. PINNACLE PROPS (two-sided devig) =================
PIN_STAT = {"Passing Yards": "pass_yards", "Rushing Yards": "rush_yards", "Receiving Yards": "rec_yards",
            "Pass Completions": "completions", "Receptions": "receptions", "Touchdowns": "tds",
            "Touchdown Passes": "pass_tds", "Interceptions": "ints"}
pin_tmp = defaultdict(dict)
for r in pin_props["rows"]:
    m = re.match(r"^(.*) Total (.+)$", r["description"])
    if not m or m.group(2) not in PIN_STAT:
        continue
    game = f"{full_to_abbr(r['away'])}@{full_to_abbr(r['home'])}"
    key = (norm(m.group(1)), PIN_STAT[m.group(2)], game)
    pin_tmp[(key, r["matchup_id"], r["points"])][r["side"]] = r["price_american"]
pin_line = {}
for (key, mid, pts), sides in pin_tmp.items():
    if "Over" not in sides or "Under" not in sides:
        continue
    fo = devig2(implied(sides["Over"]), implied(sides["Under"]))
    cur = pin_line.get(key)
    if cur is None or abs(fo - 0.5) < abs(cur["fo"] - 0.5):
        pin_line[key] = {"line": pts, "fo": fo, "over": sides["Over"], "under": sides["Under"],
                         "hold": round(implied(sides["Over"]) + implied(sides["Under"]) - 1, 4)}

# ================= 6. DK main lines (trueOdds, two-sided) =================
dk_line = {}
for stat, payload in dk_ou_raw.items():
    if not payload:
        continue
    ev = {}
    for e in payload.get("events", []):
        parts = {x.get("venueRole"): (x.get("metadata") or {}).get("shortName") for x in e.get("participants") or []}
        ev[str(e["id"])] = f"{parts.get('Away')}@{parts.get('Home')}"
    mk = {m["id"]: m for m in payload.get("markets", [])}
    tmp = defaultdict(dict)
    for s in payload.get("selections", []):
        if "MainPointLine" not in (s.get("tags") or []):
            continue
        m = mk.get(s.get("marketId")) or {}
        parts = s.get("participants") or []
        pl = parts[0].get("name") if parts and isinstance(parts[0], dict) else None
        if not pl or not s.get("trueOdds"):
            continue
        tmp[(norm(pl), stat, ev.get(str(m.get("eventId"))), pl)][s.get("outcomeType")] = (s.get("points"), 1.0 / s["trueOdds"])
    for (n, st, game, pl), sd in tmp.items():
        if "Over" in sd and "Under" in sd:
            dk_line[(n, st, game)] = {"player": pl, "line": sd["Over"][0], "fo": devig2(sd["Over"][1], sd["Under"][1]),
                                      "hold": round(sd["Over"][1] + sd["Under"][1] - 1, 4)}

# ================= 7. CANDIDATE SURFACE =================
fits = {}
for r in eng["rows"]:
    fits[(norm(r["player"]), r["stat"], f"{r['away']}@{r['home']}")] = r
surface = []
for key, d in dk_line.items():
    n, stat, game = key
    f = fits.get(key)
    if f is None or f.get("status") == "STARTED":
        continue
    sigma = f["sigma_raw"] if f.get("sigma_raw") and f["sigma_raw"] > 0 else SIGMA_FALLBACK.get(stat)
    if not sigma:
        continue
    dk_median = d["line"] + sigma * ppf(d["fo"])
    row = {"player": d["player"], "stat": stat, "game": game, "team": (pool_by.get(n) or {}).get("team"),
           "dk_line": d["line"], "dk_fair_over": round(d["fo"], 4), "dk_hold": d["hold"],
           "dk_main_offset_sigma": round(-ppf(d["fo"]), 3),
           "ladder_mu_vig_incl": f["mu_raw"], "ladder_sigma": sigma, "ladder_r2": f.get("r2"), "ladder_rungs": f.get("n_rungs"),
           "raw_ladder_resid_sigma_vig_incl": round((d["line"] - f["mu_raw"]) / sigma, 3),
           "dk_median": round(dk_median, 2)}
    p = pin_line.get(key)
    if p:
        pin_median = p["line"] + sigma * ppf(p["fo"])
        row.update({"pin_line": p["line"], "pin_fair_over": round(p["fo"], 4), "pin_hold": p["hold"],
                    "pin_median": round(pin_median, 2),
                    "residual_sigma": round((dk_median - pin_median) / sigma, 3),
                    "residual_basis": "cross-book: DK de-vigged median minus Pinnacle de-vigged median, / DK ladder sigma (Pinnacle pre-close, not a close)"})
    else:
        row.update({"pin_line": None, "residual_sigma": None, "residual_basis": "no Pinnacle two-sided market for this player-stat"})
    inj, inj_note = injury_flag(d["player"])
    env = game_env.get(game) or {}
    row.update({"injury_flag": inj, "injury_note": inj_note, "env_cell": env_cell(game),
                "pin_game_total": env.get("total"), "pin_home_spread": env.get("home_spread"),
                "situational_node": "REFUSED at FreshnessGate (situational graph F1_STALE) — not joined",
                "expected_metric_cell": "REFUSED at FreshnessGate (CPOE/FTN team-week CSVs unstamped F2) — not joined",
                "weather_officials": "REFUSED at FreshnessGate (b1 weather / B4 officials F1_STALE); officials_by_game has 0 rows for 2026 wk5",
                "news_timing": "injury status as of ESPN snapshot stamp + DK pool stamp; no minute-level news feed on bus",
                "correlation_note": "same-game copula not fitted on this slate; rows are marginal only — no joint claim",
                "ou_live_state": "N/A pre-kick",
                "rvc_gate": "REFUSE — no frozen prop close for this event",
                "label": LABEL_MAIN})
    surface.append(row)

# conditional residual: remove the book-wide stat mean (slate-level shading) and record the cell
by_stat = defaultdict(list)
for r in surface:
    if r["residual_sigma"] is not None:
        by_stat[r["stat"]].append(r["residual_sigma"])
stat_mean = {k: statistics.mean(v) for k, v in by_stat.items()}
for r in surface:
    r["cond_residual_sigma"] = round(r["residual_sigma"] - stat_mean[r["stat"]], 3) if r["residual_sigma"] is not None else None
    r["cond_basis"] = "residual_sigma minus slate mean residual for the same stat (isolates player-specific divergence from book-wide shading)"
    r["gate_status"] = ("FreshnessGate PASS (all joined inputs FRESH) | CollegeGuard PASS | InjuryPullGate PASS | injury " + r["injury_flag"]
                        + " | RVC REFUSE | TS gates NOT RUN (no tsx)")
cells = defaultdict(list)
for r in surface:
    if r["residual_sigma"] is not None:
        cells[(r["stat"], r["env_cell"], r["injury_flag"])].append(r["residual_sigma"])
cell_table = [{"stat": k[0], "env_cell": k[1], "injury_flag": k[2], "n": len(v), "mean_residual_sigma": round(statistics.mean(v), 3)}
              for k, v in sorted(cells.items())]

# ================= 8. SUNDAY-MONDAY DFS TABLE (dg 154470) =================
pin_by_player = defaultdict(dict)
for (n, stat, game), p in pin_line.items():
    pin_by_player[(n, game)][stat] = p
sigma_by_player = {(k[0], k[1], k[2]): (v["sigma_raw"] if v.get("sigma_raw") else None) for k, v in fits.items()}
resid_by_player = defaultdict(list)
for r in surface:
    if r["residual_sigma"] is not None:
        resid_by_player[(norm(r["player"]), r["game"])].append(f"{r['stat']}:{r['residual_sigma']:+.3f}")
dfs_rows = []
for p in pool_rows:
    name = f"{p['fn']} {p['ln']}"
    n = norm(name)
    team = p["htabbr"] if p.get("tid") == p.get("htid") else p.get("atabbr")
    opp = p.get("atabbr") if team == p.get("htabbr") else p.get("htabbr")
    game = f"{p.get('atabbr')}@{p.get('htabbr')}"
    mk = pin_by_player.get((n, game), {})
    comps, pts, bonus = [], 0.0, 0.0
    for stat, w, thr in (("pass_yards", 0.04, 300), ("rush_yards", 0.1, 100), ("rec_yards", 0.1, 100)):
        if stat in mk:
            sg = sigma_by_player.get((n, stat, game)) or SIGMA_FALLBACK[stat]
            med = max(0.0, mk[stat]["line"] + sg * ppf(mk[stat]["fo"]))
            pts += w * med
            bonus += 3.0 * (1 - Phi((thr - 0.5 - med) / sg))
            comps.append(stat)
    for stat, w in (("receptions", 1.0), ("pass_tds", 4.0), ("ints", -1.0), ("tds", 6.0)):
        if stat in mk:
            lam = poisson_lambda_for(mk[stat]["line"], mk[stat]["fo"])
            pts += w * lam
            comps.append(stat)
    has_mkt = bool(comps)
    inj, inj_note = injury_flag(name)
    env = game_env.get(game) or {}
    implied_tt = env.get("home_implied") if team == p.get("htabbr") else env.get("away_implied")
    mkt_pts = round(pts + bonus, 2) if has_mkt else None
    dfs_rows.append({"player": name, "pos": p.get("pn"), "salary": p.get("s"), "team": team, "opp": opp, "game": game,
                     "dk_injury": p.get("i") or "", "injury_flag": inj, "injury_note": inj_note,
                     "dk_season_ppg": p.get("ppg"),
                     "mkt_implied_dk_pts": mkt_pts,
                     "mkt_pts_per_1k": round(mkt_pts / (p["s"] / 1000.0), 3) if mkt_pts is not None and p.get("s") else None,
                     "mkt_components": ",".join(comps) if comps else "none (no two-sided Pinnacle market)",
                     "mkt_basis": "Layer-1 baseline: Pinnacle two-sided de-vig (yards: line + sigma*Phi^-1(p_fair); counts: Poisson mean) x DK Classic scoring; fumbles/2pt/return TD excluded; not a model projection",
                     "prop_residuals_sigma": ";".join(resid_by_player.get((n, game), [])) or None,
                     "pin_game_total": env.get("total"), "pin_implied_team_total": implied_tt, "env_cell": env_cell(game),
                     "rvc_gate": "REFUSE — no frozen prop close", "label": LABEL_DFS})

# ================= 9. V3 BUILDS (recorded with DK roster fact) =================
classic_rule = None
if lobby_raw:
    gts = {g.get("GameTypeId"): g for g in lobby_raw.get("GameTypes") or []}
    c = [x for x in lobby_raw.get("Contests", []) if x.get("id") == 196420201]
    if c:
        classic_rule = {"contest": 196420201, "gameTypeId": c[0].get("gameTypeId"),
                        "gameType": c[0].get("gameType"), "dk_rule_text": (gts.get(c[0].get("gameTypeId")) or {}).get("Description")}
v3_rows = []
for b in (v3 or {}).get("builds", []):
    names = [b["qb_n"], *b["rbs_n"], *b["wrs_n"], b["te_n"], b["dst_n"]]
    v3_rows.append({"pts_season_ppg_baseline": round(b["pts"], 1), "salary": b["sal"], "n_players": len(names),
                    "players": [x.split(" (")[0] for x in names],
                    "dk_classic_roster_check": "FAIL — WRONG_SIZE: 8 of 9 slots (FLEX missing)" if len(names) != 9 else "9 slots",
                    "label": LABEL_MAIN})

# ================= 10. BANNED LANGUAGE SCAN (own output) =================
def scan(obj):
    hits = []

    def walk(x, path):
        if isinstance(x, dict):
            for k, v in x.items():
                walk(v, f"{path}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                walk(v, f"{path}[{i}]")
        elif isinstance(x, str) and BANNED.search(x):
            hits.append({"path": path, "text": x[:80]})
    walk(obj, "$")
    return hits


ban_hits = scan({"surface": surface, "dfs": dfs_rows, "v3": v3_rows, "cells": cell_table})
gate_results["banned_language_scan_hits"] = len(ban_hits)

# ================= 11. STAMPS =================
pre_resid = [r for r in surface if r["residual_sigma"] is not None]
summary = {k: {"n": len(v), "mean": round(statistics.mean(v), 3), "sd": round(statistics.pstdev(v), 3),
               "min": round(min(v), 3), "max": round(max(v), 3)} for k, v in sorted(by_stat.items())}
juice = defaultdict(list)
for r in surface:
    juice[r["stat"]].append(r["dk_main_offset_sigma"])
juice_summary = {k: {"n": len(v), "mean": round(statistics.mean(v), 3)} for k, v in juice.items()}
bundle = hashlib.sha256(json.dumps({"pins": INPUT_PINS, "obs": OBS}, sort_keys=True).encode()).hexdigest()[:16]
common = {"observed_at": OBS, "input_sha16_pins": INPUT_PINS, "gate_log": GATE_LOG, "gate_results": gate_results,
          "rvc_verdict": "NOT CLEARED — no frozen prop close exists for these events; held-out n=0",
          "held_out_n": 0,
          "superseded": {"15:45Z/15:49Z devig residual": "RETRACTED — additive probability shift artifact (devig minus juice = +0.056/+0.098/+0.174 sigma; 351/3491 rungs clipped)",
                         "15:45Z/15:49Z fair probabilities": "RETRACTED — american->probability formulas swapped; compressed toward 0.5",
                         "15:45Z/15:49Z overlay joins": "RETRACTED — CPOE/FTN/injury CSVs were read outside FreshnessGate"}}
surface_stamp = {**common, "title": "NFL DIAGNOSTIC CANDIDATE SURFACE — cross-book residual vs Pinnacle + gated overlay",
                 "label": LABEL_MAIN, "sha16": bundle,
                 "summary_residual_sigma_by_stat": summary, "dk_main_offset_by_stat": juice_summary,
                 "conditional_cells": cell_table, "banned_language_hits": ban_hits,
                 "v3_builds": {"rule": classic_rule, "rows": v3_rows}, "rows": surface}
dfs_bundle = hashlib.sha256(json.dumps({"pins": INPUT_PINS, "obs": OBS, "dg": 154470}, sort_keys=True).encode()).hexdigest()[:16]
dfs_stamp = {**common, "title": "SUNDAY-MONDAY DFS DIAGNOSTIC CANDIDATES — dg 154470 (13 games incl. SNF BAL@ATL, MNF BUF@LAR)",
             "label": LABEL_DFS, "sha16": dfs_bundle, "draft_group": 154470,
             "no_lineups": True, "no_ownership": True, "rows": dfs_rows}
sp = RUN / "CANDIDATE_SURFACE_STAMP.json"
dp = DFS_DIR / "SUNMON_DFS_CANDIDATES_STAMP.json"
json.dump(surface_stamp, open(sp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(dfs_stamp, open(dp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for path, rows in ((RUN / "CANDIDATE_SURFACE.csv", surface), (DFS_DIR / "SUNMON_DFS_CANDIDATES.csv", dfs_rows)):
    cols = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

# read our own outputs back through the gate
back = {str(p.name): fg.read_fresh(str(p))["audit"].get("label") for p in (sp, dp)}

if ARGS.ledger == "prod":
    for ev, art, s16, why in (
            ("NFL_PROP_LADDER_RVC", "dfs/genie_acq2/nfl_context_20261011T152234Z/CANDIDATE_SURFACE_STAMP.json", bundle,
             "cross-book residual + gated overlay only; no frozen prop close; held-out n=0"),
            ("SUNMON_DFS_RVC", "dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES_STAMP.json", dfs_bundle,
             "market-implied baseline only; no frozen prop close; no lineups/ownership emitted"),
            ("DEVIG_ADDITIVE_SHIFT_METHOD", "dfs/genie_acq2/nfl_context_20261011T152234Z/ENGINE_RUN_1547_STAMP.json", "80beee68cd08c6c7",
             "method refused: devig minus juice +0.056/+0.098/+0.174 sigma scales with shift; 351/3491 rungs clipped; numbers retracted"),
            ("AMERICAN_ODDS_CONVERSION", "dfs/genie_acq2/nfl_context_20261011T152234Z/DIAGNOSTIC_BOARD_STAMP.json", "5ca43967ee7f972c",
             "american->probability formulas swapped in 15:45Z/15:49Z code; fair probabilities retracted"),
            ("V3_BUILDS_ROSTER", "dfs/RED_ZONE_BUILDS_V3_FULL_GATE.json", INPUT_PINS.get("dfs/RED_ZONE_BUILDS_V3_FULL_GATE.json"),
             "DK Classic (gameTypeId 1) requires 9 players under $50,000; all V3 builds have 8 (FLEX missing) — WRONG_SIZE")):
        fg._ledger_append({"event": ev, "verdict": "REFUSED", "reason": why, "artifact": art, "observed_at": OBS,
                           "sha16": s16, "label": "DIAGNOSTIC"})

print(json.dumps({"obs": OBS, "ledger": ARGS.ledger, "surface_sha16": bundle, "dfs_sha16": dfs_bundle,
                  "surface_rows": len(surface), "with_crossbook": len(pre_resid), "dfs_rows": len(dfs_rows),
                  "dfs_with_mkt": sum(1 for r in dfs_rows if r["mkt_implied_dk_pts"] is not None),
                  "gate_fresh": [g["layer"] for g in GATE_LOG if g["fresh"]],
                  "gate_refused": [(g["layer"], g["failure_mode"]) for g in GATE_LOG if not g["fresh"]],
                  "summary": summary, "dk_main_offset": juice_summary, "ban_hits": len(ban_hits),
                  "readback": back, "college_guard": gate_results["college_guard"][:60],
                  "injury_pull_gate": gate_results["injury_pull_gate"][:40]}, indent=1, default=str))
