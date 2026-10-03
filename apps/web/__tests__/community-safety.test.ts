import { describe, it, expect } from "vitest";
import { moderate, type CommunityContext } from "@/lib/community/community-safety";

function ctx(overrides: Partial<CommunityContext> = {}): CommunityContext {
  return {
    distressSignal: false,
    chasingLossesEncouragement: false,
    harassment: false,
    isMinor: false,
    isSelfExcluded: false,
    gamblingHarmPromotion: false,
    scamOrBadAdvice: false,
    priorViolations: 0,
    ...overrides,
  };
}

describe("community safety engine", () => {
  it("allows ordinary content", () => {
    expect(moderate(ctx()).action).toBe("ALLOW");
  });

  it("answers distress with support, never an upsell, never a ban", () => {
    const d = moderate(ctx({ distressSignal: true, gamblingHarmPromotion: true }));
    expect(d.action).toBe("SUPPORT_RESOURCES");
    expect(d.neverUpsell).toBe(true);
    expect(d.barFromRoom).toBe(false);
  });

  it("bars minors and self-excluded users from the room", () => {
    expect(moderate(ctx({ isMinor: true })).barFromRoom).toBe(true);
    expect(moderate(ctx({ isSelfExcluded: true })).action).toBe("BAN");
  });

  it("straight-to-BAN for gambling-harm promotion or scams", () => {
    expect(moderate(ctx({ gamblingHarmPromotion: true })).action).toBe("BAN");
    expect(moderate(ctx({ scamOrBadAdvice: true })).action).toBe("BAN");
  });

  it("escalates harassment/chasing along the ladder by prior violations", () => {
    expect(moderate(ctx({ harassment: true, priorViolations: 0 })).action).toBe("WARN");
    expect(moderate(ctx({ harassment: true, priorViolations: 1 })).action).toBe("MUTE");
    expect(moderate(ctx({ chasingLossesEncouragement: true, priorViolations: 3 })).action).toBe("BAN");
  });

  it("distress takes precedence over a minor flag (support before anything)", () => {
    const d = moderate(ctx({ distressSignal: true, isMinor: true }));
    expect(d.action).toBe("SUPPORT_RESOURCES");
  });
});
