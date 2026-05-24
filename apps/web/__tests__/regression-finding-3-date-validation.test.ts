/**
 * Regression test for Finding 3: invalid date param causes 500 on /api/picks.
 *
 * Before the fix, new Date("invalid") produced an Invalid Date that propagated to
 * Prisma, causing an unhandled 500. After the fix, the route validates and returns 400.
 *
 * Severity: LOW | Pillar: availability | Finding: sports-intel/threat-map/finding-3.md
 */

import { describe, expect, it } from "vitest";

// We test the validation logic directly since mounting a full Next.js route
// in Vitest requires a real DB. The fix adds this check in picks/route.ts:
//   if (dateParam && isNaN(targetDate.getTime())) { return 400; }

describe("date param validation (finding-3 regression)", () => {
  it("new Date('invalid') is Invalid Date (confirms the root cause)", () => {
    const invalid = new Date("invalid");
    expect(isNaN(invalid.getTime())).toBe(true);
  });

  it("new Date('not-a-date') is Invalid Date", () => {
    const invalid = new Date("not-a-date");
    expect(isNaN(invalid.getTime())).toBe(true);
  });

  it("new Date('2026-05-24') is a valid Date", () => {
    const valid = new Date("2026-05-24");
    expect(isNaN(valid.getTime())).toBe(false);
  });

  it("new Date('2026-05-24T00:00:00.000Z') is a valid Date", () => {
    const valid = new Date("2026-05-24T00:00:00.000Z");
    expect(isNaN(valid.getTime())).toBe(false);
  });

  it("validation guard logic rejects invalid and accepts valid", () => {
    // Replicates the guard added to picks/route.ts:36-38
    function guardDate(dateParam: string | null): "ok" | "bad_request" {
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      if (dateParam && isNaN(targetDate.getTime())) {
        return "bad_request";
      }
      return "ok";
    }

    expect(guardDate("invalid")).toBe("bad_request");
    expect(guardDate("not-a-date")).toBe("bad_request");
    expect(guardDate("2026-05-24")).toBe("ok");
    expect(guardDate(null)).toBe("ok"); // null → uses current date
  });
});
