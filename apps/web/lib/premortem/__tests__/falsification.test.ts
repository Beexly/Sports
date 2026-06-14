/**
 * Falsification Loop (Pillar F) — unit tests
 *
 * Tests:
 *   - buildFalsificationConditions derives correct conditions from fragility
 *   - capturedAt immutability: conditions use @default(now()) and carry no
 *     update field (structural, verified by checking the returned shape)
 *   - evaluateFalsification triggers conditions when thresholds are breached
 *   - evaluateFalsification leaves conditions clean when values are healthy
 *   - Root-cause mapping: triggered injury_status → suggests INJURY_SHOCK
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── DB mock ──────────────────────────────────────────────────────────────────
// We hoist the mock factories so they are available when vi.mock() runs.
const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  update: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    falsificationCondition: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

import {
  buildFalsificationConditions,
  evaluateFalsification,
  suggestRootCause,
  type FalsificationConditionInput,
  type SettlementSignalValues,
} from "../falsification";
import type { PickPremortemSnapshotInput } from "../build";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(
  overrides: Partial<PickPremortemSnapshotInput> = {},
): PickPremortemSnapshotInput {
  return {
    id: "snap_1",
    capturedAt: new Date("2026-01-01T00:00:00Z"),
    hadLineMovementSignal: false,
    hadRestSignal: false,
    hadScheduleSignal: false,
    hadAtsFormSignal: false,
    hadH2HSignal: false,
    hadVenueSignal: false,
    hadWeatherSignal: false,
    hadInjurySignal: false,
    bookmakerCount: 8, // full depth → bookDepth component points ≈ 0
    dataQualityScore: 100,
    lineMovementDelta: null,
    restAdvantageNet: null,
    atsFormSampleSize: null,
    h2hSampleSize: null,
    scheduleDensityHome: null,
    scheduleDensityAway: null,
    modelVersion: "v1",
    ...overrides,
  };
}

const PICK = { id: "pick_abc", selection: "TeamA -3.5", confidence: 72 };

// ── buildFalsificationConditions ─────────────────────────────────────────────

describe("buildFalsificationConditions", () => {
  it("returns empty array when snapshot is null", () => {
    const conditions = buildFalsificationConditions(PICK, null);
    expect(conditions).toHaveLength(0);
  });

  it("includes bookmaker_count condition when book depth fragility is low (bookmakerCount=6)", () => {
    // bookmakerCount=6 → bookDepth points = 25*(8-6)/6 ≈ 8.3 — IS < 15 → adds condition
    // (low bookDepth points = many books at pick time; the condition watches for market thinning at settlement)
    const snapshot = makeSnapshot({ bookmakerCount: 6 });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const bk = conditions.find((c) => c.signalKey === "bookmaker_count");
    expect(bk).toBeDefined();
    expect(bk?.operator).toBe("drops_below");
    expect(bk?.threshold).toBe(3);
    expect(bk?.rationale).toContain("fewer than 3 books");
  });

  it("does NOT include bookmaker_count condition when book depth is high-fragility (bookmakerCount=2)", () => {
    // bookmakerCount=2 → bookDepth points = 25*(8-2)/6 = 25 (max) — NOT < 15 → no condition
    const snapshot = makeSnapshot({ bookmakerCount: 2 });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const bk = conditions.find((c) => c.signalKey === "bookmaker_count");
    expect(bk).toBeUndefined();
  });

  it("includes injury_status condition when hadInjurySignal is true", () => {
    const snapshot = makeSnapshot({ hadInjurySignal: true });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const inj = conditions.find((c) => c.signalKey === "injury_status");
    expect(inj).toBeDefined();
    expect(inj?.operator).toBe("flips_to");
    expect(inj?.threshold).toBe(1);
    expect(inj?.rationale).toContain("injury invalidates");
  });

  it("does NOT include injury_status condition when hadInjurySignal is false", () => {
    const snapshot = makeSnapshot({ hadInjurySignal: false });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    expect(conditions.find((c) => c.signalKey === "injury_status")).toBeUndefined();
  });

  it("includes line_movement_delta condition when hadLineMovementSignal is true", () => {
    const snapshot = makeSnapshot({ hadLineMovementSignal: true });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const lm = conditions.find((c) => c.signalKey === "line_movement_delta");
    expect(lm).toBeDefined();
    expect(lm?.operator).toBe("moves_against_by");
    expect(lm?.threshold).toBe(1.5);
  });

  it("includes consensus_pct condition when hadAtsFormSignal is true", () => {
    const snapshot = makeSnapshot({ hadAtsFormSignal: true });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const cp = conditions.find((c) => c.signalKey === "consensus_pct");
    expect(cp).toBeDefined();
    expect(cp?.operator).toBe("drops_below");
    expect(cp?.threshold).toBe(0.55);
  });

  it("includes weather_flag condition when hadWeatherSignal is true", () => {
    const snapshot = makeSnapshot({ hadWeatherSignal: true });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    const wf = conditions.find((c) => c.signalKey === "weather_flag");
    expect(wf).toBeDefined();
    expect(wf?.operator).toBe("flips_to");
    expect(wf?.threshold).toBe(1);
  });

  it("conditions are immutable at publish: no update field in the derived shape", () => {
    const snapshot = makeSnapshot({ hadInjurySignal: true });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    // The returned FalsificationConditionInput has no triggered or triggeredAt field —
    // those live only in the DB record and are written only at settlement.
    for (const cond of conditions) {
      expect("triggered" in cond).toBe(false);
      expect("triggeredAt" in cond).toBe(false);
      // capturedAt is set by @default(now()) on creation; not in the input shape.
      expect("capturedAt" in cond).toBe(false);
    }
  });

  it("pickId on every condition matches the supplied pick", () => {
    const snapshot = makeSnapshot({
      hadInjurySignal: true,
      hadWeatherSignal: true,
      hadLineMovementSignal: true,
    });
    const conditions = buildFalsificationConditions(PICK, snapshot);
    for (const c of conditions) {
      expect(c.pickId).toBe(PICK.id);
    }
  });
});

// ── evaluateFalsification ─────────────────────────────────────────────────────

describe("evaluateFalsification", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.update.mockReset();
  });

  it("triggers the line_movement_delta condition when delta = -2 and threshold = 1.5", async () => {
    const storedConditions = [
      {
        id: "fc_1",
        pickId: "pick_abc",
        signalKey: "line_movement_delta",
        operator: "moves_against_by",
        threshold: 1.5,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    const values: SettlementSignalValues = { line_movement_delta: -2 };
    await evaluateFalsification("pick_abc", values);

    expect(mocks.update).toHaveBeenCalledOnce();
    const updateCall = mocks.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { triggered: boolean; triggeredAt: Date | null };
    };
    expect(updateCall.where.id).toBe("fc_1");
    expect(updateCall.data.triggered).toBe(true);
    expect(updateCall.data.triggeredAt).toBeInstanceOf(Date);
  });

  it("does NOT trigger the line_movement_delta condition when delta = -1 (below threshold 1.5)", async () => {
    const storedConditions = [
      {
        id: "fc_2",
        pickId: "pick_abc",
        signalKey: "line_movement_delta",
        operator: "moves_against_by",
        threshold: 1.5,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    const values: SettlementSignalValues = { line_movement_delta: -1 };
    await evaluateFalsification("pick_abc", values);

    const updateCall = mocks.update.mock.calls[0]?.[0] as {
      data: { triggered: boolean; triggeredAt: Date | null };
    };
    expect(updateCall.data.triggered).toBe(false);
    expect(updateCall.data.triggeredAt).toBeNull();
  });

  it("skips a condition when its signalKey is absent from settlementValues", async () => {
    const storedConditions = [
      {
        id: "fc_3",
        pickId: "pick_abc",
        signalKey: "injury_status",
        operator: "flips_to",
        threshold: 1,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    // Provide no injury_status in values
    const values: SettlementSignalValues = { consensus_pct: 0.6 };
    await evaluateFalsification("pick_abc", values);

    // update should NOT have been called — signal was absent
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("triggers injury_status condition when injury materialized (true)", async () => {
    const storedConditions = [
      {
        id: "fc_4",
        pickId: "pick_abc",
        signalKey: "injury_status",
        operator: "flips_to",
        threshold: 1,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    const values: SettlementSignalValues = { injury_status: true };
    await evaluateFalsification("pick_abc", values);

    const updateCall = mocks.update.mock.calls[0]?.[0] as {
      data: { triggered: boolean };
    };
    expect(updateCall.data.triggered).toBe(true);
  });

  it("does not trigger injury_status when no injury (false)", async () => {
    const storedConditions = [
      {
        id: "fc_5",
        pickId: "pick_abc",
        signalKey: "injury_status",
        operator: "flips_to",
        threshold: 1,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    const values: SettlementSignalValues = { injury_status: false };
    await evaluateFalsification("pick_abc", values);

    const updateCall = mocks.update.mock.calls[0]?.[0] as {
      data: { triggered: boolean };
    };
    expect(updateCall.data.triggered).toBe(false);
  });

  it("does not trigger conditions when all settlement values are healthy", async () => {
    const storedConditions = [
      {
        id: "fc_6",
        pickId: "pick_abc",
        signalKey: "consensus_pct",
        operator: "drops_below",
        threshold: 0.55,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
      {
        id: "fc_7",
        pickId: "pick_abc",
        signalKey: "bookmaker_count",
        operator: "drops_below",
        threshold: 3,
        rationale: "test",
        capturedAt: new Date(),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    // Healthy: consensus at 65% and 7 books
    const values: SettlementSignalValues = {
      consensus_pct: 0.65,
      bookmaker_count: 7,
    };
    await evaluateFalsification("pick_abc", values);

    // Both conditions should have been evaluated and written as NOT triggered
    expect(mocks.update).toHaveBeenCalledTimes(2);
    for (const call of mocks.update.mock.calls) {
      const args = call[0] as { data: { triggered: boolean } };
      expect(args.data.triggered).toBe(false);
    }
  });

  it("never touches capturedAt in the update payload", async () => {
    const storedConditions = [
      {
        id: "fc_8",
        pickId: "pick_abc",
        signalKey: "line_movement_delta",
        operator: "moves_against_by",
        threshold: 1.5,
        rationale: "test",
        capturedAt: new Date("2026-01-01"),
        triggered: null,
        triggeredAt: null,
      },
    ];
    mocks.findMany.mockResolvedValue(storedConditions);
    mocks.update.mockResolvedValue({});

    await evaluateFalsification("pick_abc", { line_movement_delta: -2 });

    const updateCall = mocks.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect("capturedAt" in updateCall.data).toBe(false);
  });
});

// ── suggestRootCause / root-cause mapping ────────────────────────────────────

describe("suggestRootCause", () => {
  it("maps injury_status → INJURY_SHOCK", () => {
    expect(suggestRootCause("injury_status")).toBe("INJURY_SHOCK");
  });

  it("maps line_movement_delta → STALE_LINE", () => {
    expect(suggestRootCause("line_movement_delta")).toBe("STALE_LINE");
  });

  it("maps weather_flag → WEATHER", () => {
    expect(suggestRootCause("weather_flag")).toBe("WEATHER");
  });

  it("maps consensus_pct → DATA_GAP", () => {
    expect(suggestRootCause("consensus_pct")).toBe("DATA_GAP");
  });

  it("maps bookmaker_count → DATA_GAP", () => {
    expect(suggestRootCause("bookmaker_count")).toBe("DATA_GAP");
  });

  it("returns null for unknown signal keys", () => {
    expect(suggestRootCause("some_unknown_key")).toBeNull();
  });
});
