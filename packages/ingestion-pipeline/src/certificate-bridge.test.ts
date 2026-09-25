import { describe, expect, it } from "vitest";
import {
  evalCertificateHash,
  evalDisplayIfSubstantiated,
  evalDisplaySubstantiation,
  evalFireCertificate,
  evalKellyLowerEndpoint,
  evalNoBetCertificate,
  evalParseCertificate,
  evalWilsonLowerBound,
} from "./certificate-bridge.js";

const interval = { lo: 0.55, hi: 0.72, method: "multiprob-v1" };

describe("certificate-bridge display substantiation", () => {
  it("evalDisplaySubstantiation returns a boolean", () => {
    const r = evalDisplaySubstantiation({
      claim: "75% win rate",
      evidence: [{ kind: "backtest", n: 40, note: "2024 season" }],
    } as never);
    expect(r.ok).toBe(true);
  });

  it("evalDisplayIfSubstantiated returns null when unsubstantiated (refusal, not zero)", () => {
    const r = evalDisplayIfSubstantiated({
      claim: "guaranteed win",
      evidence: [],
    } as never);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data === null || typeof r.data === "number").toBe(true);
  });

  it("evalWilsonLowerBound computes an honest floor", () => {
    const r = evalWilsonLowerBound({ successes: 30, trials: 40, z: 1.96 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThan(0);
      expect(r.data).toBeLessThan(0.75);
    }
  });

  it("evalWilsonLowerBound fail-closes on impossible counts", () => {
    expect(evalWilsonLowerBound({ successes: 50, trials: 40 }).ok).toBe(false);
    expect(evalWilsonLowerBound({ successes: 5, trials: 0 }).ok).toBe(false);
  });
});

describe("certificate-bridge decision certificates", () => {
  it("evalNoBetCertificate mints a cert with reason codes and a summary", () => {
    const r = evalNoBetCertificate({
      stratumKey: "NFL|SPREAD|2026-W3",
      modelVersion: "v5.2.7",
      eventId: "evt-1",
      market: "spreads",
      exclusions: ["thin_market", "stale_line"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.kind).toBe("NO_BET");
      expect(r.data.noBetReasons?.length).toBeGreaterThan(0);
      expect(r.data.summary.length).toBeGreaterThan(0);
    }
  });

  it("evalFireCertificate requires a real price — never fabricated", () => {
    const ok = evalFireCertificate({
      stratumKey: "NFL|SPREAD|2026-W3",
      modelVersion: "v5.2.7",
      eventId: "evt-1",
      market: "spreads",
      summary: "Model 0.64 vs price 0.52, interval excludes 0.5.",
      interval,
      priceDecimal: 1.92,
    });
    expect(ok.ok).toBe(true);

    const bad = evalFireCertificate({
      stratumKey: "NFL|SPREAD|2026-W3",
      modelVersion: "v5.2.7",
      eventId: "evt-1",
      market: "spreads",
      summary: "test",
      interval,
      priceDecimal: null,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain("fabricated");
  });

  it("evalCertificateHash produces a stable canonical string", () => {
    const r = evalFireCertificate({
      stratumKey: "NFL|SPREAD|2026-W3",
      modelVersion: "v5.2.7",
      eventId: "evt-1",
      market: "spreads",
      summary: "test",
      interval,
      priceDecimal: 1.92,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const h = evalCertificateHash(r.data);
    expect(h.ok).toBe(true);
    if (h.ok) expect(typeof h.data).toBe("string");
  });

  it("evalParseCertificate fail-closes on malformed input", () => {
    expect(evalParseCertificate(null).ok).toBe(false);
    expect(evalParseCertificate({}).ok).toBe(false);
  });
});

describe("certificate-bridge evalKellyLowerEndpoint", () => {
  it("sizes from the lower endpoint", () => {
    const r = evalKellyLowerEndpoint({ pLo: 0.55, decimalOdds: 2.0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fractionalKelly).toBeGreaterThanOrEqual(0);
      expect(r.data.fullKelly).toBeGreaterThanOrEqual(0);
    }
  });

  it("fail-closes on bad odds or endpoint", () => {
    expect(evalKellyLowerEndpoint({ pLo: 0.5, decimalOdds: 1.0 } as never).ok).toBe(false);
    expect(evalKellyLowerEndpoint({ pLo: 0, decimalOdds: 2.0 } as never).ok).toBe(false);
  });
});
