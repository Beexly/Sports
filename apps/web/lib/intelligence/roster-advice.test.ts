import { describe, it, expect } from "vitest";
import { addTargets, dropCandidates, classifyRoster, addScore } from "./roster-advice";
import type { PlayerProfile, ProcessSignal } from "./player-model";

function prof(name: string, position: string, processGrade: number, signal: ProcessSignal, productionPct = 50): PlayerProfile {
  return {
    playerId: name, name, team: "KC", position: position as PlayerProfile["position"], games: 8, plays: 200,
    fantasyPpr: 100, fppg: 12.5, epaPerPlay: 0.1, touches: 80, wopr: 0.5, targetShare: 0.2, dakota: null, pacr: null,
    processGrade, productionPct, signal, note: "",
  };
}

const POOL: PlayerProfile[] = [
  prof("Ace WR", "WR", 85, "buy-low", 60),
  prof("Hot WR", "WR", 40, "sell-high", 90),
  prof("Steady RB", "RB", 60, "in-line", 58),
  prof("Bench WR", "WR", 30, "in-line", 28),
];

describe("addScore", () => {
  it("nudges buy-lows up and sell-highs down", () => {
    expect(addScore(prof("a", "WR", 50, "buy-low"))).toBe(65);
    expect(addScore(prof("b", "WR", 50, "sell-high"))).toBe(38);
    expect(addScore(prof("c", "WR", 50, "in-line"))).toBe(50);
  });
});

describe("addTargets", () => {
  it("ranks the best available and excludes rostered (case-insensitive)", () => {
    const t = addTargets(POOL, { rostered: ["ace wr"] });
    expect(t.find((x) => x.name === "Ace WR")).toBeUndefined(); // owned, excluded
    expect(t[0]!.name).toBe("Steady RB"); // next-best by addScore (60) over Hot WR (28) / Bench WR (30)
  });

  it("filters by position and respects the limit", () => {
    const t = addTargets(POOL, { position: "WR", limit: 1 });
    expect(t).toHaveLength(1);
    expect(t[0]!.name).toBe("Ace WR"); // top WR (buy-low, grade 85 -> addScore 100)
  });
});

describe("dropCandidates", () => {
  it("surfaces the weakest rostered players, flagging sell-highs", () => {
    const d = dropCandidates(POOL, ["Steady RB", "Bench WR", "Hot WR"]);
    expect(d[0]!.name === "Bench WR" || d[0]!.name === "Hot WR").toBe(true);
    expect(d.some((x) => x.name === "Hot WR" && /sell the name/i.test(x.reason))).toBe(true);
  });
});

describe("classifyRoster", () => {
  it("reads each owned player per the model signal", () => {
    const reads = classifyRoster(POOL, ["Ace WR", "Hot WR", "Steady RB", "Unknown Guy"]);
    const by = (n: string) => reads.find((r) => r.name === n);
    expect(by("Ace WR")!.read).toBe("buy-more");
    expect(by("Hot WR")!.read).toBe("sell-high");
    expect(by("Steady RB")!.read).toBe("ride");
    expect(by("Unknown Guy")).toBeUndefined(); // not in the model pool
  });
});
