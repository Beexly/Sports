import { describe, expect, it } from "vitest";

import { mulberry32 } from "../rng.js";
import {
  benjaminiHochberg,
  createTrialsRegistry,
  decideFamilyAdmissions,
  recordFeatureAdmissionTrial,
  recordThresholdGrid,
  TrialsRegistryError,
  verifyTrialEntries,
  type TrialEntry,
} from "../trials-registry.js";

const AT = "2026-07-16T12:00:00.000Z";

function trial(id: string, p: number | null): Parameters<ReturnType<typeof createTrialsRegistry>["append"]>[0] {
  return {
    trialId: id,
    family: "fam",
    kind: "other",
    recordedAt: AT,
    params: { id },
    pValue: p,
    outcome: "recorded",
  };
}

describe("trials registry chain", () => {
  it("appends, links, and verifies", () => {
    const reg = createTrialsRegistry();
    reg.append(trial("a", 0.1));
    reg.append(trial("b", null));
    reg.append(trial("c", 0.5));
    expect(reg.verify()).toEqual({ valid: true, brokenSeq: null });
    const entries = reg.entries();
    expect(entries[1]!.prevHash).toBe(entries[0]!.hash);
    expect(verifyTrialEntries(entries).valid).toBe(true);
  });

  it("an exported-then-tampered history is caught by the standalone verifier", () => {
    const reg = createTrialsRegistry();
    reg.append(trial("a", 0.1));
    reg.append(trial("b", 0.2));
    const tampered: TrialEntry[] = reg.entries().map((e) =>
      e.trialId === "a" ? { ...e, pValue: 0.0001 } : e,
    );
    const check = verifyTrialEntries(tampered);
    expect(check.valid).toBe(false);
    expect(check.brokenSeq).toBe(0);
  });

  it("refuses duplicate trialIds and invalid p-values, and re-seeds from a valid export", () => {
    const reg = createTrialsRegistry();
    reg.append(trial("a", 0.1));
    expect(() => reg.append(trial("a", 0.2))).toThrow(TrialsRegistryError);
    expect(() => reg.append(trial("bad-p", 1.5))).toThrow(TrialsRegistryError);
    expect(() => reg.append({ ...trial("bad-date", 0.1), recordedAt: "not-a-date" })).toThrow(
      TrialsRegistryError,
    );
    const reseeded = createTrialsRegistry(reg.entries());
    reseeded.append(trial("b", 0.3));
    expect(reseeded.verify().valid).toBe(true);
    expect(reseeded.entries()).toHaveLength(2);
    // Corrupt seed refused outright.
    const corrupt = reg.entries().map((e) => ({ ...e, hash: "0".repeat(64) }));
    expect(() => createTrialsRegistry(corrupt)).toThrow(TrialsRegistryError);
  });
});

describe("trials registry immutability", () => {
  it("entries are deep-frozen — post-append mutation throws instead of diverging from the hash", () => {
    const reg = createTrialsRegistry();
    const params = { grid: [1, 2, 3] };
    const entry = reg.append({ ...trial("a", 0.1), params });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => {
      (entry as { pValue: number | null }).pValue = 0.0001;
    }).toThrow(TypeError);
    expect(() => {
      (entry.params as { grid: number[] }).grid.push(99);
    }).toThrow(TypeError);
    // Caller-side mutation of the ORIGINAL params object must not reach the chain.
    params.grid.push(4);
    const stored = reg.entries()[0]!;
    expect(stored.params).toEqual({ grid: [1, 2, 3] });
    expect(reg.verify().valid).toBe(true);
  });
});

describe("benjaminiHochberg", () => {
  it("matches the hand-computed step-up example", () => {
    const res = benjaminiHochberg([0.01, 0.02, 0.03, 0.2, 0.5], 0.05);
    expect(res.m).toBe(5);
    expect(res.rejected).toEqual([true, true, true, false, false]);
    expect(res.adjusted.map((a) => a && Number(a.toFixed(10)))).toEqual([0.05, 0.05, 0.05, 0.25, 0.5]);
  });

  it("preserves input positions when unsorted and skips nulls", () => {
    const res = benjaminiHochberg([0.5, null, 0.01, 0.2, 0.02, 0.03], 0.05);
    expect(res.m).toBe(5);
    expect(res.rejected).toEqual([false, false, true, false, true, true]);
    expect(res.adjusted[1]).toBeNull();
  });

  it("handles all-null, none-rejected, and all-rejected families", () => {
    expect(benjaminiHochberg([null, null], 0.05).m).toBe(0);
    expect(benjaminiHochberg([0.9, 0.8], 0.05).rejected).toEqual([false, false]);
    expect(benjaminiHochberg([0.001, 0.002], 0.05).rejected).toEqual([true, true]);
    expect(() => benjaminiHochberg([0.1], 0)).toThrow(TrialsRegistryError);
  });

  it("adjusted p-values are monotone in the order statistics", () => {
    const ps = [0.001, 0.03, 0.2, 0.04, 0.9, 0.6];
    const res = benjaminiHochberg(ps, 0.1);
    const sorted = ps
      .map((p, i) => ({ p, adj: res.adjusted[i]! }))
      .sort((a, b) => a.p - b.p);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.adj).toBeGreaterThanOrEqual(sorted[i - 1]!.adj);
    }
  });
});

describe("registered feature admission (conditional-MI + family BH)", () => {
  it("admits a planted outcome-leak feature and refuses an independent noise feature", () => {
    const rng = mulberry32(42);
    const n = 600;
    const qClose: number[] = [];
    const outcomes: (0 | 1)[] = [];
    const leak: number[] = [];
    const noise: number[] = [];
    for (let i = 0; i < n; i++) {
      const q = 0.35 + 0.3 * rng();
      const y: 0 | 1 = rng() < q ? 1 : 0;
      qClose.push(q);
      outcomes.push(y);
      leak.push(y + 0.1 * rng()); // encodes the outcome — must be caught
      noise.push(rng()); // independent — must not be admitted
    }

    const registry = createTrialsRegistry();
    const family = "test-features-2026";
    for (const [key, values] of [
      ["leak_feature", leak],
      ["noise_feature", noise],
    ] as const) {
      recordFeatureAdmissionTrial({
        registry,
        family,
        featureKey: key,
        recordedAt: AT,
        values,
        outcomes,
        qClose,
        seed: 7,
      });
    }

    const result = decideFamilyAdmissions(registry, family, 0.05);
    expect(result.admittedKeys).toEqual(["leak_feature"]);
    const noiseDecision = result.decisions.find((d) => d.featureKey === "noise_feature")!;
    expect(noiseDecision.admitted).toBe(false);
    expect(registry.verify().valid).toBe(true);
    // Deterministic provenance stamp for the admitted set.
    expect(result.admittedSetHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decideFamilyAdmissions(registry, family, 0.05).admittedSetHash).toBe(
      result.admittedSetHash,
    );
  });

  it("a re-probe of the same feature in the same family throws — one honest record per trial", () => {
    const registry = createTrialsRegistry();
    const args = {
      registry,
      family: "fam",
      featureKey: "x",
      recordedAt: AT,
      values: [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6, 0.15, 0.85, 0.25, 0.75, 0.35, 0.65, 0.45],
      outcomes: [0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] as (0 | 1)[],
      qClose: Array.from({ length: 16 }, () => 0.5),
      strata: 2,
      scoreBins: 2,
      permutations: 50,
    };
    recordFeatureAdmissionTrial(args);
    expect(() => recordFeatureAdmissionTrial(args)).toThrow(TrialsRegistryError);
  });
});

describe("recordThresholdGrid", () => {
  it("records a grid scan as one honest trial and refuses silent re-recording", () => {
    const registry = createTrialsRegistry();
    const entry = recordThresholdGrid({
      registry,
      family: "phase1-tau",
      gridName: "tau-grid-v1",
      recordedAt: AT,
      candidates: [0.01, 0.02, 0.03, 0.05],
      chosen: null,
      notes: "fire-nothing outcome",
    });
    expect(entry.kind).toBe("threshold_grid");
    expect(() =>
      recordThresholdGrid({
        registry,
        family: "phase1-tau",
        gridName: "tau-grid-v1",
        recordedAt: AT,
        candidates: [0.01],
        chosen: 0.01,
      }),
    ).toThrow(TrialsRegistryError);
  });
});
