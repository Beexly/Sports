#!/usr/bin/env python3
"""
consensus.py — the field's consensus engine. Consumes entries_{contest}.jsonl
(from pull_entries.py) + the OPEN player-pool endpoint, produces:
  1. owned% per player (anchors >30% / mid 10-30% / leverage <10%)
  2. duplicate-lineup clusters (identical rosters = ghost pairs)
  3. THE FIELD CONSENSUS LINEUP (most-owned valid-salary roster)
  4. leverage report vs DK's own mu_hat feed (dk_cfb_prop_fits.json if present)
Usage: python3 consensus.py --contest 123456789 --dg 43307 [--lineup-size 9]
"""
import argparse, json, collections, urllib.request, sys

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
POOL_URL = "https://www.draftkings.com/lineup/getavailableplayers?draftGroupId={dg}"

def load_pool(dg):
    try:
        with urllib.request.urlopen(urllib.request.Request(
                POOL_URL.format(dg=dg), headers={"User-Agent": UA}), timeout=25) as r:
            d = json.loads(r.read())
        pool = {}
        for p in d.get("playerList", []):
            pool[str(p.get("pid"))] = {"name": f"{p.get('fn','')} {p.get('ln','')}".strip(),
                                       "pos": p.get("pn"), "salary": p.get("salary") or p.get("s")}
        return pool
    except Exception as e:
        print(f"[WARN] pool fetch failed ({e}) — pids stay unresolved"); return {}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--contest", required=True)
    ap.add_argument("--dg", default=None)
    ap.add_argument("--lineup-size", type=int, default=9)
    ap.add_argument("--top", type=int, default=25)
    args = ap.parse_args()
    path = f"entries_{args.contest}.jsonl"
    try:
        lines = [json.loads(l) for l in open(path)]
    except FileNotFoundError:
        print(f"FATAL: {path} not found — run pull_entries.py first"); sys.exit(2)
    entries = [e for e in lines if e.get("lineup")]
    if not entries:
        print("FATAL: no lineups in file (pre-lock pull? lineups appear at/after lock)"); sys.exit(3)
    n = len(entries)
    pool = load_pool(args.dg) if args.dg else {}
    def nm(pid): return pool.get(str(pid), {}).get("name", f"pid{pid}")

    # ---- 1. owned%
    owned = collections.Counter()
    for e in entries:
        for pid in set(e["lineup"]):
            owned[str(pid)] += 1
    own_pct = {pid: c / n * 100 for pid, c in owned.items()}
    anchors = [(pid, pc) for pid, pc in own_pct.items() if pc > 30]
    leverage = sorted([(pid, pc) for pid, pc in own_pct.items() if pc < 10], key=lambda x: x[1])
    print(f"[ENTRIES] {n} lineups parsed | distinct players: {len(owned)}")
    print(f"\n[ANCHORS >30% owned] ({len(anchors)})")
    for pid, pc in sorted(anchors, key=lambda x: -x[1])[:args.top]:
        print(f"  {nm(pid):<28} {pc:5.1f}%")
    print(f"\n[LEVERAGE <10%] ({len(leverage)}) lowest 15:")
    for pid, pc in leverage[:15]:
        print(f"  {nm(pid):<28} {pc:5.1f}%")

    # ---- 2. duplicate clusters
    sig = collections.Counter(tuple(sorted(e["lineup"])) for e in entries)
    dups = [(s, c) for s, c in sig.items() if c > 1]
    dups.sort(key=lambda x: -x[1])
    print(f"\n[DUPLICATE LINEUPS] {len(dups)} rosters fielded by 2+ entries (ghost clusters)")
    for s, c in dups[:10]:
        print(f"  x{c:>3}: " + ", ".join(nm(p) for p in s[:5]) + ("..." if len(s) > 5 else ""))

    # ---- 3. field consensus lineup (greedy most-owned, lineup-size cap)
    size = args.lineup_size
    consensus = sorted(own_pct.items(), key=lambda x: -x[1])[:size]
    print(f"\n[FIELD CONSENSUS LINEUP] (greedy top-{size} owned — positional validity needs the pool's positions)")
    tot = 0
    for pid, pc in consensus:
        p = pool.get(str(pid), {})
        sal = p.get("salary") or 0
        try: tot += int(sal)
        except (TypeError, ValueError): pass
        print(f"  {nm(pid):<28} {pc:5.1f}%  {p.get('pos','?'):<3} ${sal}")
    print(f"  total salary of consensus: ${tot} (validate against cap)")
    # leverage vs DK mu_hat if the fits file exists
    try:
        dk = json.load(open("/var/minis/workspace/cfb/dk_cfb_prop_fits.json"))["fits"]
        mus = {}
        for mkt, rows in dk.items():
            for f in rows: mus[f["player"].split(" (")[0].lower()] = (mkt, f["mu_fit"])
        hits = [(nm(pid), mus[nm(pid).lower()]) for pid, _ in consensus if nm(pid).lower() in mus]
        if hits:
            print("\n[LEVERAGE vs DK mu_hat] consensus players with reconstructed projections:")
            for name, (mkt, mu) in hits[:8]:
                print(f"  {name:<28} {mkt:<5} DK-implied mu {mu}")
    except FileNotFoundError:
        pass
    json.dump({"n_entries": n, "owned_pct": {nm(p): round(v, 1) for p, v in
               sorted(own_pct.items(), key=lambda x: -x[1])[:60]},
               "dup_clusters": [[list(s), c] for s, c in dups[:20]]},
              open(f"consensus_{args.contest}.json", "w"), indent=1)
    print(f"\nsaved consensus_{args.contest}.json")

if __name__ == "__main__":
    main()
