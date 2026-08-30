import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const cockpit = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");
const dashboard = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

/**
 * Cockpit + dashboard accessibility contracts.
 *
 * Locks the role/aria attributes added in the morning a11y pass so
 * future refactors don't silently drop screen-reader information.
 */

describe("/cockpit a11y", () => {
  it("HealthTile renders role=status with composite aria-label", () => {
    expect(cockpit).toMatch(/role="status"/);
    expect(cockpit).toMatch(/aria-label=\{`\$\{label\}: \$\{health\.toLowerCase\(\)\}`\}/);
  });

  it("Today's picks pill has an aria-label", () => {
    expect(cockpit).toMatch(/aria-label="Picks generated today"/);
  });

  it("slate breakdown section is aria-labelled", () => {
    expect(cockpit).toMatch(/aria-label="Today's slate breakdown by sport"/);
  });

  it("cockpit nav aside is aria-labelled", () => {
    // labelled in layout, not page; but page should never strip the role
    expect(cockpit).not.toMatch(/role="presentation"/);
  });
});

describe("/dashboard a11y", () => {
  it("sample-mode pill has aria-label", () => {
    expect(dashboard).toMatch(/aria-label="Sample mode/);
  });

  it("sample-data banner uses role=status + aria-live=polite", () => {
    expect(dashboard).toMatch(/role="status"/);
    expect(dashboard).toMatch(/aria-live="polite"/);
  });

  it("confidence bar has aria-label with the percentage", () => {
    expect(dashboard).toMatch(/aria-label=\{`Confidence \$\{pick\.confidence\}%`\}/);
  });

  it("edge-score badge has aria-label with the score", () => {
    expect(dashboard).toMatch(/aria-label=\{`Edge score \$\{pick\.edgeScore\.toFixed\(1\)\}`\}/);
  });
});
