# Galaxy Sports Edge — Public Launch Audit (`PUBLIC_FINDINGS_FOR_GROK.md`)

> Adversarial, code-traced audit of the **public / user-facing surface** of galaxysportsedge.com (Next.js 14 App Router, `apps/web`). Scope excludes `app/admin`, `app/cockpit`, `app/api`. Every finding below is anchored to `file:line` in real code. Findings marked **CONFIRMED** were adversarially re-verified against source (a second agent re-opened the file and tried to refute the claim); a subset were also hand-verified by the lead reviewer.
>
> **Give this to Grok to confirm/extend, or fix directly.** The three launch-blockers in §2 are independently hand-verified and should be treated as a hard gate.

**Method.** Two multi-agent passes plus a hand pass. (1) A **mechanical 8-dimension per-file sweep** (17 cluster auditors + 6 specialist sweeps) — breadth. (2) A **deep cross-surface intelligence pass** (6 substrate builders → 7 adversarial personas → contradiction hunter → synthesis) — the higher-order layer that reasons *across* pages: number-provenance ledger, day-1 empty-state simulation, a plaintiff's-lawyer/FTC read, a sharp-bettor contradiction hunt, a fintech design-director screenshot test, an assistive-tech funnel walk, and a thin-content SEO strategist. (3) A **hand pass** by the lead reviewer that independently verified the trust engine, pricing, footer, reachability, and the three blockers. This document is built on the deep pass (92 verified findings, 6 rejected on verification) + the hand pass. **The mechanical breadth pass originally died mid-run; its finder outputs were later salvaged from the workflow journal and adversarially re-verified (110 → 89 confirmed, 13 rejected), and a dedicated responsive/performance gap-fill was added — all folded in as [Part II](#part-ii--breadth--gap-fill-second-pass), §§8–12.** In total: **~215 verified findings** across both parts.

> **Note added in Part II:** two breadth patterns rise to launch-quality severity. (a) On `/players`, `components/players/player-lab-table.tsx:89` renders identifier columns as `text-ion-white` on the DataTable's white paper background — **1.07:1, effectively invisible** (the "immaculate lab" has unreadable player/team columns). (b) The legacy light **`ink` ramp is used as text on dark surfaces across 57 files** (1.5–3.4:1), which *also silently hides trust-required "illustrative / not-live" disclosures* — a trust defect wearing an accessibility costume. Neither is a hard blocker, but both should be fixed before launch.

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


---

# Part II — Breadth & Gap-Fill (second pass)

> Added after the primary report. Two follow-up ultracode passes: (A) adversarial verification of the mechanical breadth pass that originally died mid-run — its finder outputs were salvaged from the workflow journal and re-verified (**110 checked → 89 confirmed, 8 plausible, 13 rejected**; verifiers recomputed every contrast ratio against the *actual composited* surface, e.g. `surface-card` = `color-mix(eclipse 80%, obsidian)` = `#131022`); and (B) a responsive/mobile + performance gap-fill (**42 findings**) for the two dimensions the first passes under-covered. Findings here are net-new vs Part I.

## 8. New systemic patterns (breadth verification)

_The breadth pass converts the deep audit's per-symptom notes into named, quantified SYSTEMIC a11y/design-system patterns and surfaces five failure classes the deep list never named: (1) the LIGHT "ink" ramp used as body text on DARK surfaces (the single largest defect — 57 public files, 1.5–3.4:1 contrast), (2) focus-visible:outline-none with no replacement (25/30 hits, keyboard focus invisible), (3) a globally-broken "Skip to content" bypass link (dead on 117 of 124 routes), (4) casino-red error boundaries as a duplicated skin across all 6 error.tsx files, and (5) reintroduction of the officially-deprecated #E0A800 gold across 12 files. It also catches modal-a11y regressions (role=dialog without aria-modal/focus-trap/scroll-lock) and color-alone status that the deep pass's 7 patterns don't cover._

**Light 'ink' ramp (ink-400 #5E6878, ink-500 #3D4555, ink-600 #2E3849 — defined for LIGHT paper in tailwind.config.ts:168-170) is used as small body/label/meta/disclaimer text ON DARK surfaces (carbon #0D1117, eclipse #171228, obsidian). Computed contrast is 1.5:1–3.4:1, far below WCAG AA 4.5:1 — text is effectively invisible. This is distinct from the deep list's 'sub-floor fonts' (a size problem) and 'casino colors' (a hue problem): it is a light-vs-dark token INVERSION where a legit token is applied to the wrong surface polarity. Critically, it silently hides trust-required disclosures ('illustrative/not-live' notes in fantasy-shell.tsx, sleeper-connect claim-scope, galaxy-slate-twin dataNote, tier-gate refund microcopy) — a trust defect wearing an a11y costume.**  
*Scope:* 57 public .tsx files (grep text-ink-[456]00 excluding cockpit/admin). Concentrated in components/fantasy/* (gm-ledger-view has 9 ink-500 + 9 ink-600), components/human, components/tracker, components/trust-ledger, components/parlay, components/airwave, components/ui/footer.tsx (site-wide, every page), plus legal pages (terms/privacy/pricing/responsible-play).  
*Fix:* Global find/replace on dark surfaces: text-ink-400→text-ion-3 (#8B97AB), text-ink-500/600→text-ion-1/ion-2 (#AEB7D2/#B1BAD5). Add an ESLint/stylelint guard banning text-ink-4/5/600 in any file that also renders bg-carbon/eclipse/obsidian, so the light ramp can only be used on paper surfaces. Re-run the contrast skill on the 57 files.

**focus-visible:outline-none is applied to interactive controls (buttons, tabs, toggles, range sliders, the primary 'Enter the engine' CTA) WITHOUT any replacement focus indicator (no focus-visible:ring/shadow/border/text) — 25 of 30 occurrences on the class string have no substitute. Keyboard focus becomes completely invisible (WCAG 2.4.7 failure). enter-gate.tsx additionally fakes a ring via an aria-hidden, always-animating element forced to opacity:0 under prefers-reduced-motion, so the 'replacement' is decorative, not focus-bound. Separately, 15 bare outline-none (not scoped to focus-visible) sit on public inputs.**  
*Scope:* 25/30 focus-visible:outline-none hits across ~20 public files: fantasy optimizer cluster (optimizer-workspace, lineup-optimizer, dfs-optimizer, bestball-board, draft-assistant, waiver-board), trust-ledger/proof-of-record, parlay-genome, intelligence/reasoning-showcase, war-room/agent-war-room, gsn/transmission, hero/enter-gate, landing/cinematic-entrance, slate-twin (5 hits), tracker/staking-calculator inputs; plus 15 bare outline-none on inputs.  
*Fix:* Introduce one shared focus utility (e.g. a .focus-ring class or focus-visible:ring-2 focus-visible:ring-ion-blue token) and append it wherever focus-visible:outline-none appears; remove the aria-hidden fake ring in enter-gate and bind a real focus-visible ring. Add a lint rule flagging outline-none/focus-visible:outline-none unless a focus-visible:ring|shadow|outline is present on the same element.

**The global 'Skip to content' bypass-blocks link (app/layout.tsx:225 href=#main-content) is dead on almost every route: only 7 of 124 public pages define id='main-content' (the-beat, today, track, home, launch, human, integrations). On the other 117 pages the anchor resolves to nothing, so keyboard/AT users have no working bypass — WCAG 2.4.1 (Bypass Blocks) failure site-wide. The stats cluster Shell (app/stats/_components.tsx) explicitly lacks the id, breaking every page it wraps.**  
*Scope:* 117 of 124 public page.tsx routes have no id='main-content'; only 7 define it. Fix point is small (shared Shell/layout components) but blast radius is nearly the whole public site.  
*Fix:* Add id='main-content' (and tabIndex=-1) to the <main> element in the shared page shells/layouts (app/stats/_components.tsx and the other segment shells), rather than per-page, so all 124 routes get a live target from a handful of edits.

**Route error boundaries are a duplicated casino-red skin: every error.tsx is built entirely from banned default-Tailwind red-100/200/300/800/900/950 utilities instead of the brand alert token (#FF6470) / eclipse chrome that the sibling SourceError 'dark' variant already provides. A runtime error — a high-trust moment — renders a red 'casino' panel that violates the WIN=orbital-cyan / LOSS=alert doctrine. The deep list named 'casino/default-Tailwind colors' generically, but did not identify error boundaries as a systematically wrong, copy-pasted surface class.**  
*Scope:* All 6 error.tsx files: app/error.tsx (global), app/stats/error.tsx, app/players/error.tsx, app/intelligence/error.tsx, app/fantasy/error.tsx, app/cockpit/error.tsx. Same red-* pattern in ancillary alerts: subscribe-button, manage-subscription-button, waitlist-form, source-error paper variant.  
*Fix:* Create one shared <ErrorSurface> (reuse SourceError 'dark' variant) styled with the alert token + eclipse chrome; have all 6 error.tsx re-export it. Delete the inline red-* markup so the casino-red skin cannot be re-copied.

**Officially-deprecated warm-gold hex #E0A800 (removed from the system per design-tokens.css lines ~107-118, superseded by caution #FFB454) is reintroduced as a raw hardcoded value for 'illustrative'/PENDING/licensed/watchlist states — reading as casino-gold on trust/accountability surfaces. This is a token-REGRESSION pattern (a value the design system explicitly deleted, resurrected as ad-hoc hex), plus a broader family of off-palette grays (#9fb3c8, #6b7785, #7b8794) and casino-adjacent reds (rgba(255,45,45), #ff5a5a) that bypass the token map entirely.**  
*Scope:* 12 files hardcode #E0A800: components/human/human-performance-panel, integrations/projections-badge, fantasy/sleeper-connect, fantasy/studio-host, fantasy/draft-assistant, fantasy/gm-academy, fantasy/gm-ledger-view, fantasy/league-twin-galaxy, fantasy/bestball-board, airwave/pundit-ledger, plus lib/fantasy/league-twin.ts and lib/cockpit/mission-control.ts. Additional off-palette hex/rgba in sleeper-connect, studio-host, trade-analyzer (ion-magenta as LOSS).  
*Fix:* Replace #E0A800 with the caution token (#FFB454) and the off-palette grays with ion-3/ion-2; run the design-tokens skill to extract remaining raw hex. Add a lint/CI check that fails on any hardcoded hex not present in the token map (especially the deleted #E0A800), preventing resurrection of retired tokens.

**Inconsistent modal / dialog a11y: components sharing role='dialog' diverge in their accessibility contract. montage-entrance.tsx (homepage cold-open) sets role='dialog' (line 156) but omits aria-modal, focus management, and body-scroll-lock — while sibling entrances (cinematic-entrance, enter-gate) and command-palette implement all three. page-explainer.tsx sets role='dialog' aria-modal='true' but only focuses the close button with no Tab focus-trap, so Tab escapes to the page behind. Related: motion components handle prefers-reduced-motion unevenly (voice-waveform keeps a 60fps rAF loop redrawing a static frame; observatory-beacon's scroll-to-top never appears under reduced-motion, removing the control entirely).**  
*Scope:* 6 role='dialog' components (montage-entrance, page-explainer inconsistent; cinematic-entrance, enter-gate, command-palette, evidence-audit-drawer correct). 9 motion components handle reduced-motion, at least 2 incorrectly (voice-waveform, observatory-beacon).  
*Fix:* Standardize on one useModal/FocusTrap primitive (aria-modal='true' + focus trap + scroll-lock + Escape) and apply it to montage-entrance and page-explainer. For motion: gate rAF loops behind prefers-reduced-motion and ensure reduced-motion users still get the final visible state of any control (observatory-beacon), not a hidden one.

## 9. Responsive & Performance — systemic patterns

_Not launch-ready on mobile. Across 42 findings (14 responsive-medium/high, plus a cluster of perf regressions), the app systematically fails two things phones need: it hides core numbers on small screens and it makes the primary actions un-tappable. The dense "board/ledger/fantasy" surfaces — props-edge, bet-tracker, dfs-optimizer, draft-assistant, bestball-board, trade-analyzer, signal-preview-queue, the ledger and pricing tables — either drop the edge/side/EV data (`hidden md:block` with no mobile equivalent) or pack the settle/draft/pin/give buttons into 18–28px targets, so the product's actual job (read the edge, log the bet) breaks at 360px. On CWV, the homepage/hero stack works against LCP and INP: the LCP `<h1>` starts at opacity:0 behind hydration (reveal.tsx), hero imagery is raw lazy `<img>` (generated-plate, film-room), a full-screen WebGL/rAF shader and always-on infinite gradients run during the LCP window, and four heavy below-fold `use client` showcases ship in first-load JS. None of these are one-off; they're the same 4–5 mistakes repeated across ~15 files._

**Core data hidden on mobile with no replacement — edge/side/EV/CI columns use `hidden ... sm:block` / `hidden ... md:block`, so phone users lose the actual signal, not chrome. props-edge.tsx even hides the primary pick+conviction column (side + edge bar) at line 134, not just the 'Best alt' at line 143. The ledger stacks Market/selection, Result and Snapshot as unlabeled lines because their headers are `hidden md:block`.**  
*Scope:* 4 files: components/fantasy/props-edge.tsx:134,143 · components/performance/calibration-panel.tsx:114 · app/ledger/page.tsx:190,192 (header/data column mismatch + missing labels)  
*Fix:* Never hide information columns behind a breakpoint — hide only decorative chrome. For each mobile-hidden data cell, render an inline labeled variant in the mobile stacked layout (e.g. a `sm:hidden` line showing 'Edge 6% · Best alt 4.5 @ 1.8× · EV +0.12'), and add a base `grid-cols` template so header and data stay column-aligned rather than collapsing to an anonymous 1-col stack.

**Primary action controls below the 44×44px touch minimum — settle/draft/gone/pin/fade/give-get/remove buttons and sort/search/select controls all use `px-1`/`px-2 py-0.5`/`text-[10px]`/`text-[11px]`/`min-h-[36px]`, yielding ~16–30px targets, and they sit adjacent so mis-taps are guaranteed. These are the ledger's and fantasy tools' main verbs, not secondary chrome.**  
*Scope:* 9 files: components/tracker/bet-tracker.tsx:145,165 · components/ui/data-table.tsx:238,292 · components/fantasy/dfs-optimizer.tsx:201 · components/fantasy/bestball-board.tsx:138 · components/fantasy/draft-assistant.tsx:149 · components/fantasy/trade-analyzer.tsx:87 · components/ui/mobile-nav.tsx:154 (40×40 trigger)  
*Fix:* Add one shared touch-target primitive (min-h-11 min-w-11 / `min-h-[44px]` with adequate padding and an 8px gap between adjacent actions) and apply it to every button/link/icon-button and form control; put the tap padding on the interactive element itself, not the parent `<th>`/`<td>`. Bump the mobile-nav trigger and all `min-h-[36px]` filters to 44px.

**Dense boards/tables with no mobile collapse and no overflow-x wrapper — fixed-px grid templates and multi-column grids stay rigid on phones, so rows either clip data off-screen or squeeze the name column to nothing. Signal-preview-queue uses fixed px columns ('44px 60px 1fr 80px 90px 90px 110px') with no wrapper; pricing's 5-col table is `w-full` with no `min-w` inside its overflow-x-auto so it cramps instead of scrolling; fantasy `grid-cols-[1fr_auto_auto]` boards force the action cluster and crush the 1fr name at 360px.**  
*Scope:* 6 files: components/hero/signal-preview-queue.tsx:179 · app/pricing/page.tsx:357 · components/fantasy/dfs-optimizer.tsx:95,192 · components/fantasy/draft-assistant.tsx:149 · components/fantasy/bestball-board.tsx:138 · app/stats/compare/page.tsx:20 (fixed 3-track grid, no single-col fallback)  
*Fix:* Two-part rule: (1) wrap every dense grid/table in `overflow-x-auto` AND give the inner track a `min-w-[640px]` so it horizontally scrolls intact instead of collapsing; OR (2) provide a real mobile card layout via a base single-column grid that only expands at `md:`. Give control bars `flex-wrap` with width-constrained range inputs and drop `ml-auto` stranding on narrow screens.

**LCP/CWV self-sabotage in the hero stack — the largest element and above-fold imagery are actively deprioritized while GPU-heavy motion runs in the LCP/INP window. Reveal wraps the hero `<h1>` at opacity:0 so LCP can't paint until hydration + IntersectionObserver; hero images are raw `<img loading="lazy">` (no next/image, no priority, no width/height → also CLS); a full-screen WebGL fragment shader and always-on infinite gradient animations run unthrottled on every device.**  
*Scope:* 6 files: components/motion/reveal.tsx:118 (opacity:0 on LCP h1) · components/immersive/generated-plate.tsx:51 (raw lazy img, no next/image, no dimensions → LCP+CLS) · components/academy/film-room.tsx:52 · components/cards/player-card.tsx:65 · components/hero/signal-core-environment.tsx:326 (rAF shader) · components/motion/sentient-weather.tsx:84 (infinite gradient)  
*Fix:* Exempt above-the-fold content from Reveal (render hero h1/subhead statically; only reveal below-fold). Convert every hero/key-art `<img>` to next/image with explicit width/height (or aspect-ratio) and `priority` on the LCP image — this fixes both LCP deprioritization and CLS in one move. Gate the WebGL shader and infinite animations behind IntersectionObserver + a JS `prefers-reduced-motion` check and pause them until after first paint, rather than relying only on the global CSS reduced-motion reset.

**Needless client JS shipped eagerly / duplicated font faces inflate first-load — heavy below-fold `use client` showcases and canvas components are statically imported (shipping in first-load JS), static-only components carry a client boundary, per-card pointer-rAF wrappers mount on paint, and the same font family+weights are declared twice.**  
*Scope:* 7 files: app/intelligence/page.tsx:282 (4 eager showcases; a `-lazy` wrapper pattern already exists for the 3D hero but isn't applied here) · app/deck/page.tsx:219 (eager VoiceWaveform canvas) · components/motion/sentient-weather.tsx:1 (static-only 'use client') · components/pricing/pricing-plans.tsx:70 (HoloTilt per card) · components/fantasy/fantasy-shell.tsx:29 (always-on Atmosphere) · app/layout.tsx:26 (Exo_2 ×2, JetBrains_Mono ×2 → duplicate @font-face sets)  
*Fix:* Reuse the existing `*-lazy` next/dynamic pattern for all below-fold client showcases/canvas (SignalCourtroom, AgentWarRoom, DecisionAutopsy, ReasoningShowcase, VoiceWaveform). Drop `use client` from purely-static components (sentient-weather). Consolidate the two Exo_2 and two JetBrains_Mono next/font calls into one instance each, wiring both CSS vars to the single instance so the family+weights are fetched and declared once.

**Overlays/dialogs without focus trap or backdrop, and edge-positioned nowrap labels that can push horizontal scroll — the mobile menu, entry gate, and enter-gate dialogs lock body scroll but let Tab escape to the page behind them, and the mobile menu has no backdrop so underlying content stays clickable; absolutely-positioned `whitespace-nowrap` hero labels can overflow at narrow widths.**  
*Scope:* 4 files: components/ui/mobile-nav.tsx:152 · components/hero/enter-gate.tsx:79 · components/hero/consensus-engine-3d.tsx:272 (nowrap projected labels) · components/home/annotated-sample-signal.tsx:65 (grid only collapses at ≤1024px, squeezed on 1025–1200px tablets)  
*Fix:* Add a shared focus-trap + backdrop for the mobile menu and full-screen dialogs (trap Tab within the panel, render a click-catching backdrop, restore focus to the trigger on close — Escape handling already exists in mobile-nav). Ensure hero containers that hold absolutely-positioned nowrap labels have `overflow-hidden`/clipping, and add an intermediate breakpoint so the anatomy grid collapses before tablet widths crush it.

## 10. Confirmed breadth findings (89 verified — accessibility & design-system)

#### accessibility — 48 (3C·20H·21M·4L)

- 🔴 `components/human/human-performance-panel.tsx:74` — The public /human panel renders nearly all of its labels, meta, source notes, driver weights and provenance text in text-ink-500 (#3D4555) and text-ink-600 (#2E3849) on the dark surface-card, which fail WCAG AA badly.
- 🔴 `components/fantasy/gm-ledger-view.tsx:35` — GM Ledger content labels use text-ink-500 (#3D4555, 1.94:1) and text-ink-600 (#2E3849, 1.58:1) as small body text on surface-card — both catastrophically below WCAG AA. 9 ink-500 + 9 ink-600 instances in this file alone (e.g. lines 35, 40, 
- 🔴 `components/players/player-lab-table.tsx:89` — On the dark players page the tables render invisible player/team/position text: page.tsx passes variant="dark", so TABLE_TOKENS.dark applies text-ion-white/ion-1/ion-2 to cells — but the underlying DataTable is hardwired to a light paper su
- 🟠 `components/integrations/projections-badge.tsx:35` — The projections-status caption (freshness/attribution + the 'a licensed source is founder-gated' text) uses text-ink-500 (#3D4555), which is ~1.94:1 on the badge/card background — far below WCAG AA 4.5:1 for small text.
- 🟠 `components/fantasy/props-edge.tsx:89` — Pick'em Edge uses text-ink-600 (#2E3849, 1.58:1) and text-ink-500 (#3D4555, 1.94:1) for real explanatory text (the 'combined probability' math note, entry captions, best-alt labels), failing WCAG AA badly.
- 🟠 `components/tracker/bet-tracker.tsx:68` — Body/meta text uses text-ink-500 and text-ink-600 (dark ink ramp) on the dark surface-card (eclipse #171228), producing sub-2:1 contrast — effectively invisible text.
- 🟠 `components/parlay/parlay-genome.tsx:28` — Pervasive text-ink-500 labels on the dark surface-card fail contrast; the entire ParlayGenome uses the light-scale ink ramp on a dark panel.
- 🟠 `components/players/player-lab-table.tsx:138` — On the public /players page (rendered bg-carbon, variant='dark' per app/players/page.tsx:123,175) the signed/signal cells hardcode text-emerald-700 / text-rose-700 regardless of variant, producing casino green/red that FAILS WCAG AA on the 
- 🟠 `components/players/player-lab-table.tsx:138` — The good/bad tone in the public /players lab table hardcodes text-emerald-700 / text-rose-700 regardless of variant, so on the dark (variant="dark") board they render as low-contrast light-mode inks on carbon.
- 🟠 `components/tracker/staking-calculator.tsx:26` — Staking calculator labels use text-ink-500 (#3D4555) and text-ink-400 (#5E6878) on the dark surface-card, both below WCAG AA.
- 🟠 `components/airwave/pundit-ledger.tsx:87` — text-ink-500 (#3D4555) is used pervasively for meaningful text on the surface-card (eclipse) background, computing to ~1.89:1 — far below WCAG AA 4.5:1 for small text.
- 🟠 `components/news/the-beat.tsx:42` — text-ink-600 (#2E3849) and text-ink-500 (#3D4555) label real, meaningful controls/data on the carbon background, computing to 1.60:1 and 1.97:1 — extreme WCAG AA failures.
- 🟠 `components/integrations/projections-badge.tsx:35` — The projections-status badge detail text ('— a licensed source is founder-gated' / freshness · attribution) uses text-ink-500, failing contrast; it is the honest live-vs-illustrative context shown in every FantasyShell hero.
- 🟠 `components/fantasy/lineup-optimizer.tsx:83` — The bench 'tap to mark out' buttons — the core interaction of the Start-Sit tool — use focus-visible:outline-none with no replacement, leaving keyboard users with no visible focus indicator. WCAG 2.4.7.
- 🟠 `components/intelligence/reasoning-showcase.tsx:72` — The step counter uses text-ink-500 (a dark-ramp gray) on the dark surface-card, far below WCAG AA.
- 🟠 `components/ui/footer.tsx:82` — The '{BRAND_NAME} is a {GSN_NAME} production.' credit line uses text-ink-500 on the dark footer, failing WCAG AA badly.
- 🟠 `components/ui/command-palette.tsx:139` — Command-palette group headings, the 'No matches.' message, the input placeholder, and the 'esc' kbd all use text-ink-500/text-ink-600 on the eclipse surface-card, far below WCAG AA.
- 🟠 `components/tracker/staking-calculator.tsx:26` — text-ink-500 / text-ink-600 labels on the dark surface-card fail WCAG contrast.
- 🟠 `components/trust-ledger/proof-of-record.tsx:46` — Numerous text-ink-500 / text-ink-600 labels on the dark surface-card are illegible.
- 🟠 `components/tracker/staking-calculator.tsx:75` — Stat labels and input suffixes use text-ink-600 (#2E3849), which is near-invisible on the dark surface — a severe contrast failure on a public Elite tool (/track).
- 🟠 `app/intelligence/engines/registry.tsx:117` — The public Intelligence Engines page renders explanatory copy in text-emerald-700 (#047857 = 3.45:1) and text-rose-700 (#BE123C = 3.01:1) on the dark bg-carbon (#0D1117) surface — both fail WCAG 2.2 AA for normal-size text (need 4.5:1), and
- 🟠 `components/ui/footer.tsx:82` — The footer's 'is a Galaxy Sports Network production' line uses text-ink-500 (#3D4555) = 1.97:1 on carbon — a severe WCAG 2.2 AA failure. text-ink-500 is reused as small text on 53 public files (e.g. not-found.tsx:67, pricing, ledger, terms,
- 🟠 `components/fantasy/sleeper-connect.tsx:145` — The Sleeper connect flow uses text-ink-400 for form field labels and text-ink-500 for the 'Pick a league' heading and league metadata, all below AA on the surface-card background.
- 🟡 `components/human/human-performance-panel.tsx:150` — Form field labels and empty/loading states on the public availability tool use text-ink-400 (#5E6878), which fails AA on the dark card.
- 🟡 `components/fantasy/optimizer-workspace.tsx:54` — The contest-type tabs (Classic DFS / Start-Sit / Draft) — the primary control on /optimizer — set focus-visible:outline-none with no focus replacement (no ring/shadow), so keyboard focus is invisible. WCAG 2.4.7 failure.
- 🟡 `app/intelligence/engines/registry.tsx:118` — Engine explainer definitions embed on-light / darkened accent spans (text-orbital-cyan-on-light, text-emerald-700, text-rose-700) that the engines page renders inside a dark-variant MetricExplainer (bg-eclipse #171228), failing WCAG AA.
- 🟡 `app/stats/_components.tsx:5` — The stats Shell's <main> has no id="main-content", so the global "Skip to content" link is broken on every page in the cluster.
- 🟡 `components/hero/enter-gate.tsx:152` — Primary "Enter the engine" CTA sets focus-visible:outline-none with no real focus replacement; the only ring (gse-enter-ring) is aria-hidden, always-animating (not focus-bound), and is forced to opacity:0 under prefers-reduced-motion.
- 🟡 `components/parlay/parlay-genome.tsx:90` — Primary interactive controls remove the focus outline with focus-visible:outline-none and provide no visible replacement, so keyboard focus is invisible (WCAG 2.4.7).
- 🟡 `components/trust-ledger/proof-of-record.tsx:60` — The Intact / Tamper toggle buttons remove focus-visible outline with no replacement indicator — keyboard users cannot see which toggle is focused.
- 🟡 `components/picks/evidence-audit-drawer.tsx:429` — Death-clock and fragility footnotes use text-ink-400 (light-scale) on the dark obsidian drawer, failing small-text contrast.
- 🟡 `components/fantasy/gm-ledger-view.tsx:54` — The Process × Outcome 2×2 matrix's axis labels ('Outcome hit', 'Outcome miss', 'Good process', 'Poor process') use text-ink-600 (#2E3849) on the eclipse surface-card — 1.54:1, far below WCAG AA — making the matrix's entire meaning illegible
- 🟡 `app/intelligence/engines/registry.tsx:117` — The emerald-700/rose-700 inline highlight text in engine descriptions fails WCAG AA on the dark hero it actually renders on.
- 🟡 `components/tracker/staking-calculator.tsx:64` — The numeric text inputs remove the focus outline (outline-none) with no replacement focus indicator, so keyboard users cannot see which field is focused on this public staking tool.
- 🟡 `app/layout.tsx:225` — The global 'Skip to content' link targets #main-content, but 117 of 124 public pages never define id="main-content", so the bypass-blocks link is dead on nearly every route.
- 🟡 `app/intelligence/engines/registry.tsx:117` — Buy/sell and metric-definition callouts use text-emerald-700 / text-rose-700 as small semibold text on the dark engines page, failing AA contrast.
- 🟡 `components/integrations/projections-badge.tsx:36` — The projections status badge on /launch renders its detail/attribution text in text-ink-500 (#3D4555), which is effectively invisible on the dark page, and uses an ad-hoc hex #E0A800 instead of a brand token.
- 🟡 `components/gsn/transmission.tsx:63` — The GSN summary-count buttons and the segment accordion buttons remove the focus ring with focus-visible:outline-none but add no visible replacement, so keyboard focus is invisible on /gsn.
- 🟡 `components/academy/film-room.tsx:128` — The 'in production' badge on Film Room episode cards uses text-ink-400 (#5E6878), which on the surface-card (eclipse) background is ~3.23:1 — below WCAG AA 4.5:1 for small text.
- 🟡 `components/intelligence/reasoning-showcase.tsx:77` — The play/pause button and step-rail buttons remove the focus outline with focus-visible:outline-none and provide no visible focus replacement, so keyboard focus is invisible.
- 🟡 `components/fantasy/dfs-optimizer.tsx:88` — Interactive controls remove the keyboard focus ring with focus-visible:outline-none and provide no replacement, so keyboard users get no visible focus — a systemic pattern across the cluster (fantasy toggles, bias-mirror/war-room/reasoning-
- 🟡 `components/explainers/page-explainer.tsx:96` — The 'How this page works' guide is role=dialog aria-modal=true but implements no focus trap; Tab moves focus out of the modal to the page behind it (only Escape/Arrow keys and initial focus are handled), failing modal keyboard-containment e
- 🟡 `components/pricing/tier-gate-panel.tsx:107` — The paywall's trust microcopy 'founding rate · locked for life · 7-day refund window' uses text-ink-500 (#3D4555) on the panel's ~#08090C background = 2.07:1, far below AA for this 10px uppercase text.
- 🟡 `components/ui/footer.tsx:82` — Site-wide footer 'is a GSN production' line uses text-ink-500 (#3D4555) on the dark footer, failing AA on every page.
- ⚪ `components/airwave/pundit-ledger.tsx:90` — The leaderboard uses role='tablist'/role='tab' and the detail uses role='tabpanel', but the tabs are not associated with the panel (no id / aria-controls), so assistive tech cannot follow the tab-to-panel relationship, and arrow-key tab sem
- ⚪ `components/motion/observatory-beacon.tsx:22` — Under prefers-reduced-motion the scroll-to-top button never becomes visible or usable, so reduced-motion users lose the 'Return to Observatory' control entirely rather than just its animation.
- ⚪ `components/landing/montage-entrance.tsx:147` — The homepage's live cold-open is a full-screen role=dialog but has no aria-modal, no focus management, and never locks body scroll — unlike the sibling entrances which do all three.
- ⚪ `components/war-room/agent-war-room.tsx:128` — Each agent's alert level is conveyed by a colored dot (aria-hidden) and colored label text; the redundant text-only level word that would make it non-color-dependent (LEVEL_LABEL) is rendered in text-ink-600 (#2E3849 = 1.54:1) and is invisi

#### design-system — 32 (0C·3H·4M·25L)

- 🟠 `app/intelligence/engines/registry.tsx:117` — Engine hero/explainer copy hardcodes buy-low=text-emerald-700 (green) and sell-high=text-rose-700 (red) inline — casino green/red as WIN/LOSS semantics across every engine description; 17 banned-color hits in this public registry.
- 🟠 `components/fantasy/lineup-optimizer.tsx:78` — Token-system drift between sibling optimizer components: lineup-optimizer, trade-analyzer, waiver-board, props-edge, scheme-intel, gm-ledger-view use the AA-failing ink-* ramp for text, while dfs-optimizer and studio-host use the AA-passing
- 🟠 `components/human/human-performance-panel.tsx:24` — Provenance/verdict/status colors use ad-hoc hex outside the token system — #E0A800 (amber/gold), #9fb3c8, #6b7785 — where a sanctioned token exists (caution #FFB454 for licensed/watchlist, ion-3 for muted), and heavy text-ink-500/600 makes 
- 🟡 `app/fantasy/error.tsx:51` — The Fantasy error boundary is built entirely from banned default-Tailwind casino-red utilities (red-900/red-950/red-200/red-800/red-100), violating the trust-surface color doctrine that LOSS/alert states must use the alert token #FF6470, no
- 🟡 `app/intelligence/error.tsx:52` — The intelligence error boundary is styled entirely in banned default red-* Tailwind utilities (casino red) on a trust surface, instead of the brand alert token / eclipse chrome the sibling SourceError 'dark' variant already uses.
- 🟡 `components/ui/billing-notice-banner.tsx:41` — The billing banner (rendered on the public /dashboard) is built entirely from banned default-Tailwind amber utilities, the exact warm gold the system deprecated and removed.
- 🟡 `app/error.tsx:41` — The global error boundary (and the four route-level error.tsx files) are styled entirely in off-brand casino red-100/200/800/900/950 instead of the brand `alert` token, so any runtime error shows a red casino-styled panel rather than the on
- ⚪ `components/tracker/staking-calculator.tsx:40` — Kelly-fraction range slider uses accent-cyan-400 — the exact banned default Tailwind color the brand doctrine prohibits on trust surfaces.
- ⚪ `app/error.tsx:41` — The global error boundary — a trust surface — is built entirely from banned default Tailwind red-* utilities (casino red), violating 'brand tokens only' and the WIN=cyan/LOSS=alert(#FF6470) semantic system.
- ⚪ `components/fantasy/waiver-board.tsx:44` — The FAAB range input uses the banned default-Tailwind utility className='accent-cyan-400' instead of a brand token (accent-orbital-cyan / accent-ion-blue). cyan-400 (#22d3ee) is not a brand color.
- ⚪ `app/players/error.tsx:52` — The Player Lab error boundary is built entirely from casino-red default-Tailwind utilities and raw white, not brand tokens — a hard violation on a trust surface.
- ⚪ `app/stats/error.tsx:50` — The /stats segment error boundary is built entirely from banned casino-red Tailwind default utilities (red-900/950/800/200/100) instead of the brand alert token, violating the one-product trust palette.
- ⚪ `app/error.tsx:41` — Global + per-route error boundaries share a casino-red skin (border-red-900 / bg-red-950 / text-red-200) built entirely from banned default-Tailwind red utilities instead of the alert token; the pattern is duplicated across 6 public error s
- ⚪ `components/human/human-performance-panel.tsx:21` — The public Human Performance panel uses several ad-hoc hex colors instead of brand tokens for provenance tiers and verdicts, including a non-brand gold and two off-palette grays.
- ⚪ `components/pricing/subscribe-button.tsx:93` — Checkout error alert (imported by public /pricing) uses banned default Tailwind red (border-red-800/60 bg-red-950/40 text-red-300).
- ⚪ `components/airwave/pundit-ledger.tsx:24` — PENDING verdict uses an ad-hoc hex #E0A800 (amber/gold), which is not a brand token and reads as casino-gold on a trust/accountability surface.
- ⚪ `components/fantasy/sleeper-connect.tsx:20` — Ad-hoc non-token hex values are hardcoded for position and connector-status colors on a public page (POS_HEX and STATUS_HEX), including a warm gold #E0A800 and steel #9fb3c8 that are outside the verified token map.
- ⚪ `components/integrations/projections-badge.tsx:28` — The 'illustrative' projections state uses an ad-hoc amber hex #E0A800 rather than the sanctioned caution token, drifting from the one-product color system on a surface shown in every fantasy tool hero.
- ⚪ `components/fantasy/gm-ledger-view.tsx:22` — Ad-hoc / deprecated hex values used instead of brand tokens: #E0A800 (warm amber/gold — explicitly removed from the system per design-tokens.css lines 107-118) and #7b8794 (off-palette gray) for the 'got-lucky'/'deserved' quadrants.
- ⚪ `components/fantasy/trade-analyzer.tsx:60` — WIN/LOSS semantics drift: ion-magenta (#FF38C7) is used as the universal LOSS/negative color ('you lose', floor, miss, fade, under, down-trend) across the cluster, but brand doctrine maps LOSS = alert (#FF6470); magenta is the secondary-ene
- ⚪ `components/fantasy/studio-host.tsx:49` — The broadcast 'Live' badge uses raw red rgba(255,45,45,0.18) background and #ff5a5a text — an ad-hoc casino-adjacent red that is not a brand token, on a trust/broadcast surface.
- ⚪ `components/ui/source-error.tsx:30` — The shared honest-empty/error state's paper variant kicker uses banned text-rose-700 instead of a brand alert-on-light token.
- ⚪ `app/stats/error.tsx:50` — The stats error boundary is built entirely from banned default-Tailwind casino-red utilities instead of brand tokens, diverging from the LOSS=alert (#FF6470) semantic and the rest of the stats surface.
- ⚪ `components/ui/manage-subscription-button.tsx:69` — The billing error message uses the banned default-Tailwind red utility text-red-400 instead of the brand LOSS/alert token.
- ⚪ `components/tracker/staking-calculator.tsx:40` — Range slider uses banned default Tailwind color utility accent-cyan-400 (#22D3EE) instead of the brand orbital-cyan token.
- ⚪ `components/gsn/waitlist-form.tsx:145` — Success and validation-error states use banned default Tailwind colors (border/bg-emerald-950/700 + text-emerald-200 for success; border/bg/text-red-* for errors) instead of brand verify (#5FD9A3) / alert (#FF6470) tokens.
- ⚪ `components/pricing/subscribe-button.tsx:93` — Checkout error alert on the primary conversion surface uses banned default palette (border-red-800/60 bg-red-950/40 text-red-300) instead of the brand alert token.
- ⚪ `components/gsn/waitlist-form.tsx:145` — The waitlist form's success and error states use banned default casino colors (emerald-700/200/950 for success, red-700/300/950 for error) instead of the brand verify/alert tokens.
- ⚪ `components/intelligence/engine-view.tsx:716` — Waiver-trends adds/drops cell hardcodes text-emerald-700 (adds) / text-rose-700 (drops) — banned casino green/red on the paper data surface.
- ⚪ `components/ui/billing-notice-banner.tsx:41` — Billing notice banner uses banned amber-* default utilities (border-amber-700, bg-amber-950, text-amber-200/100) instead of the sanctioned caution token, which is the only approved warm warning hue.
- ⚪ `components/pricing/subscribe-button.tsx:93` — Checkout error message on the pricing/subscribe path uses banned red-* default utilities instead of the alert token.
- ⚪ `components/gsn/waitlist-form.tsx:145` — Waitlist form success and error states use banned emerald-* / red-* default utilities (emerald for success, red for validation errors) instead of verify/alert brand tokens.

#### performance — 3 (0C·0H·1M·2L)

- 🟡 `app/preview/[sport]/[slug]/page.tsx:162` — JSON-LD is injected with next/script tags inside the body instead of a plain <script>, which Next defers/hydrates and can strip or delay for crawlers.
- ⚪ `components/immersive/generated-plate.tsx:51` — The hero background plate uses a raw <img> with no width/height and lazy loading, on the homepage and /house hero, risking CLS and an unoptimized LCP-region image.
- ⚪ `components/motion/voice-waveform.tsx:96` — Canvas requestAnimationFrame loop runs forever even under prefers-reduced-motion; only the time counter is frozen, so it redraws an identical static frame ~60fps indefinitely.

#### responsive — 1 (0C·0H·1M·0L)

- 🟡 `components/fantasy/props-edge.tsx:134` — On mobile the core of the 'edge advisor' is hidden: the recommended side + conviction column (hidden sm:block) and the Best Alt column (hidden md:block) do not render below the sm/md breakpoints, so a phone user sees the line and 'our numbe

#### trust — 5 (0C·2H·3M·0L)

- 🟠 `components/fantasy/fantasy-shell.tsx:67` — The mandatory 'illustrative / not-live-projections' disclaimer note is rendered in text-ink-500 (#3D4555), which is effectively invisible on the dark shell background, so the brand-required 'labeled right where shown' disclosure is present 
- 🟠 `app/intelligence/engines/registry.tsx:117` — Engine descriptions use casino green/red (text-emerald-700 for buy-low/positive, text-rose-700 for sell-high/negative) as the WIN/LOSS-adjacent semantic on a public trust surface — banned default Tailwind colors, and the wrong semantic hue 
- 🟡 `components/fantasy/sleeper-connect.tsx:174` — The 'availability overlay: real injury status + game weather (never a body claim)' trust/scope disclaimer renders in text-ink-600 (#2E3849) at 10px, an essentially unreadable 1.5:1, hiding a claim-scope disclosure the brand doctrine require
- 🟡 `components/motion/ghost-jarvis.tsx:18` — GhostJarvis emits fabricated, specific betting-intelligence claims as ambient site chrome on every public page, with no data backing and no illustrative/sample label.
- 🟡 `components/slate-twin/galaxy-slate-twin.tsx:920` — The slate's data provenance disclosure (slate.dataNote) and the per-game 'illustrative' vs 'live' status are rendered in text-ink-500 (#3D4555 = 1.89:1) — the key 'is this real data?' signal is effectively invisible, undermining the disclos

#### plausible (not fully confirmed — treat as leads)

- 🟡 `lib/intelligence/colors.ts:23` — The shared paper-surface signal color helper emits banned casino green/red Tailwind default utilities (text-emerald-700, text-rose-700, bg-emerald-50, bg-rose-50) as the WIN/LOSS semantic on trust data surfaces, and these classes feed data-
- ⚪ `lib/intelligence/colors.ts:23` — Central color helper hardcodes banned casino green/red (text-emerald-700 / text-rose-700 / bg-emerald-50 / bg-rose-50) as the app's WIN/LOSS semantic system, contradicting the brand doctrine (WIN=orbital-cyan, LOSS=alert) and the correct re
- ⚪ `lib/intelligence/colors.ts:23` — The self-declared single-source-of-truth signal color module hardcodes banned casino-ramp Tailwind defaults: SIGNAL_GOOD_CLASS = 'text-emerald-700' and SIGNAL_BAD_CLASS = 'text-rose-700'. Every good/bad/buy-sell/hit-rate/lift signal across 
- ⚪ `components/fantasy/waiver-board.tsx:67` — Player trend is conveyed by a small color-coded ▲/—/▼ glyph with no text label or aria description; the up/down/flat state relies on color (cyan vs magenta vs gray) plus a tiny arrow, risking meaning-by-color-alone for low-vision users.
- ⚪ `app/intelligence/engines/registry.tsx:123` — The 'Board →' link in the collapsed More-engines cards is text-ultraviolet on a bg-eclipse card, below WCAG AA.
- ⚪ `components/cards/result-card.tsx:35` — WIN is colored with verify mint-green (#5FD9A3) here and in pick-card/proof-explorer/calibration-panel, but proof-of-record/bet-tracker/parlay-genome color WIN with orbital-cyan — WIN semantics are inconsistent across sibling data surfaces,
- ⚪ `components/cards/result-card.tsx:35` — The shareable settled-pick receipt colors WIN as text-verify (mint #5FD9A3) instead of the doctrine's WIN=orbital-cyan, so the flagship 'receipt' surface uses the wrong semantic hue for a win.
- ⚪ `components/picks/pick-card.tsx:465` — WIN/LOSS semantics diverge from the brand doctrine and from the rest of the product. ResultBadge and TierBadge paint WIN with text-verify (mint green #5FD9A3), while winRateToneClass (lib/format/stat.ts) correctly paints a winning rate with

## 11. Responsive & Performance findings (42)

#### performance — 16 (0C·1H·5M·10L)

- 🟠 `components/motion/reveal.tsx:118` — Reveal wraps the hero LCP <h1> and starts at opacity:0, so the largest-text LCP element only paints after hydration + IntersectionObserver fires.
- 🟡 `components/immersive/generated-plate.tsx:51` — The full-bleed hero background still is a raw <img loading="lazy"> (not next/image, no priority/fetchpriority), so the LCP-candidate hero imagery is deliberately deprioritized by the browser.
- 🟡 `components/hero/signal-core-environment.tsx:326` — A full-screen WebGL fragment shader runs an unthrottled requestAnimationFrame loop behind the hero on every device, burning GPU/CPU during the most LCP/INP-sensitive window.
- 🟡 `app/intelligence/page.tsx:282` — Four heavy interactive 'use client' showcase components (SignalCourtroom, AgentWarRoom, DecisionAutopsy, ReasoningShowcase) are imported eagerly and ship in the route's first-load JS even though all sit well below the fold.
- 🟡 `app/layout.tsx:26` — Exo 2 is instantiated twice via next/font/google (archFont weights 700/800/900 and displayFont weights 500/600/700/800), and JetBrains Mono is instantiated twice (monoFont and numeralsFont with identical config) — each next/font call emits its own @font-face set, so the same family/weights are fetched and declared more than once.
- 🟡 `components/immersive/generated-plate.tsx:51` — The decorative hero plate still is rendered with a raw <img> (eslint-disabled) instead of next/image, so it bypasses next/image AVIF conversion and responsive srcset even though next.config.mjs enables formats ['image/avif','image/webp'].
- ⚪ `components/motion/sentient-weather.tsx:1` — SentientWeather is marked 'use client' but renders only static gradients with no state/effects/handlers, shipping needless JS and a client boundary as the first node on the homepage.
- ⚪ `components/pricing/pricing-plans.tsx:70` — Every pricing card is wrapped in HoloTilt, a client component with per-card pointer/rAF listeners, eagerly mounted on first paint of the pricing page.
- ⚪ `components/motion/reveal.tsx:122` — Reveal sets `willChange: 'opacity, transform'` on every not-yet-revealed instance; pages in this cluster mount many at once (e.g. /intelligence ~15, /ledger ~8), creating a large batch of promoted compositor layers before anything scrolls.
- ⚪ `components/cards/player-card.tsx:65` — Optional Higgsfield plate uses a raw <img> (eslint-disabled) rather than next/image; if a card is ever used above the fold or as an OG hero, this is an unoptimized LCP image.
- ⚪ `components/fantasy/dfs-optimizer.tsx:38` — Generate runs the synchronous solver inside a bare `setTimeout(...,10)` on the main thread; for up to 20 lineups over a large imported DK slate this blocks the main thread and can cause jank/INP spikes with no yielding.
- ⚪ `components/fantasy/fantasy-shell.tsx:29` — Every fantasy tool page mounts `<Atmosphere />` plus the shell's blurred radial-gradient hero; combined with per-tool infinite-animation decorations this ships continuous background animation above the fold on mobile.
- ⚪ `components/immersive/generated-plate.tsx:51` — The hero <img> has no width/height/aspect-ratio attributes; it relies entirely on the positioned parent for size.
- ⚪ `components/academy/film-room.tsx:52` — Film Room key-art hero uses a raw <img src="/academy/film/key-art.jpg"> (eslint-disabled) instead of next/image, bypassing AVIF/WebP conversion and responsive sizing for an above-the-fold hero on /academy.
- ⚪ `components/motion/sentient-weather.tsx:84` — SentientWeather (mounted on the homepage as a fixed full-viewport layer) runs an always-on infinite `sentient-breathe` radial-gradient animation with no component-level prefers-reduced-motion guard; it relies solely on the global CSS reduced-motion reset in globals.css.
- ⚪ `app/deck/page.tsx:219` — The /deck page eagerly imports the raw canvas component VoiceWaveform (not via next/dynamic), so its client JS and a requestAnimationFrame draw loop ship and mount on initial load even though the waveform sits below the fold.

#### responsive — 26 (0C·2H·14M·10L)

- 🟠 `components/tracker/bet-tracker.tsx:165` — Settle win/loss/push buttons are px-2 py-0.5 text-[10px] (~18-20px tall), the core action of the ledger, tightly packed in a wrapping flex.
- 🟠 `components/fantasy/props-edge.tsx:143` — The 'Best alt' column (alt line, multiplier, EV) is hidden below md via `hidden ... md:block`, removing core edge information on phones and small tablets.
- 🟡 `components/tracker/bet-tracker.tsx:145` — Row remove control is a bare 'x' with px-1 and no min size (~16-20px tap area).
- 🟡 `components/ui/data-table.tsx:292` — Column-header sort <button> is inline with no min-height; padding lives on the <th> not the button, so the actual tap target is ~20px text height.
- 🟡 `components/fantasy/dfs-optimizer.tsx:192` — Slate rows pack a pos chip + name + salary + leverage + two icon buttons into one non-wrapping flex row with no min-width guard; at 360px the truncated name collapses to near-nothing and the pin/fade buttons crowd.
- 🟡 `app/pricing/page.tsx:357` — The 5-column tier comparison table is `w-full` with no `min-w`, so inside overflow-x-auto it cramps/wraps on mobile instead of scrolling, making dense cells nearly unreadable.
- 🟡 `components/ui/data-table.tsx:292` — Sortable column-header buttons have no min-height/min-width; the tap target is only the label text (~16-18px tall), far below 44x44px.
- 🟡 `app/stats/compare/page.tsx:20` — Player-compare form uses a fixed 3-track grid `grid-cols-[1fr_1fr_auto]` (two text inputs + button) with no mobile single-column fallback.
- 🟡 `components/tracker/bet-tracker.tsx:85` — Log-a-bet form uses fixed w-16 / w-12 inputs and py-1.5 (~30px) fields inside a 2-column mobile grid with a col-span-2 matchup field.
- 🟡 `components/fantasy/dfs-optimizer.tsx:201` — Pin (★) and fade (✕) buttons use only `px-1 text-sm` giving roughly a 20x24px hit area — well under the 44x44px minimum touch target, and they sit adjacent to each other.
- 🟡 `components/fantasy/dfs-optimizer.tsx:95` — The controls bar keeps mode pills, QB-stack checkbox, a `type=range` slider, and the Generate button on one `flex-wrap` row; the range input has no width constraint and the Generate button uses `ml-auto`, causing an awkward stranded/overflowing layout on narrow screens.
- 🟡 `components/fantasy/draft-assistant.tsx:149` — The board rows use a `grid-cols-[1fr_auto_auto]` with two action buttons per row; at 360px the Draft+Gone buttons plus VOR/Tier column compress the 1fr name column and can force the row taller/awkward, and there is no overflow-x wrapper so the fixed action cluster is unavoidable.
- 🟡 `components/fantasy/bestball-board.tsx:138` — Same board-row pattern as draft-assistant: `grid-cols-[1fr_auto_auto]` with Draft/Gone buttons at `py-1 text-[11px]` (~28px tall) that are below the 44px touch minimum and squeeze the name column at 360px.
- 🟡 `components/fantasy/trade-analyzer.tsx:87` — Player-pool rows cram pos chip + name + value + two text buttons (Give/Get) at `text-[10px] px-1.5 py-0.5` into a single non-wrapping row; the Give/Get tap targets are tiny and the name truncates hard at 360px.
- 🟡 `components/hero/signal-preview-queue.tsx:179` — The scoring-queue board is a rigid 7-column grid (gridTemplateColumns: '44px 60px 1fr 80px 90px 90px 110px') with fixed px columns and no mobile collapse or overflow-x wrapper, so it overflows and clips data on small screens.
- 🟡 `app/ledger/page.tsx:192` — Settled-receipts rows use `grid gap-3` with a column template only at md: (`md:grid-cols-[1.1fr_0.8fr_auto_1.4fr]`), so on mobile the four <article> children collapse into a single implicit column while the header row above uses `grid-cols-[1fr_auto]` (two columns) — header and data no longer align, and the Market (selection) and Snapshot (snapshotSummary) values render stacked with no visible label (their headers are `hidden md:block`).
- ⚪ `components/ui/mobile-nav.tsx:152` — The mobile menu has no backdrop and no focus trap; it's an absolutely-positioned panel that leaves underlying content interactive and doesn't contain keyboard focus.
- ⚪ `app/ledger/page.tsx:190` — On mobile the settled-receipts rows stack all four fields as an unlabeled `grid gap-3` (no base grid-cols), and the column headers that would name them are `hidden md:block`, so Market/selection, Result, and Snapshot appear as anonymous stacked lines.
- ⚪ `components/ui/data-table.tsx:267` — Sticky thead uses top-0 with no offset; when the table scrolls inside a page that has a fixed/sticky top nav, the header can sit under the nav on short viewports.
- ⚪ `components/ui/data-table.tsx:238` — Search input and enum <select> filters are min-h-[36px], below the 44px touch minimum.
- ⚪ `components/performance/calibration-panel.tsx:114` — The 95% confidence-interval column is hidden below sm (hidden ... sm:inline-block), removing uncertainty data (not chrome) from the mobile reliability curve.
- ⚪ `components/fantasy/dfs-optimizer.tsx:170` — Exposure rows use a fixed `w-28` (112px) label column; at 320-360px this leaves little room for the bar and pushes the layout tight.
- ⚪ `components/hero/consensus-engine-3d.tsx:272` — Six projected DOM referee labels use whiteSpace:'nowrap' and are absolutely positioned by transform onto node screen coordinates; on narrow viewports labels near the edges overflow the hero and can push horizontal scroll if the parent ever lacks overflow clipping.
- ⚪ `components/hero/enter-gate.tsx:79` — The full-screen entry dialog is not focus-trapped: Tab can move focus to the page behind the sealed overlay even though body scroll is locked.
- ⚪ `components/home/annotated-sample-signal.tsx:65` — Three-column anatomy grid (minmax(0,1fr) minmax(0,1.4fr) minmax(0,1fr)) only collapses at max-width:1024px, so on tablets 1025-1200px the flanking callouts and center card are squeezed narrow.
- ⚪ `components/ui/mobile-nav.tsx:154` — The mobile menu trigger button is 40x40px (`.mobile-nav-trigger { width:40px; height:40px }`), below the 44x44px minimum recommended touch target.

## 12. Consolidated totals

| Pass | Findings | Crit | High | Med | Low |
|---|---|---|---|---|---|
| Deep + hand (Part I) | 92 | 3 | 24 | 46 | 19 |
| Breadth verified (confirmed+plausible) | 97 | 3 | 25 | 31 | 38 |
| Responsive + performance | 42 | 0 | 3 | 19 | 20 |

_Breadth pass rejected 13 findings on verification (weeded false positives). All contrast ratios above were independently recomputed by the verifier against the real rendered surface._
