# Public-surface findings (hand-off to Grok / owner) — 2026-07-01

My Phase-1 review covered 6 of 11 public slices before we split labor (Grok now owns
the public/visible surface). These are what I already found — give them to Grok to
CONFIRM + extend, or fix directly. Not yet fixed by me (public = Grok's lane now).

## Code bugs (public pages)
1. **components/fantasy/sleeper-connect.tsx:36** [MED] — Sleeper season hardcoded `"2025"` on a 2026 site → the flagship league-connect defaults to a prior season and returns no leagues for 2026-only users (dead-end). Fix: default to the current NFL season (compute from date, e.g. year if month>=3 else year-1) or 2026.
2. **app/responsible-play/page.tsx:37** [MED] — footer links to `/responsible-play#variance` but no `id="variance"` exists → dead anchor on a compliance surface. Fix: add `id="variance"` to the variance section (or the relevant heading).
3. **lib/statking/product.ts:80** [MED] — `comparePlayers` awards ties to Player A (`a[key] >= b[key]`), so `/stats/compare` never shows "Tied" (the `?? "Tied"` fallback is dead code). Fix: return null/"Tied" on equality.
4. **app/stats/ask/page.tsx:9 + product.ts:82-90** [MED] — the promoted chip "best QB by fantasy edge" falls through to a generic all-position GPI ranking (no QB/fantasy-edge branch) → answer contradicts the advertised question. Fix: add a matching branch or change the chip label.
5. **app/stats/comps/page.tsx:19** [LOW] — "Players with comps" card uses `comps.length` (all rows) instead of `withComp.length` → overstates comp coverage. Fix: `withComp.length`.
6. **app/stats/player/[id]/page.tsx:92** [LOW] — "Similar Players" empty state reuses the "No weekly data in fixture snapshot" copy → wrong message. Fix: comps-specific copy.
7. **app/dashboard/page.tsx:106** [LOW] — "Today's Picks" count omits `isBootstrap:false` (the list query has it) → count can exceed the list shown. Fix: add the filter to the count query.
8. **components/fantasy/trade-analyzer.tsx:66** [LOW] — trade-value bar width `give/(give+get)` has no zero guard → `NaN%` if both sides evaluate to 0. Fix: guard the divisor.

## Aesthetic / design-system findings (highest first)
- **[HIGH] Result-color inconsistency across the trust cluster** — WIN/LOSS render as cyan/magenta (ledger, trust-ledger/proof-of-record) vs green/red (cards/result-card) vs cyan/alert (performance, proof). Standardize to WIN=`text-orbital-cyan`, LOSS=`text-alert` everywhere (the doctrine in lib/format/stat.ts).
- **[HIGH] app/dashboard/page.tsx** — casino green/blue/emerald/yellow default-Tailwind badges on a trust surface (grade-A `bg-green-900/40`, edge `bg-emerald-900/40`, win-rate `text-green-400`, sample `bg-yellow-900/40`). Swap to `verify`/`caution`/tokens.
- **[HIGH] app/players/page.tsx + components/ui/data-table.tsx** — Player Lab renders on the dark surface but DataTable has NO dark variant (hardcoded paper/white), so every one of 11 views is a white table on a dark page (half-light/half-dark hybrid). Give DataTable a `variant: 'paper'|'dark'`.
- **[HIGH] components/players/player-lab-table.tsx** — signal colors hardcoded `emerald-700/rose-700/amber-700/sky-700` (AA only on the light surface); breaks contrast the moment the table goes dark. Drive from `verify/alert/caution` tokens.
- **[HIGH] app/fantasy** — two design languages: hub/baseline/contests use utility tokens + square borders; every tool page uses FantasyShell (cinematic hero, rounded surface-cards, inline BRAND_COLORS). Unify.
- **[HIGH] components/intelligence/reasoning-showcase.tsx:72** — step counter `text-ink-500` (#3D4555) on eclipse ≈ 1.9:1 contrast (WCAG fail). → `text-ion-2`. Also `focus-visible:outline-none` with no replacement on the play/step buttons (keyboard focus invisible).
- **[HIGH] app/stats/source-suggest/page.tsx** — "Submit a Source" form has no action/onSubmit → clicking reloads and silently drops input (dead-end). Wire it or disable with "opens soon".
- **[MED]** app/brief/page.tsx — off-brand `yellow-*` sample badge + legacy `brand-*` classes; also renders with NO Nav/Footer/RiskDisclosure unlike every sibling trust page.
- **[MED]** app/today/page.tsx — live-dot + "what matters now" above the fold while the "illustrative" disclosure is buried at the bottom (reads as a real feed on a trust product).
- **[MED]** app/intelligence/metrics/page.tsx:105 — renders the raw internal flag `priced=false` in the UI; also `text-ultraviolet` on eclipse ≈ 4.33:1 (below AA for small text).
- **[MED]** Legal pages (terms/privacy/responsible-play) use the legacy `ink-*`/`accent-*` token scale while adjacent pages use canonical GSE tokens — two vocabularies back-to-back. `terms` also has a dead `prose-content` class (undefined).
- **[MED]** app/stats/media + _client FilterTabs/FilterBar — active tab by color only, no `aria-current` (inconsistent with layout NavLink which sets it).
- **[MED]** components/fantasy/waiver-board + lineup + trade — trial gating inconsistent (no upsell/cap notice unlike draft/bestball).
- **[MED]** components/fantasy/gm-academy.tsx:96 — `role=status aria-live=polite` on the whole options group → screen reader reads all 4 options on load/change.
- **[LOW]** Every `app/**/error.tsx` uses raw `red-900/950` utilities instead of the `alert` token (systemic — a shared `<ErrorPanel>` would fix all at once).
- **[LOW]** waiver-board `accent-cyan-400` vs dfs `accent-orbital-cyan`; studio-host broadcast-red `#ff5a5a` live dot; auth/signin back-link hover == resting color (no affordance); stats ScoreRing hardcoded hex; engine-view `gradeTone` dead `g>=45` branch.

## Security (public pages) — for Grok to confirm
- **[LOW-MED] JSON-LD not `<`-escaped** — `app/layout.tsx:212/218`, `app/faq/page.tsx:166`, `app/pricing/page.tsx:229`, `app/journal/page.tsx:64`, `app/journal/[slug]/page.tsx:150`, `app/preview/[sport]/[slug]/page.tsx:166` all do `dangerouslySetInnerHTML={{__html: JSON.stringify(x)}}`. `JSON.stringify` does NOT escape `<`, so any source string containing `</script>` (a journal `articleJsonLd` from DB content, or a `preview` matchup `block` with an odd team name) can break out of the `<script>` tag → stored/reflected XSS. Standard fix: a shared helper `jsonLd(obj) => JSON.stringify(obj).replace(/</g, "\\u003c")` used at all six sites. (Low likelihood today since journal authorship is internal and team names are from a controlled feed, but it's the correct defense-in-depth for dynamic JSON-LD.)

Full raw output (all slices, all findings): the Phase-1 workflow result. Aesthetic tally
by area: brand-tokens 11, a11y 10, consistency 8, ux-copy 5, visual-polish 2, layout 1.

---
## Non-public security note (my lane — for context)
`/admin` had NO layout-level auth gate (unlike `/cockpit`) — all 37 admin pages relied on
inline `role==="ADMIN"` checks with no backstop. I added a defense-in-depth gate to
`app/admin/layout.tsx` (on branch `claude/launch-review-fixes`). The `cockpit/page.tsx`
inline `dangerouslySetInnerHTML` is a static reload script — safe.
