import { describe, expect, it } from "vitest";
import { shrinkBin, fitEmpiricalBayesNu, shrinkAllBins } from "@/lib/calibration/bayes-bins";
import { fitPlattMap, applyPlatt, fitPlatt } from "@/lib/calibration/platt-map";
import { runOfflineBakeoff } from "@/lib/calibration/offline-bakeoff";
import {
  decideAciShow,
  emptyGroupState,
  updateAciGroup,
  DEFAULT_ACI_CONFIG,
  isConformalAbstainEnabled,
} from "@/lib/calibration/aci-state";

describe("bayes-bins", () => {
  it("shrinks sparse bins toward prior", () => {
    const s = shrinkBin(1, 2, 0.5, 20);
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.6);
  });

  it("fits nu in range", () => {
    const bins = [
      { meanForecast: 0.2, wins: 5, n: 20 },
      { meanForecast: 0.5, wins: 25, n: 50 },
      { meanForecast: 0.8, wins: 40, n: 50 },
    ];
    const fit = fitEmpiricalBayesNu(bins);
    expect(fit.nu).toBeGreaterThanOrEqual(1);
    expect(fit.nu).toBeLessThanOrEqual(500);
    const all = shrinkAllBins(bins);
    expect(all.bins).toHaveLength(3);
  });
});

describe("platt-map", () => {
  it("MAP fit returns finite A,B and maps probabilities", () => {
    const samples = Array.from({ length: 100 }, (_, i) => ({
      p: 0.3 + (i % 10) * 0.05,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const map = fitPlattMap(samples);
    const mle = fitPlatt(samples, { map: false });
    expect(Number.isFinite(map.A)).toBe(true);
    expect(Number.isFinite(mle.B)).toBe(true);
    const q = applyPlatt(0.6, map);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });
});

describe("offline bakeoff", () => {
  it("returns methods without throwing on synthetic chrono data", () => {
    const samples = Array.from({ length: 200 }, (_, i) => {
      const p = 0.4 + (i % 20) * 0.01;
      const y = (Math.random() < p ? 1 : 0) as 0 | 1;
      return { p, y };
    });
    const report = runOfflineBakeoff(samples, 0.7);
    expect(report.nTest).toBeGreaterThan(0);
    expect(report.methods.map((m) => m.method)).toEqual(
      expect.arrayContaining(["raw", "temperature", "platt_mle", "platt_map", "eb_bins"]),
    );
  });
});

describe("ACI state machine", () => {
  it("abstains below nMin", () => {
    const st = emptyGroupState("nfl|spread");
    const d = decideAciShow(st, 0.62);
    expect(d.abstain).toBe(true);
    expect(d.reason).toMatch(/nMin/);
  });

  it("updates alpha on miss/hit when shown", () => {
    let st = emptyGroupState("nba|total", 0.1);
    // fill window
    for (let i = 0; i < DEFAULT_ACI_CONFIG.nMin; i++) {
      st = updateAciGroup(st, { pSide: 0.7, ySide: 1, didShow: true });
    }
    expect(st.scores.length).toBe(DEFAULT_ACI_CONFIG.nMin);
    const before = st.alpha;
    st = updateAciGroup(st, { pSide: 0.7, ySide: 0, didShow: true }); // miss
    expect(st.alpha).not.toBe(before);
    expect(st.alpha).toBeGreaterThanOrEqual(DEFAULT_ACI_CONFIG.alphaMin);
    expect(st.alpha).toBeLessThanOrEqual(DEFAULT_ACI_CONFIG.alphaMax);
  });

  it("flag defaults off", () => {
    expect(isConformalAbstainEnabled({})).toBe(false);
    expect(isConformalAbstainEnabled({ CONFORMAL_ABSTAIN_ENABLED: "true" })).toBe(true);
  });
});
