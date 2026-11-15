import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks page - sealed-board policy contract.
 *
 * The Redline rewrite (commit 30a6fe52f, "Publish sealed Week 8 locked board
 * and props") replaced the server-rendered teaser page with a static
 * publication of the sealed Week 8 locked card. This contract pins the new
 * policy surface: the page's only data is the sealed JSON, only publish-allowed
 * PUBLISH rows render, the card is verifiable (seal digest), and the page
 * carries no fabricated pick list, no demo path, and no unearned record copy.
 *
 * The teaser/demo/bootstrap contracts that used to live here were retired with
 * the page they guarded; the surviving honesty intents moved into
 * picks-paywall-copy-truth.test.ts, picks-gate-hint-containment.test.ts, and
 * picks-states-conversion.test.ts.
 *
 * Source-level test only.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8");

describe("/picks DoctrineBoard policy contract", () => {
  it("loads the two-doctrines board via loadDoctrineBoard and verifiedLedger (no runtime picks fetch, no fabricated list)", () => {
    expect(src).toMatch(/loadDoctrineBoard/);
    expect(src).toMatch(/DoctrineBoardView/);
    expect(src).toMatch(/verifiedLedger/);
    expect(src).toMatch(/data-testid="verified-record-strip"/);
    // There must not be a JSX array literal mounting hardcoded picks.
    expect(src).not.toMatch(/picks\s*=\s*\[\s*\{/);
    // The page does not call a runtime picks endpoint or fetch at all.
    expect(src).not.toMatch(/\/api\/picks/);
    expect(src).not.toMatch(/\bfetch\(/);
  });

  it("reads entitlements server-side so viewer-gated selections are never leaked", () => {
    expect(src).toMatch(/getUserEntitlements/);
    expect(src).toMatch(/loadDoctrineBoard\(viewerEntitlements\)/);
  });

  it("shows calibration progress behind the 200-bet law with /record verification links", () => {
    expect(src).toMatch(/gate\.clvBackedSettled/);
    expect(src).toMatch(/gate\.target/);
    expect(src).toMatch(/href="\/record"/);
  });

  it("routes customers to the paid product (/packages) and the props watchlist (/props)", () => {
    expect(src).toMatch(/href="\/packages"/);
    expect(src).toMatch(/href="\/props"/);
  });

  it("carries no unearned performance copy", () => {
    expect(src).not.toMatch(/guaranteed|risk-free|sure thing|easy money/i);
    expect(src).not.toMatch(/win\s+rate/i);
    expect(src).not.toMatch(/no daily limit/i);
    expect(src).not.toMatch(/free sample/i);
  });

  it("carries no demo/stub/sample-data path (the page is sealed or nothing)", () => {
    expect(src).not.toMatch(/isStubMode/);
    expect(src).not.toMatch(/demoActive/);
    expect(src).not.toMatch(/sample-data-banner/);
  });
});