import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /cockpit/page.tsx — picks-glance contract.
 *
 * The cockpit shows the operator concrete pick data. Session A's
 * implementation uses:
 *   - the "Today's picks" chip in the header (data-testid="jarvis-today-picks")
 *   - a slate breakdown section (data-testid="cockpit-slate-meta")
 *   - a today's-picks list rendered from todaysOperatorPicks
 *
 * Pin all three so a future refactor doesn't strip the operator's
 * concrete view of the slate.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

describe("/cockpit picks glance — Session A implementation", () => {
  it("queries today's picks count for the header chip", () => {
    expect(src).toMatch(/todayPicksForOperator/);
    expect(src).toMatch(/db\.pick[\s\S]{0,250}startOfDay/);
  });

  it("queries the day's picks for the operator list", () => {
    expect(src).toMatch(/todaysOperatorPicks/);
    expect(src).toMatch(/orderBy:\s*\[\{\s*isFeatured:\s*"desc"\s*\}/);
  });

  it("computes a per-sport slate breakdown from todaysOperatorPicks", () => {
    expect(src).toMatch(/slateBreakdown/);
    expect(src).toMatch(/sport\.name/);
  });

  it("renders the cockpit-slate-meta section when slateBreakdown is non-empty", () => {
    expect(src).toMatch(/data-testid="cockpit-slate-meta"/);
    expect(src).toMatch(/slateBreakdown\.length\s*>\s*0/);
  });

  it("each db query is wrapped in .catch for stub-mode safety", () => {
    const dbCalls = (src.match(/db\.pick\.(count|findMany|findFirst)/g) ?? []).length;
    const catches = (src.match(/\.catch\(/g) ?? []).length;
    expect(catches).toBeGreaterThanOrEqual(dbCalls);
  });

  it("links to /cockpit/history for deeper inspection", () => {
    expect(src).toMatch(/href="\/cockpit\/history"/);
  });
});
