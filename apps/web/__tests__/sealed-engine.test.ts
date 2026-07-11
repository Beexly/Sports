import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEngineStory } from "../lib/engine/load-engine-story";

/**
 * The Sealed Engine — pins for the flagship experience AND for the standing
 * founder doctrine it embodies: outcomes and proofs are public, METHOD IS
 * NOT. If a future edit makes this page or its loader touch factor names,
 * weights, thresholds, gate reasons, or reasoning prose, these tests name
 * the breach.
 */

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", rel), "utf8");

describe("sealed engine — method opacity (founder doctrine, CI-enforced)", () => {
  it("the loader never selects method-bearing fields", () => {
    const loader = read("lib/engine/load-engine-story.ts");
    for (const banned of [
      "factorBreakdown",
      "reasoningShort",
      "reasonCode",
      "edgeIndex",
      "payload",
    ]) {
      expect(loader, `loader must never select ${banned}`).not.toContain(
        `${banned}: true`,
      );
    }
    // Gate telemetry is counts-only: groupBy on status, no reason fields.
    expect(loader).toContain('by: ["status"]');
    expect(loader).not.toContain("reason: true");
  });

  it("the page renders no method vocabulary", () => {
    // The doctrine governs RENDERED copy — strip code comments (which may
    // name the doctrine itself) before scanning.
    const page = read("app/engine/page.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const banned of ["factor", "weight", "threshold", "formula"]) {
      expect(page.toLowerCase(), `page copy must not mention ${banned}`).not.toContain(banned);
    }
  });

  it("the story payload itself carries no method fields at runtime", async () => {
    const story = await loadEngineStory(new Date("2026-07-11T12:00:00Z"));
    const json = JSON.stringify(story).toLowerCase();
    for (const banned of ["factor", "reason", "threshold", "weight", "confidence"]) {
      expect(json, `story JSON must not contain ${banned}`).not.toContain(banned);
    }
    // Shape contract: telemetry + commitments only.
    expect(Object.keys(story).sort()).toEqual(
      ["gate", "generatedAt", "record", "seals", "sweep", "unreachable"].sort(),
    );
  });
});

describe("sealed engine — states doctrine", () => {
  it("has a distinct unreachable state and a distinct quiet state", () => {
    const page = read("app/engine/page.tsx");
    expect(page).toContain("engine-unreachable-state");
    expect(page).toContain("engine-quiet-state");
    // Outage copy never claims absence; quiet copy never claims outage.
    expect(page).toContain("not a verdict");
    expect(page).toContain("does not invent work");
  });

  it("paints the house skeleton while loading", () => {
    const p = join(__dirname, "..", "app", "engine", "loading.tsx");
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, "utf8")).toContain("ToolPageSkeleton");
  });
});

describe("sealed engine — the interlock (left hand, right hand)", () => {
  it("every chapter exits into another organ of the system", () => {
    const page = read("app/engine/page.tsx");
    for (const href of ["/picks", "/pricing", "/verify", "/proof", "/performance", "/clv"]) {
      // Matches href="/x", href={"/x"}, and href={`/x?...`} alike.
      expect(page, `engine must funnel into ${href}`).toMatch(
        new RegExp(`href=\\{?[\`"']${href}`),
      );
    }
    expect(page).toContain("RiskDisclosure");
  });

  it("the homepage proof strip routes into the engine", () => {
    const home = read("app/page.tsx");
    expect(home).toContain('href="/engine"');
  });
});

describe("sealed engine — interactive atoms stay honest", () => {
  it("surge counters and hash materialize expose the REAL value to a11y from first paint", () => {
    const atoms = read("components/engine/engine-atoms.tsx");
    expect(atoms).toContain("aria-label={String(value)}");
    expect(atoms).toContain("aria-label={hash}");
    expect(atoms).toContain("prefers-reduced-motion");
  });
});
