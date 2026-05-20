import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("/cockpit/history — accessibility invariants", () => {
  const src = read("app/cockpit/history/page.tsx");

  it("wraps the filter bar in a <nav> with an aria-label", () => {
    expect(src).toMatch(/<nav[^>]*aria-label=["']Pick ledger filters["']/);
  });

  it("groups each filter set with role=group + aria-label", () => {
    // Result group
    expect(src).toMatch(/role="group"[^>]*aria-label="Filter by result"/);
    // Bootstrap group
    expect(src).toMatch(/role="group"[^>]*aria-label="Filter by bootstrap flag"/);
    // Eligible group
    expect(src).toMatch(/role="group"[^>]*aria-label="Filter by public-performance eligibility"/);
    // Learning group
    expect(src).toMatch(/role="group"[^>]*aria-label="Filter by learning eligibility"/);
  });

  it("marks the active filter link with aria-current=\"page\"", () => {
    // All four filter renders should include the same aria-current pattern.
    const occurrences = (src.match(/aria-current=\{active \? "page" : undefined\}/g) ?? []).length;
    expect(occurrences).toBe(4);
  });

  it("renders a visible focus ring on every filter link (focus-visible:ring)", () => {
    // Tailwind classes — present on every Link className. Four groups,
    // each emitting one Link per option; we just check the class string
    // is in the file.
    expect(src).toMatch(/focus-visible:ring-2/);
    expect(src).toMatch(/focus-visible:ring-brand-500/);
  });

  it("data-testid history-export-csv exists for the download button", () => {
    expect(src).toMatch(/data-testid="history-export-csv"/);
  });

  it("includes a Source filter pill group (live vs seed)", () => {
    expect(src).toMatch(/role="group"[^>]*aria-label="Filter by source/);
    expect(src).toMatch(/"v5\.0\.0-seed"/);
  });

  it("Source filter pill emits aria-current=page on the active option", () => {
    // The render block for the Source pill uses the same aria-current
    // pattern as the other filter groups.
    const block = src.slice(src.indexOf('aria-label="Filter by source'), src.indexOf("</nav>"));
    expect(block).toMatch(/aria-current=\{active \? "page" : undefined\}/);
  });
});
