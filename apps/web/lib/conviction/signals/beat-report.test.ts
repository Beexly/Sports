import { describe, expect, it } from "vitest";

import { createBeatReportSignal } from "./beat-report";
import type { GateCandidate } from "../gate-contract";
import type { NewsItem, SignalType, Tier } from "@/lib/news/impact";

const HOME = "Cincinnati Bengals";
const AWAY = "Baltimore Ravens";

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

let seq = 0;
function item(
  team: string,
  signal: SignalType,
  tier: Tier,
  source: string,
  player = "Star Player",
): NewsItem {
  seq += 1;
  return {
    id: `n-${seq}`,
    source,
    tier,
    team,
    player,
    headline: `${player} ${signal}`,
    signal,
    minutesAgo: 30,
  };
}

/** Two distinct sources on the same team+player+signal => corroborated. */
function confirmed(team: string, signal: SignalType, tier: Tier, player = "Star Player"): NewsItem[] {
  return [item(team, signal, tier, "Source A", player), item(team, signal, tier, "Source B", player)];
}

function signalWith(items: readonly NewsItem[], live = true) {
  return createBeatReportSignal({ live, loadWireForGame: async () => items });
}

describe("beat-report signal", () => {
  it("returns null when live is false, even on a loud corroborated wire", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Insider"), false)(candidate());
    expect(read).toBeNull();
  });

  it("defaults live to false, so an unflagged deps object never votes", async () => {
    const fn = createBeatReportSignal({
      loadWireForGame: async () => confirmed(HOME, "injury-out", "Insider"),
    });
    expect(await fn(candidate())).toBeNull();
  });

  it("returns null when the wire has no items for this game", async () => {
    expect(await signalWith([])(candidate())).toBeNull();
  });

  it("returns null when no item is about either team in the fixture", async () => {
    const read = await signalWith(confirmed("Green Bay Packers", "injury-out", "Insider"))(candidate());
    expect(read).toBeNull();
  });

  it("returns null on a single uncorroborated rumour", async () => {
    const read = await signalWith([item(HOME, "injury-out", "Insider", "Only Source")])(candidate());
    expect(read).toBeNull();
  });

  it("returns null when the side is null (nothing to back)", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Insider"))(candidate({ side: null }));
    expect(read).toBeNull();
  });

  it("returns null on a total, where no team is the backed side", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Insider"))(
      candidate({ pickType: "TOTAL", side: "over", selection: "Over 47.5", line: 47.5 }),
    );
    expect(read).toBeNull();
  });

  it("CONTRADICTS when a corroborated Beat report rules out a player on our side", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Beat"))(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.key).toBe("beat-report");
    expect(read?.reason).toContain(HOME);
    expect(read?.basis).toContain("corroborate");
  });

  it("CONFIRMS when a corroborated Insider report rules out a player on the opponent", async () => {
    const read = await signalWith(confirmed(AWAY, "injury-out", "Insider"))(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("CONTRADICTS when a corroborated Verified report returns an opponent player", async () => {
    const read = await signalWith(confirmed(AWAY, "injury-return", "Verified"))(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("CONFIRMS when a corroborated report returns a player on our side", async () => {
    const read = await signalWith(confirmed(HOME, "injury-return", "Beat"))(candidate());
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("reads a suspension on our side as CONTRADICTS", async () => {
    const read = await signalWith(confirmed(HOME, "suspension", "Insider"))(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("reads a scheme shift on the opponent as CONTRADICTS (it helps them, so it cuts against us)", async () => {
    const read = await signalWith(confirmed(AWAY, "scheme", "Beat"))(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
  });

  it("never lets the Aggregator tier vote, even when corroborated", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Aggregator"))(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("never lets the Unconfirmed tier vote, even when corroborated", async () => {
    const read = await signalWith(confirmed(AWAY, "injury-out", "Unconfirmed"))(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("is NEUTRAL when the only corroborated story has no knowable direction (trade)", async () => {
    const read = await signalWith(confirmed(HOME, "trade", "Insider"))(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("does not let an uncorroborated rumour drive the verdict alongside a corroborated non-voter", async () => {
    const wire = [
      ...confirmed(HOME, "trade", "Aggregator", "Traded Guy"),
      item(HOME, "injury-out", "Insider", "Lone Rumour", "Franchise QB"),
    ];
    const read = await signalWith(wire)(candidate());
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("CONTRADICTS wins when evidence points both ways", async () => {
    const wire = [
      ...confirmed(AWAY, "injury-out", "Insider", "Their Star"), // favours us
      ...confirmed(HOME, "injury-out", "Beat", "Our Star"), // against us
    ];
    const read = await signalWith(wire)(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.reason).toContain("Our Star");
  });

  it("reports completeness as the corroborated share of relevant items", async () => {
    const wire = [
      ...confirmed(HOME, "injury-out", "Beat", "Our Star"),
      item(HOME, "role-up", "Beat", "Lone Source", "Backup"),
    ];
    const read = await signalWith(wire)(candidate());
    expect(read?.completeness).toBeCloseTo(0.67, 2);
  });

  it("works from the away side of the same fixture", async () => {
    const read = await signalWith(confirmed(HOME, "injury-out", "Beat"))(
      candidate({ side: "away", selection: AWAY }),
    );
    expect(read?.verdict).toBe("CONFIRMS");
  });

  it("returns null when the loader yields items only for unrelated teams and rumours", async () => {
    const read = await signalWith([item("Green Bay Packers", "injury-out", "Insider", "A")])(candidate());
    expect(read).toBeNull();
  });
});
