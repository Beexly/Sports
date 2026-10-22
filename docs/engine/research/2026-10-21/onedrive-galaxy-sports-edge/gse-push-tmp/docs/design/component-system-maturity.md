# Sports OS — Component System Maturity

**Status**: Doctrine. Defines maturity levels for the UI component system.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/design/design-md-spec.md` — design token system
- `docs/design/design-to-react-review.md` — component review process
- `docs/design/final-wave-design-pattern-register.md` — canonical patterns
- `docs/design/visual-language-palette-lab.md` — visual language rules
- `DESIGN.md` — root design token definitions

---

## Purpose

The Component System Maturity model defines how Sports OS evaluates, tracks,
and governs the completeness and production-readiness of its UI component
library. Rather than treating all components as equal, the maturity model
assigns each component a level that determines:

- Whether it can be used in production
- What documentation and test coverage it requires
- What approval process applies before promotion
- How it handles design token compliance and claim governance

This model prevents premature components from reaching production pages and
ensures the design system evolves in a documented, auditable way.

---

## Source Evidence from Line Audit

Wave 3 audit reviewed component system maturity frameworks across comparable
design-forward platforms:

**Industry patterns observed**:
- Atlassian Design System: Uses staged release (Alpha → Beta → Stable → Deprecated)
- Radix UI / shadcn: Maturity implicit in versioning; no formal stage gates
- Carbon Design System (IBM): Formal maturity model with accessibility requirements at each stage
- Vercel/Next.js component patterns: Convention-over-configuration; minimal formal maturity model

**Key finding for Sports OS**: The Galaxy Sports Edge design direction (cinematic,
data-dense, custom palette) means standard component libraries do not fully
serve the product. A maturity model is needed because:
1. Components are being built from scratch against DESIGN.md tokens
2. Data-display components (pick cards, evidence drawers) carry claim governance requirements
3. Subscription gating must be validated at the component level, not just the page level
4. Accessibility requirements must be enforced at promotion time

---

## User Value

- Users experience consistent, tested components — not prototype-quality
  UI in production.
- Data-display components that reach Level 3+ are verified to not display
  forbidden language or stale data.
- Components are accessible — users with assistive technology receive
  appropriate semantic markup.

---

## Operator Value

- Operator knows exactly which components are production-ready.
- Promotion gates prevent claim governance violations in component templates.
- Design token compliance at Level 2+ means visual consistency is enforced,
  not just aspirational.

---

## Current Sports OS Fit

The current `apps/web/` component library contains components at various
informal states of completeness. This maturity model formalizes those states
and introduces the promotion gate process for new and existing components.

---

## Maturity Level Definitions

---

### Level 0 — Sketch

**Definition**: Concept or draft. Not used in production.

**Characteristics**:
- May contain hardcoded colors, sizes, or copy
- No test coverage required
- No accessibility validation required
- No design token compliance required
- Stored in `components/sketch/` or marked with `// TODO: Level 0 — draft`

**When to use Level 0**:
- Rapid prototyping of a new UI pattern
- Exploring a concept before committing to design tokens

**Promotion to Level 1 requires**:
- Design token audit (no hardcoded hex, px values, or brand strings)
- Operator review of the visual design against DESIGN.md

---

### Level 1 — Experimental

**Definition**: Token-compliant draft. Limited production use allowed
with explicit documentation.

**Characteristics**:
- Design token compliant (uses CSS custom properties from DESIGN.md)
- Basic TypeScript types (no `any`)
- At least one unit test for core behavior
- No accessibility validation yet required
- May have known visual or behavioral limitations
- May be used on internal/operator-only pages

**When to use Level 1**:
- Development environment
- Operator Cockpit only (not user-facing)
- A/B test with explicit disclosure

**Required documentation**:
- Inline JSDoc with `@experimental` tag
- Known limitations listed

**Promotion to Level 2 requires**:
- Full TypeScript strict compliance (no `any`, no `ts-ignore`)
- Claim governance review (if component surfaces pick or intelligence content)
- Accessibility audit (WCAG 2.1 AA for all interactive states)
- Subscription tier gating verified (server-side validated if component is tier-gated)

---

### Level 2 — Beta

**Definition**: Functionally complete. Suitable for user-facing production
use with monitoring.

**Characteristics**:
- TypeScript strict compliant
- WCAG 2.1 AA compliant (keyboard navigation, screen reader, color contrast)
- Unit tests (≥ 80% statement coverage for core logic)
- Integration test (component renders correctly with real data)
- Claim governance cleared (if applicable)
- Subscription tier gating tested (if applicable)
- Design token compliant
- No hardcoded values in any production path

**When to use Level 2**:
- User-facing production pages
- Under monitoring (visual regression, accessibility scan)

**Required documentation**:
- JSDoc with all props documented
- Usage examples in Storybook or equivalent
- Known issues or planned Level 3 improvements noted

**Promotion to Level 3 requires**:
- ≥ 3 production usage instances without reported issues
- No open P1 or P0 issues against this component
- Claim governance test (automated — must pass)
- Visual regression baseline established

---

### Level 3 — Stable

**Definition**: Production-hardened. Canonical pattern for this component type.

**Characteristics**:
- All Level 2 requirements plus:
- ≥ 90% test coverage
- Claim governance scanner test in test suite
- Visual regression baseline established and passing
- Performance profiled (render time under target — see Section: Performance Targets)
- Zero open P1+ issues
- Error boundary implemented
- Skeleton/loading state implemented
- Empty state implemented
- Documented in the Design Pattern Register (`docs/design/final-wave-design-pattern-register.md`)

**When to use Level 3**:
- Canonical use for this UI pattern
- Should be used instead of Level 1/2 alternatives when available
- Referenced in design handoff and onboarding docs

**Demotion from Level 3**:
A Level 3 component is demoted to Level 2 if:
- A claim governance violation is found in its output
- A P1 accessibility regression is introduced
- Design token changes break its visual compliance
- Subscription gating is found to be bypassable

---

### Level 4 — Deprecated

**Definition**: Being replaced. Must not be used in new code.

**Characteristics**:
- JSDoc `@deprecated` tag with migration path
- No new usage added — lint rule enforced
- Existing usages tracked for migration
- Migration timeline documented

**When to deprecate**:
- A Level 3 replacement exists and is stable
- Design language changes make the component inconsistent
- Claim governance or accessibility requirements changed and component cannot meet them

---

## Performance Targets by Component Type

| Component type | Target render time | LCP contribution |
|---|---|---|
| Pick card | < 50ms first render | < 100ms |
| Evidence drawer | < 100ms open | Non-blocking |
| Signal ticker | < 30ms update | Non-blocking |
| Market gravity meter | < 80ms | Non-blocking |
| Confidence score display | < 20ms | Non-blocking |
| Settlement badge | < 10ms | Non-blocking |
| Page-level data grid | < 200ms initial | < 500ms total |

---

## Maturity Registry

All components at Level 2+ must be registered:

```typescript
interface ComponentMaturityEntry {
  componentId: string;          // Kebab-case component name
  componentPath: string;        // apps/web/components/[path]
  currentLevel: 0 | 1 | 2 | 3 | 4;
  lastPromotedAt: string;       // ISO 8601
  promotedBy: string;           // Operator ID
  claimGovernanceRequired: boolean;  // Does this component surface pick/intelligence content?
  claimGovernanceClearance: 'PENDING' | 'CLEARED' | 'N/A';
  subscriptionGated: boolean;
  gatingValidated: boolean;
  accessibilityLevel: 'NONE' | 'PARTIAL' | 'WCAG_AA';
  testCoverage: number;         // 0–100 percent
  openIssues: number;
  patternRegisterId: string | null; // If registered in pattern register
  deprecationTarget: string | null; // Component ID that replaces this
}
```

---

## Promotion Process

### Level 0 → Level 1

1. Run design token audit — replace all hardcoded hex/px with CSS variables
2. Add TypeScript types (no `any`)
3. Add at least one unit test
4. Operator reviews visual design against DESIGN.md
5. Update registry entry

### Level 1 → Level 2

1. Full TypeScript strict compliance
2. Accessibility audit (automated — aXe or Playwright accessibility scan)
3. If component surfaces picks: claim governance review
4. If subscription-gated: server-side gating validated
5. Unit test coverage ≥ 80%
6. Integration test written
7. Operator sign-off

### Level 2 → Level 3

1. ≥ 3 production instances, no P1+ issues
2. Test coverage ≥ 90%
3. Claim governance automated test (if applicable)
4. Visual regression baseline established
5. Performance profiled against targets
6. Error boundary and skeleton states implemented
7. Registered in Design Pattern Register
8. Owner or operator sign-off

---

## Forbidden Patterns at Each Level

| Action | Forbidden at level |
|---|---|
| Hardcoded hex colors | Level 1+ |
| TypeScript `any` | Level 1+ |
| `@ts-ignore` or `eslint-disable` | Level 2+ |
| `dangerouslySetInnerHTML` with AI content | All levels |
| Missing error boundary | Level 3 |
| Client-only subscription check | Level 2+ |
| Missing loading state | Level 3 |
| Missing empty state | Level 3 |
| Casino green (#00A651 or similar) | All levels |
| "Lock" or "guaranteed" copy in any state | All levels |

---

## Claim Governance at Component Level

If a component renders pick content, intelligence content, or confidence
scores, the component itself must have a claim governance test in its
test suite:

```typescript
// Example: PickCard claim governance test
describe('PickCard claim governance', () => {
  it('should not render forbidden language in any state', () => {
    const forbiddenTerms = [
      'guaranteed', 'lock', 'sure thing', '100%', "can't miss",
      'sharp money', 'locks', 'free winner',
    ];

    const { getByTestId } = render(<PickCard pick={mockPick} />);
    const cardText = getByTestId('pick-card').textContent ?? '';

    for (const term of forbiddenTerms) {
      expect(cardText.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
```

This test must be at Level 2 and must pass before any promotion.

---

## Validation Requirements

A task is NOT complete until:
- All user-facing components are at Level 2 or higher
- All Level 2+ components are registered in the maturity registry
- All Level 2+ components with pick/intelligence content have claim governance tests
- All Level 2+ subscription-gated components have server-side gating validated
- Level 3 components have visual regression baselines

---

## Approval Gates

| Action | Approving party |
|---|---|
| Promoting any component to Level 3 | Operator |
| Adding a claim governance test requirement to a component | Operator |
| Deprecating a Level 3 component | Operator |
| Changing the maturity level requirements | Owner |

---

## Codex Audit Requirements

1. Confirm no user-facing production page uses a Level 0 or Level 1 component
2. Confirm all Level 2+ components with pick/intelligence content have claim
   governance tests passing
3. Confirm no `@ts-ignore` or `eslint-disable` in any Level 2+ component
4. Confirm no `dangerouslySetInnerHTML` with AI-generated content in any component
5. Confirm all subscription-gated components validate tier server-side
6. Report any Level 0 component used on a user-facing production page as P1
