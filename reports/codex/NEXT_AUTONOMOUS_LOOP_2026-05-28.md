# Next Autonomous Loop — 2026-05-28

**Produced by:** Claude (C98 — Plan Lock cycle)
**Branch:** `claude/determined-keller-dUcdG`
**Governing plan:** `docs/ops/GALAXY_2026_CURRENT_OPERATING_PLAN.md`

This document instantiates the SYNC→REQUEUE loop for current repo state. It defines the exact next cycle (C98), the blocked cycles, the current queue priority, and the autonomous trigger conditions.

---

## §1 — Current Queue Priority

Priority is determined by: (a) blocking other work, (b) proximity to golden path, (c) severity of trust/safety impact, (d) leverage on "best overall website of 2026" mission.

| Priority | Cycle | Owner | Classification | Blocking |
|---|---|---|---|---|
| P0 | Codex gap matrix production | Codex | CODEX-SAFE-PATCH | Everything else |
| P0 | C98: Verify C88 homepage lead-with-ledger pivot | Claude | CLAUDE-BUILD-REPAIR | Accurate state knowledge |
| P1 | Runtime import coverage re-audit (21 dead registries) | Codex | CODEX-SAFE-PATCH | P2 wiring work |
| P1 | Route count re-audit (post-C97) | Codex | CODEX-SAFE-PATCH | Accurate gap matrix |
| P2 | Wire dead registries into live UI | Claude | CLAUDE-BUILD-REPAIR | Trust/signal surfaces |
| P2 | Trust Weather component | Claude | CLAUDE-BUILD-REPAIR | Sitewide trust language |
| P2 | Runtime degraded states (all decision surfaces) | Claude | CLAUDE-BUILD-REPAIR | Resilience / STRESS pass |
| P3 | Investor Demo Mode | Claude | CLAUDE-BUILD-REPAIR | Non-sports-investor story |
| P3 | No-Bet Credits UX | Claude | CLAUDE-BUILD-REPAIR | Restraint-as-progress |
| P3 | Post-Loss Mode state | Claude | CLAUDE-BUILD-REPAIR | Post-loss UX integrity |
| P3 | Beginner Translation reveals | Claude | CLAUDE-BUILD-REPAIR | Accessibility of sharp concepts |
| P4 | Competitor Firewall copy | Claude | CLAUDE-BUILD-REPAIR | Engine protection |
| P4 | Command Memory foundation | Claude | CLAUDE-BUILD-REPAIR | Personalization layer |
| BLOCKED | All owner gates | Owner | OWNER-GATED | See §3 |
| BLOCKED | All preview checks | Owner/Infra | PREVIEW-ONLY | Preview URL needed |

---

## §2 — C98 Cycle Brief

**Cycle:** C98
**Mission:** Verify the C88 homepage lead-with-ledger pivot landed correctly. This is the first post-Plan-Lock verification cycle.

### SYNC

- Branch: `claude/determined-keller-dUcdG`
- Read: `docs/ops/GALAXY_2026_CURRENT_OPERATING_PLAN.md`
- Read: `reports/codex/PLAN_ALIGNMENT_AUDIT_2026-05-28.md`
- Read: `reports/codex/CURRENT_AGENT_OPERATING_MAP_2026-05-28.md`
- Read: `docs/ops/AUTONOMOUS_WORK_QUEUES.md` and `AUTONOMOUS_QUEUE_ADDENDUM.md`
- Read: `docs/ops/CURRENT_SYSTEM_STATE.md`
- Confirm: working tree clean

### AUDIT

Run in order:
```bash
cd apps/web && npx tsc --noEmit          # must pass
cd apps/web && npx vitest run            # must pass, record count
node scripts/guardrails/trust-gate.mjs  # must pass, 0 violations
cd apps/web && npm run build             # run if env vars available
```

Expected output:
- Typecheck: PASS
- Tests: PASS (~188 files, ~2730+ tests — flag if count dropped)
- Trust gate: PASS (0 banned phrases)
- Build: PASS or DEFERRED (env vars may not be available in this environment)

Also audit:
- Count `page.tsx` files: `find apps/web/src -name "page.tsx" | wc -l`
- Count `route.ts` files: `find apps/web/src -name "route.ts" | wc -l`
- Count test files: `find apps/web -name "*.test.ts" -o -name "*.test.tsx" | wc -l`
- Check homepage file exists and has lead-with-ledger structure

### CLASSIFY

C88 introduced the lead-with-ledger homepage pivot. Verify:
- Homepage route exists at `apps/web/src/app/page.tsx` (or equivalent)
- Homepage leads with today's ledger/picks state, not a marketing splash
- Homepage has trust context (data freshness, confidence state visible)
- Homepage has clear path to Today's Board
- Homepage degrades gracefully when no data is available

Classify any gaps found as: CODEX-SAFE-PATCH / CLAUDE-BUILD-REPAIR / OWNER-GATED

### IMAGINE

Before patching: does the current homepage make the core loop more inevitable?

The core question is not "does it look good?" It is: does a first-time visitor immediately understand what this product is for, why they should trust it, and what their next step is — even if they have never heard of sports betting?

If the answer is no: classify the gap as CLAUDE-BUILD-REPAIR. If the answer is yes but could be sharper: note it in the improvement backlog.

### PATCH / DELEGATE

- Codex patches: any copy safety issues, metadata gaps, noindex missing from draft/gated routes
- Claude repairs: homepage golden-path dead ends, missing trust context, missing degraded states
- If owner gate encountered: write gate brief, note in §3, pause that item

### VERIFY

After any changes:
```bash
cd apps/web && npx tsc --noEmit
cd apps/web && npx vitest run
node scripts/guardrails/trust-gate.mjs
```
All must pass. Zero regressions.

### SIMULATE

Walk the golden path from homepage:
1. Homepage loads — does it show today's state (picks, confidence, freshness)?
2. Is there a clear, trust-honest path to Today's Board?
3. If data is unavailable — does it say so honestly? No fake picks shown?
4. Does the homepage feel like the beginning of a decision process, not a sales page?

### STRESS

- Voice lint: no "guaranteed," "lock," "will win," "certain," "100%"
- Pricing honesty: no false value claims in homepage copy
- Feature flags: confirm AI and payments features are OFF by default on homepage
- Degraded state: confirm homepage has a graceful empty/no-data state

### SCORE

Rate C98 on 11 dimensions after completion:
- clarity (can a non-sports-bettor understand the homepage in 10 seconds?)
- trust (does the homepage communicate data provenance and limits?)
- emotion (does it feel like a tool worth returning to?)
- originality (does it feel unlike any sportsbook, SaaS, or media site?)
- restraint (does it avoid hype, pressure, and conversion tricks?)
- mobile (does it work well at 390px?)
- performance (does it load fast? no layout shift?)
- accessibility (keyboard navigable? screen reader usable?)
- compliance (no certainty language? no fake guarantees?)
- runtime-states (success / loading / empty / error all handled?)
- "would a non-sports investor remember this?" (yes/no + one sentence why)

### REQUEUE

After C98:
- Update `CURRENT_SYSTEM_STATE.md` with fresh counts
- Identify next highest-leverage gap from audit findings
- Commit cycle summary with ID: `C98: Plan Lock verification — homepage lead-with-ledger audit`
- Push to `claude/determined-keller-dUcdG`
- Next cycle: C99 — runtime import coverage (wire dead registries or document why they should stay dead)

---

## §3 — Blocked Cycles

### OWNER-GATED (paused until owner acts)

| Item | Gate | What Owner Must Do |
|---|---|---|
| Prisma schema migrations | Prisma ADRs 003–008 | Review ADRs, approve, apply migrations |
| Live AI activation | LIVE_AI_READINESS_CHECKLIST.md | Complete checklist, explicitly authorize |
| Payment flow activation | PAYMENT_READINESS_CHECKLIST.md | Complete checklist, explicitly authorize |
| Public picks activation | Canonical history threshold | Authorize accumulation start |
| Preview deployment | Repo privacy + env vars | Set private, set all 14 env vars |
| Launch | All above + Lighthouse + owner verdicts | Complete all gates |
| Codex local audit files | Owner has 5 files locally | Commit them to reports/codex/ |

### PREVIEW-ONLY (paused until preview URL exists)

| Item | Required For |
|---|---|
| Lighthouse mobile/desktop | Performance verdict |
| Axe / WCAG 2.1 AA | Accessibility verdict |
| Route smoke test | Route reality confirmation |
| Security headers check | Security compliance |
| Golden-path probe | Full golden-path verification |
| Mobile screenshots (390px, 430px) | Mobile verdict |
| Private route exposure check | Auth guard verification |

---

## §4 — Autonomous Trigger Conditions

These conditions, when met, automatically unlock the next phase without requiring additional owner input.

### Triggers that unlock Claude build work
- Codex produces `CLAUDE_BUILDER_QUEUE_YYYY-MM-DD.md` → Claude may begin queue items immediately
- Codex completes re-audit and updates gap matrix → Claude proceeds to next P2 item

### Triggers that unlock Codex audit
- Claude completes a repair cycle and pushes → Codex re-audits affected surfaces
- 10 commits accumulate without a Codex re-audit → Codex full audit triggered
- Any test count drop > 5 → Codex immediate re-audit

### Triggers that require owner notification (not blocking, but notify)
- Trust gate finds a new violation
- Test suite drops below 2700 passing tests
- A new OWNER-GATED item is classified
- Any route that previously returned 200 now returns 404 or 500

### Triggers that require owner action (blocking)
- Owner gate condition is reached (see §3)
- Preview URL becomes available → owner must authorize preview checks
- Launch decision is needed → owner reviews verdicts and signs off

---

## §5 — C99–C110 Queue (Tentative)

Subject to revision after Codex gap matrix is produced.

| Cycle | Mission | Owner | Notes |
|---|---|---|---|
| C98 | Verify C88 homepage lead-with-ledger pivot | Claude | **CURRENT** |
| C99 | Runtime import coverage — wire or document 21 dead registries | Claude | High leverage |
| C100 | Trust Weather component — sitewide freshness/confidence language | Claude | Product ambition P2 |
| C101 | Runtime degraded states — all decision-adjacent surfaces | Claude | STRESS gate |
| C102 | Investor Demo Mode — noindex guided story | Claude | Non-investor test |
| C103 | No-Bet Credits UX | Claude | Restraint-as-progress |
| C104 | Post-Loss Mode | Claude | Emotional safety |
| C105 | Beginner Translation | Claude | Sharp concept accessibility |
| C106 | Competitor Firewall copy | Claude | Engine protection |
| C107 | Command Memory foundation | Claude | Personalization layer |
| C108 | Codex full gap matrix + safe patches | Codex | Re-audit before preview prep |
| C109 | Preview preparation (env, robots, sitemap, noindex audit) | Codex + Owner | Owner gates begin |
| C110 | Preview launch + Lighthouse + axe | Owner + Codex | PREVIEW-ONLY gates |
