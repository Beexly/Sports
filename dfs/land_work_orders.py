"""Land the cross-book residual + the three work-order closes."""
import json, time

now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

# WORK ORDER 1: EDGE#5 cross-book residual (real numbers)
edge5 = {
    'observed_at': now,
    'test': 'EDGE#5 cross-book residual — Kalshi-implied distribution vs DK-implied, same game (PHI@JAC)',
    'game': 'PHI Eagles @ JAC Jaguars (London, Sun 9:30 AM ET)',
    'sources': {
        'kalshi': 'dfs/kalshi_kxnflspread_phijac.json + kalshi_kxnfltotal_phijac.json + ML markets (devig)',
        'dk': 'ESPN/DK scoreboard: JAX -7.5, total 41.5; Gaussian sigma 13.3 (EDGE#1b global)',
    },
    'kalshi_implied': {'mu_margin': 7.3, 'sigma_margin': 25.0, 'median_total': 42.5, 'ml_devig_jac': 0.765},
    'dk_implied': {'mu_margin': 7.5, 'sigma_margin': 13.3, 'total': 41.5},
    'cross_book_residuals': {
        'margin_mu': '-0.2 pts (near-zero — books agree on the level)',
        'margin_sigma': '25.0 vs 13.3 = Kalshi implies WIDER margins ( NOTE: the 2-rung solve is noisy at Kalshi\u2019s wide 1.5→9.5 gap; treat as direction, not point estimate)',
        'total_median': '+1.0 pt (Kalshi total 42.5 vs DK 41.5)',
        'ml_devig': '+5.1pp (Kalshi 76.5% vs DK-spread-implied 71.4%) — the largest single divergence',
    },
    'verdict': 'INFRASTRUCTURE PASS — cross-book residuals computed from real prices on both books. '
               'The +5.1pp ML divergence is the largest and most actionable (if it survives at settlement). '
               'The sigma divergence is direction-only (2-rung solve limitation). '
               'Diagnostic: no trade recommended.',
    'label': 'DIAGNOSTIC',
    'reopen': 'Kalshi + DK settle Sun → grade the +5.1pp ML divergence and the +1.0pt total residual against outcomes',
}
json.dump(edge5, open('dfs/edge5_crossbook_residual.json', 'w'), indent=1)

# WORK ORDER 2: prop conditional residuals — status
prop = {
    'observed_at': now,
    'status': 'INFRASTRUCTURE PASS (partial) — nash game-lines payload captured live in-session; '
              'schema verified (events/markets/selections/trueOdds/participants). '
              'BUT the payload is CFB game-level (ML/Spread/Total only, subcat 4518). '
              'PLAYER-PROP ladders (subcats 9524/16569-16571, NFL) require per-event pulls '
              'through the chrome-wf session (the nash browser-fingerprint path). '
              'The 266 CFB prop fits already exist as the reconstruction proof (r2 0.96-0.99).',
    'conditional_tables': 'NOT YET RUN — needs NFL prop ladder pulls. The frozen manifest has '
                          '855 games w/ closings+outcomes but no player-prop ladder data. '
                          'The CFB 183-outlier table is the methodological template.',
    'verdict': 'INFRASTRUCTURE PASS for the CFB reconstruction; player-prop NFL conditional '
               'tables REFUSED (data gap: no NFL prop ladder on bus)',
    'reopen': 'nash NFL player-prop subcat pulls (9524/16569-16571) via chrome-wf → '
              'reconstruct (mu,sigma) per NFL player → conditional residual tables → RVC',
    'label': 'DIAGNOSTIC',
}
json.dump(prop, open('dfs/prop_conditional_status.json', 'w'), indent=1)

# WORK ORDER 3: JEV optimizer RVC
jev = {
    'observed_at': now,
    'status': 'REFUSED — no contest outcome data on the bus for a completed slate with '
              'JEV-arbitrated lineups. The JEV machinery (Monte Carlo → p90/p99/CeilEV/DupRisk '
              '→ epistemic arbitration) has hooks but no graded output to compare against.',
    'what_exists': 'DKSalaries-Week3 CSV (slate salaries), LineStar 93-week ownership data, '
                   'the 8 ILP showdown portfolios (diagnostic), pull_entries.py (cookie-authenticated)',
    'verdict': 'REFUSED (data gap)',
    'reopen': 'user exports DK cookies → pull_entries.py → contest outcome enumeration → '
              'consensus.py → JEV-arbitrated lineups vs actual field → residual table',
    'label': 'DIAGNOSTIC',
}
json.dump(jev, open('dfs/jev_rvc_status.json', 'w'), indent=1)

# Update inventory addendum
add = {
    'observed_at': now,
    'EDGE5_crossbook': 'INFRASTRUCTURE PASS — +5.1pp ML divergence, +1.0pt total divergence, computed from real prices both books',
    'prop_conditional': 'INFRASTRUCTURE PASS (CFB reconstruction proof exists); NFL player-prop tables REFUSED (data gap)',
    'JEV': 'REFUSED (no graded outcomes on bus)',
    'structural_gap_status': 'NFL RVC manifest CLOSED. Cross-book residuals COMPUTED. Prop conditional tables AWAITING NFL ladder pulls.',
}
json.dump(add, open('dfs/NFL_INVENTORY_ADDENDUM2.json', 'w'), indent=1)

print('landed: edge5_crossbook_residual.json, prop_conditional_status.json, jev_rvc_status.json, NFL_INVENTORY_ADDENDUM2.json')
