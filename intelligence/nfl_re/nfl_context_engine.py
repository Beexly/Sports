"""nfl_context_engine.py — unified pipeline from public pbp to paywalled-context metrics.

Two acquisition paths, in order:
  A. reconstructed models in equations.py applied to whatever covariates exist
  B. automatic pivot to the live NGS endpoints when a play lacks tracking covariates
     (exploit.py) with a WAF/rate-limit translator in front of the transport.

Input is an nflfastR-shaped DataFrame (play_id, game_id, down, ydstogo,
yardline_100, air_yards, qb_epa, ..., plus optional tracking columns
separation, cushion, closing_speed, defenders_in_box).
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import equations as E

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
PROXY = "https://nextgenstats.nfl.com"
TRACKING_COLS = ("separation", "cushion", "closing_speed")

# ---------------------------------------------------------------- transport / WAF
class Transport:
    """Reverse-skill router: classifies the block, picks a mitigation, retries."""

    def __init__(self, min_interval=0.34, max_retries=4, backoff=1.7):
        self.last = 0.0
        self.min_interval = min_interval
        self.max_retries = max_retries
        self.backoff = backoff
        self.stats = {"ok": 0, "blocked": 0, "mitigated": 0}

    def _pace(self):
        gap = time.time() - self.last
        if gap < self.min_interval:
            time.sleep(self.min_interval - gap)
        self.last = time.time()

    @staticmethod
    def classify(code, body):
        if code == 403 and b"identity-based policy" in body:
            return "cognito_deny"
        if code == 403:
            return "waf_deny"
        if code == 429:
            return "rate_limit"
        if code >= 500:
            return "origin_error"
        return "other"

    def get(self, path, params=None):
        url = PROXY + path + ("?" + "&".join(f"{k}={v}" for k, v in (params or {}).items())
                              if params else "")
        delay = self.backoff
        for attempt in range(self.max_retries + 1):
            self._pace()
            req = urllib.request.Request(url, headers={
                "User-Agent": UA, "Accept": "application/json",
                "Referer": PROXY + "/", "Origin": PROXY,
                "Accept-Language": "en-US,en;q=0.9"})
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    self.stats["ok"] += 1
                    return json.loads(r.read())
            except urllib.error.HTTPError as e:
                body = e.read()
                kind = self.classify(e.code, body)
                self.stats["blocked"] += 1
                if kind in ("waf_deny", "rate_limit"):
                    # header-hygiene mitigation then exponential backoff with jitter
                    self.stats["mitigated"] += 1
                    self.min_interval = min(self.min_interval * 1.35, 2.5)
                    time.sleep(delay + np.random.default_rng().uniform(0, 0.6))
                    delay *= self.backoff
                    continue
                if kind == "cognito_deny":
                    return {"_blocked": "cognito", "path": path}
                if attempt == self.max_retries:
                    return {"_blocked": kind, "path": path}
            except Exception:
                time.sleep(delay)
                delay *= self.backoff
        return {"_blocked": "exhausted", "path": path}


# ---------------------------------------------------------------- pipeline
def _need_tracking(df):
    missing = [c for c in TRACKING_COLS if c not in df.columns]
    return bool(missing)


def enrich_from_api(df, transport=None, max_plays=40):
    """Path B: pull per-play completion probability for pass plays missing separation."""
    t = transport or Transport()
    have = set()
    out = {}
    for _, r in df.iterrows():
        if len(have) >= max_plays:
            break
        gid = r.get("game_id")
        if pd.isna(gid) or gid in have:
            continue
        js = t.get("/api/leaders/expectation/completion/week",
                   {"season": int(str(gid)[:4]), "week": int(r.get("week") or 1)})
        have.add(gid)
        if "_blocked" in js:
            continue
        for item in js.get("completionLeaders", []):
            p, L = item.get("play", {}), item.get("leader", {})
            out[(p.get("gameId"), p.get("playId"))] = L.get("completionProbability")
    if out:
        key = list(zip(df.get("game_id"), df.get("play_id")))
        df["api_cp"] = [out.get(k) for k in key]
    return df


def build_context_metrics(df, use_api=True, transport=None):
    """Return the frame with the formerly paywalled columns appended."""
    df = df.copy()
    if "air_yards" not in df:
        df["air_yards"] = np.nan
    if use_api and _need_tracking(df):
        df = enrich_from_api(df, transport)

    cp, de, dens, resp, epa_r, xp = [], [], [], [], [], []
    for _, r in df.iterrows():
        air = float(r.get("air_yards") if not pd.isna(r.get("air_yards")) else 10.0)
        yl100 = float(r.get("yardline_100") if not pd.isna(r.get("yardline_100")) else 50.0)
        abs_yl = 120.0 - yl100
        ytg = float(r["ydstogo"]) if "ydstogo" in r and not pd.isna(r["ydstogo"]) else 10.0
        down = int(r["down"]) if "down" in r and not pd.isna(r["down"]) else 1
        sep = r.get("separation")
        cus = r.get("cushion")
        clo = r.get("closing_speed")
        sep = None if sep is None or pd.isna(sep) else float(sep)
        cus = None if cus is None or pd.isna(cus) else float(cus)
        clo = None if clo is None or pd.isna(clo) else float(clo)

        p = E.completion_probability(air, ytg, down, abs_yl, sep, cus, clo)
        if "api_cp" in r and not pd.isna(r.get("api_cp")):
            p = 0.5 * p + 0.5 * float(r["api_cp"])
        cp.append(p)

        d = E.separation_at_release(air, cus if cus is not None else 2.4,
                                    clo if clo is not None else 3.0)
        g = E.ghost_density(abs_yl + (1 if air >= 0 else -1) * air / 2.0, E.FIELD_WIDTH / 2,
                            abs_yl)
        dens.append(g)
        de.append(E.decision_efficiency(p, min(p * 1.28, 0.95)))
        resp.append(E.coverage_responsibility(
            E.hmm_coverage_decode(d, 0.0, int(d < E.HMM["follow_threshold"]), 0.6), d))
        epa_r.append(E.epa_residual(
            float(r.get("qb_epa") if not pd.isna(r.get("qb_epa")) else 0.0), down, ytg,
            float(r.get("score_differential") or 0.0),
            float(r.get("game_seconds_remaining") or 1800)))
        xp.append(E.pass_over_expected(1, down, ytg,
                                       float(r.get("score_differential") or 0.0),
                                       float(r.get("game_seconds_remaining") or 1800)))

    df["expected_cp"] = cp
    df["cpoe_points"] = 100.0 * (
        (df.get("complete_pass", pd.Series(0, index=df.index)).fillna(0) - df["expected_cp"]))
    df["decision_efficiency"] = de
    df["ghost_density"] = dens
    df["coverage_responsibility"] = resp
    df["epa_context_residual"] = epa_r
    df["pass_over_expected"] = xp
    df["context_adjusted_epa"] = df.get("epa", pd.Series(0.0, index=df.index)).fillna(0) + df[
        "epa_context_residual"]
    return df


def self_test(path="artifacts/cp/cp_pairs.json", limit=120):
    """Run the pipeline on the captured real play rows and report column completeness."""
    rows = json.load(open(path))[:limit]
    df = pd.DataFrame([{ "game_id": r["gameId"], "play_id": r["playId"], "week": r["week"],
                         "down": r["down"], "ydstogo": r["yardsToGo"],
                         "air_yards": r["airYards"], "yardline_100": 100 - r["yardlineNumber"],
                         "complete_pass": 1} for r in rows])
    out = build_context_metrics(df, use_api=False)
    cols = ["expected_cp", "cpoe_points", "decision_efficiency", "ghost_density",
            "coverage_responsibility", "epa_context_residual", "pass_over_expected"]
    return {c: int(out[c].notna().sum()) for c in cols} | {"rows": len(out)}


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    print(json.dumps(self_test(), indent=1))
