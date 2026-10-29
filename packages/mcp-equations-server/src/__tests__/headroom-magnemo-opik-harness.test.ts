import { describe, it, expect } from "vitest";
import {
  HeadroomReversibleVault,
  MagnemoGovernedMemoryLedger,
  runOpikSlateRegressionSuite,
} from "../headroom-magnemo-opik-harness";

describe("GSE Fleet Infrastructure — Headroom + Magnemo + Opik Harness", () => {
  it("aligns prompt prefixes for KV-cache block stability and performs lossless reversible compression", () => {
    const vault = new HeadroomReversibleVault();
    const p1 = "System: GSE Engine v5.3.0 | Generated: 2026-10-29T17:00:00Z | Rules: Matchup first, book last.";
    const p2 = "System: GSE Engine v5.3.0 | Generated: 2026-10-29T18:45:12Z | Rules: Matchup first, book last.";

    const align1 = vault.alignPromptPrefixForKvCache(p1);
    const align2 = vault.alignPromptPrefixForKvCache(p2);
    expect(align1.blockHashes).toEqual(align2.blockHashes);
    expect(align1.volatileTokensMovedToTail).toEqual(["2026-10-29T17:00:00Z"]);

    const bigJson = JSON.stringify(
      Array.from({ length: 25 }, (_, i) => ({
        snap: i + 1,
        play: "inside_zone_run",
        yards: 4 + (i % 5),
        notes: "Packers offensive line creates movement at the point of attack",
      })),
    );
    const compressed = vault.compressReversible(bigJson);
    expect(compressed.compressedBytes).toBeLessThan(compressed.originalBytes * 0.4);
    expect(vault.retrieve(compressed.handle)).toBe(bigJson);
    expect(vault.getStats().tokenSavingsRatio).toBeGreaterThan(0.6);
  });

  it("enforces Magnemo draft-to-approve governance with cryptographic receipts and supersession", () => {
    const ledger = new MagnemoGovernedMemoryLedger();
    ledger.proposeDraft({
      id: "mem-1",
      claim: "Green Bay allows 65.7% WR target share (2nd in NFL through Week 7)",
      sourceCitation: "nflverse:play_by_play_2026.parquet",
      authorAgent: "research-agent",
    });

    // Drafts never appear in canonical memory until approved
    expect(ledger.getCanonicalMemories()).toHaveLength(0);

    const approved = ledger.approveDraft("mem-1", "Garrett");
    expect(approved.status).toBe("APPROVED");
    expect(approved.receiptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ledger.getCanonicalMemories()).toHaveLength(1);

    // Superseding a claim replaces the old entry once approved
    ledger.proposeDraft({
      id: "mem-2",
      claim: "Green Bay allows 65.7% WR target share (rank 2 behind PHI 67.3%)",
      sourceCitation: "nflverse:play_by_play_2026.parquet",
      authorAgent: "research-agent",
      supersedesId: "mem-1",
    });
    ledger.approveDraft("mem-2", "Garrett");
    const canonical = ledger.getCanonicalMemories();
    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.id).toBe("mem-2");
  });

  it("runs Opik plain-English regression suite and triggers rollback on jargon or Frechet violations", () => {
    const clean = runOpikSlateRegressionSuite({
      sideConfidence: "61/100",
      sideDecision: "PLAY",
      sideExpectedClv: 0.042,
      sgpJointProb: 0.21,
      legProbs: [0.61, 0.58, 0.62],
      customerPreviewCopy:
        "Green Bay’s offensive line is healthier and Jordan Love has been more accurate under pressure than Bryce Young the last three weeks. Take Green Bay and the under.",
    });
    expect(clean.allPassed).toBe(true);
    expect(clean.action).toBe("KEEP_CANDIDATE");

    const bad = runOpikSlateRegressionSuite({
      sideConfidence: "61%",
      sideDecision: "PLAY",
      sideExpectedClv: -0.01,
      sgpJointProb: 0.65,
      legProbs: [0.55, 0.56, 0.54],
      customerPreviewCopy: "Our 10,000-game simulation projects 58% win rate on 35 dropbacks.",
    });
    expect(bad.allPassed).toBe(false);
    expect(bad.action).toBe("ROLLBACK_AND_COACH_REWRITE");
  });
});
