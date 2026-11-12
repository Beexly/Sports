/**
 * Tests for the coaching evidence loader.
 *
 * The real source is COACH_32_STAFF_PROFILES (coach-sim), keyed "LA"/"WAS".
 * These tests pin the two known defects shut:
 *  1. LA and LAR must resolve to the SAME staff record (canonicalTeamCode on
 *     both the request and the table keys).
 *  2. A failed lookup must return MISSING — never the old Green Bay (home) /
 *     Carolina (away) fallback, never any other team's staff.
 *
 * The staff constant is undated, so REAL requires a caller-supplied opts.asOf
 * (the staff-seal instant). Without it the loader returns MISSING rather than
 * inventing a timestamp. Coordinator names are absent from the source and
 * ship as null — the contract's nullable fields — never invented.
 */

import { describe, expect, it } from "vitest";
import { COACH_32_STAFF_PROFILES } from "@sports/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.js";
import { COACHING_SOURCE, loadCoaching, type StaffProfileRow } from "./coaching.js";

/** Test-only staff-seal instant. The real caller supplies the actual seal time. */
const SEAL = "2026-11-03T04:00:00Z";

describe("loadCoaching — alias resolution", () => {
  it("LA and LAR resolve to the same REAL staff record", () => {
    const la = loadCoaching("LA", { asOf: SEAL });
    const lar = loadCoaching("LAR", { asOf: SEAL });
    expect(la.status).toBe("REAL");
    expect(lar.status).toBe("REAL");
    if (la.status !== "REAL" || lar.status !== "REAL") return;
    expect(la.value).toEqual(lar.value);
    expect(la.value.team).toBe("LAR");
    expect(la.asOf).toBe(SEAL);
    expect(la.source).toBe(COACHING_SOURCE);

    // Values come from the real source row, not a fallback team.
    const source = COACH_32_STAFF_PROFILES["LA"];
    expect(source).toBeDefined();
    if (source === undefined) return;
    expect(la.value.headCoach).toBe(source.headCoach);
    // staffAggression is the source's empirical 4th-and-short go rate.
    expect(la.value.fourthDownAggression).toBe(source.staffAggression);
    // Coordinator names do not exist in the source: null, never invented.
    expect(la.value.offensiveCoordinator).toBeNull();
    expect(la.value.defensiveCoordinator).toBeNull();
  });

  it("WAS and WSH resolve to the same REAL staff record", () => {
    const was = loadCoaching("WAS", { asOf: SEAL });
    const wsh = loadCoaching("WSH", { asOf: SEAL });
    expect(was.status).toBe("REAL");
    expect(wsh.status).toBe("REAL");
    if (was.status !== "REAL" || wsh.status !== "REAL") return;
    expect(was.value).toEqual(wsh.value);
    expect(was.value.team).toBe("WSH");
  });

  it("each team gets its OWN staff — GB is not CAR and neither is handed to LAR", () => {
    const gb = loadCoaching("GB", { asOf: SEAL });
    const car = loadCoaching("CAR", { asOf: SEAL });
    const lar = loadCoaching("LAR", { asOf: SEAL });
    expect(gb.status).toBe("REAL");
    expect(car.status).toBe("REAL");
    expect(lar.status).toBe("REAL");
    if (gb.status !== "REAL" || car.status !== "REAL" || lar.status !== "REAL") return;
    const gbSource = COACH_32_STAFF_PROFILES["GB"];
    const carSource = COACH_32_STAFF_PROFILES["CAR"];
    expect(gbSource).toBeDefined();
    expect(carSource).toBeDefined();
    if (gbSource === undefined || carSource === undefined) return;
    expect(gb.value.headCoach).toBe(gbSource.headCoach);
    expect(car.value.headCoach).toBe(carSource.headCoach);
    expect(gb.value.headCoach).not.toBe(car.value.headCoach);
    expect(lar.value.headCoach).not.toBe(gb.value.headCoach);
    expect(lar.value.headCoach).not.toBe(car.value.headCoach);
  });
});

describe("loadCoaching — no fallback, ever", () => {
  it("unknown team returns MISSING", () => {
    const e = loadCoaching("NOTATEAM", { asOf: SEAL });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("unknown team");
  });

  it("missing home lookup returns MISSING — not the old Green Bay fallback", () => {
    const gbOnly: Readonly<Record<string, StaffProfileRow>> = {
      GB: { headCoach: "M.LaFleur", staffAggression: 0.81 },
    };
    const e = loadCoaching("LAR", { staff: gbOnly, asOf: SEAL });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toBe("no staff record for LAR");
  });

  it("missing away lookup returns MISSING — not the old Carolina fallback", () => {
    const onlyLar: Readonly<Record<string, StaffProfileRow>> = {
      LA: { headCoach: "S.McVay", staffAggression: 0.52 },
    };
    const gb = loadCoaching("GB", { staff: onlyLar, asOf: SEAL });
    const car = loadCoaching("CAR", { staff: onlyLar, asOf: SEAL });
    expect(gb.status).toBe("MISSING");
    expect(car.status).toBe("MISSING");
    if (gb.status === "MISSING") expect(gb.reason).toBe("no staff record for GB");
    if (car.status === "MISSING") expect(car.reason).toBe("no staff record for CAR");
  });

  it("conflicting LA/LAR keys are a conflict, never an arbitrary pick", () => {
    const both: Readonly<Record<string, StaffProfileRow>> = {
      LA: { headCoach: "S.McVay", staffAggression: 0.52 },
      LAR: { headCoach: "Someone Else", staffAggression: 0.9 },
    };
    const e = loadCoaching("LAR", { staff: both, asOf: SEAL });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("conflicting staff records for LAR");
  });

  it("staff row without a headCoach returns MISSING naming the field", () => {
    const e = loadCoaching("LAR", { staff: { LAR: { staffAggression: 0.5 } }, asOf: SEAL });
    expect(e.status).toBe("MISSING");
    if (e.status !== "MISSING") return;
    expect(e.reason).toContain("headCoach");
  });
});

describe("loadCoaching — timestamp honesty and full records", () => {
  it("without opts.asOf the undated constant yields MISSING, and LA/LAR still agree", () => {
    const la = loadCoaching("LA");
    const lar = loadCoaching("LAR");
    expect(la.status).toBe("MISSING");
    expect(lar.status).toBe("MISSING");
    if (la.status !== "MISSING" || lar.status !== "MISSING") return;
    expect(la.reason).toContain("opts.asOf");
    expect(la).toEqual(lar);
  });

  it("a complete injected row ships REAL with coordinator names intact", () => {
    const complete: StaffProfileRow = {
      headCoach: "Test HC",
      offensiveCoordinator: "Test OC",
      defensiveCoordinator: "Test DC",
      fourthDownAggression: 0.6,
    };
    const e = loadCoaching("LAR", { staff: { LAR: complete }, asOf: SEAL });
    expect(e.status).toBe("REAL");
    if (e.status !== "REAL") return;
    expect(e.value).toEqual({
      team: "LAR",
      headCoach: "Test HC",
      offensiveCoordinator: "Test OC",
      defensiveCoordinator: "Test DC",
      fourthDownAggression: 0.6,
    });
    expect(e.asOf).toBe(SEAL);
  });

  it("empty-string coordinator names are treated as absent (null), not shipped", () => {
    const e = loadCoaching("LAR", {
      staff: { LAR: { headCoach: "Test HC", offensiveCoordinator: "  ", staffAggression: 0.5 } },
      asOf: SEAL,
    });
    expect(e.status).toBe("REAL");
    if (e.status !== "REAL") return;
    expect(e.value.offensiveCoordinator).toBeNull();
    expect(e.value.defensiveCoordinator).toBeNull();
    expect(e.value.fourthDownAggression).toBe(0.5);
  });
});
