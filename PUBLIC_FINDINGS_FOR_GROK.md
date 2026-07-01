# Galaxy Sports Edge — Public Launch Audit (`PUBLIC_FINDINGS_FOR_GROK.md`)

> Adversarial, code-traced audit of the **public / user-facing surface** of galaxysportsedge.com (Next.js 14 App Router, `apps/web`). Scope excludes `app/admin`, `app/cockpit`, `app/api`. Every finding below is anchored to `file:line` in real code. Findings marked **CONFIRMED** were adversarially re-verified against source (a second agent re-opened the file and tried to refute the claim); a subset were also hand-verified by the lead reviewer.
>
> **Give this to Grok to confirm/extend, or fix directly.** The three launch-blockers in §2 are independently hand-verified and should be treated as a hard gate.

**Method.** Two multi-agent passes plus a hand pass. (1) A **mechanical 8-dimension per-file sweep** (17 cluster auditors + 6 specialist sweeps) — breadth. (2) A **deep cross-surface intelligence pass** (6 substrate builders → 7 adversarial personas → contradiction hunter → synthesis) — the higher-order layer that reasons *across* pages: number-provenance ledger, day-1 empty-state simulation, a plaintiff's-lawyer/FTC read, a sharp-bettor contradiction hunt, a fintech design-director screenshot test, an assistive-tech funnel walk, and a thin-content SEO strategist. (3) A **hand pass** by the lead reviewer that independently verified the trust engine, pricing, footer, reachability, and the three blockers. This document is built on the deep pass (92 verified findings, 6 rejected on verification) + the hand pass; the mechanical pass's instance-level breadth is folded in where it adds net-new coverage.

---

## 1. Verdict — **NO-GO for day-1 as currently built**

The **trust engine is genuinely, unusually honest** (see §5 — this is the product's real moat and it is worth protecting). But three independently-sufficient launch-blockers sit on the public surface, and each is confirmed against source. **No color or copy polish touches them.**

The pattern across nearly everything else is consistent and encouraging: **great foundation, leaky finish.** The data layer refuses to lie; the *presentation layer* leaks — casino colors, fake-live affordances over illustrative data, cross-page copy contradictions, and orphaned/thin indexable surface. Most of the 92 findings trace back to **6 systemic root causes** (§4), so the remediation is far smaller than the finding count suggests.

### Flip-to-GO conditions
1. **The Beat** — remove real reporter names, *or* gate the surface off until licensed ingestion is live; move any "illustrative" label **inline, above** the content.
2. **Terms of Service** — ship a counsel-reviewed Terms whose refund clause matches the advertised **3-day money-back** guarantee and that codifies the founding-rate grandfather promise, before checkout stays live.
3. **JSON-LD** — HTML-escape (`<`, `</`) all structured-data output before it reaches `dangerouslySetInnerHTML`.

---

## 2. The three launch-blockers (hand-verified)

### 🔴 BLOCKER 1 — Fake endorsement: real reporters attributed to fabricated news
`components/news/the-beat.tsx:82-92` · `lib/news/wire.ts:16-53` · `app/the-beat/page.tsx:46,93`

`wire.ts:16-24` declares `NATIONAL_INSIDERS` as *"real, public NFL reporters"* — **Adam Schefter, Ian Rapoport, Tom Pelissero, Mike Garafolo, Jordan Schultz, Jane Slater, Field Yates**. `DEMO_WIRE` (`wire.ts:44-55`) then puts **fabricated headlines about fictional players** in their mouths: item `n1` → `source:"Adam Schefter"` → *"Vale (ankle) ruled OUT"* about a non-existent "Marcus Vale". Because two demo items share `team|player|signal`, `corroborate()` returns `confirmed:true, sources:2`, so the card renders the **real reporter's name** beside a **"✓ Confirmed · 2 sources"** badge and **"12m ago"**, under an **"On air"** live-dot. The only disclaimer renders *after the entire feed* (`page.tsx:93`), in low-contrast text below the fold.

**Why it's a hard gate:** false light / false endorsement / right-of-publicity + Lanham-Act exposure for named non-consenting third parties, and the single sharpest self-contradiction on a "proof, not promises" brand — reachable in **one click** from the homepage's second CTA ("Watch The Beat"). The 30-second-skeptic outcome is binary and both branches are fatal (believe a fake Schefter scoop, or realize the whole site fabricates). *Correction to the raw finding: the badge is orbital-cyan, not "green" — the confirmed/live framing is the defect, not the hue.*

**Fix:** strip the seven real names to generic tier labels ("National Insider") or gate `/the-beat` until licensed ingestion; move an inline "Illustrative — fictional reports" badge **above** the feed (the team already does this correctly in GSN's `Decrypted · illustrative sample` header — copy that pattern).

### 🔴 BLOCKER 2 — Placeholder Terms of Service live behind Stripe checkout; contract contradicts the advertised refund
`app/terms/page.tsx:12-16,74-76` vs `app/pricing/page.tsx:37,186,456`

`terms/page.tsx:12-16` is a **self-declared placeholder** whose own docstring says it *"must be reviewed by counsel before paid checkout is enabled"* — yet `SubscribeButton` and four Stripe price IDs are live. Worse, `§5` makes refunds **discretionary and non-prorated** (`terms:75`), directly negating the firmly-advertised *"3-day money-back window … no questions"* on `/pricing`. The grandfather *"locked for life"* guarantee (a forward-looking price promise made pre-revenue) appears **nowhere** in the Terms.

**Why it's a hard gate:** a deceptive-refund UDAP claim **and** an unenforceable-because-uncodified lifetime-price promise, both on a live paid flow the authors themselves flagged as not launch-ready.

**Fix:** counsel-reviewed Terms whose refund clause states the exact 3-day window **as a right, not discretion**, and whose text codifies the founding-rate grandfather guarantee.

### 🔴 BLOCKER 3 — Stored-XSS via unescaped JSON-LD on indexable public pages
`app/preview/[sport]/[slug]/page.tsx:166` · `app/journal/[slug]/page.tsx:150` · `lib/seo/sports-jsonld.ts`

Both pages inject `JSON.stringify(block)` **directly** into `<script type="application/ld+json"> dangerouslySetInnerHTML` with **no escaping** of `<` / `</script>`. The data includes **DB / CMS free-text** (team names, `pick.selection` like "Chiefs -3.5", journal `title`/`coldOpen`). A crafted value containing `</script><script>…` breaks out of the script context — a stored-XSS on programmatically-generated, indexable pages fed by ingested data. (The RSS route at `journal/rss.xml/route.ts:9` *does* escape `<` — these sinks were missed.)

**Fix:** one safe-JSON-LD serializer that replaces `<`→`<` (and `&`, `>`) for every structured-data injection site; route all JSON-LD through it.

---

## 3. Executive summary — top 15 (ranked by launch impact)

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| 1 | 🔴 | **Fake-endorsement newsroom** — real reporters over fabricated "confirmed/live" headlines (Blocker 1) | `components/news/the-beat.tsx`, `lib/news/wire.ts` |
| 2 | 🔴 | **Placeholder Terms live behind checkout**; refund clause contradicts advertised 3-day guarantee (Blocker 2) | `app/terms/page.tsx` vs `app/pricing/page.tsx` |
| 3 | 🔴 | **JSON-LD stored-XSS** — unescaped DB/CMS text into `dangerouslySetInnerHTML` (Blocker 3) | `app/preview/…/page.tsx:166`, `app/journal/[slug]/page.tsx:150` |
| 4 | 🟠 | **Fake freshness, systemic** — "Updated now"/"live" stamped from the server clock, *including inside the DB-unreachable catch branch* — a broken empty board reports "Updated now" | `lib/board/state.ts:316,341`, `api/picks/daily-slate/route.ts:94` |
| 5 | 🔴 | **Casino green/red on the settled W/L record** + 61 default-Tailwind color utilities on the primary paid surface | `app/picks/page.tsx:461,463` (+60) |
| 6 | 🟠 | **Free tier described 3 contradictory ways** on one `/pricing` scroll ("one signal a day" / "Every pick, free" / "All"); FAQ repeats a cap the server (`dailyPickLimit:null`) doesn't enforce | `app/pricing/page.tsx:46,106,173`, `app/faq/page.tsx:37,83` |
| 7 | 🟠 | **`/stats` tree (19 pages): orphan + chrome-less + thin fixture content** → Google scaled-content/doorway *site-wide* demotion risk; also a dead-end trap (its `Shell` renders no Nav/Footer) | `app/stats/_components.tsx:5`, `app/stats/page.tsx`, `app/sitemap.ts:65` |
| 8 | 🟠 | **Programmatic-SEO liability at scale** — templated gambling FAQPage + **invalid BreadcrumbList (positions 1&2 share `/picks`)** + no revalidate/de-index on finalized games, ×thousands of `/preview` pages | `lib/seo/sports-jsonld.ts:84-127`, `app/sitemap.ts` |
| 9 | 🔴 | **`/preview` built on shadcn tokens that don't exist in the config** (`text-muted-foreground`…) — the one public page that "looks like a different app," and Google indexes it | `app/preview/[sport]/[slug]/page.tsx:175`+ |
| 10 | 🟠 | **Systemic banned-color pattern** — `emerald-700/rose-700` buy/sell on every public data table via `lib/intelligence/colors.ts`; two competing WIN/LOSS color systems | `components/players/player-lab-table.tsx:138`+, `lib/intelligence/colors.ts` |
| 11 | 🟡 | **Homepage "calibrated on 0 settled picks"** at day-1 — `settled` guarded on `page.tsx:154` but passed **unguarded** on 185 & 234, right above "see the receipts" | `app/page.tsx:185,234` |
| 12 | 🟠 | **"Skip to content" points to `#main-content` that most funnel pages lack** — the skip link silently no-ops for keyboard/SR users | `app/layout.tsx` vs `app/board/page.tsx:225`+ |
| 13 | 🟡 | **Proof door is breakpoint-dependent** — desktop exposes 1 proof link, mobile exposes 8; desktop users *cannot* reach `/proof`, `/ledger`, `/accountability`, `/clv` from the Proof door | `components/ui/nav.tsx` vs `mobile-nav.tsx` |
| 14 | 🟡 | **Dense naming collisions** — nav "GSN" → `/the-beat` (not `/gsn`); `/observatory` referred to by 5 names; "Ledger"/"Briefing" overloaded | `components/ui/nav.tsx:25,123`+ |
| 15 | 🟡 | **Voice contradiction** — `/vs/tout-services` mocks "sharp money" as a tout tell while `/methodology` sells "sharp-credible / the edge the pros use"; CLV copy asserts "the leading indicator that an edge is real" pre-proof | `app/vs/tout-services/page.tsx:143,209` vs `app/methodology/page.tsx:63-69` |

---

## 4. Systemic patterns (highest-leverage fixes — one root cause, many findings)

1. **Freshness/liveness sourced from the wall clock, not real data age.** `Updated {now}`, pulsing "live" dots, "On air", fixed "Xm ago" render fresh regardless of odds/ingestion age — *including over empty, broken, or illustrative data* (board even stamps `now` inside the DB-unreachable branch). ~8 findings, one root cause. The **honest pattern already exists, unused**, in `components/integrations/projections-badge.tsx`. → One `freshness(odds.fetchedAt)` helper returning `{label, isStale}`; wire board/picks/market through it; never stamp `now` in an error branch.
2. **Illustrative content shipped with live-newsroom affordances + disclaimer below content.** `/the-beat`, `/today` place the label *after* the feed. The team already owns the correct inline-badge-above-content pattern (GSN). → Mandate GSN's pattern; forbid live-dot/"Breaking"/"Confirmed" on non-live data.
3. **Casino green/red + default-Tailwind color utilities instead of brand tokens.** 61 on `/picks` alone (incl. `green-400` W / `red-400` L on the settled record); `emerald-700/rose-700` across `player-lab-table`, `engine-view.tsx:716`, `registry.tsx`, `dashboard`; shadcn tokens on `/preview`. 400+ occurrences across 60+ files (hand-confirmed). → Codify `WIN=orbital-cyan #00E5FF`, `LOSS=alert #FF6470`, `GOOD=verify #5FD9A3`; add an ESLint rule banning `green-/red-/emerald-/rose-/cyan-400`; fix the shared table/badge components to sweep dozens of files at once.
4. **Indexable pages orphaned from navigation and/or chrome → thin/doorway SEO risk.** ~20–30 orphaned indexable routes (hand-confirmed ~27% of surface): the whole `/stats` tree, 11 `/intelligence/*` lens pages, `/deck`, `/launch`, `/promotions`, `/waitlist`, sitemap-only `/preview/*`; **Privacy is effectively orphaned** (footer "Terms and Privacy" → `/terms` only). Thin+templated+sample+orphaned across a whole tree is a *domain-level* demotion risk. → Rule: every indexable route is either linked from nav/footer with real content, or `robots:noindex`. Noindex `/stats`+`/deck`+`/launch` until wired; link `/privacy` explicitly.
5. **DB/CMS free-text interpolated into script/structured contexts without escaping.** JSON-LD via `dangerouslySetInnerHTML` on `/preview` and `/journal` (Blocker 3); inline analytics `<Script>` interpolating `NEXT_PUBLIC` values (lower risk). → One safe serializer for all structured-data sinks.
6. **Marketing copy disagrees with the same page / adjacent page / contract / server SSOT.** Free tier 1/day vs "All" vs server `null`; Edge-Index defined *as* confidence yet gated differently; 3-day refund vs discretionary Terms; two tier-name systems on `/pricing`; Fantasy 4th tier absent from CLAUDE.md; "pick" vs "signal" noun drift; 3 competing taglines with `lib/brand.ts` SSOT unused on the hero. Every instance is a "say one thing, do another" tell on a trust brand. → Make `lib/brand.ts` + `pricing-phases.ts` + entitlements the *enforced* SSOT; add a copy-lint/test (the existing `check-claims` already models it) that fails when a surface advertises an entitlement the server doesn't enforce.

**+ Hand-confirmed 7th pattern:** **354+ sub-floor font sizes** (`text-[10px]`/`text-[11px]`) across 40+ files, violating the design system's own declared **12px eyebrow / 13px body-sm floor** (`styles/design-tokens.css`) — legibility + a11y. → Replace with the token type-scale; lint against `text-[<12px]`.

---

## 5. What's genuinely good — **preserve this** (the moat)

The trust *engineering* is rare and hard-won. Do not let a refactor erode it.

- **Performance-number provenance is unusually disciplined.** No hardcoded win %, ROI, W-L, CLV, or Brier renders as real anywhere public. Every real number is DERIVED from DB loaders gated behind `getReadinessGates().canExposePerformanceStats`; the two 64% figures are explicitly illustrative ("a 64% confidence still loses 36 of 100"); the CLV backtest is labeled "illustrative baseline model." **This gated-derivation architecture is the product's real moat.**
- **The day-1 zero-data trust matrix is honest across the board.** Every performance surface (`/proof`, `/calibration`, `/performance`, `/clv`, `/ledger`, `/board`, `/picks`) gates off, renders an honest empty state ("The record starts when the first pick settles"), or labels sample data. Verified: **no surface renders unlabeled sample/seed performance as real at zero data.** (`loadPublicCalibrationReport` even **fails open** to the honest empty state on DB error, and `isSampleData` is always `false` — hand-verified.)
- **`/picks` bootstrap-sample labeling is exemplary** — `role="status"` banner: *"deterministic samples… they never settle, they never count toward a verified record, no win-rate claim published from them"* (`picks:196`).
- **The homepage "The proof" band** (`app/page.tsx:204`) states plainly "No fabricated picks, no invented stats, no silent edits" above the fold, with CTAs to real gated surfaces. Keep its prominence and plain language.
- **The content pipeline self-inoculates against hype** — `guardPublicContent` → banned-phrase scan → placeholder; pick-explainer bans `/guaranteed/` and `/lock of the/`. Grep confirms **zero** banned words anywhere in `.tsx`.
- **GSN's inline "illustrative sample" header badge** (`transmission.tsx:49`) is the correct model the rest of the site should copy.
- **Pricing SSOT is clean** — `pricing-phases.ts` is the single source, cards read phase props (no hardcoded prices), Founding matches CLAUDE.md exactly ($14.99/$99, $24.99/$179), and the named proof-gated ladder (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY) is a genuinely thoughtful narrative. Real grandfather guarantee in code.
- **Demo/sample-data safety interlock** — requires a stub-DB sentinel URL **and** `DEMO_PICKS_ENABLED=true`, is `console.error`-loud, `sample-picks.ts:6` "Never active in production", all readiness gates default `false` when env is unset. Fail-safe-by-default — exactly right.
- **The honest `winRateToneClass`** (`lib/format/stat.ts`) anchors tone on the -110 breakeven (52.4%), uses cyan/ion-white/caution/alert (never casino), and the em-dash null policy prevents "0%" reading as a real record.
- **Curated sitemap with noindex hygiene** — deliberately omits `/brief` (noindex) and most thin tool pages ("a sitemap must never advertise a blocked URL").

---

## 6. Full findings by dimension (deep pass — 92 verified)

> High/critical include repro + fix; medium/low are condensed. `file:line` anchors are exact. Verdicts were assigned by an independent adversarial verifier (6 findings were rejected on verification and are excluded).

### Trust & Data Integrity — 28 findings (1C · 8H · 11M · 8L)

**🔴 CRITICAL · `components/news/the-beat.tsx:89`**  
Real, named public reporters (Adam Schefter/ESPN, Ian Rapoport/NFL Network, Tom Pelissero, Mike Garafolo) are attributed to entirely fabricated breaking-news headlines about fictional players, rendered with a green '✓ Confirmed · N sources' badge and fixed fake freshness stamps ('12m ago') under a 'The Beat · On air' live-dot. This is a false-attribution / fake-endorsement surface: it puts words in the mouths of identifiable non-consenting third parties and dresses fiction as live confirmed reporting.  
*Repro:* Load /the-beat: item n1 shows 'Adam Schefter · ATL · Marcus Vale — Vale (ankle) ruled OUT' with '✓ Confirmed · 2 sources' and '12m ago' (wire.ts:45-46). Schefter never reported this; 'Marcus Vale' does not exist. The WIRE_DISCLAIMER sits far below the fold after the interactive feed. A reader (or Sc…  
*Fix:* Do not attach real named reporters to fabricated items. Use clearly fictional source labels for illustrative data, move an inline 'Illustrative — fictional reports' badge onto every card header (as GSN does), and drop the '✓ Confirmed' and …  

**🟠 HIGH · `apps/web/app/faq/page.tsx,apps/web/app/pricing/page.tsx,packages/types/src/index.ts:37`**  
FREE-tier daily-pick claim contradicts the server AND the same pricing page: FAQ and the pricing card say Free gets 'one signal a day,' but entitlements set dailyPickLimit:null (picks de-paywalled) and the pricing feature table says 'Every pick, free / All.' The paid surface advertises a cap that does not exist and denies it three rows later.  
*Repro:* Server: packages/types/src/index.ts:151 dailyPickLimit:null for FREE; feature-gates.ts:84 'Picks de-paywalled (dailyPickLimit=null, canSeePremiumPicks=true for FREE)'; value-architecture.ts:82 'Every pick, free - no daily limit'. Copy: faq/page.tsx:37 'Free plan gets one signal a day' and faq:82 'On…  
*Fix:* Pick one truth (server says all picks are free) and propagate it. Change faq:37/82-83 and pricing:106 to 'Every pick, free — no daily cap; Pro/Elite add confidence, the factor trail, tools, and alerts.' Update CLAUDE.md's 'Free = 1 pick/day…  

**🟠 HIGH · `lib/board/state.ts:341`**  
Board 'Last refresh' timestamp is the server request clock (now.toISOString()), not the real last odds-ingestion time — and it is stamped even in the DB_UNREACHABLE catch branch, so a broken/empty board still reports a fresh 'Last refresh' and 'Updated' time.  
*Repro:* loadBoardState throws (DB down) → catch at state.ts:329 returns lastRefresh: now.toISOString() (line 341); /board (page.tsx:120) renders 'Last refresh {now}' tile over an empty board. Even on the happy path (line 316) lastRefresh=now regardless of how old the odds behind scoringNow are; BoardHealthB…  
*Fix:* Derive lastRefresh (and calibration updatedAt in lib/calibration/report.ts:22/53/76) from the max odds/settlement fetchedAt actually present in the query result; in the DB_UNREACHABLE branch omit the timestamp (null) so the UI shows 'unknow…  

**🟠 HIGH · `api/picks/daily-slate/route.ts:94`**  
The /picks SlateBar renders a pulsing 'live' dot with 'Updated {time}' where the timestamp is the server request clock (new Date().toISOString()), not the real last-ingestion time of the odds. Anon picks are fetched with next:{revalidate:1800}, so odds up to 30 minutes stale are stamped 'Updated now' with a live indicator. On the primary paid-conversion surface this is a fabricated freshness signal — CLAUDE.md rule #5 ('no stale data / always validate timestamps') and a deceptive-'live'-claim exposure.  
*Repro:* Load /picks when the last odds ingestion was 25 minutes ago; SlateBar (page.tsx:437-478) shows a glowing cyan live dot + 'Updated [current wall-clock time]' because lastUpdatedAt = request time, not odds fetchedAt. A user bets a line believing it is current-to-the-second.  
*Fix:* Thread the real odds fetchedAt (available on every Odds row; the honest pattern already exists in components/integrations/projections-badge.tsx) into lastUpdatedAt, render 'as of {odds age}', and suppress the live dot when the underlying da…  

**🟠 HIGH · `apps/web/app/faq/page.tsx,apps/web/app/pricing/page.tsx,apps/web/lib/pricing/value-architecture.ts,packages/types/src/index.ts:37`**  
The FREE tier's daily-pick allowance contradicts itself across the money surfaces AND contradicts the server entitlement. FAQ says Free 'gets one signal a day' (faq:37) and 'One signal per day — the highest-Edge-Index signal of the slate' (faq:83); pricing card description says 'one signal a day' (pricing:106). But the SAME pricing page says 'Every pick, free' (FREE_FEATURES pricing:46), sets the 'Signals per day' comparison cell to 'All' for FREE (COMPARISON_CELLS pricing:173), the picks page states 'Every pick is free - no daily limit' (picks:397), and the server enforces dailyPickLimit:null for FREE (packages/types/src/index.ts, per feature-gates comment 'Picks de-paywalled'). A skeptic lands on the pricing page and sees the product simultaneously advertise a 1/day cap and 'All picks free' — the exact 'they publish one thing and do another' tell the brand claims to be above.  
*Repro:* Open /faq → 'What does Free get? One signal per day.' Open /pricing → same page shows FREE description 'one signal a day' but FREE_FEATURES row 'Every pick, free' and comparison 'Signals per day = All'. Open /picks as free tier → 'no daily limit'. Server: dailyPickLimit=null for FREE. The cap is adv…  
*Fix:* Pick one truth. Since the server de-paywalled (dailyPickLimit=null), delete the '1 signal/day' framing everywhere: rewrite pricing:106 FREE description and faq:37/faq:83 to 'Every pick, free — the open verified record and the full Academy; …  

**🟠 HIGH · `apps/web/app/picks/page.tsx:461`**  
The public picks surface encodes the win/loss record in casino green/red — the exact color language the brand doctrine bans as a gambling/tout tell. SlateBar renders wins in text-green-400 (picks:461) and losses in text-red-400 (picks:463) on a real settled W-L record. Brand doctrine: WIN=orbital-cyan #00E5FF, LOSS=alert #FF6470, and default-Tailwind green-/red-400 are DEFECTS. This is on the primary paid-conversion surface, directly undermining the 'we are not a gambling/tout site' positioning at the moment a skeptic is evaluating the record.  
*Repro:* Load /picks with a settled recentRecord (canExposePerformanceStats open) → SlateBar shows '{wins}W' in green-400 and '{losses}L' in red-400 — casino win/loss coloring on a betting record.  
*Fix:* Replace text-green-400 (picks:461) with text-orbital-cyan and text-red-400 (picks:463) with text-alert. Also migrate the surrounding cyan-400/cyan-300/cyan-100 and bg-red-950/text-red-400 error utilities on this page to the orbital-cyan/ale…  

**🟠 HIGH · `components/news/the-beat.tsx,lib/news/wire.ts:89`**  
The-beat masquerades static fiction as a live, confirmed newsroom — self-undermining the brand's 'no fake freshness / no fabricated data' doctrine on a page linked as the homepage's second primary CTA. DEMO_WIRE (wire.ts:44-55) hardcodes minutesAgo constants (12, 6, 40...) that never advance; the-beat.tsx:89 renders them verbatim as 'Xm ago' under an always-'On air' live-dot (the-beat/page.tsx:46) with a '✓ Confirmed · N sources' badge (the-beat.tsx:84-88). A visitor who reloads sees the same '12m ago' indefinitely. This is exactly the fabricated-freshness signal CLAUDE.md rule #5 forbids, contradicting the site's global anti-fabrication promise on the homepage proof band. Worse, real named public reporters (Adam Schefter, Tom Pelissero, Ian Rapoport, Mike Garafolo — wire.ts:45-53) are attached to fabricated headlines about non-existent players stamped 'Confirmed'; the illustrative disclaimer sits far below the feed.  
*Repro:* Load /the-beat, note item n1 'Adam Schefter · Vale (ankle) ruled OUT ... ✓ Confirmed · 2 sources ... 12m ago'; reload in 5 min — still '12m ago' (wire.ts:45 minutesAgo:12 is static). The 'On air' live-dot and 'Confirmed' badge assert liveness/verification on fiction.  
*Fix:* Move an inline 'Illustrative — fictional reports' badge into the feed header, drop the 'Xm ago' stamp and '✓ Confirmed' badge on illustrative data (or derive the age from a real timestamp once ingestion is live), and use generic tier labels…  

**🟠 HIGH · `app/picks/page.tsx,app/api/picks/daily-slate/route.ts:476`**  
The /picks SlateBar renders a pulsing 'live' dot with 'Updated {time}' where the timestamp is the server request clock, not the real odds ingestion time — a fabricated-freshness signal on the primary paid-conversion surface that contradicts CLAUDE.md rule #5 and the site's own honest freshness pattern elsewhere. api/picks/daily-slate/route.ts:94 sets lastUpdatedAt = new Date().toISOString() unconditionally = request time; picks/page.tsx:476-477 renders it beside a glowing cyan live dot ('Updated {lastUpdated}'). Anon picks are fetched with revalidate 1800, so odds up to 30 minutes stale are stamped 'Updated now'. The honest pattern (compute age from odds fetchedAt) already exists in components/integrations/projections-badge.tsx but is not wired here.  
*Repro:* Load /picks when last odds ingestion was 25 min ago: SlateBar shows a live dot + 'Updated [current wall-clock time]' because lastUpdatedAt=request time, not odds fetchedAt. A user reads the line as current-to-the-second.  
*Fix:* Thread real odds fetchedAt into lastUpdatedAt, render 'as of {age}', and suppress the live dot beyond a freshness threshold — reuse projections-badge freshnessLabel().  

**🟠 HIGH · `app/picks/page.tsx:461`**  
The public picks surface encodes the settled win/loss record in casino green/red — the exact color language the brand doctrine bans as a gambling/tout tell — directly undermining the 'we are not a gambling site' positioning at the moment a skeptic evaluates the record. picks/page.tsx:461 renders wins in text-green-400 and 463 renders losses in text-red-400 on a real recentRecord SlateBar. Doctrine: WIN=orbital-cyan #00E5FF, LOSS=alert #FF6470; default-Tailwind green-/red-400 are DEFECTS. This is the surface a paying user hits after clicking every pricing CTA, so the color contradiction lands at peak conversion intent.  
*Repro:* Load /picks with a settled record (canExposePerformanceStats open): SlateBar shows '{wins}W' in green-400 (line 461) and '{losses}L' in red-400 (line 463) — casino win/loss coloring on a betting record on the brand's 'not a tout' surface.  
*Fix:* Replace text-green-400 with text-orbital-cyan (or verify) and text-red-400 with text-alert; migrate the surrounding cyan-400/300/100 and bg-red-950/text-red-400 utilities to orbital-cyan/alert tokens.  

**🟡 MED · `app/api/picks/daily-slate/route.ts:94`**  
SlateBar 'Updated {time}' with a pulsing cyan live dot is fed lastUpdatedAt = new Date().toISOString() computed per-request, unconditionally — so it always claims a fresh update even though anonymous /picks data is served from a 30-minute cache.  

**🟡 MED · `components/news/the-beat.tsx:89`**  
The Beat renders per-report 'Xm ago' freshness stamps from hardcoded minutesAgo constants, so timestamps like '12m ago' never advance — a fabricated live-freshness signal under an 'On air' live-dot and 'the instant it lands / decay it by freshness' copy.  

**🟡 MED · `apps/web/app/pricing/page.tsx:172`**  
Entitlement claim drift vs CLAUDE.md source of truth. CLAUDE.md's subscription table states Free = '1 pick/day', but the pricing comparison and Free feature list advertise 'All' signals/day and 'Every pick, free' for the Free tier (picks de-paywalled, dailyPickLimit null for all). Either the CLAUDE.md gating spec is stale or the Free cap was silently removed — the displayed gating claim no longer matches documented doctrine.  

**🟡 MED · `app/today/page.tsx:31`**  
Mission Control shows a live-dot with 'What matters now / this minute' and a 'Breaking · confirmed by N sources' card, but the entire briefing is pure static illustrative data with no timestamps.  

**🟡 MED · `app/preview/[sport]/[slug]/page.tsx:184`**  
SEO-indexable matchup preview renders a live 'Model Lean' (pick + confidence) plus opening spread and line movement with no 'as of'/updated timestamp and no revalidate/dynamic control, so search engines can cache a stale odds-backed pick with no freshness context.  

**🟡 MED · `app/today/page.tsx:31`**  
Mission Control renders a 'live-dot' with 'What matters now / this minute' above the fold over data that is entirely static and illustrative (buildBriefing() is pure/static from DEMO_WIRE et al.). The honest 'underlying data is illustrative' disclaimer sits BELOW all the cards (line 55). The live badge and 'this minute' urgency framing contradict the fine-print disclaimer and imply real-time data that does not exist.  

**🟡 MED · `apps/web/app/faq/page.tsx,apps/web/app/picks/page.tsx:62`**  
The FAQ conflates 'Edge Index' with 'confidence rating' and then gates the confidence rating away from Free, but the rest of the product treats Edge Index (public to Free) and the confidence score (Pro-only) as two DIFFERENT things. FAQ:62 defines 'Edge Index' as 'A calibrated 0–100 confidence rating on every signal.' FAQ:83 then says for Free 'the confidence rating and factor trail are gated to Pro and Elite.' Taken together the FAQ says Free both gets and does not get the calibrated confidence rating. Meanwhile pricing FREE_FEATURES lists 'Edge Index on every signal' as included (pricing:47) and picks:401 states 'Pro adds the confidence score... Edge Index is public on every pick' — establishing Edge Index != confidence score.  

**🟡 MED · `apps/web/app/vs/tout-services/page.tsx,apps/web/app/methodology/page.tsx,apps/web/app/clv/page.tsx:143`**  
CLV copy asserts a settled edge as fact while the CLV report is admittedly still gated ('Collecting'). vs/tout:143 says closing line value 'is the leading indicator that an edge is real before a single game settles'; methodology:69 calls it 'the sharp-credible leading indicator of a real edge'; accountability:126 'The sharp-credible leading indicator of edge.' But /clv itself renders the gated state (policy.canExposeClv=false at launch → ClvGatedState, clv:78) and explicitly says 'no settled-edge claim yet' / 'No beat-close rate is shown until the sample is large enough' (clv:218,181). The marketing prose presumes the very 'real edge' the product has not yet earned the right to claim — a soft-guarantee an adversarial reader will call a tout tell.  

**🟡 MED · `app/today/page.tsx:31`**  
Mission Control shows a pulsing "live-dot" + "What matters now / this minute / Breaking" above the fold, but every card is static illustrative data (buildBriefing() from fixtures) and the "underlying data is illustrative" disclaimer is placed AFTER the cards (line 55). The live badge contradicts the caveat, and the caveat loses because it's below the content — a skeptic sees "live / this minute / Breaking" first and distrusts the disclaimer when they finally reach it.  

**🟡 MED · `app/today/page.tsx:31`**  
Mission Control renders a pulsing live-dot with 'What matters now / this minute / Breaking' above the fold over data that is entirely static and illustrative (buildBriefing() is pure/static from fixtures), while the 'underlying data is illustrative' disclaimer sits BELOW all cards (today/page.tsx:55). The live/'this minute' urgency framing contradicts the buried caveat and implies real-time data that does not exist — the same fake-liveness pattern as the-beat's 'On air', on a page the brand's anti-fabrication doctrine should hold to labeled-illustrative standards (as GSN correctly does with an inline 'illustrative sample' badge).  

**🟡 MED · `app/board/page.tsx,lib/board/state.ts:120`**  
The /board 'Last refresh {time}' / 'Updated {time}' tiles (board/page.tsx:120,158) are stamped with the server request clock, not real odds age: lib/board/state.ts sets lastRefresh=now, and even the DB_UNREACHABLE catch branch (state.ts:341) stamps lastRefresh=now on an EMPTY board. So a broken or empty board reports a fresh 'Updated now' timestamp, and BoardHealthBadge derives health from row counts, never from fetchedAt. This contradicts the /picks live-timestamp defect in the same direction and, more importantly, contradicts the platform's freshness-honesty doctrine: the default Board door can render 'fresh' over stale or absent data.  

**⚪ LOW · `app/pricing/page.tsx:49`**  
The Free tier lists 'Public verified record & calibration' as a delivered (green-check) feature, and TierDoorColumn presents 'Verified record & calibration' as a Free door. But in the FOUNDING phase the calibration/performance surface is intentionally gated ('The public win-rate stays gated until enough settled history exists') and the FAQ on the same page even asks 'Why is the Performance page empty right now?'. Advertising a 'verified record' as an available feature before one exists is a mild proof-vs-promise tension.  

**⚪ LOW · `app/stats/proof/page.tsx:36`**  
The Backtest Archive DataTable surfaces fixture MAE/calibration/what_is_proven columns but drops the paired not_proven caveat present in the source fixture, so a reader sees a run's positive claim (mae 5.8, 'UI and scoring math can display proof artifacts') without its disclaimer in the same row.  

**⚪ LOW · `apps/web/app/today/page.tsx:55`**  
The /today 'Mission Control' briefing renders illustrative data with its disclaimer placed BELOW the cards, weaker than the inline badge pattern GSN uses. A user scanning the prioritized cards can read fabricated priorities as live before reaching the 'illustrative' note.  

**⚪ LOW · `apps/web/app/the-beat/page.tsx:15`**  
/the-beat introduces a named correspondent persona ('Nova reports the week's top signals on location') and a 'Signal Ledger' scoring 'every breaking report the instant it lands,' which reads as live newsroom output; needs an inline illustrative badge so a visitor does not take Nova's reports or the ledger scores as real graded events.  

**⚪ LOW · `apps/web/lib/pricing/pricing-phases.ts:78`**  
The pricing SoT and pricing page ship a fourth paid tier (Fantasy, $4.99/mo · $49/yr) that does not exist in the CLAUDE.md subscription tier table (which documents only Free/Pro/Elite). This is doctrine drift between the pricing SoT and the platform spec; not a price-render bug but an undocumented commercial tier.  

**⚪ LOW · `apps/web/app/page.tsx:185`**  
Homepage renders an unguarded 'calibrated on {settled} settled picks' where settled=calibration.sampleSize. The door-card stat at line 154 is guarded (settled>0 ? 'Calibrated on N settled picks' : 'Calibration sample building'), but the WorldSection footer (line 185) and the MethodologySection metrics (line 234) pass settled unconditionally. At day-1 zero data this renders 'calibrated on 0 settled picks' immediately above the 'see the receipts' link and beside the proof strip's 'Counted over every settled pick' — an honest-but-self-undermining zero state that reads as 'calibrated on nothing.'  

**⚪ LOW · `app/page.tsx:204`**  
KEEP THIS — strong trust moment. The homepage does not bury proof: a dedicated "The proof" band above the fold-adjacent region states "No fabricated picks, no invented stats, no silent edits" with direct CTAs to /clv, /performance (Calibration), and /accountability, and the signal-vs-noise strip links "see the receipts." This is exactly the fast-trust signal a skeptic needs, and it routes to real gated/empty-honest surfaces rather than fabricated numbers. Preserve the proof band's prominence and its plain-language anti-fabrication promise.  

**⚪ LOW · `app/page.tsx:185`**  
The homepage renders an unguarded 'calibrated on {settled} settled picks' where settled=calibration.sampleSize, so at day-1 zero data it reads 'calibrated on 0 settled picks' — a self-undermining claim placed directly above the 'see the receipts' proof link. The sibling door-card stat at line 154 IS guarded (settled>0 ? 'Calibrated on N settled picks' : 'Calibration sample building'), but the WorldSection footer (line 185) and MethodologySection (line 234) pass settled unconditionally. The same page thus both guards and fails to guard the identical calibration claim, contradicting its own honest-empty-state discipline at the exact spot it points users to proof.  

### Legal & Compliance — 10 findings (0C · 5H · 5M · 0L)

**🟠 HIGH · `app/terms/page.tsx:13`**  
The Terms of Service is a self-declared placeholder whose own docstring states it 'must be reviewed by counsel before paid checkout is enabled' — yet paid checkout is live (SubscribeButton wired in components/pricing/pricing-plans.tsx, four Stripe price IDs in env). The site is collecting recurring subscription revenue under an un-reviewed contract the authors themselves flagged as not launch-ready.  
*Repro:* Docstring lines 12-16 say counsel review is a precondition for enabling paid checkout; PricingPlans renders live SubscribeButton with real Stripe price IDs. A plaintiff cites the code's own comment as an admission the operator shipped billing against its documented internal control.  
*Fix:* Have counsel review and formally adopt the Terms before any paid checkout is enabled, or gate checkout off until review completes. Remove the 'placeholder' docstring only once the doc is actually counsel-approved.  

**🟠 HIGH · `app/terms/page.tsx:75`**  
Refund promise contradiction between binding contract and marketing. The pricing page advertises a firm '3-day money-back window' in metadata, OG description, the FAQ answer, and the refund footnote (pricing/page.tsx:37,186,456; faq/page.tsx:95 'no questions'), but Terms §5 says 'we do not pro-rate refunds' and only 'may offer occasional refunds at our discretion.' The enforceable contract negates the advertised guarantee — textbook UDAP/deceptive-advertising and consumer-protection exposure.  
*Repro:* Buyer converts on the strength of pricing/page.tsx:456 '3-day money-back window' and faq:95 'no questions,' requests a refund on day 2, and is refused under Terms §5 'discretion.' The marketing promise and the binding doc directly conflict on the same live checkout flow.  
*Fix:* Codify the exact 3-day money-back guarantee verbatim in Terms §5 as a binding, non-discretionary right, or stop advertising a money-back 'window'/'guarantee' anywhere and describe refunds as discretionary consistently across pricing, FAQ, a…  

**🟠 HIGH · `apps/web/app/terms/page.tsx:12`**  
Terms of Service is a self-labeled placeholder that its own docstring says 'must be reviewed by counsel before paid checkout is enabled' — but paid checkout is live (SubscribeButton is wired and Stripe price IDs are configured). The page's own shipping precondition is violated.  
*Repro:* app/terms/page.tsx:12-16 docstring: 'placeholder... must be reviewed by counsel before paid checkout is enabled.' Checkout is active via components/pricing/pricing-plans.tsx:145 SubscribeButton with real Stripe price IDs (CLAUDE.md env).  
*Fix:* Complete legal review of the Terms before enabling paid checkout, or gate checkout off until the review is done. Remove the placeholder docstring once counsel-approved.  

**🟠 HIGH · `app/pricing/page.tsx:106`**  
Free-tier entitlement is advertised inconsistently on the same surfaces and contradicts what the server enforces. The pricing card description says Free is 'one signal a day' (line 106) while the same page's feature list says 'Every pick, free' (line 46) and the comparison table shows 'Signals per day = All' for Free (line 173). FAQ compounds it: faq:37 'Free plan gets one signal a day' and faq:82-83 'One signal per day,' while server entitlements set dailyPickLimit=null for FREE. A buyer is quoted a cap that both the same page denies and the server does not enforce.  
*Repro:* On /pricing, the Free card reads 'one signal a day' but the comparison row two sections down reads 'All' and the feature bullet reads 'Every pick, free.' /faq repeats 'one signal a day.' picks/page.tsx:397 confirms 'every pick is free - no daily limit.' The conflicting daily-cap claim on the primary…  
*Fix:* Pick one truth (Free = all picks, no daily limit, per server entitlements) and make pricing card description, FREE_FEATURES, comparison cell, and all FAQ answers say it identically. Update CLAUDE.md's stale '1 pick/day' Free row too.  

**🟠 HIGH · `app/pricing/page.tsx,app/terms/page.tsx:456`**  
The binding contract contradicts the advertised refund guarantee on the live checkout flow. Pricing advertises a firm '3-day money-back window' in metadata (pricing:37), the refund note (pricing:456), and FAQ ('a 3-day money-back window ... no questions', faq:95). But Terms §5 (terms:74-76) says 'we do not pro-rate refunds for partial periods. We may offer occasional refunds at our discretion.' The enforceable document negates the marketing promise — a firm money-back window is sold at conversion while the contract makes refunds discretionary. Compounding it, terms/page.tsx:13-15 is a self-declared placeholder whose own docstring states it 'must be reviewed by counsel before paid checkout is enabled' — yet checkout is live.  
*Repro:* Buyer converts on pricing:456 '3-day money-back window' + faq:95 'no questions', requests a refund on day 2, is refused under Terms §5 'discretion'. Same live Stripe checkout flow, opposite promises.  
*Fix:* Codify the exact 3-day money-back right verbatim in Terms §5 as non-discretionary, or stop advertising a money-back 'window' anywhere and describe refunds as discretionary consistently across pricing, FAQ, and Terms. Complete counsel review…  

**🟡 MED · `apps/web/app/terms/page.tsx:74`**  
Terms of Service contradicts the advertised refund promise. The pricing page repeatedly guarantees a firm '3-day money-back window' (metadata, FAQ, and refund note), but Terms §5 states refunds are discretionary and non-prorated ('we do not pro-rate refunds... We may offer occasional refunds at our discretion'). The binding legal document does not honor the marketing guarantee.  

**🟡 MED · `apps/web/components/ui/footer.tsx:37`**  
The Privacy Policy is effectively orphaned. The footer's 'Responsible' column links a single item labeled 'Terms and Privacy' whose href is '/terms' only — there is no link to /privacy anywhere in the global footer or nav. The only path to /privacy is buried in the sign-in page. A required legal page users cannot find undermines GDPR/CCPA notice obligations.  

**🟡 MED · `apps/web/app/vs/tout-services/page.tsx:143`**  
Pre-proof edge assertion: the CLV section states closing line value is 'the leading indicator that an edge is real before a single game settles' and that the sharps respect it — implying GSE has a real edge — while the brand simultaneously admits it has no published record yet ('Collecting'). A plaintiff/FTC soft-claim lens reads this as an implied performance claim unsupported by settled data.  

**🟡 MED · `app/board/page.tsx:1`**  
The primary pick-delivery surface /board carries no responsible-gambling / risk / age disclosure and no 'not betting advice' notice (grep for responsible|gambl|afford confirms zero matches). /picks correctly includes a RiskDisclosure component, but /board — the default Board door and a directly pick-adjacent surface — has none. Responsible-gaming and risk disclosures should be present on every pick-adjacent surface, not just one.  

**🟡 MED · `app/pricing/page.tsx:30`**  
Founding-rate scarcity/urgency claims — 'the lowest we will ever offer,' 'locked for life,' 'your price never moves even as it rises for everyone who joins later' (metadata:32, hero:256-258, FAQ:190) — are forward-looking pricing promises made pre-revenue by an operator with no track record and a discretionary Terms. If founding pricing is ever re-opened, discounted below, or the grandfather guarantee not honored in the binding Terms, these become deceptive scarcity/price claims. The grandfather guarantee appears nowhere in the Terms of Service.  

### Security — 3 findings (0C · 1H · 1M · 1L)

**🟠 HIGH · `app/journal/[slug]/page.tsx:150`**  
BlogPosting JSON-LD embeds entry.title and entry.coldOpen (CMS free-text: row.title and firstParagraph(row.body) from lib/journal/load.ts) into a <script type="application/ld+json"> via dangerouslySetInnerHTML with raw JSON.stringify. The public-guard only strips banned marketing phrases (guardPublicJournalTitle) — it performs no HTML/JSON escaping (its own comment states the title is emitted 'without' escaping). '<' and '</script>' pass through, so CMS-authored content containing '</script>' breaks out of the ld+json block and injects arbitrary HTML/script into the rendered page.  
*Repro:* Publish a journal entry whose title or opening paragraph contains '</script><img src=x onerror=alert(1)>'. On /journal/{slug}, JSON.stringify(articleJsonLd) emits the string verbatim inside the ld+json <script>; the browser terminates the script at '</script>' and parses the injected markup, firing …  
*Fix:* Run the JSON.stringify result through a jsonLdSafe escaper that converts '<'→'\\u003c', '>'→'\\u003e', '&'→'\\u0026' before passing to dangerouslySetInnerHTML. Do not rely on the banned-phrase guard for XSS safety.  

**🟡 MED · `app/preview/[sport]/[slug]/page.tsx:166`**  
JSON-LD structured data is injected into a <script type="application/ld+json"> via dangerouslySetInnerHTML using raw JSON.stringify(block), which does NOT escape the '<' character or the '</script>' sequence. The stringified blocks embed DB-sourced free-text (game.awayTeamName, game.homeTeamName, pick.selection, sport) built in lib/seo/sports-jsonld.ts (buildSportsEventJsonLd/buildBreadcrumbJsonLd/buildFaqJsonLd). Team names and pick.selection are String columns populated from ingested odds data (schema.prisma:350 selection is free-text e.g. "Chiefs -3.5"), not a trusted constant. If any such value contains the substring '</script><script>...' it terminates the JSON-LD block early and injects executable script into the page HTML — stored XSS on an indexable, Nav+Footer public page.  

**⚪ LOW · `app/layout.tsx:254`**  
The Microsoft Clarity inline <Script> interpolates process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID directly into an executable inline script body (and NEXT_PUBLIC_CF_BEACON_TOKEN into a data attribute at line 244) with no encoding. These are operator-set NEXT_PUBLIC_ values, not user-controlled, so exploitability is low, but interpolating an env value into an inline script string is a fragile pattern: a value containing a quote or '</script>' would break out of the script/JSON context. It also only fires when NEXT_PUBLIC_ANALYTICS_ENABLED==='true', limiting blast radius.  

### Correctness & Bugs — 3 findings (0C · 0H · 2M · 1L)

**🟡 MED · `apps/web/components/ui/footer.tsx:35`**  
Dead in-page anchor: footer 'Variance guide' links to /responsible-play#variance but the responsible-play page has no element with id='variance'. Clicking it navigates to the top of the page instead of a variance section, breaking the promised responsible-play resource.  

**🟡 MED · `lib/market/load-market-fair-board.ts:31`**  
Market Fair Board de-vigs and displays odds as the current market with no max-age filter on Odds.fetchedAt and no rendered 'as of' timestamp — a quote captured days ago can be shown as today's consensus.  

**⚪ LOW · `app/board/page.tsx:69`**  
The board's 'Preview mode / Showing deterministic sample board data' banner is dead code: every board loader hardcodes isSampleData:false, so isSampleData is always false and the banner can never render.  

### Information Architecture — 8 findings (0C · 2H · 3M · 3L)

**🟠 HIGH · `app/stats/page.tsx:1`**  
The entire /stats product area (hub + 13+ indexable subpages: ask, compare, comps, depth, expert-board, injuries, media, players, proof, scouting, sources, teams, trenches) is an orphan at launch — the /stats hub is reachable from NO nav, footer, mobile nav, command palette, or in-page link. Its only inbound reference is app/sitemap.ts.  
*Repro:* grep for inbound links to '/stats' (exact) across app/ + components/ returns only app/sitemap.ts. Nav/mobile-nav/footer/command-palette link sets contain no /stats entry. The hub links its own children but nothing links to the hub, so a whole product surface is dark unless a user types the URL.  
*Fix:* Add /stats (or its most valuable child) to a nav door or the footer Data/Product column, or fold it into an existing door. If /stats is deprecated in favor of /players+/intelligence, add noindex and a redirect rather than leaving 13 indexab…  

**🟠 HIGH · `app/stats/page.tsx:9`**  
The entire /stats (StatKing) subtree — 19 indexable child routes plus the hub — is a doorway/orphan cluster. The /stats hub has ZERO inbound links from nav, footer, mobile-nav, or command palette (grep for '/stats' in components/ui returns nothing), yet it self-canonicalizes and is in the sitemap, and it links its own children. So Google is pointed at a whole product area that no human navigation reaches. Worse, the child pages render fixture/sample data (StatusRibbon status="fixture", cards value:"sample") at launch, so the cluster is thin, templated, sample-backed content with no crawl path from the real site — the precise thin/doorway signature that can depress domain-wide quality scores.  
*Repro:* components/ui/{nav,footer,mobile-nav,command-palette}.tsx contain no '/stats' href. app/stats/page.tsx is only reachable by typing the URL or via sitemap.ts line 68. Children like app/stats/depth/page.tsx render StatusRibbon status="fixture" and a hardcoded 'sample' status card. 19 stats child dirs,…  
*Fix:* Decide per-page: either give /stats a real nav/footer entry and ship non-fixture content before indexing, OR add `robots:{index:false}` to the hub and all fixture-backed children until real data is live. Do not leave a sample-backed, nav-in…  

**🟡 MED · `apps/web/components/ui/nav.tsx,apps/web/app/observatory/page.tsx,apps/web/components/home/intelligence-layer.tsx:35`**  
The single /observatory surface is named five different ways across the site — Galaxy Twin, Edge Map, Slate Twin, Galaxy Slate Twin, The Observatory — so a user cannot form one mental model or search for the feature by a stable name.  

**🟡 MED · `apps/web/components/ui/nav.tsx,apps/web/app/gsn/page.tsx:123`**  
The top-nav dropdown LABELED 'GSN' points to /the-beat, not to the actual GSN page at /gsn — and /gsn is separately labeled 'Daily Briefing' elsewhere in the same nav. The brand's named network is both mislinked and multi-named.  

**🟡 MED · `components/ui/nav.tsx,components/ui/mobile-nav.tsx:1`**  
The Proof door is inconsistent across breakpoints: desktop nav exposes ONLY /calibration under Proof, while mobile nav exposes 8 proof links (/calibration, /performance, /clv, /ledger, /proof, /accountability, /intelligence/metrics, /track). Desktop users cannot reach /proof, /ledger, /accountability, /clv from the Proof door at all, contradicting the code's own doctrine that 'credibility is a global anchor, not a sub-menu.'  

**⚪ LOW · `app/deck/page.tsx:18`**  
/deck ('The Command Deck', 309 lines, Nav+Footer, canonical, INDEXED) and /launch (124 lines, INDEXED) are fully built marketing/showcase pages with no inbound link from any nav/footer/palette/in-page surface — polished orphans that Google will index but users can never navigate to.  

**⚪ LOW · `app/intelligence/metrics/page.tsx:1`**  
/intelligence/metrics is in the sitemap (priority 0.5) and reachable from three routes (mobile Proof nav, calibration hub, engines CTA) but is a dead-end: it describes 11 metric detail pages yet emits only one outbound href, linking to none of the metric pages it explains and offering no onward path. A sitemap'd, multiply-linked terminal page with ~1 internal link is a thin-hub signal and wastes the crawl/authority routed into it. (Note: the 11 standalone /intelligence/<metric> pages are 301 redirect shims to /intelligence/engines?engine=X, so they are NOT indexable duplicates — the substrate's 'superseded orphan' framing overstates that; the real issue is this dead-end hub.)  

**⚪ LOW · `app/observatory/page.tsx:24`**  
The /observatory route is named five different things across surfaces: nav calls it "Galaxy Twin" (nav.tsx:35), the page title is "Edge Map" (page.tsx:24), and other surfaces call it "Slate Twin"/"The Observatory". A first-time visitor who clicks "Galaxy Twin" lands on a page titled "Edge Map" with no visible connection between the two names — a small but repeated orientation tax that makes the IA feel unfinished.  

### Design-System Consistency — 13 findings (2C · 4H · 4M · 3L)

**🔴 CRITICAL · `app/preview/[sport]/[slug]/page.tsx:175`**  
VERTICALS FAMILY — WORST OFFENDER. This SEO-indexable game-preview page is built entirely on shadcn/ui default tokens (text-muted-foreground, text-foreground, bg-transparent card via bare `border`, `rounded-lg`) that DO NOT EXIST in this project's Tailwind config (tailwind.config.ts defines carbon/ion-white/orbital-cyan/plasma/paper — never --muted-foreground/--foreground/--border/--primary). It is the ONLY public page in the whole 130-page surface using these tokens (grep confirms a single hit). Rendered on the global bg-carbon shell, every `text-muted-foreground` resolves to an undefined color (no visible mute), cards are near-invisible outline-only boxes, and the type scale (text-3xl/text-2xl font-bold, no font-display) matches no sibling. It reads as a raw shadcn scaffold dropped into a cosmic-dark product — the definitive 'looks like a different app' page.  
*Repro:* Config has no `muted-foreground`/`foreground`/`border`/`background`/`primary` color keys. Lines 175,181,187,191,200,212,216,221,232,241,254 all use text-muted-foreground; 195 text-foreground; 186/199 bare `border` cards with no bg-token; 178 `text-3xl font-bold` heading vs the app-wide `font-display…  
*Fix:* Rebuild on the real tokens: page uses `bg-carbon text-ion-white`, mute -> `text-ion` / `text-ion-2`, cards -> `rounded-xl border border-titanium bg-obsidian/80 p-6`, heading -> `font-display text-display-xl text-balance text-white`, Model L…  

**🔴 CRITICAL · `app/picks/page.tsx:461`**  
BOARD FAMILY — WORST OFFENDER (and highest business stakes: the primary paid-conversion surface). 61 default-Tailwind color utilities, including casino green/red W/L semantics the brand doctrine explicitly bans: `text-green-400` on wins (461) and `text-red-400` on losses (463) on a real settled-record SlateBar. Plus non-token cyan/fuchsia everywhere — active sport tab `bg-cyan-400 border-cyan-300` (253), grade filter `bg-fuchsia-400` (279), error state `bg-red-950/40 text-red-400` (296-297), empty-state and CTAs `border-cyan-400 bg-cyan-400/10 text-cyan-100` (306,337,489,594) — instead of the sanctioned orbital-cyan #00E5FF (WIN), alert #FF6470 (LOSS), and plasma tokens.  
*Repro:* grep of default color utils in app/picks/page.tsx returns 61. Doctrine: WIN=orbital-cyan, LOSS=alert; default cyan-400/green-400/red-400/fuchsia-400/emerald are DEFECTS. This is the surface a paying user hits after clicking every pricing CTA.  
*Fix:* Swap green-400->orbital-cyan (or verify), red-400->alert, cyan-400/300/100->orbital-cyan(+/opacity), fuchsia-400->plasma, red-950->titanium/alert-tinted. Reuse the board's BoardHealthBadge/lane color tokens so /picks and /board share one la…  

**🟠 HIGH · `app/picks/page.tsx:461`**  
The recent W-L record renders wins in casino-green (text-green-400) and losses in casino-red (text-red-400) — the exact color encoding the brand doctrine bans. WIN must be orbital-cyan (#00E5FF), LOSS must be alert (#FF6470); default Tailwind green-/red- utilities are declared DEFECTS.  
*Repro:* Visit /picks with a settled record; SlateBar renders `<span className="text-xs font-bold text-green-400">{record.wins}W</span>` and `text-red-400` for losses — casino green/red on the primary betting-outcome surface, contradicting the anti-gambling brand.  
*Fix:* Replace text-green-400 with text-orbital-cyan and text-red-400 with text-alert for the W/L spans. Also swap the cyan-400/cyan-300/cyan-100 and red-950/red-400 utilities in this file for orbital-cyan / alert tokens.  

**🟠 HIGH · `components/players/player-lab-table.tsx:138`**  
The public Player Lab / Intelligence data tables encode good/bad (buy/sell, agree/disagree, pressure, rating-allowed) with text-emerald-700 and text-rose-700 — default Tailwind green/rose, which the doctrine lists as defects. This green=good / red=bad ramp is the win/loss casino encoding applied to player-value signals.  
*Repro:* Open /players (and /intelligence/engines): tone 'good' → text-emerald-700, tone 'bad' → text-rose-700 at lines 138, 220, 386, 396; pressurePct 295, passerRatingAllowed 325, agree/disagree badges 456/458, Out badge 417 all use emerald/rose default utilities instead of orbital-cyan/alert.  
*Fix:* Route all good/bad/buy/sell tones through the brand semantic tokens (orbital-cyan for positive, alert for negative, caution for neutral-warn), matching lib/format/stat.ts winRateToneClass which already does this correctly. Do the same for t…  

**🟠 HIGH · `app/picks/page.tsx:461`**  
The SlateBar recent-record uses casino green/red (text-green-400 for wins, text-red-400 for losses), the exact win/loss color semantics the brand doctrine bans; WIN must be orbital-cyan #00E5FF and LOSS must be alert #FF6470, never green/red.  
*Repro:* When canExposePerformanceStats opens, /api/picks/daily-slate returns recentRecord and SlateBar renders `<span className="text-xs font-bold text-green-400">{record.wins}W</span>` (line 461) and `text-red-400` for losses (463). Green=win / red=loss is the tout/casino idiom the platform explicitly reje…  
*Fix:* Replace text-green-400 with text-orbital-cyan and text-red-400 with text-alert (and text-ion-2/text-ion-3 for pushes/separators), matching the WIN/LOSS tokens used on /proof and /performance.  

**🟠 HIGH · `app/picks/page.tsx:194`**  
The /picks page (primary paid-conversion surface) uses 61 default-Tailwind color utilities (cyan-/fuchsia-/yellow-/blue-/purple-/red-/green-*) instead of the brand token palette; the doctrine explicitly classifies default-Tailwind color utilities as DEFECTS.  
*Repro:* grep for default-Tailwind color utils on app/picks/page.tsx returns 61 hits: e.g. sample-data banner border-yellow-900/bg-yellow-950/text-yellow-300 (194-197), sport tabs border-cyan-300/bg-cyan-400 (253-254), grade pills border-fuchsia-300/bg-fuchsia-400 (279-280), upgrade CTAs bg-blue-600/text-blu…  
*Fix:* Replace all default-Tailwind color utilities with brand tokens: cyan-* -> orbital-cyan, fuchsia-*/purple-* -> plasma/ultraviolet, yellow-* -> caution, red-* -> alert, blue-* -> orbital-cyan/ultraviolet, green-* -> orbital-cyan/verify; mirro…  

**🟡 MED · `app/stats/_components.tsx:4`**  
STATS FAMILY — WORST OFFENDER (systemic, whole-area). The entire /stats tree (18+ pages) renders through a self-authored local kit (Shell, Cards, HeroStat, ScoreRing, BarChart, DataTable) that diverges from the global system on three axes at once: (1) Shell renders `<main className="min-h-screen bg-carbon">` with NO global <Nav> and NO <Footer> — a whole product family missing shared chrome, so users are stranded with no site navigation; (2) every card is sharp-cornered `border border-mineral bg-eclipse` with ZERO border-radius, while 57 files elsewhere use rounded-xl/2xl — an industrial-terminal look pasted into a rounded-cosmic app; (3) hero is `text-4xl font-bold` not `font-display text-display-xl`. Combined with the reachability finding that the /stats hub is orphaned, this is a design-system ISLAND.  

**🟡 MED · `components/players/player-lab-table.tsx:138`**  
PLAYERS / INTELLIGENCE FAMILY — WORST OFFENDER. The public Player Lab and Intelligence engine tables encode good/bad (win/loss-equivalent 'buy'/'sell') signals with default-Tailwind emerald/rose — a direct brand-doctrine color violation across the data layer. player-lab-table.tsx uses text-emerald-700/text-rose-700 at 138,220,295,309,325,386,396,417,456,458; engine-view.tsx:716 does the same for adds/drops. Because these tables sit on the light `paper` data-surface, the author reached for emerald-700/rose-700 (light-bg shades) instead of the brand's on-light semantic tokens. The doctrine names emerald-/rose- utilities as DEFECTS and reserves verify #5FD9A3 / alert #FF6470 for good/bad; registry.tsx repeats emerald-700/rose-700 in ~12 explainer spans, so the violation is systemic across the whole intelligence corpus.  

**🟡 MED · `app/dashboard/page.tsx:415`**  
The authenticated customer dashboard uses casino-green defaults: grade badge 'A' → bg-green-900/40 text-green-300 (line 415), highlighted KPI values → text-green-400 (line 443), and an emerald status pill (line 400). Default green- utilities are brand defects; positive/highlight state should use orbital-cyan or verify tokens.  

**🟡 MED · `app/pricing/page.tsx,app/about/page.tsx,app/methodology/page.tsx,app/faq/page.tsx:250`**  
MARKETING/TRUST FAMILY — systemic token dialect split on primary text. Sibling marketing/trust pages disagree on the white token: home (app/page.tsx, 11x) and deck (10x) use `text-ion-white` (#F5F7FF, the on-token cosmic white), while pricing (10x), about (4x), methodology (8x), and faq (3x) use plain `text-white` (#FFFFFF, off-token, pure white). Two authors, two whites, no enforced token — a subtle but real cross-page inconsistency in the exact heading/hero text a design director screenshots side-by-side. Pricing even mixes both on one page (text-white x10 + text-ion-white x1).  

**⚪ LOW · `app/launch/page.tsx:52`**  
MARKETING FAMILY — type-scale escape hatch. The /launch hero hardcodes an inline `style={{ fontSize: 'clamp(2.25rem, 6vw, 4.25rem)', lineHeight: 1.0, letterSpacing: '-0.02em' }}` instead of the design-system `text-display-xl` token (clamp(2.5rem,6vw,4rem)) that every other marketing/trust hero (home, about, pricing, methodology, faq, deck) uses. It reimplements the display scale by hand with slightly different min/max (2.25->4.25rem vs 2.5->4rem), so the launch headline is a hair off every sibling hero and bypasses the type scale entirely.  

**⚪ LOW · `app/stats/page.tsx:45`**  
STATS FAMILY — card-radius drift confirmed at the page level (supporting the family verdict). The StatKing hub card is `border border-mineral bg-eclipse p-6` with no rounding, matching _components but clashing with the app-wide rounded-xl/2xl card language. Called out separately because a reviewer landing on /stats first sees this hero card and immediately reads 'different product' before noticing the missing chrome.  

**⚪ LOW · `app/auth/signin/page.tsx:32`**  
The signin card uses non-token default/utility colors that violate brand doctrine on a conversion-critical page: bg-gradient-to-tr from-brand-700 to-blue-600 (blue-600 is a default Tailwind utility), and the error banner uses border-red-800/bg-red-950/text-red-400 (casino-red family) instead of the brand alert token #FF6470. The logo mark uses bg-brand-600.  

### Accessibility (WCAG 2.2 AA) — 5 findings (0C · 1H · 4M · 0L)

**🟠 HIGH · `app/layout.tsx,app/board/page.tsx:225`**  
The global 'Skip to content' link targets href="#main-content", but on /board (and most funnel pages) the <main> element has no id="main-content" — only /page.tsx (home), /today, /the-beat, /track, /launch, /human, /integrations define that id. On the board step of the funnel the skip link is a dead anchor.  
*Repro:* Keyboard-only user lands on /board, presses Tab once to reveal the skip link, presses Enter. layout.tsx:225 points at #main-content; board/page.tsx:57 renders <main> with no id, so focus does not move to the content and the entire Nav (5 dropdown doors + auth links) must be Tabbed through on every p…  
*Fix:* Add id="main-content" to the <main> in app/board/page.tsx (and audit every public page with a Nav to ensure the <main> carries the id the skip link targets). Better: render the skip-link target id from a shared layout/Main wrapper so it can…  

**🟡 MED · `components/ui/nav.tsx:116`**  
No nav link ever gets aria-current="page". The Nav is a server component with no pathname awareness; the desktop CSS supports a .active class (pickpilot-kit.css:63) but nav.tsx never applies it and never sets aria-current. A screen-reader user Tabbing the primary nav on /board hears 'Board link, Board link' with no indication of which door is the current location.  

**🟡 MED · `components/ui/nav.tsx:79`**  
The desktop dropdown doors are keyboard-hostile. The door trigger is a real <Link href="/board"> carrying aria-haspopup="true" but no aria-expanded and no menu semantics. On Enter the trigger NAVIGATES away (to /board) rather than opening the submenu; the submenu (Mission Control, Daily Briefing, The House, etc.) is only reachable by Tabbing PAST the trigger so group-focus-within reveals the visibility:hidden panel. aria-haspopup announces a popup that Enter never opens.  

**🟡 MED · `components/ui/mobile-nav.tsx:165`**  
The mobile nav panel is not a focus-trapped dialog and has no click-outside/backdrop dismiss. When open it renders inline after the trigger with no aria-modal, no focus containment, and no initial focus move into the panel. Escape works (good), but Tab escapes the open menu into page content behind it, and there is no backdrop to tap-to-close (unlike the command palette which has both).  

**🟡 MED · `app/auth/signin/page.tsx:121`**  
The signup/signin endpoint of the funnel offers exactly ONE working control — 'Continue with Google'. The 'Email sign-in coming soon' text is a dead, non-interactive divider. A keyboard/SR user who cannot or will not use Google OAuth has NO path to convert; there is no email field, no fallback. The funnel terminates in a single-provider dead end.  

### SEO & Structured Data — 7 findings (0C · 0H · 6M · 1L)

**🟡 MED · `lib/seo/sports-jsonld.ts:121`**  
Every preview page ships a FAQPage JSON-LD (buildFaqJsonLd via defaultMatchupFaq) whose Q&A text is fully templated from two fixed question stems ("Who is favored in X vs Y?" / "When do X and Y play?") with no unique prose. Across thousands of programmatic matchup pages (sitemap loadPreviewGames take:2000) this produces near-identical FAQPage markup at scale — exactly the templated/scaled-content pattern Google's spam policies and the March-2024 scaled-content-abuse update target. Duplicated FAQ rich-result markup across a whole URL cluster is a domain-level thin/scaled-content risk at launch, not a per-page cosmetic issue.  

**🟡 MED · `app/preview/[sport]/[slug]/page.tsx:1`**  
Game-preview content pages are INDEXED and included in the sitemap but reachable from no internal link (nav/footer/blog/board none link /preview/*). Indexable content with zero on-site crawl path dilutes internal-link equity and orphans a real content surface from users who don't arrive via Google.  

**🟡 MED · `lib/seo/sports-jsonld.ts:50`**  
The FAQPage 'Who is favored' answer injects the model's pick and confidence as structured data submitted to Google: pickSentence() renders "Our model's lean: {selection} {line} ({type}), confidence {N}/100." inside acceptedAnswer.text. This surfaces a betting-prediction claim with a numeric confidence directly in a rich result. Google's structured-data and gambling-content policies restrict betting/odds rich results, and a FAQPage whose answer is really a betting tip risks manual-action / rich-result suppression — and it puts a performance-adjacent confidence number (e.g. 64/100) into an index-facing surface the brand doctrine otherwise gates.  

**🟡 MED · `app/sitemap.ts:65`**  
Sitemap coverage of the /stats tree is internally inconsistent: it advertises only 5 stats URLs (/stats, /stats/compare, /stats/ask, /stats/proof, /stats/expert-board) while 12+ equally-indexable stats children (comps, depth, injuries, players, scouting, sources, teams, trenches, watchlist, source-graph, source-suggest, media) are omitted from the sitemap yet remain crawlable and self-canonicalizing. This splits crawl signals (some sample pages promoted, most left as orphan-but-indexable) and, combined with the hub having no UI inbound links, gives Google a partial, incoherent map of a fixture-backed area.  

**🟡 MED · `app/deck/page.tsx:1`**  
/deck (a 309-line investor/marketing 'Command Deck' showcase) and /launch are fully indexable (no robots:{index:false}) but have zero inbound UI links from nav/footer/palette and are NOT in the sitemap. They are self-canonicalizing marketing orphans. Indexable pages with no internal links and no sitemap entry are classic thin/orphan signals; a splashy showcase page that duplicates homepage value propositions can also dilute the homepage's topical authority and confuse which URL Google ranks for brand queries.  

**🟡 MED · `app/preview/[sport]/[slug]/page.tsx:108`**  
Preview pages are programmatically generated per Game (sitemap take:2000) and are fully indexable, but they carry no freshness/staleness guard for SEO: the page has no dynamic/revalidate export and generateMetadata emits a canonical + SportsEvent + a 'Model Lean' with confidence for scheduled games. After a game finalizes, the URL stays indexed advertising a pre-game 'prediction & pick' with a stale confidence, and thousands of low-differentiation matchup pages get pushed to the index at once. Mass programmatic pages that thin out (past games, no unique content) are the exact scaled-content pattern that can trigger a site-wide quality demotion at launch.  

**⚪ LOW · `lib/seo/sports-jsonld.ts:95`**  
The BreadcrumbList JSON-LD emitted on every /preview/[sport]/[slug] page uses a DUPLICATE URL for two distinct ListItems: position 1 ("Picks") and position 2 (the sport crumb, e.g. "NFL") both resolve to `${SITE_URL}/picks` (buildBreadcrumbJsonLd items[0].path and items[1].path are both "/picks"). Google's structured-data guidelines require each BreadcrumbList item to have a unique `item` URL; two identical URLs in one trail is an invalid breadcrumb that Google will drop or flag as an error in Search Console across every one of the thousands of generated preview pages.  

### Content, Copy & Voice — 12 findings (0C · 3H · 7M · 2L)

**🟠 HIGH · `app/the-beat/page.tsx:46`**  
The homepage's second primary CTA is "Watch The Beat" → /the-beat, whose Signal Ledger (components/news/the-beat.tsx) attributes FABRICATED headlines about FICTIONAL players to REAL, named public reporters (Schefter, Rapoport, Pelissero) with fake "12m ago" freshness stamps and a "✓ Confirmed · 2 sources" badge — while the only disclaimer sits at the very bottom (page.tsx:93), below the fold. A 30-second skeptic reads a fake Schefter injury scoop stamped 'confirmed, 12m ago' and either (a) believes a fabricated report is real, or (b) realizes it's fake and concludes the whole site fabricates. The top "The Beat · On air" live-dot reinforces the false liveness before any caveat appears.  
*Repro:* From homepage hero click "Watch The Beat" (app/page.tsx:108). Land on /the-beat: hero shows live-dot + "On air" (page.tsx:46). Scroll to Signal Ledger: DEMO_WIRE items (wire.ts:45-46) render "Adam Schefter · Insider · Vale (ankle) ruled OUT ... 12m ago" with "✓ Confirmed · 2 sources" (the-beat.tsx:8…  
*Fix:* Put an inline "Illustrative wire — fictional reports demonstrating the scoring engine" badge in the Signal Ledger header (the-beat.tsx, above the feed), matching the pattern used by GalaxyBroadcast's always-on "Synthetic presenters" disclos…  

**🟠 HIGH · `app/pricing/page.tsx,app/faq/page.tsx:106`**  
The Free tier's daily-signal allowance is stated three contradictory ways on the SAME pricing page, and the FAQ compounds it — while the server enforces no cap at all. The Free plan CARD description says Free is 'one signal a day' (pricing/page.tsx:106), but the FREE_FEATURES bullet on the same page says 'Every pick, free' (pricing/page.tsx:46) and the comparison table's 'Signals per day' cell for FREE renders 'All' (pricing/page.tsx:173). FAQ then repeats the false cap twice: 'Free plan gets one signal a day' (faq/page.tsx:37) and 'One signal per day — the highest-Edge-Index signal of the slate' (faq/page.tsx:83). The de-paywall is documented in the page's own code comment (pricing/page.tsx:169-171: 'picks were de-paywalled (dailyPickLimit is null for all)'). A skeptic evaluating the money surface sees the product advertise a 1/day cap and 'All picks free' within one scroll — the exact 'publish one thing, do another' tell the brand claims to be above.  
*Repro:* Open /pricing: Free card (line 106) = 'one signal a day'; scroll two sections to comparison table (line 173) = 'All'; feature bullet (line 46) = 'Every pick, free'. Open /faq (lines 37, 83) = 'one signal a day' / 'One signal per day'. Server sets dailyPickLimit=null for FREE.  
*Fix:* Pick one truth (server = no cap). Rewrite pricing:106 and faq:37/83 to 'Every pick, free' and differentiate paid tiers on confidence/factor-trail/alerts, deriving the Free description from the same entitlement source as the comparison cell …  

**🟠 HIGH · `app/faq/page.tsx,app/pricing/page.tsx:62`**  
The FAQ defines the Edge Index AS the confidence rating, then gates the confidence rating away from Free — making the FAQ say Free both gets and does not get the same metric. faq:62 says 'What's the Edge Index? A calibrated 0–100 confidence rating on every signal.' faq:83 then says for Free 'the confidence rating and factor trail are gated to Pro and Elite.' But pricing FREE_FEATURES lists 'Edge Index on every signal' as INCLUDED for Free (pricing:47), and the comparison table marks 'Edge Index' true for FREE while 'Confidence rating' is false for FREE (pricing:173 vs the confidence column) — establishing Edge Index and confidence rating as two DIFFERENT things. If Edge Index IS the confidence rating (faq:62) and Free gets Edge Index (pricing:47), then Free gets the confidence rating, directly contradicting faq:83.  
*Repro:* faq:62 equates Edge Index with 'a calibrated 0–100 confidence rating'; faq:83 gates the 'confidence rating' to Pro; pricing:47 gives Free the 'Edge Index'; pricing comparison row (line 173) shows Edge Index=true / Confidence rating=false for FREE. The two metrics are conflated in the FAQ but split o…  
*Fix:* Disambiguate in the FAQ: define Edge Index as the public market-vs-model number Free sees, and 'calibrated confidence rating' as the separate Pro/Elite readout. Align faq:62 wording with the pricing comparison split.  

**🟡 MED · `apps/web/app/pricing/page.tsx,apps/web/lib/pricing/value-architecture.ts:292`**  
The pricing page shows two different names for the same tier on one screen: the plan cards say Free/Fantasy/Pro/Elite while the 'Why each step up' section (fed by value-architecture) renames them Signal Preview / Edge Board / Galaxy IQ. A shopper cannot tell that 'Edge Board' and 'Pro' are the same product.  

**🟡 MED · `app/pricing/page.tsx:106`**  
On the money surface, the Free plan CARD says "one signal a day" while the same page's Free feature list ("Every pick, free") and comparison table "Signals per day" cell both say "All" — a self-contradiction a plan-comparing skeptic will catch in one scroll, and it also contradicts the server (dailyPickLimit=null for FREE). It reads as either a bait cap or a careless page, both trust-corrosive on the exact surface where money is decided.  

**🟡 MED · `app/pricing/page.tsx:106`**  
The Free tier's card description says 'one signal a day' but the same page's feature list (line 46 'Every pick, free'), comparison table (line 173 'Signals per day' = 'All'), and the code's own comment (lines 169-171, 'picks were de-paywalled, dailyPickLimit is null for all') all state every pick is free with no cap. The picks page (397, 535) also advertises 'no daily limit.' A self-contradicting description of what Free delivers undercuts the 'honest labels / proof not promises' brand.  

**🟡 MED · `apps/web/app/vs/tout-services/page.tsx,apps/web/app/methodology/page.tsx:209`**  
The brand attacks the exact 'sharp money'/'the pros use' vocabulary register it adopts elsewhere. The tout-services page mocks 'Sharp money is on the dog' as a fake tell, while methodology sells the product with 'sharp-credible' and 'the same line-shopping edge the pros use.' This undercuts the 'proof, not tout-vibes' positioning.  

**🟡 MED · `apps/web/lib/brand.ts,apps/web/app/page.tsx:22`**  
Three competing brand one-liners with no hierarchy, and the file that declares itself the single source of truth for the tagline is not used verbatim on the homepage hero.  

**🟡 MED · `apps/web/app/about/page.tsx,apps/web/app/faq/page.tsx:16`**  
Product noun drifts between 'pick' and 'signal' with no rule, including within a single page. /about calls the product a 'pick' throughout while home/faq/pricing lean 'signal'; the pricing page and comparison table mix both. Inconsistent nouns weaken a trust-first brand that is trying to sound precise.  

**🟡 MED · `app/stats/depth/page.tsx:14`**  
Representative of the StatKing cluster: pages render fixture/sample data as indexable content with thin, boilerplate 'How to use' prose. This page (45 lines) shows StatusRibbon status="fixture", a hardcoded Status card value:"sample", and a generic InsightCard, over a sliced fixture table. Multiple sibling pages follow the same shell/template (Shell + Cards + StatusRibbon + InsightCard + DataTable), so the cluster reads as templated-identical thin content to a crawler while presenting sample data as if it were product.  

**⚪ LOW · `apps/web/app/faq/page.tsx,apps/web/app/about/page.tsx:17`**  
Voice drifts between 'first-person founder' and corporate 'team' on adjacent trust pages, and support-email strings are hardcoded rather than read from the brand SSOT, risking future drift.  

**⚪ LOW · `components/ui/nav.tsx:25`**  
A primary-door nav item ("Daily Briefing" under Board) openly advertises "live feed coming soon" — a "coming soon" label sitting inside the top-level Board door. For a trust-first product, surfacing a pre-launch item in the primary navigation invites the skeptic's "is any of this actually live?" doubt. The destination (/gsn) is correctly badged illustrative, so the issue is purely that a not-yet-live product occupies primary nav real estate.  

### UX & Content — 3 findings (0C · 0H · 3M · 0L)

**🟡 MED · `app/intelligence/metrics/page.tsx:1`**  
/intelligence/metrics is a dead-end: it has ZERO outbound internal links yet is reached from three places (mobile Proof nav 'How we read metrics', the /calibration hub, and the engines-page CTA). It describes the metrics but links to none of the 11 metric detail pages nor back into the engines, leaving the user stranded.  

**🟡 MED · `components/ui/nav.tsx:123`**  
The primary nav dropdown LABELED "GSN" links to /the-beat, not to the /gsn page — so a user who clicks the word "GSN" in the nav never lands on the GSN page ("the transmission, not the blog"). Meanwhile /gsn is reachable only as "Daily Briefing" buried inside the Board dropdown (line 25), whose own description admits "live feed coming soon." The label points at a different destination than its name, a classic confusing-nav tell that erodes first-visit confidence.  

**🟡 MED · `components/ui/nav.tsx:123`**  
The primary nav dropdown LABELED 'GSN' does not lead to the GSN page — it points at /the-beat (nav.tsx:123). A user who clicks the word 'GSN' in the nav never reaches the page titled 'GSN — Galaxy Sports Network' at /gsn, which is instead buried as 'Daily Briefing' under the Board door (nav.tsx:25) with a desc admitting 'live feed coming soon'. The label contradicts its destination, and the same route is named five ways elsewhere (Galaxy Sports Network / Daily Briefing / the transmission), compounding an IA credibility problem.  

---

## 7. Method, coverage & honesty about gaps

- **Deep cross-surface pass:** 6 substrate builders (number-provenance ledger, link-reachability graph, day-1 empty-state simulation, copy/voice corpus, pricing/legal SSOT diff, data-freshness) → 7 adversarial personas (plaintiff's-lawyer/FTC, sharp-bettor contradiction hunter, fintech design director, assistive-tech funnel walker, thin-content SEO strategist, appsec, first-time skeptic) → contradiction hunter → synthesis. 62 agents, ~2.86M tokens. **98 raw → 92 verified (6 rejected on adversarial re-verification).**
- **Mechanical 8-dimension breadth pass:** 17 route/component cluster auditors + 6 specialist sweeps (trust/banned-language, token drift, a11y/contrast, SEO/JSON-LD, link integrity, correctness/hydration) → dedup → per-finding adversarial verification. *(Instance-level breadth from this pass — additional contrast ratios and per-file color/font occurrences — is being folded in; it corroborates rather than overturns the above.)*
- **Hand pass (lead reviewer):** independently read and verified the calibration/track-record data path, pricing SSOT, footer, homepage, `/picks` colors, the three blockers, and computed the orphan-route set and the 354+ sub-floor-font / 400+ banned-color-utility counts by grep.

**Known limits (no silent gaps):** contrast findings should be re-computed by the implementer against the *actual* rendered bg for each pair (tokens can be overridden by ancestor surfaces). The orphan-route set was computed by static-href grep and may over-count routes reached via dynamic/templated hrefs (notably `/players/*`, which the nav comment says are superseded by in-page lenses) — treat as *candidate* orphans pending a code-traced confirm. `/preview` dynamic pages were audited via the shared builders (`lib/seo/sports-jsonld.ts`) and one representative page, not per-slug.
