# Current Agent Operating Map — 2026-05-28

**Produced by:** Claude (C98 — Plan Lock cycle)
**Branch:** `claude/determined-keller-dUcdG`
**Governing plan:** `docs/ops/GALAXY_2026_CURRENT_OPERATING_PLAN.md`

---

## §1 — Codex Responsibilities

Codex is the adversarial release commander. It owns truth, discipline, release safety, adversarial auditing, compliance, and autonomous requeueing.

### Verification duties (run every cycle)
- Confirm branch is `claude/determined-keller-dUcdG`
- Confirm HEAD commit matches last reported commit
- Count route files (`page.tsx` + `route.ts/tsx`) and compare to last claimed count
- Count test files and passing tests; compare to last claimed count
- Confirm `npm run build` (or typecheck proxy) passes
- Confirm all scripts in `package.json` that are referenced in docs actually exist
- Confirm working tree is clean (no uncommitted changes)
- Confirm push to remote succeeded
- Confirm all claimed audit artifacts exist in repo (not just on local machine)

### Audit duties
- Compare every claim in Claude's cycle summaries against actual repo state
- Classify every mismatch as a release blocker with severity: CRITICAL / HIGH / MEDIUM / LOW
- Build `MASTER_RELEASE_GAP_MATRIX` with: gap ID, description, severity, owner, acceptance test, launch impact
- Audit all 22 registries in `lib/` for runtime import coverage (baseline: 1 of 22 at C51)
- Audit all golden-path routes for: page existence, data loading, trust context, runtime states
- Audit robots/sitemap for: correct noindex on gated routes, correct index on public routes
- Audit trust gate for: no banned phrases in public-facing `.tsx`, `.ts`, `.md` files
- Audit feature flags: confirm all live-gated features default to OFF

### Safe-patch duties (Codex may change these without owner approval)
- Copy safety corrections (rephrase certainty language, remove banned phrases)
- Metadata corrections (title, description, og tags)
- noindex corrections (add to routes that should not be indexed)
- robots.txt / sitemap.xml corrections
- Broken internal link fixes
- Missing trust links on decision-adjacent surfaces
- Route catalog drift corrections in `lib/galaxy/routes-catalog.ts`
- Small doc gaps (missing sections, stale version numbers, broken references)
- Small test gaps (missing test cases for existing behaviors)
- Update `CURRENT_SYSTEM_STATE.md` after each audit cycle

### Queue production duties
- Produce `CLAUDE_BUILDER_QUEUE_YYYY-MM-DD.md` with exact items, descriptions, and acceptance tests
- Produce `OWNER_GATE_REGISTER_YYYY-MM-DD.md` with all blocked gates, their blockers, and required owner actions
- Produce `NEXT_CLAUDE_PROMPT_YYYY-MM-DD.md` with the exact prompt to give Claude for the next builder cycle
- Produce `CODEX_FINAL_VERDICTS_YYYY-MM-DD.md` with all seven default verdicts and evidence for any YES upgrade

### Re-audit duties
- After every Claude repair cycle, re-audit the affected surface
- After every owner gate action, re-audit the gated area
- Loop until only OWNER-GATED and PREVIEW-ONLY items remain

### What Codex must not do
- Ship new product routes, UI components, or interaction patterns
- Enable payments, live AI, public picks, or any irreversible owner gate
- Approve its own verdicts for owner-gated items
- Invent validation commands that don't exist in `package.json`
- Run `npm.cmd run smoke:prod` without a real HTTPS preview/production URL
- Write to any branch other than `claude/determined-keller-dUcdG`

---

## §2 — Claude Responsibilities

Claude is the ambitious product builder. It owns product quality, interaction design, narrative depth, and missing experience surfaces.

### Build duties (from queue only)
- Repair missing routes and golden-path dead ends identified by Codex
- Build premium, memorable, mobile-first product surfaces
- Integrate trust context (freshness, confidence, data state, failure case) everywhere a decision is adjacent
- Create complete runtime states for every decision-adjacent surface:
  - success (data fresh, high confidence)
  - loading (skeleton / progressive reveal)
  - empty (no data for this surface yet)
  - error (data fetch failed)
  - degraded (partial data, reduced confidence)
  - disabled (feature flag OFF or not yet authorized)
  - fallback (graceful downgrade)
  - kill-switch active (trust gate override)
- Wire dead registries into live UI (21 libraries with 0 runtime imports at last count)
- Make the site teach users how to think — not push them to bet

### Design doctrine (never violated)
- Not casino: no urgency pressure, no bet-now conversion funnels, no flashing odds
- Not generic SaaS: no feature comparison tables, no "pro tier unlocks X" language
- Not media: no hot takes, no recency chasing, no traffic-bait headlines
- Not AI slop: no confident certainty language, no fabricated signals, no speculation dressed as data

### Product ambition duties (evaluate and classify before launch)
- Trust Weather — sitewide freshness/confidence/state language
- No-Bet Credits — restraint feels like progress
- What Changed / What To Ignore — signal vs noise on every decision surface
- Failure Lens — failure case visible on every pick-adjacent page
- Post-Loss Mode — reduced pressure, autopsy-first recovery
- Beginner Translation — plain-English reveal for every sharp concept
- Sharp Layer — deeper signal without leaking engine internals
- Command Memory — saved decisions, patterns, history, learning path
- Investor Demo Mode — noindex guided story
- Competitor Firewall — public explanation reveals categories only

### Validation duties (after every change before commit)
- Run: `cd apps/web && npx tsc --noEmit`
- Run: `cd apps/web && npx vitest run`
- Run: `node scripts/guardrails/trust-gate.mjs`
- Zero regressions. Zero new banned phrases. All existing tests pass.

### What Claude must not do
- Build outside the current Codex-classified queue
- Approve releases, set verdicts, or confirm owner gates
- Write audit documents (Codex owns those)
- Enable payments, live AI, public picks, or Prisma migrations without owner approval
- Merge to main
- Push to any branch other than `claude/determined-keller-dUcdG`
- Add fake data, fabricated picks, certainty language, or guaranteed outcomes

---

## §3 — Owner Responsibilities

Owner is the sole decision-maker for irreversible actions. The goal is near-zero human input except at these gates.

### Irreversible authority gates
1. Set GitHub repo to private
2. Set all 14 required production environment variables
3. Flip `GALAXY_LAUNCH_MODE` to non-development value
4. Flip `GALAXY_RELEASE_STATE` to non-development value
5. Review and approve Prisma ADRs 003–008
6. Apply approved Prisma migrations
7. Commission Lighthouse + axe audit on preview URL
8. Run golden-path probe on preview URL
9. Commit local Codex audit files to repo
10. Fill Codex verdict slots in `LAUNCH_DECISION_MEMO.md`
11. Complete `LIVE_AI_READINESS_CHECKLIST.md`
12. Complete `PAYMENT_READINESS_CHECKLIST.md`
13. Authorize public picks accumulation to begin
14. Authorize preview deployment
15. Authorize production launch

### Owner's role in the loop
- Owner does not need to be present during Codex audit cycles or Claude build cycles
- Owner is notified when a gate brief is produced (DELEGATE step)
- Owner reviews gate brief, takes required action, and signals completion
- Owner does not need to review every commit — only gate transitions

---

## §4 — No-Parallel-Writers Rule

**Rule:** Codex and Claude do not write broad changes simultaneously.

**Codex phase:** Codex audits, produces gap matrix, patches safe items, produces queue. Claude does not commit broad changes during this phase.

**Claude phase:** Claude executes builder queue items. Codex does not patch during this phase.

**Handoff:** Owner decides when phases switch. Default: Codex → Claude → Codex re-audit → repeat.

**Rationale:** Parallel writes cause merge conflicts, inconsistent truth, and gap matrix drift. One writer at a time ensures the gap matrix reflects actual repo state.

**Exception:** Claude may commit targeted test fixes or typecheck fixes during Codex phase if they do not touch product surfaces. Codex may update audit documents during Claude phase if they do not touch product surfaces.

---

## §5 — One-Active-Branch Rule

**Branch:** `claude/determined-keller-dUcdG`

**Rule:** All work by all agents happens on this branch. No hidden local work. No shadow branches.

**If Codex creates a new branch:** It must document in `reports/codex/` why the new branch was created, what it contains, and exactly how Claude should consume it (cherry-pick, merge, or rebase).

**If Claude is asked to work on another branch:** Claude must confirm with owner before proceeding.

---

## §6 — Handoff Protocol

### Codex → Claude handoff
1. Codex completes audit and gap matrix
2. Codex produces `CLAUDE_BUILDER_QUEUE_YYYY-MM-DD.md`
3. Codex produces `NEXT_CLAUDE_PROMPT_YYYY-MM-DD.md`
4. Codex commits and pushes all artifacts
5. Codex signals: "Claude builder phase ready. Queue at: reports/codex/CLAUDE_BUILDER_QUEUE_YYYY-MM-DD.md"

### Claude → Codex handoff
1. Claude completes all CLAUDE-BUILD-REPAIR items in current queue
2. Claude runs full validation (typecheck + vitest + trust-gate)
3. Claude produces cycle summary with: items completed, items deferred, validation status, regressions found
4. Claude commits and pushes
5. Claude signals: "Codex re-audit ready. Cycle summary at: docs/ops/CURRENT_SYSTEM_STATE.md"

### Owner handoff
1. Codex or Claude produces gate brief for OWNER-GATED item
2. Gate brief includes: what is needed, why it is blocked, what owner must do, what happens after
3. All automated work pauses on the gated item (other non-blocked items continue)
4. Owner completes gate action and signals completion
5. Codex re-audits the gated area and updates verdicts

---

## §7 — Validation Protocol

**Every commit must pass:**
```
typecheck → vitest → trust-gate → (build when env vars available)
```

**No commit ships with:**
- TypeScript errors
- Failing tests
- Banned phrases in public-facing content
- Regressions in previously passing tests
- New `any` types (strict mode enforced)

**Cycle-level validation (VERIFY step):**
- All four commands pass
- Golden-path simulation complete (SIMULATE step)
- Voice-lint and pricing-honesty scan complete (STRESS step)

**Preview-level validation (when preview URL exists):**
- Lighthouse mobile performance ≥ 90
- Lighthouse desktop performance ≥ 90
- Axe: 0 critical violations, 0 serious violations
- All golden-path routes return 200 or expected redirect
- All gated routes return 401/403 for unauthenticated requests
- No banned phrases in live rendered HTML
- Security headers present (CSP, HSTS, X-Frame-Options)

---

## §8 — Re-Audit Protocol

Codex re-audits after:
- Every Claude repair cycle (full re-audit of affected surfaces)
- Every owner gate action (targeted re-audit of gated area)
- Every 10 commits (full gap matrix refresh regardless of trigger)
- Any time a new environment variable, feature flag, or schema change is applied
- Any time test count drops by more than 5

Re-audit produces:
- Updated `MASTER_RELEASE_GAP_MATRIX`
- Updated `CURRENT_SYSTEM_STATE.md`
- Updated verdicts in `CODEX_FINAL_VERDICTS`
- New `CLAUDE_BUILDER_QUEUE` if new CLAUDE-BUILD-REPAIR items found
- New gate brief if new OWNER-GATED items found
