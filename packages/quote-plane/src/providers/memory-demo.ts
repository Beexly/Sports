/** Offline demo quotes — product never blocks on paid odds. */

import type { QuoteFetchRequest, QuoteLine, QuoteProvider } from "../types";
import { twoWayDevig } from "../devig/american";

const DEMO_EVENTS = [
  {
    eventId: "nfl-demo-1",
    sport: "NFL",
    home: "KC",
    away: "BUF",
    homeAm: -135,
    awayAm: +115,
  },
  {
    eventId: "nfl-demo-2",
    sport: "NFL",
    home: "PHI",
    away: "DAL",
    homeAm: -110,
    awayAm: -110,
  },
  {
    eventId: "nba-demo-1",
    sport: "NBA",
    home: "BOS",
    away: "NYK",
    homeAm: -150,
    awayAm: +130,
  },
] as const;

export function createMemoryDemoProvider(
  now: () => Date = () => new Date(),
): QuoteProvider {
  return {
    id: "demo.memory",
    kind: "synthetic_demo",
    rights: "internal_synthetic",
    requiresApiKey: false,
    phaseOutRole: "demo",
    async fetchQuotes(req: QuoteFetchRequest): Promise<QuoteLine[]> {
      const asOf = (req.asOf ? new Date(req.asOf) : now()).toISOString();
      const out: QuoteLine[] = [];
      for (const e of DEMO_EVENTS) {
        if (req.sport && e.sport !== req.sport && req.sport !== "MULTI") continue;
        if (req.eventId && e.eventId !== req.eventId) continue;
        const { pA, pB, overround } = twoWayDevig(e.homeAm, e.awayAm);
        out.push(
          {
            eventId: e.eventId,
            sport: e.sport,
            market: "h2h",
            selection: e.home,
            q: pA,
            rawAmerican: e.homeAm,
            quoteAsOf: asOf,
            sourceId: "demo.memory",
            sourceKind: "synthetic_demo",
            rights: "internal_synthetic",
            bookId: "demo",
            overround,
            confidence: 0.4,
            notes: "Offline demo — not a real book",
          },
          {
            eventId: e.eventId,
            sport: e.sport,
            market: "h2h",
            selection: e.away,
            q: pB,
            rawAmerican: e.awayAm,
            quoteAsOf: asOf,
            sourceId: "demo.memory",
            sourceKind: "synthetic_demo",
            rights: "internal_synthetic",
            bookId: "demo",
            overround,
            confidence: 0.4,
          },
        );
      }
      return out;
    },
  };
}
