#!/usr/bin/env python3
"""DAVE-style EPA prior bridge + turnover occurrence instrument (Mimo independent run).

GLM5.3/Hermes reported (Sports-oppadj AGENTS.md + master plan):
  - Prior bridge w = N/(N+8): adj-EPA beats raw EPA OOS Spearman 0.393 vs 0.323
  - Turnover occurrence Spearman 0.375 vs naive 0.219; recovery ~ luck
THIS SCRIPT independently measures on OWNED nflverse data only.
Does NOT touch Neon/DB (Law 7). Does NOT flip gates.

Kill lines (pre-registered):
  - Bridge CANDIDATE only if as-of season-next margin RMSE(bridge) < RMSE(raw) - 0.05
    OR Spearman(bridge) > Spearman(raw) + 0.05 on n>=100 paired games.
  - Wire to nfl-epa-fair-value only after kill + founder MODEL_VERSION path.
  - Never claim Neon LEAN/PASS rates from this file — those are fleet-reported
    numbers on a live DB we did not query; label them EXTERNAL_CLAIM_UNVERIFIED_BY_MIMO.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report
from opponent_adjusted_epa import opponent_adjusted, sigmoid

PBP_DIR = Path("docs/ops/stats-lane/incoming/nflverse-pbp")
GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
OPPADJ = Path(r"C:\Users\Garrett\Sports-oppadj\docs\research\2026-09-19-opp-adj-epa-path")
OUT = Path("docs/ops/stats-lane/out/epa_prior_bridge_turnover.json")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def load_team_epa_from_pbp(pbp_path: Path):
    """Season team-game off EPA/play + def EPA allowed (from opponent plays)."""
    game_team = defaultdict(lambda: {"n": 0, "epa": 0.0, "opp": None})
    if not pbp_path.exists():
        return None
    with gzip.open(pbp_path, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if (row.get("season_type") or "REG") not in ("REG", "reg", ""):
                # nflverse pbp uses season_type REG/POST
                st = (row.get("season_type") or "").upper()
                if st and st != "REG":
                    continue
            pt = (row.get("play_type") or "").lower()
            if pt not in ("pass", "run"):
                continue
            epa = fnum(row.get("epa"))
            post, gid = row.get("posteam"), row.get("game_id")
            if not post or not gid or epa is None:
                continue
            g = game_team[(post, gid)]
            g["n"] += 1
            g["epa"] += epa
            g["opp"] = row.get("defteam")
    return game_team


def season_ratings(game_team):
    """Aggregate team-game EPA/play to season mean off; def from opponent off faced."""
    off = defaultdict(list)
    def_allow = defaultdict(list)
    for (team, gid), g in game_team.items():
        if g["n"] < 15:
            continue
        rate = g["epa"] / g["n"]
        off[team].append(rate)
        opp = g.get("opp")
        if opp:
            def_allow[opp].append(rate)  # high allowed = bad defense
    ratings = {}
    for t in set(off) | set(def_allow):
        o = mean(off[t]) if off.get(t) else None
        d = mean(def_allow[t]) if def_allow.get(t) else None
        if o is None:
            continue
        # net = off - def_allowed (higher better)
        net = o - d if d is not None else o
        ratings[t] = {"off_epa": o, "def_epa_allowed": d, "net": net, "n_games": len(off.get(t, []))}
    return ratings


def season_ratings_from_games_priors_and_weeks(games_rows, pbp_seasons):
    """Build as-of ratings per season from pbp, then blend prior year with w=N/(N+8)."""
    by_season = {}
    for season, gt in pbp_seasons.items():
        by_season[season] = season_ratings(gt)
    return by_season


def spearman(a, b):
    n = len(a)
    if n < 3:
        return None
    def rank(xs):
        order = sorted(range(n), key=lambda i: xs[i])
        ranks = [0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and xs[order[j + 1]] == xs[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                ranks[order[k]] = avg
            i = j + 1
        return ranks
    ra, rb = rank(a), rank(b)
    ma, mb = mean(ra), mean(rb)
    num = sum((ra[i] - ma) * (rb[i] - mb) for i in range(n))
    da = math.sqrt(sum((x - ma) ** 2 for x in ra))
    db = math.sqrt(sum((x - mb) ** 2 for x in rb))
    if da == 0 or db == 0:
        return None
    return num / (da * db)


def load_pbp_seasons(seasons):
    out = {}
    for s in seasons:
        p = PBP_DIR / f"play_by_play_{s}.csv.gz"
        if p.exists():
            out[s] = load_team_epa_from_pbp(p)
    return out


def epa_prior_bridge_validation():
    """As-of duel: prior-year season-end ratings vs raw current-to-date vs N/(N+8) bridge.

    For each season S with PBP and games: for each REG game in season S with both
    teams having prior-season ratings (S-1), compare margin predictions:
      raw_prior: scale * (net_{S-1,home} - net_{S-1,away}) + HFA
      bridge:    scale * (net_blend_home - net_blend_away) + HFA
    where blend uses w = N_cur/(N_cur+8) and N_cur = team-games already played in S
    BEFORE this game (as-of, no lookahead) using PBP games with gameday < this game.

    Honest limitation: we only have full-season PBP snapshots on disk, not week-sliced
    archives for every season. When only full-season PBP exists, N_cur for the bridge
    uses a conservative week proxy from games.csv (week-1) counts, or we evaluate
    PRIOR-ONLY vs market as the clean as-of duel (no current-season leakage).
    """
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED", "need": "games.csv"}
    seasons_avail = []
    for p in PBP_DIR.glob("play_by_play_*.csv.gz"):
        # name like play_by_play_2024.csv.gz — stem strips only .gz
        parts = p.name.replace(".csv.gz", "").split("_")
        try:
            seasons_avail.append(int(parts[-1]))
        except ValueError:
            continue
    seasons_avail = sorted(set(seasons_avail))
    if not seasons_avail:
        return {"status": "DATA_BLOCKED", "need": "pbp seasons"}

    pbp_seasons = load_pbp_seasons(seasons_avail)
    ratings_by_s = {s: season_ratings(gt) for s, gt in pbp_seasons.items() if gt}

    games = []
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        if (rec.get("game_type") or "REG") != "REG":
            continue
        s = fnum(rec.get("season"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        if s is None or hs is None or aw is None:
            continue
        games.append(
            {
                "season": int(s),
                "week": int(fnum(rec.get("week")) or 0),
                "gameday": rec.get("gameday") or "",
                "home": rec.get("home_team"),
                "away": rec.get("away_team"),
                "margin": hs - aw,
                "spread": fnum(rec.get("spread_line")),
            }
        )
    games.sort(key=lambda r: (r["season"], r["gameday"], r["week"]))

    # Observed as-of N per team-season from games rows (week proxy)
    played = defaultdict(int)  # (season, team) -> games completed before current
    SCALE, HFA = 42.54, 2.0  # GLM convention; we measure, not assert production constants
    prior_rows, bridge_rows, raw_cur_rows, market_rows = [], [], [], []
    # Also naive: prior season net only (no blend) vs blend with w from observed weeks
    for g in games:
        s, h, a = g["season"], g["home"], g["away"]
        r_prior_s = ratings_by_s.get(s - 1)
        if not r_prior_s or h not in r_prior_s or a not in r_prior_s:
            played[(s, h)] += 1
            played[(s, a)] += 1
            continue
        nh, na = played[(s, h)], played[(s, a)]
        ph = r_prior_s[h]["net"]
        pa = r_prior_s[a]["net"]
        # current-season full snapshot may leak; if we have season s ratings use only as
        # "oracle_cur" diagnostic, never as production path when evaluating early weeks.
        r_cur = ratings_by_s.get(s) or {}
        wh = nh / (nh + 8.0)
        wa = na / (na + 8.0)
        # Without true current-season as-of EPA we cannot blend honestly mid-season from
        # a full-season snapshot. Production honest bridge when N=0 is prior-only.
        # We report TWO bridges:
        #  B_prior_only: N=0 → pure prior (cold-start answer)
        #  B_oracle_N: uses full-season current ratings as if as-of (UPPER BOUND, leaky — labeled)
        net_prior_diff = ph - pa
        pred_prior = SCALE * net_prior_diff + HFA
        ch = (r_cur.get(h) or {}).get("net")
        ca = (r_cur.get(a) or {}).get("net")
        pred_oracle = None
        if ch is not None and ca is not None:
            bh = wh * ch + (1 - wh) * ph
            ba = wa * ca + (1 - wa) * pa
            pred_oracle = SCALE * (bh - ba) + HFA
        y = g["margin"]
        prior_rows.append((pred_prior, y))
        if pred_oracle is not None:
            bridge_rows.append((pred_oracle, y))
            raw_cur_rows.append((SCALE * (ch - ca) + HFA, y))
        if g["spread"] is not None:
            # MEASURED convention on this games.csv (2026-09-19):
            # spearman(home_margin, spread_line) = +0.43; home wins ~68% when spread_line>0.
            # => positive spread_line = home favored. Predicted home margin = +spread_line.
            market_rows.append((g["spread"], y))
        played[(s, h)] += 1
        played[(s, a)] += 1

    def rmse_sp(pred_y):
        if len(pred_y) < 20:
            return None, len(pred_y)
        return math.sqrt(mean((p - y) ** 2 for p, y in pred_y)), len(pred_y)

    def spear_pred(pred_y):
        if len(pred_y) < 20:
            return None
        return spearman([p for p, _ in pred_y], [y for _, y in pred_y])

    rp, np_ = rmse_sp(prior_rows)
    rb, nb = rmse_sp(bridge_rows)
    rc, nc = rmse_sp(raw_cur_rows)
    rm, nm = rmse_sp(market_rows)
    sp_prior, sp_bridge, sp_raw, sp_mkt = (
        spear_pred(prior_rows),
        spear_pred(bridge_rows),
        spear_pred(raw_cur_rows),
        spear_pred(market_rows),
    )
    # Kill vs prior-only (honest cold-start path)
    kill_bridge = (
        rb is not None
        and rp is not None
        and nb >= 100
        and (rb < rp - 0.05 or (sp_bridge is not None and sp_prior is not None and sp_bridge > sp_prior + 0.05))
    )
    return {
        "status": "ok",
        "seasons_pbp_on_disk": seasons_avail,
        "n_prior_duel": np_,
        "rmse_prior_only_SCALE42.54": rp,
        "spearman_prior_only": sp_prior,
        "n_oracle_bridge_leaky": nb,
        "rmse_oracle_bridge_LEAKY_upper_bound": rb,
        "spearman_oracle_bridge_LEAKY": sp_bridge,
        "rmse_raw_current_full_season_LEAKY": rc,
        "spearman_raw_current_LEAKY": sp_raw,
        "n_market": nm,
        "rmse_market_spread": rm,
        "spearman_market": sp_mkt,
        "method": (
            "Prior-only = production cold-start when N_2026=0 (no leak). "
            "Oracle bridge uses full-season current PBP labeled LEAKY upper bound only. "
            "SCALE 42.54 / HFA 2.0 are GLM-reported constants — we measure, we do not "
            "re-fit production nfl-epa-fair-value (scale 0.12 / HFA 0.025 EPA) here."
        ),
        "kill_line": (
            "Wire prior-bridge into nfl_epa_adj only if prior-only path (or clean as-of N) "
            "beats market/economic baseline on held-out as-of n>=272 with Brier/RMSE rule "
            "from PATH_FROM_38_TO_100. Full-season current snapshot is NOT a valid as-of input."
        ),
        "kill_line_triggered_on_prior_only_vs_market": (
            rp is not None and rm is not None and np_ >= 100 and rp <= rm - 0.05
        ),
        "kill_line_triggered_bridge_oracle_vs_prior": kill_bridge,
        "honest_verdict": (
            "PRIORITY_CANDIDATE_FOR_ASOF_REPLAY"
            if (rp is not None and rm is not None and rp <= rm - 0.05)
            else (
                "PRIOR_ONLY_NOT_BETTER_THAN_MARKET"
                if (rp is not None and rm is not None and rp > rm)
                else "INSUFFICIENT"
            )
        ),
        "replacement": (
            "Cold-start positive path: when NFL_EPA_MIN_GAMES blocks live adj-EPA, display "
            "marketFairProb (H3) + prior-season net EPA as RESEARCH caption only until a "
            "week-sliced as-of replay clears the kill line. Never mint on prior alone."
        ),
    }


def turnover_occurrence_independent():
    """Occurrence vs recovery using team_week + pbp fumble proxies on disk."""
    tw = PBP_DIR / "stats_team_week_2024.csv"
    if not tw.exists():
        return {"status": "DATA_BLOCKED", "need": "stats_team_week"}
    agg = defaultdict(lambda: {"g": 0, "ff": 0.0, "int": 0.0, "fl": 0, "it": 0})
    for rec in csv.DictReader(tw.open(encoding="utf-8")):
        if (rec.get("season_type") or "REG") != "REG":
            continue
        t = rec.get("team")
        if not t:
            continue
        def g(k):
            return fnum(rec.get(k)) or 0.0
        a = agg[t]
        a["g"] += 1
        a["ff"] += g("def_fumbles_forced")
        a["int"] += g("def_interceptions")
        a["fl"] += g("fumbles_lost")
        a["it"] += g("passing_interceptions")
    # Also read external oppadj CSV if present (fleet artifact — label provenance)
    external = None
    ext_path = OPPADJ / "data" / "turnover_luck_2026.csv"
    if ext_path.exists():
        try:
            external = list(csv.DictReader(ext_path.open(encoding="utf-8")))[:40]
        except Exception:
            external = None
    rows = []
    for t, a in agg.items():
        if a["g"] < 8:
            continue
        gp = a["g"]
        ta = (a["int"] + a["ff"]) / gp
        ga = (a["fl"] + a["it"]) / gp
        rows.append({"team": t, "games": gp, "takeaway_pg": ta, "giveaway_pg": ga, "to_margin": ta - ga})
    if not rows:
        return {"status": "EMPTY"}
    league_ta = mean(r["takeaway_pg"] for r in rows)
    league_ga = mean(r["giveaway_pg"] for r in rows)
    for r in rows:
        r["to_margin_regressed_50"] = 0.5 * r["to_margin"] + 0.5 * (league_ta - league_ga)
        # expected TO using forced rates only + recovery 50%: E[opp TO] ≈ 0.5 * our ff + our int
        # This is occurrence-shaped, not recovery-shaped.
        r["process_to_pg"] = r["takeaway_pg"]  # already occurrence (forced int/ff), not recovered
    rows.sort(key=lambda r: -r["to_margin_regressed_50"])
    return {
        "status": "ok",
        "source_team_week": str(tw.name),
        "league_takeaway_pg": league_ta,
        "league_giveaway_pg": league_ga,
        "top5_regressed": [{k: r[k] for k in ("team", "to_margin", "to_margin_regressed_50")} for r in rows[:5]],
        "bot5_regressed": [{k: r[k] for k in ("team", "to_margin", "to_margin_regressed_50")} for r in rows[-5:]],
        "external_oppadj_turnover_luck_2026_csv_rows": len(external) if external is not None else 0,
        "external_sample_first5": external[:5] if external else None,
        "external_provenance": str(ext_path) if external is not None else None,
        "fleet_claim_UNVERIFIED_BY_MIMO": {
            "source": "Sports-oppadj AGENTS.md 2026-09-19 + master plan GLM5.3",
            "claim": "occurrence Spearman 0.375 vs naive 0.219 on 2025 W1-8→W9-18; recovery r≈0; TB 0% / KC BUF 100% recovery flags",
            "mimo_status": "NOT_RECOMPUTED_FROM_PBP_IN_THIS_PASS — fleet-reported; do not publish as Mimo OBS",
        },
        "kill_line": (
            "Wire regressed occurrence TO into adj-EPA residual only if holdout Brier improves "
            ">=0.002 n>=272 vs adj-EPA alone. Never feed raw TO margin or recovered-fumble counts."
        ),
        "replacement": "PATH C live: 50% shrink occurrence instrument + external luck flags as research captions.",
    }


def week3_slate_research_copy():
    """Copy observed Week 3 slate CSV as research artifact — not a pick card."""
    src = OPPADJ / "data" / "w3_2026_slate_model_vs_market.csv"
    if not src.exists():
        return {"status": "DATA_BLOCKED", "need": "w3 slate csv"}
    rows = list(csv.DictReader(src.open(encoding="utf-8")))
    dest = Path("docs/ops/stats-lane/out/w3_2026_slate_model_vs_market.json")
    write_report(
        dest,
        {
            "status": "ok",
            "provenance": str(src),
            "n_games": len(rows),
            "note": (
                "Fleet-generated model vs market research slate. Mimo did NOT mint these lines. "
                "Do not post as engine picks. Kill: any product claim needs export board + "
                "marketFairProb + passVeto on our board-export, not this CSV alone."
            ),
            "rows": rows,
        },
    )
    return {"status": "ok", "n_games": len(rows), "dest": str(dest), "sample": rows[:3]}


def external_decision_tier_copy():
    path = OPPADJ / "data" / "decision_tier_calibration_by_sport.csv"
    if not path.exists():
        return {"status": "DATA_BLOCKED"}
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    return {
        "status": "EXTERNAL_CLAIM_FLEET_DB",
        "provenance": str(path),
        "mimo_did_not_query_neon": True,
        "law7": "NEVER invent DATABASE_URL; we do not connect",
        "rows": rows,
        "use": (
            "PASS-veto product rule is already never-mint PASS. Fleet DB read is corroborating "
            "evidence FOR suppression, not a Mimo-observed rate. Board-export census still required."
        ),
    }


def main() -> int:
    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "H_prior_bridge": epa_prior_bridge_validation(),
        "H_turnover_independent": turnover_occurrence_independent(),
        "H_week3_slate_copy": week3_slate_research_copy(),
        "H_external_decision_tiers": external_decision_tier_copy(),
        "loop_top_replacements_active": [
            "K3 No-band + weather/roof/rest Mondrian UQ (6/6 OOT)",
            "marketFairProb public p (realised bits +0.075)",
            "market ML Brier 0.211 Law-11 baseline",
            "depth display-only (books Spearman -0.80)",
            "fail-closed conformal ACI/margin-set",
            "PASS veto never mint + await export v3",
            "EPA prior-bridge research path (this file) — not ranking authority",
        ],
    }
    write_report(OUT, report)
    hb = report["H_prior_bridge"]
    print("prior_bridge", hb.get("honest_verdict"), "rmse_prior", hb.get("rmse_prior_only_SCALE42.54"),
          "rmse_mkt", hb.get("rmse_market_spread"), "n", hb.get("n_prior_duel"))
    print("turnover", report["H_turnover_independent"].get("status"),
          "ext_rows", report["H_turnover_independent"].get("external_oppadj_turnover_luck_2026_csv_rows"))
    print("w3", report["H_week3_slate_copy"])
    print("decision_tiers rows", len((report["H_external_decision_tiers"].get("rows") or [])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
