import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 5 — Public Daily Brief safety tests.
 *
 * Static asserts that the public surface for the Daily Brief does not leak
 * cockpit-only content, and that the admin API route guards on role.
 */

function readFile(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("public daily brief (/brief) surface", () => {
  const page = readFile("app/brief/page.tsx");

  it("does NOT render the 'reviewRequired' internal punch list publicly", () => {
    expect(page).not.toMatch(/brief\.reviewRequired/);
  });

  it("does NOT render NEEDS_REVIEW watch items publicly", () => {
    // The public route page may filter the kind out by helper, but it should
    // not iterate the raw "NEEDS_REVIEW" label directly.
    expect(page).not.toMatch(/data-testid="brief-needs-review-internal"/);
  });

  it("renders responsible-gaming note", () => {
    expect(page.toLowerCase()).toContain("1-800-gambler");
  });

  it("respects performance gate (hidden block when off)", () => {
    expect(page).toMatch(/brief\.readiness\.performance/);
    expect(page).toMatch(/brief-performance-hidden/);
  });
});

describe("public daily brief API (/api/brief)", () => {
  const apiRoute = readFile("app/api/brief/route.ts");

  it("force-dynamic — no static cache of the brief", () => {
    expect(apiRoute).toContain('dynamic = "force-dynamic"');
  });

  it("filters NEEDS_REVIEW watch items from public payload", () => {
    expect(apiRoute).toMatch(/w\.kind !== "NEEDS_REVIEW"/);
  });

  it("zeroes pick counts when canExposePublicPicks is false", () => {
    expect(apiRoute).toMatch(/gates\.canExposePublicPicks/);
  });

  it("nulls performance when canExposePerformanceStats is false", () => {
    expect(apiRoute).toMatch(/gates\.canExposePerformanceStats/);
  });

  it("always includes the responsible-gaming note", () => {
    expect(apiRoute).toContain("BRIEF_RESPONSIBLE_GAMING_NOTE");
  });
});

describe("cockpit daily brief API (/api/cockpit/brief) admin gate", () => {
  const apiRoute = readFile("app/api/cockpit/brief/route.ts");

  it("rejects non-admin requests with 401", () => {
    expect(apiRoute).toMatch(/role !== "ADMIN"/);
    expect(apiRoute).toMatch(/status: 401/);
  });

  it("imports and uses the auth helper", () => {
    expect(apiRoute).toContain("@/lib/auth");
    expect(apiRoute).toMatch(/await auth\(\)/);
  });

  it("does not mutate — read-only endpoint", () => {
    expect(apiRoute).not.toMatch(/db\.\w+\.create\(/);
    expect(apiRoute).not.toMatch(/db\.\w+\.update\(/);
    expect(apiRoute).not.toMatch(/db\.\w+\.delete\(/);
  });
});

describe("DailyBrief Prisma model contract", () => {
  const schema = readFile("../../packages/db/prisma/schema.prisma");

  it("defines DailyBrief with required workflow fields", () => {
    expect(schema).toMatch(/model DailyBrief\b/);
    expect(schema).toMatch(/responsibleGamingText\s+String/);
    expect(schema).toMatch(/status\s+BriefStatus/);
    expect(schema).toMatch(/visibility\s+BriefVisibility/);
  });

  it("defines DailyBriefSection with the documented section types", () => {
    expect(schema).toMatch(/enum BriefSectionType/);
    expect(schema).toMatch(/SLATE_OVERVIEW/);
    expect(schema).toMatch(/RESPONSIBLE_GAMING/);
    expect(schema).toMatch(/PROMOTIONS/);
    expect(schema).toMatch(/MANUAL_REVIEW/);
    expect(schema).toMatch(/CONTENT_IDEAS/);
    expect(schema).toMatch(/WHAT_CHANGED/);
  });

  it("DailyBrief has a unique constraint on briefDate", () => {
    expect(schema).toMatch(/@@unique\(\[briefDate\]\)/);
  });
});
