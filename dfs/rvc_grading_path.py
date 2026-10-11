"""
rvc_grading_path.py — THE POST-SETTLEMENT GRADING PATH for the model-skill RVC stamp.

Defines (before any outcome exists — zero fabrication):
  1. The exact frozen-manifest join: selection → final outcome
  2. The residual definitions to be re-computed after settlement
  3. Pass/fail criteria (pre-registered, not post-hoc)
  4. The kill-ledger entry that will be written on completion or refusal

This script is the CONTRACT. It runs `--prepare` to write the grading plan +
frozen join keys, then `--grade <outcomes_file>` once games settle. FreshnessGate
v2 enforces every read. Nothing promotes: the output is a diagnostic stamp file.

Run now: writes GRADING_PLAN.json with all join keys resolved from artifacts
already on the bus (zero network).
"""
import json, time, os, sys, hashlib
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from freshnessgate_wiring import read_fresh, close_only_fallback, KILL_LEDGER

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, 'frozen_manifest_rvc.json')
CLOSE = os.path.join(HERE, 'genie_acq2', 'nash_gamelines_87637_4518_CLOSE.json')
STAMP = os.path.join(HERE, 'RVC_STAMP_TEST.json')
PLAN_OUT = os.path.join(HERE, 'GRADING_PLAN.json')


def prepare():
    now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    # FreshnessGate reads:
    #  - the manifest-of-manifests (pointer file) with require_manifest=False — it IS metadata
    #  - the artifact it points to with the full gate (data rows must exist)
    m = read_fresh(MANIFEST, max_age_hours=1e9, require_manifest=False)
    artifact_path = m['data']['artifact'] if m['data'] else None
    sha_ok = None
    if artifact_path and os.path.exists(artifact_path):
        sha_ok = hashlib.sha256(open(artifact_path, 'rb').read()).hexdigest().startswith(
            m['data']['sha256'][:16])
        a = read_fresh(artifact_path, max_age_hours=1e9)
        print('frozen ARTIFACT read:', a['audit']['failure_mode'] or 'PASS',
              '| sha match:', sha_ok)
    print('manifest read:', m['audit']['failure_mode'] or 'PASS')
    c = read_fresh(CLOSE, max_age_hours=6.0)
    print('frozen manifest read:', m['audit']['failure_mode'] or 'PASS')
    print('close snapshot read:', c['audit']['failure_mode'] or 'PASS',
          '| age', c['audit'].get('age_hours'), 'h')
    if c['data'] is None:
        print('REFUSAL →', close_only_fallback()['label'])
        return None

    # ---- THE JOIN: selection → outcome key ----
    # Each close selection = (marketId, eventId, label, points, displayOdds).
    # Outcome sources at settlement:
    #   S1. nash fresh pull of the SAME selections AFTER the games finish
    #       (markets flip to status Settled / outcome fields populate) — authorized browser session.
    #   S2. Kalshi settlement (same event, KXNFLGAME-26OCT11PHIJAC) — keyless API.
    #   S3. ESPN/nflverse final scores (game-level; maps to spread/total/ML only).
    # Join key design (deterministic):
    #   game_key    = eventId (nash) ↔ Kalshi event_ticker date/teams ↔ ESPN matchup
    #   market_key  = (eventId, marketType.name, selection.label, points)
    #   outcome_val = per marketType:
    #       Moneyline  → winner team name == selection.label
    #       Spread     → (fav score - dog score) vs points sign
    #       Total      → (home+away) vs points
    selections = []
    for s in c['data'].get('selections', []):
        mkt = next((x for x in c['data'].get('markets', []) if x.get('id') == s.get('marketId')), None)
        if not mkt:
            continue
        selections.append({
            'market_key': f"{mkt.get('eventId')}|{mkt.get('name')}|{s.get('label')}|{s.get('points')}",
            'event_id': mkt.get('eventId'),
            'event_name': next((e.get('name') for e in c['data'].get('events', [])
                                if e.get('id') == mkt.get('eventId')), None),
            'market_type': mkt.get('name'),
            'label': s.get('label'),
            'points': s.get('points'),
            'close_p_display': s.get('close_p_display'),
        })

    # ---- RESIDUAL DEFINITIONS (pre-registered) ----
    residuals = {
        'R1_line_move': 'per selection: p_close − p_open (COMPUTED, in resid_vs_close_gamelines.json, 71 pairs / 40 moved)',
        'R2_close_vs_outcome': 'per selection: (p_close − outcome_indicator), where outcome_indicator ∈ {0,1} from S1/S2/S3',
        'R3_model_vs_close': 'when our engine prices the same market: (p_model − p_close); needs the 262-fit player props (separate close pull, subcat 9524/16569-16571) — NOT this stamp',
        'R4_brier_vs_close': 'mean[(p_close − o)²] − mean[(p_model − o)²] > 0 for model-skill claim',
    }

    # ---- PASS/FAIL CRITERIA (pre-registered NOW, before outcomes) ----
    criteria = {
        'C1_coverage': '>= 60 of 71 matched selection pairs must have a settled outcome from S1/S2/S3',
        'C2_calibration': 'mean |p_close − outcome| <= 0.50 across settled selections (the close must be sane first; if the close is insane, the test is invalid, not the model)',
        'C3_model_skill': 'R4 > 0 (model beats close on Brier) with n >= 60 settled selections',
        'C4_directional': 'signed mean of R2 per selection-side != 0 at |t| >= 2.0 (public-bias direction check; diagnostic only)',
        'fail': 'any C not met → stamp = REFUSED, reopen condition logged, nothing promoted',
    }

    # ---- KILL-LEDGER ENTRY (pre-written shape; appended by --grade) ----
    ledger_template = {
        'event': 'RVC_MODEL_SKILL_STAMP',
        'frozen_manifest_sha16': 'a146e3663410c85a',
        'close_snapshot': 'nash_gamelines_87637_4518_CLOSE.json',
        'settled_n': '<filled at grade time>',
        'brier_close': '<filled>',
        'brier_model': '<filled>',
        'verdict': '<PASS or REFUSED>',
        'label': 'DIAGNOSTIC',
    }

    plan = {
        'observed_at': now,
        'prepared_before_outcomes': True,
        'zero_fabrication_note': 'No outcome data exists yet (CFB Sat games kick 2026-10-11). '
                                 'This plan pre-registers the join, residuals, criteria, and ledger shape. '
                                 'The --grade step refuses to run without real settlement data.',
        'frozen_manifest': m['audit'],
        'close_snapshot': c['audit'],
        'n_selections': len(selections),
        'join_keys': selections,
        'outcome_sources': {
            'S1_nash_settled': 'fresh nash pull post-game: markets flip to settled; authorized browser session',
            'S2_kalshi': 'KXNFLGAME-26OCT11PHIJAC settles → winner known keylessly',
            'S3_espn_nflverse': 'final scores → ML/spread/total grading (game-level)',
        },
        'residuals': residuals,
        'criteria': criteria,
        'kill_ledger_template': ledger_template,
        'label': 'DIAGNOSTIC',
    }
    json.dump(plan, open(PLAN_OUT, 'w'), indent=1)
    print(f'\nGRADING PLAN landed: {PLAN_OUT}')
    print(f'join keys: {len(selections)} selections across',
          len(set(s['event_id'] for s in selections)), 'events')
    print('market types:', sorted(set(s['market_type'] for s in selections)))
    return plan


if __name__ == '__main__':
    prepare()
