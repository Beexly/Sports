# Founder-only checklist (secrets + YES decisions)

Updated: 2026-08-08 — code can prepare everything else; you own secrets, YES flips, and third-party accounts.

## P0 — Keep lights on

- [ ] `prove:neon` green after last schema push
- [ ] Production deploy of monorepo HEAD (build green)
- [ ] `CRON_SECRET` on Vercel Production (confirmed)
- [ ] LLM keys as needed: GROQ / XAI / ANTHROPIC (cash last resort)
- [ ] TheRundown key mapped as backup + redeploy confirm (`rundownBackupConfigured`)
- [x] `THE_ODDS_API_KEY` (flipped)
- [x] Azure Foundry + Vertex live (`anyCreditLaneReady: true`)

## P1 — Credits + runway

- [x] `CLAUDE_PROVIDER=auto` + Azure/Vertex model maps (cash only last)
- [ ] Free-lane overflow keys if using DeepSeek / GLM / Qwen / Gemini / OpenRouter free
- [ ] Microsoft Clarity project id → `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- [ ] `NEXT_PUBLIC_ANALYTICS_ENABLED=true` after tokens set

## P2 — Topology / self-heal

- [ ] Upstash Redis env (multi-instance only)
- [ ] Stripe live keys + webhook hygiene (`STRIPE_GO_LIVE_CHECKLIST.md`)
- [ ] Oracle Always-Free VPS + DNS (`docker/oracle-vps`) when needed
- [ ] Doppler / Clerk / Inngest if scale requires
- [ ] **`AUTONOMY_EXECUTE=true`** (exact string) — closes plan→act for allow-listed crons only:
  free-spine-health · settle-picks · refresh-odds · generate-drafts · calibration-metrics.
  Never flips LAWS / PUBLIC_PICKS / LIVE_BOARD / owner-queue.
  Note: dedicated crons already run those jobs; this flag re-fires via planner every ~15m when needed.
  `refresh-odds` may spend Odds API quota when key present.

## P3 — Relationship / research

- [ ] Houston founder ecosystem / partner letter path
- [ ] GitHub for Startups **only if** outside funding + partner
- [ ] Sportradar official trial (research only)

## Explicit YES only (default remains OFF)

- [ ] Explicit YES: **LIVE_BOARD** on
- [ ] Explicit YES: **PUBLISH_LEDGER** on
- [ ] Explicit YES: **SLATE_OPENING_REVEAL** / reveal on
- [ ] Explicit YES: public picks (`PUBLIC_PICKS_ENABLED`) / performance stats (`PERFORMANCE_STATS_ENABLED`)
- [ ] Explicit YES: merge / land **#226 HEOS**
- [ ] **Phase C (5b)** remeasure after real path (not silent flip)
- [ ] Calibration floors met + founder signed YES before any **verified track record** language

## Forbidden until YES + measurement

- Public ROI / guaranteed edge claims
- Sportsbook CPA / affiliate language without rights
- “Engines are accurate” public claims without sample floors + reliability

## Not “only AUTONOMY_EXECUTE left”

Self-heal of free-spine + settle largely already exists via dedicated Vercel crons.
`AUTONOMY_EXECUTE` closes the **plan→act loop**. Public intelligence promote still needs:

1. Sample floors (Brier/ECE + settled N)
2. Free-spine SLA green live
3. FORCE_NO_BET_IF_STALE before public picks
4. Founder YES on gates
