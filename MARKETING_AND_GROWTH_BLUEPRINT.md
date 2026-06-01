# GSN — Marketing & Growth Blueprint

**Subject:** Galaxy Sports Edge (GSN / "Galaxy Sports Edge" customer-facing) — growth strategy to become the best sports-prediction website of 2026.
**Wedge:** *Win on proof, not promises.* Public calibration, a verifiable track record, and loss autopsies — the opposite of the tout playbook.
**Author:** growth-marketing strategist session, 2026-06-01.
**Evidence labels:** `verified` (read in this repo) · `inferred` (read from code, not run) · `recommended` · `speculative`.
**Hard constraint honored:** no code modified, no spend, no publishing. This file is the only artifact.

> Grounding read this session: `CLAUDE.md`; `COMPETITIVE_INTELLIGENCE.md`; `REPO_INTELLIGENCE_REPORT.md`; `apps/web/app/page.tsx`; `apps/web/app/{blog,methodology,about}/page.tsx`; `apps/web/app/vs/tout-services/page.tsx`; `apps/web/app/{sitemap,robots}.ts`; `apps/web/app/layout.tsx`; `apps/web/app/opengraph-image.tsx`; `apps/web/lib/brand.ts`; `social/launch-day.md`; `packages/db/prisma/schema.prisma` (`ContentDraft`, `ModelJournalEntry`, `BlogPost`, `LossAutopsy`, `Promotion`).

---

## 0. One-paragraph thesis

Per `COMPETITIVE_INTELLIGENCE.md` §0, the market is splitting into **venues** (sportsbooks + prediction markets) and **intelligence** (what's true). GSN must own the intelligence/trust layer. The marketing corollary: **GSN cannot out-shout DraftKings, Rithmm, or a thousand cappers — it must out-*prove* them.** Every dollar of attention should route to one of three compounding loops: (1) content→SEO→signup, (2) settled-record→shareable-proof→virality, (3) referral. The brand asset is the *receipt*, not the pick. `recommended` This is doubly forced by 2026 search reality: Google classifies gambling as YMYL "Financial Security" (highest E-E-A-T bar), and the **March 2026 core update penalized scaled/templated content with 60–90% ranking losses** ([digitalapplied](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban), [15m](https://15m.com/articles/the-future-of-gambling-seo-what-affiliates-and-webmasters-need-to-know/)). GSN's proprietary settled-pick data + named methodology is *exactly* the "data found nowhere else" + E-E-A-T that survives — if it's exposed as crawlable, structured, shareable pages. `verified-ext`

---

## 1. Positioning & messaging architecture

**1a. The narrative spine (proof, not promises).** Three pillars, each backed by a real surface that already exists `verified`:
- **"Graded in public."** → `/performance`, `/ledger` (settled canonical picks with original signal snapshot vs. outcome), `/observatory`, `/vault`. The public calibration curve is on the homepage (`apps/web/app/page.tsx` → `CalibrationBeat`).
- **"We post our losses."** → `LossAutopsy` model + `/performance/losses/[id]` + homepage `AutopsyBeat`. No competitor does this (`COMPETITIVE_INTELLIGENCE.md` §3).
- **"No number we can't back."** → the calibration report stays gated until n≥30 settled (`apps/web/app/page.tsx`, `social/launch-day.md` Round 2). Restraint *is* the message.

**1b. Brand voice (locked — do not drift).** `verified` from `apps/web/lib/brand.ts` + `social/launch-day.md`: *Calibrated. Precise. Always acquiring. Intelligence isn't loud — it's on frequency.* Closer: *We detect. You decide.* **Banned phrases (hard rule):** guaranteed profit/winning, lock of the day, free money, sure thing, **risk-free**. Substitute: *"confidence-rated signal."* Note: this banned-phrase list already aligns with the **AGA Responsible Marketing Code**, which explicitly prohibits "risk-free" and any messaging that gambling eliminates risk or solves financial problems ([AGA code](https://www.bettingusa.com/aga-responsible-marketing-code/)). The compliance posture is a *marketing asset*, not a tax.

**1c. Headline tension to resolve `recommended` (do not fix in code without approval).** Two taglines are live: homepage H1 *"Math you can read."* (`page.tsx`) vs. brand constant *"Find the signal before the market moves."* (`lib/brand.ts`, all of `social/`). Both are strong; the *brand constant* is wired into OG/Twitter/sitemap and should remain the canonical one-liner for distribution. Recommendation: keep "Math you can read" as the homepage hero art, but make the **meta title/OG** speak proof ("graded in public / we post our losses") so the *shared* unit sells the wedge, not a generic slogan. (See §11 — this is the top safe change.)

**1d. Audience segments & message-match.**
| Segment | Pain | GSN message | Surface |
|---|---|---|---|
| Burned tout customers | "I paid for a record that was fake" | "We can't delete a loss — it's in the ledger." | `/vs/tout-services`, `/performance/losses/*` |
| Sharp / +EV bettors | "Show me CLV, not vibes" | "Vig-free fair value + (roadmap) CLV vs. close." | `/methodology`, `/ledger` |
| Prediction-market traders (Kalshi/Polymarket) | "What's the fair probability?" | "Venue-agnostic fair-value engine." `recommended` | future `/fair-value` surface (`COMPETITIVE_INTELLIGENCE.md` §4) |
| Curious sports fans | "Is any of this real?" | "Watch it think, decline, and grade itself." | homepage `EngineCenterpiece` |

---

## 2. Channel portfolio (ranked by leverage for a bootstrap, proof-first brand)

**Priority tiers reflect cost, compounding, and fit with the proof wedge. `recommended` throughout.**

**P0 — Organic SEO (programmatic + editorial).** Highest compounding, lowest marginal cost, perfect fit. GSN already has the SEO bones: `sitemap.ts`, `robots.ts` (correctly disallows `/cockpit`, `/admin`, `/api`, `/auth`, `/dashboard`, `/brief` — `verified`), JSON-LD on layout/pricing/faq, per-page metadata on ~32 pages (`verified`). The gap is **programmatic depth** (matchup + calibration pages) and **shareable structured data on proof pages** (§4, §8). Post-March-2026, the winning move is "scale with substance": every generated page needs ≥30% unique, hard-to-find data ([digitalapplied](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban), [seeklab](https://seeklab.io/blog/high-quality-programmatic-seo-strategy-in-2026/)) — GSN's per-game signal snapshots and per-pick outcomes *are* that data.

**P0 — Owned newsletter (model journal → email).** `ModelJournalEntry` already has `emailedAt` + `twitterTeasedAt` fields (`verified`, schema line ~988) — the distribution hooks are *built but unwired*. 2026 is "the year newsletters become the center of the content economy"; the median newsletter hits first revenue in 66 days, and a sports newsletter scaled to ~1M/day at **zero CAC** purely on owned email ([beehiiv State of Newsletters 2026](https://www.beehiiv.com/blog/the-state-of-newsletters-2026), [beehiiv Essential Sports case](https://www.beehiiv.com/case-studies/essential-sports)). A weekly "Model Accountability" letter (wins, losses, autopsies, what changed) is the single most on-brand, lowest-cost channel GSN can run.

**P1 — Short-form video (YouTube Shorts + TikTok + Reels, film-once/post-everywhere).** YouTube Shorts now drives ~200B daily views at the highest engagement (~5.91%); TikTok is FIFA's first-ever Preferred Platform with a **World Cup 2026 hub + creator programme** ([digitalapplied SFV](https://www.digitalapplied.com/blog/short-form-video-strategy-shorts-tiktok-reels-2026), [almcorp](https://almcorp.com/blog/short-form-video-mastery-tiktok-reels-youtube-shorts-2026/)). GSN format = **"The Pass List"** (15–30s: "here's a game everyone's betting; here's why our model passed") and **"Autopsy in 30s"** (we were wrong, here's the receipt). Honesty is the hook the category lacks. Note: `SOCIAL.youtube` is currently empty in `lib/brand.ts` (`verified`) — reserve the handle.

**P1 — Community / Discord.** A "proof-first bettors" server: live pass-list drops, weekly autopsy AMA, leaderboard of *the model's* settled record. Leading newsletters now "treat themselves like media companies — building communities and events" ([beehiiv](https://www.beehiiv.com/blog/the-state-of-newsletters-2026)). Discord is the retention + word-of-mouth flywheel that converts free → Pro.

**P2 — Partnerships / earned media.** The wedge is *press-native*: "the sports model that publishes its losses" is a story angle for sports-business press (Sportico, Covers, iGB — all cited in `COMPETITIVE_INTELLIGENCE.md` §5). Co-marketing with **verified-tracker brands (Pikkit/Betstamp)** is complementary, not competitive (they verify *users*; GSN verifies *the model*). `/press` page exists (`verified`).

**P2 — Prediction-market-trader outreach.** As Kalshi/DraftKings fragment the bet, "fair probability" becomes universal currency (`COMPETITIVE_INTELLIGENCE.md` §1A, §4). Distribute a venue-neutral fair-value view to trader communities (subreddits, Discords). This is a *differentiated* audience no pick-site courts.

**P3 — Paid (deliberately last; bootstrap).** No ad spend until a referral K-factor and organic baseline exist. When tested: retargeting on proof pages only, never "guaranteed win" creative (YMYL ad policy + AGA code). Brand-awareness paid is premature; performance paid waits for a proven LTV:CAC.

---

## 3. Growth loops (the compounding engine)

**Loop A — Content → SEO → signup (P0).**
`ContentDraft` (compliance-gated, source-backed) + `ModelJournalEntry` → published blog/journal → ranks on long-tail matchup + methodology queries → organic visitor → free signup (1 pick/day) → newsletter opt-in. *Accelerant:* programmatic matchup pages (§4) feed the top of this loop at scale. *Measure:* indexed pages, non-brand organic clicks, organic→signup rate.

**Loop B — Track-record → shareable proof → virality (P0, GSN's signature loop).**
Settled pick / calibration milestone / loss autopsy → **auto-generated share card (dynamic OG image)** → posted to X/IG/Threads/Discord → click back to the proof page → signup. This loop is *unique to GSN* because the shareable unit is a verifiable receipt, not a brag. **Current blocker `verified`:** only one static OG image exists (`apps/web/app/opengraph-image.tsx`); proof pages (`/performance/losses/[id]`, `/ledger`, `/journal/[slug]`) have no per-route dynamic OG card, so a shared loss-autopsy link renders the generic brand card. Building per-route OG (Next.js `opengraph-image.tsx` per segment, Edge runtime — same pattern already used) is the highest-leverage virality unlock. `recommended`

**Loop C — Referral (P1, build required).**
No referral system exists in schema (`verified` — grep found only `Promotion`/affiliate-disclosure plumbing). Recommended design: **double-sided, product-native incentive** — referrer gets a free Pro month, referee gets first month 50% off — fired at the "aha moment" (after a user has seen 3+ settled picks), per 2026 SaaS best practice (Dropbox-style dual-sided reward drove 60% of signups, −50% CAC) ([thegood](https://thegood.com/insights/saas-referral-program/), [referralrock](https://referralrock.com/blog/viral-loop/)). Track **K-factor** and **cycle time** — a K of 1.2 at 1-day cycle compounds far faster than the same K at 30 days ([saber](https://www.saber.app/glossary/viral-loop)).

> Loops > funnels: each settled pick should *both* improve the public record *and* mint a new shareable asset. The product's own grading cadence is the content calendar.

---

## 4. Programmatic-SEO content map (GSN-specific, March-2026-safe)

**Rule (non-negotiable post-March-2026):** every templated page must carry ≥30% unique, proprietary data (GSN's signal snapshots, edge index, pass/publish decision, settled outcome), real author/entity attribution (E-E-A-T), and `Dataset`/`SportsEvent`/`Article` JSON-LD ([digitalapplied](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban), [icoda iGaming SEO](https://icoda.io/blog/igaming-seo-guide/)). Thin/duplicate pages must be `noindex` or canonicalized. GSN's 7 sports × 3 markets (NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS × h2h/spread/total — `verified` from `COMPETITIVE_INTELLIGENCE.md` §4 / data-ingestion config) is the source grid.

| Page template | URL pattern | Unique data (the moat) | Intent / query | Schema |
|---|---|---|---|---|
| **Matchup room** (exists, expand) | `/room/[gameId]` `verified` | live consensus, book depth, line movement, edge index, GSN pass/publish decision | "Team A vs Team B odds/prediction" | `SportsEvent` |
| **Calibration explainer** | `/methodology/calibration` (new) | live Brier, discrimination metric, observed-vs-expected buckets | "are sports model confidence scores accurate" | `Dataset` |
| **Loss autopsy** (exists, index it) | `/performance/losses/[id]` `verified` | operator-written process/outcome/lesson + original snapshot | "[matchup] prediction wrong why" | `Article` |
| **Sport hub** | `/sports/[sport]` (new) | that sport's settled record, calibration slice, recent passes | "NFL betting model record" | `CollectionPage` |
| **"Vs." comparison** (exists, expand) | `/vs/[competitor-category]` `verified` (`/vs/tout-services` live) | the 4-signal tout watchlist + GSN contrast | "transparent sports picks vs tout" | `Article` |
| **Glossary / education** | `/learn/[term]` (new) | calibration, CLV, vig-free probability, variance — defined with GSN's live numbers | "what is closing line value" | `DefinedTerm` |
| **Weekly model journal** (exists) | `/journal/[slug]` `verified` (has RSS) | the week's wins/losses/changes, referenced pick IDs | brand + "sports model accountability report" | `Article` |

**Sitemap gap `verified`:** `sitemap.ts` includes static routes + journal entries, but **omits `/room/[gameId]`, `/performance/losses/[id]`, and blog post URLs** (blog gated behind `PUBLIC_BLOG_ENABLED`). As those surfaces go live, add dynamic generators (the file already comments this intent). Until then they're effectively invisible to crawlers.

---

## 5. Launch plan out of bootstrap (phased, capital-light)

**Phase 0 — Foundation (pre-public-record, now).** No win-rate to show, and that's the story. Ship: homepage proof-meta (§11), per-route OG cards (Loop B), wire the model-journal newsletter (`emailedAt`), reserve YouTube handle. Message: *"We're collecting a record we can defend. Watch it happen."* (matches `social/launch-day.md` Round 2). `recommended`
**Phase 1 — First settled record (n≥30 canonical).** Calibration curve renders → trigger Loop B (first shareable calibration card) + first autopsy posts. This is the credibility unlock; time the press push here.
**Phase 2 — Content engine on.** Flip `PUBLIC_BLOG_ENABLED`, launch programmatic matchup + sport-hub pages, weekly journal newsletter cadence. Loop A compounds.
**Phase 3 — Referral + community.** Turn on the double-sided referral loop and Discord once there's a record worth sharing and a free→Pro conversion baseline.
**Phase 4 — Paid + partnerships.** Only after K-factor and organic baselines exist. Retarget proof-page visitors; pursue tracker co-marketing and prediction-market-trader distribution.

---

## 6. Brand awareness vs. performance

Bootstrap rule: **performance-weighted now, brand compounds for free via the proof loop.** GSN's brand-awareness engine *is* its performance content — a viral loss autopsy builds brand *and* drives signups simultaneously, so the usual trade-off mostly collapses. Allocate effort, not cash: ~70% to compounding owned assets (SEO, newsletter, proof cards), ~20% to community, ~10% to earned press. Revisit paid brand spend only after a 6-month organic baseline. `recommended`

---

## 7. Measurement & attribution

**North-star:** *verified-record-driven activated signups* (free users who viewed ≥1 proof page, then opted into newsletter or upgraded). It ties growth to the wedge, not vanity reach. `recommended`

| Layer | Metric | Source / instrument |
|---|---|---|
| Acquisition | non-brand organic clicks; indexed-page count; impressions on matchup/calibration queries | Search Console |
| Loop A | organic→signup rate; blog/journal→signup | first-party event log |
| Loop B | proof-card shares; share→visit→signup; OG-card CTR | UTM on share links + referrer |
| Loop C | **K-factor**, **cycle time**, referral signup share | referral system (to build) |
| Activation | % of new users viewing ≥1 proof page; newsletter opt-in rate | first-party |
| Revenue | free→Pro→Elite conversion; LTV:CAC by channel; churn | Stripe (`Subscription` model `verified`) + `ClaudeApiBudget` cost ledger for content COGS |

**Attribution stance:** first-party + UTM + self-reported "how did you hear" on signup. Avoid heavy third-party pixels (privacy + the YMYL trust posture). The existing per-surface `ClaudeApiCallRecord` cost ledger (`verified`) already lets GSN compute content **cost-per-published-asset** — fold that into channel ROI.

---

## 8. Legal / compliance line (gambling-adjacent marketing)

**Verdict:** GSN's compliance posture is already above the category and should be marketed as such — but the line is strict. `verified` + `verified-ext`.
- **No guaranteed-win / no "risk-free" claims, ever.** Enforced in code (`Promotion` model hard-gates on `disclosureText`/`termsUrl`/`responsibleGamingText`/`complianceStatus=APPROVED`; banned-phrase scans; `ContentDraft.bannedPhraseScanClean`) — `verified` from `REPO_INTELLIGENCE_REPORT.md` §7. This mirrors the **AGA Responsible Marketing Code** prohibitions on "risk-free" and "gambling solves financial problems" messaging ([AGA](https://www.bettingusa.com/aga-responsible-marketing-code/)).
- **Responsible-gaming message + helpline on every public surface.** `HELPLINE` (1-800-GAMBLER) is a brand constant rendered in footer (`verified`, `lib/brand.ts`); `RiskDisclosure` is on homepage and methodology (`verified`).
- **No targeting minors / no channels with material underage audience** (IL, MA, NJ, NY, NC rules) ([AGA statutes guide](https://www.americangaming.org/resources/responsible-gaming-regulations-and-statutes-guide/), [igamingbusiness 2026](https://igamingbusiness.com/sports-betting/sports-betting-regulation/2026-integrity-preview-sports-betting-scandals/)). Age-gate social ad audiences; keep creative non-juvenile.
- **Geo-honesty in promotions.** `eligibleStates`/`restrictedStates` drive honest "not available in your state" (`verified`). Watch the proposed **SAFE Bet Act** (federal minimums on marketing/AI/affordability) — design now as if it passes ([aibm](https://aibm.org/policy/how-sports-betting-looks-in-america-and-where-policy-can-reduce-harms/)).
- **Affiliate disclosure** required on any monetized comparison/promo content (`ContentDraft.affiliateDisclosureIncluded` exists `verified`); also an FTC requirement.
- **Positioning guardrail:** GSN is **research/intelligence, not a sportsbook and not a tipster guaranteeing outcomes** ("The math can point. The decision stays yours." — `page.tsx` `verified`). Keep that disclaimer adjacent to any performance claim, and never publish an accuracy % the calibration curve can't defend (`COMPETITIVE_INTELLIGENCE.md` §3 "What NOT to do").

---

## 9. 90-day marketing roadmap

**Days 1–30 — Make the proof shareable & found.**
- [ ] (CODE, §11) Add homepage `export const metadata` with proof-anchored title/description + canonical. **#1 safe change.** `recommended`
- [ ] Spec per-route dynamic OG cards for `/performance/losses/[id]`, `/ledger`, `/journal/[slug]` (Loop B) — reuse the `opengraph-image.tsx` Edge pattern. `recommended`
- [ ] Wire the model-journal newsletter (`ModelJournalEntry.emailedAt`); stand up a beehiiv/owned list; publish issue #1 ("why our record reads Collecting"). `recommended`
- [ ] Reserve YouTube/TikTok handles; set `SOCIAL.youtube`. Begin "Pass List" short-form (film-once/post-4×).
- [ ] Add `Article`/`Dataset` JSON-LD to `/performance`, `/methodology` (extend the layout/pricing/faq pattern).

**Days 31–60 — Turn on the content + programmatic engine.**
- [ ] Ship sport-hub `/sports/[sport]` + expand `/room/[gameId]` with structured data; add them to `sitemap.ts`. `recommended`
- [ ] Flip `PUBLIC_BLOG_ENABLED` when content gate clears; publish methodology-first editorial (calibration, CLV, vig-free probability) with named-author E-E-A-T bylines ([15m](https://15m.com/articles/the-future-of-gambling-seo-what-affiliates-and-webmasters-need-to-know/)).
- [ ] Launch `/vs/[category]` expansion (beyond `/vs/tout-services`).
- [ ] Open Discord ("proof-first bettors"); weekly autopsy AMA.

**Days 61–90 — Loops compound.**
- [ ] Build + launch double-sided **referral** (free Pro month ↔ 50% off), fired at aha moment; instrument K-factor + cycle time. `recommended`
- [ ] First earned-media push timed to the first defensible calibration milestone (Sportico/Covers/iGB angle: "the model that publishes its losses").
- [ ] Begin prediction-market-trader distribution (fair-value view to Kalshi/Polymarket communities).
- [ ] Review dashboards (§7); decide whether any paid retargeting is warranted.

---

## 10. The five highest-leverage marketing moves (prioritized `recommended`)

1. **Make the homepage's *shared* unit sell proof** (§11) — the most-linked, `priority:1.0` URL currently inherits a generic OG card.
2. **Per-route shareable proof cards** — unlocks Loop B, GSN's only truly viral, category-unique loop.
3. **Wire the model-journal newsletter** — built fields (`emailedAt`), zero-CAC owned channel, perfect brand fit.
4. **March-2026-safe programmatic matchup/sport pages** — Loop A at scale, defensible because the data is proprietary.
5. **Double-sided referral at the aha moment** — the K-factor flywheel; build once a record exists to share.

---

## 11. THE single highest-leverage SAFE code change (my domain)

**What:** Add a dedicated `export const metadata` to the homepage so its title/description/canonical/OG sell the *proof* wedge — instead of silently inheriting the generic root-layout card.

**Exact file:** `apps/web/app/page.tsx` (currently has **no** `metadata` export — `verified` this session; it inherits only `apps/web/app/layout.tsx` defaults).

**Precise change (additive, ~10 lines, no logic touched):** add near the existing imports (alongside `export const dynamic = "force-dynamic";`):
```ts
import type { Metadata } from "next";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description:
    "A sports model graded in public. We publish the reasoning behind every signal, post our losses as autopsies, and refuse to show a win-rate until the settled record can honestly back it.",
  alternates: { canonical: "/" },
  // OG/Twitter image inherited from layout for now; swap to a dynamic
  // proof-card opengraph-image.tsx in the Loop B work (Days 1–30).
};
```
(Pull `BRAND_NAME`/`BRAND_TAGLINE` from `apps/web/lib/brand.ts` so it stays the single source of truth; do not hardcode.)

**Why (highest-leverage, in-domain, safe):**
- It's the **#1 SEO/share surface** — `priority: 1.0`, `changeFrequency: daily` in `sitemap.ts` (`verified`) — yet today the homepage's shared/indexed snippet is a generic brand line, so every reshare and SERP listing *wastes the proof wedge*. Sibling pages (`/performance`, `/methodology`, `/vault`, `/ledger`, `/about`) already do this (`verified`); the homepage is the conspicuous omission.
- It directly powers **Loop B** (proof→share→signup) and aligns the most-linked URL with the YMYL **E-E-A-T/trust** signals Google now rewards for gambling content ([15m](https://15m.com/articles/the-future-of-gambling-seo-what-affiliates-and-webmasters-need-to-know/)).
- **Zero risk:** purely additive metadata, no runtime/data/paywall logic, no banned phrases (reuses approved brand copy), no new dependency. Honors every hard constraint (no spend, no publishing, no schema change).

**How to verify (no code run here, per constraints):**
1. `npm run typecheck` — stays green (metadata is a typed Next export).
2. `npm run build` then view source of `/` — `<title>` and `<meta name="description">` reflect the proof copy; `<link rel="canonical" href=".../">` present.
3. Paste the deployed URL into a social card validator (X/LinkedIn post inspector) — title/description show the proof line.
4. Search Console URL Inspection on `/` after deploy — confirms the new title/description are the indexed snippet.

---

### Sources (2026, cited inline above)
- Programmatic SEO / March-2026 scaled-content: [digitalapplied](https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban), [seeklab](https://seeklab.io/blog/high-quality-programmatic-seo-strategy-in-2026/), [searchengineland](https://searchengineland.com/guide/programmatic-seo).
- Gambling YMYL / E-E-A-T: [15m](https://15m.com/articles/the-future-of-gambling-seo-what-affiliates-and-webmasters-need-to-know/), [icoda](https://icoda.io/blog/igaming-seo-guide/), [postaffiliatepro](https://www.postaffiliatepro.com/blog/google-algorithm-updates-betting-affiliate-sites/).
- Referral / viral loops: [thegood](https://thegood.com/insights/saas-referral-program/), [referralrock](https://referralrock.com/blog/viral-loop/), [saber](https://www.saber.app/glossary/viral-loop).
- Compliance / responsible marketing: [AGA code](https://www.bettingusa.com/aga-responsible-marketing-code/), [AGA statutes](https://www.americangaming.org/resources/responsible-gaming-regulations-and-statutes-guide/), [igamingbusiness](https://igamingbusiness.com/sports-betting/sports-betting-regulation/2026-integrity-preview-sports-betting-scandals/), [aibm SAFE Bet](https://aibm.org/policy/how-sports-betting-looks-in-america-and-where-policy-can-reduce-harms/).
- Short-form video: [digitalapplied SFV](https://www.digitalapplied.com/blog/short-form-video-strategy-shorts-tiktok-reels-2026), [almcorp](https://almcorp.com/blog/short-form-video-mastery-tiktok-reels-youtube-shorts-2026/).
- Newsletters / sports media: [beehiiv State of Newsletters 2026](https://www.beehiiv.com/blog/the-state-of-newsletters-2026), [beehiiv Essential Sports case](https://www.beehiiv.com/case-studies/essential-sports).
- Internal (this repo): `CLAUDE.md`, `COMPETITIVE_INTELLIGENCE.md`, `REPO_INTELLIGENCE_REPORT.md`, `apps/web/app/{page,layout,sitemap,robots,opengraph-image}`, `apps/web/app/{methodology,about,blog,vs/tout-services}/page.tsx`, `apps/web/lib/brand.ts`, `social/launch-day.md`, `packages/db/prisma/schema.prisma`.
