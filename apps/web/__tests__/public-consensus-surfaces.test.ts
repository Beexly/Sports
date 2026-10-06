/**
 * Behavioral contract: public consensus claims refuse when unbound across
 * API / preview / dashboard; bound path keeps teaser scrub + book-set evidence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  consensusEvidenceCaption,
  stableBookSetId,
} from "@/lib/claims/public-consensus-claim";
import { projectPublicConsensusReasoning } from "@/lib/claims/project-public-consensus-reasoning";

const NOW = new Date("2026-08-06T16:00:00.000Z");
const BOOKS = ["betmgm", "bovada", "draftkings", "fanduel", "pointsbet"];
const BOOK_SET = {
  books: BOOKS,
  sourceId: "snapshot-1",
  provider: "odds_api",
  capturedAt: "2026-08-04T16:00:00.000Z",
};

const BOUND_SLICE = {
  consensusPct: 1,
  bookmakerCount: BOOKS.length,
  dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
  consensusProvider: "odds_api",
  consensusSourceId: "snapshot-1",
  consensusBooks: BOOKS,
  consensusBookSetId: stableBookSetId("odds_api", BOOKS),
  consensusCapturedAt: BOOK_SET.capturedAt,
  consensusBookSet: BOOK_SET,
};

const UNBOUND_SLICE = {
  consensusPct: 1,
  bookmakerCount: BOOKS.length,
  dataFreshnessAt: new Date("2026-08-04T16:00:00.000Z"),
  consensusProvider: "odds_api",
  // Missing mint-time book set → fail closed
  consensusSourceId: null,
  consensusBooks: null,
  consensusBookSetId: null,
  consensusCapturedAt: null,
  consensusBookSet: null,
};

describe("projectPublicConsensusReasoning behavioral (API parity)", () => {
  it("refuses full reasoning and reasoningShort independently when unbound", () => {
    const shortClaim = "100% bookmaker consensus on Kansas City Chiefs -5.5.";
    const fullClaim =
      "100% bookmaker consensus on Kansas City Chiefs -5.5. Rest and market edges align.";

    const short = projectPublicConsensusReasoning(shortClaim, UNBOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: false,
      now: NOW,
    });
    const full = projectPublicConsensusReasoning(fullClaim, UNBOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: false,
      now: NOW,
    });

    expect(short.text).toBeNull();
    expect(short.bound).toBeNull();
    expect(short.consensusEvidence).toBeNull();
    expect(full.text).toBeNull();
    expect(full.bound).toBeNull();
    expect(full.consensusEvidence).toBeNull();
  });

  it("bound path keeps scrub + book-set evidence on both fields", () => {
    const shortClaim = "100% bookmaker consensus on Kansas City Chiefs -5.5.";
    const fullWithPct =
      "100% bookmaker consensus on Kansas City Chiefs -5.5. Model signal @ 72% (odds_api).";

    const short = projectPublicConsensusReasoning(shortClaim, BOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: false,
      now: NOW,
    });
    const full = projectPublicConsensusReasoning(fullWithPct, BOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: false,
      now: NOW,
    });
    const fullPro = projectPublicConsensusReasoning(fullWithPct, BOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: true,
      now: NOW,
    });

    expect(short.text).toBe(shortClaim);
    expect(short.bound).not.toBeNull();
    expect(short.bound!.consensusBooks).toEqual([...BOOKS].sort());
    expect(short.bound!.consensusBookSetId).toBe(stableBookSetId("odds_api", BOOKS));
    expect(short.consensusEvidence).toBe(consensusEvidenceCaption(short.bound!));
    expect(short.consensusEvidence).toContain("5 books");
    expect(short.consensusEvidence).toContain("set books-v1-");

    // FREE scrub strips confidence % from full reasoning; claim text + evidence stay.
    expect(full.text).not.toBeNull();
    expect(full.text).not.toMatch(/@\s*72\s*%/);
    expect(full.bound).not.toBeNull();
    expect(full.consensusEvidence).toContain("source odds_api (snapshot-1)");

    // PRO keeps the percentage.
    expect(fullPro.text).toContain("72%");
    expect(fullPro.bound).not.toBeNull();
  });

  it("non-consensus text still scrubs without requiring a book set", () => {
    const raw = "Nashville SC model signal @ 71% (clubelo).";
    const free = projectPublicConsensusReasoning(raw, UNBOUND_SLICE, {
      scrubConfidence: true,
      canSeeConfidence: false,
      now: NOW,
    });
    expect(free.text).not.toBeNull();
    expect(free.text).not.toMatch(/\d+\s*%/);
    expect(free.bound).toBeNull();
  });
});

describe("public claim surface wiring (preview + dashboard + API)", () => {
  const root = resolve(__dirname, "..");
  const paths = {
    api: "app/api/picks/route.ts",
    preview: "app/preview/[sport]/[slug]/page.tsx",
    dashboard: "app/dashboard/page.tsx",
    picks: "app/picks/page.tsx",
    card: "components/picks/pick-card.tsx",
  } as const;

  it("preview wires mint-time book set and shows claim+bars when bound", () => {
    const src = readFileSync(resolve(root, paths.preview), "utf8");
    expect(src).toMatch(/loadPublishTimeConsensusByPickId/);
    expect(src).toMatch(/consensusSliceFromResolved/);
    expect(src).toMatch(/bindPublicConsensusClaim/);
    expect(src).toMatch(/consensusEvidenceCaption/);
    expect(src).toMatch(/preview-consensus-evidence/);
    expect(src).toMatch(/preview-consensus-bar/);
    // Must not call binder with provider-only slice (suppress-only gap).
    expect(src).not.toMatch(/consensusProvider,\s*\n\s*\}\)/);
  });

  it("dashboard projects reasoningShort through the same fail-closed binder path", () => {
    const src = readFileSync(resolve(root, paths.dashboard), "utf8");
    expect(src).toMatch(/loadPublishTimeConsensusByPickId/);
    expect(src).toMatch(/projectPublicConsensusReasoning/);
    expect(src).toMatch(/consensusSliceFromResolved/);
    expect(src).toMatch(/dashboard-consensus-evidence/);
    expect(src).toMatch(/dashboard-reasoning-short/);
    // Confidence bars stay (SOLVE) even when claim is withheld.
    expect(src).toMatch(/confidence-bar/);
  });

  it("API uses shared projector for both reasoning fields", () => {
    const src = readFileSync(resolve(root, paths.api), "utf8");
    expect(src).toMatch(/projectPublicConsensusReasoning/);
    expect(src).toMatch(/loadPublishTimeConsensusByPickId/);
    expect(src).toMatch(/consensusSliceFromResolved/);
    expect(src).toMatch(/consensusSourceId/);
    expect(src).toMatch(/consensusBooks/);
    expect(src).toMatch(/consensusBookSetId/);
    expect(src).toMatch(/consensusCapturedAt/);
  });

  it("all core public claim surfaces still import the evidence binder and caption", () => {
    for (const rel of [paths.preview, paths.picks, paths.card, paths.api]) {
      const src = readFileSync(resolve(root, rel), "utf8");
      // API uses projector which re-exports caption via bound result; caption still on API.
      if (rel === paths.api) {
        expect(src).toMatch(/consensusEvidenceCaption/);
        expect(src).toMatch(/projectPublicConsensusReasoning/);
      } else {
        expect(src).toMatch(/bindPublicConsensusClaim/);
        expect(src).toMatch(/consensusEvidenceCaption/);
      }
    }
    // Dashboard uses the shared projector (same binder path).
    const dash = readFileSync(resolve(root, paths.dashboard), "utf8");
    expect(dash).toMatch(/projectPublicConsensusReasoning/);
  });
});
