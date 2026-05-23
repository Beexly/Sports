import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const PAGE = resolve(repoRoot, "app/cockpit/review-draft/page.tsx");
const FORM = resolve(repoRoot, "components/cockpit/draft-reviewer-form.tsx");
const LAYOUT = resolve(repoRoot, "app/cockpit/layout.tsx");

describe("/cockpit/review-draft page", () => {
  const src = readFileSync(PAGE, "utf8");

  it("imports the DraftReviewerForm client component", () => {
    expect(src).toMatch(/DraftReviewerForm/);
    expect(src).toMatch(/from\s+["']@\/components\/cockpit\/draft-reviewer-form["']/);
  });

  it("declares metadata.robots.index = false (cockpit pattern)", () => {
    expect(src).toMatch(/robots:[\s\S]*index:\s*false/);
  });

  it("does not import the database (no server-side DB read on this page)", () => {
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
  });

  it("does not import auth — gating happens in the cockpit layout", () => {
    expect(src).not.toMatch(/from\s+["']@\/lib\/auth["']/);
  });

  it("does not call fetch from the server component (the client form owns IO)", () => {
    expect(src).not.toMatch(/fetch\(/);
  });
});

describe("DraftReviewerForm client component", () => {
  const src = readFileSync(FORM, "utf8");

  it("declares 'use client'", () => {
    expect(src.trimStart()).toMatch(/^["']use client["']/);
  });

  it("POSTs to /api/cockpit/review-draft", () => {
    expect(src).toMatch(/fetch\(["']\/api\/cockpit\/review-draft["']/);
    expect(src).toMatch(/method:\s*["']POST["']/);
  });

  it("sends content + (optional) context in the body", () => {
    expect(src).toMatch(/JSON\.stringify\([^)]*content/);
    expect(src).toMatch(/context/);
  });

  it("renders all three verdict styles (READY / REVISE / REJECT)", () => {
    expect(src).toMatch(/READY/);
    expect(src).toMatch(/REVISE/);
    expect(src).toMatch(/REJECT/);
  });

  it("exposes deterministic test ids the layout test suite can rely on", () => {
    expect(src).toMatch(/data-testid="draft-content-input"/);
    expect(src).toMatch(/data-testid="draft-run-review"/);
    expect(src).toMatch(/data-testid="draft-review-result"/);
    expect(src).toMatch(/data-testid="draft-review-verdict"/);
  });

  it("disables submit while pending and on empty / over-limit content", () => {
    expect(src).toMatch(/pending/);
    expect(src).toMatch(/MAX_CONTENT_CHARS/);
    expect(src).toMatch(/disabled=\{!submittable\}/);
  });

  it("does not persist findings (no localStorage, no fetch to a write endpoint)", () => {
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/sessionStorage/);
    // Only one fetch call — to the review-draft endpoint
    const fetchCount = (src.match(/fetch\(/g) ?? []).length;
    expect(fetchCount).toBe(1);
  });

  it("emits no hype / automation language anywhere in the file", () => {
    expect(src).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });
});

describe("cockpit layout — Draft review nav entry", () => {
  const src = readFileSync(LAYOUT, "utf8");

  it("adds the /cockpit/review-draft link to the NAV array", () => {
    expect(src).toMatch(/href:\s*["']\/cockpit\/review-draft["']/);
    expect(src).toMatch(/label:\s*["']Draft review["']/);
  });
});
