# JARVIS + COCKPIT — AI-FIRST AUTO-RUN

**Law:** minimize founder clicks. Founder **watches** `/cockpit`. Agents + crons **run**.  
**SoT UI:** `apps/web/app/cockpit/*` · JARVIS assessment · Agent Council · Capability Registry  
**Do not invent a parallel control plane.** Wire *this* cockpit.

---

## 1. What already exists (do not rebuild)

| Surface | Path | Owner agent |
|---------|------|-------------|
| Command overview | `/cockpit` | JARVIS |
| Agents | `/cockpit/agents` | JARVIS |
| Tasks / review | `/cockpit/tasks`, `/cockpit/review` | chain / SARAH |
| History / calibration | `/cockpit/history`, `/cockpit/calibration` | ledger / AUDIT |
| Sources / free coverage | `/cockpit/sources` · API free-coverage | TAL |
| Brief / market twin | `/cockpit/brief`, `/cockpit/market-twin` | JARVIS / DELTA |
| API costs | `/cockpit/api-costs` | METER |
| Jarvis APIs | `/api/cockpit/jarvis`, readiness, command-center | JARVIS |
| Cron spine | 18× `/api/cron/*` | platform |
| GSE truth APIs | `/api/gse/v1/*` | quote-plane / stats-api |

**Registries (code SoT):**
- `lib/jarvis/capability-registry.ts` — 16 capabilities  
- `lib/jarvis/agent-council.ts` — council seats (6 registered cockpit agents)  
- `lib/cockpit/cockpit-operating-map.ts` — 24 surfaces  
- `lib/cockpit/agents.ts` — JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY  

**Inventory export:** `docs/ops/GSE_RUNTIME_INVENTORY.json` (regenerate any time).

---

## 2. Human input budget (MAXIMAL AI, MINIMAL YOU)

Only these require a human (once):

| # | Item | Why human | After that AI |
|---|------|-----------|---------------|
| 1 | Neon `DATABASE_URL` + `DIRECT_URL` | Secret + Vercel permission | All DB-backed cockpit + workers |
| 2 | `CRON_SECRET` (re-verify) | Secret | All 18 crons auto via Vercel schedule |
| 3 | Optional free AI keys | Free usage credits | Cheaper internal LLM; platform still runs without |
| 4 | Explicit YES later | LIVE_BOARD / publish / #226 / Phase C | Public fire — **not** required to run ops |

**Everything else is agent-owned:** drafts, audits, free gamma path, readiness, trust-gate, inventory, docs, wiring DESIGNED→DRAFT_ONLY paths that do not publish.

---

## 3. Auto-run matrix (AI watches + executes)

| Loop | Trigger | Human? |
|------|---------|--------|
| Jarvis assessment | Every `/cockpit` load | No |
| jarvis-snapshot cron | Schedule in vercel.json | CRON_SECRET only |
| gamma free quotes | `*/30` cron | CRON_SECRET only |
| settle-picks / hydrate / ingest | schedules | CRON_SECRET + DB |
| Agent council panels | cockpit render | No |
| Trust-gate / AI Council CI | every PR | No |
| Free data adapters (nflverse, etc.) | workers / cron when wired | DB only |
| Content / promo drafts | AVA / BOBBY | Approval only for *publish* |
| Ask Jarvis | cockpit panel | No (LLM key optional) |

---

## 4. Agent advance queue (no gate flips)

Agents should advance **without** LIVE_BOARD:

1. Keep capability registry honest (status ladder only upgrades with proof).  
2. Wire free-path market intelligence using Gamma + continuous CLV already on MAIN.  
3. Auto-settlement design using ESPN/public results adapters (already in packages).  
4. Stale-ingestion alerts → decision queue (data-reliability nextAction).  
5. Cockpit surfaces still DESIGNED: Tasks, Moderation, Film Room — implement as **draft queues**, not public publish.  
6. Memory surface NOT_WIRED → candidate writes only (protocol).  
7. LiteLLM budgets when free keys exist; until then Groq/internal path if set.  
8. Regenerate `GSE_RUNTIME_INVENTORY.json` after registry changes.  

**Forbidden auto-upgrades:** ACTIVE status, public picks, affiliate publish, LIVE_BOARD.

---

## 5. Founder watch path (dashboard only)

1. Open Production `/cockpit` after env green.  
2. Read Jarvis health + decision queue.  
3. Approve or reject **drafts only** when you want external action.  
4. Never required for crons, free gamma, assessments, CI.

---

## 6. Agent session prompt (non-human)

```text
You operate Beexly/Sports. Prefer existing /cockpit + lib/jarvis + lib/cockpit.
Do not create a parallel dashboard. Do not flip LIVE_BOARD or publish.
Minimize founder input: only secrets they must paste.
Advance DESIGNED/DRAFT_ONLY capabilities with free-path data (gamma, nflverse, refuse-default APIs).
Keep capability-registry and agent-council truthful.
Run gse-verify when you change code. Update GSE_RUNTIME_INVENTORY.json when registries change.
```

---

## 7. Exit

```
cockpit=SoT
jarvis=SoT
class_A=0
human_budget=Neon+CRON_SECRET(+optional AI keys)
auto=crons+assessment+free_gamma+CI
next=env_once_then_watch_cockpit
```
