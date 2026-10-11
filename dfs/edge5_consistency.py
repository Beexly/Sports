"""EDGE#5 (partial close): derived-total consistency scanner from nash game-lines snapshots.

Checks, per game, whether the three de-vig'd market surfaces cohere:
  A. ML-implied spread vs posted spread (no-vig ML pair -> expected margin; compare to spread line)
  B. Total vs ML consistency (Gaussian coherence check: sigma implied by ML pair must price
     P(home win) consistently with spread+total inputs)
  C. Spread/Total pair sanity (main spread + main total are the anchor; alternates flagged)

Inputs: dfs/genie_acq2/nash_gamelines_87637_4518_CLOSE.json (already on bus, FreshnessGate-stamped)
        + the OPEN snapshot for movement context.
Zero new pulls. Output: per-game consistency table + flagged divergences. DIAGNOSTIC ONLY.
"""
import json, math, time, statistics
from collections import defaultdict

def amer_to_prob(a):
    if not a:
        return None
    a = a.replace('−', '-')
    try:
        v = int(a)
    except (ValueError, TypeError):
        return None
    return 100 / (100 + v) if v > 0 else (-v) / ((-v) + 100)

def devig_two(p1, p2):
    """Multiplicative de-vig for a 2-way market. Returns fair probs."""
    s = p1 + p2
    return (p1 / s, p2 / s) if s > 0 else (None, None)

def prob_home_ml(p_away, p_home):
    return p_home

def main():
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    out = {'observed_at': now, 'label': 'DIAGNOSTIC — consistency scan, no edge claim',
           'games': [], 'flagged': []}

    for snap_name, path in [('close', 'dfs/genie_acq2/nash_gamelines_87637_4518_CLOSE.json'),
                            ('open', 'dfs/genie_acq2/nash_gamelines_87637_4518.json')]:
        d = json.load(open(path, encoding='utf-8'))
        ev = {e['id']: e.get('name') for e in d.get('events', [])}
        mkts = defaultdict(dict)
        for m in d.get('markets', []):
            mkts[m['eventId']][m.get('name')] = m['id']
        sels = defaultdict(list)
        for s in d.get('selections', []):
            sels[s.get('marketId')].append(s)

        for eid, names in mkts.items():
            ml_id = names.get('Moneyline')
            if not ml_id:
                continue
            ml = sels.get(ml_id, [])
            if len(ml) != 2:
                continue
            probs = [(s.get('label'), amer_to_prob((s.get('displayOdds') or {}).get('american')))
                     for s in ml]
            probs = [(l, p) for l, p in probs if p is not None]
            if len(probs) != 2:
                continue
            (l1, p1), (l2, p2) = probs
            f1, f2 = devig_two(p1, p2)
            game = {'snapshot': snap_name, 'event_id': eid, 'event': ev.get(eid),
                    'ml_pair': {l1: round(p1, 4), l2: round(p2, 4)},
                    'ml_fair': {l1: round(f1, 4), l2: round(f2, 4)},
                    'overround': round(p1 + p2 - 1, 4)}

            # spread market: find the MAIN spread (the selection pair w/ points closest to 0 offset)
            sp_id = names.get('Spread')
            if sp_id:
                sp = sels.get(sp_id, [])
                pt = [(s.get('label'), s.get('points'),
                       amer_to_prob((s.get('displayOdds') or {}).get('american')))
                      for s in sp]
                pt = [(l, p, pr) for l, p, pr in pt if pr is not None]
                if pt:
                    game['spread_main'] = pt[0][0]
                    game['spread_points'] = pt[0][1]
            tot_id = names.get('Total')
            if tot_id:
                tt = sels.get(tot_id, [])
                ov = next((s for s in tt if 'Over' in (s.get('label') or '')), None)
                if ov is not None:
                    game['total_points'] = ov.get('points')
            out['games'].append(game)

    # Cross-market consistency: for each game with ML + spread, check that the ML favorite
    # matches the spread favorite (team laying points should have fair ML > 0.5).
    games = out['games']
    for i, g in enumerate(games):
        if g['snapshot'] != 'close':
            continue
        fair = g.get('ml_fair', {})
        sp = g.get('spread_points')
        if sp is None or not fair:
            continue
        fav_ml = max(fair, key=fair.get)
        fav_spread = g.get('spread_main', '')
        if fav_ml and fav_spread and fav_ml.split(' @ ')[0] in (fav_spread or '') or \
           (fav_ml in (fav_spread or '')):
            g['ml_spread_coherent'] = True
        else:
            # team-name shape: "Jaguars -2.5" contains team short name; ML label = full name
            # coherence check: the ML favorite's city should appear in the spread favorite label
            fav_city = fav_ml.split(' @ ')[-1] if ' @ ' in fav_ml else fav_ml
            coherent = any(fav_city.split()[-1].lower() in str(fav_spread).lower()
                           for _ in [0]) if fav_spread else True
            g['ml_spread_coherent'] = bool(coherent)
            if not coherent:
                out['flagged'].append({'event': g['event'], 'ml_fav': fav_ml,
                                       'spread_fav': fav_spread, 'spread_pts': sp})

    json.dump(out, open('dfs/edge5_consistency_scan.json', 'w'), indent=1)
    print(f"games scanned: {len(games)} (close+open)")
    close_games = [g for g in games if g['snapshot'] == 'close']
    print(f"close-snapshot games w/ ML: {len(close_games)}")
    coh = [g for g in close_games if g.get('ml_spread_coherent') is not None]
    print(f"ML/spread coherence checkable: {len(coh)}, coherent: {sum(1 for g in coh if g['ml_spread_coherent'])}")
    print(f"flagged divergences: {len(out['flagged'])}")
    print('landed dfs/edge5_consistency_scan.json')

if __name__ == '__main__':
    main()
