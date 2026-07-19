import { describe, it, expect } from "vitest";
import type { CapabilityNode, OwnEvidence } from "../axes.js";
import {
  TwinObservationError,
  assertValidObservation,
  foldObservationsAsOf,
  templatesFromSeed,
  materializeNodesAsOf,
  composeGraphAsOf,
  type AsOfMode,
  type CapabilityTemplate,
  type TwinObservation,
} from "../as-of.js";
import { buildSeedRegistry, SEED_CAPABILITY_IDS } from "../seed-registry.js";

const HORIZON = 5 * 60 * 1000; // 5 minutes

function healthyEvidence(observedAt: Date, overrides: Partial<OwnEvidence> = {}): OwnEvidence {
  return {
    observedAt,
    freshnessHorizonMs: HORIZON,
    intent: "open",
    severityTags: [],
    unavailable: false,
    reasons: [],
    ...overrides,
  };
}

function mkObs(
  capabilityId: string,
  observedAt: Date,
  recordedAt: Date,
  evidenceOverrides: Partial<OwnEvidence> = {},
): TwinObservation {
  return {
    capabilityId,
    observedAt,
    recordedAt,
    evidence: healthyEvidence(observedAt, evidenceOverrides),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("observation validation — recordedAt >= observedAt", () => {
  it("throws TwinObservationError when recordedAt is before observedAt", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const recordedAt = new Date("2026-07-19T11:59:59.999Z");
    const bad = mkObs("cap:x", observedAt, recordedAt);
    expect(() => assertValidObservation(bad)).toThrow(TwinObservationError);
  });

  it("does not throw when recordedAt equals observedAt (simultaneous)", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const ok = mkObs("cap:x", t, t);
    expect(() => assertValidObservation(ok)).not.toThrow();
  });

  it("does not throw when recordedAt is after observedAt (late observation — valid)", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const recordedAt = new Date("2026-07-19T12:05:00.000Z");
    const ok = mkObs("cap:x", observedAt, recordedAt);
    expect(() => assertValidObservation(ok)).not.toThrow();
  });

  it("foldObservationsAsOf rejects an invalid observation stream up front", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const recordedAt = new Date("2026-07-19T10:00:00.000Z"); // before observedAt: invalid
    const bad = mkObs("cap:x", observedAt, recordedAt);
    expect(() => foldObservationsAsOf([bad], observedAt)).toThrow(TwinObservationError);
  });

  it("the thrown error names the offending capability and both timestamps", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const recordedAt = new Date("2026-07-19T10:00:00.000Z");
    const bad = mkObs("cap:offender", observedAt, recordedAt);
    try {
      assertValidObservation(bad);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TwinObservationError);
      const e = err as TwinObservationError;
      expect(e.capabilityId).toBe("cap:offender");
      expect(e.observedAt).toEqual(observedAt);
      expect(e.recordedAt).toEqual(recordedAt);
    }
  });
});

// ---------------------------------------------------------------------------
// foldObservationsAsOf — winner selection
// ---------------------------------------------------------------------------

describe("foldObservationsAsOf", () => {
  it("selects the observation with the latest observedAt <= asOf (most-recent-evidence-wins)", () => {
    const t1 = new Date("2026-07-19T12:00:00.000Z");
    const t2 = new Date("2026-07-19T12:05:00.000Z");
    const obs1 = mkObs("cap:x", t1, t1, {});
    const obs2 = mkObs("cap:x", t2, t2, { severityTags: ["degraded"] });
    const asOf = new Date("2026-07-19T12:10:00.000Z");

    const folded = foldObservationsAsOf([obs1, obs2], asOf);
    expect(folded.get("cap:x")).toEqual(obs2.evidence);
  });

  it("input order does not matter for latest-observedAt-wins", () => {
    const t1 = new Date("2026-07-19T12:00:00.000Z");
    const t2 = new Date("2026-07-19T12:05:00.000Z");
    const obs1 = mkObs("cap:x", t1, t1, {});
    const obs2 = mkObs("cap:x", t2, t2, { severityTags: ["degraded"] });
    const asOf = new Date("2026-07-19T12:10:00.000Z");

    const foldedReversed = foldObservationsAsOf([obs2, obs1], asOf);
    expect(foldedReversed.get("cap:x")).toEqual(obs2.evidence);
  });

  it("most-recent-EVIDENCE wins, not last-write-wins: a late-recorded backfill of OLD evidence never overrides newer evidence", () => {
    // Probe A: observed 10:00, recorded 10:05. Probe B: observed 09:00,
    // recorded 10:10 (a backfill — recorded LAST, but describing OLDER
    // reality). A must win: the fold selects which observation describes
    // current reality; recordedAt is only when we learned it.
    const probeA = mkObs(
      "cap:x",
      new Date("2026-07-19T10:00:00.000Z"),
      new Date("2026-07-19T10:05:00.000Z"),
      {},
    );
    const backfillB = mkObs(
      "cap:x",
      new Date("2026-07-19T09:00:00.000Z"),
      new Date("2026-07-19T10:10:00.000Z"),
      { unavailable: true },
    );
    const asOf = new Date("2026-07-19T10:15:00.000Z");

    expect(foldObservationsAsOf([probeA, backfillB], asOf).get("cap:x")).toEqual(probeA.evidence);
    expect(foldObservationsAsOf([backfillB, probeA], asOf).get("cap:x")).toEqual(probeA.evidence);
  });

  it("tie-break: when observedAt ties, the latest recordedAt wins (a late-recorded correction about the SAME instant)", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const original = mkObs("cap:x", observedAt, new Date("2026-07-19T12:01:00.000Z"), {});
    const correction = mkObs("cap:x", observedAt, new Date("2026-07-19T12:04:00.000Z"), {
      severityTags: ["stale"],
    });
    const asOf = new Date("2026-07-19T12:05:00.000Z");

    expect(foldObservationsAsOf([original, correction], asOf).get("cap:x")).toEqual(
      correction.evidence,
    );
    expect(foldObservationsAsOf([correction, original], asOf).get("cap:x")).toEqual(
      correction.evidence,
    );
  });

  it("tie-break: when both observedAt and recordedAt tie, the LAST element in input order wins (append-order semantics)", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const first = mkObs("cap:x", t, t, {});
    const second = mkObs("cap:x", t, t, { severityTags: ["degraded"] });

    const folded = foldObservationsAsOf([first, second], t);
    expect(folded.get("cap:x")).toEqual(second.evidence);

    // Also verify reversing input order flips the winner — proving the
    // tie-break really is "last in input order" (append order), not some
    // other hidden key.
    const foldedReversed = foldObservationsAsOf([second, first], t);
    expect(foldedReversed.get("cap:x")).toEqual(first.evidence);
  });

  it("folds independently per capability", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const obsA = mkObs("cap:a", t, t, {});
    const obsB = mkObs("cap:b", t, t, { unavailable: true });

    const folded = foldObservationsAsOf([obsA, obsB], t);
    expect(folded.size).toBe(2);
    expect(folded.get("cap:a")).toEqual(obsA.evidence);
    expect(folded.get("cap:b")).toEqual(obsB.evidence);
  });

  it("empty observation stream folds to an empty map", () => {
    const folded = foldObservationsAsOf([], new Date("2026-07-19T12:00:00.000Z"));
    expect(folded.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bitemporal invisibility — the key property this layer exists to guarantee.
// ---------------------------------------------------------------------------

describe("bitemporal invisibility: observations recorded after asOf are excluded even when observedAt is before asOf", () => {
  it("excludes a late-recorded observation while asOf is between observedAt and recordedAt, then includes it once asOf reaches recordedAt", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z"); // fact was true here
    const recordedAt = new Date("2026-07-19T12:03:00.000Z"); // system learned it 3 min later (still within the 5min freshness horizon, so the assertion below isolates visibility, not decay)
    const lateObservation = mkObs("cap:x", observedAt, recordedAt, {});

    const nodes: CapabilityNode[] = [{ id: "cap:x", deps: [], evidence: healthyEvidence(observedAt) }];

    // asOf sits strictly between observedAt and recordedAt: observedAt <= asOf
    // but recordedAt > asOf — must be invisible.
    const asOfBeforeRecorded = new Date("2026-07-19T12:01:30.000Z");
    const beforeFold = foldObservationsAsOf([lateObservation], asOfBeforeRecorded);
    expect(beforeFold.has("cap:x")).toBe(false);

    const beforeComposed = composeGraphAsOf(nodes, [lateObservation], asOfBeforeRecorded);
    expect(beforeComposed.get("cap:x")?.kind).toBe("unknown");
    expect(beforeComposed.get("cap:x")?.reasons).toContain("no_observation_as_of:cap:x");

    // Advancing asOf to (or past) recordedAt makes it visible.
    const afterFold = foldObservationsAsOf([lateObservation], recordedAt);
    expect(afterFold.get("cap:x")).toEqual(lateObservation.evidence);

    const afterComposed = composeGraphAsOf(nodes, [lateObservation], recordedAt);
    expect(afterComposed.get("cap:x")?.kind).toBe("healthy");
  });
});

// ---------------------------------------------------------------------------
// Decay relative to asOf.
// ---------------------------------------------------------------------------

describe("decay is relative to asOf, not the real clock", () => {
  it("evidence observed at asOf - (horizon + 1ms) composes unknown/evidence_expired at asOf, but healthy at observedAt + 1ms", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const observation = mkObs("cap:x", observedAt, observedAt, {}); // recorded immediately
    const nodes: CapabilityNode[] = [{ id: "cap:x", deps: [], evidence: healthyEvidence(observedAt) }];

    const asOfExpired = new Date(observedAt.getTime() + HORIZON + 1);
    const expiredResult = composeGraphAsOf(nodes, [observation], asOfExpired);
    expect(expiredResult.get("cap:x")?.kind).toBe("unknown");
    expect(expiredResult.get("cap:x")?.reasons).toContain("evidence_expired");

    const asOfFresh = new Date(observedAt.getTime() + 1);
    const freshResult = composeGraphAsOf(nodes, [observation], asOfFresh);
    expect(freshResult.get("cap:x")?.kind).toBe("healthy");
  });

  it("evidence exactly at the horizon boundary relative to asOf is still fresh (matches decayEvidence's own boundary semantics)", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const observation = mkObs("cap:x", observedAt, observedAt, {});
    const nodes: CapabilityNode[] = [{ id: "cap:x", deps: [], evidence: healthyEvidence(observedAt) }];

    const asOfAtBoundary = new Date(observedAt.getTime() + HORIZON);
    const result = composeGraphAsOf(nodes, [observation], asOfAtBoundary);
    expect(result.get("cap:x")?.kind).toBe("healthy");
  });
});

// ---------------------------------------------------------------------------
// composeGraphAsOf — no-observation-at-all case.
// ---------------------------------------------------------------------------

describe("composeGraphAsOf — capabilities with zero visible observations", () => {
  it("compose unknown with a no_observation_as_of reason, and that unknown is contagious through hard deps", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const nodes: CapabilityNode[] = [
      { id: "a", deps: [], evidence: healthyEvidence(asOf) },
      { id: "b", deps: [{ id: "a", kind: "hard" }], evidence: healthyEvidence(asOf) },
    ];

    const result = composeGraphAsOf(nodes, [], asOf);
    expect(result.get("a")?.kind).toBe("unknown");
    expect(result.get("a")?.reasons).toContain("no_observation_as_of:a");
    expect(result.get("b")?.kind).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// AsOfMode — which timestamp axis the visibility cut applies to.
// ---------------------------------------------------------------------------

describe("AsOfMode", () => {
  // One late-recorded observation: fact true at 12:00, learned at 12:06.
  const observedAt = new Date("2026-07-19T12:00:00.000Z");
  const recordedAt = new Date("2026-07-19T12:06:00.000Z");
  const lateObservation = mkObs("cap:x", observedAt, recordedAt, {});
  // asOf sits between the two: observed <= asOf < recorded.
  const asOf = new Date("2026-07-19T12:03:00.000Z");

  it('"evidence" mode shows facts that had happened by asOf even when recorded later (hindsight view)', () => {
    const folded = foldObservationsAsOf([lateObservation], asOf, "evidence");
    expect(folded.get("cap:x")).toEqual(lateObservation.evidence);
  });

  it('"transaction" mode hides facts recorded after asOf', () => {
    const folded = foldObservationsAsOf([lateObservation], asOf, "transaction");
    expect(folded.has("cap:x")).toBe(false);
  });

  it('"both" (the default) also hides them — the strict bitemporal cut', () => {
    expect(foldObservationsAsOf([lateObservation], asOf, "both").has("cap:x")).toBe(false);
    expect(foldObservationsAsOf([lateObservation], asOf).has("cap:x")).toBe(false);
  });

  it('"both" and "transaction" select identical sets for valid input (recordedAt >= observedAt makes the observedAt condition redundant)', () => {
    const t1 = new Date("2026-07-19T12:00:00.000Z");
    const t2 = new Date("2026-07-19T12:04:00.000Z");
    const observations = [
      mkObs("cap:a", t1, t1, {}),
      mkObs("cap:a", t2, new Date("2026-07-19T12:07:00.000Z"), { severityTags: ["degraded"] }),
      mkObs("cap:b", t1, t2, { unavailable: true }),
    ];
    for (const cut of [t1, t2, new Date("2026-07-19T12:10:00.000Z")]) {
      const both = Array.from(foldObservationsAsOf(observations, cut, "both").entries());
      const transaction = Array.from(
        foldObservationsAsOf(observations, cut, "transaction").entries(),
      );
      expect(both).toEqual(transaction);
    }
  });
});

// ---------------------------------------------------------------------------
// Templates — static graph shape, materialized from the observation fold.
// ---------------------------------------------------------------------------

describe("templatesFromSeed / materializeNodesAsOf", () => {
  it("templatesFromSeed projects every seed node to id/label/deps + the node's horizon, discarding evidence", () => {
    const seedTime = new Date("2026-07-19T12:00:00.000Z");
    const seed = buildSeedRegistry(seedTime);
    const templates = templatesFromSeed(seed);

    expect(templates.map((t) => t.id)).toEqual(seed.map((n) => n.id));
    expect(new Set(templates.map((t) => t.id))).toEqual(new Set(SEED_CAPABILITY_IDS));
    for (let i = 0; i < templates.length; i += 1) {
      const template = templates[i]!;
      const node = seed[i]!;
      expect(template.deps).toEqual(node.deps);
      expect(template.label).toBe(node.label);
      expect(template.defaultFreshnessHorizonMs).toBe(node.evidence.freshnessHorizonMs);
      expect("evidence" in template).toBe(false);
    }
  });

  it("materializeNodesAsOf hydrates fold winners and gives no-observation capabilities the unknown own-state (absence of coverage is not green)", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const templates: CapabilityTemplate[] = [
      { id: "cap:observed", deps: [], defaultFreshnessHorizonMs: HORIZON },
      { id: "cap:silent", deps: [], defaultFreshnessHorizonMs: HORIZON },
    ];
    const observation = mkObs("cap:observed", asOf, asOf, { severityTags: ["degraded"] });

    const nodes = materializeNodesAsOf(templates, [observation], asOf);
    expect(nodes.map((n) => n.id)).toEqual(["cap:observed", "cap:silent"]);
    expect(nodes[0]!.evidence).toEqual(observation.evidence);
    expect(nodes[1]!.evidence.observedAt).toBeNull();
    expect(nodes[1]!.evidence.reasons).toContain("no_observation_as_of:cap:silent");

    const composed = composeGraphAsOf(templates, [observation], asOf);
    expect(composed.get("cap:observed")?.kind).toBe("impaired");
    expect(composed.get("cap:silent")?.kind).toBe("unknown");
  });

  it("materializeNodesAsOf respects the mode parameter", () => {
    const observedAt = new Date("2026-07-19T12:00:00.000Z");
    const recordedAt = new Date("2026-07-19T12:06:00.000Z");
    const asOf = new Date("2026-07-19T12:03:00.000Z");
    const templates: CapabilityTemplate[] = [{ id: "cap:x", deps: [] }];
    const late = mkObs("cap:x", observedAt, recordedAt, {});

    const strict = materializeNodesAsOf(templates, [late], asOf, "both");
    expect(strict[0]!.evidence.observedAt).toBeNull();

    const hindsight = materializeNodesAsOf(templates, [late], asOf, "evidence");
    expect(hindsight[0]!.evidence).toEqual(late.evidence);
  });
});

// ---------------------------------------------------------------------------
// Monotone in time — append-only logs never "unlearn" as asOf advances.
// ---------------------------------------------------------------------------

describe("monotone in time for append-only observation logs", () => {
  // Fixed, hand-written append-only log (recordedAt strictly increasing —
  // that IS the append order). cap:a's health flips over time (allowed);
  // cap:b appears late. No randomness — enumerated cuts, repo convention.
  const WIDE_HORIZON = 60 * 60 * 1000; // 1 hour — decay never interferes here.
  const log: TwinObservation[] = [
    mkObs("cap:a", new Date("2026-07-19T12:00:00.000Z"), new Date("2026-07-19T12:00:00.000Z"), {
      freshnessHorizonMs: WIDE_HORIZON,
    }),
    mkObs("cap:a", new Date("2026-07-19T12:02:00.000Z"), new Date("2026-07-19T12:03:00.000Z"), {
      severityTags: ["degraded"],
      freshnessHorizonMs: WIDE_HORIZON,
    }),
    mkObs("cap:b", new Date("2026-07-19T12:04:00.000Z"), new Date("2026-07-19T12:05:00.000Z"), {
      unavailable: true,
      freshnessHorizonMs: WIDE_HORIZON,
    }),
    mkObs("cap:a", new Date("2026-07-19T12:06:00.000Z"), new Date("2026-07-19T12:07:00.000Z"), {
      freshnessHorizonMs: WIDE_HORIZON,
    }),
  ];
  const cuts = [
    new Date("2026-07-19T11:59:00.000Z"), // before anything
    new Date("2026-07-19T12:00:00.000Z"),
    new Date("2026-07-19T12:02:30.000Z"), // obs 2 observed but not yet recorded
    new Date("2026-07-19T12:03:00.000Z"),
    new Date("2026-07-19T12:05:00.000Z"),
    new Date("2026-07-19T12:07:00.000Z"),
    new Date("2026-07-19T12:30:00.000Z"),
  ];

  for (const mode of ["transaction", "both"] as const satisfies readonly AsOfMode[]) {
    it(`"${mode}" mode: the covered-capability set only ever grows as asOf advances`, () => {
      let previousKeys = new Set<string>();
      for (const cut of cuts) {
        const keys = new Set(foldObservationsAsOf(log, cut, mode).keys());
        for (const key of previousKeys) {
          expect(keys.has(key)).toBe(true); // superset: never unlearns coverage
        }
        previousKeys = keys;
      }
    });
  }

  it("composed status can CHANGE as asOf advances (health flips are allowed) but never falls back to no-coverage unknown within horizons", () => {
    const templates: CapabilityTemplate[] = [
      { id: "cap:a", deps: [], defaultFreshnessHorizonMs: WIDE_HORIZON },
      { id: "cap:b", deps: [], defaultFreshnessHorizonMs: WIDE_HORIZON },
    ];

    const kindsA = cuts.map((cut) => composeGraphAsOf(templates, log, cut).get("cap:a")?.kind);
    // healthy -> degraded -> healthy: change is allowed in both directions...
    expect(kindsA).toEqual([
      "unknown", // before any observation — honest no-coverage
      "healthy",
      "healthy", // obs 2 observed but not recorded: still the 12:00 healthy view
      "impaired",
      "impaired",
      "healthy",
      "healthy",
    ]);
    // ...but once a capability is resolved (non-unknown), advancing asOf never
    // returns it to unknown while evidence is within its freshness horizon.
    const firstResolvedA = kindsA.findIndex((kind) => kind !== "unknown");
    for (let i = firstResolvedA; i < kindsA.length; i += 1) {
      expect(kindsA[i]).not.toBe("unknown");
    }

    const kindsB = cuts.map((cut) => composeGraphAsOf(templates, log, cut).get("cap:b")?.kind);
    expect(kindsB).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
      "unavailable",
      "unavailable",
      "unavailable",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
  it("foldObservationsAsOf produces deep-equal output across repeated calls with the same inputs", () => {
    const t1 = new Date("2026-07-19T12:00:00.000Z");
    const t2 = new Date("2026-07-19T12:05:00.000Z");
    const observations = [
      mkObs("cap:a", t1, t1, {}),
      mkObs("cap:b", t1, t1, { severityTags: ["stale"] }),
      mkObs("cap:a", t2, t2, { unavailable: true }),
    ];
    const asOf = new Date("2026-07-19T12:10:00.000Z");

    const f1 = Array.from(foldObservationsAsOf(observations, asOf).entries());
    const f2 = Array.from(foldObservationsAsOf(observations, asOf).entries());
    expect(f1).toEqual(f2);
  });

  it("composeGraphAsOf produces deep-equal output across repeated calls with the same inputs", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const nodes = buildSeedRegistry(asOf);
    const observations = SEED_CAPABILITY_IDS.map((id) => mkObs(id, asOf, asOf, {}));

    const r1 = Array.from(composeGraphAsOf(nodes, observations, asOf).entries());
    const r2 = Array.from(composeGraphAsOf(nodes, observations, asOf).entries());
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// Integration on the existing seed registry.
// ---------------------------------------------------------------------------

describe("composeGraphAsOf — integration on the seed registry", () => {
  it("honestly reconstructs the evolution of route:/nflverse over time while checkout stays healthy throughout", () => {
    const T1 = new Date("2026-07-19T12:00:00.000Z");
    const T2 = new Date("2026-07-19T12:05:00.000Z");
    const T3 = new Date("2026-07-19T12:10:00.000Z");
    const WIDE_HORIZON = 60 * 60 * 1000; // 1 hour — comfortably spans T1..T3.

    // Every other seed capability gets one healthy observation at T1, valid
    // (fresh) through T3, so only source:nflverse's story changes over time.
    const baselineObservations: TwinObservation[] = SEED_CAPABILITY_IDS.filter(
      (id) => id !== "source:nflverse",
    ).map((id) => mkObs(id, T1, T1, { freshnessHorizonMs: WIDE_HORIZON }));

    const nflverseHealthyAtT1 = mkObs("source:nflverse", T1, T1, {
      freshnessHorizonMs: WIDE_HORIZON,
    });
    const nflverseUnavailableAtT2 = mkObs("source:nflverse", T2, T2, {
      unavailable: true,
      freshnessHorizonMs: WIDE_HORIZON,
      reasons: ["oom_500"],
    });
    const nflverseRecoveredAtT3 = mkObs("source:nflverse", T3, T3, {
      freshnessHorizonMs: WIDE_HORIZON,
    });

    const observations: TwinObservation[] = [
      ...baselineObservations,
      nflverseHealthyAtT1,
      nflverseUnavailableAtT2,
      nflverseRecoveredAtT3,
    ];

    const nodes = buildSeedRegistry(T1);

    const atT1 = composeGraphAsOf(nodes, observations, T1);
    expect(atT1.get("source:nflverse")?.kind).toBe("healthy");
    expect(atT1.get("route:/nflverse")?.kind).toBe("healthy");
    expect(atT1.get("route:/checkout")?.kind).toBe("healthy");
    expect(atT1.get("revenue:checkout")?.kind).toBe("healthy");

    const atT2 = composeGraphAsOf(nodes, observations, T2);
    expect(atT2.get("source:nflverse")?.kind).toBe("unavailable");
    expect(atT2.get("route:/nflverse")?.kind).toBe("unavailable");
    // Blast-radius honesty holds as-of every reconstruction point.
    expect(atT2.get("route:/checkout")?.kind).toBe("healthy");
    expect(atT2.get("revenue:checkout")?.kind).toBe("healthy");
    expect(atT2.get("db:primary")?.kind).toBe("healthy");

    const atT3 = composeGraphAsOf(nodes, observations, T3);
    expect(atT3.get("source:nflverse")?.kind).toBe("healthy");
    expect(atT3.get("route:/nflverse")?.kind).toBe("healthy");
    expect(atT3.get("route:/checkout")?.kind).toBe("healthy");
    expect(atT3.get("revenue:checkout")?.kind).toBe("healthy");
  });
});
