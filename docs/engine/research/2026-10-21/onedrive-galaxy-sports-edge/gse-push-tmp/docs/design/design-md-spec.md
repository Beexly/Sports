# Sports OS — DESIGN.md Specification

**Status**: Doctrine only. Design system changes require operator review.
**Source**: Prompt 4 — Final Wave
**Parent**: `DESIGN.md`, `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — authoritative token definitions
- `apps/web/styles/design-tokens.css` — CSS implementation
- `apps/web/lib/brand.ts` — brand identity constants

---

## Purpose

`DESIGN.md` is the machine-readable + human-readable design language document
for Galaxy Sports Edge. This specification governs how `DESIGN.md` is structured,
how it is maintained, and how agents read it.

It exists because design systems need a single canonical source that both
humans (operators, designers) and agents (Codex, Claude) can consume without
ambiguity.

---

## Sports OS Fit

The design language serves two non-negotiable requirements:

1. **Intelligence differentiation**: The visual system must immediately
   communicate that this is not a sportsbook, a tout service, or a generic
   sports app. The Bloomberg/F1/NASA reference set is the differentiator.

2. **Trust reinforcement**: Pick cards, evidence chains, and confidence scores
   carry trust signals. The design must make these signals legible and credible —
   not hide them for "cleanliness."

---

## Public / Private Boundary

`DESIGN.md` is a documentation file. It is not a public-facing surface.
It may be committed to the repository and readable by any agent or contributor.

The design tokens it documents (`--plasma`, `--carbon`, etc.) are public —
they are rendered in the browser. The doctrine sections are internal.

---

## File Structure

`DESIGN.md` contains two sections separated by `---`:

### 1. YAML Front Matter (machine-readable)

```yaml
---
brand:
  name: ...
colors:
  plasma: ...
typography:
  families: ...
spacing: ...
radius: ...
motion: ...
glows: ...
shadows: ...
surfaces: ...
forbidden: [...]
---
```

The YAML block is machine-readable by any agent that needs to consume
design tokens programmatically. It mirrors `apps/web/styles/design-tokens.css`.

**Agent reading rule**: Parse the YAML block first. If a token is present
in YAML but not in the CSS, the CSS is authoritative — update the YAML.
If a token is in the CSS but not the YAML, the YAML is incomplete — add it.

### 2. Markdown Doctrine (human-readable)

The remainder of `DESIGN.md` after the closing `---` is human-readable
markdown doctrine covering:
- Design philosophy and reference set
- Color system with rules
- Typography with rules
- Surface hierarchy
- Card anatomy
- Data visualization rules
- Motion rules
- Accessibility rules
- Cockpit vs public surface differences
- Forbidden visual patterns
- Signature components

---

## Source Evidence

The current Sports OS design system is implemented in:
- `apps/web/styles/design-tokens.css` — all CSS custom properties
- `apps/web/styles/pickpilot-kit.css` — component utilities
- `apps/web/app/globals.css` — Tailwind layer + base overrides
- `apps/web/lib/brand.ts` — brand identity (name, tagline, social, tiers)

The reference set (Bloomberg, F1, NASA, Apple, Perplexity, Linear) was
established in the product thesis and upheld through all design passes.
The specific token values emerged from:
- Prompt 1 initial design pass (carbon/plasma/orbital-cyan base)
- Brand voice audit 2026-05-21 (gold→orbital-cyan migration)
- Elite gold → ultraviolet migration (same pass)
- Brand Use Pack §4 color spec (canonical hex values)

---

## Forbidden Actions (DESIGN.md maintenance)

- Do NOT add new colors to `DESIGN.md` without adding them to `design-tokens.css`
- Do NOT change hex values in YAML without updating the CSS variable
- Do NOT mark a token as deprecated in YAML without adding a CSS redirect
- Do NOT add a token named `casino_green`, `cheap_neon`, or any variant —
  these are in the forbidden list and must stay there
- Do NOT remove forbidden patterns from the YAML `forbidden` list without
  owner approval
- Do NOT add a new signature component to DESIGN.md without an actual
  implementation or a linked spec doc

---

## Approval Gates

| Change type | Approval required |
|---|---|
| New CSS token + YAML entry | Operator review |
| Deprecated token removal | Operator review + 30-day deprecation window |
| New color added to system | Operator review + accessibility check |
| New signature component | Operator review + implementation spec |
| Forbidden list modification | Owner approval |
| YAML structure change | Agent + operator alignment |

---

## MVP Path

1. `DESIGN.md` is present ✅ (created this wave)
2. `design-tokens.css` is the implementation source ✅
3. Agents read YAML front matter when generating UI docs or component specs
4. Human contributors read the markdown doctrine for design rationale
5. Future: automated token drift check — `validate-design-tokens.ps1` that diffs
   YAML against CSS. Not yet implemented; requires operator approval.

---

## Validation Expectations

| Check | Method |
|---|---|
| YAML is valid | Parse with `js-yaml` or `python-yaml` |
| All YAML hex values match CSS vars | Manual diff until automated check ships |
| No forbidden colors in production CSS | Brand-safety test suite |
| No forbidden patterns in components | Brand-safety lint rules |
| WCAG AA contrast ratios maintained | Automated axe-core in CI |

---

## Codex Audit Requirements

When auditing `DESIGN.md`:
1. Confirm YAML front matter parses without error
2. Confirm all YAML hex values are present in `design-tokens.css`
3. Confirm `casino_green`, `cheap_neon`, `crypto_green` appear in `forbidden`
4. Confirm `--plasma`, `--orbital-cyan`, `--ultraviolet` are the only three accent colors in the active token set
5. Confirm no gold/amber/cobalt tokens are authored as non-deprecated in CSS
6. Confirm the forbidden list in YAML matches the forbidden section in markdown doctrine
7. Report any drift between YAML and CSS as a P1 doc issue
