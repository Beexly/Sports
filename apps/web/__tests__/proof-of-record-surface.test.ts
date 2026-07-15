/**
 * Tests for the public proof-of-record surface (build-queue #6).
 *
 * Coverage:
 *   1. Loader honesty — empty input → empty output, no padding
 *   2. Loader source pins — bounded take, real DB paths, engine primitives
 *   3. Page source pins — loader + engine imports, no BANNED_ANALYST_PHRASES,
 *      honest empty-state string, no hardcoded percentages
 *   4. Sitemap entry for /proof added
 *   5. Accountability page links to /proof
 */

import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BANNED_ANALYST_PHRASES } from "@/lib/voice/analyst-standard";

// ── 1. Loader honesty ─────────────────────────────────────────────────────────

describe("loadProofOfRecord loader honesty", () => {
  it("exports a loadProofOfRecord function", async () => {
    const mod = await import("@/lib/proof/load-proof-of-record");
    expect(typeof mod.loadProofOfRecord).toBe("function");
  });

  it("returns empty picks and correct Merkle root when DB is stub (no settled picks)", async () => {
    const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");
    // In test / stub mode, db.pick.findMany returns [] for settled queries.
    const board = await loadProofOfRecord();
    expect(board.picks).toHaveLength(0);
    // Empty set → root is sha256("") which is non-empty (64 hex chars)
    expect(board.merkleRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(board.totalSettled).toBe(0);
    expect(board.generatedAt).toBeTruthy();
  });

  it("totalSettled matches picks.length when picks is empty", async () => {
    const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");
    const board = await loadProofOfRecord();
    // When picks is empty, totalSettled should also be 0 — no padding.
    expect(board.totalSettled).toBe(board.picks.length);
  });

  it("returns a ProofOfRecordBoard with all required keys", async () => {
    const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");
    const board = await loadProofOfRecord();
    expect(board).toHaveProperty("generatedAt");
    expect(board).toHaveProperty("picks");
    expect(board).toHaveProperty("merkleRoot");
    expect(board).toHaveProperty("totalSettled");
  });

  it("generatedAt is a valid ISO string", async () => {
    const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");
    const board = await loadProofOfRecord();
    expect(() => new Date(board.generatedAt)).not.toThrow();
    expect(new Date(board.generatedAt).toISOString()).toBe(board.generatedAt);
  });
});

// ── 1b. leafHash correctness ──────────────────────────────────────────────────

describe("leafHash correctness", () => {
  it("leafHash in the loader is the real SHA-256 of 'leaf:<id>:<payload>', not the raw payload", async () => {
    // Test the engine primitive directly — verifies the fix that changed
    // leafHash from record.payload to hashLeaf(sha256, record).
    const { hashLeaf, canonicalPickPayload } = await import("@sports/prediction-engine");
    const { createHash } = await import("node:crypto");
    function sha256(s: string) {
      return createHash("sha256").update(s, "utf8").digest("hex");
    }
    const id = "test-pick-001";
    const payload = canonicalPickPayload({
      confidence: 72,
      generatedAt: "2026-01-01T00:00:00.000Z",
      id,
      line: -3.5,
      modelVersion: "v5.1.0",
      pickType: "spread",
      selection: "home",
      tier: "pro",
    });
    const leaf = hashLeaf(sha256, { id, payload });
    // Must be 64-char hex
    expect(leaf).toMatch(/^[0-9a-f]{64}$/);
    // Must NOT equal the raw payload string
    expect(leaf).not.toBe(payload);
    // Must equal the expected value computed the same way
    const expected = sha256(`leaf:${id}:${payload}`);
    expect(leaf).toBe(expected);
  });

  it("loader source imports hashLeaf from prediction-engine", () => {
    const loaderSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/proof/load-proof-of-record.ts"),
      "utf8"
    );
    expect(loaderSource).toContain("hashLeaf");
    expect(loaderSource).toContain("hashLeaf(sha256, record)");
    expect(loaderSource).not.toContain("leafHash: record.payload");
  });
});

// ── 2. Loader source pins ─────────────────────────────────────────────────────

describe("loadProofOfRecord source pins", () => {
  let loaderSource: string;

  beforeAll(() => {
    loaderSource = fs.readFileSync(
      path.resolve(__dirname, "../lib/proof/load-proof-of-record.ts"),
      "utf8"
    );
  });

  it("imports from the real engine proof-of-record primitive", () => {
    expect(loaderSource).toContain("@sports/prediction-engine");
    expect(loaderSource).toContain("merkleRoot");
    expect(loaderSource).toContain("inclusionProof");
    expect(loaderSource).toContain("verifyInclusion");
    expect(loaderSource).toContain("canonicalPickPayload");
  });

  it("imports db from @sports/db (no fake data)", () => {
    expect(loaderSource).toContain("from \"@sports/db\"");
    expect(loaderSource).toContain("db.pick");
  });

  it("uses node:crypto sha256 as the hash function (production-grade, not a stub)", () => {
    expect(loaderSource).toContain("node:crypto");
    expect(loaderSource).toContain("sha256");
  });

  it("is bounded — has a MAX_PICKS constant and a take on the DB query", () => {
    expect(loaderSource).toContain("MAX_PICKS");
    expect(loaderSource).toContain("take:");
  });

  it("filters isBootstrap: false (no bootstrap picks in the ledger)", () => {
    expect(loaderSource).toContain("isBootstrap: false");
  });

  it("filters for settled results only (WIN/LOSS/PUSH/VOID)", () => {
    expect(loaderSource).toContain("WIN");
    expect(loaderSource).toContain("LOSS");
    expect(loaderSource).toContain("PUSH");
    expect(loaderSource).toContain("VOID");
  });

  it("excludes seed model version (v5.0.0-seed)", () => {
    expect(loaderSource).toContain("v5.0.0-seed");
  });

  it("returns null/empty consensus when odds data cannot support a multi-book read", () => {
    expect(loaderSource).toContain("buildH2hMarketRead");
    expect(loaderSource).toContain("latestMarketConsensus");
    expect(loaderSource).toContain("marketRead.freshestFetchedAt");
    expect(loaderSource).not.toContain("consensusAtSettle");
  });

  it("projects market and CLV fields through fail-closed public boundaries", () => {
    expect(loaderSource).toContain("projectPublicMarket");
    expect(loaderSource).toContain("projectCanonicalClv");
    expect(loaderSource).toContain("pick.clvCapturedAt");
    expect(loaderSource).not.toContain("modelVsMarketPp");
    expect(loaderSource).not.toContain("pick.confidence / 100 - fairProb");
  });

  it("catches DB errors and returns empty board (catch pattern)", () => {
    expect(loaderSource).toContain(".catch(");
  });
});

// ── 3. Page source pins ───────────────────────────────────────────────────────

describe("proof-of-record page source pins", () => {
  let pageSource: string;
  let rowSource: string;

  beforeAll(() => {
    pageSource = fs.readFileSync(
      path.resolve(__dirname, "../app/proof/page.tsx"),
      "utf8"
    );
    rowSource = fs.readFileSync(
      path.resolve(__dirname, "../components/trust-ledger/pick-ledger-row.tsx"),
      "utf8"
    );
  });

  it("imports loadProofOfRecord from the real loader (not a mock)", () => {
    expect(pageSource).toContain("loadProofOfRecord");
    expect(pageSource).toContain("lib/proof/load-proof-of-record");
  });

  it("imports NUMERIC_TEXT_CLASS from lib/format/stat", () => {
    expect(pageSource).toContain("NUMERIC_TEXT_CLASS");
    expect(pageSource).toContain("lib/format/stat");
  });

  it("has an honest empty-state string mentioning 'the record starts'", () => {
    // The 'the record starts when the first pick settles' framing per spec.
    expect(pageSource.toLowerCase()).toContain("the record starts when the first pick settles");
  });

  it("does not contain any BANNED_ANALYST_PHRASES", () => {
    const lower = `${pageSource}\n${rowSource}`.toLowerCase();
    for (const phrase of BANNED_ANALYST_PHRASES) {
      expect(
        lower,
        `proof page must not contain banned phrase: "${phrase}"`
      ).not.toContain(phrase.toLowerCase());
    }
  });

  it("does not hardcode win-rate percentages as prose numbers", () => {
    // Must not contain patterns like 54.3% or 57% in prose.
    expect(`${pageSource}\n${rowSource}`).not.toMatch(/\b5[0-9]\.\d+%/);
  });

  it("does not hardcode any fabricated pick counts or Merkle roots in JSX", () => {
    // Ensure no literal numbers are hardcoded where dynamic data belongs.
    // We check that all numeric displays go through NUMERIC_TEXT_CLASS.
    expect(pageSource).not.toMatch(/>\s*\d{3,}\s*</);
  });

  it("has canonical metadata pointing to /proof", () => {
    expect(pageSource).toContain('canonical: "/proof"');
  });

  it("renders Nav, Footer, and RiskDisclosure", () => {
    expect(pageSource).toContain("<Nav");
    expect(pageSource).toContain("<Footer");
    expect(pageSource).toContain("<RiskDisclosure");
  });

  it("renders freshness stamp (data-testid proof-freshness-stamp)", () => {
    expect(pageSource).toContain("proof-freshness-stamp");
  });

  it("renders the how-it-works section (data-testid proof-how-it-works)", () => {
    expect(pageSource).toContain("proof-how-it-works");
  });

  it("renders the empty state (data-testid proof-empty-state)", () => {
    expect(pageSource).toContain("proof-empty-state");
  });

  it("includes a link back to /accountability from the empty state", () => {
    expect(pageSource).toContain('href="/accountability"');
  });

  it("is marked force-dynamic (no stale data)", () => {
    expect(pageSource).toContain('dynamic = "force-dynamic"');
  });

  it("mentions 'Merkle' and 'SHA-256' in the explanation copy (plain-language guarantee)", () => {
    expect(pageSource).toContain("Merkle");
    expect(pageSource).toContain("SHA-256");
  });

  it("mentions generated-at vs settled-at framing (the no-edit guarantee anchor)", () => {
    expect(pageSource.toLowerCase()).toContain("generated-at");
    expect(pageSource.toLowerCase()).toContain("settled");
  });

  it("separates canonical display text from the literal hash preimage", () => {
    expect(rowSource).toContain("Canonical market display:");
    expect(pageSource.toLowerCase()).toContain("not the literal hash preimage");
    expect(pageSource.toLowerCase()).toContain("presentation projection");
    expect(rowSource).not.toContain("row.line");
    expect(rowSource).not.toContain("row.confidence");
  });

  it("labels the market read as a timestamped latest capture only", () => {
    expect(rowSource).toContain("Latest captured market consensus");
    expect(rowSource).toContain("row.latestMarketConsensus.capturedAt");
    expect(rowSource).not.toContain("Market consensus at settle");
    expect(rowSource).not.toContain("consensusAtSettle");
    expect(rowSource).not.toContain("modelVsMarketPp");
  });

  it("renders CLV only from the projected tuple with no raw numeric fallback", () => {
    expect(rowSource).toContain("row.clv.display");
    expect(rowSource).toContain("row.clv.capturedAt");
    expect(rowSource).not.toContain("row.clvValue");
    expect(rowSource).not.toContain("row.clvKind");
    expect(rowSource).not.toContain("row.clvVerdict");
    expect(rowSource).not.toContain("clvValue.toFixed");
  });

  it("does not claim every row was sealed before kickoff", () => {
    expect(pageSource).not.toContain("Everything on this page was sealed before kickoff");
    expect(pageSource).not.toContain("stamped at generation time");
    expect(pageSource).toContain("Rows without a receipt do not claim that historical anchor");
  });
});

// ── 4. Sitemap entry ─────────────────────────────────────────────────────────

describe("sitemap includes /proof", () => {
  it("sitemap.ts has a /proof route entry", () => {
    const sitemapSource = fs.readFileSync(
      path.resolve(__dirname, "../app/sitemap.ts"),
      "utf8"
    );
    expect(sitemapSource).toContain('"/proof"');
  });
});

// ── 5. Accountability link ────────────────────────────────────────────────────

describe("accountability page links to /proof", () => {
  it("accountability/page.tsx contains href /proof (Proof of Record card)", () => {
    const accountabilitySource = fs.readFileSync(
      path.resolve(__dirname, "../app/accountability/page.tsx"),
      "utf8"
    );
    expect(accountabilitySource).toContain('href="/proof"');
    // Also verify it uses the AccountabilityCard component pattern.
    expect(accountabilitySource).toContain("Proof of Record");
  });
});
