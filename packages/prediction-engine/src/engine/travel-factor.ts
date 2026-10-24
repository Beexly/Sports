/**
 * Travel factor — the L3 distance read, from the OSM Nominatim venue geocodes.
 *
 * Takes HOME/AWAY team CODES (BAL, CIN, ...), not display names, so the packet
 * shape stays abbreviations end to end. Emits a FactorDetail when both codes
 * resolve, or a named gap string when one is missing/unknown — never a zero.
 */
import type { FactorDetail } from "@sports/types";
import { travelMiles } from "../nfl/stadium-coordinates-c33";

export interface TravelFactorResult {
  readonly factor?: FactorDetail;
  /** Named gap: the exact reason no distance could be produced. */
  readonly gap?: string;
  readonly miles: number | null;
}

export function travelFactor(homeCode: string, awayCode: string): TravelFactorResult {
  const hc = (homeCode || "").trim().toUpperCase();
  const ac = (awayCode || "").trim().toUpperCase();
  if (!hc || !ac) {
    return { miles: null, gap: "team code missing on the packet (home='" + homeCode + "', away='" + awayCode + "')" };
  }
  const miles = travelMiles(hc, ac);
  if (miles === null) {
    return { miles: null, gap: "stadium geocode missing for " + hc + " or " + ac + " in stadium-coordinates-c33" };
  }
  return {
    miles,
    factor: {
      name: "Travel: " + hc + " to " + ac,
      impact: "neutral",
      weight: 2,
      description: miles + " miles venue-to-venue per OSM Nominatim geocodes (stadium-coordinates-c33).",
    },
  };
}
