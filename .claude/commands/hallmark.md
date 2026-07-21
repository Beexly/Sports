---
description: Anti-slop UI audit and redesign — 58-gate design verification against GSN cockpit
---

Audit or redesign GSN UI components using the Hallmark anti-AI-slop framework.

## Modes

### `audit` — find design debt (read-only)
Analyze a page/component against the 58 slop gates. Output a punch list.

### `redesign` — rebuild with structural variety
Preserve copy, information hierarchy, and brand identity. Rebuild structure with a distinct visual fingerprint. Never just recolor.

### `study <URL or screenshot>` — extract design DNA
Extract macrostructure, typography pairing, color anchors from admired reference. Generate a portable `design.md`.

---

## Audit checklist (58 slop gates — abbreviated)

**Token discipline (CRITICAL)**
- [ ] All colors reference named CSS variables from `apps/web/styles/design-tokens.css` — never inline `#hex` or `rgb()` in Tailwind classes
- [ ] All font sizes use token scale — no `text-[14px]` raw values
- [ ] Spacing uses token scale — no arbitrary `gap-[12px]` in final components

**Structural variety**
- [ ] No two adjacent page sections share the same layout archetype (hero → card-grid → card-grid is SLOP)
- [ ] Navigation archetype is distinct from boilerplate top-nav/hamburger defaults
- [ ] Footer has intentional design — not just links in a column

**Typography purity**
- [ ] No italic display/heading type — use weight or color for emphasis instead
- [ ] Heading hierarchy is consistent (H1 → H2 → H3, never skipped)
- [ ] Body text line-length ≤ 75ch on desktop

**Mobile responsiveness**
- [ ] Verified at 320/375/414/768px breakpoints
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥ 44×44px
- [ ] No two-line text inside clickable elements unless explicitly designed

**Honesty rules**
- [ ] No invented metrics — stats use real data or explicit `[PLACEHOLDER]` markers
- [ ] No fake testimonials — use real user quotes or mark as illustrative
- [ ] No AI-tell phrases ("Unleash your potential", "Seamlessly integrate", "Revolutionize your workflow")

**Visual coherence**
- [ ] Color palette ≤ 3 primary + 2 accent — not 8 different grays
- [ ] Border-radius is consistent across all interactive elements
- [ ] Shadow depth is calibrated — not flat in one place, heavily elevated in another
- [ ] Empty states are designed — not bare `<p>No data</p>`

**Accessibility (overlap with /contrast, /focus-anchor)**
- [ ] All text meets WCAG AA contrast (4.5:1 for body, 3:1 for large text)
- [ ] Focus ring visible on all interactive elements
- [ ] No color-only information encoding

## GSN-specific known slop (from /ui-audit)

The cockpit UI uses ~90% raw Tailwind classes instead of design tokens. Key targets:

- `apps/web/app/dashboard/` — card components mixing raw hex and token refs
- `apps/web/components/ui/` — inconsistent border-radius and shadow scales
- `apps/web/app/picks/` — empty states unstyled

## Redesign rules

1. Run pre-flight scan on existing tokens: `cat apps/web/styles/design-tokens.css`
2. Detect genre (editorial / data-dashboard / minimal / atmospheric)
3. Pick macrostructure from 21 named page shapes — must differ from last redesigned page
4. Apply theme from token system — no new inline values
5. Run slop test on output before delivering

## Output format for audit

```
Hallmark Audit: <component/page>

CRITICAL (blocks merge):
  ✗ Inline color #3B82F6 at Button.tsx:42 — use var(--color-brand-500)
  
HIGH (fix this sprint):
  ✗ Two consecutive card-grid sections on /picks — diversify macrostructure
  
MEDIUM:
  → No empty state design on /picks/empty path
  
CLEAN:
  ✓ Typography hierarchy correct
  ✓ Touch targets ≥ 44px
```

## Local Hallmark installation

For full Hallmark skill in Claude Code locally:
```bash
npx skills add nutlope/hallmark
# or manually:
mkdir -p ~/.claude/skills/hallmark
curl -o ~/.claude/skills/hallmark/SKILL.md \
  https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/SKILL.md
```
