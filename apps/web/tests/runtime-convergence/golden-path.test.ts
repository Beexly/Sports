/**
 * C51 — Golden Path Runtime Proof
 *
 * Source-level assertions that the complete golden path loop is wired:
 * Today's Board → Decision Room → Evidence/Trust → Related Intelligence
 * → Decision Coach → Track/Autopsy → Command Center → Academy/NextBestSurface
 *
 * These tests confirm integration of the shared primitives and that key
 * architectural invariants hold across the golden path surfaces.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

// ─── PickCard / FullPickCard compose PickEvidenceSection ──────────────────────

describe("C45 — EvidenceCard Canonicalization", () => {
  const pickCard = read("components/picks/pick-card.tsx");

  it("PickCard imports PickEvidenceSection", () => {
    expect(pickCard).toMatch(/from ["'].*PickEvidenceSection["']/);
  });

  it("PickCard imports ageToFreshness", () => {
    expect(pickCard).toMatch(/ageToFreshness/);
  });

  it("PickCard uses PickEvidenceSection with kind=pick", () => {
    expect(pickCard).toMatch(/kind=["']pick["']/);
  });

  it("PickEvidenceSection component exists and exports ageToFreshness", () => {
    const src = read("components/picks/PickEvidenceSection.tsx");
    expect(src).toMatch(/export function ageToFreshness/);
    expect(src).toMatch(/export function PickEvidenceSection/);
  });
});

// ─── Decision Room golden path ────────────────────────────────────────────────

describe("C46 — Decision Room Upgrade", () => {
  const room = read("app/room/[gameId]/page.tsx");

  it("imports TrustStrip", () => {
    expect(room).toMatch(/TrustStrip/);
  });

  it("imports CoachPromptHost", () => {
    expect(room).toMatch(/CoachPromptHost/);
  });

  it("imports NextBestSurface", () => {
    expect(room).toMatch(/NextBestSurface/);
  });

  it("imports RelatedIntelligencePanel", () => {
    expect(room).toMatch(/RelatedIntelligencePanel/);
  });

  it("imports PickEvidenceSection", () => {
    expect(room).toMatch(/PickEvidenceSection/);
  });

  it("uses CoachPromptHost with decision-room surface", () => {
    expect(room).toMatch(/surface=["']decision-room["']/);
  });

  it("has Track / Autopsy links", () => {
    expect(room).toMatch(/\/tracker/);
    expect(room).toMatch(/\/autopsy/);
  });

  it("has Market Pulse panel", () => {
    expect(room).toContain("Market Pulse");
  });

  it("has Slate Weather panel", () => {
    expect(room).toContain("Slate Weather");
  });

  it("has What Would Change Our Mind panel", () => {
    expect(room).toContain("What Would Change Our Mind");
  });
});

// ─── Today's Board enrichment ─────────────────────────────────────────────────

describe("C47 — Today's Board Enrichment", () => {
  const today = read("app/today/page.tsx");

  it("imports SourceFreshnessLabel", () => {
    expect(today).toMatch(/SourceFreshnessLabel/);
  });

  it("imports ageToFreshness", () => {
    expect(today).toMatch(/ageToFreshness/);
  });

  it("has signal summary row component", () => {
    expect(today).toMatch(/SignalSummaryRow/);
  });

  it("has Decision Room link with data-intent", () => {
    expect(today).toMatch(/data-intent=["']decision-room["']/);
  });

  it("has Why this pass label in passes section", () => {
    expect(today).toContain("Why this pass?");
  });
});

// ─── Telemetry ingest route ───────────────────────────────────────────────────

describe("C48 — Telemetry Ingest Runtime", () => {
  const route = read("app/api/telemetry/route.ts");
  const client = read("lib/telemetry/client.ts");

  it("telemetry route exists and exports POST", () => {
    expect(route).toMatch(/export async function POST/);
  });

  it("route validates event names", () => {
    expect(route).toMatch(/isKnownEventName/);
  });

  it("route validates surfaceId", () => {
    expect(route).toMatch(/isKnownSurface/);
  });

  it("route checks forbidden fields", () => {
    expect(route).toMatch(/checkForbiddenFields/);
  });

  it("route respects launch mode analytics gate", () => {
    expect(route).toMatch(/getActiveCapabilities/);
    expect(route).toMatch(/analytics/);
    expect(route).toMatch(/noop/);
  });

  it("client helper exports trackEvent", () => {
    expect(client).toMatch(/export async function trackEvent/);
  });

  it("client swallows errors silently", () => {
    expect(client).toMatch(/catch/);
  });
});

// ─── Galaxy Demo Tour ─────────────────────────────────────────────────────────

describe("C50 — Galaxy Demo Tour", () => {
  const demo = read("app/galaxy-demo/page.tsx");

  it("demo route exists", () => {
    expect(demo.length).toBeGreaterThan(100);
  });

  it("has demonstration data label", () => {
    expect(demo).toMatch(/demonstration data/i);
  });

  it("has not live picks disclaimer", () => {
    expect(demo).toMatch(/not live picks/i);
  });

  it("is noindex", () => {
    expect(demo).toMatch(/index:\s*false/);
  });

  it("has 7 tour stops", () => {
    const stops = [...demo.matchAll(/stop:\s*\d/g)];
    expect(stops.length).toBeGreaterThanOrEqual(7);
  });

  it("links to Today's Board", () => {
    expect(demo).toContain("/today");
  });

  it("links to Decision Room", () => {
    expect(demo).toMatch(/\/room\//);
  });
});
