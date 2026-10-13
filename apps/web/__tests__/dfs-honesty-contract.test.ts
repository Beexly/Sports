import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  activeDfsSlate,
  isLiveDfs,
  resolveDfsSlateProvider,
  EMPTY_DFS,
  ILLUSTRATIVE_DFS,
} from "@/lib/integrations/dfs";

/**
 * The optimizer's honesty contract (rewritten 2026-10-12 for the real-slate
 * wiring, motif/web-dfs-real-2026-10-12).
 *
 * The old contract blessed a silent illustrative default: `activeDfsSlate()`
 * returned fictional players for every caller, and the ONLY thing standing
 * between that fiction and a customer was a disclosure string on one page.
 * That default is gone. The contract now is:
 *
 *   - the seam returns the registered REAL slate, or an explicit EMPTY
 *     slate — never fiction by default;
 *   - the sample fixture is reachable only behind an explicit dev opt-in
 *     (`DFS_SAMPLE_SLATE=1`), and any surface rendering it must banner it
 *     as SAMPLE (pinned in dfs-customer-data-contract.test.tsx);
 *   - the DFS page's provenance note is a FUNCTION of the slate state —
 *     real pool, empty pool, and live-salary states each say so — never a
 *     constant that happens to be true in one state.
 */
const PAGE = readFileSync(join(process.cwd(), "app/fantasy/dfs/page.tsx"), "utf8");

describe("DFS provider: no fabricated data reaches a caller unlabelled", () => {
  it("the default fallback is an explicit empty slate, marked not live", () => {
    const provider = resolveDfsSlateProvider({});
    expect(provider).toBe(EMPTY_DFS);
    expect(provider.live).toBe(false);
    expect(provider.name).toMatch(/empty/i);
    expect(activeDfsSlate({})).toEqual([]);
  });

  it("the sample fixture requires the explicit dev opt-in, and is never live", () => {
    expect(resolveDfsSlateProvider({ DFS_SAMPLE_SLATE: "1" })).toBe(ILLUSTRATIVE_DFS);
    expect(ILLUSTRATIVE_DFS.live).toBe(false);
    expect(ILLUSTRATIVE_DFS.name).toMatch(/illustrative|sample/i);
    expect(isLiveDfs({ DFS_SAMPLE_SLATE: "1" })).toBe(false);
  });

  it("a registered-but-unkeyed provider still refuses to go live", () => {
    // The key check is load-bearing: a registered provider with no credential
    // must not activate. This is the same shape as the projections/pick'em
    // founder-gated pattern.
    expect(isLiveDfs({})).toBe(false);
  });
});

describe("the DFS page discloses the pool state as a function of that state", () => {
  it("does not render the sample-slate note unconditionally", () => {
    // The bug this pins: `note="Running on a sample slate..."` was a constant
    // prop, so it displayed over LIVE salaries too. The note must be derived
    // from the slate/feed state.
    expect(PAGE).not.toMatch(/note="[^"]*sample slate[^"]*"/i);
  });

  it("carries the disclosures for every state, so no state is silent", () => {
    // Live salaries…
    expect(PAGE).toMatch(/live\s*\?\s*[\s\S]{0,2000}?(?:live salaries|real|connected)/i);
    // …the missing licensed feed…
    expect(PAGE).toMatch(/No licensed salary feed is connected/i);
    // …and the measured pool / empty pool states.
    expect(PAGE).toMatch(/measured/i);
    expect(PAGE).toMatch(/stands empty|empty rather/i);
  });

  it("keeps the page out of the index while salaries are not real", () => {
    // An optimizer page whose cap cannot bind (no real salaries) should not
    // rank for "DFS optimizer" as if it were the finished product. The
    // existing noindex stays until the salary feed is real.
    expect(PAGE).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it("still tells the truth about the math in every state", () => {
    // The distinction the customer needs: the ALGORITHM is real; the POOL's
    // provenance is stated per state. Losing the first half would understate
    // the product; losing the second would overstate it.
    expect(PAGE).toMatch(/math is real/i);
  });
});
