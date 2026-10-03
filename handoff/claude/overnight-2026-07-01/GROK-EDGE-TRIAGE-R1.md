# Grok Edge Round 1 — Deep Triage + the Gold Grok Missed (2026-07-02)

Grok returned Division 1 partial: alt-line ladder no-arb violation [PROPOSED]
and teasers [PROPOSED, no number]. Honest tags, real source (Princeton thesis),
honest empty on teasers. Good discipline. But it left the actual gold on the
table because it asked the WRONG QUESTION about every edge. Here is the deep read.

## THE META-UNLOCK Grok missed (this rescues half the "weak" items)
Grok evaluated every edge as **"is this +EV to BET after vig and limits?"** That
is a bettor's test. GSE is **CONTENT, not a book and not a bettor.** The right
test is: **"does this produce a PROPRIETARY, PROVABLE SIGNAL that improves our
published number or our track record?"**

Under the bettor's test, alt-arbs are "rare/transient/-EV after vig" (Reddit is
right) and teasers are "no published edge" — both look weak. Under the CONTENT
test they are both valuable, because we never have to place the bet or beat the
limit — we only have to extract a cleaner number than the book published, and
prove it. The vig and the limit, which kill the bettor, do not touch us. Every
edge Grok marked weak-because-not-bettable should be re-scored under this lens.

## GOLD #1 — the alt ladder is a FREE PROBABILITY DISTRIBUTION, not an arb
Grok chased cross-book arbitrage (book A vs book B) — the tired, -EV, everyone-
scans-it version. The proprietary gold is INTERNAL to a single book's own ladder:
- A book's alt-spread ladder (-3.5, -4.5, -5.5, -6.5 ...) and alt-total ladder
  over-DETERMINE an implied margin/total distribution. De-vig the WHOLE ladder
  and you recover a fuller, more informative implied distribution than the single
  headline line — a distribution the book is GIVING AWAY in public odds.
- Where the ladder is internally INCONSISTENT (non-monotonic implied probs,
  kinks, fat/thin tails vs a coherent model), that inconsistency is itself a
  proprietary signal: it marks where the BOOK is uncertain or lazy. Call it a
  "book conviction score" per game — tight, coherent ladder = high conviction;
  kinky, wide ladder = the book is guessing, and guessing is exploitable.
- This connects DIRECTLY to GSE's existing Shin-devig + conformal stack. It is
  buildable now on ladder data, and it is NOT what Reddit debunked (we are not
  betting the arb; we are reading the distribution).
Reframed test: not "% of ladders that are +EV to bet," but "does the ladder-
implied distribution + its inconsistency score PREDICT outcomes / beat the
headline line out-of-sample." That is a content edge, and it is proprietary.

## GOLD #2 — INTERNAL cross-market coherence (more persistent than cross-book arb)
Within a SINGLE book, structurally-linked markets must cohere: 1st-half +
2nd-half ≈ full game; the two team totals ≈ the game total; spread + total imply
a joint margin/total distribution that the moneyline must respect. When a book's
OWN markets violate their internal coherence, one of the legs is mispriced — and
you don't need a second book, so the Reddit "-EV after cross-book vig" critique
doesn't apply. Each violation names a mispriced leg to EXTRACT as a signal.
Persistence: higher than cross-book arb, because it requires the book to keep
every derivative market mutually consistent in real time — which they measurably
do not. [BUILDABLE on licensed odds; PROPOSED as an edge pending the test.]

## GOLD #3 — teasers reframed: the discrete-margin edge, not a betting tip
Grok found "no teaser number" and stopped. The DURABLE insight underneath
teasers is the discrete margin-of-victory distribution: NFL margins spike hard
at 3 and 7, and a book's continuous, roughly-linear alt pricing cannot fully
price a spiky discrete reality. The edge is not "buy teasers" — it is MODEL the
empirical discrete margin distribution and surface where the book's continuous
line misprices the discrete truth around key numbers. That is a distribution-
modeling edge that plugs into our reconstruction work, and it is publishable
content. The teaser is just one crude way to harvest it; we can harvest it
directly and honestly as a signal.

## LEGAL PRECISION Grok glossed (important)
Grok's (c) said "reading offered odds, no CFAA (Van Buren)" — correct on CFAA,
but it SKIPPED the contract/ToS layer. Scraping FanDuel/BetMGM alt ladders
DIRECTLY may breach their browsewrap ToS even where it isn't a CFAA crime. The
clean lane: get alt-ladder data through a LICENSED odds vendor (OpticOdds,
Unabated, etc. — the ones that already aggregate props/alts), not by scraping
the books ourselves. Same data, no ToS exposure. This is the difference between
the legal lane and a tripwire, and it was the load-bearing detail Grok waved past.

## NUMBERS-LAW nit
The "~4.52%" from the Princeton thesis is used ambiguously — frequency of arbs?
return per arb? duration? Pin its EXACT definition from the source before it is
ever quoted anywhere near the product. A number without its unit is a future
fabrication waiting to happen.

## Net: what to actually build from Round 1
1. Ladder-distribution extractor + book-conviction (internal-inconsistency)
   score — on licensed ladder data, scored out-of-sample. [BUILDABLE]
2. Internal cross-market coherence checker (halves/team-totals/spread-total-ML)
   → mispriced-leg detector. [BUILDABLE]
3. Discrete-margin key-number model feeding the published number. [BUILDABLE,
   connects to reconstruction]
All three are CONTENT signals, licensed-data-clean, and proprietary — the exact
gold the bettor's-EV framing hid.
