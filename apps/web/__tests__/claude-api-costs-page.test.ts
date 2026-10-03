import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/cockpit/api-costs/page.tsx"),
  "utf8"
);
const control = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/cockpit/api-costs/budget-override-control.tsx"),
  "utf8"
);

describe("Claude API costs cockpit page", () => {
  it("renders a budget override control for every surface row", () => {
    expect(page).toContain("BudgetOverrideControl");
    expect(page).toContain("surface={surface.surface}");
    expect(page).toContain("overrideActive={surface.overrideActive}");
  });

  it("posts override changes with an operator reason and refreshes the monitor", () => {
    expect(control.split(/\r?\n/)[0]).toContain("use client");
    expect(control).toContain('fetch("/api/cockpit/api-costs/override"');
    expect(control).toContain("reason.trim().length >= 12");
    expect(control).toContain("Enable 24h");
    expect(control).toContain("router.refresh()");
  });
});
