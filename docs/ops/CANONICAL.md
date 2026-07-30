# CANONICAL — single ops truth

**If anything conflicts with this page + the code paths below, discard the other document.**

## Code SoT (always wins)

| Layer | Path |
|-------|------|
| Operator OS | Production `/cockpit` · `apps/web/app/cockpit/*` |
| JARVIS | `apps/web/lib/jarvis/*` · `apps/web/lib/cockpit/jarvis*.ts` |
| Integrity | `apps/web/lib/platform/integrity-ledger.ts` |
| Free data + settle | `apps/web/lib/data-sources/*` · multi-source · `free-spine-health` cron |
| AI dispatch | `apps/web/lib/ai-control-plane/*` (LiteLLM optional, not required) |
| Agents | draft-only · `externalActions: NONE` · no public auto-publish |
| Law | LIVE_BOARD off · oddsApiRequired=false · refuse-default · CPA blocked |

## Thin ops docs (live root only)

`CURRENT_STATE` · `OPEN_LEDGER` · `CRON_MATRIX` · `SMOKE` · `CREDENTIALS_CHECKLIST` · `FOUNDER_ONLY_CHECKLIST` · `FOUNDER_HANDOFF_MESSAGE` · `CLAUDE_COWORK_PROMPT_P0` · `JARVIS_COCKPIT_AUTO_RUN` · `BRUTAL_AUDIT_2026-07-29` · `FREE_FIRST_DATA` (under docs/) · runbooks that still gate go-live (`GO_LIVE_RUNBOOK`, `GATE_OPENING_RUNBOOK`, `STRIPE_GO_LIVE_CHECKLIST`, `PHASE_05B_REVEAL_PROTOCOL`, `INDEPENDENCE_GATES`, etc.)

## Archive

`docs/ops/archive/**` — leverage lists, mega-prompts, dated audits. Archaeology only.

`handoff/**` — session museum. See `handoff/00-READ-CANONICAL.md`.

## Explicit lies to refuse

- Vite/app-builder decks as operator OS  
- “Agents run the company autonomously” for external actions  
- LiteLLM as deployed product before proxy exists  
- Public ROI / guaranteed wins  
- Neon PROVEN without `scripts/ops/prove-neon.mjs` green  

## Founder human budget (max)

1. Neon dual URLs (gse-postgres)  
2. CRON_SECRET + redeploy  
3. Smoke + optional free AI keys  

Then: watch Production `/cockpit` only.
