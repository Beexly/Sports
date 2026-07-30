# GSN — Media & Content Production Quality (2026)

**Author:** Media & Content Production Lead, Galaxy Sports Network (GSN / Galaxy Sports Edge).
**Question:** Given the draft-only content engine, the CreatorAsset templates, the
Higgsfield + Canva MCPs, and a "proof not promises" brand — what is best-in-class
2026 sports-media production for GSN, and how do we get there without publishing
anything automatically or fabricating a single claim?
**Method:** Grounded in this repo (paths cited inline) + live 2026 web research (URLs in §11).
**Labels:** `verified` (read in this repo / source) · `inferred` (deduced from repo) ·
`recommended` (my proposal) · `speculative` (forward-looking, lower certainty).

> Naming note (`verified`): code/brand constants say **"Galaxy Sports Edge" / "GSE"**
> (`apps/web/lib/brand.ts`). The brief calls it **GSN**. Same entity; I use GSN for the
> org and GSE for the literal brand lockup that ships in product.

---

## 0. Thesis — media is the proof surface, not the promo surface (`recommended`)

The competitive wedge is *"Graded in public. Calibrated, not confident."*
(`COMPETITIVE_INTELLIGENCE.md` §3). Every rival pick brand uses media to make the
loudest possible *promise* (locks, 🔥, "72% accuracy"). GSN must invert that: media
is where we **show the receipts** — calibration curves, loss autopsies, CLV, "what
would change our mind." The single most valuable, hardest-to-copy media GSN can ship
is a **shareable track-record / pick card whose every number is auditable** — the
visual analog of the calibration page. That is the "proof not promises" Wedge made
viewable in a feed where 80%+ watch muted (`verified`, §11 JoinBrands/medianug).
The 2026 backlash makes this a tailwind: the Washington Post's May-2026 AI analysis
found gambling references in sports broadcasts "every 11 seconds" (`verified`, §11) —
an honest, RG-first brand is counter-positioned exactly right.

---

## 1. What the editorial engine can produce TODAY (`verified`)

GSN already has **two** complementary draft-only text engines. Neither has a publish
endpoint — by design (`packages/db/prisma/schema.prisma` L1361-1381: *"no publish
endpoint, no scheduler … `publishedAt` … never set by the engine — operator-only"*).

**A. Galaxy Studio — per-game CreatorAssets.** `apps/web/app/cockpit/studio` +
`apps/web/lib/studio/*`. Eight Claude-ready, citation-attached, compliance-scanned
templates, mapped 1:1 to the real `CreatorAssetKind` enum (`schema.prisma` L924-933):

| `CreatorAssetKind` | Template file (`apps/web/lib/studio/templates/`) | Output | Surface |
|---|---|---|---|
| `FAN_EXPLAINER` | `fan-explainer.ts` | Plain-language matchup read | Blog / IG caption |
| `FANTASY_ANGLE` | `fantasy-angle.ts` | Fantasy/usage angle | Blog / newsletter |
| `BETTING_EDUCATION` | `betting-education.ts` | Methodology explainer | Blog / YouTube script |
| `X_THREAD` | `x-thread.ts` | 5-7 post thread, JSON array, ≤280c each | X |
| `TIKTOK_REELS_SCRIPT` | `tiktok-reels-script.ts` | 45-90s script w/ `[stage directions]` | TikTok/Reels/Shorts |
| `NEWSLETTER_BLOCK` | `newsletter-block.ts` | Newsletter section | Email |
| `SPONSOR_SAFE_BLURB` | `sponsor-safe.ts` | Affiliate-safe copy | Sponsored placements |
| `YOUTUBE_TITLE_IDEAS` | `youtube-titles.ts` | Title list | YouTube |

Each `CreatorAsset` row stores `citations`, `complianceFlags`, `gateState`,
`modelVersion`, `status` (DRAFT→EXPORTED→ARCHIVED→BLOCKED), `complianceStatus`
(GREEN/YELLOW/RED) — `schema.prisma` L948-979. Generation is **gated by evidence**:
`inferStudioGateState` returns `THIN` (refuses) when `evidenceHealth.status==="THIN"`
or `sourceCount===0`, `GATED` when no picks, `READY` otherwise
(`build-assets.ts` L120-130). Export is **copy-markdown / save-markdown only** —
*"External publishing is intentionally absent"* (`studio-workspace.tsx` L327-331).

**B. Phase-8 Content Engine — long-form / structured.** `apps/web/app/cockpit/content`
+ `apps/web/lib/content-engine`. The `ContentDraft` model (`schema.prisma` L1474-1518)
carries first-class compliance fields: `responsibleGamingIncluded`,
`affiliateDisclosureIncluded`, `bannedPhraseScanClean`, `performanceGateStatus`,
`sourceCoverageStatus`. Twelve `ContentDraftType`s exist (L1400-1413) — incl.
`PERFORMANCE_TRANSPARENCY`, `MODEL_ACCOUNTABILITY_NOTE`, `LOSS`-adjacent
`WEEKLY_RECAP`, `RESPONSIBLE_BETTING_EDUCATION`, plus `SOCIAL_DRAFT` /
`NEWSLETTER_DRAFT`. Each draft attaches `ContentSource` rows with a `trustLevel`
(AUTHORITATIVE / PLATFORM / REVIEWED / UNVERIFIED / BLOCKED) — *UNVERIFIED cannot back
a regulated claim* (L1427-1433). The cockpit shows the **live readiness verdict next
to the persisted status** so a stale `APPROVED` can't silently re-greenlight an
aged-out draft (`content/page.tsx` L16-27).

**C. Editorial proof assets already modeled (`verified`):** `BlogPost`
(L599-622), `ModelJournalEntry` (weekly, ISO-week-unique, RETRACTED state +
`retractionReason` — L988-1019), `LossAutopsy` (L423-453), and `DailyBrief` with 11
`BriefSectionType`s incl. `WHAT_CHANGED`, `DATA_QUALITY`, `RESPONSIBLE_GAMING`,
`CONTENT_IDEAS` (L1263-1341). **The pillar-and-atomize loop is therefore native:** the
DailyBrief / ModelJournal is the pillar; Studio atomizes it into X/TikTok/newsletter
derivatives — the 2026 1:8+ atomization ratio (`verified`, §11 Libril/yoursay) without
new infrastructure.

---

## 2. The three-layer compliance scanner (the moat under the media) (`verified`)

GSN's content safety is **structural, not a checklist**. `scanStudioContent`
(`build-assets.ts` L157-190) runs **Layer-1/2 platform rules** (`@/lib/compliance-scanner/rules`)
+ **Layer-3 per-template rules**; any `block` → status `red` → `publicReady:false`.
Examples I read in the templates (`verified`):
- `X_THREAD` blocks `🚨🔥💰💎🚀💯🏆` emoji ladders, all-caps hype (`BREAKING|HUGE|MASSIVE|INSANE`),
  and engagement-bait CTAs (`who do you have|comment your locks|RT if`); *warns* on the
  word "card" (Galaxy voice avoids it) — `x-thread.ts` L16-39.
- `TIKTOK_REELS_SCRIPT` blocks clickbait hooks (`you won't believe|the secret nobody is
  talking about`) and tout-coded `LOCK|HAMMER|FADE|tail` — `tiktok-reels-script.ts` L17-33.

This means the **media compliance posture is already enforced in code at the text
layer**. The gap (§5) is that *image/video* outputs from the MCPs do **not** pass
through this scanner — closing that gap is the heart of the media-pipeline design.

---

## 3. Brand media quality standards (`verified` tokens, `recommended` application)

Single source of truth = `apps/web/lib/brand.ts` + `DESIGN.md`. Every template must read
these, never hard-code (`verified`: `opengraph-image.tsx` imports `BRAND_NAME`/`BRAND_TAGLINE`).

- **Color** (`DESIGN.md` L20-75): canvas `--carbon #0D1117`, raised `--eclipse #11161F`;
  accents `plasma #FF2DD6` (primary/elite conviction), `orbital_cyan #00E5FF` (live
  signal/key numbers), `ultraviolet #7A5CFF` (model outputs/confidence depth).
  **Forbidden:** sportsbook green, casino imagery, gradient-text except hero monogram,
  "win-rate bars as hero content — confidence displayed before calibration earned"
  (`DESIGN.md` L198-206).
- **Typography** (`DESIGN.md` L80-116): `Arch` (Big Shoulders/Druk) — oversized
  headlines, **one per page max**; `Display` (Syne/Space Grotesk) — section headers;
  `Mono`/`Numerals` (Geist Mono/JetBrains Mono) — **tabular-nums always** for any stat.
- **Motion** (`DESIGN.md` L161-165): `ease_out cubic-bezier(0.2,0,0,1)`,
  `ease_in_out cubic-bezier(0.5,0,0.2,1)`. GIF spec: ≤8s, 12-24fps, loopable, palette
  restricted to tokens (`media-studio-doctrine.md` L79-94).
- **Sound** (`recommended`): muted-first design (captions burned in — `verified`, §11);
  any AI narration **must** carry an audible+visible *"AI-narrated content"* disclosure
  (`media-automation-risk-policy.md` §4).
- **Logo law** (`verified`, doctrine L65-76): GSE monogram/wordmark upper-left or
  lower-right; **forbidden** elements: lock emoji, fire emoji, "glowing 99 without an
  evidence chain," sportsbook green, casino props.

---

## 4. Media pipeline using Higgsfield + Canva MCPs (`recommended`, human-gated)

The MCPs are available (`verified` from tool list): **Higgsfield**
(`mcp__d79b14ac…__generate_image` / `generate_video` / `virality_predictor` /
`upscale_video` / `reframe` / `show_plans_and_credits`) and **Canva**
(`mcp__efad1919…__create-design-from-brand-template` / `export-design` /
`list-brand-kits` / `resize-design`). **HARD CONSTRAINT honored: this document does
not call them (no spend) and nothing in it auto-publishes.**

Proposed asset classes (each maps to an approved doctrine template — workflow L189-198):

| Asset | Tool | Source data | Gate before any spend |
|---|---|---|---|
| **Matchup graphic** (1080×1080 / 1200×630) | Canva brand-template fill | `GameIntelligenceNode` matchup + commence time | Studio node `gateState !== THIN` |
| **Pick card** (shareable) | **`next/og` first** (free, deterministic, on-brand); Canva for hero variants | settled/public `Pick` fields only | `publicReady === true` + freshness disclosure |
| **Track-record / calibration card** | `next/og` | `/calibration` public numbers (Brier, win-rate-by-bucket, CLV) | ≥ sample-size gate; bootstrap-fenced only |
| **Recap video** (≤90s vertical) | Higgsfield `generate_video` from an approved script | `WEEKLY_RECAP` ContentDraft + `TIKTOK_REELS_SCRIPT` | script passes scanner; **no league footage** |
| **Brand moment GIF** | Higgsfield/Canva | none (brand only) | doctrine GIF spec |

**The pipeline = the seven-stage Media Studio Workflow (`verified`,
`docs/media/media-studio-workflow.md`), with two `recommended` hardenings:**

1. **Brief → 2. Asset selection (claim pre-check) → 3. Creation (MCP draft) →
   4. Claim-governance review → 5. Brand-safety review → 6. Rights/attribution →
   7. *Operator* publish.** AI is permitted stages 1-4 only; **stages 5-7 are
   operator-only** (workflow L174-184). Automation tiering caps at *Draft-assisted /
   Template-assisted*; **"Fully automated … CRITICAL — FORBIDDEN"**
   (`media-automation-risk-policy.md` §1).
2. **`recommended` hardening A — run the image/video *text layer* through the existing
   scanner.** Any burned-in caption, headline, or overlay string on an MCP asset should
   be passed through `scanStudioContent()` before the operator review gate, so a "LOCK"
   or "🔥🔥" overlay is caught by the *same* code that already guards X/TikTok text. This
   reuses `apps/web/lib/studio/build-assets.ts` — no new policy, just applied to pixels.
3. **`recommended` hardening B — provenance row per asset.** Persist each MCP output as
   a `CreatorAsset` (or `CockpitMediaItem`) with `generatedBy`, `modelVersion`, tool
   name, the source `citations`, and `complianceStatus=YELLOW` until an operator flips
   it. Mirrors the text engine's audit trail; satisfies the doctrine's *"log the asset …
   link to the pick"* (workflow L167-170) and the AI-disclosure mandate (`verified`, §11).

---

## 5. Quality + compliance guardrails (`verified` doctrine, consolidated)

Non-negotiables drawn straight from the repo's media docs and CLAUDE.md rule set:

- **No guaranteed-win / tout language** — `LOCK / HAMMER / GUARANTEE / VIP / 🔥-ladder`
  blocked in code (§2) and doctrine (workflow L116). **"Lock" *imagery* also forbidden**
  (doctrine L161).
- **Responsible gaming on every pick-facing surface** — `HELPLINE`
  (`1-800-GAMBLER`, NCPG link) is a brand constant (`brand.ts` L48-53);
  "*For entertainment purposes only*" required on any graphic with pick content
  (doctrine L68).
- **Affiliate / sponsorship disclosure** — `affiliateDisclosureIncluded` is a gating
  field (`schema.prisma` L1493); 2026 rules require disclosing *both* paid placement
  *and* AI involvement (`verified`, §11 awisee).
- **Win-rate claims need ≥30 settled picks + window + model version** (doctrine L159;
  enforced by `performanceGateStatus` / `requiresPerformanceGate`). GIFs **may not**
  animate a win-rate counter or a live confidence score (doctrine L91-93).
- **No real-athlete AI imagery, no league broadcast footage, no unlicensed music** —
  highest-liability items (`media-automation-risk-policy.md` §2, §5). Higgsfield
  `generate_image`/`generate_video` is therefore **brand/abstract/data-viz only**.
- **AI-content disclosure** — any AI narration/imagery labeled as such (risk-policy §4).
- **No auto-publish, anywhere** — *"No auto-post endpoint exists in `apps/web/` or
  `workers/`"* is an audit requirement (risk-policy §"Validation"); keep it that way.
- **Stale-data guard** — surface the live freshness/readiness verdict next to status on
  every media item, as content cockpit already does (`content/page.tsx` L16-27).

---

## 6. Distribution formats per platform (`recommended`, 2026-tuned via §11)

| Platform | Format | GSN spec | Source template |
|---|---|---|---|
| **TikTok / Reels / Shorts** | 9:16, 30-60s, hook in 3s, burned captions | Lead with a number, not hype; close = verbal citation to `/room/[gameId]` | `tiktok-reels-script.ts` (`verified`) |
| **X** | Thread 5-7 posts, ≤280c, ≤1 emoji | Hook = specific claim; final post links Game Room | `x-thread.ts` (`verified`) |
| **Instagram** | 1080×1080 pick card + Story 1080×1920 | Monogram + RG + "entertainment only" | doctrine template lib L191-195 |
| **Newsletter (email)** | Pillar summary + link back | Big-Idea framing | `NEWSLETTER_BLOCK` |
| **Blog** | Long-form pillar (2500w+) + dynamic OG image | SEO fields exist (`BlogPost.seoTitle/Description`) | §1 |
| **YouTube** | Long-form methodology / Almanac, operator-recorded | Titles from `YOUTUBE_TITLE_IDEAS`; no auto-upload | risk-policy §2 |
| **Open Graph (all shares)** | 1200×630 `next/og`, edge, <500KB, flexbox-only | Per-entity cards (§10) | `opengraph-image.tsx` (`verified`) |

2026 cadence baseline (`verified`, §11): TikTok/Reels 3-5×/wk, Shorts 2-3×/wk;
a 45s/70%-completion clip beats a 15s/40% clip — optimize for completion, not brevity.

---

## 7. Content calendar tied to the sports schedule + DailyBrief (`recommended`)

The `DailyBrief` (one per UTC date, `@@unique([briefDate])` — `schema.prisma` L1298)
is the **clock**. Proposed weekly rhythm, all draft-only:

- **Daily (AM):** DailyBrief `SLATE_OVERVIEW` + `TOP_PICKS` → Studio atomizes the lead
  game into one X thread + one Reels script (drafts). Pick cards rendered on demand via OG.
- **Game day (pre-lock):** `LINE_MOVEMENT_WATCH` draft + matchup graphic (Canva, gated).
- **Post-settlement:** auto-draft a `WEEKLY_RECAP` candidate and, on a notable miss, a
  `LossAutopsy` → loss-autopsy explainer (the brand-defining "we show losses" asset).
- **Weekly:** `ModelJournalEntry` pillar (ISO-week) → newsletter block + "what changed"
  thread + track-record card. Quarterly: a `MODEL_ACCOUNTABILITY_NOTE`.
- **Always-on:** `RESPONSIBLE_BETTING_EDUCATION` evergreen rotation.

Seasonality (`inferred`): bias volume to NFL Sun/Mon/Thu, NBA/NHL nightly slates, MLB
daily, CFB Sat. The `DailyBriefSection.sourceStatus` (FRESH/AGING/STALE) is the
go/no-go signal — never atomize a STALE section.

---

## 8. Prioritized media roadmap (`recommended`)

**P0 — ship the proof, safely (1-2 wks).**
1. **Per-entity OG images** for `/calibration` and `/blog/[slug]` (the §10 build) — the
   single highest-leverage, zero-publish-risk win. Today every shared GSN link falls back
   to one generic card.
2. **Pick-card OG endpoint** rendering only public `Pick` fields, with freshness +
   RG + "entertainment only" baked in.

**P1 — pipeline hardening (2-4 wks).**
3. Route MCP asset *text overlays* through `scanStudioContent()` (§4 hardening A).
4. Persist every MCP asset as an audited `CreatorAsset`/media row, `YELLOW` until
   operator-approved (§4 hardening B).
5. Promote **CLV + calibration + discrimination** to a shareable "model accountability"
   visual (aligns with `COMPETITIVE_INTELLIGENCE.md` §4 P1).

**P2 — repeatable visual production (4-8 wks).**
6. Canva brand-template library: `social-pick-card-square/-wide`, `story-brief`,
   `galaxy-almanac-thumbnail` (doctrine L191-195) wired to `list-brand-kits`.
7. Higgsfield brand-moment GIFs + abstract data-viz B-roll (no athletes/footage);
   optionally consult `virality_predictor` on operator-finalized cuts only.

**P3 — long-form & speculative.**
8. Operator-recorded methodology/Almanac video w/ AI-narration disclosure.
9. `speculative`: an "ask the model why" conversational video explainer grounded in
   `factorBreakdown` — only if it can cite evidence and show uncertainty.

---

## 9. What NOT to do (`verified` constraints)

No auto-post/upload to any platform (risk-policy §1, hard rule). No MoneyPrinter-style
auto-video pipeline (risk-policy §3). No league footage / real-athlete AI faces /
unlicensed music. No win-rate counters or live-confidence animations. No "accuracy %"
on a graphic you can't defend with a calibration curve (`COMPETITIVE_INTELLIGENCE.md`
L125). No publishing without the seven-stage operator gate.

---

## 10. THE single highest-leverage SAFE improvement

**What:** Add a **static-export per-entity OpenGraph image** to the public pages that
already render but currently share with the generic site card — starting with the
**track-record / calibration card** at `apps/web/app/calibration/opengraph-image.tsx`
(then the same pattern for `apps/web/app/blog/[slug]/opengraph-image.tsx`). It renders a
**branded, auditable share image** (Brier score, win-rate-by-confidence, CLV, sample
size, model version, "Graded in public" + RG line) from data the `/calibration` page is
**already allowed to show publicly** — using the proven `next/og` `ImageResponse`
pattern from `apps/web/app/opengraph-image.tsx`.

**Why (highest leverage):**
- It is the **literal visual embodiment of the wedge** — *proof, not promises* —
  delivered into muted social feeds where it counts (`verified`, §11). Rivals share a
  generic logo or a hype graphic; GSN shares a *calibration scoreboard*.
- **Zero publish risk:** Next.js `opengraph-image.tsx` is a metadata convention rendered
  on demand and CDN-cached when the public page is *manually* shared. It creates **no
  auto-post path**, no new MCP spend, no scheduler — fully inside
  `media-studio-doctrine.md` (which already names `og-image-standard` an approved,
  governed, user-facing template, L107-111 / L193).
- **Reuses everything:** same `next/og` + `@/lib/brand` + DESIGN.md tokens already in
  `opengraph-image.tsx`; no new dependency, no new data exposure (renders only numbers
  the calibration/blog pages already publish).

**How (a self-contained new file — does NOT modify existing code):**
1. Create `apps/web/app/calibration/opengraph-image.tsx`. Export `runtime = "edge"`,
   `size = { width: 1200, height: 630 }`, `contentType = "image/png"`, and a default
   `Image()` returning an `ImageResponse` — mirroring the existing default OG file.
2. Read calibration numbers **server-side from the same source the public
   `/calibration` page uses** (the existing calibration lib). Render with carbon bg
   (`#0D1117`), tabular-nums stat row (Brier · win-rate-by-bucket · CLV · n picks ·
   `model_version`), the GSE mark, the tagline, and the locked RG/"entertainment only"
   footer. **No claim that isn't on the public page.** If sample size is below the gate,
   render a neutral "calibration in progress" state rather than a number — never invent a
   stat (CLAUDE.md rules #1/#2/#5).
3. **Verify (read-only / local; no publish):**
   - `npm run typecheck` and `npm run lint` pass (CLAUDE.md "Autonomous Loop").
   - `npm run dev`, then `GET /calibration/opengraph-image` returns a 1200×630 PNG.
   - Visual check: GSE monogram present, carbon bg, **no** lock/fire/sportsbook-green,
     numbers match the live `/calibration` page exactly, RG footer present, OG payload
     <500KB (`verified`, §11 Vercel/Next).
   - Confirm **no new route writes data and no posting code is added** — it is a pure
     render of already-public values. Add a unit/snapshot test (the repo already tests OG
     adjacent surfaces, e.g. `apps/web/__tests__/pick-card-a11y.test.ts`).

---

## 11. Sources (June 2026)

- Short-form length/hook/captions/cadence: [JoinBrands — YT Shorts Best Practices 2026](https://joinbrands.com/blog/youtube-shorts-best-practices/) · [Kathy Jacobs — 2026 SFV length guidelines](https://kathyjacobs.com/2026-short-form-video-guidelines-reels-youtube-shorts-tiktok-videos-length/) · [OpusClip — SFV Strategy 2026](https://www.opus.pro/blog/short-form-video-strategy-2026) · [Medianug — vertical video 2026](https://www.medianug.com/blog/why-vertical-videos-dominate-reels-in-2026)
- Sports-media + AI + gambling-ad scrutiny: [EPAM — 2026 personalized sports/content trends](https://www.epam.com/insights/blogs/this-time-its-personalized-2026-trends-in-content-live-events-and-sports) · [PwC — 2026 Sports Outlook](https://www.pwc.com/us/en/industries/tmt/library/sports-outlook-north-america.html) · [Washington Post — AI analysis: excess gambling ads (May 2026)](https://www.washingtonpost.com/investigations/interactive/2026/05/19/post-ai-analysis-sports-tv-detected-an-excess-gambling-ads/)
- Disclosure / AI-content rules: [Awisee — Influencer marketing rules 2026](https://awisee.com/blog/influencer-marketing-rules-regulations/) · [EY — 2026 media trends: authenticity](https://www.ey.com/en_us/insights/media-entertainment/2026-media-and-entertainment-trends-simplicity-authenticity-and-the-rise-of-experiences)
- Dynamic OG images: [Next.js — opengraph-image convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) · [Vercel — OG Image Generation](https://vercel.com/docs/og-image-generation) · [MakerKit — Dynamic OG with Next.js 16](https://makerkit.dev/blog/tutorials/dynamic-og-image)
- Repurposing / atomization / calendar: [Libril — Content Atomization](https://libril.com/blog/content-atomization-comprehensive-strategy) · [yoursay — Repurposing 2026 (1→30+)](https://www.yoursay.online/2026/04/content-repurposing-2026-turn-1-idea.html) · [InfluenceFlow — Content Planning Frameworks 2026](https://influenceflow.io/resources/content-planning-frameworks-the-complete-guide-for-2026/)
- Internal (`verified`, this repo): `CLAUDE.md` · `COMPETITIVE_INTELLIGENCE.md` ·
  `packages/db/prisma/schema.prisma` (CreatorAsset L924-979, ContentDraft L1474-1518,
  DailyBrief L1277-1341, BlogPost/ModelJournalEntry/LossAutopsy) ·
  `apps/web/lib/studio/*` · `apps/web/lib/content-engine` ·
  `apps/web/app/cockpit/{studio,media,content}` · `apps/web/app/opengraph-image.tsx` ·
  `apps/web/lib/brand.ts` · `DESIGN.md` · `docs/media/media-studio-workflow.md` ·
  `docs/design/media-studio-doctrine.md` · `docs/audit/media-automation-risk-policy.md`.

> Verification note: 2026 external figures are directional trade/press synthesis, not
> company-confirmed. All "no-publish / no auto-post" claims are `verified` against repo
> doctrine and the absence of any posting endpoint. Per the brief, no media-generation
> MCP was called and no code was modified — this is the only file created.
