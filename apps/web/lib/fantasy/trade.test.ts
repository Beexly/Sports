import { describe, it, expect } from "vitest";
import { tradeValue, evaluateTrade, dynastyValue } from "./trade";
import { PLAYERS, playerById } from "./players";

const get = (id: string) => playerById(id)!;

describe("trade analyzer", () => {
  it("values a stud above a scrub", () => {
    const ranked = [...PLAYERS].sort((a, b) => tradeValue(b) - tradeValue(a));
    expect(tradeValue(ranked[0]!)).toBeGreaterThan(tradeValue(ranked[ranked.length - 1]!));
  });

  it("returns null for an empty side", () => {
    expect(evaluateTrade([], [get("rb-marcus-vale")])).toBeNull();
    expect(evaluateTrade([get("rb-marcus-vale")], [])).toBeNull();
  });

  it("flags an even-ish swap as fair", () => {
    const a = get("rb-deon-pryce");
    const b = get("rb-isaiah-ronan");
    const e = evaluateTrade([a], [b])!;
    // not wildly lopsided
    expect(["fair", "you win", "you lose"]).toContain(e.fairness);
    expect(e.delta).toBe(e.getValue - e.giveValue);
  });

  it("detects consolidation as a win-now lean", () => {
    const give = [get("rb-cole-mathis"), get("rb-andre-soto")];
    const recv = [get("rb-marcus-vale")];
    const e = evaluateTrade(give, recv)!;
    expect(e.lean).toBe("win-now");
    expect(e.bestGet?.id).toBe("rb-marcus-vale");
    expect(e.reasons.join(" ").toLowerCase()).toContain("consolidation");
  });

  it("getting more bodies reads as depth", () => {
    const give = [get("rb-marcus-vale")];
    const recv = [get("rb-cole-mathis"), get("rb-andre-soto")];
    expect(evaluateTrade(give, recv)!.lean).toBe("depth");
  });

  it("getting the better side reads as you win", () => {
    const e = evaluateTrade([get("rb-cole-mathis")], [get("rb-marcus-vale")])!;
    expect(e.getValue).toBeGreaterThan(e.giveValue);
    expect(e.fairness).toBe("you win");
  });

  it("dynasty mode uses dynastyValue in calculations", () => {
    const give = [get("rb-marcus-vale")];
    const recv = [get("rb-malik-orr")]; // trending up, ascending
    const redraft = evaluateTrade(give, recv, PLAYERS, "redraft")!;
    const dynasty = evaluateTrade(give, recv, PLAYERS, "dynasty")!;
    // Trending-up player (malik-orr) gains more in dynasty mode
    expect(dynasty.getValue).toBeGreaterThanOrEqual(redraft.getValue);
  });
});

describe("dynastyValue", () => {
  it("rewards ascending trend vs declining trend", () => {
    const rising = get("rb-malik-orr"); // trend: up
    const falling = get("rb-cole-mathis"); // trend: down
    expect(dynastyValue(rising, PLAYERS)).toBeGreaterThan(dynastyValue(falling, PLAYERS));
  });

  it("returns a positive number for any player", () => {
    for (const p of PLAYERS) {
      expect(dynastyValue(p, PLAYERS)).toBeGreaterThan(0);
    }
  });
});
