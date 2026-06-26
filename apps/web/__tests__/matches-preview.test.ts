import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import {
  PREVIEW_SLUGS,
  GENOME_VIEWS,
  buildEventGenomePreview,
  resolveView,
  isPreviewSlug,
} from "@/lib/matches/event-genome-preview";

/**
 * /matches/preview/* — the N6 vertical slice. Two guarantees:
 *  1) the preview data is assembled purely from the canonical engine and is honest on fixtures
 *     (authority capped at INFO_ONLY, bound by source-reality, fixture-watermarked);
 *  2) the surface's public copy — which lives in the shared component, OUTSIDE the auto-scanned
 *     app/**\/page.tsx set — carries no banned phrases. (The page.tsx files are also covered by the
 *     strong public-copy scan; this adds the components that hold the prose.)
 */

const repoRoot = resolve(__dirname, "..");

describe("Event Genome preview — engine-driven, honest on fixtures", () => {
  it("covers all three proof fixtures with ten views (incl. the Compiler view)", () => {
    expect(PREVIEW_SLUGS).toEqual(["ecuador-germany", "rays-royals", "roughriders-argonauts"]);
    expect(GENOME_VIEWS).toHaveLength(10);
    expect(GENOME_VIEWS.map((v) => v.value)).toContain("compiler");
  });

  for (const slug of PREVIEW_SLUGS) {
    it(`${slug}: authority capped at INFO_ONLY, bound by source-reality, fixture-watermarked`, () => {
      const p = buildEventGenomePreview(slug);
      expect(p.genome.fixtureWatermarked).toBe(true);
      expect(p.authorityCeiling).toBe("INFO_ONLY");
      expect(p.flightRecord.permittedExpression).toBe("INFO_ONLY");
      expect(p.flightRecord.bindingLayer).toBe("SOURCE_REALITY");
      expect(p.flightRecord.requestedExpression).toBe("PUBLIC_ACTION"); // asked high; the cap is the point
      // every attached trend/trial/market belongs to THIS event (filtering is correct)
      for (const t of p.trends) expect(t.eventId).toBe(p.genome.eventId);
      for (const t of p.trials) expect(t.matchId).toBe(p.genome.eventId);
      for (const m of p.markets) expect(m.eventId).toBe(p.genome.eventId);
      // no fixture trial may ever be a public performance claim
      for (const t of p.trials) expect(t.countsAsPublicPerformance).toBe(false);
      // Integrity Audit Q1: every object on this page is ALSO routed through the Meaning Compiler
      expect(p.compiled.length).toBeGreaterThan(0);
      for (const c of p.compiled) {
        expect(c.fixtureWatermarked).toBe(true);
        expect(c.publicExpression).toBe("INFO_ONLY");
        expect(c.publicSafe).toBe(false);
      }
    });
  }

  it("soccer carries the full 20 derived-stat passports; baseball/CFL carry trend passports", () => {
    const soccer = buildEventGenomePreview("ecuador-germany");
    expect(soccer.derivedStats).toHaveLength(20);
    for (const s of soccer.derivedStats) expect(s.passport.status).not.toBe("VALIDATED"); // never validated on a fixture
    expect(buildEventGenomePreview("rays-royals").trends.length).toBeGreaterThan(0);
    expect(buildEventGenomePreview("roughriders-argonauts").trends.length).toBeGreaterThan(0);
  });

  it("the CFL fixture is upcoming → its trial is pending, not a settled win", () => {
    const cfl = buildEventGenomePreview("roughriders-argonauts");
    expect(cfl.genome.status).toBe("UPCOMING");
    expect(cfl.trials.every((t) => t.result === "UNKNOWN")).toBe(true);
  });

  it("resolveView falls back safely; isPreviewSlug guards unknown slugs", () => {
    expect(resolveView(undefined)).toBe("overview");
    expect(resolveView("not-a-view")).toBe("overview");
    expect(resolveView("proof")).toBe("proof");
    expect(isPreviewSlug("ecuador-germany")).toBe(true);
    expect(isPreviewSlug("does-not-exist")).toBe(false);
  });
});

describe("Event Genome preview — public copy is clean (component + pages)", () => {
  const FILES = [
    "components/matches/event-genome-view.tsx",
    "components/matches/event-genome-page.tsx",
    "lib/matches/event-genome-preview.ts",
    "app/matches/preview/page.tsx",
    "app/matches/preview/ecuador-germany/page.tsx",
    "app/matches/preview/rays-royals/page.tsx",
    "app/matches/preview/roughriders-argonauts/page.tsx",
  ];
  for (const file of FILES) {
    it(`${file} carries no banned phrases`, () => {
      const hits = scanForBannedPhrases(readFileSync(resolve(repoRoot, file), "utf8"));
      if (hits.length > 0) {
        const summary = hits.map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`).join("\n");
        throw new Error(`${file} contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }
});
