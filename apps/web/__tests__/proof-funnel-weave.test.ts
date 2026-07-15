import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The proof-funnel weave — the conversion path that makes the cryptographic
 * honesty pipeline sell instead of sitting in a corner of the sitemap:
 *
 *   homepage Proof Strip  →  /proof (the sealed record)
 *                         →  /verify (check a receipt)
 *   /proof funnel close   →  /pricing  +  /picks
 *   /verify verified state →  /picks  +  /proof
 *   /vault placeholder    →  /proof
 *
 * These are source-level pins (same style as homepage-content.test.ts):
 * if a redesign drops a link, this test names exactly which funnel edge broke.
 */

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", rel), "utf8");

describe("proof-funnel weave", () => {
  it("homepage Proof Strip routes to the sealed record and the verifier", () => {
    const home = read("app/page.tsx");
    expect(home).toContain('href="/proof"');
    expect(home).toContain('href="/verify"');
    // The strip keeps its non-negotiable honesty line.
    expect(home).toContain("Trust is an architecture, not a tagline.");
  });

  it("/proof closes with the pricing funnel — the record is the product demo", () => {
    const proof = read("app/proof/page.tsx");
    expect(proof).toContain("proof-funnel-close");
    expect(proof).toContain('href="/pricing"');
    expect(proof).toContain('href="/picks"');
    // The close must never promise outcomes — it sells receipts, not wins.
    expect(proof).toContain("not louder claims, more receipts");
    // Codex P2 on #74 + #75: the close must be gated on rows actually present.
    // (!isEmpty was not enough: during a DB outage isEmpty is false, which
    // rendered the funnel alongside the outage card.)
    expect(proof).toContain("const hasLedger = board.picks.length > 0");
    expect(proof).toMatch(/\{hasLedger &&[\s\S]{0,400}proof-funnel-close/);
  });

  it("/proof routes only RECEIPT hashes to the verifier, never bare Merkle leaves", () => {
    const ledgerRow = read("components/trust-ledger/pick-ledger-row.tsx");
    // Codex P2 on #74: leafHash is this page's Merkle fingerprint; /verify
    // looks up the frozen receipt hash. Only receipt-carrying rows may link.
    expect(ledgerRow).toMatch(/row\.receiptHash &&[\s\S]{0,300}\/verify\?hash=\$\{row\.receiptHash\}/);
    expect(ledgerRow).not.toContain("/verify?hash=${row.leafHash}");
  });

  it("verify console funnels ONLY from verified states, never from failure states", () => {
    const console_ = read("components/trust-ledger/verify-console.tsx");
    expect(console_).toContain('href="/picks"');
    expect(console_).toContain('href="/proof"');
    // Two verified branches render the funnel; not-found and integrity-failure
    // must not sell anything. The component has exactly two call sites.
    const callSites = console_.match(/<VerifiedNextSteps \/>/g) ?? [];
    expect(callSites.length).toBe(2);
    // The integrity-failure branch (alert state) must not contain the funnel
    // between its opening and the RecomputePanel it ends with.
    const failureBranch = console_.slice(
      console_.indexOf("Integrity check failed"),
      console_.indexOf("res.sealed ?"),
    );
    expect(failureBranch).not.toContain("VerifiedNextSteps");
  });

  it("/vault routes to the living settled record", () => {
    const vault = read("app/vault/page.tsx");
    expect(vault).toContain('href="/proof"');
  });
});
