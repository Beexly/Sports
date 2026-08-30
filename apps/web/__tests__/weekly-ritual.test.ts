import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WEEKLY_RITUAL, beatsForDay } from "@/lib/house/weekly-ritual";

/**
 * Weekly NFL ritual — one canonical Mon→Mon beat map. The /house rail and
 * content automation must read the SAME module so the rhythm can't drift.
 */

describe("WEEKLY_RITUAL", () => {
  it("covers the full Mon→Mon shape — 8 beats, Monday carries two", () => {
    expect(WEEKLY_RITUAL).toHaveLength(8);
    expect(WEEKLY_RITUAL.filter((b) => b.day === "Mon")).toHaveLength(2);
    // Every calendar day is present.
    expect(new Set(WEEKLY_RITUAL.map((b) => b.dayIndex)).size).toBe(7);
  });

  it("every beat lands on a real surface — no vaporware beats", () => {
    for (const b of WEEKLY_RITUAL) {
      expect(b.beat.length).toBeGreaterThan(0);
      expect(b.surface.length).toBeGreaterThan(0);
    }
  });

  it("beatsForDay maps UTC days to beats — Sunday is game day, Monday is double", () => {
    expect(beatsForDay(new Date("2026-06-14T15:00:00Z")).map((b) => b.beat)) // a Sunday
      .toEqual(["Game day"]);
    const monday = beatsForDay(new Date("2026-06-15T15:00:00Z"));
    expect(monday).toHaveLength(2);
    expect(monday[0]!.beat).toBe("What we learned");
    expect(monday[1]!.beat).toBe("Final slate closeout");
  });
});

describe("ritual wiring", () => {
  it("the /house rail renders the canonical module, not its own calendar", () => {
    const page = readFileSync(
      join(__dirname, "..", "app", "house", "page.tsx"),
      "utf8",
    );
    expect(page).toContain('from "@/lib/house/weekly-ritual"');
    expect(page).not.toMatch(/\{ day: "Mon", beat:/); // no inline copy left
  });
});
