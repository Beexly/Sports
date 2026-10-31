# GSE REDLINE LEDGER — Consistency and accuracy audit

## Result

**PASS after corrections.** The source scan rejects banned legacy accents, Inter/Geist/Roboto, gradients, backdrop blur, shadow/glow effects, stale roster tags, and rejected-original asset references. The final browser audit reports no overflow, broken images, duplicate IDs, numeric-style failures, console errors, failed responses, or axe violations at the tested states.

## Sports issues found in supplied material

- Mike Evans was tagged to Tampa Bay in parts of the source. Corrected identity: **San Francisco 49ers WR (SF)**.
- Geno Smith was tagged to Las Vegas in parts of the source. Corrected identity: **New York Jets QB (NYJ)**.
- Kenneth Walker III appeared with conflicting salary values ($5,600 and $8,800). Not used in any exported card.
- Jaylen Waddle appeared with conflicting salary values ($6,800/$6,000 and $5,400). Not used in any exported card.
- The source’s “highest edge” wording was unsafe across all 29 plays: several player props exceed CHI’s +23.94%. The website now says **“Highest moneyline edge on the locked card.”**
- The CFB report contains simulation leans but zero publishable plays. The design preserves **47 evaluated / 0 published** and the missing JEV-spine reason rather than presenting leans as picks.

## Verified content

- CHI ML +142: 63.56% model, 39.62% market, +23.94% edge.
- KC ML -118: 73.82% model, 51.74% market, +22.08% edge.
- NYJ ML -122: 72.28% model, 52.61% market, +19.67% edge.
- The nine DFS salaries sum to exactly **$50,000**, computed by `salaryTotal` and pinned by unit tests.
- The OG, X, portrait, square, product, DFS-card, and story exports use the same source data.

## Anti-slop review

- Type: Big Shoulders 600/700 for display; IBM Plex Sans 400/500/600 for body and every number.
- Numeric values: tabular lining figures, IBM Plex Sans, right-aligned, nowrap; 4.5ch minimum on primary card figures.
- Color: one ember accent on near-black/bone or ember-on-paper; no purple/indigo system.
- Surfaces: solid, editorial, textured; no gradients, glassmorphism, glow, glossy 3D, or floating objects.
- Layout: asymmetric broadsheet and editorial rows; no three identical feature cards or centered dual-button hero.
- Images: only four reviewed derivatives ship. Originals with spheres, pseudo-text, logos, or off-palette content are quarantined and unused.

## Recommended remaining source-data caution

The supplied document includes future-dated roster assertions beyond the two corrections explicitly provided by the user. This package does not independently certify the entire roster or salary pool; it uses only the selected source-locked examples shown above and labels them historical.
