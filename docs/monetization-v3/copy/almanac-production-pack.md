# Galaxy Almanac — Complete Production Pack

**Scope:** Everything needed to produce the 2026 Almanac from October content freeze through January 15, 2027 ship date.

**Pairs with:**
- `product/almanac-export-prd.md` (Codex's engineering data export tooling)
- `launch/almanac-preorder-runbook.md` (Codex's launch ops)
- `copy/almanac-preorder-positioning.md` (Codex's positioning frame)
- `copy/almanac-year-in-review-essay-specimen.md` (Claude's headline essay specimen)

This file covers what those don't: editorial production, supporting essays, cover design, distribution.

---

## Final book specifications

| Element | V1 specification |
|---|---|
| Total page count | ~300 pages |
| Format | Hardcover + digital + (V2) audiobook |
| Trim size | 6.14" × 9.21" (standard royal octavo, what Bill James Handbook uses) |
| Paper | 60# white interior; cover stock = premium matte with foil-stamp accent |
| Cover binding | Case-bound hardcover with dust jacket |
| Print provider | Amazon KDP Print-on-Demand (V1) |
| Hardcover ISBN | One-time $125 ISBN purchase from Bowker |
| Digital format | DRM-free PDF + EPUB |
| Audiobook (V2) | Garrett-narrated, recorded in single 8-hour session |
| Hardcover price | $99 (or $79 if customer dev surfaces resistance — see decision matrix in positioning doc) |
| Digital price | $39 (or $29 fallback) |
| Audiobook price (V2) | $29 |
| Premium tier (V1) | $129 — signed hardcover + Vault founder-list priority |

---

## Table of contents (final structure)

Page allocations are budgets; actual pages may flex by ±10%.

```
FRONT MATTER
  - Half-title page                                     1 page
  - Title page                                          1 page
  - Copyright page (ISBN, legal, etc.)                  1 page
  - Dedication (TBD)                                    1 page
  - Table of contents                                   2 pages
  - Foreword (optional — Garrett may decline)           2 pages

CHAPTER 1 — Year in Review                              8 pages
  - The headline essay (specimen in
    almanac-year-in-review-essay-specimen.md)

CHAPTER 2 — Settled Picks                              50 pages
  - Sport indexes (NFL, NBA, MLB, NHL, college)
  - Picks data with confidence + result
  - One-page-per-sport summary

CHAPTER 3 — Loss Room Archive                          60 pages
  - Every settled loss
  - Autopsy excerpt per loss
  - Root cause taxonomy
  - End-of-chapter loss-pattern synthesis

CHAPTER 4 — Pass List Archive                          30 pages
  - Every game considered + not published
  - Compact format (table-style, not narrative)
  - Pass categorization

CHAPTER 5 — Methodology Snapshot                       40 pages
  - Year-end frozen methodology
  - Factor weighting table
  - Sport-specific adjustments
  - Calibration data

CHAPTER 6 — Model Changelog                            20 pages
  - Every model version that shipped in 2026
  - Per-version: what changed + what we were trying to fix
  - Weight evolution charts
  - Calibration impact per version

CHAPTER 7 — Supporting Essays                          50 pages
  - 7 essays, ~7 pages each (see Essay Outlines section below)

BACK MATTER
  - Glossary (factor names, terms of art)               4 pages
  - Index                                               6 pages
  - About Galaxy Sports Edge                            2 pages
  - Acknowledgments                                     1 page

TOTAL                                                 ~280 pages
+ 20 pages of strategic white space and chapter breaks
TOTAL ACTUAL                                          ~300 pages
```

---

## The 7 supporting essays — outlines

Each essay runs ~1,200 words, ~6 printed pages with generous margins. Each one earns the Almanac's $99 price by being content that isn't on galaxysportsedge.com for at least 6 months post-publish.

### Essay 1 — "How the autopsy gets written" (~1,300 words)

**Thesis:** The Loss Room exists because Galaxy treats autopsies as the operating discipline that makes the rest of the work possible. The autopsy isn't a "lessons learned" exercise — it's a structured forensic reconstruction.

**Structure:**
1. The before-state: how most sports models reason about their losses (post-hoc rationalization, selective memory, "regression to the mean").
2. Galaxy's autopsy taxonomy: 5 root-cause categories the autopsies tag (factor underweighted, factor-interaction blind spot, sample-size noise, line-movement misread, model-version-known-weakness).
3. The walk-through process: Garrett's actual workflow for a single autopsy. Pulls the factor model output, identifies the factor that drove the call, identifies the assumption the factor relied on, confirms whether the assumption broke, tags the root cause, writes the public autopsy.
4. What the aggregated autopsy data reveals after a year: which root causes are most expensive, which factors keep recurring as the blind spot, which sport's autopsy patterns suggest structural model issues.
5. The honest limitation: autopsies are reconstructions. The reconstruction is more rigorous than the original publication; that doesn't mean the reconstruction is perfect.

**Garrett's edit pass adds:** 2-3 specific 2026 autopsy examples + the actual root-cause distribution observed in 2026.

### Essay 2 — "The pass that taught the most" (~1,100 words)

**Thesis:** One specific 2026 pass — to be selected by Garrett at year-end — taught the model more than any single published call. The Pass List is the under-appreciated production-discipline artifact; this essay shows why.

**Structure:**
1. Introduction: why the Pass List exists. (Most platforms hide their passes; Galaxy publishes them because the discipline of not-publishing teaches as much as publishing.)
2. The specific pass: [Garrett selects at year-end]. What the model surfaced, why we passed, what happened in the actual game.
3. The factor walk-through. Which factor weighting kept us out. Which assumption the factor was built on. What happened to the assumption in the game.
4. What the pass demonstrated: a specific category of error the model could have made if not for the publication-floor discipline.
5. How the pass changed the model. (Or didn't — sometimes the pass confirms the existing model is working correctly.)
6. The meta-lesson: passes that teach are more valuable than wins that don't.

**Garrett's edit pass:** selects the specific pass + writes the year-specific narrative.

### Essay 3 — "On confidence thresholds" (~1,400 words)

**Thesis:** Galaxy publishes at 60% confidence floor (with 65% mid-series carve-out). Why those specific numbers. What happened in 2026 when the threshold did its job. What happened when it failed.

**Structure:**
1. The setup: every probabilistic publication needs a threshold. What does "threshold" actually mean operationally?
2. Galaxy's 60% floor — the math. 60% confidence × N publications = expected hit rate. Calibration check: do 60%+ publications actually hit 60%+ of the time over 12+ months?
3. The 65% mid-series carve-out. Why mid-series (playoffs, multi-game contexts) needs a higher floor. What kinds of factors get noisier mid-series.
4. 2026 in two examples: (a) a publication that survived the threshold and won; (b) a publication that survived the threshold and lost; both were the threshold "working." Why losing at 64% confidence is consistent with the threshold doing its job.
5. The threshold failure mode: when does the floor fail to filter what it should? Sample-size noise, factor interaction (Essay 1 references), or assumption breaks. Galaxy saw N specific failures in 2026; this section names them.
6. The Year-2 question: does the threshold need to be sport-specific? Open question; Vault advisory has opinions; not yet committed.

**Garrett's edit pass:** specific 2026 examples + calibration data.

### Essay 4 — "What the changelog says about us" (~1,200 words)

**Thesis:** Galaxy shipped N model versions in 2026. The changelog is the most introspective artifact Galaxy produces. This essay reads the changelog as a self-portrait.

**Structure:**
1. The changelog as documentation. Every model version has a public changelog entry: what changed, what we were trying to fix.
2. 2026 in 4–7 versions. Brief summary of each: V5.x → V5.(x+1) etc. What each version was trying to fix; whether the fix held.
3. The pattern across versions: which factors got recurring attention (suggests they're load-bearing OR persistently flawed); which factors got reweighted once and stayed (suggests they're stable); which categories of issue we keep encountering (suggests they're structurally hard).
4. The version that was hardest: which 2026 version represented the biggest rethink? What was the rethink?
5. The version that mattered least: which 2026 version was a minor tweak that, in retrospect, did more than expected? Or less?
6. What the changelog suggests about Year-2: which patterns are mature; which areas still need rework.

**Garrett's edit pass:** the actual changelog narrative.

### Essay 5 — "The compliance discipline" (~1,300 words)

**Thesis:** Galaxy's brand-safety scanner is the most under-appreciated discipline in the operation. It's not a legal requirement — it's an operating choice that constrains every published surface. This essay names the choice + what it costs and earns.

**Structure:**
1. What the compliance scanner does: blocks specific vocabulary (guaranteed, lock, edge-as-marketing, AI, sure thing, no-brainer, etc.) from any published Galaxy surface.
2. Why the constraint is voluntary: most sports betting platforms accept this vocabulary as standard. Galaxy doesn't.
3. What the constraint costs: harder marketing, less engagement bait, slower SEO growth.
4. What the constraint earns: durable subscriber trust. Subscribers who join because of Galaxy's restraint stay because of the restraint.
5. The harder question: would Galaxy be more profitable in Year 1 if it dropped the constraint? Honest answer: probably yes. Would it be more profitable in Year 3? Almost certainly no.
6. What the discipline does to the operator: it shapes how Garrett thinks. By Year 2, the restraint isn't a filter; it's an internal voice. This is the moat.

**Garrett's edit pass:** specific examples of language the scanner caught in 2026.

### Essay 6 — "On Vault" (~1,000 words) [conditional]

**Only include if Vault has been operating ≥3 months by Almanac ship date (i.e., Vault launched by mid-October 2026).**

**Thesis:** Vault's founding-1,000 is the most important brand experiment Galaxy ran in 2026. This essay reflects on what the cohort taught Galaxy.

**Structure:**
1. The thesis Vault was built on: a thousand readers who care about the rationale more than the picks.
2. The customer-dev surprise: what the 30 interviews surfaced that the master plan didn't predict.
3. The founding-50 vs founding-1000 dynamic: the first 50 set the culture; the next 950 inherited it.
4. The members' biggest surprise to Garrett: a specific request, complaint, or pattern that reshaped Garrett's understanding of the product.
5. What Vault has proven: that the restraint position can monetize at scale.
6. What Vault has NOT proven: the questions Garrett still doesn't have answers to going into Year 2.

**If Vault is too new to write this essay honestly, replace with Essay 7 alternative.**

### Essay 7 — "What 2026 didn't teach us" (~1,400 words)

**Thesis:** A year of operating data has limits. Some questions Galaxy can't answer yet because the sample size isn't there. This essay names what's still unknown.

**Structure:**
1. The honest limit: 12 months of operating data tells you what worked in the recent past, not what works in expectation.
2. Three open questions Galaxy can't answer with 2026 data alone:
   - Question 1: does Galaxy's confidence calibration hold across sport cycles? (Need 2-3 years of data.)
   - Question 2: are autopsy patterns predictive or descriptive? (Need to see if the patterns repeat in 2027.)
   - Question 3: does the restraint discipline scale? (Need to see Vault at 5,000 members, not 1,000.)
3. Three questions Galaxy could answer with 2026 data but chose not to publish: the questions that have answers Galaxy isn't yet confident enough to publicize.
4. The Vault advisory channel: how the room's pushback expanded what Galaxy was watching.
5. The forward commitment: 2027 will produce data Galaxy is currently watching for. What that data will and won't tell us.
6. The honest close: writing this essay is itself an act of discipline. Most sports analytics annuals don't have a "what we don't know" section. The decision to include one is brand-position.

**Garrett's edit pass:** the actual 2026-specific unknowns.

---

## Production timeline

Hard dates assume 2026 → January 15, 2027 ship.

### Q3 2026 (July – September): Pre-production

**July:**
- Garrett confirms Almanac is GO (post-customer dev decision DEC-NEXT-006).
- Cover design brief drafted (see Cover Design Brief section below).
- Cover designer engaged (3–5 candidates contacted; 1 hired by month-end).
- Layout designer engaged.
- Copyeditor engaged (1099 contract).
- ISBN purchased.

**August:**
- Cover concepts due (3 rounds, 2 weeks each).
- Cover locked.
- Garrett begins drafting Year-in-Review essay (Chapter 1).
- Claude API begins drafting supporting essay outlines (per outlines above).

**September:**
- Cover designer delivers final files.
- Garrett completes Year-in-Review essay first draft.
- Supporting essay first drafts ready (Claude-drafted + Garrett-edited).
- Chapters 2–6 data export tooling tested (Codex delivers per `product/almanac-export-prd.md`).

### Q4 2026 (October – December): Production

**October 15: Content freeze.**
All chapters at first-draft state. From this point: edits only, no new content.

**October:**
- Pre-order page goes live on galaxysportsedge.com.
- Press outreach starts (per pre-order push in launch runbook).
- Copyeditor reviews all chapters.
- Garrett edits supporting essays (5–10 hours/week × 4 weeks).

**November:**
- Layout designer typesets full book.
- First proof PDF generated.
- Garrett + copyeditor review proof PDF.
- Round 2 layout corrections.
- Second proof PDF generated.

**December:**
- Final proof PDF locked December 1.
- Amazon KDP upload prepared.
- ISBN registered with KDP.
- Print test copy ordered + reviewed (cover quality, paper feel, binding).
- Print test issues corrected (one round only).
- Final upload to KDP December 15.
- KDP processes for 7 days.
- Pre-orders confirmed; Garrett's personal note sent to pre-orderers.

### Q1 2027 (January): Ship

**January 1–14:**
- Hardcover available for KDP-print and ship as orders process.
- Galaxy site /almanac page updated to show "in print, shipping now."
- Press cycle peak.

**January 15: Public ship date.**
- Digital edition release.
- Email blast to all Galaxy subscribers.
- Twitter thread, podcast appearances, etc. peak.

**January 16+ : Steady ship.**
- KDP fulfills hardcover orders on demand (no warehousing needed).
- Digital available immediately at purchase.
- Conference / bookstore distribution deferred to V2.

---

## Cover design brief

Send to cover designer when engaged.

```
Galaxy Almanac 2026 — Cover Design Brief

OBJECTIVE
Cover that signals "annual reference book of accountability" — not "betting tip
guide." Buyers who pick this up should think: this is the book that
sports analytics didn't think to publish before.

DIMENSIONS
6.14" × 9.21" hardcover. Trim, no bleed beyond standard.

FORMAT
- Hardcover with dust jacket.
- Spine readable when on shelf next to Baseball Prospectus and PFF Annual.
- Foil-stamp accent on cover and/or spine (subtle, not flashy).
- Premium matte cover stock.

TYPOGRAPHY
- Use Galaxy brand fonts (from brand pack v2).
- Title "The Galaxy Almanac 2026" — oversized, compressed.
- Subtitle "The year, on the record." — smaller, serif or condensed sans.
- Author signature: not required on front cover.
- Spine: title + year + Galaxy mark.

COLOR
- Restrained palette. Galaxy's existing brand palette (dark + accent) preferred.
- No metallic gold (too commercial). Bronze foil or matte black foil acceptable.
- Avoid: any sports-team colors, betting industry visual cues, "winner's circle"
  aesthetics.

IMAGERY
- Abstract or minimal. No photographs of athletes, stadiums, money, dice.
- Acceptable: typographic-only cover; geometric abstract motif; subtle
  Galaxy mark.
- The cover that wins competitor shelf-comparison is the cover that looks
  like a serious annual reference, not a sports product.

REFERENCE
- Visual reference: think Penguin Modern Classics covers, Stripe Press
  catalog, the redesign of Sherlock Holmes annuals — bookish, considered.
- Counter-reference: NFL Pro Football Yearbook (the photo-heavy
  newsstand-style cover) — explicitly NOT this aesthetic.

DELIVERABLES
- 3 cover concepts (1 typographic-only, 1 with subtle motif, 1 designer choice).
- Each concept includes front + spine + back at print quality.
- 2 rounds of revisions on selected concept.
- Final files in print-ready PDF + Adobe Illustrator source.

BUDGET
$5,000–$8,000 USD. Premium tier of cover design budget acceptable; this
cover represents the brand annually.

TIMELINE
- Brief sent: August 1.
- Concepts due: August 22 (3 weeks).
- Round 1 selection: August 25.
- Round 2 revisions: by September 12.
- Final files: September 20.

CONSTRAINT
The cover will be on a shelf next to better-known annuals from PFF and Baseball
Prospectus. Galaxy's cover does not need to outdo theirs on visual flash. It
needs to read as "this is what a serious annual looks like." Restraint is the
position.
```

---

## Distribution strategy

### V1 (2027 ship): Direct + Amazon

- **Direct sales:** Pre-order through galaxysportsedge.com. Stripe checkout. Customer-facing fulfillment via Amazon KDP's "Author Copies" program (Garrett orders bulk to ship; KDP processes; book lands at buyer's address with Amazon's KDP packaging).
- **Amazon retail:** KDP automatically lists on Amazon retail with the standard publisher discount applied. List price on Amazon = $99 hardcover / $39 digital.
- **No bookstores in V1.** Independent bookstore distribution requires Ingram / Lightning Source setup (~$200 one-time + per-title fees). Deferred to V2.
- **No publisher.** Galaxy retains 100% rights and royalties. No traditional publishing relationship at V1.

### V2 (2028 ship): Plus conference circuit + select bookstores

- Add: 3–5 select independent bookstore relationships (sports-analytics-friendly: Powell's, Tattered Cover, etc.).
- Add: distribution at sports analytics conferences if Galaxy has any presence.
- Add: audiobook on Audible + Spotify.

### V3+ (2029+): Optionally publisher

- Consider traditional publishing relationship if Almanac hits 10,000+ hardcover sales by V2.
- Trade-off: publisher provides bookstore reach + audiobook production + foreign rights, but takes 60–70% margin.
- Decision: not now. Revisit when sales prove the market exists at scale.

---

## Pre-order page (separate from the `/vault` landing — this lives at `/almanac`)

Copy lives in `copy/almanac-preorder-positioning.md` (Codex's existing positioning frame). The 5-section structure laid out in `audit/03-almanac-positioning-challenge.md` § "Top 5 sections for launch copy" is the canonical version.

This production pack assumes that copy is canonical and doesn't duplicate it.

---

## Marketing surfaces (October–January)

### Galaxy site banners
- `/board` and `/ledger` pages get a small "Pre-order the 2026 Almanac" banner from October 15 through January 15.
- After January 15: banner becomes "Now shipping: 2026 Almanac" through March 1.
- After March 1: banner removed; Almanac becomes a permanent menu item under "/almanac."

### Email
- **Pre-order open email:** sent to all Galaxy subscribers October 15. Single send. No follow-up unless Garrett decides post-customer-dev.
- **Launch email:** sent to all subscribers January 15. Different subject than pre-order email.
- **Vault digest mention:** the Wednesday digest closest to October 15 includes a single paragraph about Almanac pre-order opening. Same for the digest closest to January 15.
- No general-marketing drip campaign. Galaxy doesn't run those.

### Vault Discord
- Pre-order announcement in #vault-announcements (read-only channel) on October 15.
- Launch announcement on January 15.
- Founding-50 members get an additional personal note from Garrett: "Pre-orders are open. As a founding-50 member, your pre-order receives a signed copy + $20 off." (Manual personal-style send.)

### Press
- Use `galaxy-press-kit.md` for boilerplate and press constraints. Almanac press can reuse the Vault press target tiers from `copy/vault-launch-press-pack.md`, but with the angle: "Galaxy's annual record drops January 15."

---

## Editorial team

| Role | V1 source | V1 cost | V2+ note |
|---|---|---|---|
| Author (Chapter 1 + supporting essay edits) | Garrett | Time only — ~80 hours over 4 months | Year-2 audiobook narration: Garrett |
| Cover designer | 1099 contract | $5–8k | Same designer V2 if quality holds |
| Layout designer | 1099 contract | $3–5k | Could become recurring relationship by V2 |
| Copyeditor | 1099 contract | $1k–2k (40–60 hours @ $30/hr) | Same |
| Indexer | 1099 contract | $500–1k (V1 may DIY) | 1099 V2 |
| Audiobook narrator (V2) | Garrett | Time only | Outsource only if Garrett's voice has issues |

Total editorial cash cost V1: $10k–$17k. Books at 2,500 hardcover sold × $74 margin = $185k; books at 7,500 sold × $74 = $555k. Even at lower-end production cost + lower-end sales, the Almanac generates 10x+ its editorial cost.

---

## What this production pack deliberately does not include

1. **No specific page-layout templates.** The layout designer brings those to the project. Galaxy doesn't dictate layout beyond "premium reference book aesthetic" + brand fonts/colors.
2. **No specific marketing budget for paid ads.** Galaxy does not run paid social or paid search for the Almanac. The brand position rejects that.
3. **No book-tour or signing-event planning.** V1 keeps Galaxy distribution-light. V2 evaluates.
4. **No franchise / branding extensions.** No "Galaxy Almanac NFL Edition" or "Junior Almanac" or merchandise. The Almanac is the Almanac.
5. **No publisher pitch deck.** Galaxy is not raising via Almanac; no pitch is needed.

---

## Cross-references

- Positioning frame: `copy/almanac-preorder-positioning.md`
- Headline essay specimen: `copy/almanac-year-in-review-essay-specimen.md`
- Audit recommendations on positioning: `audit/03-almanac-positioning-challenge.md`
- Engineering data export: `product/almanac-export-prd.md`
- Launch runbook: `launch/almanac-preorder-runbook.md`
- Customer dev guide: `03-customer-development.md` § Almanac
- Decision log entry: `week-minus-1/06-decision-log-entry-templates.md` § DEC-NEXT-006

---

*The Almanac is Galaxy's most important brand asset over years. The first version is the seed. Production quality on V1 sets the bar for every Almanac that follows. Build the V1 like there will be 30 of them — because there might be.*
