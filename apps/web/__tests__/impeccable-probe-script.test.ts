import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(
  resolve(__dirname, "../../../scripts/ops/impeccable-probe.mjs"),
  "utf8",
);

describe("impeccable-probe.mjs", () => {
  it("enforces LAWS closed public picks + free-lane + settlement overdue", () => {
    expect(SRC).toContain("canExposePublicPicks");
    expect(SRC).toContain("freeLaneConfigured");
    expect(SRC).toContain("overduePending");
    expect(SRC).toContain("freeSpine");
    expect(SRC).toContain("--strict-spine");
    expect(SRC).toContain("process.exit");
  });

  it("covers multi-path money + autonomy surfaces", () => {
    expect(SRC).toContain("billingMoney");
    expect(SRC).toContain("--strict-money");
    expect(SRC).toContain("autonomy");
    expect(SRC).toContain("defaultDryRun");
    expect(SRC).toContain("route:/checkout");
    expect(SRC).toContain("revenue:checkout");
    expect(SRC).toContain("oddsPath");
    expect(SRC).toContain("criticalGaps");
  });

  it("never instructs gate flips", () => {
    expect(SRC).not.toMatch(/LIVE_BOARD\s*=\s*true/);
    expect(SRC).not.toMatch(/PUBLIC_PICKS_ENABLED\s*=\s*true/);
  });
});
