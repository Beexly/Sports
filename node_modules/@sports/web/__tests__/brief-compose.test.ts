import { describe, it, expect } from "vitest";
import { composeDailyBrief } from "@/lib/brief/compose";

describe("composeDailyBrief (stub)", () => {
  it("returns a status of DRAFT until the composer is restored", () => {
    const out = composeDailyBrief({ date: new Date("2026-05-19") });
    expect(out.status).toBe("DRAFT");
    expect(out.responsibleGamingText).toContain("responsibly");
  });
});
