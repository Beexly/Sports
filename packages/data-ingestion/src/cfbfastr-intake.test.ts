import { describe, expect, it } from "vitest";
import {
  aggregateEpaByTeam,
  buildGameMeta,
  cfbfastrIntakeEnabled,
  ingestCollegePlays,
  playsForGame,
  validatePlayRow,
} from "./cfbfastr-intake.js";

const enabledEnv = { CFBFASTR_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;

function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    playId: "p1",
    gameId: "g1",
    season: 2026,
    week: 3,
    homeTeam: "Michigan",
    awayTeam: "Ohio State",
    offenseTeam: "Michigan",
    epa: 0.45,
    success: true,
    playType: "pass",
    down: 2,
    distance: 7,
    yardsGained: 12,
    isPass: true,
    isRush: false,
    isScoring: false,
    asOf: "2026-09-25T12:00:00.000Z",
    source: "cfbfastr",
    ...over,
  };
}

describe("D4 cfbfastrIntakeEnabled", () => {
  it("is env-gated and default OFF", () => {
    expect(cfbfastrIntakeEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(cfbfastrIntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("D4 validatePlayRow", () => {
  it("accepts a complete row", () => {
    const r = validatePlayRow(raw());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.playId).toBe("p1");
      expect(r.data.epa).toBeCloseTo(0.45, 4);
      expect(r.data.week).toBe(3);
    }
  });

  it("rejects missing required fields", () => {
    for (const f of ["playId", "gameId", "season", "week", "homeTeam", "offenseTeam", "asOf"]) {
      const r = validatePlayRow(raw({ [f]: null }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain(f);
    }
  });

  it("rejects invalid season/week/asOf", () => {
    expect(validatePlayRow(raw({ season: 1800 })).ok).toBe(false);
    expect(validatePlayRow(raw({ week: 99 })).ok).toBe(false);
    expect(validatePlayRow(raw({ asOf: "nope" })).ok).toBe(false);
  });

  it("passes nulls through for optional numeric fields — never imputed", () => {
    const r = validatePlayRow(raw({ epa: null, success: null, down: null, yardsGained: null }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.epa).toBeNull();
      expect(r.data.success).toBeNull();
      expect(r.data.down).toBeNull();
      expect(r.data.yardsGained).toBeNull();
    }
  });
});

describe("D4 ingestCollegePlays", () => {
  it("rejects when env gate is off", () => {
    const r = ingestCollegePlays([raw()], "2026-09-25T20:00:00.000Z", {} as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
  });

  it("excludes future plays and bad rows", () => {
    const r = ingestCollegePlays(
      [
        raw(),
        raw({ playId: "p2", asOf: "2026-09-25T23:00:00.000Z" }),
        raw({ playId: "p3", gameId: null }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.accepted).toHaveLength(1);
      expect(r.data.rejected).toHaveLength(2);
    }
  });
});

describe("D4 playsForGame / buildGameMeta", () => {
  it("filters and sorts plays by asOf", () => {
    const r = ingestCollegePlays(
      [
        raw({ playId: "b", asOf: "2026-09-25T14:00:00.000Z" }),
        raw({ playId: "a", asOf: "2026-09-25T12:00:00.000Z" }),
        raw({ playId: "c", gameId: "g2", asOf: "2026-09-25T13:00:00.000Z" }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    if (!r.ok) throw new Error("ingest should succeed");
    const plays = playsForGame(r.data.accepted, "g1");
    expect(plays).toHaveLength(2);
    expect(plays[0]!.playId).toBe("a");
    expect(plays[1]!.playId).toBe("b");

    const meta = buildGameMeta(plays);
    expect(meta!.gameId).toBe("g1");
    expect(meta!.homeScore).toBeNull();
  });

  it("returns null meta for empty play list", () => {
    expect(buildGameMeta([])).toBeNull();
  });
});

describe("D4 aggregateEpaByTeam", () => {
  it("sums EPA and counts missing separately — never imputes null as zero", () => {
    const r = ingestCollegePlays(
      [
        raw({ playId: "a", offenseTeam: "A", epa: 0.5 }),
        raw({ playId: "b", offenseTeam: "A", epa: 0.3 }),
        raw({ playId: "c", offenseTeam: "A", epa: null }),
        raw({ playId: "d", offenseTeam: "B", epa: -0.2 }),
      ],
      "2026-09-25T20:00:00.000Z",
      enabledEnv,
    );
    if (!r.ok) throw new Error("ingest should succeed");
    const { byTeam } = aggregateEpaByTeam(r.data.accepted);

    expect(byTeam.A!.epa).toBeCloseTo(0.8, 4);
    expect(byTeam.A!.playsWithEpa).toBe(2);
    expect(byTeam.A!.playsMissingEpa).toBe(1);
    expect(byTeam.B!.epa).toBeCloseTo(-0.2, 4);
  });
});
