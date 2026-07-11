# 22 — Resume Packet

Last updated: 2026-07-11 (session 01Q3YhetHK7fVCm1JAQTizNR).
Read this first. It is the exact state + the ranked next moves so any session
(Fable/Claude/Codex/human) continues without re-deriving context.

## Live PR stack (verify with mcp__github before acting — do not trust this snapshot)

| PR | Title | Base | Head branch | State |
|---|---|---|---|---|
| #76 | Truth reconciliation + R&D Radar | main | claude/nfl-pbp-expected-metrics-xb069r | OPEN, CI green, 6 Codex fixed, owner-gated merge |
| #77 | Agent Foundry + AI Setup Assurance | #76 branch | claude/frontier-agent-foundry-2026-07-11 | OPEN, stacked, 3 Codex + runtime-honesty fixed |
| #78 | Model Router shadow + queued specs | #77 branch | claude/frontier-model-router-shadow-2026-07-11 | OPEN, stacked, rebased on #77 |
| #79 | Hotfix: CLV math + 3 trust/money leaks | main | claude/hotfix-clv-settlement-billing-integrity | OPEN, independent, CI running |

**Merges are OWNER-GATED for all four.** Do not merge. The babysit loop
sweeps CI + Codex for all subscribed PRs; fixes go to the matching branch
(rebase stacked children after a base fix).

## Rules that never change

- Protect #76–#79 from contamination: unrelated work goes on a NEW branch/worktree off main (or off the verified head of the PR it depends on).
- Method opacity public; server-side paywall; no fabricated stats; no secrets; states doctrine (outage≠empty≠gated); knowability firewall.
- Never merge, deploy, apply prod migration, publish, or install external code.
- "Learning" = a durable artifact changed (test/eval/ledger/spec), never "the model got smarter."

## Owner blockers (10_BLOCKERS.md) — surface, don't nag

B1 prod ledger runbook (unblocks all deploys) · B2 first memory write · B3 repo→private · B4 Stripe LIVE price IDs · B5 branch protection on main · B6 merge #76–#79. Full packet delivered privately (FOUNDER_UNBLOCK_PACKET_2026-07-11.md).

## NEXT TEN MOVES (ranked; all reversible, none owner-gated)

1. **Babysit #76–#79 to green** (in flight): sweep CI + Codex, fix on matching branch, resolve threads. Never merge.
2. **Hotfix-2 (off main): settlement/freeze integrity** — M-F2 (slate freeze front-runs pick mint; freeze offset [1] only), M-F4 (partial-failure CLV orphan; key on `result!=PENDING AND clvGradedAt IS NULL` + re-grade), M-F9 (VOID path + catch-up window). HIGH value, all in packages/ingestion-pipeline + prediction-engine. Tests first.
3. **Guardrail-hardening PR (off main)** — O-2.1 (scanner dir coverage → all public app pages), O-3.x (trust-gate normalization: NFKC + strip zero-width + join concatenations + scan rendered strings), O-4.x (secret-scan blob content + rules + drop SKIP_DIRS in CI), O-1.x (vercel-skip-build full pushed range + wire its .mjs test into CI). Closes the classes Codex exploits.
4. **Ops fail-closed PR (off main)** — O-1.7 (stub Prisma in prod → fail-closed + non-vacuous health check). HIGH.
5. **Frontier-module hardening** — on the stacked branches after their parents merge: G-3/G-4 (radar posture fail-closed + call validateSnapshot), G-10/G-11 (assurance dead tripwire + vacuous security/outcome health), G-1/G-2 (page-level auth + repo-root source-only marker), G-6/G-14/G-15 (foundry tiers, coverage rounding, routing order). Batch per branch.
6. **Starting-queue #1: owner memory-write form** — two-tap decision→candidate on /cockpit/memory (source/confidence/sensitivity/review-state, no silent confirm). Unblocks B2's value. Off main (new surface, not in #76–#79).
7. **Starting-queue #2: calibration baseline scheduler** — weekly authed cron; extract shared pure math module from run-historical-calibration.mjs; own-model gated behind the honesty floor; /cockpit/calibration card. Design in DESIGN_backtest-scheduling_task6.md (scratchpad).
8. **Starting-queue #3: CLV decomposition** (task #4) — now that CLV math is correct (#79), decompose skill vs timing vs market-disagreement vs residual; coverage-gate every conclusion; re-check ledger before any persistence.
9. **Starting-queue #4: SEO strike page 2** — one real high-intent question; independent value before selling; links to live proof; truthful structured data only.
10. **Deep UX + states pass** (task #8) — first-session comprehension, mobile, loading/empty/stale/outage/locked/partial/post-purchase, cockpit friction. Fix T-daily-slate + T-picks-outage states-doctrine findings here.

## Persistent artifacts in this pack

00–13 (program) · 16_FAILURE_MEMORY.md (this audit's full findings + dispositions) · 22 (this). To add next cycle per the continuous-R&D directive: 14_OPPORTUNITY_LEDGER.json, 15_HYPOTHESIS_LEDGER.json, 17_MODEL_AND_AGENT_SCORECARDS.json, 18_NOVELTY_AND_MOAT_MAP.md, 19_USER_FRICTION_REGISTER.md, 21_NEXT_TEN_MOVES.md (the ranked list above is the seed).

## Session artifacts NOT in the repo (scratchpad/private-strategy, delivered via SendUserFile)

FOUNDER_UNBLOCK_PACKET_2026-07-11.md · DESIGN_backtest-scheduling_task6.md · FANTASY_ENGINE_INTEGRATION_SPEC.md · the R&D dossiers. Keep private until repo is private (classifier blocks pushing strategy docs to a public repo).
