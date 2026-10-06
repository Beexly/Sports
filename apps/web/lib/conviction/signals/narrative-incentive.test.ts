import { describe, expect, it } from "vitest";

import {
  NARRATIVE_FRESHNESS_MS,
  createNarrativeIncentiveSignal,
  type NarrativeFact,
} from "./narrative-incentive";
import type { GateCandidate } from "../gate-contract";

const HOME = "Cincinnati Bengals";
const AWAY = "Baltimore Ravens";
const NOW = new Date("2026-09-13T12:00:00Z");

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "g-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: HOME,
    awayTeamName: AWAY,
    commenceTime: new Date("2026-09-14T17:00:00Z"),
    pickType: "MONEYLINE",
    selection: HOME,
    side: "home",
    line: null,
    ...overrides,
  };
}

function fact(overrides: Partial<NarrativeFact> = {}): NarrativeFact {
  return {
    kind: "contract-incentive",
    team: HOME,
    player: "Ja'Marr Chase",
    description: "105 receiving yards short of a season-yardage escalator",
    direction: "helps",
    magnitude: "high",
    source: "https://example-contract-source.test/bengals/incentives",
    verifiedAt: new Date("2026-09-12T12:00:00Z"),
    ...overrides,
  };
}

function signalWith(facts: readonly NarrativeFact[]) {
  return createNarrativeIncentiveSignal({ loadFacts: async () => facts, now: () => NOW });
}

describe("narrative-incentive signal", () => {
  it("returns null with no facts — inert until a real source is wired", async () => {
    expect(await signalWith([])(candidate())).toBeNull();
  });

  it("returns null when the side is null", async () => {
    expect(await signalWith([fact()])(candidate({ side: null }))).toBeNull();
  });

  it("returns null on a total, where no team is the backed side", async () => {
    const read = await signalWith([fact()])(
      candidate({ pickType: "TOTAL", side: "over", selection: "Over 47.5", line: 47.5 }),
    );
    expect(read).toBeNull();
  });

  it("CONFIRMS the canonical Chase contract-incentive case for our side", async () => {
    const read = await signalWith([fact()])(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.key).toBe("narrative-incentive");
    expect(read?.reason).toContain("Ja'Marr Chase");
    expect(read?.reason).toContain("escalator");
    expect(read?.reason).toContain("example-contract-source.test");
  });

  it("CONTRADICTS when a high-magnitude fact hurts our side", async () => {
    const read = await signalWith([fact({ direction: "hurts", kind: "elimination" })])(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("CONTRADICTS when a high-magnitude fact helps the opponent", async () => {
    const read = await signalWith([fact({ team: AWAY, direction: "helps", kind: "revenge" })])(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("CONFIRMS when a high-magnitude fact hurts the opponent", async () => {
    const read = await signalWith([fact({ team: AWAY, direction: "hurts", kind: "elimination" })])(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("CONFIRMS on a medium-magnitude fact that helps our side", async () => {
    const read = await signalWith([fact({ magnitude: "medium", kind: "milestone" })])(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("is NEUTRAL when every verified fact is low magnitude", async () => {
    const read = await signalWith([
      fact({ magnitude: "low", kind: "streak" }),
      fact({ magnitude: "low", team: AWAY, direction: "hurts" }),
    ])(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("ignores a fact with an empty source — a narrative with no citation is a story", async () => {
    expect(await signalWith([fact({ source: "   " })])(candidate())).toBeNull();
  });

  it("ignores a fact whose verifiedAt is older than the freshness window", async () => {
    const stale = new Date(NOW.getTime() - NARRATIVE_FRESHNESS_MS - 60_000);
    expect(await signalWith([fact({ verifiedAt: stale })])(candidate())).toBeNull();
  });

  it("ignores a fact verified in the future (a broken clock is not freshness)", async () => {
    const ahead = new Date(NOW.getTime() + 60_000);
    expect(await signalWith([fact({ verifiedAt: ahead })])(candidate())).toBeNull();
  });

  it("ignores a fact with an invalid verifiedAt", async () => {
    expect(await signalWith([fact({ verifiedAt: new Date("not-a-date") })])(candidate())).toBeNull();
  });

  it("ignores a fact about a team that is not in this fixture", async () => {
    expect(await signalWith([fact({ team: "Green Bay Packers" })])(candidate())).toBeNull();
  });

  it("CONTRADICTS wins when facts point both ways", async () => {
    const read = await signalWith([
      fact({ team: AWAY, direction: "hurts", description: "eliminated, resting starters" }),
      fact({ direction: "hurts", description: "our starter sitting for a bonus-free week" }),
    ])(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.reason).toContain("bonus-free week");
  });

  it("reports completeness as the usable share of loaded facts", async () => {
    const read = await signalWith([
      fact(),
      fact({ source: "", description: "uncited" }),
      fact({ team: "Green Bay Packers", description: "wrong game" }),
      fact({ verifiedAt: new Date(NOW.getTime() - NARRATIVE_FRESHNESS_MS - 1), description: "stale" }),
    ])(candidate());
    expect(read?.completeness).toBeCloseTo(0.25, 2);
  });

  it("states the freshness window in the basis so a held row can explain itself", async () => {
    const read = await signalWith([fact()])(candidate());
    expect(read?.basis).toContain("14 days");
    expect(read?.basis).toContain("verifiedAt");
  });

  it("reads the same fixture from the away side", async () => {
    const read = await signalWith([fact({ team: AWAY, direction: "helps" })])(
      candidate({ side: "away", selection: AWAY }),
    );
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("never infers a narrative from team names or dates alone", async () => {
    const calls: string[] = [];
    const fn = createNarrativeIncentiveSignal({
      loadFacts: async (gameId) => {
        calls.push(gameId);
        return [];
      },
      now: () => NOW,
    });
    expect(await fn(candidate())).toBeNull();
    expect(calls).toEqual(["g-1"]);
  });
});
