# Sports OS — Design-to-React Review Protocol

**Status**: Doctrine only. Governs how design mockups become implemented components.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — design token source of truth
- `docs/design/visual-language-palette-lab.md` — color and type usage rules
- `docs/audit/codemod-safety-policy.md` — code change safety rules
- `CLAUDE.md` — non-negotiable implementation rules

---

## Purpose

This document governs the process by which a design mockup (Figma, Canva,
or operator-created reference image) is translated into a React component
in the Sports OS codebase.

The translation process is the highest-risk moment in the design-to-code
pipeline. It is where:
- Design tokens get hardcoded (drift from DESIGN.md)
- Claim governance gets ignored (forbidden language enters UI)
- Paywall logic gets skipped (tier access gates omitted)
- Accessibility gets dropped (keyboard nav, ARIA, contrast broken)

This protocol enforces a structured review at each stage of translation.

---

## The Five-Stage Translation Process

### Stage 1 — Design Review (Before Code Begins)

Before any React component is created for a new design, complete this review:

**Design token audit**:
- [ ] All colors in the mockup correspond to named tokens in `DESIGN.md` / `design-tokens.css`
- [ ] No hardcoded hex values in the mockup that don't map to an existing token
- [ ] Typography matches the established hierarchy (see `visual-language-palette-lab.md`)
- [ ] Spacing values are multiples of the spacing scale (4px base)
- [ ] Border radius values match the token set (`--radius-sm`, `--radius-md`, `--radius-lg`)

**Claim governance audit**:
- [ ] Any pick data in the mockup includes source freshness disclosure
- [ ] Any confidence score display includes "not a guarantee" context
- [ ] No forbidden vocabulary (lock, guaranteed, sure thing) appears in the design
- [ ] Win rate claims, if present, have a defined window and model version
- [ ] "Entertainment purposes only" is visible on any public pick-facing surface

**Access control audit**:
- [ ] Any premium data display (confidence scores, line movement) is gated in the design
- [ ] Free tier vs. Pro vs. Elite surface differences are explicit in the mockup
- [ ] Cockpit-only components are clearly marked as cockpit-only

**Accessibility pre-check**:
- [ ] Text contrast ratio is ≥4.5:1 for body text (check in Figma with contrast plugin)
- [ ] Interactive elements have visible focus states in the mockup
- [ ] Any data visualization has a text alternative or label

Only proceed to Stage 2 after all Stage 1 items are confirmed.

---

### Stage 2 — Component Planning (Before Writing Code)

Before writing the React component:

**Pre-declaration** (required per `docs/audit/codemod-safety-policy.md` if
this touches existing files):
```
COMPONENT PRE-DECLARATION
Component name: [e.g., PickCard]
Files to create: [list]
Files to modify: [list]
Paywall enforcement: [YES, at server/route level] or [N/A — no gated data]
Claim governance: [which rules apply to this component's content]
Tests required: [what behavior needs test coverage]
Accessibility: [ARIA roles, keyboard nav plan]
```

**Import contract**:
- Colors: imported from CSS custom properties only — no hardcoded hex
- Typography classes: from `globals.css` or Tailwind utility classes only —
  no inline `style={{ fontFamily: ... }}`
- Spacing: Tailwind utility classes or CSS custom properties from `DESIGN.md`

**No new dependencies**: Components may not add new npm dependencies.
Use existing React, Tailwind, and the component library (`apps/web/components/`).

---

### Stage 3 — Implementation Review (During Code Writing)

During implementation, verify at each function/render block:

**Design token compliance**:
```typescript
// CORRECT — uses CSS custom property
<div className="bg-[var(--eclipse)] border border-[var(--ash)]" />

// WRONG — hardcoded hex
<div style={{ backgroundColor: '#11161F' }} />
```

**Claim governance compliance**:
```typescript
// CORRECT — confidence score with disclaimer context
<ConfidenceScore value={pick.confidence} showDisclaimer={true} />

// WRONG — raw score display with no governance wrapper
<span>{pick.confidence}%</span>
```

**Paywall enforcement**:
```typescript
// CORRECT — tier check enforced at server level, component receives resolved value
// This component receives isPro from a server component that validated the session
export function PickCard({ pick, isPro }: PickCardProps) {
  return (
    <div>
      <PickDirection pick={pick} />
      {isPro && <ConfidenceScore value={pick.confidence} />}
    </div>
  );
}

// WRONG — client-side-only tier check
export function PickCard({ pick }: PickCardProps) {
  const { tier } = useSession(); // CLIENT SIDE — NOT SUFFICIENT
  return (
    <div>
      {tier === 'pro' && <ConfidenceScore value={pick.confidence} />}
    </div>
  );
}
```

---

### Stage 4 — Testing Requirements

Every new component requires:

**Unit tests** (minimum):
- Renders without errors with required props
- Renders the "free tier" and "pro tier" variants if applicable
- Does not render forbidden vocabulary in any prop combination

**Integration tests** (for gated components):
- Confirms confidence score is NOT rendered when tier is FREE
- Confirms pick data is NOT rendered if pick is WITHHELD

**Accessibility tests**:
- `aria-label` is set on icon-only buttons
- Focus order is logical (tested with keyboard tab navigation)
- Contrast ratio passes for the component's text on its background

**Claim governance tests**:
- The compliance scanner does not flag the component's default rendered text
- Any dynamic text (from pick data) is sanitized before render

---

### Stage 5 — Post-Implementation Audit

After the component is implemented and tests pass:

```bash
npm run typecheck     # confirms no TypeScript errors
npm run lint          # confirms ESLint passes
npm run test          # confirms all tests pass (including new component tests)
```

**Visual regression check**: Screenshot the component in the target viewport
(desktop 1280px, mobile 375px) and compare against the original mockup.
The rendered component should match the approved design within acceptable
tolerance.

**Design token drift check**:
```bash
# Check for hardcoded hex values in the component file
grep -E "#[0-9a-fA-F]{3,8}" apps/web/components/[ComponentName].tsx
```
This should return zero matches.

---

## Forbidden Implementation Patterns

These patterns are banned in any component in `apps/web/`:

| Pattern | Correct alternative |
|---|---|
| `style={{ color: '#FF2DD6' }}` | `className="text-[var(--plasma)]"` |
| `color: casino_green_hex` | Not applicable — banned color |
| `// eslint-disable-next-line` to suppress a warning | Fix the warning |
| `// @ts-ignore` in a component | Fix the TypeScript error |
| Client-only paywall check with `useSession()` | Server-side check before rendering |
| `dangerouslySetInnerHTML` with unescaped pick data | Sanitize before render |
| Hard-coded win rate without claim governance wrapper | Use `<WinRateBadge>` with required props |

---

## Component Ownership

Components are divided into two zones:

| Zone | Path | Who creates | Who audits |
|---|---|---|---|
| Public components | `apps/web/components/public/` | Claude (plan) → Codex (implement) | Codex |
| Cockpit components | `apps/web/components/cockpit/` | Claude (plan) → Codex (implement) | Codex |
| Shared primitives | `apps/web/components/ui/` | Codex | Codex |
| Page components | `apps/web/app/*/page.tsx` | Claude (plan) → Codex (implement) | Codex |

**Rule**: A component that displays pick data, confidence scores, or market
data is ALWAYS reviewed by the operator before it ships to production.

---

## Approval Gates

| Action | Who approves |
|---|---|
| New component for a free tier surface | Operator sign-off on design |
| New component for a gated (Pro/Elite) surface | Operator sign-off + paywall enforcement verified |
| New component for the cockpit | Operator sign-off |
| Any component modifying claim governance display | Owner |
| Any component adding a new type of data visualization | Operator |

---

## Validation Expectations

- All components use CSS custom properties for colors — zero hardcoded hex values
- All pick-facing components pass the claim governance scanner
- All gated components have server-side enforcement verified in tests
- All components have passing unit tests before merge
- The compliance scanner test suite passes after any new component is added

---

## Codex Audit Requirements

1. Grep all `apps/web/components/` for hardcoded hex values — report any found
2. Confirm all `ConfidenceScore` usages have `showDisclaimer={true}` or equivalent
3. Confirm all gated data components have server-side enforcement documented in tests
4. Confirm no `@ts-ignore` or `eslint-disable` in any component that displays pick data
5. Report any paywall-only `useSession()` check (no server-side backup) as P0
