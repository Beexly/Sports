import { describe, it, expect } from "vitest";
import { generateWeeklyBrief } from "./studio";

describe("galaxy studios brief", () => {
  const brief = generateWeeklyBrief();

  it("is flagged draft-only (never auto-published)", () => {
    expect(brief.draftOnly).toBe(true);
    expect(brief.plaintext.toLowerCase()).toContain("not published");
  });

  it("composes all five sections, each with content", () => {
    expect(brief.sections.length).toBe(5);
    for (const s of brief.sections) {
      expect(s.heading.length).toBeGreaterThan(0);
      expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it("titles by the current week and renders a plaintext draft", () => {
    expect(brief.title).toContain(`Week ${brief.week}`);
    expect(brief.plaintext).toContain(brief.title);
    expect(brief.plaintext).toContain("Waiver wire");
  });

  it("is deterministic — same data, same brief", () => {
    expect(generateWeeklyBrief().plaintext).toBe(brief.plaintext);
  });
});
