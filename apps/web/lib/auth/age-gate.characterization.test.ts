/**
 * Characterization tests — G-21 Age Gate (gate-sweep batch 1, 2026-10-15).
 * Extends the existing age-gate.test.ts pins to branches it does not cover;
 * pins CURRENT behavior only. NOTE (recorded in the shadow registry): the
 * hard 21+ checkout gate was REMOVED 2026-09-14 by founder decision; this
 * module is retained utilities. Shadow registration is documentation-grade;
 * nothing here re-wires it into checkout.
 * Registry: intelligence/gate-wiring/shadow-registry.json (weight 0).
 */
import { describe, expect, it } from "vitest";
import {
  MINIMUM_AGE_YEARS,
  ageInFullYears,
  assertAtLeast21,
  parseIsoDateOnly,
} from "./age-gate";

const NOW = new Date("2026-08-21T00:00:00.000Z");

describe("age gate — pinned constants and missing-input branches", () => {
  it("pins MINIMUM_AGE_YEARS at 21", () => {
    expect(MINIMUM_AGE_YEARS).toBe(21);
  });

  it("treats null and empty string as missing_date_of_birth", () => {
    expect(assertAtLeast21(null, NOW).code).toBe("missing_date_of_birth");
    expect(assertAtLeast21("", NOW).code).toBe("missing_date_of_birth");
  });
});

describe("parseIsoDateOnly — parser edges", () => {
  it("returns null for non-string input", () => {
    expect(parseIsoDateOnly(42)).toBeNull();
    expect(parseIsoDateOnly({})).toBeNull();
    expect(parseIsoDateOnly(null)).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    const d = parseIsoDateOnly("  2000-01-15  ");
    expect(d?.toISOString().slice(0, 10)).toBe("2000-01-15");
  });

  it("rejects rollover dates that do not exist (Feb 30)", () => {
    expect(parseIsoDateOnly("2000-02-30")).toBeNull();
  });
});

describe("age boundaries", () => {
  it("passes at exactly midnight UTC on the 21st birthday", () => {
    const r = assertAtLeast21("2005-08-21", NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ageYears).toBe(21);
  });

  it("counts a Feb-29 birthdate as turning a year older on Mar 1 in non-leap years", () => {
    const dob = new Date(Date.UTC(2004, 1, 29));
    expect(ageInFullYears(dob, new Date(Date.UTC(2025, 1, 28)))).toBe(20);
    expect(ageInFullYears(dob, new Date(Date.UTC(2025, 2, 1)))).toBe(21);
  });
});
