import { describe, expect, it } from "vitest";
import {
  buildAvailabilityInputs,
  depthOrderAsOf,
  designationAsOf,
  ingestDepthCharts,
  ingestInjuryDesignations,
  sleeperIntakeEnabled,
  type DepthChartEntry,
  type InjuryDesignationRecord,
} from "./sleeper-intake.js";

const enabledEnv = { SLEEPER_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;

function depth(over: Partial<DepthChartEntry> = {}): DepthChartEntry {
  return {
    playerId: "p1",
    team: "KC",
    position: "RB",
    depthOrder: 1,
    asOf: "2026-09-25T12:00:00.000Z",
    source: "sleeper",
    ...over,
  };
}

function injury(over: Partial<InjuryDesignationRecord> = {}): InjuryDesignationRecord {
  return {
    playerId: "p1",
    team: "KC",
    designation: "Healthy",
    asOf: "2026-09-25T12:00:00.000Z",
    source: "sleeper",
    ...over,
  };
}

describe("D3 sleeperIntakeEnabled", () => {
  it("is env-gated and default OFF", () => {
    expect(sleeperIntakeEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(sleeperIntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("D3 ingestDepthCharts", () => {
  it("rejects when env gate is off", () => {
    const r = ingestDepthCharts([depth()], "2026-09-25T20:00:00.000Z", {} as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
  });

  it("excludes future designations — never retroactively updated", () => {
    const r = ingestDepthCharts(
      [
        depth({ asOf: "2026-09-25T12:00:00.000Z" }),
        depth({ playerId: "p2", asOf: "2026-09-25T22:00:00.000Z" }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.accepted).toHaveLength(1);
      expect(r.data.rejected[0]!.reason).toContain("after cutoff");
    }
  });

  it("rejects bad player ids and depth orders", () => {
    const r = ingestDepthCharts(
      [
        depth(),
        depth({ playerId: "" }),
        depth({ playerId: "p2", depthOrder: 0 }),
        depth({ playerId: "p3", asOf: "nope" }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.accepted).toHaveLength(1);
      expect(r.data.rejected).toHaveLength(3);
    }
  });
});

describe("D3 ingestInjuryDesignations", () => {
  it("excludes future designations and invalid statuses", () => {
    const r = ingestInjuryDesignations(
      [
        injury(),
        injury({ playerId: "p2", asOf: "2026-09-25T23:00:00.000Z" }),
        injury({ playerId: "p3", designation: "Zombie" as never }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.accepted).toHaveLength(1);
      expect(r.data.rejected).toHaveLength(2);
    }
  });
});

describe("D3 designationAsOf / depthOrderAsOf", () => {
  it("returns the latest designation at or before asOf", () => {
    const list = [
      injury({ asOf: "2026-09-25T10:00:00.000Z", designation: "Questionable" }),
      injury({ asOf: "2026-09-25T14:00:00.000Z", designation: "Out" }),
    ];
    const e = designationAsOf(list, "p1", "2026-09-25T13:00:00.000Z");
    expect(e!.designation).toBe("Questionable");

    const later = designationAsOf(list, "p1", "2026-09-25T16:00:00.000Z");
    expect(later!.designation).toBe("Out");
  });

  it("returns null when no designation exists — never imputed as Healthy", () => {
    expect(designationAsOf([], "p1", "2026-09-25T16:00:00.000Z")).toBeNull();
    expect(designationAsOf([injury({ playerId: "other" })], "p1", "2026-09-25T16:00:00.000Z")).toBeNull();
  });

  it("returns null depth when player not on chart", () => {
    expect(depthOrderAsOf([], "p1", "2026-09-25T16:00:00.000Z")).toBeNull();
    expect(
      depthOrderAsOf([depth()], "p1", "2026-09-25T16:00:00.000Z"),
    ).toBe(1);
  });
});

describe("D3 buildAvailabilityInputs", () => {
  it("builds availability with as-of discipline", () => {
    const chart = [
      depth({ playerId: "p1", depthOrder: 1 }),
      depth({ playerId: "p2", depthOrder: 2, asOf: "2026-09-25T11:00:00.000Z" }),
    ];
    const injuries = [
      injury({ playerId: "p1", designation: "Healthy" }),
      injury({ playerId: "p2", designation: "Out" }),
    ];
    const inputs = buildAvailabilityInputs(
      ["p1", "p2", "p3"],
      chart,
      injuries,
      "2026-09-25T20:00:00.000Z",
    );
    expect(inputs).toHaveLength(3);

    const p1 = inputs.find((i) => i.playerId === "p1")!;
    expect(p1.available).toBe(true);
    expect(p1.depthOrder).toBe(1);

    const p2 = inputs.find((i) => i.playerId === "p2")!;
    expect(p2.available).toBe(false);

    // p3 has no designation — available is null, never guessed
    const p3 = inputs.find((i) => i.playerId === "p3")!;
    expect(p3.designation).toBeNull();
    expect(p3.available).toBeNull();
    expect(p3.depthOrder).toBeNull();
  });
});
