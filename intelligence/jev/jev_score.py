#!/usr/bin/env python3
"""JEV mill - dedupe + score candidates against GSE buckets; print curation table."""
import json, os, re, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

# GSE relevance scoring: bucket signals from title+abstract
RULES = [
 ("KILL-COUSIN", r"wasserstein|intrinsic dimension|detrended fluctuation|dfa exponent|hawkes|tempo|permutation entropy"),
 ("KEEP-conformal-core", r"jackknife\+?|split conformal|full conformal|Mondrian|conformalized quantile|CV\+|cross-conformal|Venn[- ]Abers|inductive conformal"),
 ("KEEP-conformal-adaptive", r"adaptive conformal|online conformal|conformal.*time series|time.series.*conformal|DtACI|non-exchangeable|covariate shift"),
 ("KEEP-calibration", r"Brier|calibration curve|recalibrat|confidence calibration|probability calibration"),
 ("KEEP-betting", r"betting|bookmaker|odds|bet\b|bets|wager|parlay|kelly|closing line|closing odds|market efficiency"),
 ("KEEP-sport-model", r"football|soccer|NFL|NBA|baseball|sport|goals|Elo|match outcome|game outcome|Skellam|Dixon-Coles|Poisson"),
 ("KEEP-quantile", r"quantile regression|qgam|additive quantile|pinball loss"),
 ("KEEP-aggregation", r"expert advice|exponential weights|Hedge|online aggregation|prediction market"),
]
KILL_FAMILY = re.compile(r"wasserstein|intrinsic dimension|detrended fluctuation|hawkes|permutation entropy|dfa\b", re.I)

def main():
    pool = {}
    for p in glob.glob(os.path.join(DATA, "jev_raw_*.json")):
        d = json.load(open(p, encoding="utf-8"))
        for k, v in d.items():
            if k in ("ids_requested", "ids_missing"): continue
            for e in v.get("entries", []):
                aid = e["arxiv_id"].split("v")[0]
                if aid not in pool:
                    e2 = dict(e); e2["arxiv_id"] = aid; e2["found_via"] = k
                    pool[aid] = e2
    scored = []
    for aid, e in pool.items():
        text = (e["title"] + " " + e["abstract"]).lower()
        hits = [name for name, pat in RULES if re.search(pat, text)]
        killfam = bool(KILL_FAMILY.search(e["title"]))
        scored.append((len(hits), hits, killfam, aid, e))
    scored.sort(key=lambda x: (-x[0], x[3]))
    print(f"pool: {len(pool)} unique entries\n")
    cur = None
    for n, hits, killfam, aid, e in sorted(scored, key=lambda x: (x[1][0] if x[1] else "zz", -x[0])):
        grp = hits[0] if hits else "unmatched"
        if grp != cur:
            cur = grp
            print(f"\n######## {grp} ########")
        tags = ",".join(h.split("-",1)[-1] for h in hits)
        print(f"[{n}]{('*' if killfam else ' ')} {aid} {e['year']} | {e['title'][:95]}")
    # dump full pool for later steps
    json.dump({aid: e for aid, e in pool.items()}, open(os.path.join(DATA, "jev_pool.json"), "w", encoding="utf-8"), indent=1)
    print(f"\npool saved: {len(pool)}")

if __name__ == "__main__":
    main()
