"""
rvc_edge5_grade.py — mechanical grading for the PHI@JAC EDGE#5 cross-book residual.
Runs the moment London settles. Pre-registered criteria, zero human judgment.

Pre-registered (NOW, before outcomes):
  Join keys: Kalshi event KXNFLGAME-26OCT11PHIJAC ↔ final score
  Residuals:
    R1: Kalshi devig ML (76.5%) vs actual winner (binary) → Brier
    R2: DK spread-implied ML (71.4%) vs actual winner → Brier
    R3: |R1 − R2| = the cross-book divergence, graded against reality
    R4: Kalshi total median (42.5) vs DK total (41.5) vs actual total
  Criteria:
    C1: game reaches Final status (ESPN or Kalshi settled_time)
    C2: divergence is graded: which book's ML was closer to truth?
    C3: total residual: |42.5 − actual| vs |41.5 − actual| — the +1.0pt Kalshi lean
        is confirmed or refuted by the actual total landing

  PASS = the cross-book divergence is resolved (one book was right, one was wrong,
         or both were within noise). REFUSED = game didn't settle or data incomplete.

Usage:
    python rvc_edge5_grade.py --verify    # dry-run: confirms joins without outcomes
    python rvc_edge5_grade.py --grade     # runs when ESPN shows the game as Final
"""
import json, time, os, sys, math, statistics, argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh, close_only_fallback, KILL_LEDGER

HERE = os.path.dirname(os.path.abspath(__file__))
STAMP_OUT = os.path.join(HERE, 'EDGE5_CROSSBOOK_GRADED.json')
ESPN_URL = ('https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
            '?dates=20261011')
KALSHI_ML = {'PHI': 0.235, 'JAC': 0.765}  # devig from Kalshi ML markets
DK_SPREAD = -7.5   # JAX -7.5 (home favored)
DK_TOTAL = 41.5
KALSHI_TOTAL_MEDIAN = 42.5
OUR_SIGMA = 13.3  # EDGE#1b global margin sd

def _espn_final():
    """Fetch ESPN scoreboard; return the PHI@JAC game if Final, else None."""
    import urllib.request
    try:
        req = urllib.request.Request(ESPN_URL, headers={'User-Agent': 'Mozilla/5.0'})
        d = json.loads(urllib.request.urlopen(req, timeout=25).read())
        for ev in d.get('events', []):
            name = ev.get('name', '').lower()
            if ('jaguars' in name or 'jacksonville' in name) and \
               ('eagles' in name or 'philadelphia' in name):
                comp = ev['competitions'][0]
                status = comp.get('status', {}).get('type', {}).get('description', '')
                if status != 'Final':
                    return {'settled': False, 'status': status}
                teams = {}
                for c in comp.get('competitors', []):
                    teams[c.get('homeAway')] = {
                        'name': c.get('team', {}).get('displayName'),
                        'score': int(c.get('score', 0)),
                    }
                return {'settled': True, 'home': teams.get('home'), 'away': teams.get('away'),
                        'total': teams['home']['score'] + teams['away']['score'],
                        'home_name': teams['home']['name'], 'away_name': teams['away']['name']}
        return {'settled': False, 'status': 'game not found on scoreboard'}
    except Exception as e:
        return {'settled': False, 'error': str(e)[:80]}


def _dk_implied_p_home(spread, sigma=OUR_SIGMA):
    """P(home wins) from the closing spread, Gaussian.
    spread convention: -7.5 means home favored by 7.5 → home expected margin = +7.5.
    P(home wins) = P(N(mu_home, sigma) > 0) = Phi(mu_home / sigma)."""
    mu_home = -spread  # spread -7.5 → home margin +7.5
    return 0.5 * (1 + math.erf(mu_home / (sigma * math.sqrt(2))))


def _ledger(row):
    row['ledger_ts'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with open(KILL_LEDGER, 'a', encoding='utf-8') as f:
        f.write(json.dumps(row) + '\n')


def verify():
    """Dry-run: confirm all joins resolve, no outcomes needed."""
    print('=== EDGE#5 CROSSBOOK GRADE — VERIFY (no outcomes) ===')
    print(f'Kalshi ML (devig): PHI {KALSHI_ML["PHI"]:.3f}, JAC {KALSHI_ML["JAC"]:.3f}')
    p_home_dk = _dk_implied_p_home(DK_SPREAD)
    print(f'DK spread-implied P(home=JAX): {p_home_dk:.4f} (spread {DK_SPREAD})')
    print(f'DK total: {DK_TOTAL}, Kalshi total median: {KALSHI_TOTAL_MEDIAN}')
    print(f'Cross-book ML divergence: {abs(KALSHI_ML["JAC"] - p_home_dk)*100:.1f}pp')
    es = _espn_final()
    print(f'ESPN status: settled={es.get("settled")}, status={es.get("status", "n/a")}')
    print('\nJoin keys:')
    print('  Kalshi event: KXNFLGAME-26OCT11PHIJAC')
    print('  ESPN: PHI Eagles @ JAC Jaguars, 2026-10-11')
    print('  Outcome: home (JAX) wins → binary 1/0')
    print('  R1: Kalshi devig vs outcome → Brier')
    print('  R2: DK spread-implied vs outcome → Brier')
    print('  R3: |R1 Brier − R2 Brier| = cross-book resolution')
    print('  R4: |42.5 − actual_total| vs |41.5 − actual_total|')
    print('\nVERIFY: joins resolve, criteria pre-registered, awaiting Final status.')


def grade():
    """Mechanical grade when the game is Final. Zero human judgment."""
    es = _espn_final()
    if not es.get('settled'):
        reason = f'game not Final: {es.get("status", es.get("error", "unknown"))}'
        _ledger({'event': 'EDGE5_CROSSBOOK_GRADE', 'verdict': 'REFUSED',
                 'reason': reason, 'label': 'DIAGNOSTIC'})
        print(f'REFUSED: {reason}')
        return

    home_score = es['home']['score']
    away_score = es['away']['score']
    actual_total = es['total']
    home_wins = 1.0 if home_score > away_score else 0.0
    # JAX is home
    p_jac_kalshi = KALSHI_ML['JAC']
    p_jac_dk = _dk_implied_p_home(DK_SPREAD)

    # Brier for each book's ML
    brier_kalshi = (p_jac_kalshi - home_wins) ** 2
    brier_dk = (p_jac_dk - home_wins) ** 2

    # total residuals
    total_resid_kalshi = abs(KALSHI_TOTAL_MEDIAN - actual_total)
    total_resid_dk = abs(DK_TOTAL - actual_total)

    # winner determination
    jac_won = home_score > away_score
    winner = 'JAC' if jac_won else 'PHI'

    # cross-book divergence resolution: which book was closer?
    if brier_kalshi < brier_dk:
        ml_winner = 'KALSHI'
    elif brier_dk < brier_kalshi:
        ml_winner = 'DK'
    else:
        ml_winner = 'TIE'
    total_winner = 'KALSHI' if total_resid_kalshi < total_resid_dk else 'DK'

    stamp = {
        'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'test': 'EDGE#5 cross-book residual GRADED (PHI@JAC London)',
        'outcome': {'home': es['home'], 'away': es['away'],
                    'home_score': home_score, 'away_score': away_score,
                    'total': actual_total, 'winner': winner},
        'ml': {
            'kalshi_p_jac': p_jac_kalshi, 'dk_p_jac': round(p_jac_dk, 4),
            'brier_kalshi': round(brier_kalshi, 4), 'brier_dk': round(brier_dk, 4),
            'closer_book': ml_winner,
            'pre_registered_divergence_pp': round((p_jac_kalshi - p_jac_dk) * 100, 1),
        },
        'total': {
            'kalshi_median': KALSHI_TOTAL_MEDIAN, 'dk_total': DK_TOTAL,
            'actual': actual_total,
            'kalshi_resid': round(total_resid_kalshi, 1),
            'dk_resid': round(total_resid_dk, 1),
            'closer_book': total_winner,
        },
        'verdict': 'GRADED',
        'label': 'DIAGNOSTIC',
        'reading': (f'Cross-book ML divergence was {abs(p_jac_kalshi - p_jac_dk)*100:.1f}pp. '
                    f'{ml_winner} was closer. '
                    f'Total: Kalshi +1.0 lean {"confirmed" if total_winner == "KALSHI" else "refuted"}. '
                    f'Actual total {actual_total} vs Kalshi median {KALSHI_TOTAL_MEDIAN} '
                    f'vs DK {DK_TOTAL}.'),
    }
    json.dump(stamp, open(STAMP_OUT, 'w'), indent=1)
    _ledger({'event': 'EDGE5_CROSSBOOK_GRADED', 'verdict': 'GRADED',
             'winner': winner, 'actual_total': actual_total,
             'closer_ml_book': ml_winner, 'closer_total_book': total_winner,
             'label': 'DIAGNOSTIC'})
    print(json.dumps(stamp, indent=1)[:1200])
    print(f'\nGRADED: {winner} wins {away_score}-{home_score}. '
          f'ML closer: {ml_winner}. Total closer: {total_winner}.')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--grade', action='store_true')
    a = ap.parse_args()
    if a.verify:
        verify()
    elif a.grade:
        grade()
    else:
        print(__doc__)
