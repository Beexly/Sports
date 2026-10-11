"""THE MARRIAGE DOC — arXiv corpus + live papers + bus intel + our engines.
Writes THE_FLOOR.md: every equation class, its source paper, its data status, its kill test."""
import json, time

doc = {
    'observed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'title': 'THE FLOOR — every prediction equation we hold, married to its data, its paper, its kill test',
    'sources': {
        'local_corpus': '1,251 papers, 35 lanes (docs/arxiv-program/.../corpus-index.jsonl), verdicts 1203 ADAPT / 48 ADOPT',
        'live_arxiv': 'tonight: registry D published+confirmed (2604.09143), EVT tooling landed (2509.07261 nsEVDx), NEW CMP counts paper (2409.17129)',
        'bus_intel': 'agent-bus/inbox/from-motif: NFL metric catalog w/ formulas (EPA, CPOE, ANY/A, aDOT, TPRR/YPRR, success-rate rules), ryurko LOSO-CV honesty standard',
        'our_engines': 'DK ladder recon (262 fits r2 .96-.99), Kalshi devig live, 8 ILP portfolios, LineStar 93-week harvest, FTN charting 2022-26, NGS 2016-26',
    },
    'equation_stack': [
        # THE CORE: distributions
        {'slot': 'GAME SCORES', 'current': 'Gaussian close + alt-line residual <0.6%',
         'upgrade': 'Bayesian BIVARIATE Conway-Maxwell-Poisson [2409.17129] — handles score correlation AND dispersion; kills independent-Poisson',
         'data': 'pbp margins (READY)', 'kill': 'CRPS vs Gaussian-close bar 7.109 walk-forward'},
        {'slot': 'TEAM RATINGS', 'current': 'Kalman (thin tails)',
         'upgrade': 'Score-Driven (GAS) ratings [2604.09143 PUBLISHED + 2101.04040 rankings ext] — zero-EV score, sums-to-zero, t-innovations; Plackett-Luce worths for positional tiers',
         'data': 'margins (READY)', 'kill': 'CRPS bar; LOSO-CV calibration per ryurko standard'},
        {'slot': 'PROP TAILS', 'current': 'DK ladder = Gaussian implied',
         'upgrade': 'Non-stationary GPD via nsEVDx [2509.07261] w/ covariates (week, usage, weather) — registry C weaponized',
         'data': 'PBP play-lengths + ladders (READY)', 'kill': 'backtest 23-25 longest-X Brier vs book-implied'},
        {'slot': 'WEATHER', 'current': 'wind15+ = -5.41 total measured (549 games, fixed)',
         'upgrade': '3-layer: (1) physics drag+Magnus+density-altitude kick model [2206.02397, 1710.02784, physics/0505118], (2) EMOS ensemble post-processing → calibrated P(wind15) [1805.09091, ENS-10 2206.14786], (3) CRPS-trained like AIFS [2412.15832] + conformal gate [2606.19642]',
         'data': '549-game sample + free Pangu-Weather/GFS/ENS-10 (READY)', 'kill': 'wind15 coefficient stability LOSO; conformal null on calm weeks'},
        {'slot': 'LIVE REPRICING', 'current': 'none (dead PPD lanes)',
         'upgrade': 'Hawkes multivariate intensity on scoring events (registry A) → state-dependent drift in live totals',
         'data': 'PBP timestamps (re-pull needed)', 'kill': 'log-loss vs constant-rate AND vs close drift'},
        {'slot': 'CONTEXT FACTORS', 'current': 'pooled OLS (confounded)',
         'upgrade': 'DML Chernozhukov cross-fitting (registry G) — debiased rest/travel/turf coefficients',
         'data': 'pbp+schedule+residuals (READY)', 'kill': 'fold stability + placebo treatments'},
        {'slot': 'SIZING', 'current': 'plug-in Kelly',
         'upgrade': 'Posterior-Kelly MC over (mu,sigma) uncertainty (registry J) — honest fractional',
         'data': 'dk fits uncertainty (READY NOW)', 'kill': 'growth curves w/ parameter noise'},
        {'slot': 'BOOK WEIGHTS', 'current': 'equal-weight consensus',
         'upgrade': 'Hedge multiplicative weights on book log-loss (registry I) — learning line-shopping',
         'data': 'book snapshots (READY)', 'kill': 'weighted vs equal consensus log-loss walk-forward'},
        {'slot': 'COACHES', 'current': 'tendencies only',
         'upgrade': 'MaxEnt IRL reward recovery (registry B) — coach irrationality index theta_gap',
         'data': 'pbp decisions (re-pull needed)', 'kill': 'beat nfl4th AND market on next-season decisions'},
        {'slot': 'ABSTAIN', 'current': 'manual gates',
         'upgrade': 'MMD two-sample conformal drift gate (registry K) married to weather ensemble disagreement [2606.19642]',
         'data': 'team-state features (READY)', 'kill': 'net CLV improvement skipping flagged weeks'},
    ],
    'protocol_layer': {
        'file': 'dfs/DARK_LAYER_MAP.json',
        'summary': '13 surfaces: DK h2-bypass, nash browser-fingerprint, Kambi geo-gate, Kalshi keyless, LineStar unauth DNN, PFR in-page, nflverse open; 9 reusable protocol tricks',
    },
    'the_vault': {
        'file': 'dfs/true_theory.txt',
        'summary': '7 lessons: single-CDF engine, shade-dispersion signal (183/262 outliers), sigma squeeze 0.91-0.95x, base-rate-vs-edge-set bias, protocol-not-auth, client-ships-no-engine, field-as-final-parameter',
    },
    'honesty_standards': {
        'loso_cv': 'ryurko/nflscrapR-models: every model ships leave-one-season-out calibration BEFORE a consumer; failures documented dead',
        'gates': 'CollegeGuard + FreshnessGate + close-anchored CRPS bars + kill ledger (19-rule doctrine.py, 19/19 PASS)',
    },
}

json.dump(doc, open('dfs/THE_FLOOR.json', 'w'), indent=1)

# Also write the human-readable markdown
lines = ['# THE FLOOR — equations × papers × data × kill tests', '',
         f"_Built {doc['observed_at']}. Sources: 1,251-paper arXiv corpus (35 lanes) + live arXiv tonight + agent-bus intel + our engines._", '']
for e in doc['equation_stack']:
    lines.append(f"## {e['slot']}")
    lines.append(f"- **Now:** {e['current']}")
    lines.append(f"- **Upgrade:** {e['upgrade']}")
    lines.append(f"- **Data:** {e['data']}")
    lines.append(f"- **Kill test:** {e['kill']}")
    lines.append('')
lines.append('## Standards')
lines.append(f"- {doc['honesty_standards']['loso_cv']}")
lines.append(f"- {doc['honesty_standards']['gates']}")
open('dfs/THE_FLOOR.md', 'w').write('\n'.join(lines))
print('landed dfs/THE_FLOOR.json + dfs/THE_FLOOR.md')
print('equation slots:', len(doc['equation_stack']))
