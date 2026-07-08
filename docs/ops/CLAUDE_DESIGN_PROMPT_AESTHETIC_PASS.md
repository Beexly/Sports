# Claude Design Prompt — Aesthetic Elevation Pass (GSE Website)

**Use:** paste the block below into a Claude Design / Claude Code session pointed at this repo
(`apps/web`). It is self-contained: it carries the real design system, the brand rules, the
priority order, and the hard constraints so the pass elevates the look **without** breaking
functionality, honesty, the paywall, or accessibility.

---

```
You are a senior product designer + front-end engineer elevating the AESTHETICS of a
production sports-prediction web app (Next.js 14 App Router, TypeScript, Tailwind). The
brand is "Galaxy Sports Edge" (GSE) — a cosmic/observatory identity whose whole thesis is
HONEST, PROOF-FIRST credibility ("prove it, don't assert it"). Your job is to make the site
look world-class and cohesive while preserving how it works. Work in apps/web.

── THE DESIGN SYSTEM ALREADY EXISTS — EXTEND IT, DO NOT REINVENT ──
Everything below is real (tailwind.config.ts, app/globals.css, lib/brand.ts). USE these
tokens and utilities; do not introduce new hex palettes or one-off colors.

Brand accents (lib/brand.ts BRAND_COLORS):
  orbitalCyan #00E5FF (primary energy) · ionMagenta #FF38C7 · softUltraviolet #7B61FF
  electricBlue #2A6BFF · nebulaPurple #A855F7
  SIGNAL_FADE gradient: linear-gradient(90deg,#00E5FF 0%,#FF38C7 52%,#7B61FF 100%)

Surface scale (dark, deepest→raised): void #05070B · obsidian #080A0F · carbon #0D1117 ·
  eclipse #171228 · titanium #211A33 · slate #20283A · mineral #3B3158 / mineral-hi #4D4175

Text scales (already WCAG-AA-tuned — DO NOT darken these or invent lighter greys):
  On dark: text-ion (13.83:1 on carbon), text-ion-1/2/3 (AA+ nebula silvers).
  On the light "paper" data surface: text-ink / ink-1 / ink-2.
  Legacy dark ramp ink-50..ink-1000 exists; prefer the semantic ion/ink names.

Type: font-display / font-arch (hero display), font-sans (body), font-mono, font-numerals.
  Sizes: display-2xl/xl/lg (clamp-based, responsive), arch-xl/lg (oversize hero), eyebrow /
  eyebrow-lg (uppercase, tracked labels). Use the eyebrow utility class for kicker labels.

Spacing rhythm: the ds-* scale (ds-1=4px … ds-30=120px). Prefer it for vertical rhythm so
  sections share a consistent cadence.

Radii: rounded-ds-sm/md/lg, rounded-2.5xl. Shadows: shadow-glow-cyan/plasma/uv/ion-blue,
  shadow-glass, shadow-pop, shadow-glow-soft. Use glows sparingly, as focal accents.

Component utilities (app/globals.css @layer components): .btn-primary / .btn-secondary /
  .btn-ghost (with built-in focus-visible rings — keep them), .card / .surface-card,
  .eyebrow. Reuse these instead of hand-rolling button/card styles.

── WHAT TO IMPROVE (in priority order — revenue funnel first) ──
1. Landing (app/page.tsx): sharpen the above-the-fold hierarchy — one unmistakable value
   proposition, one primary CTA with clear visual dominance, the proof strip
   (CLV/performance/accountability) elevated as the credibility anchor. Make the first
   screen feel inevitable, not busy.
2. Pricing (app/pricing/page.tsx): make the three plans scannable at a glance, the
   recommended plan visually anchored, the founding-rate + "locked for life" reassurance and
   the new public price-ladder section feel premium and trustworthy. Buy-button area should
   feel safe (trust cues nearby).
3. Picks (app/picks/page.tsx + components/picks/pick-card.tsx): the pick card is the product
   — give it a confident, information-dense-but-calm layout; make the locked/premium state
   visually compelling (a reason to upgrade, not a dead end); make empty-slate days read as
   intentional discipline, not breakage.
4. Dashboard (app/dashboard/page.tsx): a calm, high-signal member home; the new
   upgrade-success banner should feel celebratory but on-brand.
5. Shared chrome: nav (components/ui/nav.tsx), mobile-nav, footer — consistent, elegant,
   unmistakably one system.
6. Then trust surfaces (/performance, /clv, /accountability, /calibration) and the cockpit
   views.

── AESTHETIC OBJECTIVES ──
- One coherent visual system: consistent card treatment, border/hairline language
  (border-titanium), elevation via the surface scale + glass/soft shadows, and a single
  focal-accent strategy (cyan for primary energy; reserve magenta/uv for special moments).
- Clear focal hierarchy on every view: the eye should land on the one thing that matters
  first (the CTA, the top pick, the headline number).
- Generous, rhythmic spacing (ds-* scale); let content breathe — premium feels uncrowded.
- Tasteful motion only: you MAY refine existing motion (Reveal, ShootingStars, signal
  gradients) but every animation MUST respect prefers-reduced-motion, and nothing should
  distract from reading. No gratuitous parallax/auto-playing spectacle.
- States are first-class: design the empty, loading, error, and locked/paywalled states
  deliberately — they are where trust is won or lost.
- Accessibility is non-negotiable: maintain WCAG AA contrast (use the tuned ion/ink tokens —
  don't drop to low-opacity greys for body text); keep visible focus rings; every
  icon-only control gets an aria-label; tap targets ≥ 44px; no keyboard traps in menus.

── HARD CONSTRAINTS (violating any of these is a failed pass) ──
- DO NOT change server-side logic, data fetching, or the PAYWALL. Entitlement gating is
  enforced server-side in the API routes and page loaders — style the states, never remove a
  gate or move premium data to the client.
- DO NOT alter HONESTY copy or invent claims. No win guarantees, no fabricated stats, no
  "curated record," no accuracy claims. Calibrated-confidence framing only. If you touch
  marketing copy, keep it truthful and pre-revenue-honest.
- DO NOT hardcode prices. Prices come from getCurrentPricingPhase() (lib/pricing/
  pricing-phases.ts) — the same source checkout reads. Keep interpolating from it.
- DO NOT invent new color palettes or fonts. Extend the tokens above. If you genuinely need
  a new token, add it to tailwind.config.ts / globals.css with a comment, don't inline a hex.
- Preserve the WCAG-tuned text tokens; do not re-value ion/ink to something prettier-but-
  failing.
- Keep it TypeScript-strict (no `any`), and don't break Server/Client component boundaries
  (only add "use client" when interactivity truly requires it).

── WORKFLOW ──
- Work one view at a time; keep each change reviewable. Prefer editing shared components/
  tokens over per-page overrides so improvements compound.
- After each view: run `npm run typecheck` and `npm run lint` (from apps/web), and
  `npm run build` before finishing. Existing tests must stay green (`npm run test`) — many
  pages have policy/nav/pricing/a11y tests that encode invariants; if one fails, you changed
  behavior the brand relies on — reconcile, don't delete the test.
- Take before/after screenshots of each elevated view (Playwright/Chromium is preinstalled)
  and summarize what changed and why at the end.

Start by reading tailwind.config.ts, app/globals.css, and lib/brand.ts to internalize the
system, then elevate the landing page (priority 1) and show me before/after.
```

---

**Note for whoever runs this:** the aesthetic pass and the code-level accessibility audit are
complementary — this prompt covers look/feel + AA maintenance; the separate ingestion/security/
a11y audits (logged in the consolidation map) cover correctness. Design changes should land on
a branch and go through the normal CI (typecheck/lint/build/tests + guardrails) before merge.
