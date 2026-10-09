# Kill ledger — 2026-10-09

A kill is not a deletion. Each row says why it was killed, what would reopen it, and the research that has to exist first. Do not rebuild a killed item because a later paste restates it.

## Killed

### Reverse line movement / public betting percent
Why: no keyless feed. A paid odds API does not earn its cost until the CLV ledger has 500 settled bets with a positive t-stat against the close. Public percent is not the close.
Reopen when: a keyless source exists, or the CLV gate above prints.
Research: covers.com is a browser pass, not a feed. Do not scrape it into the hot path.

### 10 Hz player tracking
Why: Big Data Bowl needs a Kaggle key. Violates the keyless constraint. nflverse NGS summaries are the public substitute.
Reopen when: a key exists and a pre-registered test shows tracking adds CLV the close does not already have.
Research: the 2026-09-18 tracking notes on agent-bus are the start. They are not a model.

### PFF grades and DVOA
Why: proprietary. Open EPA, CPOE, and success rate are the public substitutes. A subscription is not the next step.
Reopen when: a head-to-head on the same games shows PFF or DVOA beats public EPA against the close, after cost.
Research: none run. Do not cite a vendor claim as that test.

### Always-on agent swarm, VPS, GPU, warehouse
Why: the dataset fits in SQLite. A season of pbp is about 19 MB compressed. Eleven EPL seasons are smaller. A swarm burns money and creates a second source of truth.
Reopen when: a measured job exceeds a local run, with a dollar figure and a kill condition.
Research: the Deep Research cost table. Default is zero.

### Situational covariates against the close
Why: rest, travel, timezone, and altitude did not survive against the closing spread in this stack. They are for early lines.
Reopen when: a leakage-free residual against the close, with n and a standard error, shows a non-zero effect. The sign convention is margin + listed_spread.
Research: context_engine.py is the test. A positive result against the open is not a reopen.

### Sequential Glicko-2 as the published update
Why: the published update is period-parallel. Sequential writes the new RD back and is order-dependent. Sigma does not go to 2.
Reopen when: never as the canonical update. A week-as-period NFL board is sequential in practice. That is a period decision, not a reason to relabel the algorithm.
Research: glicko2.py self-check. Twelve wins: parallel about 2581, sequential about 2143.

### Mean-CI as a posterior interval
Why: analyze_nfl.ci() divides by sqrt(n). Home-field [1.54, 1.59] and sigma [13.34, 13.37] are CIs of the mean. The draws interval is about 0.98 to 2.16.
Reopen when: never. Print 2.5/97.5 of the draws.
Research: ci_fix.py, interval_fix.py.

### +1.74 as a per-game total addend
Why: it is the weather-OLS prediction at 0 mph. File mean is +0.67 on 3,471 or +0.55 on 3,368. Carry the join count.
Reopen when: never as an addend.
Research: LOOP6_DELTA.md.

### The five Deep Research ports under those ledger IDs
Why: the IDs are swapped. 0329 is rugby EP. 0668 is NFL DPI, REJECT. 1168 is wisdom-of-crowds. 1750 is Cherny–Obłój. 2044 is QuantFactor REINFORCE.
Reopen when: a human reads the PDF and writes a one-sentence port against the real file. Not before.
Research: docs/arxiv-program/research/2026-09-21/arxiv-deep/. Count the directory. Do not cite a blank count.

### A 100% prediction engine
Why: the no-market 2025 weeks 1–6 backtest was 55.8%, Brier 0.2868, 0.2464 after T = 7.512. The EPL model was 1.047 against Pinnacle 0.966. The close is the bar.
Reopen when: never as a claim. A model that beats the close out of sample, after cost, with a deflated Sharpe, is a result. It is still not 100%.
Research: backtest.py. Add the close before adding another rating.

## Not killed, and not done

- Idle Glicko step. Coded in glicko2_idle.py. Self-check 200.27 / 201.08 / 204.57. Not yet called by the packet glicko2.py.
- Period definition for NFL Glicko. Week versus multi-week. Human decision.
- tau fit. Not identified. Stays 0.5.
- EPL showdown re-run. Needs research.db.
- Wind re-fit. Needs a wind column.
- Market in the NFL backtest. The accuracy work.
- Ipswich .get in fit_engines.py.
- v7 paste still contains the old ci().
- College football model. Intake exists on main (cfbfastr-intake.ts). No college model in packages/prediction-engine. Do not port NFL 13.45 or HFA 1.56. See CFB_MODEL_DECISION.md.
