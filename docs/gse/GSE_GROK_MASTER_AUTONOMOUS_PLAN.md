# GSE — GROK MASTER AUTONOMOUS PLAN

**One file. Run from this alone.**  
Issued: 2026-07-30 · Product: Galaxy Sports Edge · Estate: Beexly/*  
Authority: build freely **inside the fences**; escalate at the fences.  
Bar: a hostile expert inspects for a day and cannot catch GSE overclaiming once.

Companion docs add depth; **this file wins** on conflict (newest consolidation).

---

## 0. HOW TO USE THIS DOCUMENT

You are an autonomous coding agent. Your job is a **closed loop**:

```text
DISCOVER → PLAN → IMPLEMENT → PROVE → POLISH → AUDIT → LEARN → REPEAT
```

until every in-scope item is green, customer-facing surfaces are honesty-clean, and the completion signal can be emitted with evidence.

Rules:

1. **Never skip Phase 0 (verify HEAD + fences).**
2. **Never write ingestion against uncleared sources.**
3. **Never flip founder gates, publish picks, or send external outreach.**
4. **Never claim work you did not run.** If you did not run it, say so.
5. **Research and develop as needed** inside fences; lessons learned mid-flight become FINDINGS.md + small PRs, not silent scope explosion.
6. **Prefer reuse** of existing modules over greenfield math/engines.
7. **Small commits, conventional messages, why-comments on every safety guard.**

---

## 1. STATE OF THE WORLD (re-verify at run start; do not invent)

### 1.1 Repos in estate

| Repo | Role |
|------|------|
| **Beexly/Sports** (PRIVATE) | Production GSE monorepo · Vercel `sports-web` → www.galaxysportsedge.com |
| Beexly/gse-competitive-intel | Competitive / rights research support |
| Beexly/Project-Tree | Tree / structure tooling |
| Beexly/Clouds-bruh | Adjacent experimental |
| Beexly/XXX | Adjacent experimental |

Primary build target: **Beexly/Sports**. Other repos: leverage scan only unless a ticket explicitly names them.

### 1.2 HEAD discipline

- Confirm current `main` SHA at run start; report it.
- Last session anchors: `ed269baf` (directive), `3dfbc726` (B-0 era), branch `gse/phase2-binary-conformal-adapter` (UQ/docs work).
- Stale zips/snapshots are forbidden as patch bases.

### 1.3 Binding decisions (founder-delegated — do not re-litigate)

| # | Decision | Constraint |
|---|----------|------------|
| 1 | Fantasy-first on **nflverse** as near-term public surface | Rename (A-1) before any new public surface |
| 2 | Wikidata (CC0) + openfootball (PD) | **PROPOSED only** — separate file, not live registry, not built on |
| 3 | Permanent fence: henrygd-ncaa · mlb-statsapi · nhl-web-api · balldontlie · gamma/kalshi | Until written grant or counsel-approved registry entry |
| 4 | FTN: internal-only pending counsel on Adapted-Material | Prepare brief only |
| 5 | Commercial outreach briefs | Prepare only — **never send** |
| 6 | LinTS factorization | **Cholesky only**; refuse non-SPD; no Bunch–Kaufman in LinTS |
| 7 | Offline hyperparam selectors | `gridSearchShadow` / `ucbSelectNext` / `infoGainSelectNext` — shadow, `autoPromoted: false` |
| 8 | Pinnacle CLV | Built, double-gated; activation = founder Odds API key + flag order |

### 1.4 Rights ground truth

- **nflverse** = only free source cleared for storage + commercial_display (CC-BY-4.0, attribution; carve-outs excluded).
- **the-odds-api** = approved_api, free tier 500 credits/mo.
- **espn-public-api** = storage FORBIDDEN (live violation in `persistFreeScores()` → ticket G-1, founder cutover).
- Everything else: fenced until registry entry exists.

### 1.5 Constitution

- Read `CLAUDE.md` at repo root in full. It outranks this file on conflict; say so if conflict found.
- Read `apps/web/lib/scraping/source-rights-registry.ts` and `clearance-engine.ts` before any data work.

---

## 2. FENCES (absolute)

| Fence | Meaning |
|-------|--------|
| No self-approving registry entries | PROPOSED files only |
| No ingestion from fenced score APIs | henrygd, mlb-statsapi, nhl-web-api, balldontlie, gamma/kalshi |
| No honesty-gate flips | Founder only |
| No published picks / public overclaims | Gates + copy review |
| No external sends | Outreach briefs stay internal |
| No money decisions via LinTS/Kelly without signed explore policy | Modules stay dark |
| No fabricating data or test theater | Ran-and-verified evidence only |
| No mass-merging stale PR backlog without per-PR review | |
| Verify **both** schedulers (GitHub Actions + `vercel.json`) on any cadence change | B-0 lesson |

If blocked: emit completion block with `STATUS: BLOCKED` and the exact unblocking question. Never route around a fence.

---

## 3. AUTONOMOUS LOOP (core OS)

### 3.1 Loop body (every ticket)

```text
1. DISCOVER    Confirm HEAD, read constitution + registry, locate existing code
2. PLAN        Ticket DoD, files touched, tests, risks, fence check
3. IMPLEMENT   Smallest correct change; reuse before invent
4. PROVE       typecheck · lint · build · targeted suites · idempotency if data
5. POLISH      Comments, names, dead code, copy honesty, no overclaim
6. AUDIT       Adversarial self-review: 3 weaknesses found and fixed or logged
7. LEARN       Append FINDINGS.md (dead code, vacuous tests, N+1, overclaim copy)
8. COMMIT      Conventional message; why-comment on every guard
9. REPORT      Update rolling ticket table + evidence refs
```

### 3.2 Research-as-you-go

- Allowed: papers, licenses, API docs, competitor honesty patterns, math reuse.
- Not allowed: acting on research that crosses a fence without founder/counsel.
- Findings feed Phase 3 / excellence sweep — reported, not silently self-actioned outside scope.

### 3.3 Improvement bias

If while implementing you see a **local** improvement that:

- does not cross fences,
- does not expand customer claims,
- is proven by tests,

→ make it in the same or follow-up small commit.  
If improvement is cross-cutting or political → FINDINGS.md + BLOCKED ON FOUNDER if needed.

### 3.4 Proof standard

| Claim | Required evidence |
|-------|-------------------|
| Type-safe | typecheck pass log |
| Lint-clean | lint pass log |
| Builds | build pass log |
| Behavior | test name + assertion intent |
| Clearance | test that wrong source/intent fails |
| Idempotent ingest | row counts run1 vs run2 |
| Quota | requests/month math vs headers |
| Copy honesty | gate flags + string review notes |

No evidence → do not mark done.

---

## 4. WORKSTREAM MAP (A–K + session extensions)

Execute **NOW queue first** (section 5). Parallel only when no file conflict and fences clear.

| WS | Name | Intent |
|----|------|--------|
| **A** | Naming / constitution / tripwires | A-1 rename before public surface; CLAUDE.md hygiene |
| **B** | Data plane / cron / CLV / quotas | B-0 done; B-1…B-12; cadence×cost; Pinnacle activation path |
| **C** | Clearance / registry | PROPOSED-only expansions; no live merges without founder |
| **D** | Trust engine / UQ | Murphy Brier (exists); Mondrian+ACI (exists); binary adapter (branch); no gate flip |
| **E** | Prediction / calibration | Reuse PAVA, shin-devig; no vanity metrics |
| **F** | Fantasy-first surface | nflverse-only public path; attribution |
| **G** | ESPN / forbidden storage remediation | G-1 founder cutover choice |
| **H** | Pre-mortems / load / bus-factor | Report, don’t pretend fixed |
| **I** | Estate / multi-repo leverage | Scan; don’t expand production onto experimental repos |
| **J** | CI / preview / merge hygiene | Green checks; no theater |
| **K** | Public copy / honesty | K-1…K-4; every number auditable |
| **L** | Session math locks | LinTS Cholesky decision; offline selectors shadow-only |
| **M** | Launch readiness | Section 7 checklist — all green |

---

## 5. NOW QUEUE (strict order)

1. **Phase 0** — Verify HEAD; read CLAUDE.md + registry + clearance-engine; report SHA.  
2. **A-1** — Rename tripwire lands **before** any new public surface.  
3. **CRON_MATRIX hygiene** — Both GitHub Actions and `vercel.json` agree; B-0 gamma unscheduled verified on next deploy path.  
4. **B-11 path** — Document-only until founder sets `CLOSING_ODDS_API_KEY`; no fake live CLV.  
5. **B-12** — Quota alerts against free-tier math.  
6. **Foundation B-1…B-10** — As in Master Build Plan; clearance-block tests; idempotency proofs.  
7. **Merge branch UQ docs/adapters** — After vitest green: binary conformal adapter, scoring-rules, odds-api-voi, offline-hyperparam-search, decision docs — **still shadow / non-priced**.  
8. **Fantasy-first surface (F)** — nflverse-only, attribution, no fenced sources.  
9. **K-wave** — Public copy honesty vs gates.  
10. **Launch readiness (M)** — Section 7.  
11. **Excellence sweep** — FINDINGS.md burn-down that is fence-safe.

Do not start customer-facing polish on uncleared multi-sport schedules.

---

## 6. OUTSTANDING ITEM REGISTER (seed — expand while running)

### 6.1 Founder-only (report; never execute)

| Item | Unblocks |
|------|----------|
| Free Odds API key → `CLOSING_ODDS_API_KEY` | Live Pinnacle CLV leg |
| Decline stale jacobmyers692 Vercel team invite; keep rescue BRANCH | Team hygiene |
| G-1 ESPN cutover choice | Remove forbidden storage path |
| Counsel: FTN Adapted-Material + proposed registry entries | FTN / Wikidata / openfootball |
| Gate flips per thresholds | Public confidence surfaces |
| Stripe go-live | Payments |
| Cloud credit applications | Cost runway |
| Canonical CLAUDE.md declaration if A-7 prepares diff | Constitution |
| Signed explore/exploit policy | Any LinTS/Kelly money path |

### 6.2 Engineering (agent-executable inside fences)

| Item | Notes |
|------|-------|
| A-1 rename | First |
| Cron dual-scheduler audit | Permanent |
| Clearance tests for every ingest path | |
| Idempotent upserts (batch N+1) | |
| Fantasy-first nflverse UI/API | Attribution |
| Shadow UQ merge when tests green | No price/gate |
| Copy audit K-1…K-4 | |
| G-1 prep (not cutover) | Founder chooses |
| Dead code / vacuous tests from FINDINGS | |
| Multi-repo leverage inventory | Read-only unless ticketed |

### 6.3 Explicit non-goals (leave out = strength)

- Soft-book primary CLV  
- Unregistered free score APIs  
- Auto-promoting hyperparam search winners  
- Continuous GP-MES in production  
- BK/indefinite factors inside LinTS  
- Publishing picks before gates  
- Agent-sent vendor email  

Document these as **honesty architecture**, not missing features.

---

## 7. LAUNCH-READY BAR (all must be green)

### 7.1 Technical

- [ ] typecheck pass  
- [ ] lint pass  
- [ ] production build pass  
- [ ] critical suites pass (list counts before→after)  
- [ ] clearance-block tests pass  
- [ ] dual scheduler audit clean  
- [ ] no forbidden storage path left without founder ticket  

### 7.2 Rights / honesty

- [ ] Public surface uses only cleared sources  
- [ ] Attribution present where required (nflverse)  
- [ ] No copy claims beyond gate state  
- [ ] Provenance stamps on stored rows  
- [ ] Fenced sources named as fenced in internal docs  

### 7.3 Product

- [ ] Fantasy-first path demoable on nflverse  
- [ ] CLV path documented; live only with key  
- [ ] Error/empty states honest (no fake lines)  
- [ ] Mobile + desktop critical flows smoke-checked  

### 7.4 Ops

- [ ] Quota math vs Odds free tier  
- [ ] Cron cost matrix reviewed  
- [ ] Rollback path known  
- [ ] FINDINGS.md open items classified (fix now / later / founder)  

### 7.5 Estate

- [ ] Sports main green  
- [ ] Branch/PR inventory reported  
- [ ] Experimental repos not accidentally wired into production  

**Launch-ready ≠ all research done.** Launch-ready = customer-facing claims true, fences held, fantasy-first surface real.

---

## 8. CUSTOMER-FACING SURFACE CHECKLIST

Audit every user-visible string and number:

| Surface | Check |
|---------|-------|
| Marketing / landing | No performance claims without gate |
| Pick cards / confidence | Shadow vs live labels accurate |
| Stats / charts | Source + rights path |
| Fantasy | nflverse attribution |
| Odds / CLV | Not live without key; no soft-book primary |
| Empty states | Explain hold, don’t invent data |
| Legal / disclaimer | Aligned with honesty architecture |
| Chat/support macros | No overpromise |

---

## 9. SESSION ASSETS TO REUSE (do not rebuild)

| Asset | Location / note |
|-------|-----------------|
| Murphy Brier | `probability-calibration.ts` |
| PAVA isotonic | same |
| Shin de-vig | `shin-devig.ts` |
| Mondrian residual manager | conformal modules |
| ACI | tweedie-aci / adaptive modules |
| LinTS | `linear-thompson.ts` — Cholesky only |
| Pinnacle archive | double-gated |
| Binary conformal adapter | branch |
| scoring-rules / VoI / offline search | branch |
| Factorization decision | `docs/gse/LINTS_FACTORIZATION_DECISION.md` |
| Entropy search map | `docs/gse/ENTROPY_SEARCH_VARIANT_MAP.md` |
| Honesty leverage map | branch docs |
| Founder activation runbook | branch docs |

---

## 10. MULTI-REPO LEVERAGE PROTOCOL

1. Inventory each Beexly repo: purpose, last commit, secrets risk, overlap with Sports.  
2. Extract **ideas and docs**, not unclean code merges.  
3. Never point production Vercel at experimental repos.  
4. Competitive-intel: rights and vendor notes only → PROPOSED registry drafts.  
5. Report estate table in every completion block.

---

## 11. LEARNING & POLISH PROTOCOL

After every ticket:

1. List 3 weaknesses in your own diff; fix or log.  
2. Delete dead code you touched if safe.  
3. Replace vacuous tests with invariants that would fail on real regressions.  
4. Upgrade comments to **why**, not what.  
5. If a name lies, rename (A-1 discipline).  
6. Append FINDINGS.md with severity: P0 fence · P1 honesty · P2 quality · P3 idea.

---

## 12. COMPLETION SIGNAL

Emit exactly:

```text
STATUS: COMPLETE | PARTIAL | BLOCKED
WORKED FROM COMMIT: <sha at start> → <sha at end>
TICKETS: <id · status · files · tests · DoD evidence ref>
TESTS: typecheck <out> · lint <out> · build <out> · suites <n/n before → after>
CLEARANCE-BLOCK TEST: <file:line> · <pass evidence>
IDEMPOTENCY PROOF: <when applicable>
QUOTA MATH: <when applicable>
SELF-REVIEW: <3 weaknesses found and fixed>
FINDINGS.md: <count> items
ESTATE: repos <n/n> · branches/PRs summary
SHIPPED: <what works now that did not>
NOT SHIPPED: <chosen non-goals and why>
BLOCKED ON FOUNDER: <numbered yes/no or single choice>
BLOCKED ON COUNSEL: <numbered or NONE>
CRITICAL PATH TO FIRST HONEST PUBLISHED PICK: <ordered steps with owners>
LAUNCH READINESS: <§7 checklist % green + blockers>
CONFIDENCE: <high/medium/low> — precisely why
```

---

## 13. CRITICAL PATH TO FIRST HONEST PUBLISHED PICK

1. Founder: A-1 + fantasy-first approved path live on nflverse (agent implements).  
2. Founder: G-1 cutover choice executed.  
3. Founder: Odds key + CLV flags per runbook (optional for first pick if pick doesn’t claim CLV).  
4. Agent: clearance + provenance on every row feeding the pick.  
5. Agent: K-copy audit — pick UI claims ⊆ gate state.  
6. Founder: gate flip only when thresholds met.  
7. Publish one pick; adversarial copy check same day.

Until then: **no published pick.** Fantasy-first and shadow UQ may ship earlier as non-pick surfaces.

---

## 14. AGENT FREEDOM CHARTER

You may:

- Research licenses, APIs, papers, numerical methods  
- Add shadow pure functions and tests  
- Fix bugs, dead code, vacuous tests in touched code  
- Improve names, comments, batching, types  
- Expand FINDINGS and PROPOSED docs  
- Reorder fence-safe subtasks for efficiency  

You may not:

- Cross fences  
- Self-approve rights  
- Flip gates / publish / email vendors  
- Wire shadow UQ or LinTS to money  
- Mark done without proof  
- Expand production onto experimental repos  

---

## 15. START COMMAND

```text
1. Verify HEAD on Beexly/Sports main; report SHA
2. Read CLAUDE.md, source-rights-registry.ts, clearance-engine.ts
3. Execute NOW queue item 2 (A-1) unless already proven done
4. Loop §3 until §7 launch bar is honest
5. Emit §12 completion signal
```

**The leave-outs are the product.** Rights-clean, auditable, fantasy-first, fenced score APIs, Cholesky-only LinTS, shadow UQ until gates — these are differentiators, not debt.

Work until the checklist is green or the block is precise. No theater. No silent stalls. Go.
