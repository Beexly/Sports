import { describe, it, expect } from "vitest";
import { composeDailyBrief, composeBrief } from "@/lib/brief/compose";

describe("composeDailyBrief (stub)", () => {
  it("returns a status of DRAFT until the composer is restored", () => {
    const out = composeDailyBrief({ date: new Date("2026-05-19") });
    expect(out.status).toBe("DRAFT");
    expect(out.responsibleGamingText).toContain("responsibly");
  });
});

describe("composeBrief settlement section", () => {
  it("M-F10: the settled total reconciles with the W-L-P-V breakdown when VOID rows are present", () => {
    const out = composeBrief({
      date: new Date("2026-07-18"),
      settled: [
        { selection: "A", sport: "NFL", result: "WIN" },
        { selection: "B", sport: "NFL", result: "LOSS" },
        { selection: "C", sport: "NFL", result: "VOID" },
      ],
    });
    const settlement = out.sections.find((s) => s.type === "settlement");
    expect(settlement?.body).toBe("Settled 3: 1W-1L-1V (no action).");
  });

  it("omits the VOID term entirely when no picks were voided", () => {
    const out = composeBrief({
      date: new Date("2026-07-18"),
      settled: [
        { selection: "A", sport: "NFL", result: "WIN" },
        { selection: "B", sport: "NFL", result: "PUSH" },
      ],
    });
    const settlement = out.sections.find((s) => s.type === "settlement");
    expect(settlement?.body).toBe("Settled 2: 1W-0L-1P.");
    expect(settlement?.body).not.toContain("V");
  });
});
