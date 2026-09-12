import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../next.config.mjs";
import { FEATURE_GATES } from "@/lib/pricing/feature-gates";

const ROOT = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const SURFACE = "/observatory";

describe("the Edge Map / Galaxy Twin surface is retired from the product (C-332)", () => {
  it("no navigation links it, in either nav or on the home grid", () => {
    for (const rel of ["components/ui/nav.tsx", "components/ui/mobile-nav.tsx", "components/home/intelligence-layer.tsx"]) {
      expect(read(rel), `${rel} still links ${SURFACE}`).not.toContain(SURFACE);
    }
  });

  it("the pricing catalog does NOT advertise it as a working feature", () => {
    const gate = FEATURE_GATES.find((g: { key: string }) => g.key === "galaxy-twin");
    expect(gate, "the galaxy-twin catalog entry was deleted rather than retitled").toBeTruthy();
    expect(gate.status).toBe("disabled");
    expect(gate.freePreview).toBe(false);
    expect(gate.lockBehaviorForFree).toBe("hidden");
  });

  it("keeps the route reachable but out of the dark-surface business", async () => {
    const redirects = await (nextConfig as { redirects: () => Promise<Array<{ source: string; destination: string }>> }).redirects();
    const entry = redirects.find((r) => r.source === SURFACE);
    expect(entry, `${SURFACE} has no redirect, so the retired surface still renders`).toBeTruthy();
    expect(entry?.destination).toBe("/board");
  });

  it("leaves the Slate Twin components in the tree, because this is reversible", () => {
    expect(read("components/slate-twin/galaxy-slate-twin.tsx").length).toBeGreaterThan(1000);
  });
});
