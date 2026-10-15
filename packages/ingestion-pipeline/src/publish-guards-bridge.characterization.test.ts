/**
 * Characterization pins for the publish-guards bridge (G-10) — gate-wiring
 * batch 2.
 *
 * The sweep row is `evalReliability`, the proper-scoring gate inside this
 * bridge. The existing suite (publish-guards-bridge.test.ts, 14 tests)
 * covers the happy path and the coarse fail-closed cases; these pins add
 * the exact refusal boundaries, the exact Brier arithmetic, the diagram
 * binning, and the unvalidated-`bins` defect flagged inline. Caller trace
 * at batch-2 build time: evalReliability has NO production caller — it is
 * re-exported from the ingestion barrel only. Nothing here changes
 * behavior.
 */
import { describe, expect, it } from "vitest";
import {
  evalAbstention,
  evalFloorStrata,
  evalReliability,
  evalStratumGate,
} from "./publish-guards-bridge.js";

describe("evalReliability characterization — probability boundaries", () => {
  it("p must lie in the OPEN interval (0,1): p = 0 and p = 1 are both refused", () => {
    const at0 = evalReliability({ rows: [{ p: 0, y: 1 }] });
    expect(at0.ok).toBe(false);
    if (!at0.ok) expect(at0.reason).toBe("row 0: p must be finite in (0,1) — not imputed");
    const at1 = evalReliability({ rows: [{ p: 1, y: 0 }] });
    expect(at1.ok).toBe(false);
    if (!at1.ok) expect(at1.reason).toBe("row 0: p must be finite in (0,1) — not imputed");
  });

  it("non-finite and negative p are refused with the same reason", () => {
    for (const p of [Number.NaN, Number.POSITIVE_INFINITY, -0.5]) {
      const r = evalReliability({ rows: [{ p, y: 1 }] });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("row 0: p must be finite in (0,1) — not imputed");
    }
  });

  it("the refusal names the index of the first offending row", () => {
    const r = evalReliability({
      rows: [
        { p: 0.5, y: 1 },
        { p: 0.5, y: 0 },
        { p: 2, y: 1 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^row 2:/);
  });

  it("y must be exactly 0 or 1", () => {
    for (const y of [0.5, -1, 2]) {
      const r = evalReliability({ rows: [{ p: 0.5, y: y as 0 }] });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("row 0: y must be 0|1");
    }
  });

  it("non-array rows are refused as empty", () => {
    const r = evalReliability({ rows: null as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("rows must be non-empty");
  });
});

describe("evalReliability characterization — Brier arithmetic", () => {
  it("computes the exact mean Brier for a two-row set", () => {
    const r = evalReliability({
      rows: [
        { p: 0.6, y: 1 },
        { p: 0.4, y: 0 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.brier).toBe(0.16); // (0.4^2 + 0.4^2) / 2
  });

  it("rounds the reported Brier to 6 decimal places", () => {
    const r = evalReliability({ rows: [{ p: 1 / 3, y: 1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.brier).toBe(0.444444); // (2/3)^2 = 0.444444...
  });
});

describe("evalReliability characterization — reliability diagram", () => {
  it("defaults to 10 bins and places p = 0.65 in bin 6 with exact bin stats", () => {
    const r = evalReliability({ rows: [{ p: 0.65, y: 1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.diagram).toHaveLength(10);
      expect(r.data.diagram[6]).toEqual({ bin: 6, meanP: 0.65, freq: 1, n: 1 });
    }
  });

  it("empty bins report n = 0 with NaN meanP and NaN freq (not zeros)", () => {
    const r = evalReliability({ rows: [{ p: 0.65, y: 1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.diagram[0]!.n).toBe(0);
      expect(Number.isNaN(r.data.diagram[0]!.meanP)).toBe(true);
      expect(Number.isNaN(r.data.diagram[0]!.freq)).toBe(true);
    }
  });

  it("bins = 1 collects every row into a single bin", () => {
    const r = evalReliability({
      rows: [
        { p: 0.2, y: 0 },
        { p: 0.8, y: 1 },
      ],
      bins: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.diagram).toHaveLength(1);
      expect(r.data.diagram[0]).toEqual({ bin: 0, meanP: 0.5, freq: 0.5, n: 2 });
    }
  });

  it("DEFECT (pinned, not fixed): bins is never validated — bins = 0 returns ok with an empty diagram", () => {
    const r = evalReliability({ rows: [{ p: 0.5, y: 1 }], bins: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.diagram).toEqual([]);
      expect(r.data.brier).toBe(0.25); // the Brier is still computed and reported
    }
  });
});

describe("publish-guards bridge characterization — sibling fail-closed surfaces", () => {
  it("evalAbstention refuses a non-finite stratumN before evaluating anything", () => {
    const r = evalAbstention({ stratumN: Number.NaN });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("stratumN must be finite");
  });

  it("evalStratumGate refuses when any identity field is empty", () => {
    const r = evalStratumGate({ sport: "", pickType: "SPREAD", modelVersion: "v1", n: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("sport/pickType/modelVersion required");
  });

  it("evalFloorStrata refuses an empty strata list", () => {
    const r = evalFloorStrata({ strata: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("strata must be non-empty");
  });
});
