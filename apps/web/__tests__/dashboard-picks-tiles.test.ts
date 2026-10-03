import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /dashboard — picks rendering tile contract.
 *
 * The dashboard surfaces today's picks + a demo-mode disclosure. The
 * other launch-night session owns the visual implementation
 * (`SampleDataBanner`, `PickRow`); this test pins the source-level
 * contract so a future refactor doesn't strip the picks list or the
 * demo-mode disclosure.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

describe("/dashboard picks-render contract", () => {
  it("queries today's picks from db.pick", () => {
    expect(src).toMatch(/todayPicks/);
  });

  it("renders a Today's picks section", () => {
    expect(src).toMatch(/Today's picks/);
  });

  it("filters customer-facing pick queries to non-bootstrap when the query is a customer claim", () => {
    expect(src).toMatch(/isBootstrap:\s*false/);
  });

  it("renders a demo-mode disclosure when demoActive is true", () => {
    expect(src).toMatch(/demoActive/);
    expect(src).toMatch(/SampleDataBanner|dashboard-sample-mode|Sample mode/i);
  });

  it("the demo-mode disclosure copy is brand-safe (no banned phrases)", () => {
    expect(src).not.toMatch(/guaranteed|risk-free|sure thing|easy money/i);
  });

  it("renders an individual pick row component", () => {
    expect(src).toMatch(/PickRow|<li[\s\S]{0,400}selection/);
  });

  it("renders an empty-state message when there are no picks today", () => {
    expect(src).toMatch(/No picks\b|No picks generated/i);
  });
});
