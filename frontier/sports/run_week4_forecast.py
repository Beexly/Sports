import sys
import os
import json

sys.path.append(r"C:\Users\Garrett\onejev")
from frontier.sports.nfl_week4_forecast_engine import NFLWeek4ForecastEngine

print("=" * 80)
print("NFL WEEK 4 SOVEREIGN GAME FORECASTS (OCTOBER 4, 2026)")
print("=" * 80)

games = NFLWeek4ForecastEngine.evaluate_game_edges()
for g in games:
    m = g["matchup"]
    ms = g["market_spread"]
    mods = g["model_spread"]
    pick = g["recommended_side"]
    tot = g["recommended_total"]
    edge = g["edge_points"]
    stake = g["cmtk_stake_pct"]
    trust = g["trust_status"]
    print(f"{m:22} | Mkt: {ms:5.1f} | Model: {mods:5.1f} | Pick: {pick:15} | Tot: {tot:12} | Edge: {edge:4.1f} pts | Stake: {stake:4.1f}% | Trust: {trust}")

print("\n" + "=" * 80)
print("NFL WEEK 4 PLAYER PROPS (CQR & CONFORMAL QUANTILE REGRESSION)")
print("=" * 80)

props = NFLWeek4ForecastEngine.evaluate_player_props()
for p in props:
    pl = p["player"]
    pr = p["prop"]
    line = p["line"]
    med = p["projected_median"]
    rec = p["recommendation"]
    conf = p["confidence"] * 100.0
    cqr_stat = p["cqr_status"]
    cqr_int = p["cqr_interval"]
    int_str = f"[{cqr_int[0]:.1f}, {cqr_int[1]:.1f}]" if cqr_int else "ABSTAIN"
    print(f"{pl:16} ({pr:14}) | Line: {line:5.1f} | Proj: {med:5.1f} | CQR 90%: {int_str:14} | Pick: {rec:28} | Conf: {conf:2.0f}% | {cqr_stat}")

print("\n" + "=" * 80)
print("NFL WEEK 4 SAME GAME PARLAYS (CANONICAL VINE COPULA SGP ENGINE)")
print("=" * 80)

sgps = NFLWeek4ForecastEngine.evaluate_week4_sgps()
for s in sgps:
    name = s["parlay_name"]
    jp = s["joint_probability"] * 100.0
    fo = s["fair_decimal_odds"]
    fa = s["fair_american_odds"]
    np_prob = s["naive_independent_prob"] * 100.0
    no = s["naive_decimal_odds"]
    alpha = s["correlation_alpha_pct"]
    legs_str = " + ".join(s["legs"])
    print(f"\n>> {name}")
    print(f"   Legs: {legs_str}")
    print(f"   Joint Prob: {jp:.1f}% (Fair: {fo:.2f} / {fa:+d}) | Naive: {np_prob:.1f}% ({no:.2f}) | Alpha: {alpha:+.1f}% | Regime: {s['tail_regime']}")
