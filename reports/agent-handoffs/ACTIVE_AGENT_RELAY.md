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

## FOUNDER RULINGS 2026-07-16 (supersede items 1-2 below)

- **Affiliate: ON (disclosed-conflict model).** "No affiliate ever" is amended:
  affiliate revenue is pursued with per-link + sitewide disclosure, structural
  separation of pick generation from partner economics (machine-checked
  guardrail), and the absolute "only when our number is right" claim retired
  from all copy. LIVE activation still requires: signed partner agreements,
  state affiliate licensing where required, founder registry approval + merge.
- **DFS: DOMINATE via the exact-optimizer design-around** (provably optimal,
  deterministic — no randomized-column iteration). FTO opinion before
  real-money marketing remains recommended, not blocking the build.

## NEEDS FOUNDER (live list)

1. ~~Affiliate posture~~ — RESOLVED (ruling above). Founder legs remaining:
   sign partner agreements, state licensing/registration, approve registry
   rows, merge + env.
2. ~~DFS patent FTO~~ — build unblocked via design-around (ruling above);
   FTO opinion queued as a founder legal errand, not a code gate.
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

## Standing goal (founder, 2026-07-16)

Work until everything in this program is reviewed, accounted for, improved,
polished, and coded to frontier standard. IMPROVE, NOT REMOVE. Breadth over
tunnel vision. Token-smart execution. This section IS the accounting.

## In-flight slices (2026-07-16 ~21:05Z — verify → land → push as each reports)

1. Edge-lab gate-integrity 7-fix (delegated, sonnet, worktree)
2. Affiliate trust layer: /how-we-make-money + per-link disclosure + separation
   guardrail + activation runbook (delegated)
3. DFS exact optimizer — deterministic DP, brute-force-verified, exposure suite
   (delegated)
4. StatKing scores computed from real state — improve-not-remove (delegated)
5. pfr_advstats license verdict — TOS-trench research (delegated)
6. MLB Statcast + platoon loaders, prior-season leak-free (delegated)

## Standing workstreams (older tasks, accounted for — not dropped)

- #4 CLV decomposition (bookDisagreementAtLock at publish) — in progress
  pre-wave; fold into line-archive activation work when flags flip.
- #5 Jarvis memory write path · #6 scheduled backtest harness — pending;
  revisit after the hardening wave lands.
- #8 grandpa-simple + cinematic UX pass · /glass-ledger frontier design pass —
  NEXT UP after current landings (design-now-flip-later on the flagship).
- #12 Sealed Engine experience · #13 Fantasy Engine 10x (owner mandate; SMASH/
  BURR/RVS ports must be renamed + edge-lab-calibrated before any confidence
  framing; pfr verdict gates the trench/WR family).
- World-model NFL feature admissions through the trials registry (orchestrator's
  own slice — the path out of FIRE_NOTHING) — starts once the 7-fix lands.
- PR #112 founder gates · PR #101 co-work migration · main hotfix merge — all
  still founder actions, unchanged.

## Post-activation product queue (sequenced after ledger activation)

Per-fixture prediction pages · llms.txt + read-only MCP over SETTLED ledger only
· EV/no-vig/CLV calculators · watchlist/alerts · contrarian-accuracy ledger stat
· Google News sitemap · nfelo-shape season table (+ our Wilson LCBs).
