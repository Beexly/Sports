# Building with Galaxy Sports Edge components

Every component here is the production React component from `apps/web` (Next.js), compiled as-is. Use them for
picks, boards, records and pricing surfaces; add your own layout around them with the same vocabulary.

## Setup: no provider, two surfaces

There is no ThemeProvider or context to wrap. Styling is Tailwind utility classes plus CSS custom properties, all
loaded from `styles.css`. Two surfaces coexist and most components choose with a `variant` prop:

- **dark** (the product's default ground): put the page on `bg-carbon text-ion`, cards on `bg-eclipse border border-mineral`, elevated chrome on `bg-titanium`. Headings `text-ion-white`, body `text-ion`, secondary `text-ion-1`, tertiary `text-ion-2`.
- **paper** (light data surfaces, tables, explainers): `bg-paper`, cards `bg-paper-raised border border-paper-border`, sunken wells `bg-paper-sunken`. Text `text-ink` (headings), `text-ink-1` (body), `text-ink-2` (secondary).

`KpiCard`, `PageHero`, `MetricExplainer` and `DataTable` accept `variant="paper" | "dark"` (paper is their default); `PickCard`, `MethodologySection`, `Footer`, `ToolPageSkeleton`, `WorldSection` are dark-only, so place them on `bg-carbon` or they float on white.

## Color vocabulary (Tailwind names, from `tailwind.config.ts`)

| Role | Dark surface | Paper surface |
|---|---|---|
| Signal / interactive accent | `text-orbital-cyan`, `bg-orbital-cyan`, `border-orbital-cyan` | `text-orbital-cyan-on-light` |
| Emphasis / featured | `text-plasma`, `bg-plasma`, `border-plasma` | (dark surfaces only) |
| Positive (win, verified, fresh) | `text-verify`, `bg-verify` | `text-verify-on-light` |
| Negative (loss, error, stale) | `text-alert`, `bg-alert` | `text-alert-on-light` |
| Caution (degraded, waiting) | `text-caution` | `text-caution-on-light` |
| Depth / secondary signal | `text-ultraviolet`, `bg-ultraviolet` | (dark surfaces only) |

Color is never the only carrier of meaning: pair it with a label or glyph, as the badges inside `PickCard` do.

## Type, radius, spacing

- Headlines: `font-display` (Exo 2) with `text-display-lg` / `text-display-xl`; eyebrows: `font-mono text-xs uppercase tracking-[0.14em]` or the `eyebrow` class.
- Body: `font-sans` (Inter, 16px minimum). Numbers, odds, lines, hashes: `font-numerals tabular-nums` (JetBrains Mono); hashes and receipts may also use `font-mono`.
- Radii: `rounded-ds-sm`, `rounded-ds-md`, `rounded-ds-lg`. Standard card: `rounded-ds-md border p-5`.
- Ready-made classes from `globals.css`: `btn-primary`, `btn-secondary`, `btn-ghost`, `eyebrow`, `surface-card`, `skeleton`, `live-dot`.
- Raw tokens for inline styles or custom CSS: `var(--carbon)`, `var(--eclipse)`, `var(--titanium)`, `var(--mineral)`, `var(--ion)`, `var(--ion-white)`, `var(--f-display)`, `var(--f-body)`, `var(--f-numerals)`.

## Where the truth lives

- `styles.css` imports `_ds_bundle.css`, the compiled Tailwind + every design token (`:root` custom properties included); grep it before inventing a class or a `var(--*)` name — it is the authoritative list of what actually resolves in a rendered design.
- Each component's `<Name>.d.ts` is the prop contract and `<Name>.prompt.md` the usage notes. `PickCard` takes a `PublicPick` (see its `.d.ts`) plus three `canSee*` gates that must mirror the server entitlement; never show a confidence number to a free viewer by faking the gate.

## Content rules the product enforces

The engine is a deterministic factor model. Copy never calls it AI, never promises outcomes, and never shows a win rate, ROI or record that is not a measured value with its sample size and timestamp. Confidence is a ranking score, not a probability. Where a number is withheld, say why (tier, eligibility, freshness).

## One idiomatic screen

```tsx
<main className="min-h-screen bg-carbon text-ion">
  <PageHero variant="dark" eyebrow="Today" title="NFL board" description="Every line on the board, edge where the model has one."
    aside={<MetricExplainer variant="dark" title="How to read it" terms={terms} />} />
  <section className="mx-auto max-w-7xl px-4 py-8">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard variant="dark" label="Picks on board" value="24" />
      <KpiCard variant="dark" label="Books covered" value="7" tone="good" />
      <KpiCard variant="dark" label="Line age" value="12m" tone="bad" />
    </div>
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {picks.map((p) => <PickCard key={p.id} pick={p} canSeeConfidence canSeeEdgeScore canSeeFactorBreakdown />)}
    </div>
  </section>
</main>
```
