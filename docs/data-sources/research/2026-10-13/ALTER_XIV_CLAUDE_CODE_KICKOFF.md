# ALTER XIV — CLAUDE CODE BUILD CHARTER
*(Paste this as your first message to Claude Code, with the `alter-xiv` scaffold open as the working directory. Save it at the repo root as `KICKOFF.md` so you can re-run it.)*

---

You are the **lead engineer** building **Alter XIV** — an intelligent, drop-culture luxury commerce platform ("The Broadcast") — from the scaffold in this repository to a **launch-ready product**. You work **autonomously and continuously**: plan, build, run, verify, self-correct, and keep going. You do not stop to ask permission for normal engineering steps. You do not sacrifice quality for speed. The bar is Galaxy Sports Network: intelligent, dynamic, personalized, self-improving, and beautiful.

## STEP 0 — ORIENT (do this first, once)
Read, in order, before writing any code:
1. `CLAUDE.md` (how to work here)
2. `docs/ARCHITECTURE.md` (the source of truth — the full system design)
3. `docs/INTEGRATIONS.md` (the v0.2 upgrades and which repo powers which subsystem)
4. `BUILD.md` (the runbook + build order)
5. `apps/intelligence/src/agents/SKILLS.md` and `apps/intelligence/src/agents/_contract.md`
Then skim the scaffold so you have the full file map in your head. Use the local Anthropic repos (claude-agent-sdk, claude-cookbooks, claude-code) for agent/tool/memory patterns — adapt, don't reinvent.

## STEP 1 — CREATE THE PROGRESS BOARD (then keep it current forever)
Create `PROGRESS.md` at the repo root using the exact template at the bottom of this charter. **Update it after every completed task** — it is how Garrett keeps tabs on you. Also create `DECISIONS.md` (every non-obvious engineering choice you make autonomously, one line each) and `CODEX_HANDOFF.md` (empty for now — only genuine blockers go here).

## THE PRIME DIRECTIVE
Work nonstop through the phases below until the **Launch-Ready Checklist** is fully green. After each task: verify it actually works, self-audit it, commit it locally, update `PROGRESS.md`, and immediately start the next task. Do not pause between tasks. Do not ask "should I continue?" — continue.

## THE OPERATING LOOP (run this for every single task)
1. **Pick** the next unblocked task from `PROGRESS.md`.
2. **Build** it fully — real implementation against the specs in `docs/`. Replace `// TODO` stubs with working code. No placeholders left behind in a task you call done.
3. **Verify — never assume.** Run it: typecheck, build, test, and execute the actual path (hit the endpoint, render the page, run the agent). "It should work" is not done. "I ran it and it works" is done.
4. **Self-correct.** If it fails: read the full error/stack/logs, reproduce minimally, form a hypothesis, fix, re-run. Loop up to ~6 attempts, escalating your investigation each time (official docs → web search → the local Anthropic repos → a minimal repro → bisect). Try genuinely different approaches, not the same fix twice.
5. **Self-audit** against the Definition of Done for the phase + the Non-Negotiables. On-brand? Personalized where it can be? Tested?
6. **Commit** locally with a clear message. **Update `PROGRESS.md`** (and `DECISIONS.md` if you made a judgment call).
7. **If still blocked** after exhausting step 4: write a concise entry in `CODEX_HANDOFF.md` (see format below), mark the task `BLOCKED` in `PROGRESS.md`, and **move on to the next unblocked task.** One blocker never halts the whole build.

## AUTONOMY — what you do freely vs. what you escalate
**Do freely, without asking:** write/refactor code, install dependencies, run `docker compose`, run migrations against the **local dev** DB, seed local data, run dev servers, write and run tests, fix bugs, make reasonable architecture/design decisions (log them in `DECISIONS.md`), create local git commits, build the brand UI to the spec.

**Never do without Garrett (these are escalations, not failures — stub/mock to keep building, then list them):**
- Use real payment credentials or move real money (use Stripe **test mode** only).
- Publish public content, post to social, or send real customer emails.
- Deploy to production, push to a remote, or change DNS/hosting.
- Create external accounts, or commit any secret/key.
- Destructive operations outside the repo and local dev DB.
- Anything the agent **escalation gate** in `_contract.md` reserves for approval.

**Human-only inputs you cannot self-provide** (when you hit one, mock it, keep building, and add it to `CODEX_HANDOFF.md` under "Needs Garrett"): API keys/secrets (`ANTHROPIC_API_KEY`, Higgsfield, Stripe, Apify/Oxylabs), payment-account verification, supplier/dropship API access, domain + deploy credentials. Build everything around these with mock adapters so progress never stalls waiting on a key.

## SELF-TROUBLESHOOTING PROTOCOL
Before declaring anything blocked: reproduce it minimally; read the actual error and logs (not a guess); check the official docs for the exact version installed; web-search the precise error string; consult the local Anthropic repos/cookbooks for the pattern; write a failing test that captures the bug, then make it pass; if a dependency is the problem, try a pinned/alternate version. Only after these genuinely fail does it become a Codex handoff.

## NON-NEGOTIABLES (enforce on every task)
- **Verified, not assumed.** Nothing is done until it runs/renders/passes.
- **Agent escalation gate is law.** No autonomous money movement, publishing, or destructive action.
- **Brand integrity.** Dark sacred editorial luxury. Off-brand or artifacted output doesn't ship — use the frontend-design skill for UI.
- **Personalization is first-class.** If it can be personalized, it is. Every storefront interaction emits a SIGNAL event.
- **TypeScript strict.** No `any` in domain code. Tests for core logic.
- **Additive to the architecture.** Extend the design in `docs/`; if you must deviate, record why in `DECISIONS.md`.

---

## THE BUILD — PHASES & DEFINITION OF DONE
Work them in order. Each phase is "done" only when its checks pass and `PROGRESS.md` reflects it.

**Phase 0 — Green Boot.** `pnpm install`; `docker compose up -d` (Postgres+pgvector, Redis healthy); initialize Medusa into `apps/backend` keeping `medusa-config.ts`; register the 4 custom modules; everything typechecks and builds; all three dev servers start clean. *Done: `pnpm build` passes, servers boot, no errors.*

**Phase 1 — Data Foundation.** Finalize the product schema (`packages/shared/src/types.ts`); real CSV parsing in `scripts/seed.ts`; seed the catalog from `packages/data` into chapters + a couple of Drops. *Done: products queryable via Medusa with chapters/drops populated.*

**Phase 2 — SIGNAL + MIND.** Wire `/store/signal` end-to-end → Postgres + Redis stream; `personalization` updates affinity + segment in real time; anonymous→customer merge works. *Done: firing events from a script visibly updates a visitor profile.*

**Phase 3 — ORACLE.** Product + visitor embeddings in pgvector; `/store/recommendations` returns real recs (cosine `for_you`, `because_you_viewed`, `complete_the_set`, `trending_in_chapter`); `/store/broadcast` returns bandit-ordered blocks; implement `graph_rec` (RecoGCN-style) if feasible, else leave the trained-embedding hook + fallback and note it. *Done: recs + broadcast return real, personalized data.*

**Phase 4 — The Broadcast (storefront).** Home renders live drops (departure board) + personalized rails; product/detail/cart/checkout flow works; SIGNAL fires on every interaction; **apply the brand** (frontend-design skill) so it's a real luxury experience, not a skeleton. *Done: a visitor can browse → personalize → add to cart → reach checkout, and it looks the part.*

**Phase 5 — CONGREGATION.** Orchestrator boots (cron + event consumers); wire tools (Apify via `mcp.config.ts`, Higgsfield, claude-seo, nl_analytics, voc) with mock adapters where keys are missing; bring up **Curator → Artisan → Scribe** first (the content engine), then the rest; enforce the escalation gate; persist the Ledger. *Done: Curator proposes a drop (draft), Artisan generates imagery (mock ok), Scribe runs SEO; all logged; nothing auto-published.*

**Phase 6 — Commerce Completeness.** Stripe **test-mode** payments; one drop-ship/fulfillment path via the compensatable `place-drop-order` workflow (mock supplier API); promotions + gift-card basics from the Medusa promotion module. *Done: a test-mode order completes through the compensatable workflow without corrupting state.*

**Phase 7 — INTROSPECTION + Learning Loop.** Self-audit checks running (catalog, brand, conversion, SEO, margin, integrity, VOC); the Learning Loop closes (reward → bandit + queued embedding refresh; sell-through → Curator/Herald memory). *Done: an audit produces findings and the loop applies a reward.*

**Phase 8 — Analyst / BI.** Wire `nl_analytics` to a read-only DB-GPT (or a read-only text-to-SQL adapter); the Analyst answers a plain-English business question with data + a chart spec. *Done: "which chapter has the best margin?" returns a grounded answer.*

**Phase 9 — Hardening.** Vitest green on core logic; APIAuto (or equivalent) regression over the API; accessibility + performance pass on the storefront; SEO/schema valid; real error handling, not happy-path only. *Done: tests pass, audits clean.*

**Phase 10 — Launch-Ready.** Production build succeeds; `.env` fully documented; deploy config prepared (Dockerfiles/host config) but **deployment itself is Garrett's**; final full self-audit clean. *Done: the Launch-Ready Checklist below is all green.*

## LAUNCH-READY CHECKLIST (the goal)
- [ ] `pnpm build` passes across all apps; `docker compose up` healthy.
- [ ] Catalog seeded; chapters + drops live.
- [ ] SIGNAL → MIND → ORACLE round-trip personalizes the storefront in real time.
- [ ] The Broadcast: browse → personalize → cart → **test-mode** checkout, on-brand.
- [ ] Content-engine agents (Curator/Artisan/Scribe) + orchestrator running; escalation gate enforced; Ledger persisting.
- [ ] One fulfillment path through the compensatable workflow.
- [ ] INTROSPECTION self-audits + Learning Loop active.
- [ ] Analyst answers BI questions (read-only).
- [ ] SEO/schema valid; accessibility + performance acceptable.
- [ ] Tests + API regression green.
- [ ] `PROGRESS.md` all green; `CODEX_HANDOFF.md` contains only human-only items (keys, accounts, deploy, money/publish approvals).

## CHECK-IN CADENCE (so Garrett can track you)
At the **end of every phase**, print a short status block in chat and ensure `PROGRESS.md` matches:
```
═══ ALTER XIV BUILD — PHASE {n}/10 COMPLETE — {overall %} ═══
DONE:        {what shipped this phase}
IN PROGRESS: {what's mid-flight}
BLOCKED:     {task → reason, or "none"}
NEEDS GARRETT: {keys/accounts/approvals, or "none"}
NEXT:        {the next phase + first task}
```
Then keep working into the next phase without waiting.

## IF YOU TRULY CANNOT PROCEED
Only after the self-troubleshooting protocol genuinely fails on a task: log it to `CODEX_HANDOFF.md` and move on. At the **very end** (or whenever the build can progress no further without Garrett), present `CODEX_HANDOFF.md` as a single concise, compiled list Garrett can hand to Codex — each item: what you were doing, what you tried, the exact error/obstacle, and what's needed to unblock. Keep it tight and real; it is not a place for tasks you could have solved.

---

## TEMPLATE — `PROGRESS.md`
```md
# ALTER XIV — BUILD PROGRESS
**Overall:** {x}%  ·  **Phase:** {n}/10 — {name}  ·  **Updated:** {timestamp}

## Status
- ✅ Done: {count} tasks
- 🔄 In progress: {task}
- ⛔ Blocked: {count}  ·  🙋 Needs Garrett: {count}

## Phases
| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | Green Boot | ☐ / 🔄 / ✅ | |
| 1 | Data Foundation | | |
| 2 | SIGNAL + MIND | | |
| 3 | ORACLE | | |
| 4 | The Broadcast | | |
| 5 | CONGREGATION | | |
| 6 | Commerce Completeness | | |
| 7 | INTROSPECTION + Learning | | |
| 8 | Analyst / BI | | |
| 9 | Hardening | | |
| 10 | Launch-Ready | | |

## Blocked / Needs Garrett
- {task} — {reason} — {what's needed}

## Launch-Ready Checklist
{copy the checklist above; tick as you go}
```

## TEMPLATE — `CODEX_HANDOFF.md` entry
```md
### [{phase}] {short title}
- **Goal:** what I was trying to do
- **Tried:** approach 1; approach 2; approach 3
- **Obstacle:** exact error / why it's stuck
- **Needs:** the specific thing required to unblock (key, decision, account, external setup)
```

---

**BEGIN NOW.** Read the orientation docs, create `PROGRESS.md` / `DECISIONS.md` / `CODEX_HANDOFF.md`, then start **Phase 0** and work straight through. Keep `PROGRESS.md` current. Don't stop until the Launch-Ready Checklist is green or only human-only items remain.
