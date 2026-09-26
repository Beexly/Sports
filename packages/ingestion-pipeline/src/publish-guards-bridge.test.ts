import { describe, expect, it } from "vitest";
import {
  evalAbstention,
  evalChowAbstain,
  evalClvNonInferiority,
  evalFloorStrata,
  evalPairedBrierLcb,
  evalPromotion,
  evalReliability,
  evalStratumGate,
} from "./publish-guards-bridge.js";

describe("publish-guards-bridge reliability", () => {
  it("computes Brier + reliability diagram", () => {
    const r = evalReliability({
      rows: [
        { p: 0.6, y: 1 },
        { p: 0.4, y: 0 },
        { p: 0.7, y: 1 },
        { p: 0.3, y: 0 },
      ],
      bins: 4,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.brier).toBeGreaterThan(0);
      expect(r.data.diagram.length).toBe(4);
    }
  });

  it("fail-closes on bad p or y", () => {
    expect(evalReliability({ rows: [{ p: 1.5, y: 1 }] }).ok).toBe(false);
    expect(evalReliability({ rows: [{ p: 0.5, y: 2 as 0 }] }).ok).toBe(false);
    expect(evalReliability({ rows: [] }).ok).toBe(false);
  });
});

describe("publish-guards-bridge abstention", () => {
  it("evalAbstention fires or refuses with reason codes", () => {
    // Must supply a valid interval — missing interval = INSUFFICIENT_CALIBRATION
    const fire = evalAbstention({
      stratumN: 200,
      interval: { lo: 0.55, hi: 0.62 },
    });
    expect(fire.ok).toBe(true);
    if (fire.ok) expect(fire.data.kind).toBe("FIRE");

    const noBet = evalAbstention({
      stratumN: 5,
      interval: { lo: 0.55, hi: 0.62 },
    });
    expect(noBet.ok).toBe(true);
    if (noBet.ok) {
      expect(noBet.data.kind).toBe("NO_BET");
      expect(noBet.data.reasons.length).toBeGreaterThan(0);
    }

    const missingInterval = evalAbstention({ stratumN: 200 });
    expect(missingInterval.ok).toBe(true);
    if (missingInterval.ok) {
      expect(missingInterval.data.kind).toBe("NO_BET");
      expect(missingInterval.data.reasons).toContain("INSUFFICIENT_CALIBRATION");
    }
  });

  it("evalChowAbstain flags a too-wide interval", () => {
    const wide = evalChowAbstain({ interval: { lo: 0.1, hi: 0.9 } });
    expect(wide.ok).toBe(true);
    if (wide.ok) expect(wide.data.abstain).toBe(true);

    const tight = evalChowAbstain({ interval: { lo: 0.55, hi: 0.62 } });
    expect(tight.ok).toBe(true);
    if (tight.ok) expect(tight.data.abstain).toBe(false);
  });

  it("fail-closes on missing interval", () => {
    expect(evalChowAbstain({ interval: null }).ok).toBe(false);
  });
});

describe("publish-guards-bridge stratum coverage", () => {
  it("evalStratumGate refuses an empty stratum", () => {
    const r = evalStratumGate({
      sport: "americanfootball_nfl",
      pickType: "SPREAD",
      modelVersion: "v5.2.7",
      n: 0,
      floor: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.refuse).toBe(true);
      expect(r.data.reason).toBe("INSUFFICIENT_SAMPLE");
    }
  });

  it("evalStratumGate passes a covered stratum", () => {
    const r = evalStratumGate({
      sport: "americanfootball_nfl",
      pickType: "SPREAD",
      modelVersion: "v5.2.7",
      n: 250,
      floor: 100,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.refuse).toBe(false);
      expect(r.data.meetsFloor).toBe(true);
    }
  });

  it("evalFloorStrata splits covered from under-floor", () => {
    const r = evalFloorStrata({
      strata: [
        { key: "NFL|SPREAD|v5", n: 200 },
        { key: "NFL|TOTAL|v5", n: 10 },
      ],
      floor: 50,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.filter((c) => c.meetsFloor)).toHaveLength(1);
    }
  });
});

describe("publish-guards-bridge promotion", () => {
  it("evalPairedBrierLcb computes an empirical-Bernstein LCB", () => {
    const r = evalPairedBrierLcb({
      diffs: [0.01, -0.02, 0.03, 0.0, 0.02, -0.01, 0.01, 0.02],
      delta: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.lcb)).toBe(true);
    }
  });

  it("fail-closes on too-few diffs or bad delta", () => {
    expect(evalPairedBrierLcb({ diffs: [0.1], delta: 0.1 }).ok).toBe(false);
    expect(evalPairedBrierLcb({ diffs: [0.1, 0.2], delta: 0 }).ok).toBe(false);
    expect(evalPairedBrierLcb({ diffs: [0.1, Number.NaN], delta: 0.1 }).ok).toBe(false);
  });

  it("evalClvNonInferiority runs Welch one-sided", () => {
    const r = evalClvNonInferiority({
      championClv: [0.01, 0.02, -0.01, 0.03, 0.0, 0.02],
      challengerClv: [0.0, 0.01, -0.02, 0.02, 0.01, 0.0],
      alphaAdj: 0.05,
      epsilon: -0.01,
      minN: 5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(typeof r.data.pass).toBe("boolean");
      expect(r.data.reason.length).toBeGreaterThan(0);
    }
  });

  it("fail-closes on bad alphaAdj or empty series", () => {
    expect(
      evalClvNonInferiority({
        championClv: [0.01],
        challengerClv: [0.0],
        alphaAdj: 0,
        epsilon: -0.01,
        minN: 5,
      }).ok,
    ).toBe(false);
    expect(
      evalClvNonInferiority({
        championClv: [],
        challengerClv: [0.0],
        alphaAdj: 0.05,
        epsilon: -0.01,
        minN: 5,
      }).ok,
    ).toBe(false);
  });

  it("evalPromotion fail-closes on a bad window (throws is a refusal)", () => {
    const r = evalPromotion(
      {
        window: { concurrentChallengers: 0 },
        brierRows: [],
        clvRows: [],
        championId: "c1",
        challengerId: "x1",
        codeRevision: "abc",
      } as never,
      "2026-09-25T12:00:00.000Z",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
  });

  it("evalPromotion fail-closes on invalid now", () => {
    expect(evalPromotion({} as never, "not-a-date").ok).toBe(false);
    expect(evalPromotion(null as never, "2026-09-25T12:00:00.000Z").ok).toBe(false);
  });
});
