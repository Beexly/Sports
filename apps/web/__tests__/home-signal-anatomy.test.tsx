import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pageSource = readFileSync(resolve(__dirname, "..", "app", "page.tsx"), "utf8");

describe("Homepage data-first signal contract", () => {
  it("does not wire the legacy annotated sample signal into the public homepage", () => {
    expect(pageSource).not.toMatch(/AnnotatedSampleSignal/);
    expect(pageSource).not.toMatch(/annotated-sample-signal/);
  });

  it("leads with data readiness instead of a fabricated pick example", () => {
    expect(pageSource).toContain("The board is only as smart as the data behind it.");
    expect(pageSource).toContain("No public rows yet");
    expect(pageSource).toContain("Rows stay empty instead of blocking the experience or inventing data.");
  });

  it("surfaces the live board lanes without requiring sample rows", () => {
    expect(pageSource).toContain("state.scoringNow");
    expect(pageSource).toContain("state.publishedToday");
    expect(pageSource).toContain("state.gatedTodayRows");
    expect(pageSource).toContain("No active scoring rows.");
    expect(pageSource).toContain("No public pick has cleared.");
  });

  it("points users to real data sources and Trend Lab instead of static sample anatomy", () => {
    expect(pageSource).toContain("PUBLIC_DATA_SOURCES");
    expect(pageSource).toContain("TREND_BACKLOG");
    expect(pageSource).toContain("Open Trend Lab");
  });
});
