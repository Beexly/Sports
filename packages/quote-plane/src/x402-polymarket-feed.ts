/**
 * Workstream 8 Hop 2 (`GSI & GSE 11_5 (1).docx`):
 * Read-Only Cross-Venue Price Discovery & x402 Telemetry Feed (`packages/quote-plane/src/x402-polymarket-feed.ts`).
 *
 * Respects the standing Polymarket compliance hold (`POLYMARKET_COMPLIANCE_HOLD = true`):
 * never executes or publishes Polymarket wagers, while ingesting read-only implied
 * probabilities alongside Kalshi CFTC-regulated contracts and DraftKings/Pinnacle
 * sportsbook quotes to measure lead-lag price discovery and Shin (1993) insider fraction `z`.
 */

export interface VenueImpliedQuote {
  readonly venue: "draftkings" | "pinnacle" | "kalshi" | "polymarket_readonly";
  readonly eventKey: string;
  readonly selection: string;
  readonly rawImpliedProb: number;
  readonly deViggedFairProb: number;
  readonly shinInsiderFractionZ: number;
  readonly observedAtIso: string;
  readonly complianceHold: boolean;
}

export interface CrossVenueLeadLagReport {
  readonly eventKey: string;
  readonly consensusFairProb: number;
  readonly sportsbookMidProb: number;
  readonly predictionMarketReadOnlyProb: number;
  readonly leadLagDivergenceBps: number;
  readonly polymarketComplianceHold: true;
  readonly executionAllowedOnSportsbookOnly: true;
}

export function shinDeVigTwoWay(probA: number, probB: number): {
  readonly fairA: number;
  readonly fairB: number;
  readonly overround: number;
  readonly shinZ: number;
} {
  const sum = Math.max(1e-6, probA + probB);
  const overround = Math.max(0, sum - 1);
  const shinZ = Math.min(0.25, overround / Math.max(1e-6, 2 * (sum - 0.5)));
  const denom = 1 - 2 * shinZ;
  const rawFairA = Math.max(0.001, (probA - shinZ) / Math.max(0.1, denom));
  const rawFairB = Math.max(0.001, (probB - shinZ) / Math.max(0.1, denom));
  const norm = rawFairA + rawFairB;
  return {
    fairA: Number((rawFairA / norm).toFixed(6)),
    fairB: Number((rawFairB / norm).toFixed(6)),
    overround: Number(overround.toFixed(6)),
    shinZ: Number(shinZ.toFixed(6)),
  };
}

export function buildCrossVenueLeadLagReport(
  eventKey: string,
  quotes: readonly VenueImpliedQuote[]
): CrossVenueLeadLagReport {
  const sbQuotes = quotes.filter((q) => q.venue === "draftkings" || q.venue === "pinnacle");
  const pmQuotes = quotes.filter((q) => q.venue === "kalshi" || q.venue === "polymarket_readonly");

  const sbMid =
    sbQuotes.length > 0
      ? sbQuotes.reduce((acc, q) => acc + q.deViggedFairProb, 0) / sbQuotes.length
      : 0.5;
  const pmMid =
    pmQuotes.length > 0
      ? pmQuotes.reduce((acc, q) => acc + q.deViggedFairProb, 0) / pmQuotes.length
      : sbMid;

  const consensus = 0.65 * sbMid + 0.35 * pmMid;
  const divergenceBps = Math.round((pmMid - sbMid) * 10000);

  return {
    eventKey,
    consensusFairProb: Number(consensus.toFixed(6)),
    sportsbookMidProb: Number(sbMid.toFixed(6)),
    predictionMarketReadOnlyProb: Number(pmMid.toFixed(6)),
    leadLagDivergenceBps: divergenceBps,
    polymarketComplianceHold: true,
    executionAllowedOnSportsbookOnly: true,
  };
}
