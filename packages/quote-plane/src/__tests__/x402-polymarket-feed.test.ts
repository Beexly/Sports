import { describe, expect, it } from "vitest";
import {
  buildCrossVenueLeadLagReport,
  shinDeVigTwoWay,
} from "../x402-polymarket-feed";

describe("x402-polymarket-feed", () => {
  it("computes normalized Shin (1993) de-vigged probabilities and enforces Polymarket compliance hold", () => {
    const devig = shinDeVigTwoWay(0.545, 0.5);
    expect(devig.fairA + devig.fairB).toBeCloseTo(1.0, 5);
    expect(devig.shinZ).toBeGreaterThanOrEqual(0);

    const report = buildCrossVenueLeadLagReport("NFL_2026_W9_JAX_BAL", [
      {
        venue: "draftkings",
        eventKey: "NFL_2026_W9_JAX_BAL",
        selection: "JAX -7.5",
        rawImpliedProb: 0.524,
        deViggedFairProb: 0.5,
        shinInsiderFractionZ: 0.02,
        observedAtIso: "2026-11-07T00:00:00Z",
        complianceHold: false,
      },
      {
        venue: "polymarket_readonly",
        eventKey: "NFL_2026_W9_JAX_BAL",
        selection: "JAX -7.5",
        rawImpliedProb: 0.54,
        deViggedFairProb: 0.535,
        shinInsiderFractionZ: 0.01,
        observedAtIso: "2026-11-07T00:00:00Z",
        complianceHold: true,
      },
    ]);
    expect(report.polymarketComplianceHold).toBe(true);
    expect(report.executionAllowedOnSportsbookOnly).toBe(true);
  });
});
