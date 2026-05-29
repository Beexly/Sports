import { describe, it, expect } from "vitest";
import { composeDailyBrief } from "@/lib/brief/daily-brief";

const NOW = new Date("2026-05-29T10:00:00Z");

function base(overrides = {}): Parameters<typeof composeDailyBrief>[0] {
  return {
    publishedToday: 0,
    gatedToday: 0,
    scoringNow: 0,
    autopsiesWaiting: 0,
    topSignalMatchup: null,
    topPassMatchup: null,
    modelVersion: null,
    now: NOW,
    ...overrides,
  };
}

describe("composeDailyBrief", () => {
  it("returns a brief with at least 'What changed' and 'Read the record' sections", () => {
    const brief = composeDailyBrief(base());
    expect(brief.title).toBe("Today's brief");
    expect(brief.sections.length).toBeGreaterThanOrEqual(2);
    const titles = brief.sections.map((s) => s.title);
    expect(titles).toContain("What changed");
    expect(titles).toContain("Read the record");
  });

  it("includes 'What to ignore' only when games were gated", () => {
    const withGated = composeDailyBrief(base({ gatedToday: 3 }));
    expect(withGated.sections.map((s) => s.title)).toContain("What to ignore");
    const withoutGated = composeDailyBrief(base({ gatedToday: 0 }));
    expect(withoutGated.sections.map((s) => s.title)).not.toContain("What to ignore");
  });

  it("includes 'What's waiting' only when autopsies are pending", () => {
    const withAutopsies = composeDailyBrief(base({ autopsiesWaiting: 2 }));
    expect(withAutopsies.sections.map((s) => s.title)).toContain("What's waiting");
    const noAutopsies = composeDailyBrief(base({ autopsiesWaiting: 0 }));
    expect(noAutopsies.sections.map((s) => s.title)).not.toContain("What's waiting");
  });

  it("singularizes/pluralizes correctly", () => {
    const single = composeDailyBrief(base({ publishedToday: 1 }));
    expect(single.sections[0]!.body).toMatch(/1 pick published/);
    const many = composeDailyBrief(base({ publishedToday: 7 }));
    expect(many.sections[0]!.body).toMatch(/7 picks published/);
  });

  it("includes the top signal matchup when present", () => {
    const brief = composeDailyBrief(
      base({ publishedToday: 2, topSignalMatchup: "Chiefs @ Eagles" }),
    );
    expect(brief.sections[0]!.body).toContain("Chiefs @ Eagles");
  });

  it("includes model version in closing when present", () => {
    const brief = composeDailyBrief(base({ modelVersion: "v5.1.0" }));
    expect(brief.closing).toContain("v5.1.0");
  });

  it("every section has a link", () => {
    const brief = composeDailyBrief(base({ publishedToday: 1, gatedToday: 1, autopsiesWaiting: 1 }));
    for (const section of brief.sections) {
      expect(section.link).toBeDefined();
      expect(section.link?.href).toBeTruthy();
    }
  });

  it("is a pure function", () => {
    const a = composeDailyBrief(base({ publishedToday: 2 }));
    const b = composeDailyBrief(base({ publishedToday: 2 }));
    expect(a).toEqual(b);
  });
});
