# CODING AGENT — exact brief. Paste this entire file.

You are working in Beexly/Sports. Do the tasks below. Do not expand the scope.

## Repo and branch

- Repo: Beexly/Sports
- Branch: research/rating-atlas-2026-10-09-packet
- Do not touch main. main is e1260ae.
- Do not force-push research/rating-atlas-2026-10-09. An earlier pass on that branch deleted unrelated files.
- Do not edit packages/prediction-engine, trust gates, Stripe, or MODEL_VERSION.
- Do not add recon or security handlers (/hydra, /sqlmap, /crack, /shodan, /exposure).
- Do not open a PR to main. Commit on the research branch. Stop.

## Doctrine you must not reverse

- The closing line is the bar. A rating, a Brier, or a Shin z does not emit a pick.
- Listed spread is the book home number, favorite negative. mu_margin = -listed. Team totals: home = (T - listed) / 2, away = (T + listed) / 2. Listed -3 on 48.5 is 25.75 / 22.75.
- Shin closed root works. On -110/-110, z = 0.0476, fair 0.50/0.50.
- Glicko-2 is period-parallel. Canonical: 1464.05 / 151.52 / 0.059996 against the paper's 1464.06. Match to rounding, not exact. Sequential is the wrong update. Sigma stays near 0.06. It does not go to 2. Illinois is the volatility solver. Newton is not.
- Posterior intervals are 2.5/97.5 of the draws. analyze_nfl.ci() divides by sqrt(n). Do not cite home-field [1.54, 1.59] or sigma [13.34, 13.37]. Draws interval is about 0.98 to 2.16. Point estimate about 1.58. Ladder sd stays 13.45.
- Production NFL_EPA_HFA is 0.025 EPA/play. Do not retune it. Do not write 2.0 or 1.56 into production.
- Production wind is the nonlinear curve that does nothing at or below 10 mph. Do not retune it. Do not add +1.74 to a total. +1.74 is the weather-OLS prediction at 0 mph.
- There is no 100% engine. No-market 2025 weeks 1-6 was 55.8%, Brier 0.2868, 0.2464 after T = 7.512.
- Ledger IDs 0329, 0668, 1168, 1750, 2044 are swapped in the Deep Research brief. Do not wire those five ports under those IDs. 0329 is rugby EP. 0668 is NFL DPI, REJECT. 1168 is wisdom-of-crowds. 1750 is Cherny-Obloj. 2044 is QuantFactor REINFORCE.

## Already on the branch (do not rewrite)

docs/research/2026-10-09/rating-atlas/

- glicko2.py (sha 0e24548f) — period-parallel Illinois
- glicko2_idle.py (sha 38cefdf1) — idle step, self-check 200.27 / 201.08 / 204.57
- ci_fix.py, interval_fix.py, interval_from_draws.py
- team_total_sign.py, sign_and_interval.py
- engine_math.py, ratings2.py, calibration2.py, verify_claims.py
- BOARD.md, KILL_LEDGER.md, SESSION_LEDGER, V7_AUDIT.md, CODING_AGENT_HANDOFF.md

## Task 1 — wire the idle step

In docs/research/2026-10-09/rating-atlas/glicko2.py:

- Import or inline the idle step from glicko2_idle.py.
- After the period update, any player who was in the roster at period start and has zero games this period gets: rating unchanged, sigma unchanged, rd' = scale * sqrt((rd/scale)^2 + sigma^2). No volatility solve. No division by v.
- Do not change the parallel update for players who played.
- Add a self-check: from 1500 / 200 / 0.06, one idle period prints RD 200.27, rating 1500, sigma 0.06.
- Run python3 glicko2.py. The existing canonical asserts must still pass (1464.05 / 151.52 / 0.059996, first chord -5.626955, sequential about 1463.79, sigma not 2).

## Task 2 — land these files on the same branch

Copy into docs/research/2026-10-09/rating-atlas/:

- CFB_MODEL_DECISION.md (content below, or the file of that name from the session artifacts)
- The updated KILL_LEDGER.md that includes the college row under "Not killed, and not done"
- cfb_2026-10-10.md
- DEEP_RESEARCH_AUDIT.md
- run_cycle.py

Do not overwrite glicko2.py except for Task 1. Do not overwrite ci_fix.py or team_total_sign.py.

## Task 3 — do not build college tonight

College is an additional model. It is not a config flag on the NFL engine.

- packages/data-ingestion/src/cfbfastr-intake.ts on main is data intake only. Env-gated, fail-closed, null-on-missing. It does not price a game.
- packages/prediction-engine has no college code. Do not add any.
- Do not copy NFL sigma 13.45 or home-field 1.56 or NFL_EPA_HFA 0.025 onto college.
- Saturday 2026-10-10 is a college slate. No NFL. Document it. Do not score it.
- If you touch college at all, the only allowed change is a one-line pointer in BOARD.md to CFB_MODEL_DECISION.md. No model code.

## Task 4 — board

Append to BOARD.md, do not rewrite it:

- [ ] Idle step called from glicko2.py for zero-game players
- [ ] CFB_MODEL_DECISION.md landed. College is a separate model. Not started.
- [ ] v7 paste still has old ci(). Delivery file not rewritten.
- [ ] Market still missing from the 2025 weeks 1-6 backtest
- [x] Kill ledger current. Do not rebuild a killed row.

## Task 5 — use the team lineup. Do not invent a second one.

Control file: Beexly/agent-bus `BEEX-AGENT-TEAM.md`. If this prompt and that file disagree on fleet rules, that file wins. Project rules in Beexly/Sports still win for this task.

Org, do not relitigate:

- Garrett owns merges to main and cap raises.
- Motif is the lead. Motif is Muse, renamed. You do not require Motif to be online.
- Orca is the hands. Orca claims, executes in a worktree, heartbeats, writes a result, pushes. Orca does not decide strategy and does not publish.
- This repo pair is the system of record. Do not migrate to A2A, CrewAI, Agno, AutoGen, LangGraph, Paperclip, or Eyrie.
- Do not create an agent. A new `agents/<id>.yaml` requires Garrett.

This task is project `gse`. Honesty gate required. No live-bet placement language. No customer PII. Do not touch `signal-origin`, `framefit`, or `desk`. A recall from the wrong bank must return empty.

### Steps

1. Read `BEEX-AGENT-TEAM.md` and `docs/fleet-architecture-2026-10-08.md` in Beexly/agent-bus. Do not invent a lineup.
2. Confirm `bus/FREEZE` does not exist. If it does, stop and report. Do not claim.
3. Write the ticket at `bus/gse/inbox/rating-atlas-idle-2026-10-09/` with:
   - `TASK.md` — this brief, or a pointer to `docs/research/2026-10-09/rating-atlas/CODING_AGENT_PROMPT_EXACT.md` on the Sports research branch.
   - `status.json` schema_version 1 with: `id` = `rating-atlas-idle-2026-10-09`, `project` = `gse`, `state` = `open`, `budget_usd` = `2`, `idempotency_key` = `rating-atlas-idle-20261009`, `lease_holder` = null, `lease_expires` = null, `fence` = 0, `heartbeat_at` = null.
4. Claim by the rule in BEEX-AGENT-TEAM: pull first, `git mv` the inbox item to `bus/gse/claimed/`, increment `fence` and `attempt`, commit, push. A rejected push means someone else won. Pull and abort. Do not force-push.
5. Execute in a worktree on Sports branch `research/rating-atlas-2026-10-09-packet`. Heartbeat every 60 seconds. TTL 180 seconds. Do not reclaim on a fixed timer.
6. Route the work, do not swarm it. This is one stdlib edit plus a file land. One worker. Deep reasoning slot if needed: Claude Code or the coding agent already in hand. Do not stand up Freebuff, Jules, Devin, or a second model for this ticket. Cost ceiling is the `budget_usd` on the ticket.
7. On done, write `RESULT.md` with the three required fields or it stays in quarantine: `receipt` (tool or call id), `action_dependence` (files actually read), `response_validity` (exit code of `python3 glicko2.py`, or an explicit `no-tests`). Then `git mv` to `bus/gse/done/`.
8. Append one line to `bus/priors/handoffs.jsonl`: `from`, `to`, `project` = `gse`, `task_type` = `research-wire`, `passed` = true or false.
9. Do not promote Hindsight. Only Motif or Garrett may promote. Do not merge to main. Do not publish. Do not spend past the envelope.

### Routing for this ticket

| Need | Who | Why |
|---|---|---|
| Strategy and accept | Motif, or Garrett if Motif is down | Lead. Degrade-accept only if tests green, diff ≤ 80 lines, spent ≤ $2, idempotency key present, secret scan clean. |
| Execute | Orca, or the coding agent holding this prompt | Hands. Worktree. No strategy. |
| Review | The self-check in glicko2.py | No CodeRabbit install for this ticket. The assert is the review. |
| Record | Beexly/agent-bus `bus/gse/` | Outage buffer. Not a second source of truth for the math. The math lives on the Sports research branch. |

### Do not

- Do not create a player for college, for Glicko, or for the kill ledger.
- Do not call a frontier model to lint.
- Do not put a key in the ticket. Reject `sk_live_`, `sk_test_`, `AKIA`, `ghp_`, `xox`, `BEGIN PRIVATE KEY`.
- Do not mix this with Signal Origin. No sports ticket goes in `bus/signal-origin`.

## Acceptance

- python3 glicko2.py prints the canonical vector and the idle RD, and exits 0.
- No commit touches main, packages/prediction-engine, Stripe, trust gates, or MODEL_VERSION.
- No new dependency. Stdlib only in the research files.
- Commit message: "research: wire Glicko-2 idle step; land college decision and kill ledger"

## Stop conditions

Stop and report if:

- glicko2.py canonical assert fails after your edit
- a file you need is missing on the branch
- you are about to edit anything under packages/ or apps/

## College decision, in full

Additional model. Do not fold college into the NFL model.

Shared: Shin, calibration, conformal, CLV, Kelly, honesty gates.
Not shared: sigma, home field, rating scale, talent gap, covariates, market quality.
Build order if college is next: FBS games table and a real close join, fit sigma and home field on college residuals against that close, seal last season, score against the close. Do not start from 13.45 or 1.56.

## Kill ledger, reopen rules

Do not rebuild these:

- Reverse line movement / public percent. Reopen on a keyless feed, or 500 settled CLV bets with a positive t-stat against the close.
- 10 Hz tracking. Reopen on a Kaggle key plus a pre-registered CLV test.
- PFF and DVOA. Reopen on a head-to-head that beats public EPA against the close, after cost.
- Swarm, VPS, GPU, warehouse. Reopen when a measured job exceeds a local run, with a dollar figure.
- Situational covariates against the close. Reopen on a leakage-free residual against the close. A win against the open does not count.
- Sequential Glicko-2 as canonical. Never.
- Mean-CI as a posterior. Never. Print draw percentiles.
- +1.74 as a total addend. Never.
- The five swapped ledger ports. Reopen only after a human reads the PDF.
- A 100% engine. Never as a claim.
