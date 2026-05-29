# Galaxy 2026 — Current Operating Plan

**Status: ACTIVE GOVERNING DOCUMENT**
**Created: 2026-05-29 (C98)**
**Branch: `claude/determined-keller-dUcdG`**

> **Plan Lock.** This file is the current source of truth for all agent and owner decisions. Where this file conflicts with any prior operating document, prompt, or queue, this file wins — unless the owner explicitly overrides it. Prior doctrine (Constitution, Autonomous Excellence Doctrine, Galaxy Operating Control Plane, Release Candidate Plan, Codex Audit Brief) remains active only where consistent with this file.

---

## §1 — Mandate

**Mission:** Build the best overall website of 2026.

Not the best sports product. Not the most feature-complete SaaS. Not the most data-rich dashboard. The best overall website — defined as a trust-first, intelligence-rich, emotionally aware decision system that a non-sports investor would remember, understand, and describe to someone else.

**What this is not:**
- Not a sportsbook. No urgency pressure. No bet-now conversion funnels.
- Not generic SaaS. No feature comparison tables. No "pro tier unlocks X" language.
- Not a media site. No hot takes, no recency chasing, no traffic-bait.
- Not AI slop. No confident certainty language. No fabricated signals. No speculation dressed as data.

**Seven Standards (every surface must pass all seven):**

| Standard | Test |
|---|---|
| Worldview | Does this surface express a clear philosophy about how decisions should be made? |
| Living Data | Is freshness, confidence, and data state communicated honestly? |
| Signature Interactions | Is this interaction different from what any other site would ship? |
| Introspection as Content | Does the product explain its own limits, methods, and uncertainties? |
| Continuous Voice | Does this read like one intelligent author, not a patchwork of features? |
| Narrative Arc | Does the user's session have a beginning, middle, and resolution? |
| Performance as Design | Does speed, load, and degraded-state behavior feel intentional? |

**Golden Path (protected — everything must improve this loop or protect it):**

```
Homepage
→ Today's Board
→ Decision Room
→ Evidence / Trust
→ Coach
→ No-Bet / Parlay MRI
→ Autopsy
→ Command Center
→ Academy
→ Report
→ Demo
```

If a proposed task does not improve this loop, protect it, measure it, or make it recoverable from failure — it is lower priority than any task that does.

---

## §2 — Plan Hierarchy

| Level | Document | Authority |
|---|---|---|
| 1 | Constitution | Never violated. Highest law. |
| 2 | This file | Current operating plan. Supersedes prior layers where they conflict. |
| 3 | Codex Release Command | Codex turns plan into verified truth: branch, routes, tests, gaps, safe patches, owner gates, verdicts. |
| 4 | Claude Builder Queue | Claude only builds from items Codex has classified as CLAUDE-BUILD-REPAIR. |
| 5 | Owner Gates | Owner-only irreversible authority: repo privacy, env vars, Prisma ADRs, payments, live AI, public picks, preview, launch. |

**Constitution (permanent, never negotiable):**
- No fake data. No fabricated evidence. No fabricated picks.
- No guarantees. No certainty language. No "will win" / "lock" / "guaranteed" claims.
- No public exposure of protected methodology, weights, thresholds, or engine internals.
- No autonomous publishing, deploying, paying, or launching.
- No owner-gated flips by any agent.
- No live AI activation until `LIVE_AI_READINESS_CHECKLIST.md` is owner-completed.
- No payments until `PAYMENT_READINESS_CHECKLIST.md` is owner-completed.
- No public picks until canonical settled history accumulates.
- No Prisma schema migrations from CLI — ADR + migration file only.

---

## §3 — Role Separation

### Codex — Truth, Discipline, Release Safety

Codex is the adversarial release commander. It owns verification, auditing, and compliance. It does not build new product surfaces.

**Codex must:**
- Verify branch, HEAD commit, route count, test count, build status, scripts, remote sync, dirty files, and audit artifact presence.
- Compare reported Claude state against actual repo state. Classify mismatches as release blockers.
- Build the master release gap matrix with: gap ID, description, severity, owner classification, acceptance test, and launch impact.
- Patch only safe items: copy safety, metadata corrections, noindex/robots/sitemap fixes, broken links, missing trust links, route catalog drift, small docs/test gaps.
- Run validation using actual `package.json` scripts — not invented commands.
- Produce exact Claude prompts for every builder-owned repair.
- Re-audit after Claude completes repairs. Loop until only owner gates remain.
- Refuse optimistic verdicts without: preview URL, a11y pass, performance pass, owner gates confirmed, privacy review, data readiness, and route reality confirmed.

**Codex must not:**
- Ship new product routes or UI components.
- Enable payments, live AI, public picks, or any owner gate.
- Approve its own verdicts — verdicts require owner sign-off for irreversible gates.
- Invent validation commands that don't exist in `package.json`.

### Claude — Ambitious Product Builder

Claude is the ambitious builder. It owns product quality, interaction design, narrative depth, and missing experience surfaces. It does not audit, verify, or approve releases.

**Claude must:**
- Repair missing routes and golden-path dead ends.
- Build premium, memorable, mobile-first product surfaces.
- Integrate trust context everywhere a decision is adjacent.
- Preserve the Galaxy design doctrine: not casino, not generic SaaS, not crypto dashboard, not AI sparkle.
- Create complete runtime states for every surface: success, loading, empty, error, degraded, disabled, fallback, kill-switch active.
- Make the site teach users how to think — not push them to bet.
- Build from the Codex-generated CLAUDE_BUILDER_QUEUE only. No free-form expansion.
- Keep live AI, payments, public picks, Prisma migrations, and launch gates untouched unless owner-approved.
- Run typecheck + vitest + trust-gate after each repair before committing.

**Claude must not:**
- Approve releases, set verdicts, or confirm owner gates.
- Build outside the current classified queue.
- Write audit documents (Codex owns those).
- Merge to main or push to any branch other than `claude/determined-keller-dUcdG`.

### Owner — Irreversible Authority Gates

Owner is the sole decision-maker for irreversible actions. Human input should be near-zero except at these gates.

**Owner-only gates:**
- Set GitHub repo to private.
- Set all 14 production environment variables.
- Flip `GALAXY_LAUNCH_MODE` and `GALAXY_RELEASE_STATE`.
- Approve Prisma ADRs 003–008 and apply migrations.
- Commission Lighthouse + axe audit on preview URL.
- Run golden-path probe on preview URL.
- Commit Codex audit files currently on local machine.
- Fill Codex verdict slots in `LAUNCH_DECISION_MEMO.md`.
- Complete `LIVE_AI_READINESS_CHECKLIST.md`.
- Complete `PAYMENT_READINESS_CHECKLIST.md`.
- Authorize public-picks accumulation to begin.
- Authorize preview deployment.
- Sign off on launch.

### No-Parallel-Writers Rule

Codex writes during audit/safe-patch cycles. Claude writes during builder/remediation cycles. Owner decides when handoff switches. Both agents must not write broad changes simultaneously — this causes race conditions, merge conflicts, and inconsistent truth.

### One-Active-Branch Rule

All work happens on `claude/determined-keller-dUcdG`. If Codex creates another branch, it must document why and how Claude should consume it. No hidden local work counts as complete.

---

## §4 — Autonomous Loop

Every cycle runs this sequence in order. No steps may be skipped.

```
SYNC
  Read this file.
  Read current test/build state.
  Read gap matrix and builder queue.
  Confirm branch is claude/determined-keller-dUcdG.
  Confirm working tree is clean or staged only.

AUDIT
  Run: npm run typecheck:web (or: cd apps/web && npx tsc --noEmit)
  Run: npm run test:web (or: cd apps/web && npx vitest run)
  Run: node scripts/guardrails/trust-gate.mjs
  Run: npm run build:web (or: cd apps/web && npm run build)
  Log all failures. Compare claimed state vs actual repo state.
  Flag mismatches as release blockers.

CLASSIFY
  Triage every gap into exactly one category:
  - OWNER-GATED: requires irreversible owner action before proceeding
  - CODEX-SAFE-PATCH: safe for Codex to fix without owner review
  - CLAUDE-BUILD-REPAIR: ambitious product work; goes to Claude builder queue
  - PREVIEW-ONLY: can only be validated with a live preview URL
  - DEFERRED-NONBLOCKING: real gap, safe to defer past current milestone
  - UNKNOWN-REQUIRES-STATE-VERIFICATION: blocked pending more information

IMAGINE
  Before patching or delegating, ask:
  - What would make this world-class?
  - What would make it more intuitive?
  - What would make it safer for the user?
  - What would make it harder to copy?
  - What would make it more memorable?
  - What would a non-sports investor understand and remember?
  - Does this make the core loop more inevitable?

  IMAGINE does NOT mean: add more routes, more animation, more AI, more hype, more complexity.
  The question is always: does this make the core loop more inevitable?

PATCH
  Codex patches CODEX-SAFE-PATCH items.
  Claude repairs CLAUDE-BUILD-REPAIR items from the current queue.
  No scope creep. One owner per item. No parallel writes.

DELEGATE
  If OWNER-GATED items exist: write a gate brief and stop. Do not proceed past the gate.
  If Codex audit is needed: write an audit brief and stop for handoff.

VERIFY
  After every change:
  typecheck → vitest → trust-gate → build must all pass.
  Zero regressions. Zero new banned phrases.

SIMULATE
  Walk the golden path mentally (or with a browser if preview exists):
  Homepage → Board → Decision Room → Evidence → Coach → No-Bet → Autopsy → Command Center → Academy → Report → Demo
  Flag any dead end, broken route, missing state, or trust gap.

STRESS
  Run voice-lint scanner (no guarantee/certainty language).
  Run pricing-honesty scanner (no false value claims).
  Check feature-flag defaults (all live-gated features must be OFF by default).
  Check runtime degraded states exist on every decision-adjacent surface.

SCORE
  Rate the cycle on 11 dimensions (0–10 each):
  clarity | trust | emotion | originality | restraint | mobile | performance |
  accessibility | compliance | runtime-states | "would a non-sports investor remember this?"
  Log scores. Flag any dimension below 7.

REQUEUE
  Update gap matrix: mark closed items, add new gaps found.
  Identify next highest-leverage gap.
  Write cycle summary.
  Commit all changes with cycle ID (C98, C99, ...).
  Push to claude/determined-keller-dUcdG.
```

---

## §5 — Product Ambition: Required Ideas to Explore

These are not optional features. They are the difference between a release-ready product and the best website of 2026. Each must be evaluated before launch. Not all need to ship before launch, but each needs a classification: ship / defer / not-applicable.

| # | Idea | Core Question |
|---|---|---|
| 1 | **Trust Weather** | Can a user see, at a glance, whether today's data is fresh, confident, or degraded — across the entire site? |
| 2 | **No-Bet Credits** | Does restraint feel like progress? When a user skips a bet, do they gain something? |
| 3 | **What Changed / What To Ignore** | On every decision surface, is signal separated from noise explicitly? |
| 4 | **Failure Lens** | On every pick-adjacent page, is the failure case visible and honest? |
| 5 | **Post-Loss Mode** | After a loss, does the product reduce pressure, remove chasing language, and route to autopsy first? |
| 6 | **Beginner Translation** | Does every sharp concept have a plain-English reveal one tap away? |
| 7 | **Sharp Layer** | Can experienced users inspect deeper signal without leaking engine internals? |
| 8 | **Command Memory** | Does the product remember saved decisions, risk patterns, no-bet history, and learning path? |
| 9 | **Investor Demo Mode** | Is there a noindex, guided story that proves the product loop without fake live claims? |
| 10 | **Competitor Firewall** | Does any public explanation reveal only categories and rationale — never weights, thresholds, or engine internals? |

---

## §6 — Current State (Post-C97)

| Area | Status |
|---|---|
| Cycles complete | C61–C97 (37 cycles) |
| Signature moments | All 10 shipped |
| Infrastructure | Complete |
| Test suite | ~188 files, ~2730 passing |
| Build | Clean (typecheck proxy) |
| Trust gate | Clean |
| Proof gap | Zero canonical settled picks — honest, gated, accumulation plan in place |
| Launch readiness docs | Complete (all 5 owner-facing memos in docs/ops/) |
| Route surfaces (page.tsx) | ~104 confirmed at C51; may be higher post-C97 |
| Runtime import coverage | 1 of 22 registries driving live UI at C51; status post-C97 unknown — needs re-audit |

---

## §7 — Owner Gates (Blocked Until Owner Acts)

| Gate | Status | Blocking |
|---|---|---|
| GitHub repo set to private | PENDING OWNER | Preview / Launch |
| 14 env vars set in production | PENDING OWNER | Preview / Launch |
| `GALAXY_LAUNCH_MODE` transition | PENDING OWNER | Launch |
| `GALAXY_RELEASE_STATE` transition | PENDING OWNER | Launch |
| Prisma ADRs 003–008 approved | PENDING OWNER | Schema migrations |
| Lighthouse + axe audit on preview URL | PENDING PREVIEW URL | Launch |
| Golden-path probe on preview URL | PENDING PREVIEW URL | Launch |
| Codex audit files committed to repo | PENDING OWNER | Gap matrix accuracy |
| Codex verdict slots filled in LAUNCH_DECISION_MEMO.md | PENDING CODEX+OWNER | Launch |
| LIVE_AI_READINESS_CHECKLIST.md completed | PENDING OWNER | Live AI |
| PAYMENT_READINESS_CHECKLIST.md completed | PENDING OWNER | Payments |
| Public picks accumulation authorized | PENDING OWNER | Public picks |

---

## §8 — Default Verdicts

These stand until proven otherwise by: actual preview URL + owner gates confirmed + full validation pass.

| Verdict | Default |
|---|---|
| SAFE TO CONTINUE BUILDING | **YES** |
| SAFE TO MERGE TO MAIN | NO |
| SAFE TO DEPLOY PREVIEW | NO |
| SAFE TO PUBLIC LAUNCH | NO |
| SAFE TO ENABLE PAYMENTS | NO |
| SAFE TO ENABLE LIVE AI | NO |
| SAFE TO ENABLE PUBLIC PICKS | NO |

---

## §9 — Validation Gate (Every Cycle)

Run in this order. All must pass before commit.

```bash
# Step 1: Typecheck
npm run typecheck:web
# fallback: cd apps/web && npx tsc --noEmit

# Step 2: Tests
npm run test:web
# fallback: cd apps/web && npx vitest run

# Step 3: Trust gate
node scripts/guardrails/trust-gate.mjs

# Step 4: Build
npm run build:web
# fallback: cd apps/web && npm run build
```

**Preview-only validation (requires live HTTPS URL):**
- Golden-path probe
- Lighthouse mobile (target: 90+ performance)
- Lighthouse desktop
- Axe / WCAG 2.1 AA pass
- Mobile screenshots at 390px and 430px
- Route smoke (all registered routes return 200 or expected redirect)
- Robots/sitemap check
- Private route exposure check (no gated content accessible without auth)
- Security headers check
- Demo/live/historical labels verified on all pick-adjacent surfaces

---

## §10 — Supersession Map

| Document | Status |
|---|---|
| Autonomous Excellence Doctrine | MERGED INTO THIS FILE |
| Galaxy Operating Control Plane | MERGED INTO THIS FILE |
| Release Candidate / Resilience Plan | STILL ACTIVE (owner-action sections); loop/role sections MERGED HERE |
| Codex Audit Brief (C93) | STILL ACTIVE as Codex input prompt |
| AUTONOMOUS_WORK_QUEUES.md | STILL ACTIVE as queue source until replaced by CLAUDE_BUILDER_QUEUE |
| AUTONOMOUS_QUEUE_ADDENDUM.md | STILL ACTIVE as queue source until replaced |
| CURRENT_SYSTEM_STATE.md | SUPERSEDED for role/loop sections; state data still valid until re-audited |
| Prior Claude runtime plan (C61–C97) | SUPERSEDED — all cycles complete |
| Any prompt not referenced here | INACTIVE unless explicitly reactivated by owner |
| This file | **CURRENT GOVERNING PLAN** |

---

## §11 — Next Step After Plan Lock

1. Codex produces `MASTER_RELEASE_GAP_MATRIX` — the real roadmap.
2. Codex patches all CODEX-SAFE-PATCH items.
3. Claude repairs CLAUDE-BUILD-REPAIR items from the queue.
4. Codex re-audits.
5. Owner handles owner gates.
6. Preview deployment.
7. Lighthouse / axe / screenshots.
8. Beta packet.
9. Launch memo.
