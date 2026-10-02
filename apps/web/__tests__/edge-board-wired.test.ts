import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The Edge Board existed for months with ZERO production callers.
 *
 * `apps/web/lib/intelligence/edge-board.ts` is 493 lines composing five real
 * loaders (player-model, expected-points, NGS edge-signals, opportunity-transfer,
 * snap-share) into one ranked divergence list. Its own header calls it "the
 * entire product thesis, surfaced as one ranked list". Nothing imported it, and
 * nothing noticed, because an unwired module and a missing one look identical.
 *
 * This pins the WIRING, not the builder (the builder has its own coverage). A
 * test that only exercises `buildEdgeBoard` keeps passing when the route, the
 * registry entry, or the client render is reverted -- which is precisely the
 * failure this closes.
 */
const repoRoot = resolve(__dirname, "../../..");
const read = (p: string): string => readFileSync(resolve(repoRoot, p), "utf8");

describe("the Edge Board is reachable by a customer", () => {
  it("has a PREMIUM-gated API route that calls the real loader", () => {
    const route = read("apps/web/app/api/intelligence/edge-board/route.ts");
    expect(route).toMatch(/requirePremiumApiRateLimited/);
    expect(route).toMatch(/loadEdgeBoard/);
    // must not invent a success flag independent of the loader's own status
    expect(route).toMatch(/success:\s*data\.status\s*!==\s*"source-error"/);
  });

  it("is registered as an engine, first in the list", () => {
    const reg = read("apps/web/app/intelligence/engines/registry.tsx");
    expect(reg).toMatch(/slug:\s*"edge-board"/);
    expect(reg).toMatch(/loadEdgeBoard/);
    const arr = reg.slice(reg.indexOf("export const ENGINES"));
    expect(arr.slice(0, 400)).toMatch(/EDGE_BOARD_ENGINE/);
  });

  it("has a client render case, so it is not an entry with no view", () => {
    const view = read("apps/web/components/intelligence/engine-view.tsx");
    expect(view).toMatch(/case "edge-board"/);
    expect(view).toMatch(/EdgeBoardView/);
    expect(view).toMatch(/function EdgeBoardView/);
    // it must still be exported: an earlier edit here dropped the keyword
    expect(view).toMatch(/export function EngineView/);
  });

  it("shows per-source provenance, so a dead dataset is never hidden", () => {
    const view = read("apps/web/components/intelligence/engine-view.tsx");
    // the live/total source count and the errored-source list are both surfaced
    expect(view).toMatch(/sources\.length/);
    expect(view).toMatch(/errored/);
    expect(view).toMatch(/unavailable/);
  });

  it("presents magnitude as a ranking score, not a probability", () => {
    const view = read("apps/web/components/intelligence/engine-view.tsx");
    expect(view).toMatch(/ranking score, not a probability/);
  });
});
