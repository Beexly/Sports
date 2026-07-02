# The Loophole Edge Map — aggressive, legal, proprietary (2026-07-02)

Garrett wants loopholes: the "they didn't do X, so we can do Y" edges that make
GSE proprietary. Here is the honest engineering of that instinct.

## The one distinction that decides everything

There are two things the word "loophole" can mean, and for THIS company they
point in opposite directions:

- **Asymmetry loopholes** — legal edges competitors *could* take but *don't*,
  because they're too lazy, too unsophisticated, or too slow. These are the
  whole business. Attack them at maximum aggression.
- **Enforcement loopholes** — illegal or ToS-violating moves you make hoping
  nobody sues a small player. For a normal company these are a risk tradeoff.
  For GSE they are **self-defeating**, because the product IS trust and
  verifiability. A trust brand caught working an enforcement loophole doesn't
  pay a fine and move on — it loses the only thing it sells. The moat and the
  enforcement-loophole are the same asset spent two ways.

So the strategy is not timidity. It is: **win by doing the legal work nobody
else will, not the illegal work nobody else dares.** The legal edges are the
BIGGER prize because they compound (data flywheel, proof history) while the
illegal ones are one-time bets that detonate. Below, the aggressive-legal
arsenal — then the three tripwires, with the strategic (not moral) reason each
ends the company.

## The arsenal — legal loopholes to demolish (ranked by edge × defensibility)

### 1. The Facts Loophole (Feist v. Rural, 1991) — ALREADY OURS
Facts and statistics are not copyrightable. Competitors pay for "official
data"; we lawfully extract the FACTS from any lawful source and compute our
OWN objects on them. The reconstruction engine is the purest expression: it
MANUFACTURES proprietary tracking-derived features from cleared aggregates.
Nobody has our model's output because nobody built our model. This is the
deepest loophole in the whole book and we already own it. Push it: every new
derived object (GSE Rating, reconstructed separation, composite indices) is
IP by construction, license-free.

### 2. The Public-Records Loophole (FOIA) — UNDER-EXPLOITED, DO IT
State university CFB programs are public bodies: contracts, some travel
manifests, coaching agreements, certain records are FOIA-disclosable.
Competitors do not file FOIA — it's tedious and unglamorous. That's the point:
tedium is a moat. Legal, free, and produces data literally no rival has.
Action: pilot a FOIA request program for 2-3 target CFB programs; measure what
comes back before scaling.

### 3. The ADS-B Travel Loophole — LEGAL PHYSICS NOBODY MODELS
Aircraft transponders broadcast position in the clear; the FAA data is public.
Tail-number → team charter mapping yields a travel-and-fatigue signal built
from free, legal data. (Caveat: some COMMERCIAL ADS-B aggregators impose their
own terms — use the public broadcast / a permissively-licensed feed, and cite
the published travel-fatigue effect sizes rather than inventing them.) This is
a real edge because it's public + tedious + few bother.

### 4. The Terms-Silent Endpoint Loophole — MAP IT (A1 research)
Some public JSON endpoints carry NO assented terms (true browsewrap, no
notice). Facts pulled from those are the cleanest legal position (Feist +
hiQ + Van Buren limit copyright and CFAA exposure). The move: prefer
terms-silent or permissive sources; extract FACTS not expression; attribute;
respect robots/rate limits as evidence of good faith. This is legal edge, not
enforcement edge — the distinction is whether you're taking facts from an open
door or forcing a locked one.

### 5. The Second-Market Referee Loophole (already built: edge-engine)
Using Kalshi / an exchange as an INDEPENDENT fair-value estimator to referee
the sportsbook's price. Legal, public, and few do it rigorously. It's the fix
for "the market grading itself." Push: wire more independent estimators
(Poisson team-rates, the reconstruction features) so edge is only claimed
where two independent legal signals agree.

### 6. The Aggregation Loophole — the composite nobody assembles
Each public signal is individually weak (weather, travel, refs, rest, public
betting splits, air quality, altitude). The COMBINATION, weighted by our own
calibrated model, is proprietary and no competitor has assembled it. This is
the least glamorous and most durable edge: not one magic source, but ten legal
ones fused. The reconstruction + scoring stack is the vehicle.

### 7. The Transparency Loophole (inverse) — a moat they legally cannot copy
Everyone else hides their record because they can't prove it. Radical
cryptographic transparency (SHA-256 receipts, /verify, slate Merkle roots) is a
"loophole" in trust: a competitor cannot copy our history because they don't
HAVE our time-stamped, pre-committed history. First-mover on proof is a legal
monopoly on our own past. Push: publish the daily slate root (already
designed), make the verify surface the marketing centerpiece.

### 8. The Timing Loophole — legal information arbitrage
Publishing a read on PUBLIC information (injury report, weather, lineup) before
the market fully prices it in is legal speed arbitrage. We already gate on
freshness; the edge is being faster and more disciplined on public signals than
retail books' bettors. Legal, and pure execution.

### 9. The Structure Loophole (counsel-gated, but real)
Being CONTENT, not a book (no bet acceptance) keeps us out of sportsbook
licensing. Skill-contest framing (not chance) keeps free pick'em out of
gambling law. Affiliate-not-vendor structuring changes which registrations
apply. These are legal-structuring edges competitors assume they can't take.
Real, but each is a lawyer question, not a self-serve one — A1/A2/A3/E7 memo.

## The three tripwires — where "loophole" becomes "the end"

1. **Scraping ToS-restricted feeds hoping browsewrap is unenforceable.** One
   C&D and GSE becomes "the picks site that got sued for stealing data." The
   asset is scrutiny-survival; do not spend it to save a vendor fee. (Buy the
   feed, or use a terms-silent/permissive source.)
2. **Big Data Bowl / NFL+ computer vision.** BDB terms REQUIRE destruction of
   the data; NFL+ prohibits automated extraction. This is the lawsuit that ends
   a solo founder — and the reconstruction engine already gives us the legal
   substitute (manufactured, not taken).
3. **Disclosure gymnastics on the win rate / testimonials.** The product IS
   honesty. A deceptive edge here is a contradiction that voids the moat AND
   invites the exact FTC/UDAP tout-enforcement file that killed prior services.
   The honest 51.5% beats a dishonest 60% for a company whose whole pitch is
   "you can check us."

## The reframe to carry
The loophole thesis is CORRECT — just point it at the legal asymmetries, which
are bigger and compound. The sentence that captures the whole strategy:
**"We did the tedious, legal, provable work they were too lazy or too slow to
do — and we can prove it."** That is a moat. "We took data we weren't supposed
to and hoped" is a fuse. Same energy, opposite outcome.
