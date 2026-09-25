import { describe, expect, it } from "vitest";
import {
  DK_API_BASE,
  DK_PICK6_PATH_PREFIX,
  ingestDkPick6Payouts,
  ingestDkPick6PickCards,
  dkPick6IntakeEnabled,
} from "./dk-pick6-intake.js";

const enabledEnv = { DK_PICK6_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;
const asOf = "2026-09-25T22:00:00.000Z";

const pickCards = {
  pickCardByPickableId: {
    "4444441": {
      pickableId: 4444441,
      entities: [{ dkId: 468700 }],
      activePickableMarkets: [
        {
          pickableMarketId: 17641259,
          pickSixMarketId: 93,
          targetValue: 39.5,
          isPaused: false,
          isLive: false,
        },
      ],
    },
  },
  entityInfoByDkId: {
    "468700": { fullName: "Jonathan Taylor", name: "J. Taylor" },
  },
  pickSixMarketById: {
    "93": { name: "Rushing Yards" },
  },
};

const entryDetails = {
  payoutPackages: [
    {
      pickSetSize: 2,
      payoutTiers: [{ numberOfPicksCorrect: 2, guaranteedMultiplier: 3.0 }],
    },
    {
      pickSetSize: 4,
      payoutTiers: [{ numberOfPicksCorrect: 4, guaranteedMultiplier: 10.0 }],
    },
  ],
};

describe("dkPick6IntakeEnabled", () => {
  it("is disabled by default", () => {
    expect(dkPick6IntakeEnabled(disabledEnv)).toBe(false);
  });

  it("enables on explicit true", () => {
    expect(dkPick6IntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("ingestDkPick6PickCards", () => {
  it("fails closed when disabled", () => {
    const res = ingestDkPick6PickCards(153812, pickCards, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("accepts a valid card with market name and target value", () => {
    const res = ingestDkPick6PickCards(153812, pickCards, asOf, enabledEnv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    const r = res.data.accepted[0]!;
    expect(r.playerName).toBe("Jonathan Taylor");
    expect(r.marketName).toBe("Rushing Yards");
    expect(r.targetValue).toBe(39.5);
    expect(r.pickGroupId).toBe(153812);
    expect(r.paused).toBe(false);
    expect(r.source).toBe("dk-pick6-api");
  });

  it("rejects cards missing player or market fields", () => {
    const res = ingestDkPick6PickCards(
      153812,
      { pickCardByPickableId: { "1": { pickableId: 1, entities: [], activePickableMarkets: [] } } },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(0);
  });

  it("rejects an invalid pickGroupId", () => {
    expect(ingestDkPick6PickCards(0, pickCards, asOf, enabledEnv).ok).toBe(false);
  });

  it("documents the correct (non-/public) path prefix", () => {
    expect(DK_API_BASE).toBe("https://api.draftkings.com");
    expect(DK_PICK6_PATH_PREFIX).toBe("/pick6/v1");
  });
});

describe("ingestDkPick6Payouts", () => {
  it("fails closed when disabled", () => {
    const res = ingestDkPick6Payouts(153812, entryDetails, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("accepts payout tiers with guaranteed multipliers", () => {
    const res = ingestDkPick6Payouts(153812, entryDetails, asOf, enabledEnv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(2);
    expect(res.data.accepted[0]).toMatchObject({
      pickSetSize: 2,
      numberOfPicksCorrect: 2,
      guaranteedMultiplier: 3.0,
    });
    expect(res.data.accepted[1]!.guaranteedMultiplier).toBe(10.0);
  });

  it("rejects non-array payout packages", () => {
    const res = ingestDkPick6Payouts(153812, {} as never, asOf, enabledEnv);
    expect(res.ok).toBe(false);
  });
});
