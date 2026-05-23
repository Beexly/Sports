import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const PAGE = resolve(repoRoot, "app/cockpit/brief/preview/page.tsx");
const FORM = resolve(repoRoot, "components/cockpit/brief-preview-form.tsx");
const LAYOUT = resolve(repoRoot, "app/cockpit/layout.tsx");

describe("/cockpit/brief/preview page", () => {
  const src = readFileSync(PAGE, "utf8");

  it("imports the BriefPreviewForm client component", () => {
    expect(src).toMatch(/BriefPreviewForm/);
    expect(src).toMatch(/from\s+["']@\/components\/cockpit\/brief-preview-form["']/);
  });

  it("declares metadata.robots.index = false (cockpit pattern)", () => {
    expect(src).toMatch(/robots:[\s\S]*index:\s*false/);
  });

  it("does not import db or auth — gating + IO live elsewhere", () => {
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
    expect(src).not.toMatch(/from\s+["']@\/lib\/auth["']/);
  });
});

describe("BriefPreviewForm client component", () => {
  const src = readFileSync(FORM, "utf8");

  it("declares 'use client'", () => {
    expect(src.trimStart()).toMatch(/^["']use client["']/);
  });

  it("POSTs to /api/cockpit/brief", () => {
    expect(src).toMatch(/fetch\(["']\/api\/cockpit\/brief["']/);
    expect(src).toMatch(/method:\s*["']POST["']/);
  });

  it("sends date + picks in the body", () => {
    expect(src).toMatch(/JSON\.stringify\([^)]*date/);
    expect(src).toMatch(/picks/);
  });

  it("validates picks JSON before submit (catches non-JSON and non-array input)", () => {
    expect(src).toMatch(/JSON\.parse\(picksJson\)/);
    expect(src).toMatch(/Array\.isArray\(picks\)/);
  });

  it("renders all four empty-array fields so operator sees what is not yet wired", () => {
    expect(src).toMatch(/promotions/);
    expect(src).toMatch(/whatChanged/);
    expect(src).toMatch(/contentIdeas/);
    expect(src).toMatch(/manualReview/);
    expect(src).toMatch(/Not yet wired/);
  });

  it("renders the sections list when present", () => {
    expect(src).toMatch(/data-testid="brief-preview-sections"/);
    expect(src).toMatch(/data-testid="brief-preview-summary"/);
    expect(src).toMatch(/data-testid="brief-preview-slate"/);
  });

  it("exposes deterministic test ids the layout suite can rely on", () => {
    expect(src).toMatch(/data-testid="brief-date-input"/);
    expect(src).toMatch(/data-testid="brief-picks-input"/);
    expect(src).toMatch(/data-testid="brief-compose"/);
    expect(src).toMatch(/data-testid="brief-preview-result"/);
    expect(src).toMatch(/data-testid="brief-preview-status"/);
  });

  it("does not persist (no localStorage, no fetch to a write endpoint)", () => {
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/sessionStorage/);
    const fetchCount = (src.match(/fetch\(/g) ?? []).length;
    expect(fetchCount).toBe(1);
  });

  it("emits no hype / automation language anywhere in the file", () => {
    expect(src).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });
});

describe("cockpit layout — Brief preview nav entry", () => {
  const src = readFileSync(LAYOUT, "utf8");

  it("adds the /cockpit/brief/preview link", () => {
    expect(src).toMatch(/href:\s*["']\/cockpit\/brief\/preview["']/);
    expect(src).toMatch(/label:\s*["']Brief preview["']/);
  });
});
