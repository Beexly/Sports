import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /cockpit header — today's-picks chip (Session A ownership).
 *
 * The chip surfaces the day's pick count next to the launch-status
 * pill, and is annotated with "(sample)" when demoActive is true.
 * Pin both pieces so a future refactor doesn't strip them.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

describe("/cockpit today's-picks chip", () => {
  it("renders the chip with data-testid=jarvis-today-picks", () => {
    expect(src).toMatch(/data-testid="jarvis-today-picks"/);
  });

  it("queries today's pick count from db.pick", () => {
    expect(src).toMatch(/todayPicksForOperator/);
    // The day window must come from the ONE shared platform definition
    // (lib/time/day-boundary.ts), not a hand-rolled local-midnight helper.
    // Pinning the shared symbol is a stronger guard than the old
    // date-fns `startOfDay` it replaced: that one anchored on the ambient
    // process timezone, so the chip could count a different day than the
    // board it sits above.
    expect(src).toMatch(/db\.pick[\s\S]{0,200}today\.start/);
    expect(src).toMatch(/from "@\/lib\/time\/day-boundary"/);
  });

  it("annotates the chip with '(sample)' when demoActive", () => {
    expect(src).toMatch(/demoActive\s*\?\s*"\s*\(sample\)/);
  });

  it("the chip's title attribute references sample-mode safety", () => {
    expect(src).toMatch(/title="[^"]*sample/i);
  });
});
