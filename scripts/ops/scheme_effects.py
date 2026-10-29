"""Scheme effects — measured from FTN charting joined to play outcome.

FTN charting gives what the box score cannot: box count, blitzers, motion, play
action, RPO, screen, read thrown, catchable/contested, QB-fault sacks. Joined to
EPA, each becomes an estimable effect rather than a broadcast talking point.

    python3 scheme_effects.py
"""
import json
import statistics as st

import pandas as pd

SEASONS = (2024, 2025, 2026)
COLS = ["season", "season_type", "game_id", "play_id", "epa", "posteam", "defteam",
        "play_type", "qb_dropback", "rush_attempt", "pass_attempt", "two_point_attempt",
        "home_coach", "away_coach", "home_team", "away_team", "down", "ydstogo"]


def load():
    p = pd.concat([pd.read_parquet(f"/opt/model/data/pbp_{s}.parquet", columns=COLS)
                   for s in SEASONS], ignore_index=True)
    p = p[(p.season_type == "REG") & p.posteam.notna() & p.epa.notna()]
    p = p[p.two_point_attempt != 1]
    f = pd.concat([pd.read_parquet(f"/opt/model/data/ftn_{s}.parquet")
                   for s in SEASONS], ignore_index=True)
    f = f.rename(columns={"nflverse_play_id": "play_id", "nflverse_game_id": "game_id"})
    f["play_id"] = pd.to_numeric(f.play_id, errors="coerce")
    p["play_id"] = pd.to_numeric(p.play_id, errors="coerce")
    m = p.merge(f, on=["game_id", "play_id"], how="inner", suffixes=("", "_f"))
    m["coach"] = m.apply(
        lambda r: r.home_coach if r.posteam == r.home_team else r.away_coach, axis=1)
    return m


def effect(m, flag, label, subset=None, min_n=200):
    d = m if subset is None else subset
    on, off = d[d[flag] == True], d[d[flag] == False]
    if len(on) < min_n or len(off) < min_n:
        return None
    return {"flag": label, "n_on": len(on), "n_off": len(off),
            "epa_on": round(on.epa.mean(), 4), "epa_off": round(off.epa.mean(), 4),
            "delta": round(on.epa.mean() - off.epa.mean(), 4)}


def main():
    m = load()
    print(f"joined plays: {len(m)}")

    drops = m[m.qb_dropback == 1]
    runs = m[m.rush_attempt == 1]

    out = []
    for r in [
        effect(m, "is_play_action", "play action", drops),
        effect(m, "is_motion", "motion", m),
        effect(m, "is_rpo", "RPO", m),
        effect(m, "is_screen_pass", "screen", drops),
        effect(m, "is_no_huddle", "no huddle", m),
        effect(m, "is_qb_out_of_pocket", "QB out of pocket", drops),
    ]:
        if r:
            out.append(r)

    # box count: stacked (8+) vs light (6-) on runs
    if "n_defense_box" in runs:
        stacked = runs[runs.n_defense_box >= 8]
        light = runs[runs.n_defense_box <= 6]
        if len(stacked) > 200 and len(light) > 200:
            out.append({"flag": "box 8+ vs 6-", "n_on": len(stacked), "n_off": len(light),
                        "epa_on": round(stacked.epa.mean(), 4), "epa_off": round(light.epa.mean(), 4),
                        "delta": round(stacked.epa.mean() - light.epa.mean(), 4)})

    # blitz: 5+ rushers vs 4
    if "n_pass_rushers" in drops:
        blitz = drops[drops.n_pass_rushers >= 5]
        four = drops[drops.n_pass_rushers == 4]
        if len(blitz) > 200 and len(four) > 200:
            out.append({"flag": "blitz 5+ vs rush 4", "n_on": len(blitz), "n_off": len(four),
                        "epa_on": round(blitz.epa.mean(), 4), "epa_off": round(four.epa.mean(), 4),
                        "delta": round(blitz.epa.mean() - four.epa.mean(), 4)})

    print(f"\n{'effect':26s} {'n_on':>6s} {'n_off':>6s} {'epa_on':>8s} {'epa_off':>8s} {'delta':>8s}")
    for r in sorted(out, key=lambda x: -abs(x["delta"])):
        print(f"{r['flag']:26s} {r['n_on']:6d} {r['n_off']:6d} {r['epa_on']:+8.4f} {r['epa_off']:+8.4f} {r['delta']:+8.4f}")

    # QB decision quality
    if "is_interception_worthy" in drops:
        qb = drops.groupby("posteam").agg(
            n=("epa", "size"),
            int_worthy=("is_interception_worthy", "mean"),
            qb_fault=("is_qb_fault_sack", "mean"),
            catchable=("is_catchable_ball", "mean")).query("n >= 200")
        qb = qb.round(4).sort_values("int_worthy", ascending=False)
        print("\nQB decision quality (share of dropbacks):")
        print(qb.head(6).to_string())
        print("  ...")
        print(qb.tail(4).to_string())
        qb.to_csv("/opt/model/data/qb_decision.csv")

    json.dump(out, open("/opt/model/data/scheme_effects.json", "w"), indent=1)


if __name__ == "__main__":
    main()
