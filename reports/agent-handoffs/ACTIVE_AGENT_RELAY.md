# ACTIVE AGENT RELAY — single source of current build state

Last updated: 2026-07-16T20:45Z (Fable 5 orchestrator session). Update this file
whenever a milestone lands or a gate changes. New agents/sessions: read this
FIRST, then `FINAL_REPORT.md`, then `reports/edge-lab/INTEL-RECONCILIATION-2026-07-16.md`.

## Current goal

Intel hardening wave (task #34) on branch `claude/glass-ledger-edge-engine`
(founder-authorized push channel; deploys ONLY happen when the founder merges).
Glass Ledger + Edge Engine core build is COMPLETE and accepted (FINAL_REPORT.md).

## Hard constraints (unchanged, non-negotiable)

- No publish/deploy/SHADOW flip/MODEL_VERSION bump/spend/external sends.
- Sealed 2025 holdout stays sealed. Fire on calibrated edge, never confidence.
- No affiliate operations. Honesty over completion — never weaken a test.
- Rights red lines (INTEL-RECONCILIATION §RIGHTS): no automated scores24
  monitoring; FantasyPros non-commercial API (registry entry live); pfr_advstats
  ports on hold; SMASH/BURR/Solds need GSE-original names; no verbatim FG prose.
- Agent worktrees snapshot MAIN, not this branch — every delegated worktree
  agent must `git reset --hard claude/glass-ledger-edge-engine` FIRST.

## Wave state (2026-07-16 evening)

| Slice | State |
|---|---|
| FantasyPros rights entry + fixture alignment + data-rules note | LANDED `5f949e06` |
| Public-number audit (FTC substantiation map) | LANDED `827be61e` (report: reports/audits/) |
| §5 trials registry + BH-FDR + registered MI admission | LANDED `c5e3cca9` (edge-lab/trials-registry.ts) |
| Pinnacle eu-region archive leg (double-gated, inert) | LANDED `575f6baf` |
| Substantiation guards (Wilson-floored hit rates, blog numeric-claim detector, 0-0-0 dead path) | LANDED `40fbda81` |
| Edge-lab gate-integrity 7-fix slice | IN FLIGHT (delegated; fable pool 529'd 3x, rerun on sonnet) — fixes: fold-disjointness assertion; asof-store allowlist-only closing flag; tuneTau→learnThenTest; vig-inclusive breakeven (strictObtainable); placebo sign-integrity WARN; holdout env gate + guardrail scanner; readiness-matrix trueEv artifact-driven |
| NFL world-model features → asof-store → MI probe/logit-pool (path out of FIRE_NOTHING) | QUEUED — only through the trials registry; starts after the 7-fix slice lands |
| MLB Statcast + platoon-split loaders (§6 parity) | QUEUED |
| DSR/White-RC/SPA model admission | QUEUED (registry records model trials now so the count stays honest) |

## NEEDS FOUNDER (live list)

1. **Affiliate posture (P0)** — /go/[slug] + affiliate ledger vs "no affiliate,
   ever" doctrine: kill/lock the surfaces or drop the absolute claim. Blocks
   Glass Ledger publicization.
2. **DFS patent FTO (P0)** — Betfully/LineStar family vs dfs-optimizer.ts; MILP
   design-around available on request.
3. **StatKing hardcoded scores** — /stats + /stats/proof render literal 61/100
   self-assessments (audit findings 1-2): compute, reframe, or remove.
4. Line-archive activation ORDER: apply migration → `LINE_ARCHIVE_ENABLED=true`
   → `LINE_ARCHIVE_EU_PINNACLE=true` (Pinnacle leg now exists; mind Odds API
   credit budget).
5. Named external reviewer before `PUBLISH_LEDGER` ("independently
   reproducible" until then, never "audited").
6. Pricing ceiling strategy (sharp $199-299 cohort vs $24.99 Elite) — AUTHORITY-
   phase question.
7. Env verifications: Stripe key mode, ANTHROPIC_API_KEY validity, deployed
   MODEL_VERSION vs v5.1.0, TEAM_RATES_AVAILABLE, CALIBRATION_ADJUSTMENTS_ENABLED.
8. Merge `claude/fix-metric-source-fixture-alignment` (pushed) to fix main's
   failing engine test; PR #112 founder gates; PR #101 co-work migration.

## Post-activation product queue (sequenced after ledger activation)

Per-fixture prediction pages · llms.txt + read-only MCP over SETTLED ledger only
· EV/no-vig/CLV calculators · watchlist/alerts · contrarian-accuracy ledger stat
· Google News sitemap · nfelo-shape season table (+ our Wilson LCBs).
