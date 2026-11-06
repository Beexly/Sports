#!/usr/bin/env python3
"""Closing-price calibration: devigged American odds -> cover frequency."""
import json, math, statistics
from collections import Counter


def american_to_implied_prob(odds):
    if odds is None: return None
    try:
        o = float(odds)
    except:
        return None
    if o > 0:
        return 100.0 / (o + 100.0)
    else:
        return -o / (-o + 100.0)


def devig(p):
    # proportional devig: p' = p / (p + q) => already 1 if fair; but proportional means scale by mean
    # We'll use standard proportional: p / (p + (1-p)) is identity; instead scale so mean=expected edge removed
    # Standard: p_devig = p / (p + (1-p)*margin_factor) — but simplest: assume vig = (p+q)-1, redistribute proportionally
    p = float(p)
    q = 1.0 - p
    total = p + q
    return p / total  # without pair: if p+q > 1, scale both down so sum=1


def main():
    rows = [json.loads(l) for l in open('data/nflverse/games_harness_rows.jsonl')]
    # Use rows with both spread odds
    subset = [r for r in rows if r.get('awaySpreadOdds') is not None and r.get('homeSpreadOdds') is not None and r.get('spreadLineHome') is not None]
    print(f"Total with both spread odds + line: {len(subset)}")
    # Compute home-implied prob from homeSpreadOdds (negative = favored)
    # Assume home odds format: if spreadLineHome = -3, home favored; homeSpreadOdds is American odds for home covering spread
    # We'll derive from either home or away odds. Use average of implied probs if both exist.
    results = []
    for r in subset:
        home_odds = r.get('homeSpreadOdds')
        away_odds = r.get('awaySpreadOdds')
        p_home = None
        if home_odds is not None:
            p_home = american_to_implied_prob(home_odds)
        # Realized cover: result = final_score_home - final_score_away; cover if result > spreadLineHome (with half-point tie excluded? keep strict)
        result = r.get('homeScore', 0) - r.get('awayScore', 0)
        spread = r.get('spreadLineHome', 0)
        covered = result > spread
        # Also check spread equality (push) — skip pushes? We'll count cover strictly >
        results.append({
            'season': r['season'], 'gameId': r['gameId'], 'p_home_raw': p_home,
            'p_home_devig': devig(p_home) if p_home else None,
            'covered': covered, 'spread': spread, 'result': result
        })
    # Filter to those with non-null devigged prob
    valid = [r for r in results if r['p_home_devig'] is not None]
    print(f"Valid for calibration: {len(valid)} (seasons {sorted({r['season'] for r in valid})[-5:]})")
    # Overall calibration
    overall_expected = sum(r['p_home_devig'] for r in valid)
    overall_observed = sum(1 for r in valid if r['covered'])
    print(f"Overall: n={len(valid)}, expected covers={overall_expected/len(valid):.3f}, observed={overall_observed/len(valid):.3f}, cal_error={abs(overall_observed/len(valid) - overall_expected/len(valid)):.3f}")
    # Decile bins by implied prob
    valid.sort(key=lambda r: r['p_home_devig'])
    deciles = []
    n = len(valid)
    for i in range(10):
        start = i * n // 10
        end = (i+1) * n // 10
        bin_rows = valid[start:end]
        if not bin_rows: continue
        exp = sum(r['p_home_devig'] for r in bin_rows) / len(bin_rows)
        obs = sum(1 for r in bin_rows if r['covered']) / len(bin_rows)
        deciles.append({'decile': i+1, 'n': len(bin_rows), 'p_range': (min(r['p_home_devig'] for r in bin_rows), max(r['p_home_devig'] for r in bin_rows)), 'expected': exp, 'observed': obs, 'cal_error': abs(obs-exp)})
    for d in deciles:
        print(f"Decile {d['decile']}: n={d['n']}, p_range=[{d['p_range'][0]:.3f},{d['p_range'][1]:.3f}], exp={d['expected']:.3f}, obs={d['observed']:.3f}, cal_err={d['cal_error']:.3f}")

if __name__ == '__main__':
    main()
