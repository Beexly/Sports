# Situation signal plugins (workspace drop-in)

**Track:** Galaxy Sports Edge SituationSnapshot (context plane — **not** free-quote precedence)  
**Date:** 2026-09-23  
**Hard wall:** No moneylines / spreads / totals / `consensusDeviggedProb*` on this plane.  
**TeamRankings:** HELD while Beexly/Sports PR #884 is open — do not touch.

## What this is

Additive documentation + a small TypeScript join helper for Beexly/Sports wiring. The runnable Agent Plugins stay **workspace-side** until Sports has a plugin home:

| Artifact | Path |
|----------|------|
| nflverse situation plugin (offline-green) | `/workspace/nflverse-situation-plugin` |
| ESPN / stats_team situation plugin (offline stub) | `/workspace/espn-situation-plugin` |
| Shared join (eventId fill-only, ±12h) | `/workspace/situation-join` |

Packet `03-situationsnapshot-free-quote-precedence.md` and `/workspace/gse-launch/quote-plane-situation-snapshot/` encode **quote** free-ladder precedence (Rundown→…→Apify). **Do not conflate** with this situation-signal lane: situation plugins emit rest/stadium/weather context; quote-plane owns prices.

## SituationSnapshot (shared shape)

See `/workspace/situation-snapshot-packet.md`. Join to `MarketQuote`:

1. `sport` equal  
2. home/away (abbr↔full normalize)  
3. `commenceTime` within **±12 hours**  
4. Fill `eventId` from quote only — never invent; ambiguous → null  

## Stack PRs (recommended)

1. **PR A — nflverse situation** (already offline 8/8): drop plugin or document + join helper.  
2. **PR B — ESPN situation** (stacked): additive second free lane + same join.  

Prefer keeping plugins under `/workspace` (or a future `plugins/` tree) and landing only:

- `docs/ops/situation-signal-plugins.md` (copy of this README)  
- `packages/quote-plane/src/situation-join.ts` (or `packages/data-ingestion`) — eventId fill-only helper  

…into Beexly/Sports if Sports has no Agent Plugin home yet.

## Apply

See `../APPLY/APPLY.md` for Beexly OpenCode bunny steps. **Do not open the GitHub PR from the box.**
# Situation signals vs quote-plane SituationSnapshot naming

Two different “SituationSnapshot” usages exist in GSE docs:

| Lane | Owner | Contents |
|------|-------|----------|
| **Situation signals (this folder)** | nflverse / ESPN plugins | Rest, roof, surface, weather, stadium, teams, kickoff — **no prices** |
| **Free-quote precedence packet 03** | `packages/quote-plane` | Book market-state merge ladder (Rundown→Sharp×3→Odds-free→Parlay→OddsPapi→Apify) |

Join seam: situation signal `eventId` is filled **from** a MarketQuote identity match. Quote planes must not write odds into situation signal objects.
