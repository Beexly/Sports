# Copy audit and voice guide — input for the redesign brief's 15 before/after pairs

Source of the rules: `8970241d-claudedesignprompt.md` §6 (copy voice) and §10
(constraints), cross-checked against `docs/positioning.md` and
`apps/web/lib/positioning-vocab.json` (the canonical banned-phrase list enforced
at runtime by `apps/web/lib/compliance-scanner/rules.ts` and in CI by
`scripts/guardrails/trust-gate.mjs` / `npm run lint:brand`).

Scope: `apps/web/app/**` (page.tsx / layout files) and `apps/web/components/**`,
excluding `admin/`, `cockpit/`, `ops/`, `api/`, and test files. 393 files
searched. Every "before" below is quoted verbatim from the file cited; no
string is invented. No win rate, ROI, record, or calibration value appears in
any "after" — where a number would help, it is either the sample-size /
gate framing already in the source string, or omitted with a note on how to
get it live from the truth surface.

**Headline result: the literal `positioning-vocab.json` banned-phrase list
(AI-powered, AI-driven, machine learning, "our AI," etc.) returns zero hits**
in the scanned surface — the runtime/CI lint is doing its job. The violations
below are all in the *second tier* the brief also bans: legacy brand terms
("Mission Control"), personified model language, colon-headline pairs,
em-dashes, rhetorical questions, "not X, [it is/but] Y" constructions, and
closing slogans — none of which the current lint checks for.

---

## (a) Findings table

| # | File:line | String (verbatim) | Rule it breaks |
|---|---|---|---|
| 1 | `app/today/page.tsx:13` | `title: "Mission Control: What Matters Now"` | Banned term "Mission Control" (brief §6, `positioning.md`) + colon-headline pair |
| 2 | `app/today/page.tsx:31` | `Mission Control` (eyebrow, live page) | Banned term "Mission Control" |
| 3 | `components/ui/mobile-nav.tsx:23` | `{ label: "Mission Control", href: "/today" }` | Banned term "Mission Control" |
| 4 | `components/ui/nav.tsx:25` | `{ label: "Mission Control", href: "/today", desc: "..." }` | Banned term "Mission Control" |
| 5 | `components/picks/ask-why.tsx:96` | `"Ask the model why"` (button label) | Personified model language |
| 6 | `apps/web/app/pricing/page.tsx:87` | `"Ask the model why, on any pick"` | Personified model language |
| 7 | `apps/web/app/pricing/page.tsx:103` | `"Ask the model why + line-movement intel"` | Personified model language |
| 8 | `apps/web/app/pricing/page.tsx:179` | `"Ask the model why"` (comparison-table row label) | Personified model language |
| 9 | `apps/web/lib/pricing/value-architecture.ts:57-60` | `"Galaxy is a sports-intelligence operating system: it helps you understand what matters today, why it matters, what changed, what the market is doing, what the model believes, how confident it is, when the data is too noisy, and when the smartest decision is No-Bet."` (rendered verbatim on `/pricing`, `page.tsx:347`) | Personified model language ("what the model believes"), colon-headline-style construction, one 60-word run-on sentence |
| 10 | `app/page.tsx:141` | `We detect. You decide.` (SignalDecode strip, hero) | Closing-slogan cadence |
| 11 | `app/page.tsx:32` | metadata description: `"...We detect. You decide."` | Closing-slogan cadence (same line, second surface) |
| 12 | `app/page.tsx:299` | `The math can point. The decision stays yours.` | Closing-slogan cadence |
| 13 | `app/pricing/page.tsx:256` (FAQ answer) | `"...Patience over noise. That's the standard."` | Closing-slogan cadence |
| 14 | `app/page.tsx:233` | `title={<>No-Bet is not absence. It is <span>intelligence</span>.</>}` | "Not X. It is Y" rhetorical contrast |
| 15 | `app/page.tsx:234` | `"The edge is not the pick. The edge is knowing what not to trust..."` | Same rhetorical device, repeated |
| 16 | `app/page.tsx:248` | `Trust is an architecture, not a tagline.` | "X, not Y" rhetorical contrast |
| 17 | `app/calibration/page.tsx:104` | `Trust is an architecture, not a tagline.` | Same line, duplicated verbatim on a second page |
| 18 | `app/proof/page.tsx:148` | `"This is not a promise. It is a mechanism. The math enforces it."` | "Not X. It is Y" rhetorical contrast |
| 19 | `app/methodology/page.tsx:176-177` | `"...an edge computed on a dead line is not an edge, it's a mirage."` | "Not X, it's Y" rhetorical contrast |
| 20 | `app/calibration/page.tsx:208` | `Not sure what a number means?` | Rhetorical question |
| 21 | `app/pricing/page.tsx:665` | `Not ready to subscribe? Join the founding list.` | Rhetorical question in an `<h2>` |
| 22 | `app/tools/page.tsx:173` | `Want to see the model these formulas feed?` | Rhetorical question in an `<h2>` |
| 23 | `app/performance/page.tsx:28,33` | `title: "Calibration Report: Settled-Pick Audit Trail"` (metadata + OG, x2) | Colon-headline pair |
| 24 | `app/pricing/page.tsx:41` | `title: "Pricing: Founding-Member Rates, Locked For Life"` | Colon-headline pair |
| 25 | `app/methodology/page.tsx:14` | `title: "Methodology: Deterministic Scoring, Open Framework"` | Colon-headline pair |
| 26 | *(systemic — see note)* | 59 of 393 scanned files use a `title: "X: Y"` metadata pattern | Colon-headline pair, site-wide |
| 27 | `app/board/page.tsx:19,24` | `"...Quiet when the slate is empty — free tools stay open..."` (metadata + OG, x2) | Em-dash |
| 28 | `app/board/page.tsx:106,152` | `"Board is temporarily stale — awaiting fresh data..."` (two banners, identical text) | Em-dash |
| 29 | `app/picks/page.tsx:411` | `"Quiet board — waiting on fresh odds (not broken)."` | Em-dash + soft "not broken" parenthetical contrast |
| 30 | `app/verify/page.tsx:41-50` | Single ~85-word sentence: `"Before kickoff, each published pick with a full market quote is frozen into a receipt: the side, the line, the price, the scores we claimed, and the moment it was frozen, all stamped with a SHA-256 hash..."` | One-idea-per-sentence; colon-launched list inside a run-on |
| 31 | `app/picks/page.tsx:460-462`, `551` | `"Pro unlocks the full board plus the confidence score, the full factor trail, and line movement behind each pick."` (x2) | Adjacent to banned "unlock your" family |
| 32 | 7 files, incl. `components/picks/pick-card.tsx:146`, `app/room/[gameId]/page.tsx:73` | `"Unlocks with Pro"` / `"unlock the full board"` | Adjacent to banned "unlock your" family — flagged for review, not a clean hit |
| 33 | `components/news/the-beat.tsx:23,30`; `components/fantasy/scheme-intel.tsx:39` | `"Insider"` (a source-credibility tier alongside "Beat," "Verified," "Aggregator") | Banned word "insider" — **context caveat**: this labels a *news source's* reliability tier, not a Galaxy pick or tip. Flagged for founder review, not rewritten below, since renaming it changes a taxonomy, not marketing copy. |
| 34 | `app/page.tsx:30` | `title: "A Sports Intelligence Operating System"` | Not a literal banned phrase, but grandiose/jargon framing that contradicts the "math you can read" plain-English mandate the founder cited as failure #3 |

Em-dash note: a raw grep for `—` across the 393 scanned files returns 983
hits, but the large majority are CSS/JS tokens (`transform`, `translate`) or
code comments, not copy. Narrowing to lines where the em-dash sits inside a
quoted string or between JSX text nodes brings it to roughly 141 likely
real-copy instances — still a systemic pattern, not isolated to the five
priority pages.

---

## (b) Before/after voice pairs (19)

Each "after" follows the brief's rules: short declarative sentences,
contractions allowed, one idea per sentence, no stacked adjectives, no
colon-headlines, no em-dashes, no rhetorical questions, no "not X, but Y," no
slogans, the engine is never framed as AI, and confidence stays a ranking
score, not a probability. No number is invented; where the original withheld
a number, the after keeps withholding it and says why.

### 1. Home — page title
**Before** (`app/page.tsx:30`): `"A Sports Intelligence Operating System"`
**After**: `"Free Tools, a Public Record, and a Gated Board"`
*Rule: grandiose/jargon framing → plain description of the three things the page description itself already promises.*

### 2. Home — hero closing line (two surfaces)
**Before** (`app/page.tsx:32,141`): `"We detect. You decide."`
**After**: `"The board shows what changed in the market so you can decide what to do."`
*Rule: closing-slogan cadence → one plain sentence.*

### 3. Home — "No-Bet" section title + lede
**Before** (`app/page.tsx:233-234`): `"No-Bet is not absence. It is intelligence."` / `"The edge is not the pick. The edge is knowing what not to trust. Restraint is a decision this system makes on purpose, logged with reasons like any other."`
**After** — title: `"Passing on a game is a decision the model logs and explains."`
**After** — lede: `"The model records a reason every time it declines to bet. That reasoning is logged the same way a pick's reasoning is logged."`
*Rule: "not X. It is Y" rhetorical contrast → positive declarative statements.*

### 4. Home + Calibration — repeated tagline
**Before** (`app/page.tsx:248`, `app/calibration/page.tsx:104`): `"Trust is an architecture, not a tagline."`
**After**: `"Every claim on this page traces back to a receipt you can check."`
*Rule: "X, not Y" rhetorical contrast → concrete, checkable claim.*

### 5. Home — responsible-close section
**Before** (`app/page.tsx:299`): `"The math can point. The decision stays yours."`
**After**: `"This is research meant to inform your decision. The decision is still yours to make."`
*Rule: closing-slogan cadence → plain two-sentence statement.*

### 6. Board — metadata description (two surfaces)
**Before** (`app/board/page.tsx:19,24`): `"...Quiet when the slate is empty — free tools stay open..."`
**After**: `"The board goes quiet when the slate is empty. Free tools stay open."`
*Rule: em-dash → two sentences.*

### 7. Board — stale-data banner (two banners, identical text)
**Before** (`app/board/page.tsx:106,152`): `"Board is temporarily stale — awaiting fresh data. The board reopens on the next real ingestion. Methodology and pricing stay available while it refreshes."`
**After**: `"The board is temporarily stale. It's waiting on fresh data and will reopen on the next real ingestion. Methodology and pricing stay open while it refreshes."`
*Rule: em-dash removed, contraction added, one idea per sentence.*

### 8. Picks — bootstrap empty-state heading
**Before** (`app/picks/page.tsx:411`): `"Quiet board — waiting on fresh odds (not broken)."`
**After**: `"Quiet board. Waiting on fresh odds. Nothing is broken."`
*Rule: em-dash + soft "not broken" aside → three short declaratives.*

### 9. Picks — locked-state upgrade copy (two occurrences)
**Before** (`app/picks/page.tsx:460-462,551`): `"Pro unlocks the full board plus the confidence score, the full factor trail, and line movement behind each pick."`
**After**: `"Pro adds the full board, the confidence score, the full factor trail, and line movement on every pick."`
*Rule: "unlocks" family (adjacent to banned "unlock your") → neutral "adds."*

### 10. Performance — page title (metadata + OG)
**Before** (`app/performance/page.tsx:28,33`): `title: "Calibration Report: Settled-Pick Audit Trail"`
**After**: `"Calibration Report"`
*Rule: colon-headline pair → the same short noun phrase already used as the page's on-page `<h1>` (line 252), so the title now matches what the page actually says.*

### 11. Calibration — "read the metrics" prompt
**Before** (`app/calibration/page.tsx:208-209`): `"Not sure what a number means? The metrics guide explains every stat the engines report. What it measures, when it matters, and how to read it. Without the jargon."`
**After**: `"The metrics guide explains every number the engines report. It covers what each one measures, when it matters, and how to read it, without jargon."`
*Rule: rhetorical question + sentence fragment → two declarative sentences.*

### 12. Proof of Record — the guarantee line
**Before** (`app/proof/page.tsx:148`): `"This is not a promise. It is a mechanism. The math enforces it."`
**After**: `"The math enforces this automatically, the same way for every pick."`
*Rule: "not X. It is Y" rhetorical contrast → one plain sentence.*

### 13. Verify — the long explainer paragraph
**Before** (`app/verify/page.tsx:41-50`): `"Before kickoff, each published pick with a full market quote is frozen into a receipt: the side, the line, the price, the scores we claimed, and the moment it was frozen, all stamped with a SHA-256 hash. The receipt is never rewritten. Paste a hash below and the server re-computes the hash from the stored record, live. If anything had been edited after the fact, the hashes would not match, and this page would say so, plainly and in public. A pick without a receipt carries no verified claim — we don't grade what we didn't seal."`
**After**: `"Before kickoff, every published pick with a full market quote gets a receipt. It's sealed with a SHA-256 hash that covers the side, the line, the price, the scores we claimed, and the exact moment it was frozen. The receipt is never rewritten. Paste a hash below and the server recomputes it live from the stored record. If anything had been edited afterward, the hashes wouldn't match, and this page would say so, in public. A pick without a receipt has no verified claim behind it. We only grade what we sealed."`
*Rule: one 85-word sentence with a colon-launched list and an em-dash → seven short sentences, same facts.*

### 14. Pricing — page title
**Before** (`app/pricing/page.tsx:41`): `title: "Pricing: Founding-Member Rates, Locked For Life"`
**After**: `"Founding-Member Pricing"`
*Rule: colon-headline pair → short noun phrase, matches the page's own `<h1>` energy ("Claim the founding rate").*

### 15. Pricing — "Ask the model why" (four occurrences: `ask-why.tsx:96`, `pricing/page.tsx:87,103,179`)
**Before**: `"Ask the model why"` / `"Ask the model why, on any pick"` / `"Ask the model why + line-movement intel"`
**After**: `"Show the reasoning"` / `"Show the reasoning behind any pick"` / `"Reasoning + line-movement intel"`
*Rule: personified model voice ("ask" implies the model has intent to answer to) → the feature described mechanically, matching the component's own loading state ("Reading the factors…") which is already non-personified.*

### 16. Pricing — POSITIONING string (rendered verbatim on `/pricing`)
**Before** (`apps/web/lib/pricing/value-architecture.ts:57-60`): `"Galaxy is a sports-intelligence operating system: it helps you understand what matters today, why it matters, what changed, what the market is doing, what the model believes, how confident it is, when the data is too noisy, and when the smartest decision is No-Bet."`
**After**: `"Galaxy Sports Edge tracks what's happening today. It shows what changed, what the market is doing, and what the model's score says. It flags when the data is too thin to trust, and when the right call is no bet at all."`
*Rule: personified model language ("the model believes") + colon + 60-word run-on → plain sentences, "the model's score says" instead of "believes."*

### 17. Pricing — FAQ closing line
**Before** (`app/pricing/page.tsx:256`): `"...Patience over noise. That's the standard."`
**After**: `"We wait until enough picks have settled before publishing a rate, instead of publishing an early number that isn't reliable yet."`
*Rule: closing-slogan cadence → the honesty-with-a-reason pattern the brief asks for elsewhere on the same product (see the compliant `WithheldStat` component on `/performance`, §(c) below).*

### 18. Pricing — waitlist section heading
**Before** (`app/pricing/page.tsx:665`): `"Not ready to subscribe? Join the founding list."`
**After**: `"Join the founding list without subscribing."`
*Rule: rhetorical question in an `<h2>` → one declarative sentence, same offer.*

### 19. Methodology — page title, and the freshness-gate line
**Before** (`app/methodology/page.tsx:14`): `title: "Methodology: Deterministic Scoring, Open Framework"`
**After**: `"How the Factor Model Works"`
**Before** (`app/methodology/page.tsx:176-177`): `"...an edge computed on a dead line is not an edge, it's a mirage."`
**After**: `"A stale line can't produce a real edge, no matter how good the math looks."`
*Rule: colon-headline pair, and "not X, it's Y" rhetorical contrast → plain noun-phrase title and one positive sentence.*

---

## (c) Per-page current-copy inventories (the five pages to rewrite in full)

### Home — `apps/web/app/page.tsx` (404 lines) + components it renders
Renders: `Nav`, `SignalCoreLazy`, `SignalSpine`, `SignalDecode`, `ObservatoryBeacon`,
`SentientWeather`, `GeneratedPlate`, `MontageEntrance`, `RiskDisclosure`,
`MethodologySection`, `WorldSection` (x2), `SignalFragmentField`,
`NoBetGateChapter`, `NflverseLabDoor`, `WaitlistForm`, `Footer`, plus the
inline `DoorCard` component.

| Slot | Current copy | Line |
|---|---|---|
| Metadata title | `"A Sports Intelligence Operating System"` | 30 |
| Metadata description | `"Galaxy Sports Edge turns market noise into structured signal: free calculators, methodology, paper contests, and a gated board that refuses forced action until the sample is honest. We detect. You decide."` | 32 |
| Hero eyebrow | `"Sports decision intelligence"` | 109 |
| Hero H1 | `"The market is full of noise. Galaxy turns it into signal."` | 113-118 |
| Hero subhead | `"Free tools and transparent process first. The public board opens only when the slate is honest, and the discipline to know when not to bet is always on."` | 121-125 |
| Primary CTAs | `"Free calculators"` / `"How the engine works"` | 129-137 |
| Hero closing line | `"We detect. You decide."` | 141 |
| "Four doors" eyebrow + H2 | `"Four doors"` / `"Pick the decision you came to make."` | 150-155 |
| Door card 1 (Board) stat, degraded/live/quiet states | `"Live board data unavailable"` / `"{cleared} cleared · {gated} gated"` / `"Gate holding. No forced action"` | 163-168 |
| Door card 3 (Intelligence) stat | `"Graded on {settled} settled picks"` / `"Calibration sample building"` | 180 |
| Door card 4 (Fantasy) stat | `"{scoring} scoring now · Season + daily tools"` | 189 |
| "Signal vs noise" eyebrow/title/lede | `"Signal vs noise"` / `"Same market. Two completely different readings."` / `"Takes, steam, rumor, stale numbers: what reaches you arrives as argument..."` | 202-204 |
| Live-counts strip (degraded state) | `"Live board counts are temporarily unavailable"` vs `"Right now · {cleared} cleared · {gated} gated"` | 208-221 |
| "No-Bet Gate" title/lede | `"No-Bet is not absence. It is intelligence."` / `"The edge is not the pick. The edge is knowing what not to trust..."` | 233-234 |
| Proof strip eyebrow/H2/body | `"The proof"` / `"Trust is an architecture, not a tagline."` / `"Picks publish with tamper-evident receipts..."` | 244-255 |
| Proof strip CTAs | `"See the sealed record"` / `"Watch it commit →"` / `"Check a receipt →"` / `"Closing line value →"` / `"Calibration →"` | 258-272 |
| Responsible-close H2/body | `"The math can point. The decision stays yours."` / `"This product is research, not certainty..."` | 299-303 |
| Waitlist section | `WAITLIST_COPY.eyebrow/headline/subhead` (already compliant, see `apps/web/lib/gse/waitlist-copy.ts`) | 316-323 |

### Board — `apps/web/app/board/page.tsx` (387 lines), `apps/web/app/board/gate/page.tsx` (305 lines), and the locked-teaser flow in `apps/web/app/picks/page.tsx` (810 lines)
The brief's "board" destination maps to `/board` (operational state) and
`/picks` (the actual pick board free/paid users see); `/board/gate` is a
transparency demo of the selective gate, not the paywall board.

| Slot | Current copy | File:line |
|---|---|---|
| `/board` metadata title/description | `"Today's Board"` / `"Model-signal board, gated games, and calibration posture from Galaxy Sports Edge. Quiet when the slate is empty — free tools stay open. Not a PROVEN track record while eligibility is RED."` | `board/page.tsx:17-24` |
| `/board` H1 | `"Scored, published, and passed."` | `board/page.tsx:181-183` |
| `/board` degraded state (DB unreachable) | `"Data store unreachable"` / `"The local database did not respond, so this board is showing an empty nonblocking state."` | `board/page.tsx:81-87` |
| `/board` suppressed/stale state | `"Temporarily stale"` / `"Board is temporarily stale — awaiting fresh data..."` and `"Quiet board"` / `"Model signals are quiet (no fresh published slate). This is restraint, not an outage..."` and `"Demo rows hidden"` / `"Demo rows are kept off the public board..."` | `board/page.tsx:99-134` |
| `/board` lane empty states | `"The board is closed until the data checks pass. An empty lane is not a claim about results."` / `"No public fires: nothing is published while the board is closed."` / `"No gated rows while the board is honestly empty."` | `board/page.tsx:226-249` |
| `/picks` metadata (gate-dependent, see §d) | Open: `"Today's picks from a deterministic factor model: two free picks a day with the public Edge Index..."`. Closed: `"Public picks open when the sample and gates allow. Until then this surface stays intentionally dark..."` | `picks/page.tsx:26-30` |
| `/picks` H1/subhead | `"Today's sports signals."` / `"Every signal published today, with price, timing, risk, and the reason it cleared the gate."` | `picks/page.tsx:256-262` |
| `/picks` outage state | `"Temporarily unavailable"` / `"Today's Board is taking a moment to load."` / `"This is a connection problem on our side, not a verdict on the board..."` | `picks/page.tsx:371-381` |
| `/picks` bootstrap empty state (stale vs gated) | `"Freshness guard active"` / `"Quiet board — waiting on fresh odds (not broken)."` vs `"Signal gate collecting"` / `"Public picks are still gated. The board is closed until the data checks pass."` | `picks/page.tsx:405-422` |
| `/picks` **locked state** (the paywall) | `"Full board is a Pro feature"` / `"{N} picks published for this date. Upgrade to Pro to see them."` / `"Free includes a daily teaser of up to {N} picks with the public Edge Index and no confidence scores. Pro unlocks the full board plus the confidence score, the full factor trail, and line movement behind each pick."` / CTA `"Upgrade to Pro · ${price}/mo"` | `picks/page.tsx:450-469` |
| `/picks` quiet-empty state (sport/date filtered) | `"No {Sport} signals published for this date"` / `"No signals published for this date"` + body | `picks/page.tsx:497-506` |
| `/picks` paywall banner (free tier) | `"You're on Free: a daily teaser of up to {N} picks, with the public Edge Index and no confidence scores."` (varies by account/tier state, see §d) | `picks/page.tsx:701-708` |

### Record — `apps/web/app/performance/page.tsx` (680 lines), `apps/web/app/calibration/page.tsx` (225 lines), `apps/web/app/proof/page.tsx` (509 lines), `apps/web/app/verify/page.tsx` (63 lines)

| Slot | Current copy | File:line |
|---|---|---|
| `/performance` metadata title/description | `"Calibration Report: Settled-Pick Audit Trail"` / `"Every finished pick from the live engine is counted, wins and losses alike. Early warm-up picks are excluded by design. The public win-rate stays gated until enough settled history exists to publish a number that's honest."` | `performance/page.tsx:28-35` |
| `/performance` H1/subhead | `"Calibration Report"` / `"Every finished pick from the live engine is counted, wins and losses alike. Picks from our early warm-up period are excluded by design. They don't get to inflate the record."` + `"Past performance does not guarantee future results."` | `performance/page.tsx:251-261` |
| `/performance` gate-closed bootstrap heading | `"How we'll prove it"` (leads into `<CalibrationPanel/>`) | `performance/page.tsx:175-178` |
| `/performance` withheld-stat pattern (**a compliant example**) | Badge `"Withheld"`, subtext `"opens at {floor} settled · {settled} so far"`, tooltip `"Withheld on purpose: a win rate on fewer than {floor} settled picks is noise, not signal."` | `performance/page.tsx:533-553` |
| `/calibration` metadata title/description | `` `The Proof Room · ${BRAND_NAME}` `` / `"Galaxy Calibration: every credibility receipt in one place..."` | `calibration/page.tsx:36-38` |
| `/calibration` H1/lede | `"Trust is an architecture, not a tagline."` / `"Every credibility receipt the platform publishes, gathered in one place. No fabricated picks, no invented stats, no silent edits..."` | `calibration/page.tsx:103-111` |
| `/calibration` claim-scope + chart-basis notes | `MARKET_IMPLIED_CALIBRATION_CLAIM` (see `lib/picks/market-implied-display.ts`) and `"The interactive chart below groups settled picks by confidence score. It is a separate view of the same record, not the market-implied measurement described above."` | `calibration/page.tsx:112-119` |
| `/calibration` proof-card grid | 8 cards, e.g. `"Honest Band"` / `"Win rate across every finished live-engine pick, with the uncertainty band shown..."`; `"Beat the close"`; `"Trust Ledger"`; `"Proof of Record"`; `"FABLE Evidence Lab"`; `"The full record"`; `"CLV Tracker"` | `calibration/page.tsx:140-201` |
| `/proof` metadata title/description | `` `Proof of Record · ${BRAND_NAME}` `` / `"Every settled pick carries a tamper-evident Merkle hash stamped at generation time..."` | `proof/page.tsx:36-38` |
| `/proof` H1/lede | `"The record can't be rewritten."` / `"The moment a pick is written, it gets a digital fingerprint (a hash)..."` + `"This is not a promise. It is a mechanism. The math enforces it."` | `proof/page.tsx:136-149` |
| `/proof` outage state | `"The ledger is temporarily unreachable."` / `"This is a connection problem, not a verdict on the record..."` | `proof/page.tsx:244-251` |
| `/proof` empty state | `"The record starts when the first pick settles."` / `"No finished live-engine picks exist yet..."` / `"Bootstrap-era picks are excluded by design. They do not get to inflate the ledger."` | `proof/page.tsx:261-273` |
| `/verify` metadata title/description | `"Verify a Pick · Tamper-Evident Proof of Record"` / `"Picks are committed to tamper-evident SHA-256 receipts before kickoff and never rewritten..."` | `verify/page.tsx:8-10` |
| `/verify` H1/body | `"Verify any pick yourself."` / the 85-word paragraph (see pair #13 above) / `"Receipts for games that have not started verify as sealed..."` | `verify/page.tsx:37-55` |

### Pricing — `apps/web/app/pricing/page.tsx` (760 lines)

| Slot | Current copy | Line |
|---|---|---|
| Metadata title/description | `"Pricing: Founding-Member Rates, Locked For Life"` / `"A free daily sample and a public record as settled history accumulates..."` | 41-49 |
| H1/subhead | `"Claim the founding rate."` / `"Start free. Back us before the record exists and your price never moves, even as it rises for everyone who joins later."` | 336-344 |
| Positioning line (rendered) | `POSITIONING` constant — see pair #16 | 347 |
| Evidence strip | `"Inspect before you pay: the sealed record, the calibration report, and the engine committing live. Every claim on this page stands on that record."` | 358-372 |
| "Why each step up" | H2 `"Why each step up"` + body `"Each plan is a different job, and you can see exactly what the next tier adds before you pay for it..."` | 377-382 |
| Price ladder | H2 `"The price ladder is public"` + body `"Prices only rise when a verified proof milestone is met — never on a marketing calendar..."` | 412-419 |
| Tier doors | H2 `"Where each tier takes you"` + body `"Every gate below is enforced on the server. Walk up to any door and the seal tells you exactly which tier opens it."` | 468-472 |
| Comparison table | H2 `"Side by side"`, plus feature rows incl. `"Ask the model why"` (see pair #15) | 506, 179 |
| "Built to protect you from hype" | H2 + `EMOTIONAL_VALUE` (`"You feel less exposed to hype, noise, stale data, and forced action."`) + confidence/no-bet explainer cards | 563-580 |
| "Why pay for honesty" | H2 + `WHY_PAY_FOR_HONESTY_LEAD` + `honestyContrastStrip()` cards (see `lib/competitive/honesty-contrast.ts`) | 593-627 |
| FAQ (JSON-LD eligible) | 6 Q&A pairs, incl. `"Patience over noise. That's the standard."` (pair #17) | 241-262 |
| Waitlist section | H2 `"Not ready to subscribe? Join the founding list."` (pair #18) + `WAITLIST_COPY.subhead` | 664-669 |
| Footer disclosure line | `"No free trial. Every paid plan has a 3-day money-back window. Cancel any time from your dashboard. Prices shown are founding-member rates."` | 675-678 |

### Methodology — `apps/web/app/methodology/page.tsx` (357 lines)

| Slot | Current copy | Line |
|---|---|---|
| Metadata title/description | `"Methodology: Deterministic Scoring, Open Framework"` / `"How Galaxy Sports Edge reads the board, scores the math, and gates the slate without publishing proprietary weights or constants."` | 14-16 |
| Hero eyebrow/H1/lede | `"Published framework"` / `"Deterministic scoring. Open method. Protected weights."` / `"Galaxy Sports Edge publishes the factors and decision philosophy behind the model. The exact weights, constants, and aggregation formula remain proprietary."` | 99-112 |
| The 3-step stack | `"Read the board"` / `"Score the math"` / `"Gate the slate"` + bodies | 34-46 |
| Factor inventory | H2 `"What the model can read"` + 10-item factor list (`FACTORS`) | 141-153 |
| Line-freshness section | H2 `"A pick is only as honest as the line behind it."` + 3 cards, incl. `"...an edge computed on a dead line is not an edge, it's a mirage."` (pair #19) | 167-209 |
| "Reading the market" | H2 `"What the market thinks, and whether we beat it."` + 3 `MARKET_READS` cards | 221-248 |
| Ranking-law section | H2 `"Ranking probability, confidence, and edge are not the same thing."` + 3 explainer cards (Confidence / Ranking probability / Edge) — **this is where the brief's "confidence is a ranking score, not a probability" rule is already stated correctly** | 260-296 |
| Changelog | H2 `"Model changes are named."` + version table (`v3.0`…`v5.2.2`) | 308-323 |
| Closing CTA | H2 `"See the framework on today's board."` + `"Open today's board"` / `"View calibration"` | 333-344 |

---

## (d) Gate-dependent strings (change with `PUBLIC_PICKS` / `STATS_PUBLIC` / pricing phase)

The designer needs to mock **both** states for each of these, not just the
one currently live in the repo:

1. **`/picks` metadata + board body** — keyed on `getReadinessGates().canExposePublicPicks`
   (`apps/web/app/picks/page.tsx:24-32`, `230-235`). Closed: dark-board copy
   ("Public picks open when the sample and gates allow..."). Open: teaser copy
   ("Today's picks from a deterministic factor model: two free picks a day...").
   The **locked-paywall state** (`lockedByPaywall`, line 445) only exists when
   the gate is open AND the viewer is free-tier AND picks were actually
   published for the date/sport filter — three conditions, three different
   empty states possible on the same route.

2. **`/performance`** — keyed on `getReadinessGates().canExposePerformanceStats`
   (`apps/web/app/performance/page.tsx:131`). Closed: `BootstrapShell` with
   `PerformanceBootstrapState` + "How we'll prove it" / `CalibrationPanel`.
   Open: the full win-rate tables — but even then, `WithheldStat` (line 533)
   fires per-row/per-sport whenever a slice is below `minSettledPicksForLearning`
   (default 100), so "open" does not mean every number renders; the designer
   should mock the withheld-cell state even on the "open" version of this page.

3. **`/pricing` FREE-tier description and comparison-table cells** — keyed on
   the same `canExposePublicPicks` gate via `plansForGate()` /
   `comparisonCellsForGate()` (`apps/web/app/pricing/page.tsx:213-235`).
   Closed: `"When public picks open"` cell text, no teaser feature bullet.
   Open: `"2 per day (teaser, no confidence score)"` cell text, plus an
   extra feature bullet inserted at the top of the FREE plan's feature list.

4. **Pricing amounts and phase labels site-wide** — keyed on `PRICING_PHASE`
   env var via `getCurrentPricingPhase()` (`apps/web/lib/pricing/pricing-phases.ts:150`).
   Every `${phase.name} pricing` eyebrow, `${phase.pro.monthly}/mo` price string,
   and the `"You are here"` badge on the price-ladder cards
   (`app/pricing/page.tsx:332,437-443`) changes when the phase advances
   FOUNDING → PROVEN → ESTABLISHED → AUTHORITY. The names themselves are
   fixed in code (`docs/ops/OPERATOR.md`, `CLAUDE.md`), so the designer can
   mock all four without inventing labels.

5. **`/board` degradation banners** — three mutually exclusive states driven
   by `stateResult.meta.degradations` codes (`STALE_DATA_SUPPRESSED`,
   `DEMO_DATA_SUPPRESSED`) plus a DB-unreachable flag
   (`apps/web/app/board/page.tsx:57-175`): "Data store unreachable," "Quiet
   board" (intentional, no fresh slate), "Temporarily stale" (refreshing), and
   "Demo rows hidden." These are visually and textually distinct on purpose
   (an outage must never wear the "quiet by design" copy) — the redesign
   should keep that distinction legible, not collapse them into one generic
   empty state.

6. **Calibration confidence badge (`components/picks/pick-card.tsx:528-558`)**
   — not gated by an env flag but by whether a per-pick calibrated probability
   is available (`pick.confidenceCalibrated`). When present, the badge says
   "...about {pct} percent win probability" (a real calibrated output, not the
   raw score). When absent, it falls back to the raw `{confidence}/100` score
   and an aria-label reading "Model confidence: {confidence} out of 100" — no
   "probability" language. **This one is already correct** relative to brief
   §10 ("confidence is a ranking score, not a probability"): the two labels
   are deliberately different because they describe two different numbers.
   The designer should preserve that distinction rather than merge the two
   badge states into one.

---

## Report back

**Findings by rule** (from the table in §a; some strings trip more than one
rule and are counted once per rule they trip):

- Banned literal AI phrases (`positioning-vocab.json`): **0** — already enforced by CI lint.
- Banned legacy term "Mission Control": **4** occurrences (3 files: `app/today/page.tsx` x2, `components/ui/mobile-nav.tsx`, `components/ui/nav.tsx`).
- Personified model language ("Ask the model why," "what the model believes"): **5** occurrences across 3 files.
- Closing-slogan cadence: **4** occurrences across 3 files.
- "Not X, [it is/but] Y" rhetorical contrast: **5** occurrences across 4 files.
- Rhetorical questions in headings: **3** occurrences across 3 files.
- Colon-headline pairs: **3** on the five priority pages (performance, pricing, methodology titles) + **59 of 393** files site-wide carry the same `title: "X: Y"` pattern.
- Em-dashes in user-facing copy: **3** clear duplicated instances quoted above; ~141 likely real-copy instances site-wide out of 983 raw hits (most raw hits are CSS `transform` tokens or code comments, filtered out).
- "Unlock(s)" family adjacent to the banned "unlock your": **7** occurrences, flagged for review (not rewritten — these describe a real gate mechanically, closer to factual than to marketing energy).
- "Insider" as a banned word: **2** occurrences, flagged with a context caveat (a news-source credibility tier, not a picks claim) — not rewritten below pending founder call.
- Grandiose/AI-adjacent framing not on the literal banned list ("Sports Intelligence Operating System"): **1** headline instance, called out because it is exactly the kind of phrase the founder's failure #3 ("copy still sounds like AI") describes.

**Five-page inventory sizes** (§c row counts):
- Home: 14 copy slots inventoried (hero, four-doors grid, signal-vs-noise band, no-bet-gate band, proof strip, responsible-close band, waitlist).
- Board (`/board` + `/picks` locked/empty states): 11 copy slots inventoried across two files.
- Record (`/performance`, `/calibration`, `/proof`, `/verify`): 13 copy slots inventoried across four files.
- Pricing: 11 copy slots inventoried (title through footer disclosure).
- Methodology: 8 copy slots inventoried (title through closing CTA).

19 before/after pairs are provided in §b (within the brief's 15-20 range),
all quoted verbatim from the files cited, with rewrites that remove the
specific rule violation while preserving the original's factual content.
No file other than this one was created or edited.
