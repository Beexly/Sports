# 02 — Product / IA / UX Audit

**Grade: B–** (DEPLOY clone B+ for focus; CANONICAL clone C+ for sprawl-vs-discoverability)

**Verdict.** This is two genuinely different products sharing a repo, and the split is the headline IA fact. The **DEPLOY** clone (`C:/Users/Garrett/Sports`) is a lean, disciplined conversion funnel: ~26 routes, a 4-link nav, one clear value prop ("math you can read"), and a single front-door CTA to `/board`. It is close to launch-coherent. The **CANONICAL** clone (`C:/Users/Garrett/Sports-canonical-2026-06-03`) is the full platform: ~49 top-level routes plus 16 fantasy sub-routes and 18 intelligence sub-routes, fronted by a cinematic cold-open and a 7-door nav. Its consolidation work (Player Lab 11→6 tabs, intelligence hub-with-subnav, picks→board redirect, view-alias forwarding) is real and good. But the platform is trying to do far too much for a launch, and the discoverability does not keep up with the build: at least six substantial product pages have **zero inbound links** and are reachable only by typing the URL, and the primary nav surfaces well under half of what exists, pushing the rest behind a keyboard-only ⌘K palette. The clearest path to value is strong on both clones (front door → board/rating in one click); the weakness is everything *after* that first click in canonical, where the surface area outruns the wayfinding.

---

## Findings by severity

### P0 — launch-blocking / correctness

**P0-1 — Two different "Today's Board" destinations in DEPLOY (`/board` and `/picks`).** *(clone: deploy)*
`apps/web/app/picks/page.tsx` is a full 552-line entitlement-gated pick-card page titled "Today's Board - Sports Picks With Reasoning Attached" (`alternates: { canonical: "/picks" }`). `apps/web/app/board/page.tsx` is a *separate* page also titled "Today's Board". Internal links are split between the two: `/picks` is linked from `app/performance`, `app/dashboard`, `app/brief`, `app/observatory`; `/board` is linked from `app/page.tsx`, `app/room/[gameId]`, `app/methodology`. The nav (`components/ui/nav.tsx:8`) only points to `/board`. So a user clicking "open picks" from the dashboard lands on a *different* surface than one clicking the nav — two pages claiming the same identity, with `canonical` tags fighting for the same SEO slot.
**Why P0:** duplicate-identity primary surface is a correctness/SEO problem at launch and a direct user-confusion vector on the product's most important page.
**Recommendation:** decide which is the real board. CANONICAL already solved this — its `apps/web/app/picks/page.tsx` is a 7-line `permanentRedirect("/board")`. Port that redirect into DEPLOY (or fold the gated pick-cards *into* `/board`) and repoint the four internal `/picks` links to `/board`. **Founder note:** the gated pick-cards in deploy's `/picks` carry the money/entitlement logic — confirm where that lives before deleting.

---

### P1 — important (quality, trust, UX, discoverability)

**P1-1 — Six+ substantial product pages are fully orphaned in CANONICAL (0 inbound links).** *(clone: canonical)*
Verified by scanning every `href` in `app/` and `components/`: `/mlb` (130 lines), `/nhl` (183 lines), `/weather` (114 lines), `/today` (66 lines), and `/vs` (dynamic) have **zero** inbound links from anywhere in the codebase — not nav, not footer, not subnav, not the ⌘K palette, not any page body. They are reachable only by manually typing the URL. `/vault` is also orphaned but is a redirect stub (8 lines), so lower-impact. These are real, built pages with no front door.
**Why P1:** built product value that no user can find is wasted effort and signals an IA that has drifted behind the build. `/mlb` and `/nhl` orphaned is notable given pricing sells "All 7 sports."
**Recommendation:** for each, either (a) wire it into the relevant hub/nav (e.g., a sport switcher for `/mlb` `/nhl`; `/today` as a "today" view of the board; `/weather` into the intelligence or game-context surface), or (b) if it is superseded/experimental, redirect it forward like `/picks→/board` so the route map stays honest. Do not leave built-but-unlinked.

**P1-2 — Primary nav surfaces a minority of canonical's product; the rest hides behind ⌘K.** *(clone: canonical)*
The desktop nav (`components/ui/nav.tsx`) exposes 7 doors (Board, Players▾, Intelligence▾, Fantasy▾, Brief, Studios, Pricing). The three dropdowns intentionally show only a curated subset: Fantasy▾ lists 3 of 16 sub-tools (`/fantasy/pickem`, `/draft`, `/lineup`); Intelligence▾ lists ~7 of 18. The remaining ~12 fantasy tools and several intelligence/standalone surfaces (`/gsn`, `/parlay-mri`, `/cipher`, `/academy`) are reachable primarily through the `CommandPalette` (`components/ui/command-palette.tsx`, 28 destinations) — which is **keyboard-first (⌘K)** with a small floating "Jump to…" button. Touch/mobile users who do not know ⌘K, and never open that button, cannot reach most of the platform.
**Why P1:** restraint in the nav is correct, but the overflow strategy leans on a power-user affordance that the majority of (mobile) users will never trigger, so the deep surfaces are effectively dark to them.
**Recommendation:** keep the lean nav, but make the hubs the real overflow. The intelligence hub already does this well (renders all 8 nodes as cards + subnav). Make the **fantasy hub a complete directory** (see P1-3) and ensure every orphan from P1-1 lands in a hub. Treat ⌘K as an accelerator, not the only door.

**P1-3 — Fantasy hub claims "one directory, no dead ends" but lists only 7 of ~16 tools, and mixes in non-fantasy routes.** *(clone: canonical)*
`app/fantasy/page.tsx:196-200` headlines "Every tool, with its honest status / One directory, no dead ends." The actual `TOOL_DIRECTORY` (`:41-49`) has 7 entries, two of which point *outside* fantasy (`/optimizer`, `/human`). Tools like `/fantasy/autopilot`, `/contests`, `/dfs`, `/scheme`, `/studio`, `/academy`, `/pickem`, `/draft`, `/lineup`, `/connect` (some appear in `LIVE_FIRST`, most do not) are not in the directory. The hub's own promise undercuts the IA.
**Why P1:** a hub that advertises completeness but is partial trains users not to trust the hub, sending them back to ⌘K or dead reckoning.
**Recommendation:** make `TOOL_DIRECTORY` exhaustive over `/fantasy/*` with honest live/gated status (the status pattern is already there and is excellent), and move the cross-section entries (`/optimizer`, `/human`) into a clearly-labeled "related" row so "fantasy directory" means fantasy.

**P1-4 — Desktop nav and mobile nav are not the same map.** *(clone: canonical)*
Desktop `nav.tsx` has 7 doors and no "Learn" grouping; mobile `mobile-nav.tsx` defines 6 sections including a **"Learn"** door (Galaxy Studios, Academy, Methodology, FAQ) and an "Account" section — neither of which exists on desktop. Conversely desktop's `Brief` tail-link is folded into mobile's "Start here." `/academy` and `/methodology`/`/faq` are thus one tap away on mobile but require the footer or ⌘K on desktop. The two navs are hand-maintained in parallel (no shared source), so they will keep drifting.
**Why P1:** inconsistent IA across breakpoints is a real wayfinding and maintenance hazard; a user who learns the mobile map is lost on desktop.
**Recommendation:** derive both navs from one shared route manifest (a single typed config consumed by `nav.tsx` and `mobile-nav.tsx`), so the door set is identical and only the *presentation* differs by breakpoint.

**P1-5 — DEPLOY clone is on the legacy color system; CANONICAL is fully tokenized.** *(clone: deploy)*
`bg-gray-950`/`cyan-300` raw Tailwind appears in **44** deploy `app/` files and design tokens (`bg-surface*`) in **0**. CANONICAL is the inverse: **0** raw-gray files, **99** token files. Deploy's front door (`app/page.tsx`), board, and pricing all hand-roll `gray-950`/`cyan`/`pink` gradients. If both clones represent one brand, the deploy product looks visibly like an older generation of the same site.
**Why P1:** brand/visual inconsistency across the two live-able products is a trust and polish issue; it also means any design-system fix has to be done twice.
**Recommendation:** founder decision on whether deploy should inherit the canonical token system before launch. If deploy is the launch target and stays lean, at minimum align its core surfaces (front door, board, pricing) to the token palette so it reads as the same brand. (Cross-references aesthetic audit `01-aesthetic-design.md`.)

**P1-6 — The two front doors sell two different "first value," and it is not reconciled.** *(clone: both)*
DEPLOY `app/page.tsx` hero: "We're not AI. We're math you can read." → primary CTA **"See today's board"** (`/board`). The board *is* the product. CANONICAL `app/page.tsx` hero: "The board is only as smart as the data behind it." → primary CTA **"See the GSE Rating"** (`/intelligence/rating`), with `/board` demoted to the secondary button. The *rating* is the product. These are two different value gradients and two different "clearest path to value."
**Why P1:** the positioning divergence means the two clones will convert different users on different promises; whichever launches sets the brand's first impression.
**Recommendation:** founder/marketing decision on the single north-star first-click (board vs rating). Align both front doors to it so the funnel is one story. (Cross-references `03-brand-marketing-copy.md`.)

---

### P2 — worth doing

**P2-1 — Intelligence subnav carries 10 pills; risks "tab fatigue."** *(clone: canonical)*
`components/intelligence/intelligence-subnav.tsx:36-47` renders 10 horizontally-scrollable pills (Overview, GSE Rating, Guide, Matchups, Edges, Trends, Edge Map, Airwave, CLV Tracker, The Beat). It is accessibly built (real links, `aria-current`, more-than-hue active state, horizontal scroll). But 10 peer tabs with no grouping is a lot to scan, and on mobile the scroll hides the tail (Airwave/CLV/The Beat) below the fold-right.
**Recommendation:** consider grouping into 2 tiers (e.g., "The Rating" cluster vs "Live signals" cluster) or a primary 5 + "More ▾". Keep the current accessibility wins.

**P2-2 — Same content lives at two URLs (legacy + `/intelligence/*`).** *(clone: canonical)*
`next.config.mjs:42-48` rewrites `/intelligence/trends→/trends`, `/intelligence/observatory→/observatory`, etc., and the comment notes "Old top-level routes remain accessible (redirects added in a later pass)." So `/trends` and `/intelligence/trends` both resolve to the same content. The subnav/footer link the `/intelligence/*` form; some pages still link the bare form.
**Recommendation:** finish the "later pass" — make the bare routes 301-redirect to the `/intelligence/*` canonical form so there is one URL per surface (SEO + analytics cleanliness).

**P2-3 — ⌘K palette points at a route the fantasy hub doesn't (`/fantasy/studio` vs `/studios`).** *(clone: canonical)*
The palette (`command-palette.tsx:45`) lists "Galaxy Studios" → `/fantasy/studio`, while the nav tail-link "Studios" → `/studios` (top-level). Two different "Studios" destinations exist. Verify both are intended distinct surfaces; if not, unify.
**Recommendation:** confirm `/studios` vs `/fantasy/studio` are deliberately different (platform studios vs fantasy content studio). If they overlap, collapse to one and alias.

**P2-4 — DEPLOY mobile nav exposes Dashboard; desktop nav does not.** *(clone: deploy)*
`mobile-nav.tsx:11` includes `{ label: "Dashboard", href: "/dashboard" }`; the desktop `nav.tsx` NAV_LINKS (`:7-12`) does not (desktop reaches the dashboard only through the signed-in avatar chip). Minor asymmetry, same root cause as P1-4 (parallel hand-maintained navs).
**Recommendation:** fold into the shared-manifest fix; acceptable to keep if intentional, but document it.

---

### P3 — minor / polish

**P3-1 — Canonical's 7-door nav + 3 dropdowns is near the upper bound for a top bar.** *(clone: canonical)* Board, Players▾, Intelligence▾, Fantasy▾, Brief, Studios, Pricing plus the live chip and auth is a busy bar at mid widths. Watch for wrap/crowding between ~900–1100px. Consider whether "Brief" earns a top-level door or belongs inside Intelligence.

**P3-2 — Empty/degraded states are a real strength — keep the bar there.** *(clone: both, see Strengths)* The only polish note: deploy's home `EmptyPicksState` (`app/page.tsx:341-347`) renders a `hidden` div with no visible affordance; it is a test hook, not a user-facing empty state. Confirm the *visible* empty handling elsewhere covers the "no picks today" case for users.

---

## Strengths (real, grounded)

- **Player Lab consolidation is excellent IA work.** `lib/players/views.tsx` collapses ~11 former `/players/*` board tabs into 6 primary tabs (Production, Snaps, Next Gen, Trenches, Efficiency, Availability) + 1 demoted secondary (DFS), with `VIEW_ALIASES` (`:1079-1086`) forward-aliasing every old slug so **no deep link 404s**, and a graceful `EMPTY_REGISTRY_VIEW` fallback. This is consolidation done the right way — presentation-only, loaders reused, density controls, honest empty states. *(canonical)*
- **`/picks → /board` permanent redirect (canonical).** `app/picks/page.tsx` is a clean 7-line redirect — exactly the fix DEPLOY still needs. *(canonical)*
- **Intelligence section reads as one system.** A real hub (`app/intelligence/page.tsx` renders 8 surfaces as cards) + a persistent, accessible subnav (`intelligence-subnav.tsx`) + legacy-alias active-state matching. *(canonical)*
- **Tier-gate UX is tasteful and on-message.** `components/ui/tier-gate.tsx` blurs the *depth* (not the rating), shows tier-colored lock pills + a subscribe CTA, and the FREE→PRO→ELITE gradient is documented in code ("the DEPTH is what we sell… the METHOD stays founder-only"). The value gradient is coherent. *(canonical)*
- **Cinematic cold-open is responsibly engineered.** `components/landing/cinematic-entrance.tsx`: localStorage-gated (plays once, ~3s on return), always-skippable (button + Escape), reduced-motion safe, focus-managed `role="dialog"`. A flourish that respects the user. *(canonical)*
- **Honest, real-data empty/degraded states throughout.** Canonical home distinguishes `DB_UNREACHABLE` vs `suppressedDemo` (`app/page.tsx:137-157`); deploy shows explicit "Preview mode" sample banners; the fantasy hub tags every tool live/partly-live/gated. The product refuses to fabricate to fill a grid — rare and trust-building. *(both)*
- **DEPLOY clone is admirably focused.** 4-link nav, one CTA, clean footer (Product/Company/Responsible, no orphan links), 3-tier pricing comparison. As a launch funnel it is coherent and low-confusion. *(deploy)*

---

## What would move this from B– to A

1. **Resolve the two-clones identity (the single biggest lever).** Decide what launches. If DEPLOY launches, finish P0-1 (kill the `/picks`/`/board` ambiguity), align it to the token system (P1-5), and pick one front-door value prop (P1-6). If CANONICAL launches, the bar is wayfinding: no orphans, complete hubs.
2. **Zero orphans.** Wire P1-1's `/mlb`, `/nhl`, `/weather`, `/today`, `/vs` into hubs/nav or forward-redirect them. Adopt the Player-Lab rule site-wide: every built route has a front door or a redirect — never a dead URL.
3. **Make hubs the canonical overflow, ⌘K the accelerator.** Complete the fantasy hub directory (P1-3) so every `/fantasy/*` tool is one click from `/fantasy`; ensure intelligence and any new sections do the same. Then a mobile user with no keyboard can still reach 100% of the product.
4. **One nav manifest, two presentations.** Derive desktop + mobile nav from a shared typed config (P1-4, P2-4) so the maps can't drift.
5. **One URL per surface.** Finish the legacy→`/intelligence/*` 301 pass (P2-2) and reconcile the duplicate "Studios" (P2-3).
6. **Ruthless launch scoping for canonical.** ~49 top-level + 34 sub-routes is a lot to QA, theme, and keep honest. Decide which surfaces are launch-day vs "exists but unlinked until ready," and gate the not-ready ones behind a clearly-labeled state rather than leaving them discoverable-but-rough or built-but-orphaned.

---

### Method / scope note
Read in both clones: `components/ui/nav.tsx`, `mobile-nav.tsx`, `footer.tsx`, `command-palette.tsx`, `intelligence/intelligence-subnav.tsx`, `tier-gate.tsx`, `landing/cinematic-entrance.tsx`; `app/page.tsx`, `app/board/page.tsx`, `app/picks/page.tsx`, `app/pricing/page.tsx`, `app/intelligence/page.tsx`, `app/fantasy/page.tsx`; `lib/players/views.tsx`; `next.config.mjs`. Orphan analysis = exhaustive `href` scan across `app/` + `components/`. READ-ONLY; no source/test/config modified; no builds/tests/secrets run. Data-source specifics deferred to the data-mesh workstream per audit constraints.
