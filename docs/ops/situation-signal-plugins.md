# Situation signal plugins (nflverse / ESPN context plane)

**Track:** Galaxy Sports Edge SituationSnapshot (context plane — **not** free-quote precedence)
**Hard wall:** No moneylines / spreads / totals / `consensusDeviggedProb*` on this plane.
**TeamRankings:** HELD while Beexly/Sports PR #884 is open — do not touch.

## What this is

Additive documentation + a TypeScript join helper. Runnable Agent Plugins (nflverse-situation, espn-situation) stay workspace-side until Sports has a `plugins/` home.

Free-quote precedence (Rundown→Sharp×3→Odds-free→Parlay→OddsPapi→Apify) lives in `situation-snapshot.ts` / packet 03. **Do not conflate:** situation plugins emit rest/stadium/weather context; quote-plane owns prices.

## Join to MarketQuote

Implemented in `packages/quote-plane/src/situation-join.ts`:

1. `sport` equal
2. home/away (abbr↔full normalize)
3. `commenceTime` within **±12 hours**
4. Fill `eventId` from quote only — never invent; ambiguous → null
5. Never copy price keys onto the situation snapshot

## Stack

Stacked after #893 (free-quote precedence). ESPN/nflverse plugins remain offline stubs outside this repo until a plugin home exists.
