# Sample Pass List Entries — 5 Worked Examples

**Audience:** Garrett. Internal.
**Purpose:** The Pass List entry template is documented in `copy/pass-list-page-copy.md`. The samples below show one entry per category, demonstrating voice + structure.

**Status:** Sample / illustrative content. Use as voice-calibration reference for the first real Pass List entries.

---

## The 5 Pass List categories (recap)

1. **Methodology gap** — Factor model doesn't have a defensible call.
2. **Market efficiency** — Line is fairly priced; no edge.
3. **Personnel uncertainty** — Injuries or lineups too ambiguous.
4. **Insufficient data** — Sport or league coverage isn't mature enough.
5. **Brand-position consideration** — Rare; we don't publish even if methodology has a call.

---

## Sample Entry 1: Methodology gap

**Game:** Lakers vs Warriors, December 8.
**Category:** Methodology gap.
**Surfaced confidence:** 54%.
**Status:** Held.

---

The factor model surfaced Warriors -2.5 at 54% confidence. Below the 60% publication threshold; held.

Why the model couldn't get above 60%:

- **Quantitative performance** flagged both teams as recently inconsistent — Warriors +2.1 net rating over 10 games but with a high variance; Lakers +1.8 with similar volatility.
- **Situational context** offered modest signal (Warriors home, both teams on 1 day rest).
- **Personnel** was clean — no significant injuries.
- **Market efficiency** showed the line moving slightly but without a clear sharp signal.

In the model's read, this is a game where the four factor categories produce signals that nearly cancel out. Both teams are roughly competitive on aggregate; neither has a structural advantage the model can confidently surface.

A call at 54% confidence would be marketing, not methodology. Galaxy holds.

---

## Sample Entry 2: Market efficiency

**Game:** Chiefs vs Ravens, November 25 (Sunday Night Football).
**Category:** Market efficiency.
**Surfaced confidence:** 67% (above publication threshold).
**Status:** Held despite confidence.

---

The factor model surfaced Chiefs -1.5 at 67% confidence. Above the 65% publication threshold; would normally trigger a published call.

Why we're holding anyway:

The line for this game has been the most-traded NFL number of the week. The opening line was Chiefs -2.5; the line moved to Chiefs -1.5 over 72 hours with substantial volume on both sides. Late-week movement has been minimal, indicating market consensus around the current number.

When the methodology produces a 67% read on a number that the market has already heavily efficient-priced, the edge is in the gap between the model's read and the line. In this case, that gap is small: the model implies Chiefs are favored by ~1.8, the line is Chiefs -1.5, gap is 0.3 points.

Published calls require a defensible edge. A 0.3-point gap on a heavily-traded line isn't a defensible edge; it's noise within market-efficient pricing.

The methodology read is sound. The market has the same read. Galaxy doesn't publish when the market and the methodology agree.

---

## Sample Entry 3: Personnel uncertainty

**Game:** Eagles vs Cowboys, December 15.
**Category:** Personnel uncertainty.
**Surfaced confidence:** Not calculated.
**Status:** Held pending personnel clarity.

---

The factor model couldn't produce a confidence read because the personnel category had unresolved questions through Saturday evening.

Specifically:

- **Hurts (Eagles QB)** listed as "Questionable" on the Friday injury report with a finger injury affecting his throwing hand. The Eagles played him last week but his completion percentage dropped from 64% to 47%.
- **Lamb (Cowboys WR)** missed practice Thursday + Friday. Status unclear.
- **Both offensive lines** have multiple players on the injury report at varying severities.

The factor model treats Personnel as one of the four core categories. When personnel inputs are unresolved at this scale — multiple key players across both sides with active injury concerns — the model's outputs become unreliable. The Quantitative + Situational + Market categories may still produce signal, but Personnel is load-bearing for NFL games this close to game time.

Galaxy holds. If injury statuses clarify by Sunday morning, the model may surface a call closer to kickoff. If they don't clarify: this stays on the Pass List.

The discipline: don't publish a call when one of the four core factor inputs can't be trusted.

---

## Sample Entry 4: Insufficient data

**Game:** Toronto FC vs LAFC, MLS regular season, August 22.
**Category:** Insufficient data.
**Surfaced confidence:** Not calculated.
**Status:** Held; MLS not within current sport coverage.

---

Galaxy's current factor model covers NFL, NBA, MLB, and college football. MLS isn't in current coverage.

Why we're noting this on the Pass List rather than just silently not publishing:

Multiple Vault members have asked about MLS coverage this season. The methodology framework would extend to MLS in principle — factor categories (quantitative, situational, personnel, market) all apply — but the data ingestion pipeline + the factor weights aren't calibrated.

Adding MLS coverage requires:
- Historical match data for backtest calibration (~3 years minimum).
- Factor weight tuning for MLS-specific dynamics (CONCACAF Champions League fixture congestion, designated player rules, etc.).
- ~4-6 weeks of focused methodology work.

Galaxy isn't doing that work right now. Year-2 strategic question framework will examine whether MLS coverage is the right addition; member feedback is on the record for that question.

For this Toronto FC vs LAFC game specifically: held due to coverage gap, not methodology read. Galaxy doesn't make calls in sports outside its calibrated coverage.

---

## Sample Entry 5: Brand-position consideration

**Game:** Texas A&M vs Texas, November 30 (College Football, primetime).
**Category:** Brand-position consideration.
**Surfaced confidence:** 71% (well above publication threshold).
**Status:** Held despite confidence.

---

The factor model surfaced Texas -7.5 at 71% confidence. Strong publication candidate by standard methodology.

Why we're holding anyway:

This is the renewed Texas/Texas A&M rivalry game — first meeting since 2011, primetime national broadcast, peak public-betting attention week. The model's 71% read is sound; the factor inputs are clean.

But the brand-position calculation:

This game will be covered by every sportsbook, every prediction service, every Twitter analyst, every sports-radio host. A Galaxy call on it gets aggregated with that volume; the brand-position differentiation Galaxy works to build (restraint, methodology, transparency) doesn't compound when Galaxy publishes a call in the highest-volume content moment of the week.

The methodology read isn't wrong. The publication decision is brand-position discipline: Galaxy holds on heavy-volume primetime rivalries unless the factor model surfaces something genuinely contrarian to the market (e.g., a 72%+ confidence in the opposite direction of the line).

The model says Texas -7.5; the line is Texas -6.5; gap of 1.0 point. The model's read is in the direction the line is already moving. Not contrarian; not load-bearing.

Holding is brand-position discipline, not methodology weakness. The Pass List entry documents both that the call existed + the reason for not publishing.

---

## What these 5 samples demonstrate

Each entry:

1. **States the game + category clearly.**
2. **Names the confidence read** (or absence of one).
3. **Explains the specific factor-level reasoning** for the hold.
4. **Anchors the hold in the brand-position frame** ("methodology, not marketing").
5. **Closes with a clarifying line** that reinforces the Pass List discipline.

Entries are 200-400 words. Brief enough to skim, substantive enough to demonstrate the methodology actually engaged with the game.

---

## What the entries deliberately avoid

1. **No score predictions or "what we think might happen."** The Pass List records what didn't get published. Speculation is for the digest.

2. **No apologies for not publishing.** Restraint is the brand position.

3. **No sportsbook-specific references.** Galaxy doesn't single out books in Pass List entries.

4. **No celebrity / star-player promotion.** The Pass List names players for methodology context only.

5. **No "if you had bet X, you'd be up Y" counterfactuals.** Members do what they want with the methodology; Galaxy doesn't perform after-the-fact pick-tracking.

6. **No "we'll definitely publish next week" promises.** Each week's Pass List is its own honest record.

---

## Pass List cadence + volume

The Pass List target: 5-15 entries per week (varies by sport season + game density).

- NFL weeks (Sept-Feb): higher volume, ~10-15 entries.
- NBA / NHL seasons: lower per-game volume but daily entries; ~10-12 per week.
- MLB season: highest daily volume; ~12-20 per week.
- Off-season weeks: 3-5 entries.

If a week has <3 entries: investigate. The methodology should produce more held games than published ones. Low Pass List volume suggests over-publication.

---

## Pass List as Almanac material

The annual Almanac (per `copy/almanac-production-pack.md`) includes:

- Total Pass List count for the year.
- Distribution by category (which type of pass dominated).
- 3-5 most-substantive single Pass List entries reproduced.

The full Pass List archive at galaxysportsedge.com/pass-list is the public surface; the Almanac is the curated annual record.

---

## Cross-references

- Pass List page copy: `copy/pass-list-page-copy.md`
- Pass List entry template: `copy/pass-list-page-copy.md` § "Entry structure"
- Loss Room page copy: `copy/loss-room-page-copy.md`
- Methodology page copy: `copy/methodology-page-copy.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`
- Almanac production pack: `copy/almanac-production-pack.md`
- Year-2 strategic question framework (MLS / NHL expansion): `galaxy-year2-strategic-question-framework.md`

---

*The Pass List is Galaxy's most-quiet differentiator. Restraint published. The samples above demonstrate the voice; the real entries will be written from the same disciplines.*
