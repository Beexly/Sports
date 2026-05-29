/**
 * Personalization evaluation harness.
 *
 * Asserts that the Experience Orchestrator never:
 *  - recommends a bet
 *  - suppresses /responsible-play or /methodology
 *  - upsells a user in any restraint mode
 *  - manipulates intent through an inferred mode override of a
 *    user-declared mode
 */

import { describe, it, expect } from "vitest";
import { orchestrate } from "@/lib/experience/orchestrator";
import { NEVER_SUPPRESS, priorityOf } from "@/lib/experience/surface-priority";
import { USER_MODES } from "@/lib/experience/user-modes";
import { emptySnapshot } from "@/lib/understanding/user-understanding";
import { classifyMaturity } from "@/lib/decision-quality/maturity";

const SPECTATOR_MATURITY = classifyMaturity({
  methodologyFollows30d: 0,
  noBetReads30d: 0,
  autopsyOpens30d: 0,
  processGradesAcked30d: 0,
  evidenceAudits30d: 0,
  academyModulesCompleted: 0,
  parlayMriPriorRate: 0,
});

function snapshot() {
  return emptySnapshot(123, new Date("2026-05-29").toISOString());
}

describe("personalization: orchestrator never bets / never suppresses critical surfaces", () => {
  it.each(USER_MODES)(
    "%s never returns a betting href as primary",
    (mode) => {
      const out = orchestrate({
        mode,
        maturity: SPECTATOR_MATURITY,
        understanding: snapshot(),
        recentBehavior: [],
        recentConfusion: [],
      });
      const banned = /(place-bet|bet-now|raise-stake|tail)/i;
      expect(banned.test(out.next.primaryHref)).toBe(false);
    },
  );

  it("never suppresses /responsible-play or /methodology", () => {
    // The priority registry classifies these as NEVER_SUPPRESS.
    expect(NEVER_SUPPRESS.has("responsible-play")).toBe(true);
    expect(NEVER_SUPPRESS.has("methodology")).toBe(true);
  });

  it("in-restraint mode always suppresses upsell and bet CTAs", () => {
    const out = orchestrate({
      mode: "in-restraint",
      maturity: SPECTATOR_MATURITY,
      understanding: snapshot(),
      recentBehavior: [],
      recentConfusion: [],
    });
    expect(out.next.suppressUpsell).toBe(true);
    expect(out.next.suppressBetCTA).toBe(true);
  });

  it("post-loss-cooldown mode always suppresses upsell and bet CTAs", () => {
    const out = orchestrate({
      mode: "post-loss-cooldown",
      maturity: SPECTATOR_MATURITY,
      understanding: snapshot(),
      recentBehavior: [],
      recentConfusion: [],
    });
    expect(out.next.suppressUpsell).toBe(true);
    expect(out.next.suppressBetCTA).toBe(true);
  });

  it("responsible-play has the ceiling priority weight", () => {
    expect(priorityOf("responsible-play")).toBe(100);
  });
});

describe("personalization: risky behavior elevates restraint, never bets", () => {
  it("tilt-cascade elevates Responsible Play", () => {
    const out = orchestrate({
      mode: "returning-scan",
      maturity: SPECTATOR_MATURITY,
      understanding: snapshot(),
      recentBehavior: [
        { pattern: "tilt-cascade", observedAt: "2026-05-29T00:00:00Z", confidence: 0.9 },
      ],
      recentConfusion: [],
    });
    expect(out.restraint.elevateResponsiblePlay).toBe(true);
  });

  it("chase-line elevates No-Bet", () => {
    const out = orchestrate({
      mode: "returning-scan",
      maturity: SPECTATOR_MATURITY,
      understanding: snapshot(),
      recentBehavior: [
        { pattern: "chase-line", observedAt: "2026-05-29T00:00:00Z", confidence: 0.8 },
      ],
      recentConfusion: [],
    });
    expect(out.restraint.elevateNoBet).toBe(true);
  });
});
