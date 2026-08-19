# Agent ledger

One row per unit of work. **Every agent working on this repo reads this file first,
claims its row, and writes its evidence when done.**

**Also read the live truth surface before acting:**
`https://www.galaxysportsedge.com/api/ops/public-surface-truth` — deployment SHA,
gates, credit stack, Jynx lane plan, calibration. On 2026-08-19 it disproved a
"leaked Anthropic key" alarm (the value was Vercel placeholder text; the real
value is `auto`) and would have prevented a week-old open PR (#369) from being
rebuilt twice by different agents. Dashboards and prose reports drift; this
endpoint and this ledger are the two ground truths.

Validated by `scripts/ops/check-agent-ledger.mjs`, which runs in CI via
`apps/web/__tests__/agent-ledger.test.ts`. A malformed or dishonest row fails the
build.

## Why this exists

Four agents work on `Beexly/Sports` — a local Hermes runner, GitHub Copilot, a
browser agent, and Claude Code sessions. They share no memory. On 2026-08-19 that
cost three separate collisions in one day:

- Copilot and Hermes each built the same fabricated `signup-workflow` feature,
  independently, neither knowing the other had.
- A Claude session began reimplementing `H-L` while it was assigned to Hermes.
- Hermes read "run the queue" as a CSV import queue and processed a census file
  instead of the task queue.

Git is the only substrate all four agents actually touch — none of them can reach a
Postgres or Redis memory store. So the ledger is a file, and the enforcement is a
guard, not a convention.

Related prior art, and why it is not used: `Beexly/fablechain` carries an
`AgentMemory` (Postgres + Redis) and a `TaskBacklog`. Over its last 200 commits the
agent implemented `feat(faucet): implement testnet faucet backend` **nine times** with
an identical subject line, because `TaskBacklog.ts` is a `const` array and completing
a task never removes it. Persistent memory alone does not prevent duplicate work.
Evidence does.

## Rules

1. **Claim before you start.** Set `Owner` and `Status: CLAIMED` in the same commit
   that begins the work. An unclaimed row is fair game; a claimed row is not yours.
2. **Never edit a row you do not own**, except to add a `BLOCKED` note explaining a
   dependency.
3. **`DONE` requires evidence.** Put a commit SHA (7+ hex chars) or a `#123` PR
   reference in `Evidence`. The guard resolves SHAs against the repo — a hash that
   does not exist fails the build. "I completed it" is not evidence.
4. **If you cannot push, you are `UNPUSHED`, not `DONE`.** Record the local branch
   and SHA so the work can be recovered. Eight rows sit in this state right now;
   every one of them exists on exactly one laptop.
5. **`CANCELLED` requires a reason** in `Evidence`, not a hash.
6. **Titles must be unique.** Two rows describing the same work is the exact failure
   this file exists to catch, so the guard rejects it.
7. **One row, one unit of work.** If scope grows, add a row; do not widen a claimed one.

## Owners

| Owner | What it is |
|---|---|
| `hermes` | Local Hermes runner (OpenRouter free models), on the founder's machine |
| `copilot` | GitHub Copilot coding agent, runs on a GitHub runner |
| `browser` | Browser agent with dashboard access (Vercel, Anthropic console) |
| `claude` | Claude Code session (remote container) |
| `founder` | Garrett — owner-gated decisions only |
| `—` | Unclaimed |

## Statuses

`OPEN` · `CLAIMED` · `BLOCKED` · `UNPUSHED` · `DONE` · `CANCELLED`

`UNPUSHED` is the honest state for work that is finished but lives only on one
machine. Hermes is instructed never to push, so its deliverables sit on a local
branch whose SHAs no other clone can resolve. That is not `DONE`: one laptop is
the only copy, and nobody else can verify or build on it.

## Ledger

<!-- LEDGER:BEGIN -->

| ID | Title | Owner | Status | Evidence |
|---|---|---|---|---|
| H-A | Isotonic PAV calibration | hermes | DONE | 62e32730 on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-B | Cron matrix generator | hermes | DONE | 4b961782 on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-C | E-process sequential test | hermes | DONE | f53b229e on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-D | markClosingSnapshots behind a flag | hermes | DONE | 0a447f98 on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-E | CLV census on a Neon branch | hermes | UNPUSHED | output CSV on founder machine: docs/ops/calibration/2026-08-18-clv-census.csv, 1161 rows; Neon branch since deleted |
| H-F | DOC_DRIFT.md audit | hermes | DONE | e668c4c4 on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-G | Suppression curve vs random and oracle baselines | hermes | DONE | 63e84c32 on origin/hermes/sprint-backup-20260819, verified ancestor 2026-08-19 |
| H-K | charge.refunded revocation behind REFUND_REVOKES_ACCESS | claude | DONE | e69aa93c on origin/hk/refund-revocation — REIMPLEMENTED by fleet after Hermes confirmed "never implemented". 19 new tests, 72/72, default-OFF structural. Adversarial review confirmed 1 major (active-subscription refund lock-in) + hardening list; revision is C-11 before any merge |
| H-L | health-alert stateless cooldown + portable payload | claude | DONE | b9ec799 |
| H-M | Cron no-op audit | hermes | DONE | cd5086f7 on origin/hermes/h-m-cron-audit; data-driven early-return proposal only, ~60/day off-season, 576/day figure withdrawn |
| H-N | Env-shape validator | hermes | CLAIMED | — |
| H-O | Repair the @/lib/stripe test mock | claude | DONE | ab9f9c2; superseded by #369 single-seam version — the fix had been sitting mergeable in #369 for 12 days and was rebuilt twice for lack of a ledger |
| H-P | Triage the 73 CI test failures | claude | DONE | #434: every cluster root-caused; fixes shipped for checkout, copy, nflverse, waitlist, kill-switches, PAVA |
| C-5 | PAVA forward-violation bug in calibration core | claude | DONE | 9627379 |
| H-Q | Fix remaining singleton test failures (triage notes in v7 handoff) | hermes | DONE | 14b74b5c, merged via 3e997adf; full apps/web suite ZERO failures locally for the first time this session |
| F-4 | Authorize one-time Hermes push of its local sprint branch (8 UNPUSHED deliverables, single-copy risk) | founder | DONE | 63e84c32 (sprint-backup tip) + cd5086f7 (h-m tip) both on origin, independently verified; grant spent |
| C-1 | vercel.json guard drift + drift test | claude | DONE | 657a7f1 |
| C-2 | Land v5.2.6 calibration evidence | claude | DONE | 175c44f |
| C-3 | Declare appliedPauseGroups + RUN_GENERATE_SIGNAL_SLATE | claude | DONE | 1d39021 |
| C-4 | Agent ledger + guard | claude | DONE | 65e6474 |
| X-1 | signup-workflow scaffolding | copilot | CANCELLED | fabricated feature; auth is Google OAuth only via PrismaAdapter, no signup flow exists |
| X-2 | Delete CLAUDE_PROVIDER to fix AI routing | browser | CANCELLED | doubly wrong. (1) Original diagnosis false: value is "auto", not a key. (2) Deletion is NOT inert in production: with clouds configured and no JYNX_MODE, empty -> mode "anthropic" -> zero cloud attempts -> CASH Anthropic, dropping the azure/vertex credit lanes that "auto" selects. provider-mode-failsafe.test.ts covers UNRECOGNISED values only — citing it for deletion was a category error (fable). Prerequisite for any future deletion: set JYNX_MODE=auto first |
| F-1 | Rotate the Anthropic key found in CLAUDE_PROVIDER | browser | CANCELLED | false premise: live truth surface returns claudeProvider "auto"; the sk-ant-api03-aB text was a Vercel placeholder misread, then propagated by the orchestrator. No Anthropic key was ever exposed there. Browser agent correctly refused the rotation script |
| F-2 | Decide REFUND_REVOKES_ACCESS default | founder | OPEN | decision made (fable): stays OFF through H-K merge; flip to true after ONE observed production refund revokes correctly in logs; the env flip itself is a hands task |
| F-3 | Promote or remove apps/web/app/api/v1 | claude | DONE | 149e469f — RULING (delegated authority): PROMOTE. The tree is not a shadow — signals/probabilities/openapi are functioning, key-authed, rate-limited, RED-honest B2B routes; deleting working revenue surface mid-launch is malpractice, and permanent-red trains everyone to ignore CI. Promotion executes the machinery's OWN ceremony (promotion-readiness.ts gates: owner-approval-recorded via founder delegation, rollback evidence = git revert of the route commits, raw-key-absence proof), never bulldozes it. Implementation is C-8 |
| C-8 | Execute the api-v1 promotion ceremony: record doc, guard route-tree check to exact-3-route allowlist (new routes still fail), promotion-readiness gate + ~13 tests aligned to post-promotion model — own PR, small diff | claude | DONE | 149e469f; 69/69 across ten api-v1 suites, full suite 41 to 11 failures, guard negative-tested with a rogue route, no assertion weakened |
| C-7 | Triage the residual failure set: cockpit-jarvis-trend-api, cockpit-picks-glance, honest-degraded-states, picks-daily-limit-meta | claude | DONE | 41a971a0 — four stale assertions, zero real defects: a regex that could not cross a quote, a premium constant misread as a paywall regression, a query shape replaced by a clearer derivation, and honest copy improved past its pinned wording. 36/36. NOTE: the original "CI-only" framing was wrong — these fail locally too; gse-waitlist/backfill-independent-trueprob/espn-odds-client are genuinely CI-only and remain unowned (see C-9) |
| C-9 | Genuinely CI-only failures (pass locally, fail in CI): gse-waitlist 6, backfill-independent-trueprob 2, espn-odds-client 1 — almost certainly env divergence between the CI runner and dev containers | claude | DONE | e2c3c9f7 + 2f229d3b — the "env divergence" framing was wrong on all three. backfill: test pinned the pre-RES-lift plain average; the sharpness-weighted blend is deliberate; suite lives in packages/ingestion-pipeline which apps/web-scoped local runs never executed. gse-waitlist: CI uses the durable Postgres limiter which resetRateLimits() cannot clear; 11 POSTs shared one "anon" key at 5/60s, flapping on the window boundary — each POST now has its own client IP. espn-odds-client: fixture commence date 2026-08-10 aged out of the client's -6h..+21d window on Aug 11 — deterministically red since; fixture date now dynamic. CI-green confirmation pending the run on 2f229d3b |
| C-6 | Drive PR #369 to green and merge (invoice.paid alias, auth-aware smoke, single-seam checkout mock) | claude | DONE | #369 |
| R-1 | Rotate the ~25 Hermes .env credentials exposed in a session transcript (Fireworks, Together, DeepSeek, OpenRouter x2, Vercel first); delete the browser agent's own mistyped 401 gateway key | browser | OPEN | APPROVED (fable) 2026-08-19; these are the real exposure, not the phantom sk-ant key |
| R-2 | Set JYNX_MODE=auto in Production+Preview (belt-and-braces so a future CLAUDE_PROVIDER deletion is genuinely inert) | browser | OPEN | APPROVED (fable) 2026-08-19 |
| R-3 | Redeploy and confirm contentPlanPrimary flips off cerebras_free to the OpenRouter secondary (CEREBRAS_API_KEY removed; live surface still shows the old plan) | browser | OPEN | ELEVATED 2026-08-19: this redeploy ALSO activates THE_ODDS_API_KEY (truth surface shows oddsKeyPresent false — env saved after the b71f7e2 build) — NFL odds path for preseason; do it first |
| R-4 | Verify TheRundown 429s stop after THE_ODDS_API_KEY activates (dashboard request log clean for 1h); if 429s persist, report cadence for review — do not change any cron | browser | OPEN | 429 observed on /api/v2/sports/11/events/2026-08-20 at 05:22 UTC while ingestion still succeeded same minute (partial throttle, not blackout) |
| S-1 | Evaluate TheSportsDB as a free schedules/results redundancy source (v1 key 123, 30 req/min; NOT an odds source) — must pass source-rights registry classification before any adapter work | — | OPEN | founder surfaced docs 2026-08-19; folds into H-S |
| H-S | Free sports-data provider map (L-5 in the v8 queue): one doc, fixed schema, every candidate classified — odds sources separated HARD from schedules/results/stats sources, free-tier limits verified with at most 2 live calls each using documented public keys only, source-rights classification per CLAUDE.md for each. No signups, no credential creation, no adapters — map first | hermes | OPEN | candidate list from founder 2026-08-19: TheSportsDB, football-data.org (soccer only), OpenLigaDB (German leagues), MySportsFeeds, OrcaSports, public-apis indexes; plus incumbents The Odds API / TheRundown / ESPN for limit comparison |

| C-10 | Guard hardening from fleet review: ledger guard fetch-by-sha in shallow CI (fabricated SHAs currently pass), api-v1 route walker must not honor SKIP_DIRS and must flag symlinks, promoted-routes listFiles must not throw on dangling symlinks — each fix carries the reviewer reproduction as a regression test | claude | CLAIMED | 5 findings confirmed by empirical reproduction, fix fleet dispatched |
| C-11 | H-K revision per attackers: never revoke while Stripe subscription still active (retrieve + status check, log for human), log-only mode makes ZERO Stripe API calls, transient retrieve failure in enforce mode 500s (structural unresolvability still 200s), status guard on revoke write | claude | CLAIMED | base e69aa93c |
| C-12 | Edge Roadmap + gate-split map committed | claude | DONE | #435 — docs/ops/edge/2026-08-19-edge-roadmap.md + calibration-gate-split-map.md |
| F-5 | Founder reads the Edge Roadmap and picks the QUICK experiments to greenlight; enabler E1 (clean-room prod export) needs founder hands — agents cannot reach the DB | founder | OPEN | roadmap section 2-3; every experiment preregistered against CLV 52.4 percent under the e-process, kill criteria included |
| L-6 | CLV analysis on the census (the measurement that should have been L-4) | hermes | DONE | 830ff6df on origin/hermes/l6-clv-analysis, resolved 2026-08-19; 909/1161 graded pairs; headline 24.86% beat is NOT accepted as a performance number — inputs under C-14/L-9 provenance audit first |
| C-13 | Integrate origin/hermes/sprint-landing (e8286086: H-A..H-G toolkit + L-4/L-5 docs + main merged) into the designated branch, fully verified | claude | CLAIMED | fleet dispatched |
| C-14 | CLV-grading forensics: the L-6 magnitudes are diagnostic of a possible computation artifact (ML mean CLV -27.4pp is implausible as real market movement; spread beat-rate 10.31% with median CLV 0; inverse strategy clears 52.4% on decided picks) — audit settle-sport CLV sign conventions, ML price units, side attribution, MATCHED semantics before ANY conclusion ships | claude | CLAIMED | fleet dispatched; verdict required: artifact vs real anti-signal vs honest no-edge |
| R-6 | Rename THE_ODDS_API_KEY_FREE to the canonical THE_ODDS_API_KEY in Vercel Production (code enumerates the canonical name; oddsMatchedEnv null proves the mismatch), verify CEREBRAS_API_KEY presence/absence, redeploy, re-read truth surface | founder | DONE | executed by founder hands 2026-08-19 ~07:39 UTC (not the browser agent), redeployed. Verified live (no-store, age:0): oddsKeyPresent=true, oddsMatchedEnv="THE_ODDS_API_KEY" — preseason NFL odds path unblocked. deployment.sha unchanged (b71f7e28) as expected: same-commit Redeploy with new env, not a new push. contentPlanPrimary still reads "cerebras_free" but this is a STALE LABEL not a bug: jynx.ts:165 names the field "cerebras_free" whenever isFreeLaneEnabled() is true via EITHER CEREBRAS_API_KEY OR the OpenRouter secondary (free-lane-policy.ts:14-21); the dispatcher itself (free-lane.ts:59-91) correctly skips Cerebras with zero wasted calls when the key is absent/falsy and falls through to the OpenRouter secondary host — money-correct, cosmetic-only. THE_ODDS_WIDGET_KEY also added (feeds C-17) |
| L-7 | CLV data-path forensics: 10-row hand spot-check, ML price-format census, spread side-vs-movement buckets, MATCHED semantics, per-book + June/July slices | claude | CLAIMED | Hermes's part done and pushed: f87146bb on origin/hermes/l7-clv-forensics but NOT YET merged into the designated branch: real conflict on 10 test files (canonical-sample-posture, cockpit-jarvis-trend-api, cockpit-picks-glance, cqr, glass-ledger-page, honest-degraded-states, picks-daily-limit-meta, player-stats-backfill-plan, refresh-player-stats-route, backfill-independent-trueprob/espn-odds-client) — this branch shares the same old pre-C-7/C-9-fix lineage as hermes/sprint-landing. Merge attempted, correctly aborted rather than hand-resolved under time pressure; likely resolves cleanly once C-13 lands sprint-landing (same root divergence). Do not rename to DONE until actually merged |
| L-8 | Commit + push the L-7 forensics artifacts with a formulas README | hermes | DONE | commit content confirmed on origin/hermes/l7-clv-forensics (f87146bb); integration into designated branch tracked under L-7 above, not blocking this row |
| L-9 | CLV verdict slices: decided-only beat rates with CIs, TOTAL deep-dive, lock provenance audit (book quote vs batch mean vs model-derived), ML monster-lock provenance, spread sign-flip classification | hermes | DONE | 93b92db1 on origin/hermes/l9-clv-slices, merged c19d2e06. 3/5 items computed: decided-only beat by market x month (TOTAL 58.5% [52.8,63.9] clears 52.4%, SPREAD/ML do not), sign-flip 57/388 SPREAD (toward 40/away 109/unchanged 239), spot-check 0/10 mismatches. **CRITICAL finding for C-14: 909/909 picks have ZERO matching odds_batch rows at clv_captured_at — every lock price appears model-derived, not a real book quote.** 2/5 items (lock provenance, ML monster-lock join) correctly left BLOCKED — no hermes_ro DB credential reachable anywhere on the Hermes machine (DATABASE_URL_UNPOOLED, local Postgres, neonctl all masked); required queries saved in clv-slices.json for a session with real DB access. Hermes correctly refused to escalate to NEON_API_TOKEN or unmask credentials per standing rule |
| L-10 | Free-provider live probes for the H-S map: 2 calls max per candidate, latency/shape/limits, rights-registry classified, no adapters no signups | hermes | DONE | 8c1c6143 on origin/hermes/l10-provider-probes, merged 5d358e90. Cleared, zero-cost, live-verified: nflverse (open-license CSV/JSON, ~280ms), Open-Meteo (open-license, ~550ms), Sleeper API (public, ~27ms). ESPN public API 403'd both calls (Akamai bot-block, was previously 200 — investigate before relying on it). TheSportsDB + MLB Stats API both respond 200 but are vendor_candidate/gated per registry — Hermes correctly did NOT mark them usable, needs registry promotion first. FFC-ADP DNS failure, likely transient |
| C-15 | CLV lock-price provenance fix: capture real book quotes at publish/lock time, flag or segregate model-derived prices so CLV grades market-vs-market only — design after the C-14 verdict, then implement with tests | claude | OPEN | blocked on C-14 verdict + L-9 provenance audit; this is the gate to any honest ESTABLISHED (>=52.4% CLV) claim |
| C-16 | Frontier research night: six verified-citation literature threads (anytime-valid/e-process + conformal e-prediction, calibration/CORP/Venn-Abers, pooling/extremization, market efficiency + CLV literature, independent models for MLB totals, Kelly/abstention decision layer) mapped onto the codebase as preregistration-compliant proposals, citation-audited and doctrine-audited, synthesized into a ranked dossier | claude | CLAIMED | fleet dispatched 2026-08-19 night; deliverable lands as docs/ops/edge/2026-08-19-research-frontier-dossier.md; targets the measured gap: REL solved, RES ~zero |
| C-17 | Design (not implement) The Odds API affiliate widget integration: founder added THE_ODDS_WIDGET_KEY to Vercel; distinct from THE_ODDS_API_KEY (prediction source-of-truth, not for sale) — the widget is bookmaker odds + our affiliate link, a monetization surface. Design against the existing apps/web/lib/revenue/ partner/offer/disclosure model and the sealed affiliate-structural-separation + partner-offer-compliance-scan guards, without editing either guard | claude | DONE | 9b8fa121 (docs/ops/edge/2026-08-19-odds-widget-integration-design.md). Two real blockers found: (1) site CSP script-src (next.config.mjs:103) allow-lists only Clarity+Stripe, blocks any vendor widget script until the real host is added; (2) evaluateOfferEligibility fails closed on unknown userState for high-risk offers and no visitor-state signal exists in the repo — widget cannot legally render for anonymous traffic without one. Category must be sportsbook not sports_data (triggers the full compliance bundle). 8-item founder-review list + 7-item safe-to-PR list (~half day) in the doc |
| C-19 | Cosmetic: rename the misleading contentPlanPrimary="cerebras_free" label — it fires whenever ANY free lane is enabled (Cerebras OR the OpenRouter secondary), not only when Cerebras is actually used; already caused one false-alarm re-investigation during R-6 verification | — | OPEN | jynx.ts:36,165 (JynxLane type + primaryLane assignment); dispatcher (free-lane.ts) is money-correct, this is display-only |
| C-18 | Design S2S (server-to-server) postback/conversion tracking for revenue partners: apps/web/lib/revenue/ stops at "offer disclosed," nothing records whether a click-through actually converted (signup/deposit) — applies to every affiliate partner, not just the odds widget | — | OPEN | surfaced 2026-08-19 while researching C-17; needs its own design pass (webhook endpoint, HMAC/shared-secret verification, idempotency, which network(s) support it) |
| R-7 | Start (not complete) sportsbook affiliate program applications at every major US-regulated book (DraftKings, FanDuel, BetMGM, Caesars, ESPN Bet, Fanatics, bet365, Hard Rock Bet, Bally Bet): fill all public/non-sensitive fields, hard-stop before SSN/EIN/banking/payout fields or any T&C-acceptance click, produce a per-book punch-list of what remains | browser | OPEN | founder-directed 2026-08-19 night; boundary is deliberate — no agent submits tax/banking info or accepts a binding affiliate contract unsupervised; feeds C-17 (widget design) and the RevenuePartner/disclosure model already in apps/web/lib/revenue/ |
<!-- LEDGER:END -->
