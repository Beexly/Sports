# Edge Angles — the aggressive, legal, proprietary catalog (2026-07-02)

Garrett: push limits, find what nobody has, exploit ERRORS in others' systems
for advantage, use wording as leverage, chase every 0.5%. 110% legal.

Here is the reframe that unlocks all of it: **"aggressive and legal" means
exploiting other people's ERRORS and INEFFICIENCIES, not breaching their
access.** The sportsbooks, the beat writers, the leagues, and the competitors
all make systematic, documented mistakes. Reading and modeling those mistakes
from public information is not just legal — it is the definition of edge. You
do not need to break a lock when the market keeps leaving money on the table in
plain sight.

## The one tripwire (named once, then we move on)
Exploiting a SECURITY or ACCESS-CONTROL error — an exposed API key, a leaked
internal endpoint, a misconfigured server that hands you data you were never
authorized to see — is CFAA territory (Van Buren: "exceeding authorized
access"). "They left it open" is not authorization. Everything below exploits
errors in how others PRICE, WORD, or MODEL public information — never errors in
how they SECURE it. That single line keeps us 110% legal while being ruthless.

## Tier 1 — Errors in book PRICING (the richest vein, mostly buildable now)

### A. Same-game-parlay correlation mispricing — the deepest structural error
Books price SGP legs as if independent (or with crude correlation haircuts).
Correlated outcomes (QB passing yards + WR receiving yards; team total + star
scorer) are therefore systematically MISPRICED. This is a documented, standing
error in book pricing engines. Our Parlay MRI already targets it; the edge is
to quantify the correlation from real joint distributions and surface where the
book's implied independence is wrong. Proprietary, legal (we publish analysis,
not bets), and the single highest-value quant angle. BUILDABLE — deepen the MRI.

### B. Positive-EV promo/boost detection — books' promo desks make EV errors
Books push odds boosts and profit boosts that are sometimes genuinely +EV
because the promo desk mis-set them relative to fair value. Surfacing +EV boosts
is a whole popular content genre and a legal exploit of THEIR error. We already
compute fair value (Shin devig); wiring a boost-EV scanner on top is a small
build with outsized acquisition value. BUILDABLE.

### C. Stale / slow retail-line detection — the lag IS the error
Retail books trail sharp consensus by measurable windows. With our multi-source
odds we can detect, in real time, where a specific book is N points off
consensus — legal information (we report the discrepancy, we don't place the
bet). Turn it into a "line-lag radar." Exploits the retail books' own slowness.
BUILDABLE on the odds we already ingest (deeper with a second odds vendor).

### D. Cross-book vig/hold arbitrage — the cheapest market to beat
Hold varies wildly by book and market type; some alt-lines and props carry far
lower hold. Identifying the lowest-hold path to a given position is legal edge
intelligence competitors rarely surface. BUILDABLE.

### E. The Book Accuracy Scoreboard — turn their errors into our marketing
Nobody publishes a rigorous, ongoing "which book is sharpest / slowest / most
often off-consensus" scoreboard. It's legal (public odds), viral, SEO gold, and
it weaponizes the books' OWN inconsistencies into GSE content that cites itself.
First-mover proprietary object. BUILDABLE.

## Tier 2 — Errors in WORDING (language as leverage, proprietary NLP)

### F. The beat-writer confidence lexicon — decode the hedge
Beat writers use graded language that maps to real outcome probabilities:
"expected to play" vs "should play" vs "targeting a return" vs "not ruled out"
carry different historical play rates. Building a lexicon that decodes hedged
public reporting into calibrated probabilities is proprietary NLP on public
text — "wording as leverage" literally. The error we exploit: the market treats
these as roughly equal; they are not. BUILDABLE (extends the RSS wire; the
classifier already exists, the graded lexicon is the upgrade).

### G. Injury-designation decoding, per team — the noise is decodable
"Questionable" has a historical play rate that DIFFERS BY TEAM AND COACH (some
staffs over-report, some under-report). The official designation is a noisy
signal with a team-specific decoder ring. Modeling per-team designation→play
rates from public injury reports + actives is a real, legal, proprietary edge.
The error: everyone treats "Questionable" as one number. BUILDABLE with the
injury intake.

### H. Our OWN wording as legal armor — the inverse leverage
The precise words "illustrative," "estimated," "reconstructed," "model's read,"
"not measured" are what let us SURFACE more while staying honest and legal (and
they're already load-bearing in the codebase). Disciplined language is a legal
weapon for US: it expands what we can publish without a claim we can't back.
ALREADY IN USE — keep extending the vocabulary deliberately.

## Tier 3 — Data nobody models (legal, tedious, proprietary by assembly)

### I. Officiating crew tendencies — the totals-blind spot
Referee/umpire crews have measurable tendencies (penalty rates, over/under lean,
home bias, strike-zone size) computable from public box scores + assignments.
Assignments post before lines fully adjust → a timing edge when a
whistle-happy or tight-zone crew is named. Most sites ignore it. The error:
books and public underweight crew identity. BUILDABLE once assignment feeds are
sourced (see Div-B research).

### J. Coaching fingerprints — tendencies from play-by-play
4th-down aggression, pace, timeout discipline, pass rate over expected — a
coach-fingerprint database from public play-by-play that few assemble rigorously.
Feeds game-script and total models. BUILDABLE on nflverse pbp.

### K. Microclimate stadium models — beyond generic weather
Specific stadiums have known wind-swirl and cold patterns generic forecasts
miss. Public weather + stadium geometry → a proprietary park-adjusted signal.
The error: generic weather models are stadium-blind. BUILDABLE with the weather
intake + a stadium factor table.

### L. The aggregation super-signal — the compounding proprietary object
None of I/J/K wins alone. Fused by our calibrated model into ONE composite that
no competitor has assembled, they compound. This is the least glamorous and most
defensible proprietary object: not a magic source, ten legal ones weighted by a
model only we have. This is where the 0.5%-per-angle actually accumulates into a
number that matters.

## Tier 4 — First-mover proprietary monopolies (legal by construction)

### M. Reconstruction-engine outputs — IP by construction (already built).
### N. Time-stamped proof history — a monopoly on our OWN past; nobody can
   copy a pre-committed record they don't have (receipts + slate roots).
### O. "Verified by GSE" as a B2B2C service to other cappers (Whop/Discord) —
   we're the only one who can cryptographically certify someone else's record.

## Where the 0.5%s actually live (build order)
1. SGP correlation (A) + boost-EV scanner (B) — biggest quant edge, both
   buildable on what exists. Exploit book pricing errors directly.
2. Beat-writer lexicon (F) + injury decoder (G) — proprietary NLP on public
   text, "wording as leverage," extends the wire.
3. Book Accuracy Scoreboard (E) + line-lag radar (C) — turn their errors into
   viral, self-citing content (acquisition + SEO).
4. Officiating (I) + coaching (J) + microclimate (K) → the aggregation
   super-signal (L) — the compounding proprietary composite.

Every one of these is 110% legal because it reads and models PUBLIC information
and OTHERS' PRICING/WORDING ERRORS — never their access controls, never
restricted data, never a fabricated number. That is the aggressive lane, and
it is wide open.
