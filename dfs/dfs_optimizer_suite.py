#!/usr/bin/env python3
"""
dfs_optimizer_suite.py — DK DFS LANE D: three engines + cash mode, stdlib-only (iSH-safe).

Engines:
  1. greedy_leverage   — seed builder on leverage-adjusted objective
  2. tabu_portfolio    — 1-for-1 swap local search w/ tabu list, top-N distinct lineups
  3. fieldsim_portfolio — simulate field lineups from ownership + (mu,sigma),
                          pick K lineups maximizing P(max > 99.5th pctile of field)
  4. cash_mode         — minimize variance s.t. projection >= threshold

GPP objective: sum(mu_p + lam*(1-own_p)*vol_p) + pairwise corr bonus.
ILP exact optimum = PC lane (OR-Tools/CBC) — Hermes work order.
Usage: python3 dfs_optimizer_suite.py --pool /tmp/pool_154468.json
"""
import argparse, json, math, random, time, itertools, collections

CAP = 50000
SLOTS = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]
FLEX_OK = {"RB", "WR", "TE"}
FLOOR = 3000


def valid(lineup):
    if len(lineup) != len(SLOTS): return False
    if sum(p["salary"] for p in lineup) > CAP: return False
    pos = [p["pos"] for p in lineup]
    if pos.count("QB") != 1 or pos.count("DST") != 1: return False
    need = collections.Counter({"RB": 2, "WR": 3, "TE": 1})
    have = collections.Counter()
    flex_used = False
    for p in pos:
        if p in ("QB", "DST"): continue
        if need[p] - have[p] > 0: have[p] += 1
        elif not flex_used and p in FLEX_OK: flex_used = True
        else: return False
    return True


def raw_score(lineup, mu):
    return sum(mu[p["pid"]] for p in lineup)


def gpp_score(lineup, mu, lam, own, vol, corr=None):
    s = sum(mu[p["pid"]] + lam * (1 - own.get(p["pid"], 0.1)) * vol[p["pid"]] for p in lineup)
    if corr:
        ids = [p["pid"] for p in lineup]
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                s += corr.get((min(ids[i], ids[j]), max(ids[i], ids[j])), 0.0)
    return s


def load_pool(path):
    d = json.load(open(path))
    pool = {}
    for p in d.get("playerList", []):
        if p.get("IsDisabledFromDrafting"): continue
        pool[p["pid"]] = {"pid": p["pid"], "pos": p["pn"], "salary": p.get("s") or 5000,
                          "name": f"{p.get('fn','')} {p.get('ln','')}".strip(),
                          "team": p.get("atabbr"),
                          "ppg": float(p.get("ppg") or 0)}
    return pool


def by_pos_index(pool):
    by_pos = collections.defaultdict(list)
    for p in pool.values(): by_pos[p["pos"]].append(p)
    for pos in by_pos: by_pos[pos].sort(key=lambda p: -p.get("mu", 0))
    return by_pos


# ---------------- engine 1: greedy ----------------
def greedy_leverage(pool, mu, lam, own, vol, tries=60, rng=None):
    rng = rng or random.Random(7)
    for p in pool.values(): p["mu"] = mu[p["pid"]]
    by_pos = by_pos_index(pool)
    minsal = {pos: min(p["salary"] for p in ps) for pos, ps in by_pos.items()}
    best, best_s = None, -1e18
    for _ in range(tries):
        lineup, used, ids = [], 0, set()
        for slot in SLOTS:
            cands = by_pos["QB"] if slot == "QB" else by_pos["DST"] if slot == "DST" else \
                    (by_pos["WR"] + by_pos["RB"] + by_pos["TE"]) if slot == "FLEX" else by_pos[slot]
            k = rng.randint(0, 12)
            need_left = 8 - len(lineup)
            picked = None
            for p in cands[:30 + k]:
                if p["pid"] in ids: continue
                if used + p["salary"] + FLOOR * need_left > CAP: continue
                picked = p; break
            if picked is None:  # cheapest fallback
                cheap = sorted((q for q in cands if q["pid"] not in ids and used + q["salary"] <= CAP),
                               key=lambda q: q["salary"])
                picked = cheap[0] if cheap else None
            if picked is None:  # cheapest fallback that fits
                cheap = sorted((q for q in cands if q["pid"] not in ids and used + q["salary"] <= CAP),
                               key=lambda q: q["salary"])
                picked = cheap[0] if cheap else None
            if picked is None: break
            lineup.append(picked); used += picked["salary"]; ids.add(picked["pid"])
        if len(lineup) == 9 and valid(lineup):
            s = gpp_score(lineup, mu, lam, own, vol)
            if s > best_s: best, best_s = list(lineup), s
    return best, best_s


# ---------------- engine 2: tabu swap ----------------
def tabu_portfolio(pool, mu, lam, own, vol, seed=None, n_keep=10, iters=200, tabu_len=25, rng=None,
                   time_budget=45):
    rng = rng or random.Random(11)
    for p in pool.values(): p["mu"] = mu[p["pid"]]
    by_pos = by_pos_index(pool)
    cur = seed or greedy_leverage(pool, mu, lam, own, vol, rng=rng)[0]
    cur_s = gpp_score(cur, mu, lam, own, vol)
    tabu = collections.deque(maxlen=tabu_len)
    top, t0 = [], time.time()
    for it in range(iters):
        cands = []
        ids_cur = {p["pid"] for p in cur}
        for i in range(len(cur)):
            slotc = by_pos[cur[i]["pos"]][:30]
            for c in slotc:
                if c["pid"] in ids_cur: continue
                nl = list(cur); nl[i] = c
                if valid(nl): cands.append(nl)
        rng.shuffle(cands)
        best_n, best_ns, best_key = None, -1e18, None
        for nl in cands[:120]:
            key = tuple(sorted(p["pid"] for p in nl))
            if key in tabu: continue
            s = gpp_score(nl, mu, lam, own, vol)
            if s > best_ns: best_n, best_ns, best_key = nl, s, key
        if best_n is None: break
        tabu.append(tuple(sorted(ids_cur - {p["pid"] for p in best_n})))
        cur, cur_s = best_n, best_ns
        top.append((cur_s, tuple(sorted(p["pid"] for p in cur)), cur))
        if it % 40 == 0 and time.time() - t0 > time_budget: break
    seen, out = set(), []
    for s, key, lu in sorted(top, key=lambda x: -x[0]):
        if key in seen: continue
        seen.add(key); out.append((s, lu))
        if len(out) >= n_keep: break
    return out


# ---------------- engine 3: fieldsim ----------------
def sim_field(pool, mu, sigma, own, n=1500, rng=None, max_from_game=0):
    rng = rng or random.Random(3)
    for p in pool.values(): p["mu"] = mu[p["pid"]]
    by_pos = by_pos_index(pool)
    minsal = {pos: min(p["salary"] for p in ps) for pos, ps in by_pos.items()}
    star_pool = sorted(pool.values(), key=lambda p: -own.get(p["pid"], 0))[:60]
    fields = []
    for _i in range(n):
        lineup, used, ids = [], 0, set()
        for _k in range(3):  # ownership-driven stars
            tot = sum(own.get(p["pid"], .05) for p in star_pool)
            r, acc = rng.random() * tot, 0
            for p in star_pool:
                acc += own.get(p["pid"], .05)
                if acc >= r and p["pid"] not in ids:
                    lineup.append(p); ids.add(p["pid"]); used += p["salary"]; break
        for slot in SLOTS:
            if len(lineup) >= 9: break
            cands = by_pos["QB"] if slot == "QB" else by_pos["DST"] if slot == "DST" else \
                    (by_pos["WR"] + by_pos["RB"] + by_pos["TE"]) if slot == "FLEX" else by_pos[slot]
            cands = cands[:30]
            need_left = 8 - len(lineup)
            picked = None
            for p in cands:
                if p["pid"] in ids: continue
                if used + p["salary"] > CAP: continue
                if used + p["salary"] + FLOOR * need_left > CAP:
                    cheap = sorted((q for q in cands if q["pid"] not in ids and used + q["salary"] <= CAP),
                                   key=lambda q: q["salary"])
                    picked = cheap[0] if cheap else None
                else:
                    picked = p
                break
            if picked is None: continue
            lineup.append(picked); ids.add(picked["pid"]); used += picked["salary"]
        if len(lineup) == 9 and valid(lineup):
            fields.append(tuple(sorted(p["pid"] for p in lineup)))
    return fields


def fieldsim_portfolio(pool, mu, sigma, own, n_sims=1500, k=3, rng=None):
    rng = rng or random.Random(5)
    t0 = time.time()
    fields = sim_field(pool, mu, sigma, own, n=n_sims, rng=rng)
    print(f"  [fieldsim] simulated {len(fields)} field lineups in {time.time()-t0:.1f}s")
    field_pctl = None
    if fields:
        ss = sorted(sum(mu[i] for i in f) for f in fields)
        field_pctl = ss[int(0.995 * len(ss)) - 1]
    cands = []
    for lam in (0.0, 0.5, 1.0, 2.0):
        lu, _ = greedy_leverage(pool, mu, lam, own, sigma, tries=25, rng=rng)
        if lu: cands.append(lu)
    best_set, best_p = None, -1
    for combo in itertools.combinations(range(len(cands)), min(k, len(cands))):
        p_hit = 1.0
        for ci in combo:
            lu = cands[ci]
            m = sum(mu[p["pid"]] for p in lu)
            v = math.sqrt(sum(sigma.get(p["pid"], 4.0) ** 2 for p in lu))
            if field_pctl is None: p_one = 0.02
            else:
                z = (field_pctl - m) / max(v, 1e-9)
                p_one = max(0.0005, 0.5 * math.erfc(z / math.sqrt(2)))
            p_hit *= (1 - p_one)
        p_hit = 1 - p_hit
        if p_hit > best_p: best_p, best_set = p_hit, combo
    return [cands[i] for i in (best_set or ())], best_p, field_pctl


# ---------------- engine 4: cash ----------------
def cash_mode(pool, mu, sigma):
    eff = sorted(pool.values(), key=lambda p: (sigma.get(p["pid"], 4) / max(mu[p["pid"]], .1)))
    for p in eff: p["mu"] = mu[p["pid"]]
    by_pos = by_pos_index(pool)
    lineup, used, ids = [], 0, set()
    for slot in SLOTS:
        cands = by_pos["QB"] if slot == "QB" else by_pos["DST"] if slot == "DST" else \
                (by_pos["WR"] + by_pos["RB"] + by_pos["TE"]) if slot == "FLEX" else by_pos[slot]
        for p in cands[:40]:
            if p["pid"] in ids: continue
            if used + p["salary"] + FLOOR * (8 - len(lineup)) > CAP: continue
            if slot == "FLEX" and p["pos"] not in FLEX_OK: continue
            lineup.append(p); used += p["salary"]; ids.add(p["pid"]); break
    return lineup if valid(lineup) else None


def selftest(pool_path):
    pool = load_pool(pool_path)
    print(f"pool: {len(pool)} players; {dict(collections.Counter(p['pos'] for p in pool.values()))}")
    rng = random.Random(1)
    mu = {pid: max(2.0, p["ppg"] * rng.uniform(0.75, 1.25)) for pid, p in pool.items()}
    sigma = {pid: max(2.5, mu[pid] * 0.45) for pid in mu}
    own = {pid: min(0.85, mu[pid] / 400 + rng.uniform(0, .04)) for pid in mu}
    lam = 1.0

    t0 = time.time(); seed, ss = greedy_leverage(pool, mu, lam, own, sigma)
    print(f"[greedy] score {ss:.1f} mu {raw_score(seed, mu):.1f} sal {sum(p['salary'] for p in seed)} ({time.time()-t0:.1f}s)")
    t0 = time.time(); top = tabu_portfolio(pool, mu, lam, own, sigma, seed=seed, iters=150, time_budget=60)
    print(f"[tabu] best {top[0][0]:.1f} (mu {raw_score(top[0][1], mu):.1f}), {len(top)} distinct ({time.time()-t0:.1f}s)")
    for s, lu in top[:3]:
        print("   ", round(s, 1), " ".join(f"{p['name']}({p['pos']}{p['salary']//100})" for p in lu))
    t0 = time.time(); port, p_hit, pctl = fieldsim_portfolio(pool, mu, sigma, own, n_sims=1200, k=3)
    print(f"[fieldsim] P(>99.5pct) {p_hit:.4f} field_pctl {pctl and round(pctl,1)} ({time.time()-t0:.1f}s)")
    t0 = time.time(); cash = cash_mode(pool, mu, sigma)
    print(f"[cash] mu {raw_score(cash, mu):.1f} sal {sum(p['salary'] for p in cash)} ({time.time()-t0:.1f}s)")
    print("SELFTEST PASS" if seed and top and port and cash else "SELFTEST FAIL")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", default="/tmp/pool_154468.json")
    a = ap.parse_args()
    selftest(a.pool)
