import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntitlements } from "@sports/types";

/**
 * /picks - paywall copy truth contract.
 *
 * HISTORY: this file originally locked the copy of the free-teaser page to the
 * documented FREE/PRO model. Commit 30a6fe52f ("Publish sealed Week 8 locked
 * board and props") deliberately replaced that page with the static sealed
 * Week 8 locked card: the record is published, the paid funnel routes to
 * /packages, and the teaser/entitlement machinery left the page with the page.
 * The teaser-model assertions were retired with the surface they guarded; this
 * file now pins the successor contract on the same surface:
 *
 *   - The page's only data is the sealed card (publish-allowed rows only).
 *   - The record banner's numbers trace to the committed ledger.
 *   - No false "free / no-limit" copy survives (kept from the original file).
 *   - The /api/picks route's server-side paywall is NOT weakened.
 *
 * The model-alignment and API-gate assertions run against the real entitlements
 * source of truth and the live route, so a copy/paywall drift fails the build.
 */

const repoRoot = resolve(__dirname, "..");
const picksSrc = readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8");
const routeSrc = readFileSync(resolve(repoRoot, "app/api/picks/route.ts"), "utf8");
const ledgerSrc = readFileSync(
  resolve(repoRoot, "..", "..", "data", "engine", "new_engine_official_ledger_2026.json"),
  "utf8",
);

describe("/picks - the documented FREE model is the ground truth", () => {
  it("getEntitlements('FREE') is a capped teaser with no premium board", () => {
    const free = getEntitlements("FREE");
    // The copy claims a small daily teaser - that number must be the enforced
    // dailyPickLimit, and it must be finite (not the unlimited PRO board).
    expect(free.dailyPickLimit).toBe(2);
    expect(free.canSeePremiumPicks).toBe(false);
    // Confidence is a paid metric; the free teaser copy claims "no confidence
    // scores", which must match the entitlement.
    expect(free.canSeeConfidence).toBe(false);
    // Edge Index is the free trust signal the teaser copy leans on.
    expect(free.canSeeEdgeScore).toBe(true);
  });

  it("PRO unlocks the full board + confidence the copy promises", () => {
    const pro = getEntitlements("PRO");
    expect(pro.canSeePremiumPicks).toBe(true);
    expect(pro.canSeeConfidence).toBe(true);
    expect(pro.dailyPickLimit).toBeNull();
  });
});

describe("/picks - no false 'free / no-limit' copy survives", () => {
  it("never claims the free board has no daily limit", () => {
    expect(picksSrc).not.toMatch(/no daily limit/i);
  });

  it("never claims every pick is free", () => {
    expect(picksSrc).not.toMatch(/every pick,? free/i);
    expect(picksSrc).not.toMatch(/every pick is free/i);
  });

  it("does not call the free view a 'sample' (it is a defined teaser)", () => {
    expect(picksSrc).not.toMatch(/free sample/i);
  });
});

describe("/picks - the sealed locked board is the deliberate, published model", () => {
  it("renders the sealed Week 8 card as its only data source (no fetch, no fabricated list)", () => {
    expect(picksSrc).toMatch(/import board from "@\/lib\/week8\/sealed-board\.json"/);
    expect(picksSrc).toMatch(/import \{ SealedTable \} from "@\/components\/week8\/sealed-table"/);
    expect(picksSrc).not.toMatch(/\bfetch\(/);
    expect(picksSrc).not.toMatch(/\/api\/picks/);
  });

  it("filters to publish-allowed PUBLISH rows only - PASS/abstained markets cannot render", () => {
    expect(picksSrc).toMatch(
      /card\.main\.filter\(\(row\) => row\.publishAllowed && row\.decision === "PUBLISH"\)/,
    );
  });

  it("presents the card as the sealed record with its seal digest, not a live purchasable board", () => {
    expect(picksSrc).toMatch(/Seal \{card\.seal_digest\}/);
  });

  it("the record banner's numbers trace to the committed ledger (derived, never re-typed)", () => {
    // Provenance pin: the banner record/win%/units must equal the ledger's
    // pre-TNF prior leg computed live, so the page cannot drift from the
    // committed record without failing the build.
    const ledger = JSON.parse(ledgerSrc) as {
      verified_record?: {
        component_legs?: Array<{
          id?: string;
          wins?: number;
          losses?: number;
          net_units?: string;
        }>;
      };
    };
    const leg = ledger.verified_record?.component_legs?.find((l) => l.id === "pre_tnf_prior");
    expect(leg, "the ledger still carries the pre_tnf_prior leg").toBeDefined();
    const wins = leg?.wins ?? 0;
    const losses = leg?.losses ?? 0;
    const record = `${wins}-${losses}`;
    const pct = ((wins / (wins + losses)) * 100).toFixed(1);
    expect(picksSrc).toContain(`${record} (${pct}%)`);
    expect(picksSrc).toContain(leg?.net_units ?? "+0u");
  });

  it("routes customers to the paid product and the props watchlist", () => {
    expect(picksSrc).toMatch(/href="\/packages"/);
    expect(picksSrc).toMatch(/href="\/props"/);
  });

  it("carries none of the retired teaser model's machinery (the model moved with the page)", () => {
    expect(picksSrc).not.toMatch(/daily teaser/i);
    expect(picksSrc).not.toMatch(/teaserSize/);
    expect(picksSrc).not.toMatch(/You're on Free/);
    expect(picksSrc).not.toMatch(/Pro unlocks the full board/i);
  });
});

describe("/picks - the server paywall is NOT weakened by the copy fix", () => {
  it("still hard-filters non-premium viewers to the FREE tier", () => {
    expect(routeSrc).toMatch(
      /entitlements\.canSeePremiumPicks\s*\?\s*\{\}\s*:\s*\{\s*tier:\s*"FREE"\s*\}/,
    );
  });

  it("still caps the RESPONSE to the entitled daily limit (C-31: cap moved after the filter)", () => {
    // The old query-level cap (take: dailyPickLimit) under-delivered: the
    // selective-publish filter ran after the take, so a FREE viewer could get
    // 0-1 picks instead of their 2. The paywall invariant is response-level:
    // a bounded over-fetch pool, then slice(0, dailyPickLimit) AFTER
    // filter + rank. Both halves are pinned here. The over-fetch itself is
    // ONE size for every viewer (6ad7f44ea): a smaller pre-fetch for capped
    // viewers ranked them over a subset of the slate - the viewer with the
    // least to spend got the worst-informed choice. So the 48:200 ternary
    // form of the take is pinned AGAINST, not for; the entitlement cap
    // exists only at the post-rank slice below.
    expect(routeSrc).toMatch(/take:\s*200/);
    expect(routeSrc).not.toMatch(/take:[^\n]*\?/);
    expect(routeSrc).toMatch(/rankedPicks\.slice\(0,\s*entitlements\.dailyPickLimit\)/);
    expect(routeSrc).toMatch(/limitedPicks\.map/);
  });

  it("still gates confidence on the viewer entitlement, not the pick tier", () => {
    expect(routeSrc).toMatch(/entitlements\.canSeeConfidence\s*\?\s*pick\.confidence\s*:\s*null/);
  });
});