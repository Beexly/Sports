/**
 * The lock is the baseline. Books are a price check after it.
 * A coach shift that clears the stub prior chooses the side.
 * A shift that does not is recorded and does not invent a home side.
 */
import { describe, expect, it } from "vitest";
import { scoreGame, type OddsInput } from "../scoring";
import type { InjuryRow } from "../engine/availability-factors";
import { lockFromCoachPacket } from "../engine/coach-lock";
import { priceLockedSpread } from "../engine/price-check";

const AT = new Date("2026-10-23T12:00:00Z");
const COMMENCE = new Date("2026-10-25T17:00:00Z");

function out(team: string, name: string): InjuryRow {
  return {
    team,
    week: 7,
    fullName: name,
    position: "WR",
    status: "Out",
    primaryInjury: "Ankle",
    source: "ESPN summary injuries",
    fetchedAt: "2026-10-23T11:41:00Z",
  };
}

const AWAY_OUTS: InjuryRow[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((n, i) =>
  out("Cincinnati Bengals", `Away Out ${n}${i}`),
);

function spreadRow(bookmaker: string, spread: number) {
  return {
    bookmaker,
    market: "SPREADS" as const,
    spread,
    homeSpreadPrice: -110,
    awaySpreadPrice: -110,
  };
}

function h2hRow(bookmaker: string) {
  return {
    bookmaker,
    market: "H2H" as const,
    homePrice: -800,
    awayPrice: 600,
  };
}

function game(
  spreads: number[],
  injuries: InjuryRow[] = [],
  extra?: Partial<OddsInput>,
): OddsInput {
  return {
    gameId: "401873012",
    homeTeam: "Baltimore Ravens",
    awayTeam: "Cincinnati Bengals",
    commenceTime: COMMENCE,
    sport: "NFL",
    bookmakerOdds: [
      ...spreads.map((spread, i) => spreadRow(`bk${i}`, spread)),
      ...Array.from({ length: 8 }, (_, i) => h2hRow(`ml${i}`)),
    ],
    context: {
      openingSpread: -1.5,
      currentSpread: spreads[0] ?? -3,
      restDaysHome: 7,
      restDaysAway: 14,
      homeAtsForm: { wins: 4, losses: 2, pushes: 0, sampleSize: 6 },
      homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
      headToHeadForm: { wins: 3, losses: 1, pushes: 0, sampleSize: 4 },
      scheduleDensityHome: 2,
      scheduleDensityAway: 1,
      dataFreshnessMinutes: 2,
      ...(extra?.context ?? {}),
    },
    coachTrail: { week: 7, injuries, ...(extra?.coachTrail ?? {}) },
  };
}

describe("lock before the books", () => {
  it("records the locked margin and does not let a small trail invent the side", () => {
    const picks = scoreGame(game([-3.5, -3.5, -3.5, -3.5, -3.5, -3.5, 3.5, 3.5]), AT);
    const spread = picks.find((p) => p.pickType === "SPREAD");
    expect(spread).toBeTruthy();
    expect(spread!.reasoning.startsWith("Locked home margin")).toBe(true);
    expect(spread!.reasoning.indexOf("Locked home margin")).toBeLessThan(
      spread!.reasoning.indexOf("Market fair") === -1
        ? spread!.reasoning.length
        : spread!.reasoning.indexOf("Market fair"),
    );
    expect(spread!.factorBreakdown.factors[0]!.name).toBe("Locked coach projection");
    expect(spread!.factorBreakdown.priceAction).toBe("PASS-on-price");
    expect(spread!.factorBreakdown.coachOverridesStub).toBe(false);
    // Market still has the home team favored. The stub did not flip it, and
    // it did not suppress the pick.
    expect(spread!.selection.startsWith("Baltimore Ravens")).toBe(true);
  });

  it("keeps the same lock hash when only the spread changes", () => {
    const a = scoreGame(game([-3, -3, -3, -3]), AT)[0]!;
    const b = scoreGame(game([-7, -7, -7, -7]), AT)[0]!;
    expect(a.factorBreakdown.lockedInputHash).toBe(b.factorBreakdown.lockedInputHash);
    expect(a.factorBreakdown.lockedMarginMean).toBe(b.factorBreakdown.lockedMarginMean);
    expect(a.reasoning).toContain(`hash ${a.factorBreakdown.lockedInputHash}`);
  });

  it("plays the coach side when the shift clears the stub and the price is 7+ points", () => {
    const played = scoreGame(game([3, 3, 3, 3, 3, 3, 3, 3], AWAY_OUTS), AT);
    const spread = played.find((p) => p.pickType === "SPREAD");
    expect(spread).toBeTruthy();
    expect(spread!.factorBreakdown.coachOverridesStub).toBe(true);
    expect(spread!.factorBreakdown.priceAction).toBe("PLAY");
    // Every book has the home team getting points. The market side is away.
    // The lock's side is home.
    expect(spread!.selection.startsWith("Baltimore Ravens")).toBe(true);
    expect(spread!.selection).toContain("+3.0");
    expect(played.some((p) => p.pickType === "MONEYLINE")).toBe(false);
  });

  it("passes on price instead of taking the market's number", () => {
    const passed = scoreGame(game([-14, -14, -14, -14, -14, -14, -14, -14], AWAY_OUTS), AT);
    expect(passed).toHaveLength(0);
    const control = scoreGame(game([-14, -14, -14, -14, -14, -14, -14, -14]), AT);
    expect(control.some((p) => p.pickType === "MONEYLINE")).toBe(true);
  });

  it("takes the posted alternate when the consensus number is not the bet", () => {
    const picks = scoreGame(game([-10, -10, -10, -10, -10, -10, -10, 2], AWAY_OUTS), AT);
    const spread = picks.find((p) => p.pickType === "SPREAD");
    expect(spread).toBeTruthy();
    expect(spread!.factorBreakdown.priceAction).toBe("ALT");
    expect(spread!.selection).toContain("Baltimore Ravens");
    expect(spread!.selection).toContain("+2.0");
    expect(spread!.line).toBe(2);
  });

  it("moves confidence when the home OL continuity delta is present", () => {
    const base = scoreGame(game([-3, -3, -3, -3]), AT).find((p) => p.pickType === "SPREAD")!;
    const hit = scoreGame(
      game([-3, -3, -3, -3], [], { context: { olContinuityDelta: -0.15 } }),
      AT,
    ).find((p) => p.pickType === "SPREAD")!;
    const factor = hit.factorBreakdown.factors.find((f) => f.name === "Trench: home OL");
    expect(factor?.weight).toBe(-1);
    expect(factor?.description).toContain("delta -0.15");
    expect(base.confidence - hit.confidence).toBe(1);
    const gap = base.factorBreakdown.factors.find((f) => f.name === "Trench: home OL");
    expect(gap?.description).toContain("Gap:");
    expect(gap?.weight).toBe(0);
  });
});

describe("price check math", () => {
  it("does not treat a sub-7 gap as a play", () => {
    const priced = priceLockedSpread({
      marginMean: 3,
      scoreMean: 24,
      avgSpread: -3,
      quotedHomeLines: [-3],
    });
    expect(priced.action).toBe("PASS-on-price");
    expect(priced.side).toBe("HOME");
  });

  it("locks from the trail without a book field", () => {
    const read = lockFromCoachPacket({
      homeTeam: "Baltimore Ravens",
      awayTeam: "Cincinnati Bengals",
      week: 7,
      injuries: AWAY_OUTS,
    });
    expect(read.homeSupport).toBe(45);
    expect(read.coachOverridesStub).toBe(true);
    expect(read.marginSide).toBe("HOME");
    expect(read.locked.inputHash).toMatch(/^[0-9a-f]+$/);
  });
});
