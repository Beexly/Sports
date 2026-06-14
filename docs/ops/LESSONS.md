# LESSONS — gotchas & fixes, never repeat

> Append every non-obvious fix/gotcha here (§10/§12).

- **L1 · Trust the tree, not the brief's punch-list verbatim.** The brief
  (`OVERNIGHT_PROMPT.md`) was authored on `claude/eloquent-goldberg-der80z`. This
  session's branch `claude/nifty-hopper-au7wib` (= `origin/main`) is NEWER (immersive
  re-theme PRs #30–34 post-date PR #29). Before acting on any "off-brand" finding,
  re-grep the actual file. Confirmed still-real on this tree: `picks`, `room/[gameId]`,
  and `accent-300` on about/contact/changelog/faq/terms/privacy/responsible-play.
  Already clean: `vault`, `integrations`.
- **L2 · Run the GATE raw, never through `tail`/`head`** (§7) — piping masks the exit
  code and produced a false green previously. Use:
  `{ npm run typecheck && npm run lint && npm run build && npm run test; } > /tmp/gate.log 2>&1; echo "EXIT=$?"`
  Read `/tmp/gate.log` for real errors. `next build` is stricter than `tsc`
  (`noUncheckedIndexedAccess`, closure null-narrowing) — satisfy both.
- **L3 · `npm run db:generate` BEFORE typecheck/build** in a fresh container — the Prisma
  client is not committed; otherwise typecheck reports missing `@prisma/client` exports.
- **L4 · Commit with explicit paths, never `git add -A`** (§11) — it sweeps
  `.claude/settings.json` and trips the classifier. Never edit `.claude/settings.json`.
- **L5 · Token map for rebrands:** `bg-gray-950→bg-void`, `bg-gray-900→bg-carbon`,
  `bg-gray-800/eclipse→bg-eclipse`, `border-gray-700/800→border-mineral`,
  `text-gray-100/200→text-ink-100`, `text-gray-300/400→text-ink-300`,
  `text-gray-500→text-ink-400`, `cyan-400→orbital-cyan`, `text-accent-300→text-orbital-cyan`.
  `surface-card` = rounded-2xl + `border-mineral` + eclipse-80% bg. Reference hero pattern:
  root `style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}` + `<Atmosphere/>` +
  radial-gradient accent div + `<Reveal>` + `eyebrow` + `font-display` h1 (see `app/academy`).
- **L6 · Agents run `npm run typecheck` only** (§9) — concurrent full builds collide on
  `.next`. Orchestrator runs the one consolidated gate after agents return.
- **L7 · Anticipate brittle source-string tests on any page rebrand.** Several tests read a
  page's `.tsx` as TEXT and assert exact substrings/char-distances (e.g.
  `picks-mobile-tap-targets` pinned `min-h-11 rounded-lg bg-gray-800`;
  `picks-page-policy-gate` matched `href="/methodology"{0,300}Read methodology`). A token
  rebrand breaks these even though behavior is intact. Fix = update the assertion to track
  the new (still-correct) string while preserving its guarantee — NOT revert the rebrand,
  NOT loosen the guarantee. Adding `focus-visible:ring` classes lengthens className strings,
  so distance-window regexes may need widening. After every rebrand, run the full gate and
  expect 1-3 of these.
- **L8 · The brief's punch-list was mostly ALREADY DONE on this newer branch.** Verified
  non-issues here: a11y keyboard parity (all onClick on native buttons/links or custom
  components that render buttons), `stats/source-suggest` `/promotions` action (already
  clean), hero-video LCP (GeneratedPlate gates video on motion + preload="none"), missing
  page backgrounds (global body carbon bg). Don't manufacture work where the tree is already
  correct — verify, document, move on. A green tree beats churn.
