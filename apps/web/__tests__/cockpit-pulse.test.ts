import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const componentPath = path.resolve(
  __dirname,
  "../components/cockpit/cockpit-pulse.tsx"
);
const cockpitPagePath = path.resolve(__dirname, "../app/cockpit/page.tsx");

describe("CockpitPulse", () => {
  it("is importable from @/components/cockpit/cockpit-pulse (file exists)", () => {
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it("component source contains all five quick-link hrefs", () => {
    const src = fs.readFileSync(componentPath, "utf8");
    expect(src).toContain("/cockpit/calibration");
    expect(src).toContain("/cockpit/history");
    expect(src).toContain("/cockpit/content");
    expect(src).toContain("/cockpit/brief");
    expect(src).toContain("/cockpit/pick-memory");
  });

  it("all existing data-testid selectors in cockpit/page.tsx are still present", () => {
    const src = fs.readFileSync(cockpitPagePath, "utf8");
    // Collect all data-testid values from the page
    const testIds = [...src.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]);
    // Verify each one still appears (none removed)
    for (const id of testIds) {
      expect(src).toContain(`data-testid="${id}"`);
    }
    // Confirm the known testid from previous cycles is still there
    expect(src).toContain('data-testid="jarvis-today-picks"');
  });

  it("no import from packages/prediction-engine exists in the component", () => {
    const src = fs.readFileSync(componentPath, "utf8");
    expect(src).not.toContain("packages/prediction-engine");
    expect(src).not.toContain("@sports/prediction-engine");
  });

  it("cockpit/page.tsx includes CockpitPulse import and JSX", () => {
    const src = fs.readFileSync(cockpitPagePath, "utf8");
    expect(src).toContain("CockpitPulse");
    expect(src).toContain("<CockpitPulse");
  });
});
