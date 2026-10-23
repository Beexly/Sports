import { describe, it, expect } from "vitest";
import {
  NeuroSymbolicVetoError,
  renderPublicBoardOrSocialCard,
  verifyAndBrandCausalReceipt,
  type RawPredictionPayload,
} from "../verification/neuro-symbolic-z3-verifier";

const base = (): RawPredictionPayload => ({
  gameId: "2026-10-22-NE-CHI",
  asOfIso: "2026-10-22T23:45:00Z",
  selection: "OVER 50.5",
  marketType: "TOTAL",
  calibratedProb: 0.574,
  complementProb: 0.426,
  marketImpliedDeVigProb: 0.5,
  edgeVsMarket: 0.074,
  publishState: "PLAY",
  bitmaskSha256: "abc",
  corpusItemsLoaded: 3143,
  corpusItemsEvaluated: 2162,
  mindRecordsLoaded: 5148,
  mindApplicablePrinciplesCount: 12,
  mentionedActivePlayerIds: ["CHI-QB-WILLIAMS"],
  officialInactivePlayerIds: ["CHI-LB-EDWARDS"],
  narrativeWindMph: 5.1,
  sensorWindMph: 5.1,
  narrativeTempF: 56.6,
  sensorTempF: 56.6,
  narrativeLine: 50.5,
  liveBookLine: 50.5,
});

describe("fail-closed chaos", () => {
  it("vetoes a wind drift above 2 mph", async () => {
    const bad = { ...base(), sensorWindMph: 12 };
    await expect(verifyAndBrandCausalReceipt(bad)).rejects.toBeInstanceOf(NeuroSymbolicVetoError);
  });

  it("vetoes an inactive player named as active", async () => {
    const bad = { ...base(), mentionedActivePlayerIds: ["CHI-LB-EDWARDS"] };
    await expect(verifyAndBrandCausalReceipt(bad)).rejects.toBeInstanceOf(NeuroSymbolicVetoError);
  });

  it("vetoes a mind count under the 5000 floor", async () => {
    const bad = { ...base(), mindRecordsLoaded: 4999 };
    await expect(verifyAndBrandCausalReceipt(bad)).rejects.toBeInstanceOf(NeuroSymbolicVetoError);
  });

  it("vetoes an edge that is not calibrated minus market", async () => {
    const bad = { ...base(), edgeVsMarket: 0.2 };
    await expect(verifyAndBrandCausalReceipt(bad)).rejects.toBeInstanceOf(NeuroSymbolicVetoError);
  });

  it("vetoes a line drift above half a point", async () => {
    const bad = { ...base(), liveBookLine: 51.5 };
    await expect(verifyAndBrandCausalReceipt(bad)).rejects.toBeInstanceOf(NeuroSymbolicVetoError);
  });

  it("refuses to render an unbranded object", () => {
    expect(() => renderPublicBoardOrSocialCard(base() as never)).toThrow(/FAIL-CLOSED/);
  });
});
