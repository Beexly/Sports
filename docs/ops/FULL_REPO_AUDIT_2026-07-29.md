# FULL REPO AUDIT — Beexly/Sports (Galaxy Sports Edge)

**Date:** 2026-07-29  
**MAIN:** `52852e3`  
**Repo:** https://github.com/Beexly/Sports  
**Standard:** world-class production OS — no soft language  
**Method:** tree-wide scale + integrity ledger + capability/agent registries + free-first/law paths + package inventory + docs landfill + test/guard surface  

---

## 0. Executive verdict

| Dimension | Grade | One line |
|-----------|-------|----------|
| **Architecture depth** | **A** | Real monorepo product, not a scaffold |
| **Operator OS (`/cockpit` + JARVIS)** | **A−** | Built, tested, draft-governed |
| **Prediction / quote / settlement science** | **A−** | Large prediction-engine + quote-plane + free settle |
| **Law / refuse-default / anti-CPA** | **A** | In code + CI guards, not posters |
| **Production proof (Neon + live data)** | **C / fail** | Code ready; DB PROVEN PARTIAL |
| **Agent autonomy (marketing vs code)** | **B+** | Correctly draft-only; language still slips |
| **Documentation discipline** | **D+** | CANONICAL helps; root + docs still a museum |
| **Observability / workers cutover** | **D** | Built policies, mostly unwired/unproven |
| **Public surface sprawl** | **B−** | 221 pages; many gated/illustrative — risk of cosplay |
| **Overall** | **B (ops C)** | Elite skeleton; proof and doc discipline lag |

**One sentence:** You already built a **company-grade operator + prediction platform**; you will lose by **pretending Production is proven** and by **document/agent theater** until Neon + free spine smoke and the museum is subordinated forever.

---

## 1. Scale (facts)

| Metric | Count |
|--------|------:|
| Tracked source-ish files (ts/tsx/js/md/prisma/json, no node_modules) | ~4,362 |
| TypeScript `.ts` | ~2,460 |
| TSX | ~477 |
| Markdown | ~1,087 |
| Prisma schemas | 2 |
| Prisma models | **98** |
| `apps/web` pages (`page.tsx`) | **221** |
| API routes (`route.ts`) | **161** |
| Cockpit pages | **34** |
| Cron routes | **18** (13 scheduled in `vercel.json`) |
| `apps/web/lib` domain folders | **145** |
| Web `__tests__` files | **582** |
| Test files monorepo-wide | **~977** |
| Packages | **20** |
| Workers | **4** (thin) |
| Formal (TLA+) files | **~69** |
| `docs/**/*.md` | **~692** |
| `handoff/**/*.md` | **~220** |
| Root `*.md` | **~49** |
| Live `docs/ops/*.md` | **~27** (after archive purge) |
| Integrity ledger systems | **38** |

**Stack truth:** Next.js **14.2.x** monorepo (`apps/*`, `packages/*`, `workers/*`), Prisma/Neon, Vercel crons, sealed AI control plane, free-first data doctrine.

---

## 2. What the product *is* (domain map)

### 2.1 Operator OS (SoT)

| Path | Role |
|------|------|
| `/cockpit` | Primary operator home |
| `lib/cockpit/*` | Jarvis loaders, tasks, transitions, owner summary |
| `lib/jarvis/*` | Capability registry (16), agent council (23), memory write-gate |
| `lib/agents/*` | Agent OS registry + queue + run contracts |
| `lib/command-center/*` | Attention feed |
| `lib/platform/integrity-ledger.ts` | Built/Wired/Proven/Public-safe truth table |
| `lib/ai-control-plane/*` | **Only** sealed LLM production entry |
| `docs/ops/CANONICAL.md` | Doc SoT pointer |

### 2.2 Product law (non-negotiable in code)

- `LIVE_BOARD` default **off** — honest empty board  
- `oddsApiRequired=false` on free/gamma/own/hydrate paths  
- `PUBLISH_LEDGER` / public performance ladder **gated**  
- Sportsbook/casino affiliate **forever blocked** (`packages/partner-stack`)  
- Content auto-publish **disabled**  
- Agents: `externalActions: NONE`  

### 2.3 Free critical path (world-class for bootstrapped)

| Asset | Location |
|-------|----------|
| ESPN / henrygd / Open-Meteo / nflverse | `lib/data-sources/free-adapters/*` |
| Free-first router + ingest | `free-first-ingest.ts`, `source-router.ts`, `cost-policy.ts` |
| Free settle (no Odds key) | `free-settlement.ts` + `free-settlement-runner.ts` + `cron/settle-picks` |
| Gamma free quotes | `packages/quote-plane` + `cron/gamma` |
| Smoke | `npm run free:doctor` |

### 2.4 Paid enrichment (optional)

- The Odds API via `refresh-odds` / `settleSport` when key present  
- Stripe billing (partial proven)  
- Anthropic/Gemini/Groq/xAI via control-plane / INTERNAL_LLM  

### 2.5 Science / edge packages

| Package | ~TS files | Role |
|---------|----------:|------|
| `prediction-engine` | **389** | CLV, calibration, Kelly, conformal, edge-lab, certificates, honesty |
| `data-ingestion` | 48 | Odds client, normalizers, sports config |
| `ingestion-pipeline` | 33 | settleSport, freeze slate, post-settlement work |
| `quote-plane` | 23 | methodTag, continuous CLV archive, Gamma/Kalshi |
| `stats-api` | 43 | Own values, hydration, catalog rights |
| `governed` + `crypto` | ~21 | Ed25519 receipts, slate opening |
| `ai-council` | 10 | DESTROY / FTC-NAD CI seats |
| `phase-c` | 4 | Remeasure harness (UNVERIFIED claims) |
| `feature-store`, `epistemic-twin`, `genesis-kernel` | mid | Advanced R&D lanes |
| `partner-stack` | 6 | Affiliate doctrine with teeth |
| `compliance` | 10 | CCM checks including receipts |

### 2.6 Workers (honest: thin)

| Worker | TS files | Integrity |
|--------|---------:|-----------|
| data-refresh | 2 | PARTIAL wire / NO proven |
| pick-generation | 1 | |
| content-publishing | 3 | |
| airwave-listener | 1 | founder-gated |

Oracle VPS compose exists; cutover **not proven**. Vercel crons carry production load.

### 2.7 Formal methods (rare + real)

TLA+ models under `formal/` for live-model dispatch ambiguity, credit reservation, etc., with TLC receipts. High-end engineering signal; not the founder’s daily watch surface.

### 2.8 Public web sprawl

~70+ top-level marketing/product routes (`/picks`, `/board`, `/glass-ledger`, `/fantasy`, `/cipher`, `/sealed`, `/parlay-mri`, …). Many are **gated, illustrative, or fixture**. Strength: full product story. Risk: looks “live” while LIVE_BOARD off and Neon unproven.

---

## 3. Integrity ledger scoreboard (38 systems)

| Stage | YES | PARTIAL | NO |
|-------|----:|--------:|---:|
| Built | 33 | 4 | 1 |
| Wired | 13 | 6 | 19 |
| Proven | 25 | 7 | 6 |
| Public-safe | 6 | 8 | 24 |

**Interpretation:** Massive **BUILT** surface. **WIRED** and **PUBLIC_SAFE** deliberately sparse — correct for refuse-default. The failure is when humans treat BUILT as shipped.

### Critical non-green (ops-blocking)

| id | Proven | Wired | Public | Issue |
|----|--------|-------|--------|-------|
| `db-neon-sor` | PARTIAL | YES | PARTIAL | No `lastVerifiedAt`; Production dual URL unproven |
| `free-settlement-path` | PARTIAL | YES | NO | Wired on MAIN; needs Production smoke |
| `free-first-data` / `src-free-first` | PARTIAL | PARTIAL/YES | PARTIAL | Adapters strong; persistence incomplete |
| `workers-ingestion` | NO | PARTIAL | NO | Vercel-cron dependency |
| `obs-tracing` / `obs-alerts` | NO | NO | NO | No real ops radar |
| `model-promotion` | NO | NO | NO | Champion/challenger not live |
| Many model-* engines | YES built | **NO wire** | NO | Lineage, market-memory, no-bet adversary, court |

---

## 4. Agent / capability honesty

### Capability registry (16)

| Status | Count |
|--------|------:|
| DRAFT_ONLY | 7 |
| MANUAL | 2 |
| DESIGNED | 2 |
| NOT_WIRED | 5 |
| **ACTIVE** | **0** |

**Correct:** nothing claims full autonomous ACTIVE.

### Agent council (23)

| Status | Count |
|--------|------:|
| DRAFT_ONLY | 7 |
| MANUAL | 3 |
| NOT_WIRED | 13 |

DELTA upgraded to DRAFT_ONLY with methodTag/CLV truth (MAIN `52852e3`).

### Agent OS (~23–29 registry rows)

Mostly DRAFT_ONLY / NOT_WIRED / MANUAL; a couple REAL/PARTIAL labels. **externalActionsAllowed: false** everywhere that matters.

### Cockpit registered six

JARVIS · SARAH · TAL · SCOUT · AVA · BOBBY — all draft-only.

**World-class rule:** “AI runs the company while I watch the dashboard” means **crons + draft synthesis + free data**, not autonomous external publish/bet/send.

---

## 5. Runtime automation (what actually runs)

### Vercel crons (13 scheduled)

| Schedule | Path |
|----------|------|
| */30 | refresh-odds, gamma |
| hourly :15 | jarvis-snapshot |
| hourly :30 | drain-ai-telemetry-recovery |
| daily 06:30 | prune-rate-limits |
| daily 07:00 | settle-picks (**free path if no Odds key**) |
| daily 07:30 | deliver-settlement-alerts |
| daily 08:00 | reconcile-entitlements |
| daily 08:30 | repair-checkout-attempts |
| daily 09:00 | ingest-player-stats |
| daily 09:30 | hydrate-cold-plane |
| daily 09:45 | run-formal-receipt |
| daily 11:00 | generate-drafts |

**Requires:** `CRON_SECRET` + real `DATABASE_URL` for meaningful effect. Without them: cosplay.

### Guardrails (elite)

`npm run guardrails` chains trust-gate, model-freeze, draft-only, secret-scan, commercial-copy, performance-claims, partner-offer, AI sealing, AI council, pedersen, actor-minting, etc. This is **world-class CI culture**.

---

## 6. What is excellent (do not undervalue)

1. **Integrity ledger taxonomy** — anti fake-DONE as code  
2. **Free-first doctrine + free settle** — rare in sports startups  
3. **Quote-plane methodTag continuous CLV** — real science plumbing  
4. **Sealed AI control plane** — one production entry  
5. **AI Council DESTROY** — claim attack as CI  
6. **Partner-stack CPA hard block**  
7. **Settlement durability** — outbox, post-settlement work, run identity  
8. **Test volume** (~1k test files) + jarvis/cockpit/free-settlement suites  
9. **Formal TLA+** where money/ambiguity matters  
10. **Cockpit depth** (34 pages, command center, integrity UI, costs, sources)  
11. **prediction-engine density** (389 TS) — not a toy scorer  
12. **Refuse-default board states** (`HONEST_EMPTY_LIVE_BOARD_OFF`)  

---

## 7. What is bad / embarrassing (still)

### 7.1 Documentation landfill (CRITICAL)

- ~**1,087** markdown files repo-wide  
- ~**49** root-level handoff/report MD files still live  
- ~**220** handoff/ + ~**692** docs/  
- Ops root cleaned to ~27 + archive — **root still screams multi-agent archaeology**

**World-class:** one CANONICAL + code SoT. **You still have a museum at repo root.**

### 7.2 Neon not PROVEN (CRITICAL)

Integrity: `db-neon-sor` proven PARTIAL, `lastVerifiedAt: null`.  
Without Production dual URLs + rows, JARVIS is a **beautiful empty room**.

### 7.3 Built ≠ Wired (HIGH)

19 systems wired=NO including cost-governor, signal lineage, market memory, observability, B2B governance. Science shelf is full; runtime wiring is sparse by design **and** by neglect.

### 7.4 Public surface sprawl (HIGH)

221 pages. Risk: founder demo feels complete while gates refuse. Discipline: every public page must **honest-empty** under law — trust-gate helps, but product management of surfaces is weak.

### 7.5 Workers unproven (MEDIUM)

Integrity already flags Oracle VPS cutover. Cron-on-Vercel is a cost/reliability trap at scale.

### 7.6 Observability vacuum (MEDIUM)

`obs-tracing` / `obs-alerts` NO across the board. World-class ops needs Sentry/OTel + cron failure paging — not another markdown plan.

### 7.7 LiteLLM / credit narrative hangover (LOW after purge)

Code SoT is ai-control-plane. Any remaining “stand up LiteLLM first” copy is theater.

### 7.8 Dual inventories risk (LOW)

Capability registry vs Agent OS vs Council vs Prisma operators — four maps. Intentional layering, but **status drift** already bit DELTA once. Needs single “status owns” rule.

### 7.9 Root scripts/bat/ps1 clutter (LOW)

`push-now.bat`, `final-deploy.bat`, `shootA.mjs` — founder laptop archaeology.

---

## 8. Package-by-package judgment

| Package | Judgment |
|---------|----------|
| prediction-engine | **Core moat** — keep; wire only what public gates need |
| quote-plane | **Core free path** — prove on Neon |
| ingestion-pipeline | **Core settle** — paid + free dual path now |
| data-ingestion | Solid Odds adapter; optional |
| stats-api | Own catalog / hydration — good free doctrine |
| governed/crypto | Receipt spine — needs durable Neon store |
| ai-council | Keep as CI weapon |
| partner-stack | Keep as law |
| phase-c | CODE_READY harness only — no claim |
| genesis/epistemic/feature-store | R&D; do not block launch |
| ops | Small hydrate-force honesty map — good |
| db | 98 models — ambitious; prove migrations on Production |
| workers/* | Underweight vs ambition |

---

## 9. Ideas / plans buried in the tree (harvest, don’t rebuild)

| Idea | Where | Action |
|------|-------|--------|
| Free-first scores → DB persist | FREE_FIRST_DATA + integrity nextAction | **Wire** |
| Free settle smoke vs paid | free-settlement-runner | **Prove on Neon** |
| Jarvis blockers → draft tasks | agent queue + assessment | **Wire** |
| Stale ingestion → command-center | data-reliability nextAction | **Wire** |
| Oracle VPS workers | integrity workers | **Later** after cron green |
| Observability spine | integrity obs-* | **P1 after Neon** |
| Model no-bet / lineage / memory | integrity model-* | Internal only; no public |
| Formal heartbeat | formal/ | Keep receipts; don’t productize |
| NOVA opportunity engine | scripts/nova + cockpit/nova | SHADOW dry cycle only |
| FABLE evidence | scripts/fable-* | Keep as claim forensics |
| Credits leverage atlas | archive/leverage | Runway only, not product |
| Overlay CV | stats-api catalog PARKED | Stay parked |
| Glass ledger / LIVE_BOARD | env gates | Founder YES only |

---

## 10. Double-build risks (kill list)

| Do not rebuild | Already exists |
|----------------|----------------|
| New operator dashboard | `/cockpit` |
| New agent framework | Agent OS + council + control-plane |
| New free data layer | free-adapters + free-first |
| New CLV stack | quote-plane + prediction-engine CLV |
| New master plan | `CANONICAL.md` |
| LiteLLM product before need | ai-control-plane |
| Affiliate funnel | permanently blocked |

---

## 11. Priority queue (world-class, minimal human)

### Founder-only (blocking)

1. Production Neon dual URLs (`gse-postgres`)  
2. `CRON_SECRET` + redeploy  
3. Smoke: gamma 401/200 · settle free path · jarvis-snapshot · `npm run prove:neon`  

### Agent-owned next (no new science)

1. Persist free scores into DB (integrity nextAction)  
2. Jarvis assessment blockers → draft cockpit tasks  
3. Stale ingestion → command-center attention  
4. Root MD → `docs/ops/archive/root-museum/` (or delete with policy)  
5. Wire one observability path (Sentry free tier) when keys exist  
6. Keep registry/council/agent-OS statuses synced on every capability change  

### Explicitly later / YES only

LIVE_BOARD · PUBLISH_LEDGER · public picks ladder · Phase C claim · #226 · paid Odds enrichment · Stripe live polish  

---

## 12. Scorecard vs “world-class vision”

| Vision claim | Reality |
|--------------|---------|
| AI runs ops while founder watches dashboard | **Partial** — after secrets; draft-only external |
| Free path without Odds | **Code YES** · **Prod prove NO** |
| Honest public product | **Law YES** · **surface sprawl risk** |
| Agents as company | **Governance YES** · **autonomy NO (correct)** |
| Prediction edge science | **Deep YES** · **public fire gated** |
| Clean monorepo | **Structure YES** · **doc/root mess NO** |

---

## 13. Exit line

```
repo=Beexly/Sports
main=52852e3
files~=4362
pages=221
apis=161
cockpit=34
crons_scheduled=13
packages=20
prisma_models=98
integrity_systems=38
public_safe_yes=6
capabilities_active=0
class_A=0
sot=/cockpit+CANONICAL
neon_proven=NO
oddsApiRequired=false
LIVE_BOARD=off
next=prove_neon_then_wire_free_persist_then_archive_root_md
```

**Final judgment:** This is a **serious** sports intelligence company codebase wearing a **document landfill** and waiting on **two secrets** to stop being cosplay. Do not rebuild. Prove. Wire free persistence. Archive the museum. Watch `/cockpit`.
