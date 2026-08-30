import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getEntitlements, type Entitlements } from "@sports/types";

/**
 * Server-side paywall enforcement for /api/picks/[id]/audit — executed
 * against the REAL route handler (mocked session + db), not a helper.
 *
 * CLAUDE.md rule #3 (no frontend-only paywalls): the paid "factor trail /
 * audit drawer" content must be gated server-side by the caller's real
 * entitlement. The regression this pins: the pre-mortem note and the
 * fragility score were returned in BOTH tier branches, so an ANONYMOUS
 * `curl` (session === null → FREE) or a signed-in FREE viewer could read
 * confidence-at-prediction, line-movement delta, rest advantage, ATS/H2H
 * sample sizes, schedule density, data-quality score, and book depth —
 * the exact premium values the board denies FREE — straight out of
 * `preMortem` / `fragility`.
 *
 * Invariants:
 *  - ANONYMOUS and FREE → `preMortem` and `fragility` are null, and the
 *    audit body carries NONE of the premium fields (topology/counts only).
 *  - PRO and ELITE → every premium field is populated.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  sourceSnapshotFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
// This file's subject is not rate limiting, and its @sports/db mock has no
// $queryRawUnsafe / isStubMode surface for the durable limiter. Allow-all so
// the code under test decides the response; the limiter itself is covered by
// api-p9-04 / api-p9-05 / b2b-rate-limit.
vi.mock("@/lib/api/public-form-rate-limit", () => ({
  consumePublicFormRateLimit: vi.fn(async () => ({ ok: true, backend: "memory" })),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findUnique: mocks.pickFindUnique },
    sourceSnapshot: { findMany: mocks.sourceSnapshotFindMany },
  },
}));
// Readiness gates: force the public-picks gate ON so the route reaches the
// tier branches (else it 503s). The three history gates feed the detailed
// payload's gatesAtPrediction block.
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    canExposePublicPicks: true,
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canLearnFromOutcomes: true,
  }),
  bootstrapGateResponse: (feature: string) => ({
    error: `${feature} is disabled in bootstrap mode.`,
    bootstrapMode: true,
    hint: "test-stub",
  }),
}));

import { GET } from "@/app/api/picks/[id]/audit/route";

// Concrete premium values baked into the snapshot so we can assert on them.
const SNAPSHOT = {
  id: "snap-1",
  capturedAt: new Date("2026-07-11T12:00:00.000Z"),
  hadOddsSignal: true,
  hadLineMovementSignal: true,
  hadRestSignal: true,
  hadScheduleSignal: true,
  hadAtsFormSignal: true,
  hadH2HSignal: true,
  hadVenueSignal: false,
  hadWeatherSignal: false,
  hadInjurySignal: false,
  hadPlayerSignal: false,
  hadOfficialsSignal: false,
  hadVenueEnvironmentSignal: false,
  hadPaceSignal: false,
  hadMilestoneSignal: false,
  bookmakerCount: 3,
  dataQualityScore: 64,
  lineMovementDelta: -1.5,
  restAdvantageNet: 2,
  atsFormSampleSize: 6,
  h2hSampleSize: 3,
  scheduleDensityHome: 4,
  scheduleDensityAway: 2,
  modelVersion: "v5.0.0",
  confidenceAtPrediction: 78,
  isBootstrap: false,
};

function pickFixture() {
  return {
    id: "pick-1",
    isPublished: true,
    isBootstrap: false,
    selection: "Chiefs -3.5",
    pickType: "SPREAD",
    confidence: 78,
    edgeScore: 60,
    consensusPct: 0.58,
    bookmakerCount: 3,
    riskLevel: "MODERATE",
    modelVersion: "v5.0.0",
    generatedAt: new Date("2026-07-11T13:00:00.000Z"),
    signalSnapshot: SNAPSHOT,
    game: {
      homeTeamName: "Chiefs",
      awayTeamName: "Broncos",
      odds: [],
    },
  };
}

function request() {
  return new NextRequest("http://localhost/api/picks/pick-1/audit");
}
const context = { params: { id: "pick-1" } };

// Every premium field name that must NOT appear on the audit body for an
// un-entitled caller. These live only on AuditPayloadDetailed.
const PREMIUM_AUDIT_FIELDS = [
  "confidenceAtPrediction",
  "dataQualityScore",
  "bookmakerCount",
  "lineMovementDelta",
  "restAdvantageNet",
  "atsFormSampleSize",
  "h2hSampleSize",
  "scheduleDensityHome",
  "scheduleDensityAway",
  "signalCategories",
  "sourceSnapshots",
  "deathClock",
] as const;

// Marker strings emitted ONLY by the premium pre-mortem / fragility builders.
// Their absence from the serialized body proves nothing leaked under any key.
const PREMIUM_MARKERS = [
  "What would have to go wrong", // preMortem headline
  "Book depth",                  // fragility component name
  "Evidence health",             // fragility component name
  "Structural only",             // fragility weakness text
  "confidence",                  // preMortem summary ("scored at N confidence")
];

describe("GET /api/picks/[id]/audit — server-side paywall", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getUserEntitlements.mockReset();
    mocks.pickFindUnique.mockReset().mockResolvedValue(pickFixture());
    mocks.sourceSnapshotFindMany.mockReset().mockResolvedValue([]);
    mocks.getUserEntitlements.mockImplementation(
      async (_userId: string): Promise<Entitlements> => getEntitlements("FREE"),
    );
  });

  it("ANONYMOUS caller: no session → premium content withheld", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await GET(request(), context);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.audit.tier).toBe("FREE");
    // The paid detail is NULL, not merely hidden client-side.
    expect(body.preMortem).toBeNull();
    expect(body.fragility).toBeNull();
    // Anonymous never even resolves entitlements (no user id).
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
    // None of the premium detail fields are present on the audit body.
    for (const field of PREMIUM_AUDIT_FIELDS) {
      expect(body.audit[field]).toBeUndefined();
    }
    // Belt-and-suspenders: no premium marker string anywhere in the payload.
    const serialized = JSON.stringify(body);
    for (const marker of PREMIUM_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("FREE caller: signed-in FREE tier → premium content withheld", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "free-user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    const res = await GET(request(), context);
    const body = await res.json();

    expect(body.audit.tier).toBe("FREE");
    expect(body.preMortem).toBeNull();
    expect(body.fragility).toBeNull();
    expect(mocks.getUserEntitlements).toHaveBeenCalledWith("free-user");
    for (const field of PREMIUM_AUDIT_FIELDS) {
      expect(body.audit[field]).toBeUndefined();
    }
    const serialized = JSON.stringify(body);
    for (const marker of PREMIUM_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
    // The FREE-safe topology summary is still delivered (drives upgrade).
    expect(body.audit.signalCategoryCount).toBeGreaterThan(0);
    expect(body.audit.upgradeRequiredForDetail).toBe(true);
  });

  it("PRO caller: full audit — premium fields populated", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "pro-user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("PRO"));

    const res = await GET(request(), context);
    const body = await res.json();

    expect(body.audit.tier).toBe("PRO");
    // Premium numeric detail from the snapshot.
    expect(body.audit.confidenceAtPrediction).toBe(78);
    expect(body.audit.dataQualityScore).toBe(64);
    expect(body.audit.bookmakerCount).toBe(3);
    expect(body.audit.lineMovementDelta).toBe(-1.5);
    expect(body.audit.restAdvantageNet).toBe(2);
    expect(body.audit.atsFormSampleSize).toBe(6);
    expect(body.audit.h2hSampleSize).toBe(3);
    expect(Array.isArray(body.audit.signalCategories)).toBe(true);
    // Pre-mortem (factor trail) and fragility (structural risk) are populated.
    expect(body.preMortem).not.toBeNull();
    expect(body.preMortem.status).toBe("READY");
    expect(typeof body.preMortem.summary).toBe("string");
    expect(body.fragility).not.toBeNull();
    expect(typeof body.fragility.score).toBe("number");
    expect(Array.isArray(body.fragility.components)).toBe(true);
  });

  it("ELITE caller: full audit — premium fields populated", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "elite-user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    const res = await GET(request(), context);
    const body = await res.json();

    expect(body.audit.tier).toBe("ELITE");
    expect(body.audit.confidenceAtPrediction).toBe(78);
    expect(body.audit.lineMovementDelta).toBe(-1.5);
    expect(body.preMortem).not.toBeNull();
    expect(body.fragility).not.toBeNull();
  });

  it("FANTASY caller is treated as FREE on the betting audit (no full board access)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "fantasy-user" } });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FANTASY"));

    const res = await GET(request(), context);
    const body = await res.json();

    expect(body.audit.tier).toBe("FREE");
    expect(body.preMortem).toBeNull();
    expect(body.fragility).toBeNull();
  });
});
