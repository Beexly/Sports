#!/usr/bin/env python3
"""
cfb_usage_join.py — ITEM 5: usage x prop-sigma join -> player-level residuals.
Pipeline: usage shares (CFBD) x team pass rates -> projected opportunity ->
matched against DK's implied (mu_hat, sigma_hat) -> residual = DK mu - model mu.
The residual sheet is the player-level edge surface (diagnostic).
"""
import csv, json, statistics, math
from collections import defaultdict
from freshness_gate import load_stamped

DATA = "/var/minis/workspace/cfb/data"

def norm(s):
    return (s or "").lower().replace(".", "").replace("'", "").split(" (")[0].strip()

def main():
    # team season passing/rushing context (2026)
    team_ctx = {}
    try:
        for r in load_stamped(f"{DATA}/cfb_team_season_stats_2026.csv").to_dict("records"):
            team_ctx[r["team"]] = {
                "pass_pg": float(r.get("netPassingYards_pg") or 0),
                "rush_pg": float(r.get("rushingYards_pg") or 0),
            }
    except FileNotFoundError:
        pass
    # usage 2026: player -> usage dict
    usage = {}
    try:
        for r in load_stamped(f"{DATA}/cfb_usage_2026.csv").to_dict("records"):
            usage[norm(r["name"])] = {
                "team": r.get("team"), "pos": r.get("position"),
                "overall": float(r.get("usage_overall") or 0),
                "pass": float(r.get("usage_pass") or 0),
                "rush": float(r.get("usage_rush") or 0),
            }
    except FileNotFoundError:
        print("[WARN] usage csv missing"); return
    # empirical sigmas (player level)
    emp = load_stamped(f"{DATA}/../cfb_prop_sigmas.json")["top_150_player_sigma_table"]
    emp_by_key = {}
    for row in emp:
        emp_by_key.setdefault((norm(row["name"]), row["metric"]), row)
    # DK fits
    dk = json.load(open(f"{DATA}/../cfb/dk_cfb_prop_fits.json"))["fits"] if False else load_stamped("/var/minis/workspace/cfb/dk_cfb_prop_fits.json")["fits"]
    metric = {"pass": "passing_yards", "rush": "rushing_yards", "rec": "receiving_yards"}

    rows = []
    matched = 0
    for market, fits in dk.items():
        met = metric[market]
        for f in fits:
            nm = norm(f["player"])
            u = usage.get(nm)
            if not u: continue
            e = emp_by_key.get((nm, met))
            # model mu: usage-weighted team context
            team = u["team"]
            ctx = team_ctx.get(team, {})
            model_mu = None
            if market == "pass" and u["pos"] == "QB" and ctx.get("pass_pg"):
                model_mu = ctx["pass_pg"] * 0.92           # QB ≈ team net passing
            elif market == "rush" and u["pos"] != "QB" and ctx.get("rush_pg"):
                model_mu = ctx["rush_pg"] * min(1.0, u["rush"])   # share of team rush yards
            elif market == "rec" and u["pos"] != "QB" and ctx.get("pass_pg"):
                model_mu = ctx["pass_pg"] * min(0.45, u["pass"] * 1.15)  # WR/TE share of air yards
            if model_mu is None or model_mu <= 0: continue
            matched += 1
            rows.append({
                "player": f["player"], "market": market, "team": team, "pos": u["pos"],
                "usage_overall": round(u["overall"], 3),
                "dk_mu": f["mu_fit"], "model_mu_usage": round(model_mu, 1),
                "residual_dk_minus_model": round(f["mu_fit"] - model_mu, 1),
                "emp_mean": round(e["mean"], 1) if e else None,
                "emp_std": round(e["std"], 1) if e else None,
                "dk_sigma": f["sigma"],
            })
    rows.sort(key=lambda r: -abs(r["residual_dk_minus_model"]))
    with open("/var/minis/workspace/cfb/usage_prop_residuals_2026.csv", "w", newline="") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(f"[ITEM 5] usage-join: {matched} player-markets matched (of {sum(len(v) for v in dk.values())} DK fits)")
    if rows:
        gaps = [r["residual_dk_minus_model"] for r in rows]
        print(f"  residual (DK mu - usage-model mu): mean {statistics.mean(gaps):+.1f}, "
              f"sd {statistics.stdev(gaps):.1f}, |max| {max(abs(g) for g in gaps):.1f}")
        print("  top residuals (DK prices far from usage-implied opportunity):")
        for r in rows[:6]:
            print(f"    {r['player']:<28} {r['market']:<5} dk {r['dk_mu']:>6.1f} vs usage-model {r['model_mu_usage']:>6.1f} "
                  f"(resid {r['residual_dk_minus_model']:+.1f})")
    print("[NOTE] usage x team-context model is crude (share x team yards); the residual bands,")
    print("       not point values, are the signal. Kill test: weekly drift + graded outcomes.")

if __name__ == "__main__":
    main()
