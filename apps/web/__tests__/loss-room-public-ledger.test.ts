import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "app", "performance", "losses");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Loss Room public ledger surface", () => {
  it("loads canonical losses from picks instead of hiding entries without autopsies", () => {
    const src = read("page.tsx");

    expect(src).toMatch(/db\.pick\s*\n\s*\.findMany/);
    expect(src).toMatch(/result:\s*"LOSS"/);
    expect(src).toMatch(/isBootstrap:\s*false/);
    expect(src).toMatch(/modelVersion:\s*"v5\.0\.0-seed"/);
    expect(src).toMatch(/lossAutopsy:\s*true/);
    expect(src).toMatch(/signalSnapshot:\s*true/);
  });

  it("links rows by pick id so pending and published post-mortems share one detail route", () => {
    const src = read("page.tsx");

    expect(src).toContain("pickId: pick.id");
    expect(src).toContain("href={`/performance/losses/${row.pickId}`}");
    expect(src).toContain("PENDING_REVIEW");
  });

  it("renders public navigation, risk disclosure, and signal receipt context", () => {
    const list = read("page.tsx");
    const detail = read(path.join("[id]", "page.tsx"));

    expect(list).toContain("<Nav />");
    expect(list).toContain("<Footer />");
    expect(list).toContain("<RiskDisclosure");
    expect(detail).toContain("<Nav />");
    expect(detail).toContain("<Footer />");
    expect(detail).toContain("Signal Snapshot");
  });
});
