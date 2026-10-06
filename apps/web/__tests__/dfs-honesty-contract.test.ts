import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { activeDfsSlate, isLiveDfs, resolveDfsSlateProvider } from "@/lib/integrations/dfs";

/**
 * The optimizer's honesty contract.
 *
 * `activeDfsSlate()` returns `ILLUSTRATIVE_DFS` — fictional players — for every
 * caller, because no licensed salary feed is registered. That is a legitimate
 * default and the repo is candid about it elsewhere (`/board/gate` badges
 * illustrative rows, `/airwave` labels its personas, `airwave/expert-board`
 * prints "Illustrative ledger · fictional personas"). The optimizer's own
 * arithmetic is real, so the surface is allowed to exist.
 *
 * What is NOT allowed is the player pool being silently presented as real. Law 8
 * forbids fabricated product data, and a customer cannot tell a fictional slate
 * from a licensed one unless the page says so. This test exists because that
 * disclosure was a bare string literal with nothing pinning it: one careless
 * edit, or a merge that reordered the conditional, would ship made-up players
 * under a heading that reads like live salaries. The disclosure must therefore
 * be a FUNCTION of the live state, not a constant.
 */
const PAGE = readFileSync(join(process.cwd(), "app/fantasy/dfs/page.tsx"), "utf8");

describe("DFS provider: no fabricated data reaches a caller unlabelled", () => {
  it("the fallback slate is explicitly marked not live", () => {
    const provider = resolveDfsSlateProvider({});
    expect(provider.live).toBe(false);
    expect(provider.name).toMatch(/illustrative/i);
  });

  it("a registered-but-unkeyed provider still refuses to go live", () => {
    // The key check is load-bearing: a registered provider with no credential
    // must not activate. This is the same shape as the projections/pick'em
    // founder-gated pattern.
    expect(isLiveDfs({})).toBe(false);
  });

  it("the optimizer is fed the illustrative pool only while dark", () => {
    const slate = activeDfsSlate({});
    expect(slate.length).toBeGreaterThan(0);
    // Structural: the pool exists and is the fixture, so the disclosure below
    // is the ONLY thing standing between this data and a customer.
    expect(slate.every((p) => typeof p.name === "string" && p.name.length > 0)).toBe(true);
  });
});

describe("the DFS page discloses the pool state as a function of that state", () => {
  it("does not render the sample-slate note unconditionally", () => {
    // The bug this pins: `note="Running on a sample slate..."` was a constant
    // prop, so it displayed over LIVE salaries too. The note must be derived
    // from `live`, which is computed from the feed's own status.
    expect(PAGE).not.toMatch(/note="[^"]*sample slate[^"]*"/i);
  });

  it("carries both disclosures, so neither the live nor the dark state is silent", () => {
    expect(PAGE).toMatch(/live\s*\?\s*[\s\S]{0,2000}?(?:live salaries|real|connected)/i);
    expect(PAGE).toMatch(/No licensed salary feed is connected/i);
  });

  it("keeps the page out of the index while the pool can be illustrative", () => {
    // An illustrative optimizer page that ranks for "DFS optimizer" is a
    // fabricated surface with an SEO tail. The existing noindex is what keeps
    // the fallback off the search surface entirely.
    expect(PAGE).toMatch(/robots:\s*\{\s*index:\s*false/);
  });

  it("still tells the truth about the math when the pool is not real", () => {
    // The distinction the customer needs: the ALGORITHM is real, the POOL is
    // not. Losing the first half would understate the product; losing the
    // second would overstate it.
    expect(PAGE).toMatch(/math is real/i);
    expect(PAGE).toMatch(/player pool is illustrative|illustrative pool|sample pool/i);
  });
});
