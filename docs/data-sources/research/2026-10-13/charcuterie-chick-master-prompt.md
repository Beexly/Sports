# CHARCUTERIE CHICK — Master Build Prompt (v2, defuddled 2026-10-07)

Paste this as ONE prompt into your builder. It supersedes the Webdesign docx
brief and the v1 master prompt. The docx described a greenfield rebuild; this
prompt starts from reality: the fused build already exists and is live.

---

## 0. REALITY CHECK — READ FIRST, THIS IS THE JOB

- Client: Tricia Holfelder, Charcuterie Chick ("The Chick Goodies"), Tomball TX.
  Deal: Option C, the $1,500 immersive build, combining Sample 2 (Midnight
  Supper) + Sample 4 (the 3D moving table). Terms: $750 deposit on approval,
  $750 at launch (formal invoice INV-2026-CC02, 2026-09-24). NOTE: the invoice
  doc's header summary says $600/$900 — that is stale; the formal invoice and
  the client email inside the same doc both say $750/$750. Flag the header as
  a doc bug, do not "fix" pricing yourself.
- A fused build ALREADY EXISTS and is LIVE (verified HTTP 200 on 2026-10-07):
  https://charcuterie-chick-sample-2.vercel.app — 5 pages (home, menu.html,
  gallery.html, story.html, enquire.html) plus /table.html, the Three.js
  moving room with 5 stations. Vanilla HTML/CSS/JS, no build step, no React.
- YOUR JOB IS NOT A GREENFIELD REBUILD. It is: audit the live build against
  this spec, fix every defect, polish it to award standard, and ship it to
  charcuteriechick.ai. The Next.js 15 oryzo-grade rebuild from the docx is a
  possible Phase 2 — it is NOT this prompt.
- Code source of truth: Beexly/autonomous-revenue-engine,
  clients/chick-goodies/samples/sample-2-after-dark (+ samples/sample-3-studio/table.html).
  Edit ONLY inside clients/chick-goodies/. Push after every cycle.
- A separate Replit one-pager exists. It is not the deliverable. Ignore it.

## 1. VERIFIED CLIENT FACTS — SINGLE SOURCE OF TRUTH

If a value is not in this section, DO NOT print it on the site.

- Business: Charcuterie Chick ("The Chick Goodies") · Owner: Tricia Holfelder
- 11931 Brantley Haven Drive, Tomball, TX 77375 · 832-458-8180 ·
  charcuteriechick@outlook.com · Instagram @charcuteriechickhtx
- Service area: Tomball, The Woodlands, Spring, Conroe (North Houston)
- Taglines: "elegance without the cost" / "Where Flavor Takes The Lead"
- Bio (usable verbatim): "Houston's largest charcuterie cart." 35+ years in the
  restaurant industry, front and back of house. Scratch-made breads, jellies,
  and jams. One party at a time. Woman-owned. English and Spanish.
- Reputation: The Knot 5.0, 13 reviews, Best of Weddings 2026. Couples usually
  spend $2,350. Travels 100 miles. Starting price $500.
- Event types: weddings, corporate events, showers, holidays.

GRAZING TABLES — 50-guest minimum, 90 minutes service, $3/person per extra
half hour, 18% tax, $229 flat setup on every table:
- "Graze Me, Craze Me" $24/person · "Grazing Standard" $26/person ·
  "Super Graze" $30/person · "Grand Graze" $38/person ·
  "Holy Grail of Grazing" $2,000/75 guests, $3,500/150 guests
  (full inclusions per FACTS.md in the client folder)
- CARTS: Taco Cart $26.95 · Carts $24.50 · Slider Menu $2.95
- SWEETS: Cakes and Shakes $9.50 · Candy Bar Chick $5.00 ·
  Zeppole Beignet Chick $4.50
- SIPS: Bloody Mary Chick $6.50 · Mimosa Chick $4.00
- Boards & custom catering: PRICE ON REQUEST. Never print $0.00.
- 11 sliders, 11 dips, 6 salads, 4 meats (full lists in FACTS.md).

QUOTE CALCULATOR FORMULA (must compute exactly this):
total = (table $/person x guests + $229 setup) x 1.18 tax.
Enforce the 50-guest minimum on grazing tables. Verified totals:
holy 75 = $2,630.22 · holy 150 = $4,400.22 · grand 50 = $2,512.22 ·
super 50 = $2,040.22 · standard 50 = $1,804.22 · graze 50 = $1,686.22.
The form drafts a pre-filled SMS (832-458-8180) or email enquiry. It never
sends automatically, takes payment, or books anything.

## 2. ART DIRECTION — LOCKED

Midnight Supper fused with the moving table. Tokens from the live build:
ground #141010, ink #fbf7f0, ember #ff7a29, ember-glow rgba(255,122,41,.25),
gold/amber lantern light, copper accents. Candlelit, warm dark, never
studio-lit. (The docx's oryzo palette is aspiration reference only — the
shipped site keeps the Midnight tokens above.)
HARD RULES: no em dashes in copy, ever. Concrete nouns/verbs/numbers/places,
zero luxury filler, never adjectives like "breathtaking." Her real event
photos only. AI cleanup of HER photos is permitted; never invented or generic
AI food imagery; never reuse her Shopify stock images. No Beexly branding, no
proposal/pitch content on her pages. Quote requests only — no booking, no
availability promises, no response-time promises. Print 35 years, never 25.
Stacey's revised logo: portrait mark stays, but the phone number beside it
must be live tappable text (832-458-8180), never tiny lettering baked into
the image.

## 3. THE WORK — IN THIS ORDER

PHASE 1 — AUDIT. Crawl every live page at 390 / 1440 / 1920. List every
defect against this spec and against PLAN-CONTENT-STRATEGY.md sections
9.1–9.4 (known layout defects on record). Report the list BEFORE fixing
anything. DoD: a written defect list with page + viewport + cause.

PHASE 2 — DEFECTS. Fix all layout defects. Finish the 15 meta descriptions.
Remove mood captions from galleries and heroes. Verify the calculator against
all 6 verified totals above. Guard invalid inputs. Price-on-request items
never render $0.00. DoD: zero known defects, all 6 totals verified in the
browser.

PHASE 3 — THE TABLE. /table.html: 5 stations (Arrive, the tables, the cart,
Tricia, the number) in full Midnight art direction. One continuous camera
glide between stations, no section labels. Mobile photographic still
fallback. prefers-reduced-motion path. No-WebGL path. DoD: the room reads as
one continuous experience on desktop, and every fallback path works.

PHASE 4 — POLISH TO AWARD STANDARD. Sub-second mobile loads (verify, the
static stack should already do this). Local SEO: Schema.org JSON-LD
(FoodEstablishment, CateringService, FAQPage, founder Person), XML sitemaps,
unique meta per page, OG/Twitter cards, NAP consistency across
Tomball/The Woodlands/Spring/Conroe. Phone 832-458-8180 and Instagram
@charcuteriechickhtx visible without scrolling. Primary CTA above the fold:
"Check Your Date" or "Get a Quote in 60 Seconds." A high-intent buyer
self-qualifies in 5 seconds. DoD: every polish item verified live, not
claimed.

PHASE 5 — LAUNCH. DNS cutover for charcuteriechick.ai: A record @ →
76.76.21.21, CNAME www → cname.vercel-dns.com. Verify SSL, email/SMS
routing, and run the repo QA gates (tools/quality-gate.py, unittest suites,
e2e live crawl) before calling it done. DoD: the domain serves the finished
site, all gates green.

## 4. HOW YOU WORK

1. AUDIT FIRST, report before fixing. 2. ONE phase per turn — finish, verify,
   then move on. 3. SCOPE IS FROZEN: only files this build needs, inside
   clients/chick-goodies/. No React, no build step, no new dependencies. Do
   not refactor working code. Do not add features beyond this prompt. 4. NEVER
   GUESS: Section 1 is the only source of prices, terms, phone, markets, bio,
   reviews. Open question? Ask Garrett before building around it. 5. VERIFY
   every asset license and every external URL before use. 6. RESPOND TERSELY:
   no preamble, no play-by-play. Output the work and blocking questions only.
   7. CLOSE EVERY LOOP: build clean, frame checks, mobile checks, fallback
   checks. Fix failures before continuing. You are the verification loop.

## 5. DEFINITION OF DONE / FAILURE

DONE: zero defects from the Phase 1 audit; all 6 calculator totals verified
in-browser; all 5 stations + all fallbacks working; SEO/schema/sitemaps live;
logo + tappable phone correct; every number on the site traceable to
Section 1; charcuteriechick.ai serving the finished site with green QA gates.
FAILURE: any section labels; plastic-looking 3D food; native-scroll jank;
quote form buried; mobile under 30fps; vague luxury copy; stock photos as
food; a single printed number not in Section 1; the domain not cut over.

Begin with the Phase 1 audit. Do not fix anything until you have reported it.
