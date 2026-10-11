"""
rvc_grade.py — the --grade entry point. REFUSE-FIRST by design.

Usage:
    python rvc_grade.py --verify          # verify the path is executable + refuse-safe (no outcomes needed)
    python rvc_grade.py --grade <file>    # grade ONLY when <file> carries real settlement rows

Refusal rules (pre-registered in GRADING_PLAN.json):
    - outcomes file must exist, parse, carry observed_at (FreshnessGate), and contain
      >= 1 row with ALL of: event_id/label (or event name + market_type), outcome value
    - every outcome row must JOIN to a GRADING_PLAN join_key; unmatched rows are reported, not invented
    - C1..C4 evaluated exactly as pre-registered; verdict PASS or REFUSED stamped
    - kill-ledger entry appended either way (append-only)

This file contains ZERO outcome data. The grade step refuses on any file that
does not carry real settlement rows.
"""
import json, time, os, sys, statistics, argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh, close_only_fallback, KILL_LEDGER

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, 'GRADING_PLAN.json')
STAMP_OUT = os.path.join(HERE, 'RVC_MODEL_SKILL_STAMP.json')


def _ledger(row):
    row['ledger_ts'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with open(KILL_LEDGER, 'a', encoding='utf-8') as f:
        f.write(json.dumps(row) + '\n')


def _verify():
    """Verify the grading path: plan readable, join keys sane, refuse paths work."""
    p = read_fresh(PLAN, max_age_hours=1e9, require_manifest=False)
    print('plan read:', p['audit']['failure_mode'] or 'PASS')
    plan = p['data']
    jk = plan['join_keys']
    types = sorted(set(s['market_type'] for s in jk))
    evs = sorted(set(s['event_id'] for s in jk))
    print(f'join keys: {len(jk)} | events: {len(evs)} | market types: {types}')
    # every join key must have the fields the join needs
    missing = [s for s in jk if not (s.get('event_id') and s.get('market_type') and s.get('label'))]
    print('join keys missing fields:', len(missing))
    # refuse-safe test: grade against a file with NO settlement rows must refuse cleanly
    import tempfile
    tmp = tempfile.mkdtemp(prefix='rvc_verify_')
    empty = os.path.join(tmp, 'empty_outcomes.json')
    json.dump({'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
               'source': 'verify-dryrun', 'outcomes': []}, open(empty, 'w'))
    r = grade(empty)
    print('refuse-safe test (empty outcomes):', r['verdict'], '|', r['refusal_reason'][:60])
    # stale outcomes file must also refuse
    stale = os.path.join(tmp, 'stale_outcomes.json')
    json.dump({'observed_at': '2026-10-09T00:00:00Z', 'source': 'verify-dryrun',
               'outcomes': [{'event_id': 'x', 'label': 'y', 'market_type': 'Moneyline', 'outcome': 1}]},
              open(stale, 'w'))
    r2 = grade(stale)
    print('refuse-safe test (stale outcomes):', r2['verdict'], '|', r2['refusal_reason'][:60])
    ok = (len(missing) == 0 and r['verdict'] == 'REFUSED' and r2['verdict'] == 'REFUSED')
    print('VERIFY:', 'PASS — path executable and refuse-safe' if ok else 'FAIL')
    return ok


def grade(outcomes_path):
    """Grade ONLY with real settlement rows. Refuses otherwise. Never invents."""
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    plan = json.load(open(PLAN))
    join = {(s['event_id'], s['market_type'], s['label'], s['points']): s for s in plan['join_keys']}

    # FreshnessGate on the outcomes file (6h bar — settlement pulls are fresh pulls)
    r = read_fresh(outcomes_path, max_age_hours=6.0)
    if r['data'] is None:
        verdict = 'REFUSED'
        reason = f"FreshnessGate: {r['audit']['failure_mode']} — {r['audit'].get('detail','')[:80]}"
        _ledger({'event': 'RVC_GRADE_ATTEMPT', 'outcomes_file': outcomes_path,
                 'verdict': verdict, 'reason': reason, 'label': 'DIAGNOSTIC'})
        return {'verdict': verdict, 'refusal_reason': reason, 'graded_n': 0}

    rows = (r['data'].get('outcomes') or r['data'].get('rows')
            or r['data'].get('settlements') or r['data'].get('graded') or [])
    # refuse if no real outcome rows
    real = [x for x in rows if x.get('outcome') is not None]
    if not real:
        verdict = 'REFUSED'
        reason = f'no settlement rows with outcome values (rows={len(rows)})'
        _ledger({'event': 'RVC_GRADE_ATTEMPT', 'outcomes_file': outcomes_path,
                 'verdict': verdict, 'reason': reason, 'label': 'DIAGNOSTIC'})
        return {'verdict': verdict, 'refusal_reason': reason, 'graded_n': 0}

    # join outcomes to the plan (unmatched reported, never invented)
    graded, unmatched = [], []
    for x in real:
        key = (x.get('event_id'), x.get('market_type'), x.get('label'), x.get('points'))
        if key in join:
            j = join[key]
            graded.append({**j, 'outcome': x['outcome'],
                           'p_close': x.get('p_close', j.get('close_p_display'))})
        else:
            unmatched.append(x)
    if len(graded) < 60:  # C1 coverage bar
        verdict = 'REFUSED'
        reason = f'C1 coverage: {len(graded)} joined < 60 required (unmatched {len(unmatched)})'
        _ledger({'event': 'RVC_GRADE_ATTEMPT', 'verdict': verdict, 'reason': reason,
                 'label': 'DIAGNOSTIC'})
        return {'verdict': verdict, 'refusal_reason': reason, 'graded_n': len(graded)}

    # C2 close sanity
    errs = [abs(g['p_close'] - g['outcome']) for g in graded if g.get('p_close') is not None]
    close_sane = statistics.mean(errs) <= 0.50 if errs else False

    # R2 close-vs-outcome
    r2 = [g['p_close'] - g['outcome'] for g in graded if g.get('p_close') is not None]
    # C4 directional
    t_stat = (statistics.mean(r2) / (statistics.stdev(r2) / (len(r2) ** 0.5))
              if len(r2) > 2 and statistics.stdev(r2) > 0 else 0)
    # C3 model skill needs p_model — only computable if outcomes carry it
    has_model = [g for g in graded if g.get('p_model') is not None]
    brier_close = statistics.mean([(g['p_close'] - g['outcome']) ** 2 for g in graded
                                   if g.get('p_close') is not None])
    brier_model = (statistics.mean([(g['p_model'] - g['outcome']) ** 2 for g in has_model])
                   if has_model else None)
    c3 = (brier_model is not None and (brier_close - brier_model) > 0 and len(has_model) >= 60)

    criteria = {'C1_coverage': len(graded) >= 60, 'C2_calibration': close_sane,
                'C3_model_skill': c3, 'C4_directional': abs(t_stat) >= 2.0}
    verdict = 'PASS' if (criteria['C1_coverage'] and criteria['C2_calibration']
                         and criteria['C3_model_skill']) else 'REFUSED'
    stamp = {
        'observed_at': now,
        'outcomes_file': outcomes_path,
        'graded_n': len(graded), 'unmatched_n': len(unmatched),
        'mean_abs_close_err': round(statistics.mean(errs), 4) if errs else None,
        'brier_close': round(brier_close, 4), 'brier_model': round(brier_model, 4) if brier_model else None,
        'R2_mean': round(statistics.mean(r2), 4), 'R2_t': round(t_stat, 3),
        'criteria': criteria, 'verdict': verdict, 'label': 'DIAGNOSTIC',
    }
    json.dump(stamp, open(STAMP_OUT, 'w'), indent=1)
    _ledger({'event': 'RVC_MODEL_SKILL_STAMP', 'verdict': verdict,
             'graded_n': len(graded), 'brier_close': stamp['brier_close'],
             'brier_model': stamp['brier_model'], 'label': 'DIAGNOSTIC'})
    return stamp


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--grade', metavar='OUTCOMES_FILE')
    a = ap.parse_args()
    if a.verify:
        ok = _verify()
        sys.exit(0 if ok else 1)
    elif a.grade:
        print(json.dumps(grade(a.grade), indent=1, default=str)[:1500])
    else:
        print(__doc__)
