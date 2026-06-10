# 03 — Brand / Marketing / Copy Audit

**Date:** 2026-06-09
**Lens:** Brand voice + positioning, marketing/landing pages, SEO, trust-claims/banned-phrase compliance, growth loops, conversion/CTAs, copy quality.
**Clones audited:** DEPLOY = `C:/Users/Garrett/Sports` (launch target) · CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform).
**Method:** read the real source. Every finding cites `file:line`. Read-only; no files changed outside this audit folder.

---

## Grade: B-

**Verdict.** The copy *craft* here is genuinely good — better than almost every product in this category. The anti-tout positioning (`app/vs/tout-services/page.tsx`), the honest pricing page, and the "if the work can't be shown, it doesn't ship" voice read like a thoughtful human wrote them, not a content mill. The compliance machinery is the standout: `lib/trust-claims.ts` is a real, typed claim registry with a banned-phrase scanner that is actually *wired into* the content-generation pipeline as a hard blocker (`lib/content-engine/compliance.ts:68`), not just a test. That is rare and it is a real asset. But the brand has a **positioning identity crisis**: three different "brand promises" coexist across the surfaces, and the single most-load-bearing one — "Proven, not explained" — exists *only in CANONICAL* and is completely absent from the DEPLOY clone that is actually going live. `lib/brand.ts` declares itself "the single source of truth," yet the DEPLOY homepage H1 hard-codes a different headline and bypasses it entirely. SEO is solid but has two host-canonicalization bugs that split link equity. The trust scanners are real but their static file allowlist covers ~8 of 60+ pages, so most marketing copy ships unscanned. None of this is launch-blocking on its own, but the positioning fragmentation is the thing standing between "credible premium intelligence brand" and "a few good pages that don't add up to one brand."

---

## Findings by severity

### P1 — Brand promise is fragmented across three different headlines; the strongest one is missing from the launch target
**Clone: both (worse in DEPLOY).** The product asserts three incompatible top-line promises:
- `lib/brand.ts:22` (both clones) — tagline: **"Find the signal before the market moves."**
- `Sports/apps/web/app/page.tsx:125` (DEPLOY home H1) — **"We're not AI. We're math you can read."**
- `Sports-canonical-2026-06-03/apps/web/app/page.tsx:91` (CANONICAL home H1) — **"The board is only as smart as the data behind it."**

The doctrine line the brand is supposed to lead with — **"Proven, not explained"** / "Most sites give you a pick and say trust us. We prove it" — appears only in CANONICAL (`app/intelligence/page.tsx:283`, `app/intelligence/rating/guide/page.tsx:31`, `components/intelligence/rating-ladder.tsx:31`). A grep of the DEPLOY clone for `proven not` / `prove it` returns **zero hits**. The launch target leads with its weakest, most defensive framing ("we're not AI").
**Recommendation.** Pick ONE primary promise and make `lib/brand.ts` actually govern it. Recommend elevating "Proven, not explained" (or "We prove it. We don't ask you to trust us.") to the DEPLOY homepage H1 and the brand.ts tagline, demoting "Find the signal before the market moves" to a supporting line. Founder call on final wording.

### P1 — `lib/brand.ts` claims to be the single source of truth but the homepage H1 hard-codes around it
**Clone: DEPLOY.** `lib/brand.ts:10-13` states every UI surface reads from these constants. It even exports `HERO_KICKER` (`brand.ts:200`) and `HERO_SUBHEAD` (`brand.ts:203`). But the DEPLOY homepage hero (`app/page.tsx:124-130`) hard-codes "We're not AI. We're math you can read." and "Deterministic sports betting research…" — it imports none of the brand hero constants. So the highest-traffic surface silently diverges from the documented brand. `HERO_KICKER`/`HERO_SUBHEAD` are exported but unused on the home page.
**Recommendation.** Either drive the home hero from `brand.ts` constants, or delete the unused `HERO_KICKER`/`HERO_SUBHEAD` so the file stops lying about being canonical. Add a test asserting the home H1 string equals a brand.ts export.

### P1 — Responsible-gaming helpline number is inconsistent across surfaces (two *different* helplines)
**Clone: both.** The trust-claims registry hard-codes **"1-800-522-4700 (National Problem Gambling Helpline)"** at `lib/trust-claims.ts:254`. Every other surface uses **"1-800-GAMBLER"**: `lib/brand.ts:48,50` (`HELPLINE`), `components/ui/risk-disclosure.tsx:24`, `app/faq/page.tsx:129`, `app/brief/page.tsx:79`, `lib/promotions/public-payload.ts:51`. These are not the same line (1-800-GAMBLER = 1-800-426-2537; 1-800-522-4700 is the separate NCPG National Helpline). A compliance/legal surface should present ONE correct, consistent number.
**Recommendation. (Founder/Legal action.)** Confirm the intended helpline with counsel, then make `lib/brand.ts` `HELPLINE` the only source and have `trust-claims.ts` reference it. Do not auto-flip — this is regulated responsible-gaming copy.

### P1 — Canonical host is inconsistent (www vs non-www) within the DEPLOY clone, splitting SEO signal
**Clone: DEPLOY.** `app/layout.tsx:35` falls back to `https://www.galaxysportsedge.com` (this seeds `metadataBase`, so canonical/OG URLs render with `www`), but `app/robots.ts:13` and `app/sitemap.ts:40` fall back to `https://galaxysportsedge.com` (no `www`). Mixed canonical hosts split link equity and can cause duplicate-URL indexing. CANONICAL clone is internally consistent — all three use bare `galaxysportsedge.com` (`layout.tsx:86`, `robots.ts:13`, `sitemap.ts:47`).
**Recommendation.** Pick one host (match whatever the live domain 301-redirects to) and use it as the fallback in all three DEPLOY files. In production `NEXT_PUBLIC_APP_URL` should be set so the fallback never fires — but a wrong fallback ships if the env var is ever missing.

### P1 — Banned-phrase scanner coverage is a narrow static allowlist; most marketing pages ship unscanned
**Clone: both.** The scanner itself (`lib/trust-claims.ts:446`) is good. But the strongest test (`__tests__/public-copy-scan-strong.test.ts:28-37`) only scans **8 hard-coded files** (`page`, `dashboard`, `performance`, `picks`, `pricing`, `promotions`, `brief`, `blog`). DEPLOY has **60 `page.tsx` files**; CANONICAL has **131**. Unscanned marketing surfaces include `about`, `methodology`, `faq`, `press`, `vs/tout-services`, `terms`, `privacy`, `responsible-play`, `changelog`, and (CANONICAL) `intelligence/*`, `airwave`, `academy`, `fantasy/*`. The test also `return`s silently when a file is missing (`:46-49`), so a renamed page drops out of coverage with no failure. It scans *source text*, so copy injected from the DB or composed at runtime is invisible to it.
**Recommendation.** Replace the static array with a glob over `app/**/page.tsx` (+ marketing components) so new pages are covered by default; fail (not skip) on a missing expected file. The content-engine runtime gate (`lib/content-engine/compliance.ts:68`) already covers DB-sourced copy — keep that; this is about static pages.

### P2 — Four+ parallel color-token vocabularies; no surface matches the declared brand palette
**Clone: DEPLOY (canonical is cleaner).** `lib/brand.ts:211-218` defines `BRAND_COLORS` (orbitalCyan `#00E5FF`, ionMagenta, softUltraviolet, etc.). Across DEPLOY `app/**/page.tsx`, token usage counts are: `gray-*` ≈1118, `cyan-*` ≈73, `brand-*` ≈69, `ink-*` ≈61, `accent-*` ≈22, `ultraviolet` ≈7 — i.e. the home page uses raw `gray/cyan` (`app/page.tsx:55,123`), pricing uses `brand-*/accent-*/ultraviolet` (`app/pricing/page.tsx:173,197,209`), and `vs/tout-services` uses `ink-*/accent-*/surface-card/btn-primary` (`app/vs/tout-services/page.tsx:44,77,133`). None use the `BRAND_COLORS` names. CANONICAL is consistent on a single semantic system (`ion-white`, `orbital-cyan`, `surface-line`, `font-display`, `text-display-xl` — `app/page.tsx:90,95,108`). A premium brand should look like one brand across pages.
**Recommendation.** Adopt CANONICAL's semantic token system (`ion-white`/`orbital-cyan`/`surface-*`) as the standard and migrate DEPLOY pages off raw `gray-*`/`brand-*`/`ink-*`. This overlaps the aesthetic-lens audit — reconcile there.

### P2 — "Beat the Model" free growth loop exists only in CANONICAL, not on the launch target
**Clone: CANONICAL only.** The free, skill-based pick'em growth loop is well-built — `components/fantasy/beat-the-model.tsx` + `app/fantasy/pickem/page.tsx`, linked from nav (`components/ui/nav.tsx`) and sitemap. It is correctly compliant: no money, no chance, local-storage only, and it explicitly refuses to fabricate results ("Results post after the week's games settle," `beat-the-model.tsx:198,299`). A grep of the DEPLOY clone for `Beat the Model` / `pickem` returns **zero hits** — so the launch target ships with no viral/acquisition loop and no free-tier hook beyond "1 signal a day."
**Recommendation.** Port `BeatTheModel` to DEPLOY (it's self-contained and compliant) so the launch product has a top-of-funnel growth mechanic. Keep real-money/contest variants founder-gated.

### P2 — Conversion pages lack their own metadata/OG (home, dashboard, promotions)
**Clone: DEPLOY.** Only 25 of 60 DEPLOY pages export `metadata`/`generateMetadata`. The home page (`app/page.tsx`) exports none, so it inherits the layout default title and has no page-specific OG — fine for `<title>` but a missed chance for a tailored social card on the most-shared URL. `app/promotions/page.tsx` (compliance-sensitive, imports `RiskDisclosure` at `:3`) and `app/dashboard/page.tsx` also export no metadata. CANONICAL is broader (72/131).
**Recommendation.** Add explicit `metadata` (with a hand-written `openGraph`) to home, pricing-adjacent, and promotions pages. Low effort, direct SEO/social-CTR upside.

### P2 — Trust-claims registry and brand.ts diverged between clones (drift risk)
**Clone: both.** `lib/trust-claims.ts` differs between clones (CANONICAL's `banned.lock` reviewNote at `:284` adds a temporal-idiom carve-out the DEPLOY version lacks). `lib/brand.ts` voice docstring differs: DEPLOY says voice is "Calibrated. Precise. Always acquiring. Intelligence isn't loud." (`brand.ts:7-8`); CANONICAL says "We show our work, grade ourselves against the close, and go quiet when the read isn't there." (`brand.ts:6-7`). Two source-of-truth files, two truths.
**Recommendation.** Treat one clone's `brand.ts` + `trust-claims.ts` as authoritative and sync the other on each release. The CANONICAL voice line is the better one — adopt it.

### P3 — `LAST_REVIEW` date on every trust-claim is a single shared constant; the staleness test will flip the whole registry at once
**Clone: both.** All claims share `LAST_REVIEW = "2026-05-18"` (`trust-claims.ts:91`). The 365-day staleness test (`__tests__/trust-claims.test.ts:380`) is good, but because every claim shares one date, the registry passes/fails as a block instead of surfacing the specific stale claim. It also means a real per-claim re-review can't be recorded without touching all of them.
**Recommendation.** Allow per-claim `lastReviewedAt` overrides so reviews can be tracked individually; keep the shared default for unreviewed-since entries.

### P3 — Marketing keyword list leans on jargon real bettors don't search
**Clone: DEPLOY.** `app/layout.tsx:46-56` keywords include "anti-tout sports model," "calibrated betting confidence," "sports pick reasoning." These match the brand voice but have near-zero search volume. (Modern Google largely ignores the `keywords` meta anyway.) The high-intent terms ("sports betting picks," "[sport] predictions," competitor-comparison queries) are thin.
**Recommendation.** Lean on the `/vs/*` landing-page pattern (already excellent at `app/vs/tout-services/page.tsx`) for real search intent rather than the `keywords` array. Build a couple more `/vs/` and "is X a scam / how to spot a tout" pages — that page is the SEO crown jewel and there's only one.

---

## Strengths (real, grounded)

- **The trust-claims registry is a genuine, enforced asset.** `lib/trust-claims.ts` is a typed claim store with category/status/evidence/visibility/review-date per claim, a banned-phrase scanner with word-boundary handling (won't flag "block"/"unlock", `:452`), and an internal-vocabulary list to keep words like "canonical"/"bootstrap" out of customer copy (`:406`). It is consumed in product code, not just tests: `components/ui/methodology-section.tsx:15` renders approved copy via `getClaim()`, `lib/content-engine/compliance.ts:68` makes banned-phrase hits a hard **BLOCKER** on AI-generated drafts, and `lib/promotions/guards.ts:141` scans promo copy. This is the kind of thing most "trust-first" brands only put in a slide.
- **Performance claims are correctly gated, not faked.** All `PERFORMANCE` claims are `status: "GATED"` behind `canExposePerformanceStats` (`trust-claims.ts:166-203`); the homepage preview is explicitly labeled sample/"PREVIEW MODE" and states samples "never produce a verified win-rate claim" (`app/page.tsx:88-90`). `banned.verified-track-record` is banned outright (`:328`). This matches the "proven not assumed" posture exactly.
- **The anti-tout positioning page is best-in-class copy.** `app/vs/tout-services/page.tsx` is specific, confident, human, and on-brand ("Anyone can publish a pick. Only the disciplined publish a reason," `:99`; the four-tells WATCHLIST at `:166`). No competitor named (legally clean). It even does the honest-math move competitors avoid: "a 64% calibrated confidence … still loses 36 of 100 times" (`:103-106`).
- **Pricing page is honest and conversion-clean.** Clear three-tier table, JSON-LD `FAQPage` schema (`app/pricing/page.tsx:142`), "No upsell games" (`:13,178`), refund framed as a *billing* term distinct from any outcome guarantee (`:368`, mirrored in `trust-claims.ts:217`). No dark patterns.
- **SEO foundation is real.** Org + WebSite JSON-LD in `<head>` (`app/layout.tsx:97-129`), `sitemap.ts`/`robots.ts`/`opengraph-image.tsx`/`site.webmanifest` all present in both clones, operator surfaces (`/admin`, `/cockpit`, `/api`, `/dashboard`, `/brief`) disallowed in robots (`robots.ts:20-30`), OG image driven from brand constants (`app/opengraph-image.tsx:13`).
- **Copy quality reads human, not AI-generated.** Spot-checks for AI tics ("game-changer," "unlock the power," "in today's world," "seamless," "cutting-edge," "delve") across DEPLOY marketing pages returned no real hits. Em-dash density is low (home `app/page.tsx`: 0). About-page principles are crisp and earned ("If the work can't be shown, it doesn't ship," `app/about/page.tsx:22`).
- **The "Beat the Model" loop (CANONICAL) is compliant and well-engineered** — free, skill-only, local-storage, no fabricated outcomes (`components/fantasy/beat-the-model.tsx`). The mechanic itself is launch-ready; it just isn't in the launch clone.

---

## What would move this from B- to A

1. **Resolve the positioning to ONE promise and enforce it (P1 ×2).** Choose the primary brand line (recommend "Proven, not explained" / "We prove it — we don't ask you to trust us"), put it in `lib/brand.ts`, render the DEPLOY home H1 *from* that constant, and add a test that fails if the H1 drifts. Kill the three-headline split. *(Founder owns final wording.)*
2. **Fix the two compliance/SEO correctness bugs (P1 ×2).** One correct, consistent helpline number sourced from `brand.ts` (legal-confirmed); one canonical host across `layout/robots/sitemap` in DEPLOY.
3. **Make the banned-phrase scanner cover the whole site (P1).** Glob `app/**/page.tsx` + marketing components instead of an 8-file allowlist; fail on missing expected files. Then the "trust-first" claim is backed by site-wide enforcement, not 13% of pages.
4. **Unify the brand visually (P2).** Migrate DEPLOY off the four parallel color vocabularies onto CANONICAL's semantic token system so every page reads as one premium brand. (Coordinate with the aesthetic-lens audit.)
5. **Give the launch target a growth loop and tailored OG (P2 ×2).** Port the compliant "Beat the Model" pick'em into DEPLOY; add per-page `metadata`/`openGraph` to home, pricing, and promotions.
6. **Keep the two clones' `brand.ts`/`trust-claims.ts` in sync (P2/P3)** with a designated authoritative copy, and allow per-claim review dates so the registry stays honestly maintained.

Do all of the above and the brand fully earns the "premium, credible sports-intelligence" claim — the craft is already there; it just needs to be *one* brand, enforced everywhere, on the clone that actually ships.
