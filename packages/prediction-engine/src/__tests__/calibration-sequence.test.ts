import { describe, it, expect } from "vitest";
import { anytimeCalibrationMonitor, type CalibrationSequenceSample } from "../calibration-sequence.js";

// Seeded generators — no Math.random anywhere.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genLedger(n: number, seed: number, trueProbOf: (p: number) => number): CalibrationSequenceSample[] {
  const rand = mulberry32(seed);
  const out: CalibrationSequenceSample[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.3 + 0.5 * rand(); // stated probs in [0.3, 0.8] — sports-shaped
    const q = trueProbOf(p);
    out.push({ p, y: rand() < q ? 1 : 0 });
  }
  return out;
}

describe("anytimeCalibrationMonitor — Ville validity under adversarial peeking", () => {
  it("holds the alpha budget under H0 (honest probabilities) at ANY stopping time", () => {
    // THE core claim. everTripped == "an adversary who checks after every pick and
    // stops at the first crossing" — exactly the supremum Ville's inequality bounds.
    // OBSERVED (NSIM=2000 ledgers x 300 picks, seeds 1000..2999):
    //   headline FP = 0.0225, binMixture FP = 0.007, budget alpha = 0.05.
    // MC arithmetic: SE at the 0.05 boundary = sqrt(0.05*0.95/2000) ~ 0.0049, so a
    // valid test sits below 0.05 + 3*SE ~ 0.0646; the observed 0.0225 clears with
    // room. Assertion at 0.04 (~3.5 SE above observed) will not flake on a valid
    // implementation and catches a real validity regression.
    const NSIM = 2000;
    const N = 300;
    let fp = 0;
    let fpMix = 0;
    for (let s = 0; s < NSIM; s++) {
      const led = genLedger(N, 1000 + s, (p) => p);
      const r = anytimeCalibrationMonitor(led)!;
      expect(r).not.toBeNull();
      if (r.everTripped) fp += 1;
      if (r.binMixture!.everTripped) fpMix += 1;
    }
    expect(fp / NSIM).toBeLessThan(0.04);
    expect(fpMix / NSIM).toBeLessThan(0.04);
  }, 120_000);

  it("detects OVERCONFIDENCE (outcomes short of stated probs) with correct direction", () => {
    // OBSERVED (400 sims x 500 picks, truth = stated - 8pp, seeds 5000..5399):
    //   trip rate 0.7175, direction 'overconfident' on 100% of trips,
    //   median firstTrippedAt = 239 picks. SE(0.72, 400) ~ 0.022; assert > 0.6.
    let trips = 0;
    let dirOver = 0;
    const firstAts: number[] = [];
    for (let s = 0; s < 400; s++) {
      const led = genLedger(500, 5000 + s, (p) => Math.max(0.02, p - 0.08));
      const r = anytimeCalibrationMonitor(led)!;
      if (r.everTripped) {
        trips += 1;
        if (r.direction === "overconfident") dirOver += 1;
        firstAts.push(r.firstTrippedAt!);
      }
    }
    expect(trips / 400).toBeGreaterThan(0.6);
    expect(dirOver).toBe(trips); // every trip labeled the true direction
    firstAts.sort((a, b) => a - b);
    expect(firstAts[Math.floor(firstAts.length / 2)]!).toBeLessThan(400); // caught mid-ledger, not at the end
  }, 60_000);

  it("detects UNDERCONFIDENCE symmetrically", () => {
    // OBSERVED (400 sims x 500 picks, truth = stated + 8pp): trip rate 0.7575,
    // direction 'underconfident' on 100% of trips.
    let trips = 0;
    let dirUnder = 0;
    for (let s = 0; s < 400; s++) {
      const led = genLedger(500, 9000 + s, (p) => Math.min(0.98, p + 0.08));
      const r = anytimeCalibrationMonitor(led)!;
      if (r.everTripped) {
        trips += 1;
        if (r.direction === "underconfident") dirUnder += 1;
      }
    }
    expect(trips / 400).toBeGreaterThan(0.6);
    expect(dirUnder).toBe(trips);
  }, 60_000);

  it("localizes a REGIONAL drift via the bin layer (mixture trips; right bin carries the evidence)", () => {
    // Drift confined to stated p in [0.5, 0.75): truth = stated - 12pp there, honest
    // elsewhere. OBSERVED (300 sims x 600 picks, seeds 20000..20299):
    //   binMixture trip rate 0.7767; the max-logE bin is [0.5,0.75) in 98.3% of sims.
    let mixTrips = 0;
    let rightBinTop = 0;
    for (let s = 0; s < 300; s++) {
      const rand = mulberry32(20000 + s);
      const led: CalibrationSequenceSample[] = [];
      for (let i = 0; i < 600; i++) {
        const p = 0.3 + 0.5 * rand();
        const q = p >= 0.5 && p < 0.75 ? Math.max(0.02, p - 0.12) : p;
        led.push({ p, y: rand() < q ? 1 : 0 });
      }
      const r = anytimeCalibrationMonitor(led)!;
      if (r.binMixture!.everTripped) mixTrips += 1;
      const maxBin = r.bins.reduce((best, b) => (b.logEValue > best.logEValue ? b : best));
      if (maxBin.binStart === 0.5) rightBinTop += 1;
    }
    expect(mixTrips / 300).toBeGreaterThan(0.65);
    expect(rightBinTop / 300).toBeGreaterThan(0.9);
  }, 60_000);
});

describe("anytimeCalibrationMonitor — recursion, determinism, refusals", () => {
  it("matches a hand-computed 3-observation recursion exactly", () => {
    // p=0.6, y=1, three times; bins off. Hand replay of the + side (CAP=0.5):
    //  i=0: muHat=0 -> lambda=0 -> factor 1.       resid .4; sumSq .16; sumResid .4
    //  i=1: muHat=.2, varHat=(.25+.16)/2=.205, raw=.9756 -> cap .5/.6=.8333
    //       factor = 1+.8333*.4 = 4/3.             sumSq -> .20; sumResid .8
    //  i=2: muHat=.26667, varHat=.15, raw=1.778 -> cap .8333 -> factor 4/3.
    //  logM+ = 2*ln(4/3) = 0.575364; minus side never bets (raw<=0) -> logM- = 0.
    //  mixture: ln(0.5*(e^0.575364 + 1)) = 0.328504.
    // OBSERVED: [0, 0.15415067982725839, 0.32850406697203627].
    const r = anytimeCalibrationMonitor(
      [{ p: 0.6, y: 1 }, { p: 0.6, y: 1 }, { p: 0.6, y: 1 }],
      { bins: 0 },
    )!;
    expect(r.points[0]!.logEValue).toBeCloseTo(0, 10);
    expect(r.points[1]!.logEValue).toBeCloseTo(0.1541506798, 8);
    expect(r.points[2]!.logEValue).toBeCloseTo(0.3285040670, 8);
    expect(r.bins).toHaveLength(0);
    expect(r.binMixture).toBeNull();
  });

  it("is deterministic: identical ledgers produce identical trajectories", () => {
    const led = genLedger(100, 42, (p) => p);
    const a = anytimeCalibrationMonitor(led)!;
    const b = anytimeCalibrationMonitor(led)!;
    expect(a.current.logEValue).toBe(b.current.logEValue);
    expect(a.everTripped).toBe(b.everTripped);
  });

  it("direction stays null until the mixture actually trips", () => {
    const r = anytimeCalibrationMonitor([{ p: 0.5, y: 1 }, { p: 0.5, y: 0 }])!;
    expect(r.everTripped).toBe(false);
    expect(r.direction).toBeNull();
  });

  it("refuses invalid input (null, never throws): boundary probs, bad outcomes, empty, bad alpha/bins", () => {
    expect(anytimeCalibrationMonitor([])).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0, y: 1 } as never])).toBeNull(); // p must be OPEN (0,1)
    expect(anytimeCalibrationMonitor([{ p: 1, y: 0 } as never])).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0.5, y: 2 } as never])).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: Number.NaN, y: 1 } as never])).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0.5, y: 1 }], { alpha: 0 })).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0.5, y: 1 }], { alpha: 1 })).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0.5, y: 1 }], { bins: -1 })).toBeNull();
    expect(anytimeCalibrationMonitor([{ p: 0.5, y: 1 }], { bins: 2.5 })).toBeNull();
  });

  it("bin edges are predictable equal-width partitions with the top bin closed at 1", () => {
    const led: CalibrationSequenceSample[] = [
      { p: 0.1, y: 0 },
      { p: 0.26, y: 0 },
      { p: 0.6, y: 1 },
      { p: 0.9, y: 1 },
    ];
    const r = anytimeCalibrationMonitor(led, { bins: 4 })!;
    expect(r.bins.map((b) => b.n)).toEqual([1, 1, 1, 1]);
    expect(r.bins[0]!.binStart).toBe(0);
    expect(r.bins[3]!.binEnd).toBe(1);
  });
});

describe("anytimeCalibrationMonitor — the correlation limitation is REAL and codified", () => {
  // Self-audit finding: the anytime-valid guarantee assumes each residual is a
  // martingale difference (E[y_t|F_{t-1}] = p_t). Same-game correlation violates
  // that and inflates the false-positive rate. This test PINS the limitation so a
  // future change cannot quietly assume correlation is safe. Honest marginals in
  // both arms (E[y|p]=p), so the gap is attributable to correlation alone.
  // Full probe (1500x300): independent 0.017; copula rho=0.4 0.118, rho=0.7 0.245;
  // duplicated 0.252. Here at 400 sims we assert the DIRECTION and rough magnitude.
  it("independent picks stay valid but PERFECTLY-CORRELATED (duplicated) picks blow past alpha", () => {
    const NSIM = 400;
    const drawIndep = (seed: number): CalibrationSequenceSample[] => {
      const rand = mulberry32(seed);
      const out: CalibrationSequenceSample[] = [];
      for (let i = 0; i < 300; i++) { const p = 0.3 + 0.5 * rand(); out.push({ p, y: rand() < p ? 1 : 0 }); }
      return out;
    };
    const drawDuplicated = (seed: number): CalibrationSequenceSample[] => {
      const rand = mulberry32(seed);
      const out: CalibrationSequenceSample[] = [];
      for (let i = 0; i < 150; i++) { const p = 0.3 + 0.5 * rand(); const y = (rand() < p ? 1 : 0) as 0 | 1; out.push({ p, y }, { p, y }); }
      return out;
    };
    let fpIndep = 0;
    let fpDup = 0;
    for (let s = 0; s < NSIM; s++) {
      if (anytimeCalibrationMonitor(drawIndep(70000 + s))!.everTripped) fpIndep++;
      if (anytimeCalibrationMonitor(drawDuplicated(80000 + s))!.everTripped) fpDup++;
    }
    // Independent arm honors the budget (with a generous MC margin).
    expect(fpIndep / NSIM).toBeLessThan(0.05);
    // Correlated arm demonstrably violates it — the caveat is real, not theoretical.
    expect(fpDup / NSIM).toBeGreaterThan(0.12);
  }, 60_000);
});
