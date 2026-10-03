#!/usr/bin/env python3
"""
L-12: GROUPING LOSS GO/NO-GO GATE.

Recon + compute for the grouping-loss lower bound on recoverable model
resolution, per the C-21 spec (Perez-Lebel / Le Morvan / Varoquaux 2023,
arXiv:2210.16315).

SCOPE
  - No DB writes. No network.
  - Pure Python + numpy (k-means implemented directly; no sklearn dependency).
  - Reads ONLY the local L-7 / L-9 artifacts under:
    docs/calibration-proposals/2026-08-19-clv-forensics/
    docs/ops/calibration/2026-08-19-l9-clv-slices/

WHY THIS IS A GATE
  ECE is ~0.0044 (calibrated) but resolution ~0. The question:
    - is RES ~0 because the market is efficient against the features we have
      (=> stop, go find new data), OR
    - is it because the pipeline collapses real signal into one flat number
      (=> build the model)?

  Grouping loss = E_S[Var(P(Y=1|X) | score=s)]. It is the *spread of true
  posteriors* among observations sharing a score. It is a LOWER BOUND on
  resolution (negatively biased) and is estimated by clustering on FEATURES
  WITHIN each score bin. The bin's own outcome variance (Bernoulli ~p(1-p))
  is NOT used -- that is the C-21 trap the adversary's v2 formula fell into
  and was corrected in round 3.

  Decision rule is a PERMUTATION NULL, not a fixed threshold: within each
  score bin, permute outcomes among that bin's observations (destroys
  grouping structure, preserves the bin's outcome rate), recompute GL, repeat
  N_PERM times. p = fraction of permuted GL >= observed GL.

REQUIRES (per pick, for the SAME graded population):
  1. a model probability / score per pick  (call it `p_hat`)
  2. a binary outcome per pick               (y in {0,1})
  3. FEATURES per pick to cluster on, e.g. sport, market, team, park,
     starting pitcher, weather, line value, book, day/time, confidence inputs.
     Features are LOGIT-TRANSFORMED then standardized before k-means.

EXIT BEHAVIOUR
  If any of the three inputs above is unavailable at pick level, the script:
    - still runs every derivable diagnostic,
    - writes results.l12.json with BLOCKED flags + the exact missing fields,
    - exits non-zero with a clear message,
    - and NEVER invents a number.
  That negative result is a legitimate, high-value gate outcome.
"""
import argparse, json, os, sys, math, itertools, random
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = os.path.join(BASE, "docs", "ops", "edge")  # artifacts sit under docs/
# allow override from repo root
ROOT = os.environ.get("SPORTS_REPO_ROOT") or os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
REPO_ROOT = os.environ.get("SPORTS_REPO_ROOT", ROOT)

# Default: the real Sports repo working tree. The L-7 forensics artifacts (incl.
# the CLV census CSV) live ONLY on the remote branch `origin/hermes/l7-clv-forensics`
# and are NOT landed on the orchestrator branch this gate branches from, so they
# are absent from the working tree. Point SPORTS_REPO_ROOT at a scratch checkout
# of that remote branch to run the full recon against the actual artifacts.
L7_DIR = os.path.join(REPO_ROOT, "docs", "calibration-proposals", "2026-08-19-clv-forensics")
L9_DIR = os.path.join(REPO_ROOT, "docs", "ops", "calibration", "2026-08-19-l9-clv-slices")
# L-7 raw artifacts live on origin/hermes/l7-clv-forensics; locally present only if L-8 landed.
L7_CENSUS = os.path.join(REPO_ROOT, "docs", "ops", "calibration", "2026-08-18-clv-census.csv")

# --------------------------------------------------------------------------- #
# Artifact loaders
# --------------------------------------------------------------------------- #

def _load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_l7_artifacts():
    """Return dict of artifact-name -> parsed object (or None if absent)."""
    return {
        "raw.json": _load_json(os.path.join(L7_DIR, "raw.json")),
        "ml-and-books.json": _load_json(os.path.join(L7_DIR, "ml-and-books.json")),
        "per-book.json": _load_json(os.path.join(L7_DIR, "per-book.json")),
        "README.md": None,
    }

def load_l9_artifacts():
    return {
        "clv-slices.json": _load_json(os.path.join(L9_DIR, "L9_DIR_PLACEHOLDER")),
    }

def load_census():
    """Load the CLV census CSV if present; return list[dict] or None."""
    if not os.path.exists(L7_CENSUS):
        return None
    import csv as _csv
    with open(L7_CENSUS, newline="", encoding="utf-8", errors="replace") as f:
        return list(_csv.DictReader(f))

# --------------------------------------------------------------------------- #
# Field reconnaissance: does each artifact contain {score, outcome, features}?
# --------------------------------------------------------------------------- #
SCORE_NEEDS = ["prob", "p_hat", "phat", "score", "calibrated", "model_prob", "true_prob"]
OUTCOME_NEEDS = ["outcome", "won", "result", "y_", "settled", "verdict"]
FEATURE_NEEDS = ["sport", "market", "team", "park", "pitcher", "weather", "line",
                 "price", "book", "start_time", "commence", "confidence", "edge",
                 "consensus", "rest", "schedule", "ats", "h2h", "venue", "line_move"]

def _matches(needle, hay):
    h = hay.lower()
    return any(n in h for n in needle)

def audit_list_of_dicts(rows, label):
    """For a list-of-dicts pick-level structure, report score/outcome/feature coverage."""
    out = {"source": label, "n_rows": 0, "union_keys": [],
           "has_score": False, "has_outcome": False, "has_features": {}}
    if not rows:
        return out
    out["n_rows"] = len(rows)
    keys = set()
    for r in rows:
        if isinstance(r, dict):
            keys |= set(r.keys())
    out["union_keys"] = sorted(keys)
    for k in keys:
        if _matches(SCORE_NEEDS, k):
            out["has_score"] = True
        if _matches(OUTCOME_NEEDS, k):
            out["has_outcome"] = True
        for feat in ("sport", "market", "team", "park", "weather", "line", "book"):
            if feat in k:
                out["has_features"].setdefault(feat, []).append(k)
    return out

# --------------------------------------------------------------------------- #
# Candidate score/outcome/feature fields per artifact
# --------------------------------------------------------------------------- #
SCORE_FIELD_CANDIDATES = {
    "confidence_pct",                 # heuristic 0-100, NOT a probability
    "modelProb", "model_prob",        # receipt field, "null until one genuinely exists"
    "market_fair_prob",               # de-vigged market fair prob (market, not model)
    "clv_value",                      # signed points, not a probability
    "edgeScore",                      # 0-100 net edge score, not a probability
}
OUTCOME_FIELD_CANDIDATES = {
    "result",                         # WIN/LOSS/PENDING  -- binary enough (WIN=1,LOSS=0)
    "clv_verdict",                    # BEAT_CLOSE/MATCHED/LOST  -- outcome proxy but bin-derived
    "settlementResult",               # WIN/LOSS/PUSH
}
FEATURE_FIELD_CANDIDATES = {
    "sport", "pick_type", "selection", "published_line", "tier", "model_version",
    "clv_lock_line", "clv_lock_price", "clv_close_line", "clv_close_price",
    "receipt_entry_odds", "receipt_line",
    "restDaysHome", "restDaysAway", "scheduleDensityHome", "scheduleDensityAway",
    "lineMovementSpread", "lineMovementTotal", "bookDisagreementAtLock",
    "dataQualityScore", "currentEdgeIndex", "consensusPct", "bookmakerCount",
}

def pick_level_rows():
    """
    Gather every pick-level row we can reach from LOCAL artifacts, and tag
    which artifacts carry a usable score / outcome / feature.
    Returns (rows, provenance, audit).
    """
    rows = []
    provenance = []
    audit = []

    # 1) L-7 forensic artifacts (spot_check, matched_audit, extreme, all_ml)
    l7 = load_l7_artifacts()
    if l7["raw.json"]:
        raw = l7["raw.json"]
        for key in ["spot_check", "matched_audit"]:
            lst = raw.get(key, []) or []
            a = audit_list_of_dicts(lst, f"raw.json::{key}")
            a["score_candidate"] = None
            a["outcome_candidate"] = None
            a["feature_candidates"] = []
            for r in lst:
                out = {k: v for k, v in r.items()}
                out["__source"] = f"raw.json::{key}"
                rows.append(out)
                provenance.append(f"raw.json::{key}#{r.get('pick_id','?')}")
                break  # audit only needs shape, not every row repeated
            audit.append(a)
        print(f"[L-7 raw.json] spot_check={len(raw.get('spot_check',[]) or [])} "
              f"matched_audit={len(raw.get('matched_audit',[]) or [])} "
              f"by_month={len(raw.get('by_month',[]) or [])}")

    if l7["ml-and-books.json"]:
        mlb = l7["ml-and-books.json"]
        for key in ["extreme_lock_rows", "all_ml_lock_close"]:
            lst = mlb.get(key, []) or []
            a = audit_list_of_dicts(lst, f"ml-and-books.json::{key}")
            a["score_candidate"] = None
            a["outcome_candidate"] = None
            a["feature_candidates"] = []
            audit.append(a)
            print(f"[L-7 ml-and-books.json] {key}={len(lst)}")

    # 2) CLV census CSV (if landed)
    cens = load_census()
    if cens:
        a = audit_list_of_dicts(cens, L7_CENSUS.replace(REPO_ROOT+"/", ""))
        a["score_candidate"] = None
        a["outcome_candidate"] = None
        a["feature_candidates"] = []
        audit.append(a)
        print(f"[census] n={len(cens)}")
        # census fields of interest
        present = set(cens[0].keys())
        print(f"  census has confidence_pct={('confidence_pct' in present)} "
              f"modelProb-like={present & {'modelProb','model_prob'}} "
              f"result={('result' in present)} "
              f"market_fair_prob={('market_fair_prob' in present)}")
        rows.append(cens[0])
        provenance.append("census#0")
    else:
        audit.append({"source": "census.csv", "n_rows": 0, "union_keys": [],
                      "has_score": False, "has_outcome": False, "has_features": {},
                      "note": "CENSUS FILE NOT PRESENT in working tree"})

    return rows, provenance, audit

# --------------------------------------------------------------------------- #
# Grouping-loss estimator (full spec; used only if inputs ever appear)
# --------------------------------------------------------------------------- #
def _logit(p, eps=1e-4):
    p = min(max(float(p), eps), 1 - eps)
    return math.log(p / (1 - p))

def kmeans(X, k, iters=50, seed=0):
    """Minimal k-means over rows of standardized feature matrix X (list of lists)."""
    rng = random.Random(seed)
    n, d = len(X), len(X[0])
    if n <= k:
        # every point its own cluster, remainder empty
        clusters = [[i] for i in range(n)] + [[] for _ in range(k - n)]
        return clusters
    centers = [X[rng.randrange(n)] for _ in range(k)]
    for _ in range(iters):
        assign = [[] for _ in range(k)]
        for i, xi in enumerate(X):
            best, bd = 0, None
            for c, cc in enumerate(centers):
                if not cc:
                    continue
                dd = sum((a - b) ** 2 for a, b in zip(xi, cc))
                if bd is None or dd < bd:
                    best, bd = c, dd
            assign[best].append(i)
        newc = []
        for c in range(k):
            if assign[c]:
                mu = [sum(X[i][j] for i in assign[c]) / len(assign[c]) for j in range(d)]
                newc.append(mu)
            else:
                newc.append(centers[c])
        centers = newc
    return assign

def grouping_loss(picks, score_key, outcome_key, feature_keys, n_bins=10, k=5, seed=0):
    """
    picks: list[dict] each with score (float, the model probability), outcome
           (1/0), and feature values.
    Returns GL (lower bound) over the permutation null p-value, or
    {"blocked": reason} when structurally impossible.
    """
    scored = []
    for r in picks:
        try:
            s = float(r[score_key])
            y = int(r[outcome_key])
            feats = [float(r.get(fk, 0.0) if r.get(fk) is not None else 0.0)
                     for fk in feature_keys]
        except (KeyError, TypeError, ValueError):
            continue
        if not (0.0 < s < 1.0) and not (0 <= s <= 1):
            continue
        scored.append((s, y, feats))

    if not scored:
        return {"blocked": "no rows carry both a usable score and an outcome"}

    scored.sort(key=lambda t: t[0])
    n = len(scored)
    # equal-count bins
    bins = [[] for _ in range(n_bins)]
    for i, t in enumerate(scored):
        bins[i % n_bins].append(t)

    def compute_gl(rows):
        gl = 0.0
        for b in rows:
            if len(b) <= 1:
                continue
            nb = len(b)
            ybar_b = sum(t[1] for t in b) / nb
            # standardize logit-transformed features
            logits = []
            for t in b:
                logits.append([_logit(f) if 0 < f < 1 else float(f) for f in t[2]] or [0.0])
            # guard: features must be numeric & non-empty
            dim = len(b[0][2])
            if dim == 0:
                return {"blocked": "clusters cannot form: no feature vector"}
            mu = [0.0] * dim
            sd = [1.0] * dim
            vals = list(zip(*[t[2] for t in b]))
            mu = [sum(v) / len(v) for v in vals]
            sd = [math.sqrt(sum((x - m) ** 2 for x in v) / len(v)) or 1.0
                  for v, m in zip(vals, mu)]
            Xs = [[(b[i][2][j] - mu[j]) / sd[j] for j in range(dim)] for i in range(nb)]
            assign = kmeans(Xs, k, seed=seed)
            gl_b = 0.0
            for c in assign:
                nc = len(c)
                if nc <= 1:
                    continue  # singleton undefined correction -> drop
                ybar_c = sum(scored[idx][1] for idx in c) / nc
                gl_b += nc * (ybar_c - ybar_b) ** 2
                gl_b -= (nc / (nc - 1)) * ybar_c * (1 - ybar_c)
            gl += (nb / n) * (gl_b / nb)
        return gl

    observed = compute_gl(bins)
    if isinstance(observed, dict) and observed.get("blocked"):
        return observed

    # permutation null
    rng = random.Random(seed)
    perm = []
    for _ in range(1000):
        # permute within bin
        new_bins = []
        for b in bins:
            ys = [t[1] for t in b]
            rng.shuffle(ys)
            nb = len(b)
            ybar_b = sum(ys) / nb
            # recluster on the SAME features (unchanged), outcomes shuffled
            gl_b = 0.0
            dim = len(b[0][2]) if b else 0
            if dim == 0:
                continue
            vals = list(zip(*[t[2] for t in b]))
            mu = [sum(v) / len(v) for v in vals]
            sd = [math.sqrt(sum((x - m) ** 2 for x in v) / len(v)) or 1.0
                  for v, m in zip(vals, mu)]
            Xs = [[(b[i][2][j] - mu[j]) / sd[j] for j in range(dim)] for i in range(nb)]
            assign = kmeans(Xs, k, seed=seed + _)
            for c in assign:
                nc = len(c)
                if nc <= 1:
                    continue
                ybar_c = sum(ys[idx] for idx in c) / nc
                gl_b += nc * (ybar_c - ybar_b) ** 2
                gl_b -= (nc / (nc - 1)) * ybar_c * (1 - ybar_c)
            gl += (nb / n) * (gl_b / nb)
        perm.append(gl)

    p = sum(1 for g in perm if g >= observed) / len(perm)
    return {"observed": observed, "perm_mean": sum(perm) / len(perm),
            "perm_sd": (sum((g - sum(perm)/len(perm))**2 for g in perm)/(len(perm)-1))**0.5,
            "perm_p": p,
            "perm_p95": sorted(perm)[int(0.95 * len(perm))]}


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description="L-12 grouping-loss recon/compute")
    ap.add_argument("--score-key", default=None)
    ap.add_argument("--outcome-key", default=None)
    ap.add_argument("--feature-keys", nargs="*", default=None)
    ap.add_argument("--bins", type=int, nargs="*", default=[5, 10, 20])
    ap.add_argument("--ks", type=int, nargs="*", default=[3, 5, 8])
    ap.add_argument("--perm", type=int, default=1000)
    args = ap.parse_args()

    print("=" * 72)
    print("L-12: GROUPING-LOSS GO/NO-GO GATE")
    print("=" * 72)
    print(f"repo_root = {REPO_ROOT}")
    print(f"L7_DIR  = {L7_DIR}  (present={os.path.isdir(L7_DIR)})")
    print(f"L9_DIR  = {L9_DIR}  (present={os.path.isdir(L9_DIR)})")
    print(f"census  = {L7_CENSUS}  (present={os.path.isfile(L7_CENSUS)})")

    # ---- STEP 1: recon ----
    print("\n--- STEP 1: DATA RECON ---")
    rows, prov, audit = pick_level_rows()

    # Decide whether a calibrated probability, a binary outcome, and clustering
    # features are all available at pick level on the SAME population.
    recon = {
        "graded_n_expected": 909,
        "artifacts_examined": [],
        "score_available": False,
        "outcome_available": False,
        "features_available": False,
        "can_compute": False,
        "missing": [],
        "notes": [],
    }

    # score diagnosis
    census = load_census()
    if census:
        present = set(census[0].keys())
        # modelProb is schema-documented as "null until one genuinely exists"
        # confidence is 0-100 heuristic, NOT a probability
        cand_probs = present & {"modelProb", "model_prob"}
        if cand_probs:
            vals = [r.get(k) for r in census for k in cand_probs]
            real_vals = [v for v in vals if v is not None and v != "null" and v != ""]
            recon["notes"].append(
                f"census has modelProb-like field(s) {cand_probs} but "
                f"{len(real_vals)}/{len(census)} carry a non-null probability "
                f"(expected 909 for graded picks).")
            # even if populated, verify they are in (0,1)
            numeric = []
            for v in real_vals:
                try:
                    numeric.append(float(v))
                except (TypeError, ValueError):
                    pass
            in_range = [v for v in numeric if 0.0 < v < 1.0]
            if len(in_range) == len(real_vals) and len(in_range) > 0:
                recon["score_available"] = True
                recon["score_field"] = sorted(cand_probs)[0]
                recon["score_n"] = len(in_range)
        else:
            recon["score_available"] = False
            recon["notes"].append(
                "census has NO model probability field. `confidence_pct` is a "
                "0-100 heuristic composite, NOT a calibrated probability and "
                "cannot stand in for p_hat. `market_fair_prob` is the market's "
                "de-vigged probability, NOT the model's, and is populated on "
                "only ~561/1161 rows anyway.")
    else:
        recon["notes"].append("CLV census CSV not present locally — no pick-level table at all.")

    # outcome diagnosis
    if census and "result" in census[0]:
        recon["outcome_available"] = True
        recon["outcome_field"] = "result"
    else:
        recon["notes"].append("No pick-level binary outcome (WIN/LOSS) at n=909.")

    # features diagnosis
    feats_seen = set()
    for r in rows:
        for k in r.keys():
            kl = k.lower()
            if any(tag in kl for tag in ("sport", "pick_type", "line", "price", "book",
                                          "rest", "schedule", "consensus", "edge",
                                          "movement", "fair", "model_version")):
                feats_seen.add(k)
    # census-level
    if census:
        for k in census[0].keys():
            kl = k.lower()
            if any(tag in kl for tag in ("sport", "pick_type", "line", "price", "book",
                                         "rest", "schedule", "consensus", "edge",
                                         "movement", "fair", "model_version")):
                feats_seen.add(k)
    if feats_seen:
        recon["features_available"] = True  # at least SOME feature fields exist
        recon["feature_fields"] = sorted(feats_seen)
    else:
        recon["notes"].append("No per-pick feature fields identified that could define "
                              "clustering structure (sport, market, team, park, etc.).")

    recon["score_available"] = bool(recon["score_available"])
    recon["outcome_available"] = bool(recon["outcome_available"])
    recon["features_available"] = bool(recon["features_available"]) and len(feats_seen) > 0

    if not (recon["score_available"] and recon["outcome_available"]
            and recon["features_available"]):
        recon["can_compute"] = False
        recon["missing"] = []
        if not recon["score_available"]:
            recon["missing"].append("model probability p_hat per pick (in (0,1))")
        if not recon["outcome_available"]:
            recon["missing"].append("binary outcome y in {0,1} per pick (WIN/LOSS)")
        if not recon["features_available"]:
            recon["missing"].append("per-pick clustering features "
                                    "(sport/market/team/park/pitcher/weather/line/book/etc.)")

    recon["graded_picks_with_score"] = None
    recon["graded_picks_with_outcome"] = None
    recon["graded_picks_with_features"] = None

    print(json.dumps(recon, indent=2, default=str))

    # ---- STEP 2-4: compute (only if fully possible) ----
    result = {}
    if recon["can_compute"] and args.score_key and args.outcome_key and args.feature_keys:
        scored = [r for r in rows
                  if r.get(args.score_key) is not None
                  and r.get(args.outcome_key) is not None
                  and all(r.get(fk) is not None for fk in args.feature_keys)]
        recon["graded_picks_with_score"] = len(scored)
        if len(scored) < 50:
            result["blocked"] = f"only {len(scored)} graded picks carry score+outcome+features; n<50 unusable"
        else:
            grid = {}
            for nb, k_ in itertools.product(args.bins, args.ks):
                g = grouping_loss(scored, args.score_key, args.outcome_key, args.feature_keys,
                                  n_bins=nb, k=k_, seed=0)
                grid[f"bins={nb},k={k_}"] = g
            result = grid
    else:
        result = {"blocked": "RECON BLOCKED grouping loss — " +
                            "; ".join("missing: " + m for m in recon["missing"]) if recon["missing"]
                        else "inputs not supplied (pass --score-key --outcome-key --feature-keys)"}

    out = {
        "step": "L-12 grouping-loss gate",
        "recon": recon,
        "computation": result if recon["can_compute"] else result,
        "verdict": ("BLOCKED — grouping loss is NOT computable from local artifacts"
                    if not recon["can_compute"] else
                    ("COMPUTABLE — see grid" if result else "BLOCKED")),
        "interpretation": None,
    }
    if recon["can_compute"] and not (isinstance(result, dict) and result.get("blocked")):
        # pick the (10,5) row for headline + p-value
        headline = result.get("bins=10,k=5") or next(iter(result.values()))
        if isinstance(headline, dict) and "perm_p" in headline:
            p = headline["perm_p"]
            out["interpretation"] = (
                "GL below the permutation 95th percentile (p>0.05) -> no detectable "
                "grouping structure; RES~0 likely market-efficiency vs the features we have -> STOP, go find new data."
                if p > 0.05 else
                "GL above the permutation 95th percentile (p<=0.05) -> real recoverable "
                "resolution exists -> BUILD the model.")
            out["p_value"] = p

    os.makedirs(os.path.join(REPO_ROOT, "docs", "ops", "edge"), exist_ok=True)
    out_path = os.path.join(REPO_ROOT, "docs", "ops", "edge", "grouping-loss.l12.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, default=str)
    print("\n--- RESULT ---")
    print(json.dumps(out, indent=2, default=str))
    print(f"\nwritten: {out_path}")
    if not recon["can_compute"]:
        print("\nEXIT BLOCKED: cannot compute grouping loss from local artifacts.",
              file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
