import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /deck must declare itself illustrative.
 *
 * app/deck/page.tsx is a design concept: its SYSTEMS and AGENTS constants are
 * fixed values chosen to show a layout, NOT readings taken from any running
 * system. The page is public, carries no gate, renders the full public
 * Nav + Footer, and is crawlable (app/robots.ts allows "/" and disallows only
 * the operator surfaces), so an unlabelled version publishes invented
 * operational numbers as though they were observed.
 *
 * That is exactly what CLAUDE.md rules 1-2 ("no fake data", "no fabricated
 * stats") and AGENTS.md law 8 ("no mock picks, sample odds, placeholder win
 * rates, invented benchmarks. Anywhere.") forbid. The repo's established
 * remedy is to say so in the interface: /airwave calls its ledger "an
 * illustrative ledger demo" and names DEMO_PUNDITS; lib/cockpit/mission-control.ts
 * prefixes sample cards with "Sample · ".
 *
 * These assertions pin that labelling so it cannot be quietly dropped during a
 * copy or design pass. If /deck is ever wired to real telemetry, delete the
 * hardcoded constants and these assertions together — do not edit the numbers
 * and keep the shape.
 */

const SOURCE = readFileSync(
  resolve(__dirname, "..", "app", "deck", "page.tsx"),
  "utf8",
);

describe("/deck illustrative labelling", () => {
  it("renders a visible banner disclaiming live telemetry", () => {
    expect(SOURCE).toContain('data-testid="deck-illustrative-banner"');
    expect(SOURCE).toContain("Illustrative interface concept.");
    expect(SOURCE).toMatch(/not live\s*\n?\s*telemetry/);
  });

  it("labels the systems readouts as illustrative", () => {
    expect(SOURCE).toContain("Active systems · illustrative");
    expect(SOURCE).toContain("Overall system health · illustrative");
  });

  it("labels the agent fleet as illustrative", () => {
    expect(SOURCE).toContain("Agent constellation · illustrative");
  });

  it("says so in the page metadata description too", () => {
    // The description is what a search result shows, so the disclaimer has to
    // survive outside the page body.
    const description = /description:\s*\n?\s*"([^"]+)"/.exec(SOURCE)?.[1] ?? "";
    expect(description).not.toBe("");
    expect(description.toLowerCase()).toContain("illustrative");
  });

  it("keeps the hardcoded readouts flagged in source as non-live", () => {
    // The constants carry a header comment so the next reader of this file
    // cannot mistake them for a data feed.
    expect(SOURCE).toContain("ILLUSTRATIVE, NOT LIVE.");
  });

  it("does not offer the concept as a real system-status readout", () => {
    // The hero CTA used to read "System status", which promises live state.
    expect(SOURCE).not.toContain(">\n                System status\n");
  });
});
