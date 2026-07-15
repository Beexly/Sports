import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Fantasy public data gate", () => {
  const page = read("app/fantasy/page.tsx");

  it("renders a static release contract instead of implying partial source rows form a live product", () => {
    expect(page).not.toMatch(/loadSourceLiveEvidence/);
    expect(page).toMatch(/Fantasy \/ public data gate/);
    expect(page).toMatch(/SOURCE RIGHTS/);
    expect(page).toMatch(/FRESHNESS/);
    expect(page).toMatch(/MODEL RECEIPT/);
    expect(page).toMatch(/PUBLIC QA/);
    expect(page).toMatch(/0 \/ 4 clear/);
    expect(page).not.toMatch(/href="\/fantasy\//);
  });

  it("keeps projection-driven fantasy advice gated", () => {
    expect(page).toMatch(/No simulated salaries/);
    expect(page).toMatch(/No fictional depth charts/);
    expect(page).toMatch(/No placeholder projections/);
    expect(page).toMatch(/Fictional players and sample salaries can never fill the gap/);
    expect(page).toMatch(/Public availability/);
    expect(page).toMatch(/Gated/);
  });
});
