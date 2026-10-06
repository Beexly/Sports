# Situation signals vs quote-plane SituationSnapshot naming

Two different “SituationSnapshot” usages exist in GSE docs:

| Lane | Owner | Contents |
|------|-------|----------|
| **Situation signals (this folder)** | nflverse / ESPN plugins | Rest, roof, surface, weather, stadium, teams, kickoff — **no prices** |
| **Free-quote precedence packet 03** | `packages/quote-plane` | Book market-state merge ladder (Rundown→Sharp×3→Odds-free→Parlay→OddsPapi→Apify) |

Join seam: situation signal `eventId` is filled **from** a MarketQuote identity match. Quote planes must not write odds into situation signal objects.
