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

describe("/picks - WP5 DoctrineBoard + verifiedLedger paywall model", () => {
  it("renders the two-doctrines board via loadDoctrineBoard and verifiedLedger (no client fetch, no fabricated list)", () => {
    expect(picksSrc).toMatch(/import \{ loadDoctrineBoard \} from "@\/lib\/board\/doctrine-loader"/);
    expect(picksSrc).toMatch(/import \{ DoctrineBoardView \} from "@\/components\/board\/doctrine-board"/);
    expect(picksSrc).toContain("verifiedLedger");
    expect(picksSrc).toContain('data-testid="verified-record-strip"');
    expect(picksSrc).not.toMatch(/\bfetch\(/);
    expect(picksSrc).not.toMatch(/\/api\/picks/);
  });

  it("reads entitlements server-side before loading DoctrineBoardView so selections stay gated by tier", () => {
    expect(picksSrc).toContain("getUserEntitlements");
    expect(picksSrc).toContain("loadDoctrineBoard(viewerEntitlements)");
  });

  it("publishes calibration progress behind the 200-bet law with zero hardcoded win rates", () => {
    expect(picksSrc).toContain("gate.clvBackedSettled");
    expect(picksSrc).toContain("gate.target");
    expect(picksSrc).not.toMatch(/\b\d{2}-\d{1,2}-\d\b/);
  });

  it("the record ledger JSON remains arithmetically self-consistent and /picks reads verifiedLedger", () => {
    const ledger = JSON.parse(ledgerSrc) as {
      verified_record?: {
        wins?: number;
        losses?: number;
        win_pct?: number;
      };
    };
    const verified = ledger.verified_record;
    expect(verified, "the ledger still carries a verified_record").toBeDefined();
    const wins = verified?.wins ?? 0;
    const losses = verified?.losses ?? 0;
    const recomputedPct = ((wins / (wins + losses)) * 100).toFixed(1);
    expect(recomputedPct).toBe((verified?.win_pct ?? -1).toFixed(1));
    expect(picksSrc).toContain("verifiedLedger");
    expect(picksSrc).not.toMatch(/\b\d{2}-\d{1,2}-\d\b/);
  });

  it("routes customers to /packages, /props, /record, and /board", () => {
    expect(picksSrc).toMatch(/href="\/packages"/);
    expect(picksSrc).toMatch(/href="\/props"/);
    expect(picksSrc).toMatch(/href="\/record"/);
    expect(picksSrc).toMatch(/href="\/board"/);
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