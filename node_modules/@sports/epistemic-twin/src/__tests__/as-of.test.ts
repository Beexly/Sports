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
import { op003ToOwnEvidence } from "../adapt-op003.js";

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

  it("rejects an Invalid Date observedAt loudly (NaN would otherwise pass every comparison silently)", () => {
    const bad = mkObs("cap:x", new Date("garbage"), new Date("2026-07-19T12:00:00.000Z"));
    expect(() => assertValidObservation(bad)).toThrow(TwinObservationError);
    expect(() => assertValidObservation(bad)).toThrow(/observedAt is an Invalid Date/);
  });

  it("rejects an Invalid Date recordedAt loudly", () => {
    const bad = mkObs("cap:x", new Date("2026-07-19T12:00:00.000Z"), new Date("garbage"));
    expect(() => assertValidObservation(bad)).toThrow(/recordedAt is an Invalid Date/);
  });

  it("rejects an Invalid Date NESTED evidence.observedAt (a NaN age would read as permanently fresh in the frozen decay)", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const bad = mkObs("cap:x", t, t, { observedAt: new Date("garbage") });
    expect(() => assertValidObservation(bad)).toThrow(/evidence\.observedAt is an Invalid Date/);
  });

  it("rejects a nested evidence.observedAt that postdates recordedAt (evidence cannot be newer than the moment it was recorded)", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const future = new Date("2026-07-19T12:30:00.000Z");
    const bad = mkObs("cap:x", t, t, { observedAt: future });
    expect(() => assertValidObservation(bad)).toThrow(/postdates recordedAt/);
    // null nested evidence stays valid (no-evidence semantics).
    const nullEvidence = mkObs("cap:x", t, t, { observedAt: null });
    expect(() => assertValidObservation(nullEvidence)).not.toThrow();
  });

  it("foldObservationsAsOf validates the WHOLE stream up front: an invalid observation that would be INVISIBLE at the cut still throws", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const cut = new Date("2026-07-19T11:00:00.000Z"); // both observations invisible at this cut
    const valid = mkObs("cap:a", t, t);
    const invalid = mkObs("cap:b", t, new Date("2026-07-19T09:00:00.000Z")); // recordedAt < observedAt
    expect(() => foldObservationsAsOf([valid, invalid], cut)).toThrow(TwinObservationError);
  });

  it("with multiple invalid observations, the FIRST in input order surfaces (documented promise)", () => {
    const t = new Date("2026-07-19T12:00:00.000Z");
    const early = new Date("2026-07-19T09:00:00.000Z");
    const firstBad = mkObs("cap:first", t, early);
    const secondBad = mkObs("cap:second", t, early);
    try {
      foldObservationsAsOf([firstBad, secondBad], t);
      expect.unreachable();
    } catch (err) {
      expect((err as TwinObservationError).capabilityId).toBe("cap:first");
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

  it('"evidence" mode: winner selection stays latest-observedAt-primary even when future-recorded rows participate (mutation tripwire — last-write-wins in this mode must fail)', () => {
    // Only in "evidence" mode do rows recorded after asOf participate, so
    // this is the one mode where winner selection among mixed-recordedAt
    // rows is exercised. Probe: observed 10:00, recorded 10:05. Backfill:
    // observed 09:00, recorded 10:10 (after the cut — visible here ONLY
    // because mode is "evidence"). The probe must still win: most-recent-
    // EVIDENCE, never last-write-wins, in every mode.
    const probe = mkObs(
      "cap:x",
      new Date("2026-07-19T10:00:00.000Z"),
      new Date("2026-07-19T10:05:00.000Z"),
      {},
    );
    const lateRecordedBackfill = mkObs(
      "cap:x",
      new Date("2026-07-19T09:00:00.000Z"),
      new Date("2026-07-19T10:10:00.000Z"),
      { unavailable: true },
    );
    const cut = new Date("2026-07-19T10:07:00.000Z"); // backfill not yet recorded

    expect(
      foldObservationsAsOf([lateRecordedBackfill, probe], cut, "evidence").get("cap:x"),
    ).toEqual(probe.evidence);
    expect(foldObservationsAsOf([probe, lateRecordedBackfill], cut, "evidence").get("cap:x")).toEqual(
      probe.evidence,
    );

    // And when the future-recorded row is the LATEST evidence, it wins in
    // "evidence" mode (hindsight) while staying invisible in "both".
    const newerFutureRecorded = mkObs(
      "cap:y",
      new Date("2026-07-19T10:06:00.000Z"),
      new Date("2026-07-19T10:20:00.000Z"),
      { severityTags: ["degraded"] },
    );
    const olderRecorded = mkObs(
      "cap:y",
      new Date("2026-07-19T10:00:00.000Z"),
      new Date("2026-07-19T10:01:00.000Z"),
      {},
    );
    expect(
      foldObservationsAsOf([olderRecorded, newerFutureRecorded], cut, "evidence").get("cap:y"),
    ).toEqual(newerFutureRecorded.evidence);
    expect(foldObservationsAsOf([olderRecorded, newerFutureRecorded], cut, "both").get("cap:y")).toEqual(
      olderRecorded.evidence,
    );
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

  it("PINNED: observations whose capabilityId matches no template are IGNORED — evidence cannot create capabilities, and the intended node stays honestly unknown", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const templates: CapabilityTemplate[] = [
      { id: "db:primary", deps: [] },
      { id: "route:/picks", deps: [{ id: "db:primary", kind: "hard" }] },
    ];
    // Typo'd probe id: fold winner exists for "db:primry" but no template.
    const typoObservation = mkObs("db:primry", asOf, asOf, {});
    const picksObservation = mkObs("route:/picks", asOf, asOf, {});

    const nodes = materializeNodesAsOf(templates, [typoObservation, picksObservation], asOf);
    expect(nodes.map((n) => n.id)).toEqual(["db:primary", "route:/picks"]); // no stray node created
    const composed = composeGraphAsOf(templates, [typoObservation, picksObservation], asOf);
    expect(composed.get("db:primary")?.kind).toBe("unknown");
    expect(composed.get("db:primary")?.reasons).toContain("no_observation_as_of:db:primary");
    expect(composed.get("route:/picks")?.kind).toBe("unknown"); // contagion through the hard dep
    expect(composed.has("db:primry")).toBe(false);
  });

  it("PINNED: a template dep pointing at an id with NO template composes via composeGraph's missing_dependency path — observations for the missing id cannot rescue it", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const templates: CapabilityTemplate[] = [
      { id: "parent", deps: [{ id: "dep:x", kind: "hard" }] },
    ];
    const observations = [mkObs("parent", asOf, asOf, {}), mkObs("dep:x", asOf, asOf, {})];
    const composed = composeGraphAsOf(templates, observations, asOf);
    expect(composed.get("parent")?.kind).toBe("unknown");
    expect(composed.get("parent")?.reasons.some((r) => r.includes("missing_dependency:dep:x"))).toBe(
      true,
    );
  });

  it("PINNED: duplicate template ids follow composeGraph's own last-wins resolution (mirrored, not invented here)", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const templates: CapabilityTemplate[] = [
      { id: "dep:a", deps: [] },
      { id: "dep:b", deps: [] },
      { id: "cap:x", deps: [{ id: "dep:a", kind: "hard" }] },
      { id: "cap:x", deps: [{ id: "dep:b", kind: "hard" }] }, // duplicate — LAST wins
    ];
    const observations = [
      mkObs("dep:a", asOf, asOf, { unavailable: true }),
      mkObs("dep:b", asOf, asOf, {}),
      mkObs("cap:x", asOf, asOf, {}),
    ];
    const composed = composeGraphAsOf(templates, observations, asOf);
    // If the FIRST duplicate governed, cap:x would be unavailable via dep:a.
    expect(composed.get("cap:x")?.kind).toBe("healthy");
  });

  it("integration with the OP-003 adapter: a NEWER 'unknown' wire reading displaces older fresh healthy evidence in the fold (newer evidence about coverage wins, even when it asserts ignorance)", () => {
    const asOf = new Date("2026-07-19T12:00:00.000Z");
    const templates: CapabilityTemplate[] = [{ id: "db:primary", deps: [] }];

    const healthyAt1150 = new Date("2026-07-19T11:50:00.000Z");
    const unknownPolledAt1155 = new Date("2026-07-19T11:55:00.000Z");
    const observations: TwinObservation[] = [
      {
        capabilityId: "db:primary",
        observedAt: healthyAt1150,
        recordedAt: healthyAt1150,
        evidence: op003ToOwnEvidence(
          { capabilityId: "db:primary", status: "healthy", observedAt: healthyAt1150.toISOString() },
          60 * 60 * 1000, // fresh well past asOf — decay is not what decides this
        ),
      },
      {
        capabilityId: "db:primary",
        observedAt: unknownPolledAt1155,
        recordedAt: unknownPolledAt1155,
        // Adapter forces evidence.observedAt null for "unknown" — the nested
        // null is valid (no-evidence semantics), the OUTER timestamps drive
        // the fold.
        evidence: op003ToOwnEvidence({ capabilityId: "db:primary", status: "unknown", evidence: "none" }),
      },
    ];

    const composed = composeGraphAsOf(templates, observations, asOf);
    expect(composed.get("db:primary")?.kind).toBe("unknown");
    // And reconstructing BEFORE the unknown poll still shows healthy — the
    // as-of layer keeps both truths available.
    const earlier = composeGraphAsOf(templates, observations, new Date("2026-07-19T11:52:00.000Z"));
    expect(earlier.get("db:primary")?.kind).toBe("healthy");
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
