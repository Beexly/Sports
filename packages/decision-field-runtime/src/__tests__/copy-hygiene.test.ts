/**
 * COPY HYGIENE — fixture card copy is public-safe.
 *
 * The DecisionCards this package emits are rendered on public surfaces (Phase 2). Their prose must never
 * contain a betting-certainty banned phrase or a leaked internal engine name. This closes the gap so a
 * change to card copy can't silently regress the public trust guards. Mirrors the trust-claims list.
 */

import { describe, it, expect } from "vitest";
import { runDecisionFieldFrame, field001Input } from "../index.js";

// Mirror of the highest-stakes banned phrases (apps/web/lib/trust-claims.ts + trust-gate.mjs).
const BANNED: ReadonlyArray<{ phrase: string; wordBoundary: boolean }> = [
  { phrase: "lock", wordBoundary: true },
  { phrase: "guaranteed", wordBoundary: false },
  { phrase: "sure thing", wordBoundary: false },
  { phrase: "risk-free", wordBoundary: false },
  { phrase: "risk free", wordBoundary: false },
  { phrase: "easy money", wordBoundary: false },
  { phrase: "free money", wordBoundary: false },
  { phrase: "can't lose", wordBoundary: false },
  { phrase: "cant lose", wordBoundary: false },
  { phrase: "no risk", wordBoundary: false },
  { phrase: "100% chance", wordBoundary: false },
  { phrase: "verified track record", wordBoundary: false },
];

// Internal engine names that must never reach public copy.
const INTERNAL_NAMES = [
  "galileo", "einstein", "genesis", "rbet", "tradability", "permission gradient",
  "field stress", "ghost economy", "decision leverage", "opportunity conservation",
  "narrative gravity", "regimeverdict", "decisionstate",
];

function proseOf(): string[] {
  const frame = runDecisionFieldFrame(field001Input);
  const strings: string[] = [];
  for (const c of frame.emittedCards) {
    strings.push(c.title, c.whatChanged, c.whatItMeans, c.whatToDo, c.whyNot, c.upgrade.reason, ...c.upgrade.dataNeeded);
    const d = c.proofDrawer;
    strings.push(d.whatChanged, d.whatTheMarketDid, d.whatFantasyDid, d.whatTheCrowdDid, d.whyNot, d.whatWouldChangeOurMind, d.sourceRaceSummary);
  }
  return strings;
}

describe("Decision card copy hygiene", () => {
  const strings = proseOf();

  it("emits at least one card to check", () => {
    expect(strings.length).toBeGreaterThan(0);
  });

  it("contains no betting-certainty banned phrase", () => {
    for (const s of strings) {
      for (const b of BANNED) {
        const re = b.wordBoundary ? new RegExp(`\\b${b.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") : new RegExp(b.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        expect(re.test(s), `banned phrase "${b.phrase}" in: ${s}`).toBe(false);
      }
    }
  });

  it("leaks no internal engine name", () => {
    for (const s of strings) {
      const lower = s.toLowerCase();
      for (const name of INTERNAL_NAMES) {
        expect(lower.includes(name), `internal name "${name}" in: ${s}`).toBe(false);
      }
    }
  });
});
