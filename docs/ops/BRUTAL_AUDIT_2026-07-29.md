# BRUTAL AUDIT — GSE entire codebase (2026-07-29)

**Standard:** world-class production OS, not agent theater.  
**Tone:** mean on purpose. Soft language hides death.  
**Scope:** Beexly/Sports monorepo + recent master-plan / app-builder work.

---

## 0. ONE-LINE VERDICT

You already built a **serious operator OS** (`/cockpit` + JARVIS + free-first data + refuse-default law).  
What is killing you is **doc multiplicity, stale truth in registries, unproven production DB, and agents re-building a second brain beside the first**.

**World-class path:** stop inventing plans. **Prove** Neon + crons. **Wire free data into persistence/settlement**. **Keep one SoT.** Fix honesty bugs in the capability registry.

---

## 1. WHAT IS GENUINELY STRONG (do not undervalue)

| Asset | Why it is real |
|-------|----------------|
| **~2.7k TS modules**, 161 API routes, 34 cockpit pages | Not a scaffold. This is a product monorepo. |
| **`/cockpit` + JARVIS** | Full operator home: assessment, Ask Jarvis, council, command-center, integrity, costs, sources. Auth-gated. Tested. |
| **Three agent layers (deliberate)** | (1) 6 Prisma operators (2) Agent OS ~23 (3) AI Council CI DESTROY. Governance is coded, not vibes. |
| **AI control plane** | Sealed `executeAiTask`, policy registry, SRQC, recovery drain, guardrails scripts. |
| **Free-first data architecture** | ESPN, henrygd, Open-Meteo, nflverse, Gamma, cost-policy, season-gating, free:doctor. This is elite for a bootstrapped sports shop. |
| **Law in code** | LIVE_BOARD off defaults, boardClass honest empty, oddsApiRequired=false on gamma/own, partner-stack CPA forever blocked, trust-gate. |
| **Quote-plane methodTag + continuous CLV archive** | Real library code on MAIN. Not just a blog post. |
| **Cron matrix** | 18 routes, dual-secret auth design, nodejs force-dynamic harden documented. |
| **Integrity ledger** | BUILT/WIRED/PROVEN/PUBLIC_SAFE taxonomy — the correct antidote to fake DONE. |
| **Test volume** | 500+ web tests including 26 jarvis + 32 cockpit related. |
| **Pass 3/4 residual kill posture** | class_A=0 claim on MAIN tip; refuse-default culture. |

If you threw away the last week of “leverage lists” and kept **only** free-first + cockpit + control plane + law, you would still have a company-grade spine.

---

## 2. WHAT IS BAD / EMBARRASSING / WORLD-CLASS BLOCKING

### 2.1 Documentation is a landfill (CRITICAL)

| Count | Where |
|------:|-------|
| ~689 | `docs/**/*.md` |
| ~218 | `handoff/**/*.md` |
| ~41 | `reports/**/*.md` |

Plus **multiple “canonical” master plans**: MASTER_PLAN, MASTER_PLAN_LEVERAGE, LEVERAGE_ATLAS, CREDITS_STACK, CLOUD_CREDITS_*, RESEARCH_TO_LEVERAGE, EXTERNAL_LEVERAGE_MAP, handoff/leverage/*, FOUNDER_COWORK × N, CLAUDE_* runbooks, UQ handoffs…

**World-class companies have one ops truth.** You have twenty. Agents will keep “consolidating” forever because nothing is deleted.

**Fix:** one index (`MASTER_PLAN_INDEX.md`) with **archive/** for everything else. Stop writing new plans until inventory is proven live.

### 2.2 Double-building the control plane (CRITICAL — this session included)

| Real SoT (keep) | Fake/parallel (kill or demote) |
|-----------------|--------------------------------|
| `apps/web/app/cockpit/*` | App-builder “Command Deck” as if it were Production ops |
| `lib/jarvis/*`, `lib/cockpit/*` | Re-exporting registries into a Vite app for the founder as “the product” |
| `integrity-ledger.ts` | New markdown master plans that restate the ledger without updating it |
| `docs/FREE_FIRST_DATA.md` | Leverage lists that ignore free-first already shipped |

The preview deck is fine as a **read-only map of the monorepo**.  
It is **fraud** if treated as the operator OS. Production is **Next.js `/cockpit` on sports-web**.

### 2.3 Stale honesty in capability-registry (HIGH)

`capability-registry.ts` still says market/CLV intelligence is largely **unbuilt** (“No CLV tracking…”).  
Meanwhile `packages/quote-plane` has **methodTag + continuous CLV archive** and Pass docs claim honesty shipped.

**That is a world-class fail:** the JARVIS map founders trust is **lying relative to MAIN code**.

**Fix:** update capability `currentTruth` / status to match quote-plane + gamma reality **with evidence refs**, or demote the CLV claim if it is not end-to-end proven in production.

### 2.4 PROVEN gap on the system of record (HIGH)

Integrity ledger: Neon is **BUILT YES / WIRED YES / PROVEN PARTIAL**, `lastVerifiedAt: null`.  
Without Production Neon dual URLs + real rows, Jarvis is a **beautiful empty room**. Stub mode + DEMO_PICKS is a landmine if left on in prod-shaped deploys.

### 2.5 Agents are roles, not runners (HIGH — product truth)

Marketing language drifts toward “agents run the company.”  
Code truth: **no seat is AUTONOMOUS**. `externalActions: NONE`. Tasks are drafts. Content auto-publish returns 405. Film room needs spend flags.

That is **correct governance** — but then stop promising “AI runs everything while I watch a dashboard” without admitting: **you still approve external actions**, and **crons need secrets + DB to produce real state**.

### 2.6 jarvis-snapshot is manual-only in matrix (MEDIUM)

Operating myth: JARVIS continuously snapshots.  
Matrix reality: several critical jobs are **scheduled**, but `jarvis-snapshot` has been treated as manual-only in CRON_MATRIX. Continuous company health requires it **scheduled** or equivalent command-center feed cron — verify vercel.json schedules against matrix and fix drift.

### 2.7 Workers path unproven (MEDIUM)

Integrity: workers BUILT, WIRED PARTIAL, PROVEN NO. Oracle VPS compose exists; cutover not proven. Vercel crons doing backend work is a cost/reliability trap.

### 2.8 LiteLLM “control plane” in plans vs repo (MEDIUM)

Master plan talks LiteLLM multi-provider as if it were standing.  
Repo has a **real** `ai-control-plane` + optional INTERNAL_LLM. LiteLLM as a product name is **mostly aspirational** unless config/deploy exists in-tree. Do not sell what is not deployed.

### 2.9 Fantasy +EV UI vs brand law (MEDIUM)

Public/marketing-adjacent components still speak **+EV / ROI** in fantasy/tracker surfaces. Trust-gate culture exists, but **copy inconsistency** will get you killed by your own AI Council if scanned hard enough.

### 2.10 Uncommitted local agent edits (ops)

Working tree has modified CURRENT_STATE / checklists + untracked MASTER_PLAN* from this sandbox. **Not on origin.** Theater until PR’d or discarded.

---

## 3. DOUBLE-BUILD SCORECARD

| Domain | Already exists | Risk of rebuild | Verdict |
|--------|----------------|-----------------|---------|
| Operator UI | `/cockpit` full | High | **Improve only** |
| JARVIS assessment | jarvis.ts + jarvis-data | High | **Improve only** |
| Agent roster | agents.ts + agent-registry + council | High | **Unify display; don’t add 4th registry** |
| Free data | free-adapters + free-first | Med | **Wire writes/settlement** |
| Paid odds | refresh-odds cron | Low | Enrichment only |
| Receipts | governed + crypto | Med | **Neon durable path** |
| Credits leverage | 10+ docs | Critical | **One atlas, archive rest** |
| Master plan | Pass 4 CURRENT_STATE + new MASTER_PLAN | Critical | **Merge into one + index** |
| App-builder deck | Vite map | Med | **Satellite only; link to real routes** |

---

## 4. GOOD vs BAD BY LAYER

### Product law — GOOD
Refuse-default, LIVE_BOARD off, CPA blocked, honest board empty. Keep.

### Cockpit/JARVIS — GOOD architecture, PARTIAL proof
UI and synthesis are world-class **shape**. Live data proof is the gap.

### Data — GOOD free-first design, PARTIAL persistence
Adapters exist. **DB write + settlement automation** incomplete vs the ambition.

### Prediction / quote-plane — GOOD core, honesty map lagging
methodTag/CLV code ahead of capability registry text.

### Agents — GOOD governance, BAD autonomy marketing
Draft-only is correct. “Fully autonomous company” is a lie.

### CI / guards — GOOD
trust-gate, AI Council, sealing scripts. Keep expanding corpus.

### Docs / handoffs — BAD
Volume without deletion. Contradictory “canonical.”

### Credits/leverage R&D — MIXED
Useful for runway. **Zero product value until Neon/cron green.** Over-indexed.

### This session’s work — MIXED
+ Inventory JSON from real code  
+ JARVIS_COCKPIT_AUTO_RUN correctly recenters SoT  
+ Minimal human budget (3 steps) is right  
− Parallel Vite “Command Deck” can become another fake SoT if not labeled satellite  
− More markdown without archive policy  

---

## 5. WHAT “READY TO ROLL” ACTUALLY MEANS HERE

**Ready without founder:**
- free:doctor, exercise-jarvis, unit tests, guardrails, stub cockpit, free HTTP adapters, gamma provider code

**Ready only after 2 secrets + redeploy:**
- Production DB truth, 18 crons, durable jarvis history, real pick rows, settlement backlog work

**Never “auto ready” without explicit YES:**
- LIVE_BOARD, public picks ladder, performance stats public, blog, affiliate, Phase C claim, #226

---

## 6. BRUTAL PRIORITY (NO NEW SCIENCE)

1. **Production Neon dual URL + CRON_SECRET smoke** — or admit prod is cosplay  
2. **Update capability-registry + integrity-ledger** to match MAIN (CLV/methodTag/free-first)  
3. **Free settlement + free scores → DB** — integrity nextActions already say this  
4. **Jarvis blockers → draft tasks** (Agent OS queue) — still externalActions NONE  
5. **Doc landfill policy** — archive 80% of handoffs; one index  
6. **Demote LiteLLM narrative** until proxy is in-repo and deployable  
7. **Kill parallel SoT** — any new UI must deep-link `/cockpit/*` routes as primary  
8. **Fantasy +EV copy scan** — align with AI Council / brand safety  

Do **not**:
- Write another leverage wave  
- Scaffold another dashboard  
- Flip LIVE_BOARD to feel progress  
- Mark capabilities ACTIVE without autonomous proof  

---

## 7. WORLD-CLASS BAR (pass/fail)

| Bar | Status |
|-----|--------|
| Single ops truth | **FAIL** (doc sprawl) |
| Operator OS exists | **PASS** (`/cockpit`) |
| Free path without Odds | **PASS (code)** / **FAIL (prod proof)** |
| Honest empty public | **PASS** |
| Agents governed | **PASS** |
| Agents autonomous runners | **FAIL (by design)** |
| Neon proven production | **FAIL until smoke** |
| Registry matches code | **FAIL (CLV text)** |
| No double control plane | **FAIL (risk)** |
| Credits without ops | **FAIL priority** |

**Overall: A− architecture, C operational proof, D documentation discipline.**

---

## 8. EXIT

```
audit=brutal-2026-07-29
sot_ui=/cockpit
sot_jarvis=lib/jarvis+lib/cockpit
double_build_risk=HIGH
doc_landfill=CRITICAL
neon_proven=NO
next=prove_env_then_wire_free_settlement_then_fix_registries
forbidden=new_master_plan_without_archive
```
