import { describe, expect, it } from "vitest";
import { ageInFullYears, assertAtLeast21, parseIsoDateOnly } from "./age-gate";

const NOW = new Date("2026-08-21T18:00:00.000Z");

describe("parseIsoDateOnly", () => {
  it("accepts a real UTC calendar date", () => {
    const d = parseIsoDateOnly("2000-02-29");
    expect(d?.toISOString().slice(0, 10)).toBe("2000-02-29");
  });

  it("rejects impossible dates", () => {
    expect(parseIsoDateOnly("2026-02-29")).toBeNull();
    expect(parseIsoDateOnly("2026-13-01")).toBeNull();
    expect(parseIsoDateOnly("21-08-2026")).toBeNull();
    expect(parseIsoDateOnly("")).toBeNull();
  });
});

describe("ageInFullYears", () => {
  it("is 20 the day before the 21st birthday and 21 on the birthday", () => {
    const dob = new Date(Date.UTC(2005, 7, 21));
    expect(ageInFullYears(dob, new Date(Date.UTC(2026, 7, 20)))).toBe(20);
    expect(ageInFullYears(dob, new Date(Date.UTC(2026, 7, 21)))).toBe(21);
  });
});

describe("assertAtLeast21", () => {
  it("passes a 21-year-old on their birthday", () => {
    const result = assertAtLeast21("2005-08-21", NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.ageYears).toBe(21);
  });

  it("blocks a 20-year-old", () => {
    const result = assertAtLeast21("2005-08-22", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("age_restricted");
      expect(result.ageYears).toBe(20);
    }
  });

  it("blocks missing and invalid dates before looking at age", () => {
    expect(assertAtLeast21(undefined, NOW).code).toBe("missing_date_of_birth");
    expect(assertAtLeast21("not-a-date", NOW).code).toBe("invalid_date_of_birth");
    expect(assertAtLeast21("2099-01-01", NOW).code).toBe("invalid_date_of_birth");
  });
});
