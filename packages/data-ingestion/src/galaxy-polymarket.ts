/**
 * Galaxy Polymarket consensus — public Gamma GET, no API key.
 *
 * Compliance (docs/agent-skills/polymarket-hold):
 *   NOT wired into GalaxySportsApiOddsProvider (founder 2026-08-27: hold if not 100% legal).
 *   Parser kept for research. Do NOT enable /api/cron/gamma. Do NOT CLOB.
 */
import type { OddsApiEvent } from "@sports/types";

export const POLYMARKET_GAMMA_EVENTS_NFL =
  "https://gamma-api.polymarket.com/events?title=nfl&limit=50";

type Loose = Record<string, unknown>;

function parseJsonList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v) as unknown;
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonNums(v: unknown): number[] {
  const raw = parseJsonList(v);
  return raw.map(Number).filter((n) => Number.isFinite(n));
}

export function polymarketEventsToOddsApi(data: unknown, nowIso: string): OddsApiEvent[] {
  if (!Array.isArray(data)) return [];
  const out: OddsApiEvent[] = [];
  for (const ev of data as Loose[]) {
    const markets = (ev["markets"] as Loose[] | undefined) ?? [];
    for (const m of markets) {
      const q = String(m["question"] ?? "");
      const ql = q.toLowerCase();
      if (!ql.includes("nfl") && !ql.includes("will the")) continue;
      const outs = parseJsonList(m["outcomes"]);
      const prices = parseJsonNums(m["outcomePrices"]);
      if (outs.length !== 2 || prices.length !== 2) continue;
      out.push({
        id: `poly-${String(m["conditionId"] ?? ev["id"] ?? "")}`,
        sport_key: "americanfootball_nfl",
        sport_title: "NFL",
        commence_time: String(ev["startDate"] ?? ev["endDate"] ?? nowIso),
        home_team: q,
        away_team: "Polymarket market",
        bookmakers: [
          {
            key: "polymarket_consensus",
            title: "Polymarket (prediction market, keyless)",
            last_update: nowIso,
            markets: [
              {
                key: "h2h",
                last_update: nowIso,
                outcomes: [
                  { name: outs[0]!, fair_prob: Math.round(prices[0]! * 10000) / 10000 },
                  { name: outs[1]!, fair_prob: Math.round(prices[1]! * 10000) / 10000 },
                ],
              },
            ],
          },
        ],
      });
    }
  }
  return out;
}

export async function fetchGalaxyPolymarketNfl(
  fetchImpl: typeof fetch = fetch,
): Promise<OddsApiEvent[]> {
  try {
    const res = await fetchImpl(POLYMARKET_GAMMA_EVENTS_NFL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return polymarketEventsToOddsApi(data, new Date().toISOString());
  } catch {
    return [];
  }
}
