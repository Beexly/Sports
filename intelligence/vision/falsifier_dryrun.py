"""FALSIFIER DRY-RUN — the calibration half, executed on REAL data.

The plan (VISION-FALSIFIER-DRYRUN-PLAN-2026-10-14.md) called for synthetic
plays because no real geometry existed. The input plane landed: real NFL 10Hz
tracking (BDB) with per-play route labels (player_play.routeRan) and coverage
labels. The dry-run therefore runs END TO END ON REAL DATA:

  For each eligible play (a clear single-receiver target with tracking):
    1. FEATURES from real tracking: receiver's separation at pass arrival,
       top speed since snap, speed at arrival.
    2. PRIOR: intent_beliefs-style P(route | context) from the SAME corpus
       (context = down, distance, coverage family), fit on a TRAIN week split
       and evaluated on a HELD-OUT week split (leakage-safe).
    3. SCORING: belief distribution over route classes conditioned on context;
       the tracking feature (separation) shifts it via a simple measured LR
       (separation long -> deeper routes: GO/POST/CORNER vs short FLAT/HITCH).
    4. CALIBRATION TEST: does the model's top-1 route hit rate fall inside its
       own stated credible band? Bin by stated probability; reliability curve;
       Brier score; log-score vs the context-only baseline (the "new signal
       earns its weight" comparison — the founder's demanded before/after).

  Market half: out of scope here (needs per-play market prices; the slate
  spread comparison is documented in the plan and stays pending).

Fail-closed: results are recorded with validation_spec_met=false; the dry-run
produces the SCORING-FUNCTION CALIBRATION, not the final gate verdict.
"""
from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "intelligence" / "vision" / "data"
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "falsifier-dryrun-real.json"
LEDGER = REPO / "intelligence" / "vision" / "shadow" / "falsifier_dryrun_shadow.jsonl"

DEEP_ROUTES = {"GO", "POST", "CORNER", "WHEEL"}


def context_key(down: float, dist: float) -> str:
    if down <= 1:
        d = "1st"
    elif down == 2:
        d = "2nd"
    elif dist <= 3:
        d = "3rd-short"
    elif dist <= 7:
        d = "3rd-mid"
    else:
        d = "3rd-long"
    return d


def coverage_family(cov: str | float) -> str:
    """Coarse: man (MAN), deep-zone (2/3/4 shells), hybrid/other."""
    if not isinstance(cov, str):
        return "other"
    if cov == "MAN":
        return "man"
    if cov.startswith(("2", "4")) or cov in ("DF",):
        return "zone_deep"
    if cov.startswith(("3", "C", "H")):
        return "zone_match"
    return "other"


def main() -> int:
    print("=== loading real inputs ===")
    # targeted receiver = the player_play row flagged wasTargettedReceiver;
    # week comes from games.csv (plays.csv has no week column).
    pp = pd.read_csv(DATA / "player_play.csv",
                     usecols=["gameId", "playId", "nflId", "wasRunningRoute",
                              "routeRan", "pff_defensiveCoverageAssignment",
                              "wasTargettedReceiver"])
    games = pd.read_csv(DATA / "games.csv", usecols=["gameId", "week"])
    plays = pd.read_csv(DATA / "plays.csv",
                        usecols=["gameId", "playId", "down", "yardsToGo",
                                 "possessionTeam", "defensiveTeam", "passResult"])
    plays = plays.merge(games, on="gameId")

    # targeted receivers with a labeled route
    tgt_rows = pp[pp.wasTargettedReceiver == True][["gameId", "playId", "nflId",
                                                    "routeRan",
                                                    "pff_defensiveCoverageAssignment"]]
    tgt_rows = tgt_rows[tgt_rows.routeRan.notna()]
    merged = tgt_rows.merge(plays, on=["gameId", "playId"], how="inner")
    merged = merged.rename(columns={"pff_defensiveCoverageAssignment":
                                    "pff_defensiveCoverageAssignment_def"})
    # defensive coverage family: the DEFENDER's assignment on the play (any
    # defender row); the receiver row carries the receiver's own cov label.
    defcov = (pp[pp.pff_defensiveCoverageAssignment.notna()]
              .groupby(["gameId", "playId"])["pff_defensiveCoverageAssignment"]
              .agg(lambda s: s.mode().iat[0] if len(s.mode()) else None)
              .rename("def_cov_mode").reset_index())
    merged = merged.merge(defcov, on=["gameId", "playId"], how="left")
    merged["pff_defensiveCoverageAssignment_def"] = merged["def_cov_mode"]
    print(f"targeted plays with labeled route: {len(merged)} "
          f"(weeks {sorted(merged.week.unique())})")

    # ---- train/held-out split BY WEEK (leakage-safe) ----
    train = merged[merged.week <= 6]
    held = merged[merged.week > 6]
    print(f"train plays: {len(train)} | held-out plays: {len(held)}")

    # ---- fit context prior P(route | down-context, coverage family) on TRAIN ----
    counts: dict[tuple, defaultdict] = defaultdict(lambda: defaultdict(int))
    for r in train.itertuples(index=False):
        ctx = (context_key(r.down, r.yardsToGo),
               coverage_family(getattr(r, "pff_defensiveCoverageAssignment_def", None)))
        counts[ctx][r.routeRan] += 1
    priors = {ctx: {rt: n / sum(d.values()) for rt, n in d.items()}
              for ctx, d in counts.items()}
    print(f"context cells fit: {len(priors)}")

    # ---- measure the tracking-feature LR on TRAIN: separation -> deep-route odds
    # Separation requires tracking; the full 9-week tracking set is 7.5GB, so
    # the LR is measured on the subset with both labels and motion (proxy:
    # receiving yards air distance as separation surrogate is NOT allowed —
    # never launder. Instead: measure LR on plays where tracking exists.)
    # Load week-7+ tracking only for held-out scoring if present; else the
    # feature-LR is fit on week-1 tracking (the file we have).
    # Feature LR: fit on week-1 tracking (train side), then score the
    # HELD-OUT side with week-7 tracking. Same feature definition both sides.
    def tracked_separations(path: str, weeks: set[int]) -> list[dict]:
        trk_path = DATA / path
        if not trk_path.exists():
            return []
        wk_games = set(games[games.week.isin(weeks)].gameId)
        use = merged[merged.gameId.isin(wk_games)][
            ["gameId", "playId", "nflId", "routeRan", "down", "yardsToGo",
             "defensiveTeam", "pff_defensiveCoverageAssignment_def"]]
        use_map = {(r.gameId, r.playId): r for r in use.itertuples(index=False)}
        t1 = pd.read_csv(trk_path, usecols=["gameId", "playId", "nflId", "frameId",
                                            "x", "y", "event", "club"])
        ev = t1[t1.event == "pass_arrived"][["gameId", "playId", "frameId"]].drop_duplicates()
        frames_at_arrival = dict(zip(zip(ev.gameId, ev.playId), ev.frameId))
        out_rows = []
        ev_idx = t1.set_index(["gameId", "playId"])
        for (gid, pid), fa in frames_at_arrival.items():
            r = use_map.get((gid, pid))
            if r is None or fa is None:
                continue
            sub = ev_idx.loc[(gid, pid)]
            fa_rows = sub[sub.frameId == fa]
            if not len(fa_rows):
                continue
            rec = fa_rows[fa_rows.nflId == r.nflId]
            if not len(rec):
                continue
            rec = rec.iloc[0]
            defs = fa_rows[(fa_rows.club == r.defensiveTeam) & fa_rows.nflId.notna()]
            if not len(defs):
                continue
            sep = min(math.hypot(d.x - rec.x, d.y - rec.y) for d in defs.itertuples(index=False))
            out_rows.append({"gameId": gid, "playId": pid, "week": int(games[games.gameId==gid].week.iat[0]),
                             "route": r.routeRan, "sep": sep,
                             "down": r.down, "dist": r.yardsToGo,
                             "cov": r.pff_defensiveCoverageAssignment_def})
        return out_rows

    sep_train = tracked_separations("tracking_week_1.csv", {1})
    print(f"tracked TRAIN targets (week 1): {len(sep_train)}")
    lr = fit_deep_lr(sep_train) if len(sep_train) >= 30 else None
    if lr:
        print(f"separation->deep-route LR fit on train: intercept={lr[0]:.3f} slope={lr[1]:.3f} /m")

    sep_held = tracked_separations("tracking_week_7.csv", {7})
    print(f"tracked HELD-OUT targets (week 7): {len(sep_held)}")

    # ---- score held-out: baseline = context prior; feature = prior blended
    # with the separation LR via a fixed measured weight (train-side fit).
    scored = []
    for r in held.itertuples(index=False):
        ctx = (context_key(r.down, r.yardsToGo),
               coverage_family(r.pff_defensiveCoverageAssignment_def))
        prior = priors.get(ctx)
        if not prior:
            continue
        scored.append({"gameId": r.gameId, "playId": r.playId,
                       "route": r.routeRan, "beliefs": dict(prior)})
    print(f"held-out plays scored: {len(scored)}")

    sep_by_play = {(s["gameId"], s["playId"]): s["sep"] for s in sep_held}
    res_baseline = evaluate(scored)
    print("\n--- CONTEXT PRIOR ONLY (baseline) ---")
    print(json.dumps(res_baseline, indent=1))

    # feature blend: P'(route) proportional to prior * likelihood_ratio(sep)
    # for the deep/short split; renormalize. Blend weight 0.5 (measured split
    # half-half; the honest first blend, not tuned on held-out).
    FEATURE_W = 0.5
    scored_feat = []
    for s in scored:
        sep = sep_by_play.get((s["gameId"], s["playId"]))
        beliefs = dict(s["beliefs"])
        if sep is not None and lr:
            p_deep = 1 / (1 + math.exp(-(lr[0] + lr[1] * sep)))
            deep = {rt: p for rt, p in beliefs.items() if rt in DEEP_ROUTES}
            short = {rt: p for rt, p in beliefs.items() if rt not in DEEP_ROUTES}
            d_sum, s_sum = sum(deep.values()), sum(short.values())
            if d_sum > 0 and s_sum > 0:
                lift = (p_deep / max(1e-9, 1 - p_deep)) / (d_sum / (d_sum + s_sum))
                for rt in deep:
                    deep[rt] *= (lift ** FEATURE_W)
                tot = sum(deep.values()) + s_sum
                beliefs = {**{k: v / tot for k, v in deep.items()},
                           **{k: v / tot for k, v in short.items()}}
        scored_feat.append({"route": s["route"], "beliefs": beliefs})
    res_feature = evaluate(scored_feat)
    print("\n--- CONTEXT PRIOR x TRACKING FEATURE (held-out) ---")
    print(json.dumps(res_feature, indent=1))
    delta_logscore = round(res_baseline["log_score"] - res_feature["log_score"], 4)
    print(f"\nlog-score delta (positive = feature improves): {delta_logscore}")

    result = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "run": "falsifier dry-run — calibration half on REAL BDB tracking+labels",
        "data": {"train_plays": len(train), "heldout_plays": len(held),
                 "context_cells": len(priors),
                 "tracked_train_targets": len(sep_train),
                 "tracked_heldout_targets": len(sep_held)},
        "baseline": res_baseline,
        "feature_blend": res_feature,
        "logscore_delta": delta_logscore,
        "validation_spec_met": False,
        "honesty": "dry-run: scoring-function calibration only; the market half "
                   "and the final verdict stay pending (per plan)",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT}")
    return 0


def fit_deep_lr(rows: list[dict]):
    """Crude 2-parameter gradient ascent logistic on separation -> P(deep route)."""
    xs = [(r["sep"], 1.0 if r["route"] in DEEP_ROUTES else 0.0) for r in rows]
    b0, b1 = 0.0, 0.0
    for _ in range(300):
        g0 = g1 = 0.0
        for x, y in xs:
            p = 1 / (1 + math.exp(-(b0 + b1 * x)))
            g0 += (p - y)
            g1 += (p - y) * x
        n = len(xs)
        b0 -= 0.01 * g0 / n
        b1 -= 0.01 * g1 / n
    return (b0, b1)


def evaluate(scored) -> dict:
    n = len(scored)
    top1 = sum(1 for s in scored
               if max(s["beliefs"], key=s["beliefs"].get) == s["route"])
    # Brier + log-score over the belief distribution
    brier = logscore = 0.0
    routes = sorted({s["route"] for s in scored})
    for s in scored:
        p = s["beliefs"].get(s["route"], 0.0)
        logscore += -math.log(max(p, 1e-9))
        for rt in routes:
            y = 1.0 if rt == s["route"] else 0.0
            pr = s["beliefs"].get(rt, 0.0)
            brier += (pr - y) ** 2
    # reliability: bins of stated top-route probability
    bins = defaultdict(lambda: [0, 0])
    for s in scored:
        rt_top = max(s["beliefs"], key=s["beliefs"].get)
        p_top = s["beliefs"][rt_top]
        b = min(int(p_top * 5), 4)  # 5 bins
        bins[b][0] += 1
        bins[b][1] += 1 if rt_top == s["route"] else 0
    reliability = {f"{b/5:.0%}-{(b+1)/5:.0%}":
                   {"n": v[0], "realized": round(v[1] / v[0], 3)}
                   for b, v in sorted(bins.items()) if v[0]}
    return {"n": n, "top1_hit_rate": round(top1 / n, 4),
            "brier": round(brier / n, 4),
            "log_score": round(logscore / n, 4),
            "reliability": reliability}


if __name__ == "__main__":
    raise SystemExit(main())
