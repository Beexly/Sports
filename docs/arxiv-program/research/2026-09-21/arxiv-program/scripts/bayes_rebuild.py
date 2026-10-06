#!/usr/bin/env python3
"""Rebuild final candidate set: correct base IDs, apply exclusions, rescore."""
import json, re
from pathlib import Path

BASE = Path.home() / "workspace" / "arxiv-sweep"
RAW = BASE / "phase2-candidates-bayes-raw-backup.jsonl"
OUT = BASE / "phase2-candidates-bayes.jsonl"

excluded = set()
for x in open(BASE / "phase2-excluded-ids.txt"):
    x = x.strip()
    if x:
        excluded.add(re.sub(r"v\d+$", "", x))

def bid(rid):
    return re.sub(r"v\d+$", "", rid)

# 1. clean pool
pool, seen = [], set()
n_excl = 0
for line in RAW.read_text().splitlines():
    r = json.loads(line)
    b = bid(r["id"])
    if b in seen:
        continue
    seen.add(b)
    if b in excluded:
        n_excl += 1
        continue
    pool.append(r)
print(f"clean pool: {len(pool)} (excluded-hits removed: {n_excl})")

SPORT_TITLE = re.compile(r"\b(football|soccer|basketball|baseball|tennis|hockey|cricket|rugby|golf|nfl|nba|mlb|nhl|epl|premier league|la liga|bundesliga|serie a|fifa|uefa|athlete|athletics|sports?|fantasy|dfs|draftkings|fanduel|betting|odds|bookmaker|sportsbook|wager|gambl|win probability|elo\b|trueskill|glicko|xg\b|expected goals?|expected threat|pitch control|lineup|prop bets?|waiver|match outcome|goal scoring|point spread|moneyline|touchdown|quarterback|pitcher|batting|tournament|olympic|marathon|nascar|formula 1|mma|boxing)\b", re.I)
SPORT_ABS = re.compile(r"\b(football|soccer|basketball|baseball|tennis|hockey|cricket|rugby|golf|\bNFL\b|\bNBA\b|\bMLB\b|\bNHL\b|premier league|fifa|athlete|player tracking|tracking data|team strength|team ratings?|fantasy sports?|\bDFS\b|draftkings|fanduel|sports betting|bookmaker|odds|win probability|bradley.?terry|elo rating|trueskill|expected goals|expected threat|pitch control|spatial control|lineup optimization|prop\b|waiver wire|match result|goal prediction|point spread|moneyline|quarterback|pitcher|sports analytics|sports data|match outcome|head.?to.?head)\b", re.I)
METHOD = re.compile(r"\b(bayesian|hierarchical|kalman|particle filter|gaussian process|state.?space|dynamic linear|shrinkage|regime.?switch|hidden markov|variational|mcmc|posterior|uncertainty quantification|calibrat|conformal|poisson|hawkes|point process|copula|trajectory|markov chain|ensemble|gradient boost|xgboost|neural network|deep learning|random forest|lasso|ridge regression|empirical bayes|stein|james.?stein|multi.?level|mixed.?effects?|time.?varying|stochastic volatility|extreme value|survival analysis|competing risks|causal|difference.?in.?differences|synthetic control|uplift|thompson sampling|bandit|reinforcement learning|graph neural|transformer|attention|lstm|gru\b|diffusion model|normalizing flow|optimal transport|stackelberg|nash|game.?theor|contest theory|kelly|sharpe|portfolio|risk management|abstention|selective prediction|conformalized)\b", re.I)
JUNK = re.compile(r"\b(robot|robotics|uav|drone|autonomous vehicle|self.?driving|epidemic|pandemic|covid|power grid|smart grid|supply chain|manufacturing|semiconductor|quantum computing|qubit|blockchain|cryptocurrency|bitcoin|protein|genomic|dna|rna|cancer|tumor|medical imaging|mri\b|ct scan|climate|weather forecast|hurricane|seismic|earthquake|astronom|galaxy|black hole|particle physics|nuclear|radar|sonar|wireless sensor|iot\b|5g\b|antenna|satellite orbit|crop|agriculture|irrigation)\b", re.I)
WITHDRAWN = re.compile(r"withdrawn", re.I)
PURE_THEORY = re.compile(r"\bwe prove\b|\btheorem\b.*\bproof\b", re.I)

def eng(t):
    return sum(1 for ch in t if ord(ch) > 0x2FF) < len(t) * 0.02

scored = []
for r in pool:
    t, a = r["title"], r["abstract"]
    if WITHDRAWN.search(t) or WITHDRAWN.search(a[:200]) or not eng(t + " " + a):
        continue
    st = len(set(SPORT_TITLE.findall(t)))
    sa = len(set(SPORT_ABS.findall(a)))
    m = len(set(METHOD.findall(t + " " + a)))
    jk = len(set(JUNK.findall(t + " " + a)))
    theory = bool(PURE_THEORY.search(a)) and not re.search(
        r"\b(experiment|empirical|dataset|simulation|evaluat|case study|application)\b", a, re.I)
    score = 4 * st + 2 * sa + 1.0 * min(m, 6) - 1.5 * jk - (3 if theory else 0)
    if st + sa >= 1 and score >= 2.0 and jk <= 4:
        scored.append((score, r))

scored.sort(key=lambda x: (-x[0], x[1]["id"]))
print(f"scored keepers: {len(scored)}; top-170 cutoff: {scored[169][0]:.1f}")

final = [r for _, r in scored[:170]]
# rescue regime-switching basketball paper if it survived
rescue = [r for _, r in scored if r["id"] == "1912.10417v1"]
if rescue and rescue[0] not in final:
    final.append(rescue[0])
    print("rescued 1912.10417v1")
elif not rescue:
    print("NOTE: rescue paper 1912.10417v1 did not survive filters — check why")

with open(OUT, "w") as f:
    for r in final:
        f.write(json.dumps(r) + "\n")

# verify
bids = [bid(r["id"]) for r in final]
assert len(bids) == len(set(bids)), "dupes!"
assert not any(b in excluded for b in bids), "exclusion leak!"
print(f"FINAL: {len(final)} candidates, 0 dupes, 0 excluded leaks")
from collections import Counter
print(Counter(r["query"] for r in final))
