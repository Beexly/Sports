import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("website JSON-LD honesty", () => {
  it("does not advertise SearchAction against gated /picks", () => {
    const src = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(src).not.toMatch(/\/picks\?q=/);
    expect(src).not.toMatch(/"@type":\s*"SearchAction"/);
    expect(src).not.toMatch(/potentialAction:\s*\{/);
  });
});
