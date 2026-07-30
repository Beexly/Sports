# CANONICAL — single ops truth

**If anything conflicts with this page + the code SoT paths below, discard the other document.**

## Code SoT (always wins)

| Layer | Path |
|-------|------|
| Operator OS | `apps/web/app/cockpit/*` Production `/cockpit` |
| JARVIS | `apps/web/lib/jarvis/*` + `apps/web/lib/cockpit/jarvis*.ts` |
| Integrity | `apps/web/lib/platform/integrity-ledger.ts` |
| Free data | `apps/web/lib/data-sources/*` + `docs/FREE_FIRST_DATA.md` |
| AI dispatch | `apps/web/lib/ai-control-plane/*` (not a separate LiteLLM product until deployed) |
| Agents | `lib/cockpit/agents.ts` · `lib/agents/*` · `lib/jarvis/agent-council.ts` — **externalActions: NONE** |
| Law | LIVE_BOARD off · oddsApiRequired=false · refuse-default · CPA blocked |

## Thin ops docs (keep)

| Doc | Role |
|-----|------|
| `CANONICAL.md` | This file |
| `CURRENT_STATE.md` | Runtime snapshot |
| `OPEN_LEDGER.md` | Class A/B/C |
| `CRON_MATRIX.md` | Crons |
| `SMOKE.md` | Post-deploy smoke |
| `CREDENTIALS_CHECKLIST.md` | Secrets |
| `FOUNDER_ONLY_CHECKLIST.md` | Human checkboxes |
| `CLAUDE_COWORK_PROMPT_P0.md` | Human-only walk-through |
| `JARVIS_COCKPIT_AUTO_RUN.md` | AI-first run law |
| `BRUTAL_AUDIT_2026-07-29.md` | Honesty audit |
| `GSE_RUNTIME_INVENTORY.json` | Machine inventory |

## Archive (non-canonical)

`docs/ops/archive/**` — historical leverage lists, multi-master plans, CODEX/GROK mega-prompts.  
Read for archaeology only. **Never treat as operator SoT.**

## Explicit non-SoT

- Any Vite “Command Deck” / app-builder preview = **satellite map only**
- Credit/leverage atlases = runway research, not product law
- “Agents run the company autonomously” = **false**; seats are draft-only

## World-class rule

One operator OS. One integrity ledger. One free-first data doctrine. Archive the museum.


See also CURRENT_STATE.md and CLAUDE_COWORK_PROMPT_P0.md.
