---
name: autonomous-edge-loop
version: 1.0.0
description: Continuous falsifier-led edge hunt. Never stop. Falsify first. Commit+pushed each cycle. LEDGER + agent.md live.
trigger: User directs continuous autonomous work with falsifier plus ledger updates, or says to continue all night long without asking.
---

# Autonomous Edge Loop — Continuous Falsifier-Led Hunt

Class-level skill for long-running predictive validation loops that stay autonomous — never stop to ask, never claim SURVIVOR without falsify passing all four gates.

## Non-negotiable loop (do all, never skip)

1. Falsify falsifyBind over real backtest rows (not synthetic). All four gates pass → SURVIVOR (rare); any fail → KILLED with detail; n < minN → PARKED (preserve e-value). Never SURVIVOR without all four.
2. Log verdict in handoff/EDGE_LEDGER.md (verdict, e-value, row count, season range, bind tag). STARVED = success.
3. Preserve Lane A preregisters (PRE-2..PRE-7 per LEDGER.md:76 / EDGE_LEDGER.md:152-158).
4. Update AGENTS.md; write memory/YYYY-MM-DD.md; commit named files (git add <file> — never -A); never invent.
5. Commit message: [overnight-autonomous|<tag>] <verdict>; <action>. Push git push -u origin <branch> every cycle.
6. Continue — never ask, never resume/wait.

## Hard-captured pitfalls (this session)

- Multiplicity kills persistence (YACoe real 341 rows 2022-2025, validation r~0.4025 n=107, holdout r~0.4254 n=84, but e-value → 0 → KILLED). Positive r ≠ edge.
- TPR needs routes column; NGS lacks it; proxy = pbp_participation_2024.csv (~1300 matched, overcounts blocking-assigned); directional only.
- Bus fields (avgTimeToThrow, pressureRate, missedTackleRate, pctAttemptsGte8Defenders, avgTimeToLos, airYardsToSticks, ryoePerAtt, avgSeparation, etc.) in covariate-bus.ts 01a07c2c — bind gap not data gap.
- Fail-closed: bind contracts drop (refuse: no_prior_row) on missing prior / null covariate; never impute.
- Real sources: data/nflverse/ngs_receiving_2021_2025_harness_rows.json, tpr_harness_rows_2024.json, yacoe_real_backtest_results.json.
- KILLED is progress; commit and push every cycle.

- Never invent SHAs, test counts, or evidence. If a file is missing (e.g. proposed FINISH-LINE-PLAN.md at docs/ops/), say MISSING — verify with `find`/`ls` and report; never fabricate the file or claim it's present.
- Cross-reference external plans against `docs/ops/CANONICAL.md` (line 3: CANONICAL wins). Read actual file contents; don't summarize from memory.
- Safe autonomous rules: server stays live (verify `netstat`); repo NOT pushed to `main`; no gate/env edited; no schema/migrations; no `.env`/`.npmrc` edit; no mock picks/benchmarks; no false `DONE`; claim requires real SHA; memory cap → durable file (`docs/agents/agent-md-...md`). Push ONLY with explicit authorization.
- Evidence chain: each claim traces to a command/file read (`git rev-parse`, `ls docs/gse/finish-line-*`, `grep source-registry.ts`, `netstat` server, `find` missing docs). Report exact line/command.

## Verify per cycle

node/tsx → out.overall; git status -sb; SHA == remote; npx tsc --noEmit (bind/module errors block); secret-scan staged.

## References

- references/overnight-verdict-2026-08-24.md (falsify KILLED, Lane-A status)
- references/falsify-real-data-recipe.md (BacktestRow from NGS harness)
- references/session-evidence-2026-08-27.md (verified commands/files: git SHA, CANONICAL.md, source-registry.ts forbidden verdict, server preserved, ZIP/docs verified, agent-md durable file, no destructive actions)
- LEDGER.md:76; EDGE_LEDGER.md:152-158.
