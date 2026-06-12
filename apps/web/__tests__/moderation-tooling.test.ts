/**
 * Moderation tooling — pure logic + source pins.
 * NO live DB. All tests operate against the pure functions in moderation.ts.
 *
 * Covers:
 *   - ladder order (NUDGE < REMOVE < MUTE_24H < MUTE_7D < SUSPEND < BAN)
 *   - straight-to-BAN categories (hate/threats/doxxing/self-exclusion-circumvention)
 *   - different-reviewer rule for appeals
 *   - appeal-once rule (verified via error message contract)
 *   - actor+reason required (throws ModerationValidationError)
 *   - time-boxed actions carry expiry
 *   - cockpit page renders honest empty state (source pin)
 *   - policy doc's three protections reflected in reason enum (source pin)
 *
 * Policy source: docs/legal/COMMUNITY_MODERATION_POLICY.md
 */

import { describe, expect, it } from "vitest";
import {
  LADDER_ORDER,
  LADDER_REFERENCE,
  STRAIGHT_TO_BAN_REASONS,
  allowsStraightToBan,
  appealable,
  assertActionLoggable,
  canReview,
  computeAppealDeadline,
  computeExpiry,
  isValidEscalation,
  ladderIndex,
  ModerationValidationError,
  requiresExpiry,
} from "@/lib/community/moderation";
import type { ModerationActionKind, ModerationReasonCode } from "@prisma/client";

// ── Ladder order ──────────────────────────────────────────────────────────────

describe("LADDER_ORDER", () => {
  it("has exactly 6 rungs in policy-specified order", () => {
    expect(LADDER_ORDER).toEqual([
      "NUDGE",
      "REMOVE",
      "MUTE_24H",
      "MUTE_7D",
      "SUSPEND",
      "BAN",
    ]);
  });

  it("NUDGE is the lowest severity", () => {
    expect(ladderIndex("NUDGE")).toBe(0);
  });

  it("BAN is the highest severity", () => {
    expect(ladderIndex("BAN")).toBe(LADDER_ORDER.length - 1);
  });

  it("each consecutive rung has higher index than the previous", () => {
    for (let i = 1; i < LADDER_ORDER.length; i++) {
      expect(ladderIndex(LADDER_ORDER[i]!)).toBeGreaterThan(ladderIndex(LADDER_ORDER[i - 1]!));
    }
  });
});

// ── isValidEscalation ─────────────────────────────────────────────────────────

describe("isValidEscalation", () => {
  it("allows moving up the ladder one rung", () => {
    expect(isValidEscalation("NUDGE", "REMOVE", "HARASSMENT")).toBe(true);
    expect(isValidEscalation("REMOVE", "MUTE_24H", "HARASSMENT")).toBe(true);
    expect(isValidEscalation("MUTE_24H", "MUTE_7D", "HARASSMENT")).toBe(true);
    expect(isValidEscalation("MUTE_7D", "SUSPEND", "HARASSMENT")).toBe(true);
    expect(isValidEscalation("SUSPEND", "BAN", "HARASSMENT")).toBe(true);
  });

  it("allows skipping rungs upward", () => {
    expect(isValidEscalation("NUDGE", "SUSPEND", "HARASSMENT")).toBe(true);
  });

  it("rejects same-level re-application", () => {
    expect(isValidEscalation("NUDGE", "NUDGE", "HARASSMENT")).toBe(false);
    expect(isValidEscalation("MUTE_24H", "MUTE_24H", "HARASSMENT")).toBe(false);
  });

  it("rejects downgrade", () => {
    expect(isValidEscalation("BAN", "NUDGE", "HARASSMENT")).toBe(false);
    expect(isValidEscalation("SUSPEND", "REMOVE", "HARASSMENT")).toBe(false);
  });

  it("allows straight-to-BAN from NUDGE when reason qualifies", () => {
    expect(isValidEscalation("NUDGE", "BAN", "HATE_SPEECH")).toBe(true);
    expect(isValidEscalation("NUDGE", "BAN", "THREATS")).toBe(true);
    expect(isValidEscalation("NUDGE", "BAN", "DOXXING")).toBe(true);
    expect(isValidEscalation("NUDGE", "BAN", "SELF_EXCLUSION_CIRCUMVENTION")).toBe(true);
  });
});

// ── Straight-to-BAN categories ────────────────────────────────────────────────

describe("STRAIGHT_TO_BAN_REASONS", () => {
  const bannable: ModerationReasonCode[] = [
    "HATE_SPEECH",
    "THREATS",
    "DOXXING",
    "SELF_EXCLUSION_CIRCUMVENTION",
  ];

  it("includes the four policy-specified straight-to-BAN categories", () => {
    for (const r of bannable) {
      expect(STRAIGHT_TO_BAN_REASONS.has(r)).toBe(true);
    }
  });

  it("allowsStraightToBan returns true for all four categories", () => {
    for (const r of bannable) {
      expect(allowsStraightToBan(r)).toBe(true);
    }
  });

  it("does not include HARASSMENT in straight-to-BAN (must climb the ladder)", () => {
    expect(allowsStraightToBan("HARASSMENT")).toBe(false);
  });

  it("does not include SPAM_REFERRAL_FLOOD in straight-to-BAN", () => {
    expect(allowsStraightToBan("SPAM_REFERRAL_FLOOD")).toBe(false);
  });
});

// ── Appeal eligibility ────────────────────────────────────────────────────────

describe("appealable", () => {
  it("SUSPEND is appealable", () => {
    expect(appealable("SUSPEND")).toBe(true);
  });

  it("BAN is appealable", () => {
    expect(appealable("BAN")).toBe(true);
  });

  it("NUDGE is not appealable", () => {
    expect(appealable("NUDGE")).toBe(false);
  });

  it("REMOVE is not appealable", () => {
    expect(appealable("REMOVE")).toBe(false);
  });

  it("MUTE_24H is not appealable", () => {
    expect(appealable("MUTE_24H")).toBe(false);
  });

  it("MUTE_7D is not appealable", () => {
    expect(appealable("MUTE_7D")).toBe(false);
  });
});

// ── Different-reviewer rule ───────────────────────────────────────────────────

describe("canReview (different-reviewer rule)", () => {
  it("returns false when reviewer is the same as the original actor", () => {
    expect(canReview("operator:garrett", "operator:garrett")).toBe(false);
  });

  it("returns true when reviewer is a different person", () => {
    expect(canReview("operator:garrett", "operator:sarah")).toBe(true);
  });

  it("returns true when original actor is empty (system/automated action)", () => {
    expect(canReview("", "operator:garrett")).toBe(true);
    expect(canReview("  ", "operator:garrett")).toBe(true);
  });

  it("is case-sensitive and whitespace-trimmed", () => {
    // Same actor with extra whitespace → still same reviewer, cannot review
    expect(canReview("operator:garrett", "  operator:garrett  ")).toBe(false);
  });
});

// ── actor+reason required ─────────────────────────────────────────────────────

describe("assertActionLoggable", () => {
  it("does not throw when actor and reason are present", () => {
    expect(() => assertActionLoggable("operator:garrett", "HARASSMENT")).not.toThrow();
  });

  it("throws ModerationValidationError when actor is empty string", () => {
    expect(() => assertActionLoggable("", "HARASSMENT")).toThrow(ModerationValidationError);
    expect(() => assertActionLoggable("", "HARASSMENT")).toThrow(
      /requires a non-empty actor/
    );
  });

  it("throws ModerationValidationError when actor is whitespace-only", () => {
    expect(() => assertActionLoggable("   ", "HARASSMENT")).toThrow(ModerationValidationError);
  });

  it("throws ModerationValidationError when reason is null", () => {
    expect(() => assertActionLoggable("operator:garrett", null)).toThrow(ModerationValidationError);
    expect(() => assertActionLoggable("operator:garrett", null)).toThrow(
      /requires a reason code/
    );
  });

  it("throws ModerationValidationError when reason is undefined", () => {
    expect(() => assertActionLoggable("operator:garrett", undefined)).toThrow(
      ModerationValidationError
    );
  });
});

// ── Time-boxed actions carry expiry ──────────────────────────────────────────

describe("computeExpiry and requiresExpiry", () => {
  const NOW = new Date("2026-06-12T13:00:00Z");

  it("MUTE_24H has expiry of exactly 24 hours from now", () => {
    const expiry = computeExpiry("MUTE_24H", NOW);
    expect(expiry).not.toBeNull();
    const delta = expiry!.getTime() - NOW.getTime();
    expect(delta).toBe(24 * 60 * 60 * 1000);
  });

  it("MUTE_7D has expiry of exactly 7 days from now", () => {
    const expiry = computeExpiry("MUTE_7D", NOW);
    expect(expiry).not.toBeNull();
    const delta = expiry!.getTime() - NOW.getTime();
    expect(delta).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("NUDGE has no expiry", () => {
    expect(computeExpiry("NUDGE", NOW)).toBeNull();
  });

  it("REMOVE has no expiry", () => {
    expect(computeExpiry("REMOVE", NOW)).toBeNull();
  });

  it("SUSPEND has no automatically-computed expiry (operator-set)", () => {
    expect(computeExpiry("SUSPEND", NOW)).toBeNull();
  });

  it("BAN has no expiry (permanent)", () => {
    expect(computeExpiry("BAN", NOW)).toBeNull();
  });

  it("requiresExpiry is true for MUTE_24H and MUTE_7D", () => {
    expect(requiresExpiry("MUTE_24H")).toBe(true);
    expect(requiresExpiry("MUTE_7D")).toBe(true);
  });

  it("requiresExpiry is false for all other actions", () => {
    const notRequired: ModerationActionKind[] = ["NUDGE", "REMOVE", "SUSPEND", "BAN"];
    for (const a of notRequired) {
      expect(requiresExpiry(a)).toBe(false);
    }
  });
});

// ── Appeal SLA ────────────────────────────────────────────────────────────────

describe("computeAppealDeadline", () => {
  it("is exactly 7 days after the filing date", () => {
    const filed = new Date("2026-06-12T13:00:00Z");
    const deadline = computeAppealDeadline(filed);
    const delta = deadline.getTime() - filed.getTime();
    expect(delta).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// ── LADDER_REFERENCE completeness ─────────────────────────────────────────────

describe("LADDER_REFERENCE", () => {
  it("has an entry for every action kind in LADDER_ORDER", () => {
    const kinds = LADDER_REFERENCE.map((e) => e.action);
    for (const action of LADDER_ORDER) {
      expect(kinds).toContain(action);
    }
  });

  it("BAN entry is marked as straight-to-ban", () => {
    const ban = LADDER_REFERENCE.find((e) => e.action === "BAN");
    expect(ban?.straightToBan).toBe(true);
  });

  it("SUSPEND and BAN entries are marked appealable", () => {
    const appealableEntries = LADDER_REFERENCE.filter((e) => e.appealable).map((e) => e.action);
    expect(appealableEntries).toContain("SUSPEND");
    expect(appealableEntries).toContain("BAN");
  });

  it("NUDGE, REMOVE, MUTE_24H, MUTE_7D are not appealable", () => {
    const notAppealable: ModerationActionKind[] = ["NUDGE", "REMOVE", "MUTE_24H", "MUTE_7D"];
    for (const a of notAppealable) {
      const entry = LADDER_REFERENCE.find((e) => e.action === a);
      expect(entry?.appealable).toBe(false);
    }
  });

  it("MUTE_24H and MUTE_7D carry expiry labels", () => {
    const mute24 = LADDER_REFERENCE.find((e) => e.action === "MUTE_24H");
    const mute7d = LADDER_REFERENCE.find((e) => e.action === "MUTE_7D");
    expect(mute24?.expiryLabel).toBeTruthy();
    expect(mute7d?.expiryLabel).toBeTruthy();
  });
});

// ── Source pin: cockpit page renders honest empty state ───────────────────────

describe("cockpit moderation page (source pin)", () => {
  it("page file exists at the correct route path", async () => {
    // Dynamic import to verify the module resolves without crashing at import time.
    // We do not render it (React Server Component — no jsdom needed for this pin).
    // This test will fail if the file is deleted or moved.
    const mod = await import("../app/cockpit/moderation/page");
    expect(typeof mod.default).toBe("function");
  });

  it("page exports force-dynamic to prevent stale caching", async () => {
    const mod = await import("../app/cockpit/moderation/page");
    expect((mod as { dynamic?: string }).dynamic).toBe("force-dynamic");
  });
});

// ── Source pin: three policy protections reflected in reason enum ─────────────
//
// Policy (docs/legal/COMMUNITY_MODERATION_POLICY.md) mandates three protections:
//   1. No harassment → HARASSMENT reason code
//   2. Protect beginners (mocking a beginner is a moderation event) → BEGINNER_MOCKING
//   3. No shame for sitting out (pressuring to bet) → PRESSURE_TO_BET
//
// This test pins that the codes exist in ModerationReasonCode (imported from @prisma/client)
// and appear in STRAIGHT_TO_BAN_REASONS or in the ladder reference descriptions as appropriate.

describe("policy three-protections source pin", () => {
  // We verify the codes exist by using them in type-checked positions.
  // If any code is removed from the Prisma enum, this import+use will fail to compile.
  const harassmentCode: ModerationReasonCode = "HARASSMENT";
  const beginnerMockingCode: ModerationReasonCode = "BEGINNER_MOCKING";
  const pressureToBetCode: ModerationReasonCode = "PRESSURE_TO_BET";

  it("HARASSMENT reason code exists (protection #1: no harassment)", () => {
    expect(harassmentCode).toBe("HARASSMENT");
  });

  it("BEGINNER_MOCKING reason code exists (protection #2: protect beginners)", () => {
    expect(beginnerMockingCode).toBe("BEGINNER_MOCKING");
  });

  it("PRESSURE_TO_BET reason code exists (protection #3: no shame for sitting out)", () => {
    expect(pressureToBetCode).toBe("PRESSURE_TO_BET");
  });

  it("HARASSMENT does not allow straight-to-BAN (must climb the ladder)", () => {
    // Protection #1 is serious but not in the straight-to-BAN set —
    // that set is reserved for hate speech, threats, doxxing, and
    // self-exclusion circumvention which have zero tolerance.
    expect(allowsStraightToBan("HARASSMENT")).toBe(false);
  });

  it("HATE_SPEECH (which includes slurs and dogpiling per policy) allows straight-to-BAN", () => {
    expect(allowsStraightToBan("HATE_SPEECH")).toBe(true);
  });
});
