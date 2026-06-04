# PR Review Checklist

Operational doc for the autonomous loop's review step. Used by Claude when reviewing Codex PRs tagged `@claude-review`. Codex self-checks against it before tagging.

The master plan (Part 1.5) defines the 10-point auto-review checklist. This doc turns it into a concrete form with examples and rejection criteria.

---

## When this checklist applies

A PR triggers this review when it touches **joint territory** per master plan Part 1:

- `apps/web/app/cockpit/layout.tsx`
- `packages/db/prisma/schema.prisma` (proposed via markdown handoff; Codex implements)
- `apps/web/lib/trust-claims.ts`
- `apps/web/lib/promotions/guards.ts`
- Generated client / types files
- Methodology, pricing, FAQ, glossary pages (content from Claude → Codex implements)
- Marketing component files (`apps/web/components/marketing/**`) — copy from Claude → Codex implements
- Any PR Codex explicitly tags `@claude-review`

PRs entirely in Codex's lane (Prisma migrations, route handlers in non-joint areas, test files, package configs) do NOT require Claude review unless Codex flags them.

---

## The 10-point checklist

Run in order. Stop and flag at first failure. Maximum 3 review rounds before escalation to the stuck queue.

### 1. Spec compliance ✅

**Question:** Does the implementation match what the brief + relevant spec doc said it should do?

**Pass criteria:**
- Surfaces shipped match what the brief listed.
- Acceptance criteria from the relevant spec doc are addressed.
- No major scope deviation. Smaller scope is OK if explicitly documented in the PR; larger scope requires a decision-log entry.

**Common failure mode:** Codex implements something adjacent to the spec (e.g., builds a feature that "would also be useful") without flagging the deviation. Reject with "this is out of scope for the brief; either drop it or document the scope expansion in `docs/ops/decision-log.md`."

### 2. Voice scan ✅

**Question:** Does any banned vocabulary from `docs/positioning.md` appear in user-facing output?

**Pass criteria:**
- `apps/web/lib/compliance-scanner/rules.ts` is wired in for AI-generated surfaces.
- No banned-vocab hits on rendered HTML (run `grep -rn -E "(AI-powered|AI-driven|Mission Control|ecosystem|level up|unlock your|transform your)" --include="*.tsx" --include="*.ts"` against changed files).
- First-person algorithm voice absent ("I see," "I think," etc.).
- No anthropomorphic framing ("the board stays quiet," "the model hunts").
- Brand-safety tests still pass.

**Common failure mode:** A new template or copy block introduces "AI-powered" or "Mission Control" by accident, especially via copy-paste from an external source. Reject with the specific banned-vocab hit + suggested rewrite.

### 3. Visual diff ✅

**Question:** What changed visually? Does it look right?

**Pass criteria:**
- Desktop screenshot of every visual change attached to the PR.
- Mobile screenshot at 390px attached to the PR.
- New surfaces match the design philosophy: cinematic / luxury-OS, oversized compressed type, asymmetric layouts, ultraviolet accents.
- No horizontal overflow at 390px.
- Tap targets 44px+ on interactive elements.
- WCAG AA contrast preserved.

**Common failure mode:** Screenshot only shows desktop; mobile rendering has horizontal scroll. Reject with "mobile screenshot at 390px required; please verify no horizontal overflow."

### 4. Test coverage ✅

**Question:** Are new behaviors tested?

**Pass criteria:**
- New routes have at least a smoke test (renders without error).
- New API endpoints have a contract test (returns expected shape).
- New business logic has unit tests for happy-path + at least one edge case.
- Bootstrap-state paths covered when relevant.
- Settled-pick paths covered when relevant.
- Eval files exist for new AI-output surfaces.

**Common failure mode:** New API endpoint shipped without a test. Reject with "this endpoint needs a contract test in `apps/web/__tests__/<surface>.test.ts`."

### 5. Performance ✅

**Question:** Did the bundle get bigger? Did anything slow down?

**Pass criteria:**
- Bundle size delta under budget (no new chart library / animation library / etc. unless approved).
- Lighthouse scores within 5 points of baseline for changed pages.
- No new N+1 query patterns introduced.
- New endpoints stay under their latency target (typically 500ms p95).

**Common failure mode:** Codex pulls in a new dependency that adds 50KB to the bundle. Reject with "new dependency adds significant bundle weight; can we use what's already in the tree?" Reference Part 4 rule 4.

### 6. Accessibility ✅

**Question:** Is the new surface accessible?

**Pass criteria:**
- Semantic HTML (use `<button>` not `<div onclick>`).
- `aria-label` on icon buttons.
- Keyboard navigation works on interactives (Tab order sensible, Enter/Space activate).
- Color contrast WCAG AA minimum.
- Form inputs have visible labels.

**Common failure mode:** Icon-only button without aria-label. Reject with "add `aria-label` describing the action."

### 7. Mobile-first ✅

**Question:** Does it work at 390px?

**Pass criteria:**
- No horizontal overflow.
- Type readable without zoom (16px minimum body text).
- Tap targets 44x44px minimum.
- Touch interactions don't conflict (no accidental triggers).

**Common failure mode:** Hero h1 set in vw units that produce 156px at 390px viewport. Reject with "h1 wraps off-screen at mobile; cap at ~64-72px or use clamp()."

### 8. Bootstrap respect ✅

**Question:** Does the change handle bootstrap-canonical gating correctly?

**Pass criteria:**
- `PERFORMANCE_STATS_ENABLED=false` path renders empty state, not crashed page.
- `PUBLIC_PICKS_ENABLED=false` path doesn't leak picks publicly.
- Bootstrap-era data marked with `isBootstrap: true` doesn't display as canonical.
- New endpoints respect the trust gates.

**Common failure mode:** A new page reads `Pick.findMany` without filtering on `isBootstrap: false`, leaking bootstrap-era data into a "canonical only" surface. Reject with "this query needs to filter out bootstrap rows."

### 9. Integration ✅

**Question:** Does this change break or conflict with anything from a prior PR?

**Pass criteria:**
- Imports resolve correctly across changed files.
- No type errors in unchanged files (`npm run typecheck` clean).
- No test regressions (`npm run test --workspace=apps/web` clean).
- No file collisions with PRs in flight.
- Follows the loader-extraction pattern (DEC-026) if shipping new server-rendered surfaces.

**Common failure mode:** Page imports the API GET function directly (`import { GET } from '../api/board/state/route'`) instead of using the loader module. Reject with "follow the DEC-026 pattern: page reads loader, route wraps loader."

### 10. Documentation ✅

**Question:** Did anything need to be updated in docs?

**Pass criteria:**
- Master plan amended (if a major decision changed).
- `docs/ops/decision-log.md` has an entry (if a new decision was made during implementation).
- `docs/innovation-os-current-state.md` reflects the new state (if it was a structural change).
- `docs/product/*-spec.md` updated (if the spec contract changed during implementation).
- PR description includes: what changed, what surfaces, what tests cover, screenshots.

**Common failure mode:** Codex made an implementation choice that diverges from the spec (e.g., chose option B for an `OPEN-*` open item) without logging the decision. Reject with "add a decision-log entry resolving `OPEN-*` before merge."

---

## Review outcome

After running all 10:

- **All pass:** Approve the PR with a one-line comment ("Approved — all 10 checks pass.").
- **Any fail:** Post a review with specifics. Cite the failing checkpoint by number ("Check #2 (voice scan) — 'AI-powered' found at `apps/web/components/marketing/foo.tsx:42`. Please remove or document why this is permitted.").
- **Multiple fails:** Post a single review covering all of them. Codex addresses in one round, not piecemeal.

After 3 unresolved review rounds → escalate to `docs/ops/stuck-queue.md`.

---

## Per-phase review notes

Things to pay extra attention to during specific phases:

### Phase 1 reviews

- Voice scan is paramount — Phase 1 is the brand reposition. Any banned-vocab leak undermines the entire pass.
- Mobile rendering of the new hero — 390px must work cleanly.
- Edge Index visibility — confirm flipped to public for FREE tier, factor breakdown still gated to PRO+.

### Phase 2 reviews

- Loader-extraction pattern (DEC-026) — every new server-rendered surface follows it.
- Bootstrap-state handling — every empty state renders, no crashed pages.
- Intelligence Graph projection — surfaces consume `projectForSurface()`, never raw Prisma rows.

### Phase 3 reviews

- Compliance scanner integration — every AI-output surface (Studio, Twitter bot, Discord bot, Model Court, Model Journal) runs through `apps/web/lib/compliance-scanner/rules.ts` before render.
- Citations attached to every generated asset.
- Hard refusals enforced — no auto-post endpoints, no paid-pick leakage in bots.

### Phase 4 reviews

- Trust gates — Phase 4 may flip `PERFORMANCE_STATS_ENABLED` to true. That decision needs explicit owner approval logged in `decision-log.md` BEFORE the PR merges.
- Privacy default for calibration training — must be opt-in.
- Edge Lab tools — all FREE except backtesting/bankroll persistence.

### Phase 5 reviews

- WebSocket exception for war room — must be logged in `decision-log.md`.
- Adversarial model isolation — anti-Galaxy worker must not read or write production `Pick` table.
- DSL sandbox — verify all 6 hard constraints (no eval, no Function ctor, no file/network, no mutation, no loops, no recursion, bounded time + memory).

---

## When to skip the checklist

Routine maintenance PRs that don't touch joint territory and don't introduce new surfaces:

- Dependency updates within license + size budget.
- Build / CI config tweaks.
- Test additions without behavior changes.
- Doc-only changes.
- Typo / formatting fixes.

Codex self-merges these without `@claude-review`. They show up in the merge log; Claude can audit retroactively.

---

*Maintained by Claude. Codex self-checks against it. Owner reviews are higher bar — they reserve override authority on every decision.*
