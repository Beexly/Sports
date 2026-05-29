# Taste Critic Rubric — Galaxy Sports Edge

## Posture

A surface should feel like the work of a thoughtful operator, not a
generic SaaS template, a casino, or a tout. The Taste Critic is the
rubric Galaxy uses to judge whether a surface is *Galaxy enough*.

## Ten dimensions

Backed by `apps/web/lib/design-review/taste-criteria.ts`. Each dimension
has a single question, failing signals, and passing signals.

1. **Feels like Galaxy** — carbon / mineral / ion-blue tokens.
2. **Reduces cognitive load** — 6-second read.
3. **Avoids generic SaaS** — sharp borders, no shadow-on-everything.
4. **Avoids casino** — no saturated greens, sparkles, prize wheels.
5. **Avoids tout** — no LOCK / banner / fire-emoji aesthetics.
6. **Restraint feels intelligent** — pass framed as a position.
7. **Numbers respect tabular figures** — aligned, monospaced.
8. **Hierarchy is obvious** — one display headline per page.
9. **Evidence is visible** — source + freshness in ≤2 seconds.
10. **Next action is singular** — one primary CTA per region.

## Verdict scale

- **fail** — surface should not ship as-is
- **neutral** — meets baseline, no judgment
- **pass** — meets the dimension's intent
- **exemplary** — sets a standard for future surfaces

A surface **fails the rubric** if *any* dimension scores `fail`.

## Anti-pattern catalog

Backed by `apps/web/lib/design-review/anti-patterns.ts`. 15 named
patterns including `lock-of-the-day-banner`, `scarcity-timer`,
`social-bandwagon-proof`, `pie-chart-as-hero`. Each entry has a
detection hint (regex where possible, human-review-only otherwise) and
a remedy.

## How to use

1. Open the surface in dev.
2. Run `scanForAntiPatterns(sourceFile)` over the JSX.
3. Manually score each of the 10 dimensions.
4. If any dimension is `fail` or any hard anti-pattern is detected:
   fix before merging. If `fail` persists, escalate to the founder.

## Cadence

- Per-surface on creation.
- Quarterly retroactive sweep of the top 5 surfaces.
- Frozen at major release.

## Owner

Founder. Amendments add to the list; existing dimensions are not removed
without an explicit retirement entry.
