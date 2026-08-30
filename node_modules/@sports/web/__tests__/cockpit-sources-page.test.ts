import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("/cockpit/sources", () => {
  const page = read("app/cockpit/sources/page.tsx");

  it("renders a catalog-backed operator source board instead of a stub", () => {
    expect(page).toMatch(/Source Readiness Board/);
    expect(page).toMatch(/DATA_SOURCE_STACK/);
    expect(page).toMatch(/TREND_BACKLOG/);
    expect(page).toMatch(/providerStatuses/);
    expect(page).toMatch(/loadSourceLiveEvidence/);
    expect(page).toMatch(/Live proof gates/);
    expect(page).toMatch(/Evidence routes/);
    expect(page).toMatch(/STATUS_ACTION/);
    expect(page).not.toMatch(/Source-intelligence ledger is being rebuilt/);
    expect(page).not.toMatch(/queued for\s+rewrite/);
  });

  it("keeps permission-gated sources out of automated ingestion by default", () => {
    expect(page).toMatch(/Do-not-automate list/);
    expect(page).toMatch(/Do not automate until consent or partnership exists/);
    expect(page).toMatch(/complianceNote/);
  });

  it("links the operator board to the public ledger and machine-readable catalog", () => {
    expect(page).toMatch(/href="\/integrations"/);
    expect(page).toMatch(/href="\/api\/sources\/catalog"/);
    expect(page).toMatch(/liveEvidence\.routes\.qbAgeTrend/);
    expect(page).toMatch(/liveEvidence\.routes\.birthdayUsageTrend/);
  });
});
