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

- #4 CLV decomposition — DONE & PUSHED as claude/clv-decomposition-reland-rebased
  @ 62d2f123 (zero-conflict rebase; away-side moneyline dispersion bug fixed;
  migration safety proven on live Postgres incl. the original incident's drift
  scenario + P2022 graceful-degradation regression tests). Founder legs: merge
  + apply the two IF-NOT-EXISTS migrations.
- #5 Jarvis memory write path · #6 scheduled backtest harness — pending;
  revisit after the hardening wave lands.
- #8 grandpa-simple + cinematic UX pass · /glass-ledger frontier design pass —
  NEXT UP after current landings (design-now-flip-later on the flagship).
- #12 Sealed Engine experience · #13 Fantasy Engine 10x: FOUNDATION REVIVED —
  the stranded 9-commit engine floor (scheme-PROE, team defense, rolling
  windows, rights-gated MLB data plane, golden-verified) is rebased onto main,
  ALL suites green (66+192+1,146+7,680), PUSHED as
  claude/fantasy-engine-foundation-rebased @ 1b9c38b3 — founder-mergeable.
  BEFORE ANY PUBLIC SURFACE: rename competitor coinages (~350 SMASH/BURR/Solds
  occurrences flagged, ADMIN-only today) + edge-lab calibration for any
  confidence framing; pfr verdict gates the trench/WR family. Unblocks
  model-accuracy-leaderboard (stacks on the foundation).
- NEW stranded find: claude/hotfix-cockpit-page-auth (the cockpit-page-auth CI
  source scan the foundation's docstring references) — evaluate for salvage.
- World-model NFL feature admissions through the trials registry (orchestrator's
  own slice — the path out of FIRE_NOTHING) — starts once the 7-fix lands.
- PR #112 founder gates · PR #101 co-work migration · main hotfix merge — all
  still founder actions, unchanged.

## OPEN PRs vs main (founder merges; merge #119 first — it fixes live money-truth grading)

#119 salvage-settlement-guardrails · #120 glass-ledger-edge-engine (core build +
review fixes da86d279) · #121 fantasy-engine-foundation-rebased (PUBLIC-READY: coinage rename landed
7fa7892d — MSI/BSI/SVH, value-identity proven by golden suites) · #122 clv-decomposition-reland-rebased · #123
cockpit-page-auth-rebased · #124 frontier-superset-rebased (tasks #15-19
revived, shadow-only). All six carry the metric-fixture alignment fix; all
Vercel preview builds Ready. External review findings on #120: four fixed +
pushed, fifth covered by the in-flight gate-integrity slice.

## Merge-ready branches on origin (founder merges; all verified green)

- claude/fantasy-engine-foundation-rebased @ 1b9c38b3 — Fantasy Engine floor
  (trademark rename landing on top of it next).
- claude/clv-decomposition-reland-rebased @ 62d2f123 — task #4, migration
  safety proven live.
- claude/salvage-settlement-guardrails @ cdcd3e96 — LIVE settlement mis-grade
  fix (fail-loud, mandatory awayTeam) + scanner/CI bypass closures (staged-index
  secret scan, unfiltered PR triggers, fail-closed vercel-skip); 55/55 plant
  tests prove teeth. Recommended FIRST merge — it fixes money-truth grading.
- claude/fix-metric-source-fixture-alignment @ 568ccca6 — main's failing engine
  test (subsumed by the fantasy foundation branch; either order works).
- claude/cockpit-page-auth-rebased @ 29777d3c — G-1 per-page ADMIN checks on
  all 32 cockpit pages + scan-enforced (wired into test:cockpit +
  test:brand-safety); web suite 7,695 green. NOTE: fantasy-foundation branch
  carries the same require-admin helper — merge either first, the overlap is
  the identical file and resolves trivially.

## Post-activation product queue (sequenced after ledger activation)

Per-fixture prediction pages · llms.txt + read-only MCP over SETTLED ledger only
· EV/no-vig/CLV calculators · watchlist/alerts · contrarian-accuracy ledger stat
· Google News sitemap · nfelo-shape season table (+ our Wilson LCBs).

## Queue completions (2026-07-17, all on PR #120 unless noted)

- Task #5 Jarvis memory write path — DONE 195f847c (gated JARVIS_MEMORY_WRITE_ENABLED
  default off; also fixed a live stub overstatement in buildLiveMemoryStatus).
- Task #6 backtest harness — DONE 9405a7e9 (gated BACKTEST_HARNESS_ENABLED; cron
  documented-not-registered in reports/ops/backtest-harness-cron.md).
- Task #12 Sealed Engine ritual — DONE 57e3a3a5 (/sealed, method-opaque by type;
  gated SEALED_ENGINE_ENABLED; left live /engine untouched).
- Intel hardening wave (#34), DFS (#36), affiliate (#35), stranded salvage (#37) —
  all DONE earlier this session.
- Watchlist retention primitive — DONE (follow/alert loop). Additive
  founder-applied migration 20260717120000_add_watchlist (CREATE TABLE IF NOT
  EXISTS watchlist_entries — idempotency + zero-drift proven on live Postgres);
  follow open to every tier with per-tier caps (FREE/FANTASY 5, PRO 25, ELITE
  unlimited) → real 403 + upsell, never a cosmetic gate; alerts stay Elite-only
  via existing canGetAlerts AND graded-only (pickResult !== PENDING && settledAt
  set) — never an ungraded tip; dispatch inert (no channel wired,
  WATCHLIST_ALERTS_ENABLED default off). db.ts fails 503-not-500 when the table
  is absent. 68 tests; typecheck + full guardrail chain green. feature-gate
  "watchlists" reframed to minTier FREE / status preview / freePreview true.
- CI honesty fix — jarvis-memory not-wired-posture pin now forces stub mode via
  vi.doMock instead of assuming the ambient env is stub, so it passes under
  CI's real-DB "Test, type-check, lint, Prisma" job (was the one red test).
  Verified against a disposable real Postgres (54/54).

## NEW founder-gated flags added this session (all default OFF)

LINE_ARCHIVE_ENABLED, LINE_ARCHIVE_EU_PINNACLE, PUBLISH_LEDGER, SEALED_ENGINE_ENABLED,
JARVIS_MEMORY_WRITE_ENABLED, BACKTEST_HARNESS_ENABLED, WATCHLIST_ALERTS_ENABLED,
plus the sealed-holdout GSE_ALLOW_HOLDOUT_OPEN env for edge-lab. Nothing
flips without a founder setting it; every surface has an honest OFF state.

## Founder legs to activate the watchlist (all founder-gated, default-off)

1. Apply migration 20260717120000_add_watchlist (additive, IF-NOT-EXISTS, safe
   to run anytime) — until then the API/UI 503 honestly ("not activated yet").
2. To turn on graded alerts later: wire a real email/push channel at the TODO
   seam in apps/web/lib/watchlist/alert-dispatch.ts, THEN set
   WATCHLIST_ALERTS_ENABLED=true. Inert until both are done; Elite-only + graded-
   only enforced regardless of the flag.
