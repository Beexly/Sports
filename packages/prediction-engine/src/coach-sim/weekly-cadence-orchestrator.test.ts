/**
 * TDD suite for the weekly cadence orchestrator.
 *
 * The orchestrator is the production consumer that closes the "ticket = null"
 * wiring gap: call-sheet.ts produces unpriced Call rows by design, and
 * signCallSheetTickets() in calibration-map.ts prices them — but until this
 * module existed, nothing in production called the signer. This suite proves
 * the orchestrator actually invokes it.
 *
 * Sealed-tau invariant: generateTuesdayMasterLock seals tau at v1.0;
 * advanceWeeklyLockWithInjuries may change execution weights but must leave
 * coachMindsetHash and coachTau bit-identical.
 */
import { describe, it, expect } from "vitest";
import {
  generateTuesdayMasterLock,
  advanceWeeklyLockWithInjuries,
  type WeeklyGameInput,
  type MarketQuotesByCallId,
} from "./weekly-cadence-orchestrator.js";

const game: WeeklyGameInput = {
  gameId: "401873017",
  homeTeam: "ATL",
  awayTeam: "SF",
  week: 7,
  coachSupport: 0.84,
  neutralPassRate: 0.57,
  staffAggression: 0.64,
  staffAggressionAway: 0.69,
  marketSpreadHome: 3.5,
  marketTotal: 50.5,
  rooms: {
    homeTargets: [
      { playerId: "Drake London", role: "WR1", baseShare: 0.31 },
      { playerId: "Bijan Robinson", role: "RB", baseShare: 0.18 },
    ],
    awayTargets: [
      { playerId: "Mike Evans", role: "WR1", baseShare: 0.26 },
      { playerId: "George Kittle", role: "TE", baseShare: 0.25 },
      { playerId: "Brandin Cooks", role: "WR2", baseShare: 0.16 },
    ],
  },
};

const quotes: MarketQuotesByCallId = {
  "SF-personnel": {
    marketLabel: "Brandin Cooks OVER 24.5 Receiving Yards",
    rawModelProb: 0.68,
    americanOdds: -115,
    opposingAmericanOdds: -105,
  },
};

describe("weekly-cadence-orchestrator", () => {
  it("seals a v1.0 lock with a 64-char coachMindsetHash and a recovered tau", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
    });

    expect(v1.version).toBe("v1.0");
    expect(v1.games).toHaveLength(1);
    expect(v1.games[0]!.coachLock.coachMindsetHash).toHaveLength(64);
    expect(Number.isFinite(v1.games[0]!.coachLock.coachTau)).toBe(true);
  });

  it("prices call-sheet tickets when market quotes are supplied", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
      marketQuotes: quotes,
    });

    const signed = v1.signedCalls ?? [];
    expect(signed.length).toBeGreaterThan(0);
    // At least one call must carry a non-null ticket, proving the signer ran.
    expect(signed.some((c) => c.signedTicket !== null)).toBe(true);
  });

  it("leaves tickets null when no quote is supplied for a call", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
      marketQuotes: {},
    });

    const signed = v1.signedCalls ?? [];
    expect(signed.length).toBeGreaterThan(0);
    expect(signed.every((c) => c.signedTicket === null)).toBe(true);
  });

  it("preserves coachMindsetHash and coachTau across an injury advance", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
    });

    const v3 = advanceWeeklyLockWithInjuries(v1, {
      version: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      byGameId: {
        "401873017": {
          inactivePlayerIds: ["Mike Evans"],
          homeInjuryPointsDelta: 0,
          awayInjuryPointsDelta: -1.5,
        },
      },
    });

    expect(v3.version).toBe("v3.0");
    expect(v3.games[0]!.coachLock.coachMindsetHash).toBe(
      v1.games[0]!.coachLock.coachMindsetHash,
    );
    expect(v3.games[0]!.coachLock.coachTau).toBe(v1.games[0]!.coachLock.coachTau);
  });

  it("refuses to advance a lock whose tau was mutated", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
    });

    // Tamper with the sealed tau to prove the guard fires.
    const tampered = {
      ...v1,
      games: [
        {
          ...v1.games[0]!,
          coachLock: { ...v1.games[0]!.coachLock, coachTau: v1.games[0]!.coachLock.coachTau + 0.05 },
        },
      ],
    };

    expect(() =>
      advanceWeeklyLockWithInjuries(tampered, {
        version: "v3.0",
        recordedAtIso: "2026-10-23T21:30:00.000Z",
        byGameId: {
          "401873017": {
            inactivePlayerIds: [],
            homeInjuryPointsDelta: 0,
            awayInjuryPointsDelta: -1.5,
          },
        },
      }),
    ).toThrow(/tau/i);
  });

  it("invalidates tickets priced off the healthy projection when an injury advance changes a game", () => {
    const v1 = generateTuesdayMasterLock({
      season: 2026,
      week: 7,
      lockedAtIso: "2026-10-20T09:00:00.000Z",
      games: [game],
      marketQuotes: quotes,
    });
    // Precondition: the signer actually minted a ticket at v1.0.
    expect((v1.signedCalls ?? []).some((c) => c.signedTicket !== null)).toBe(true);

    const v3 = advanceWeeklyLockWithInjuries(v1, {
      version: "v3.0",
      recordedAtIso: "2026-10-23T21:30:00.000Z",
      byGameId: {
        "401873017": {
          inactivePlayerIds: ["Mike Evans"],
          homeInjuryPointsDelta: 0,
          awayInjuryPointsDelta: -1.5,
        },
      },
    });

    // The injury moved the projection (away −1.5 pts), so every ticket priced
    // against the healthy projection is stale. Stale tickets must not survive:
    // leaving them in place would advertise an edge computed from superseded
    // availability. The lock carries no tickets until re-priced via
    // priceSealedLock against fresh quotes.
    expect(v3.signedCalls ?? []).toHaveLength(0);
    // The seal itself must still be intact.
    expect(v3.games[0]!.coachLock.coachMindsetHash).toBe(
      v1.games[0]!.coachLock.coachMindsetHash,
    );
  });
});
