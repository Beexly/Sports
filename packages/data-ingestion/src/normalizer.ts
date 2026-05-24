import type {
  OddsApiEvent,
  OddsApiScore,
  NormalizedGame,
  NormalizedOdds,
} from "@sports/types";
import { FRESHNESS_THRESHOLD_MS } from "./config";

export class DataNormalizer {
  normalizeGames(events: OddsApiEvent[]): NormalizedGame[] {
    return events.map((event) => ({
      externalId: event.id,
      sportKey: event.sport_key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: new Date(event.commence_time),
    }));
  }

  normalizeOdds(events: OddsApiEvent[], fetchedAt: Date): NormalizedOdds[] {
    const results: NormalizedOdds[] = [];

    for (const event of events) {
      for (const bookmaker of event.bookmakers) {
        for (const market of bookmaker.markets) {
          const base: Omit<
            NormalizedOdds,
            | "homePrice"
            | "awayPrice"
            | "drawPrice"
            | "spread"
            | "homeSpreadPrice"
            | "awaySpreadPrice"
            | "total"
            | "overPrice"
            | "underPrice"
          > & Partial<NormalizedOdds> = {
            gameExternalId: event.id,
            bookmaker: bookmaker.key,
            market: this.mapMarket(market.key),
            fetchedAt,
          };

          if (market.key === "h2h") {
            const home = market.outcomes.find(
              (o) => o.name === event.home_team
            );
            const away = market.outcomes.find(
              (o) => o.name === event.away_team
            );
            const draw = market.outcomes.find((o) => o.name === "Draw");
            results.push({
              ...base,
              market: "H2H",
              homePrice: home?.price,
              awayPrice: away?.price,
              drawPrice: draw?.price,
            });
          } else if (market.key === "spreads") {
            const home = market.outcomes.find(
              (o) => o.name === event.home_team
            );
            const away = market.outcomes.find(
              (o) => o.name === event.away_team
            );
            results.push({
              ...base,
              market: "SPREADS",
              spread: home?.point,
              homeSpreadPrice: home?.price,
              awaySpreadPrice: away?.price,
            });
          } else if (market.key === "totals") {
            const over = market.outcomes.find((o) => o.name === "Over");
            const under = market.outcomes.find((o) => o.name === "Under");
            results.push({
              ...base,
              market: "TOTALS",
              total: over?.point ?? under?.point,
              overPrice: over?.price,
              underPrice: under?.price,
            });
          }
        }
      }
    }

    return results;
  }

  validateFreshness(fetchedAt: Date): boolean {
    const age = Date.now() - fetchedAt.getTime();
    return age < FRESHNESS_THRESHOLD_MS;
  }

  normalizeScores(
    scores: OddsApiScore[]
  ): Array<{
    externalId: string;
    homeScore: number | null;
    awayScore: number | null;
    completed: boolean;
  }> {
    return scores.map((score) => {
      const homeScoreEntry = score.scores?.find(
        (s) => s.name === score.home_team
      );
      const awayScoreEntry = score.scores?.find(
        (s) => s.name === score.away_team
      );

      return {
        externalId: score.id,
        homeScore: homeScoreEntry ? parseInt(homeScoreEntry.score, 10) : null,
        awayScore: awayScoreEntry ? parseInt(awayScoreEntry.score, 10) : null,
        completed: score.completed,
      };
    });
  }

  private mapMarket(key: string): "H2H" | "SPREADS" | "TOTALS" {
    switch (key) {
      case "h2h":
        return "H2H";
      case "spreads":
        return "SPREADS";
      case "totals":
        return "TOTALS";
      default:
        throw new Error(`Unknown market key: ${key}`);
    }
  }
}
