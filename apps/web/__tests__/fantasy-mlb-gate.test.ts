/**
 * Fantasy MLB clearance gate — pins the legal posture of the MLB data plane.
 *
 * The registry entries (mlb-statsapi, baseball-savant) must clear the engine
 * for derived analytics (that is the whole design), and must REFUSE a storage
 * intent (MLBAM's notice permits only individual, non-commercial, non-bulk use
 * of raw Materials — raw payloads are compute-and-discard). If someone later
 * flips storage_allowed on either entry without a written MLB license, the
 * negative half of this suite fails and points at the registry.
 */
import { describe, expect, it } from "vitest";
import { baseballSavantGate, mlbStatsApiGate } from "@/lib/ingestion/fantasy-mlb-gate";
import { checkClearance } from "@/lib/scraping/clearance-engine";

describe("fantasy MLB clearance gates", () => {
  it("grants derived-analytics clearance for both MLB sources", () => {
    for (const gate of [mlbStatsApiGate(), baseballSavantGate()]) {
      expect(gate.ok).toBe(true);
      if (gate.ok) {
        expect(gate.proof.allowed).toBe(true);
        // Attribution must propagate to derived outputs (registry invariant).
        expect(gate.proof.attributionText).toMatch(/MLB Advanced Media/);
      }
    }
  });

  it("mints proofs bound to the exact source id (no cross-source replay)", () => {
    const statsApi = mlbStatsApiGate();
    const savant = baseballSavantGate();
    expect(statsApi.ok && statsApi.proof.sourceId).toBe("mlb-statsapi");
    expect(savant.ok && savant.proof.sourceId).toBe("baseball-savant");
  });

  it("REFUSES a raw-storage intent for both MLB sources (compute-and-discard)", () => {
    for (const sourceId of ["mlb-statsapi", "baseball-savant"] as const) {
      const result = checkClearance({
        source_id: sourceId,
        mode: "public_logged_off_fact_extract",
        tool_id: "fetch-native",
        intents: ["storage"],
      });
      expect(result.allowed).toBe(false);
      expect(result.blocks.map((b) => b.code)).toContain("STORAGE_NOT_ALLOWED");
    }
  });

  it("REFUSES commercial display of raw MLB data until a license lands", () => {
    const result = checkClearance({
      source_id: "mlb-statsapi",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["commercial_display"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.map((b) => b.code)).toContain("COMMERCIAL_DISPLAY_NOT_ALLOWED");
  });
});
