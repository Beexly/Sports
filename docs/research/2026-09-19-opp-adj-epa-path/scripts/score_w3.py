"""Score the W3 2026 slate after the weekend (run 2026-09-22+).

Grades, per game: model margin vs actual, market spread vs actual, and which side
of each model-vs-market divergence won. Purely retrospective scoring of the research
artifact w3_2026_slate_model_vs_market.csv -- NOT a pick record.
"""
import numpy as np
import pandas as pd

slate = pd.read_csv("data/w3_2026_slate_model_vs_market.csv")
sched = pd.read_csv("data/schedules.csv", low_memory=False)
s26 = sched[(sched.season == 2026) & (sched.game_type == "REG")].copy()
s26["margin"] = s26.home_score - s26.away_score

# map slate rows (game like "KC @ MIA") to schedule
s26["matchup"] = s26.away_team + " @ " + s26.home_team
j = slate.merge(s26[["matchup", "week", "margin", "home_score", "away_score"]], on="matchup", how="left")
done = j.dropna(subset=["margin"]).copy()
print(f"scored {len(done)}/{len(j)} games (weeks played: {sorted(done.week.unique()) if len(done) else 'none'})")

if len(done):
    done["model_err"] = done.model_margin_home - done.margin
    done["mkt_err"] = done["market_spread_home(fav+)"] - done.margin
    # divergence sides: model said home by (model_margin); market said home by (spread)
    done["model_side"] = np.where(done.model_margin_home > done["market_spread_home(fav+)"],
                                  "home_vs_mkt", "away_vs_mkt")
    done["div_won"] = np.where(
        done.model_side == "home_vs_mkt",
        done.margin > done["market_spread_home(fav+)"],
        done.margin < done["market_spread_home(fav+)"])
    print(done[["matchup", "gameday", "model_margin_home", "market_spread_home(fav+)",
                "margin", "model_err", "mkt_err", "div_won"]].to_string(index=False))
    rmse_model = float(np.sqrt(np.mean(done.model_err ** 2)))
    rmse_mkt = float(np.sqrt(np.mean(done.mkt_err ** 2)))
    print(f"\nmodel RMSE {rmse_model:.2f} | market RMSE {rmse_mkt:.2f} | "
          f"model-vs-market divergences won: {int(done.div_won.sum())}/{int(done.div_won.notna().sum())}")
    done.to_csv("data/w3_2026_slate_SCORED.csv", index=False)
    print("saved data/w3_2026_slate_SCORED.csv")
