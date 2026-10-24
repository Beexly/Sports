# CODEX PROMPT — IMPLEMENT LUMERA BRAND OPERATING SYSTEM

You are the chief strategy officer, behavioral scientist, creative director, and principal frontend engineer for Lumera.

The current Lumera execution is too generic: premium black, muted gold, lowercase wordmark, simple corona ring, and tasteful copy. It is credible but not culturally magnetic. The objective is not a prettier luxury ecommerce site. The objective is to create a first-of-its-kind commerce interface that can become memorable, screenshot-worthy, conversion-safe, and emotionally sticky.

Use the newly defined Lumera Brand Operating System as the source of truth.

## Strategic repositioning

Lumera is the live signal layer for rare commerce.

Not a store.
Not a luxury catalog.
Not another AI shopping assistant.
A personalized broadcast field where rare goods surface, move, close, and disappear.

Core brand line:

THE SIGNAL FOUND YOU.

Everything in the interface must support that idea.

## Behavioral principles

1. Distinctiveness beats generic taste. Build ownable assets people can recognize without the logo.
2. Commerce clarity is non-negotiable. Search, account, cart, product discovery, trust, and checkout must remain obvious.
3. Scarcity must be real. Never fake timers, fake inventory, or fake urgency.
4. Personalization must be explainable. Every recommendation should be able to say why it surfaced.
5. Motion must create meaning, not decoration.
6. The customer should feel early, selected, and in control — never tricked.
7. Every major screen should answer: why would someone screenshot this?
8. Every major screen must also answer: would someone trust this with money?

## Creative direction

Replace quiet luxury with controlled obsession.

Lumera should feel like:
- eclipse
- signal
- live broadcast
- orbital discovery
- rare windows
- personal match
- cinematic commerce
- private access
- calm intensity

Lumera should not feel like:
- meditation app
- candle brand
- boutique hotel
- crypto landing page
- generic Shopify luxury theme
- Apple clone
- wellness SaaS
- fake hype-drop brand

## Required build sequence

### A. Create the canonical brand documents

Create or update:
- docs/LUMERA_BRAND_OPERATING_SYSTEM.md
- docs/CREATIVE_RESET.md
- docs/BRAND.md, if already present

CREATIVE_RESET.md must explain:
- why the previous brand failed
- the new thesis
- the five attributes: Signal-led, Rare, Intelligent, Cinematic, Trustworthy
- how those attributes apply by page/surface
- what must not regress

### B. Implement the Signal Eclipse mark

Create a reusable SVG/CSS component for the Signal Eclipse mark.

Requirements:
- More ownable than a plain ring and dot.
- Includes asymmetric rupture, first-light flare, broken broadcast segment, hidden L geometry, lens aperture, or another ownable deformation.
- Works at favicon, header, hero, and OG-card scale.
- Mark-only version and full lockup version.
- No network fonts.
- No fragile asset pipeline.
- No glow on the core logo lockup.

Update favicon/icon usage if safe.

### C. Update design tokens

Preserve dark premium foundation, but remove generic black/gold dependency.

Add or map tokens:
- Eclipse Black
- First Light
- Signal accent
- Rare Violet
- Archive Grey
- Hold Amber

Add state tokens for:
- live signal
- matched to you
- low window
- hold available
- signal closing
- archived
- returning unknown

Ensure contrast remains accessible.

### D. Rebuild homepage hero

The first viewport must feel like a living broadcast field.

Required elements:
- Signal Eclipse as active visual system object.
- Broadcast/radial/orbital field.
- Product signals or product fragments surfacing.
- Hero copy: “The signal found you.”
- Supporting copy: “Rare goods, live drops, and personalized finds — broadcast as they move.”
- CTAs: “Enter the broadcast,” “Tune your signal,” and/or “View live drops.”
- Visible search/account/cart cues.

Motion must respect prefers-reduced-motion.

### E. Upgrade product card system

Product cards should feel discovered, not listed.

Add signal states:
- LIVE SIGNAL
- MATCHED TO YOU
- LOW WINDOW
- HOLD AVAILABLE
- SIGNAL CLOSING
- ARCHIVED
- RETURNING UNKNOWN

Add “Why this surfaced” where data exists or deterministic placeholder copy is safe.

Examples:
- “Matched from your saved material preferences.”
- “Surfaced from today’s live broadcast.”
- “Low-volume release. No restock confirmed.”

Do not fake urgency. If no real data exists, use safe deterministic states or omit urgency.

### F. Reframe account as Signal Profile

Create or update /account.

Visible concept:
- Your signal profile

Sections:
- Active holds
- Order history
- Saved preferences
- Drop alerts
- Past broadcasts
- Profile settings

Header should show Account or Signal Profile depending on space, but commerce clarity wins.

### G. Rebuild OG/social share image

The OG card must feel like a transmission artifact, not a centered logo slide.

Required elements:
- Signal Eclipse mark
- Broadcast field
- Headline: “The signal found you.”
- Supporting line: “Rare goods. Live drops. Personalized broadcast.”
- Clear Lumera identifier

Keep or add a test proving the OG route renders valid PNG bytes.

### H. Update search language

Search should feel like tuning the field.

Update visible copy where safe:
- Search → Tune the field, where context allows
- Empty state: “Try outerwear, limited run, black leather, or archived drops.”

Do not make search harder to understand.

### I. Add regression tests

Add tests for:
- Homepage contains “The signal found you.”
- Header exposes search/account/cart.
- Product card signal states render.
- OG card renders valid PNG.
- No stale public Alter/XIV copy leaks.
- No public faith-coded copy leaks.
- Core brand docs exist.

Run existing tests and typechecks after each phase.

### J. Commit discipline

Commit in logical chunks:
1. Brand docs and creative reset
2. Mark/tokens
3. Hero rebuild
4. Product signal cards
5. Account/signal profile
6. OG card
7. Tests/docs cleanup

Push only after green verification.

## Acceptance criteria

- Homepage no longer looks like a generic luxury placeholder.
- Mark is more ownable than a simple ring and dot.
- First viewport has a signature interaction or visual mechanic.
- Site remains obviously shoppable.
- Product discovery feels live, personalized, and signal-based.
- Scarcity language is honest.
- Share card is distinctive and verified as valid PNG.
- Account page reinforces personalization model.
- Tests pass.
- Working tree is clean.
- Final report includes changed files, verification, launch-readiness percentage, and remaining Cloud-only blockers.

Do not ask for approval. Audit, build, verify, commit, and push to the established deployment branch only after the full suite is green.
