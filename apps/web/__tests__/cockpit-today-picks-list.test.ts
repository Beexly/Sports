import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /cockpit page — today's-picks list contract.
 *
 * Session A renders today's picks as a list at the bottom of the
 * cockpit. Pin the testid + the demo-mode badge + the link to the
 * full ledger.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

describe("/cockpit today's-picks list", () => {
  it("renders the list section with data-testid=cockpit-today-picks-list", () => {
    expect(src).toMatch(/data-testid="cockpit-today-picks-list"/);
  });

  it("renders only when todaysOperatorPicks has at least one row", () => {
    expect(src).toMatch(/todaysOperatorPicks\.length\s*>\s*0/);
  });

  it("displays a sample badge in the header when demoActive", () => {
    // Inline "sample" badge appears inside the list header.
    const block = src.slice(src.indexOf('cockpit-today-picks-list'), src.indexOf("</section>", src.indexOf('cockpit-today-picks-list')));
    expect(block).toMatch(/demoActive\s*&&[\s\S]{0,400}sample/i);
  });

  it("links to the forensic ledger from the list header", () => {
    const block = src.slice(src.indexOf('cockpit-today-picks-list'), src.indexOf("</section>", src.indexOf('cockpit-today-picks-list')));
    expect(block).toMatch(/href="\/cockpit\/history"/);
  });
});

describe("/cockpit slate-meta section", () => {
  it("renders cockpit-slate-meta with aria-label", () => {
    expect(src).toMatch(/data-testid="cockpit-slate-meta"/);
    expect(src).toMatch(/aria-label="Today's slate breakdown by sport"/);
  });

  it("featured-count line surfaces when featuredOperatorPicks is non-empty", () => {
    expect(src).toMatch(/data-testid="featured-count"/);
  });
});
