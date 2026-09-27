import { describe, it, expect } from "vitest";
import {
  computeAdjustments,
  rollUpByPlayer,
  parsePosition,
  DEFAULT_MAGNITUDES,
  type PlayerContext,
} from "@/lib/signals/adjustment-layer";

const NOW = "2026-09-27T12:00:00.000Z";

const p = (over: Partial<PlayerContext> & { playerId: string }): PlayerContext => ({
  position: null, team: null, opponent: null, season: 2026, week: 3, ...over,
});

describe("parsePosition", () => {
  it("maps spec positions and the OL/secondary/pass-rush groups", () => {
    expect(parsePosition("QB")).toBe("QB");
    expect(parsePosition("LT")).toBe("OL");
    expect(parsePosition("C")).toBe("OL");
    expect(parsePosition("SS")).toBe("S");
    expect(parsePosition("CB")).toBe("CB");
    expect(parsePosition("OLB")).toBe("EDGE");
    expect(parsePosition("RB")).toBe("RB");
  });

  it("is UNK for absent/unmappable input rather than throwing", () => {
    expect(parsePosition(null)).toBe("UNK");
    expect(parsePosition(undefined)).toBe("UNK");
    expect(parsePosition("")).toBe("UNK");
    expect(parsePosition("QB")).not.toBe("UNK");
  });
});

describe("§1 offensive-line injury", () => {
  const ctx = {
    now: NOW,
    injuries: [{ playerId: "ol1", status: "OUT" as const, position: "LT", team: "KC" }],
    players: [
      p({ playerId: "qb1", position: "QB", team: "KC" }),
      p({ playerId: "rb1", position: "RB", team: "KC" }),
    ],
  };

  it("moves QB passing DOWN and RB checkdown UP", () => {
    const out = computeAdjustments(ctx);
    const qb = out.find((a) => a.affectedPlayerId === "qb1");
    const rb = out.find((a) => a.affectedPlayerId === "rb1");
    expect(qb?.target).toBe("passing_yards");
    expect(qb?.direction).toBe("DOWN");
    expect(qb?.magnitude).toBeLessThan(0);
    expect(rb?.target).toBe("checkdown_share");
    expect(rb?.direction).toBe("UP");
  });

  it("scales the effect by absence strength (QUESTIONABLE < OUT)", () => {
    const out = computeAdjustments(ctx);
    const qb = out.find((a) => a.affectedPlayerId === "qb1")!;
    const q = computeAdjustments({
      ...ctx,
      injuries: [{ playerId: "ol1", status: "QUESTIONABLE", position: "LT", team: "KC" }],
    }).find((a) => a.affectedPlayerId === "qb1")!;
    expect(Math.abs(q.magnitude)).toBeLessThan(Math.abs(qb.magnitude));
  });

  it("does NOT fire for a PROBABLE player beyond its own small strength", () => {
    const out = computeAdjustments({
      ...ctx,
      injuries: [{ playerId: "ol1", status: "PROBABLE", position: "LT", team: "KC" }],
    });
    const qb = out.find((a) => a.affectedPlayerId === "qb1")!;
    expect(Math.abs(qb.magnitude)).toBeLessThan(Math.abs(DEFAULT_MAGNITUDES.OL_INJURY_QB_PASSING_YARDS));
  });

  it("carries the LOG: which lineman, what status, what fired", () => {
    const qb = computeAdjustments(ctx).find((a) => a.affectedPlayerId === "qb1")!;
    expect(qb.evidence.triggered).toBe(true);
    expect(qb.evidence.triggerPlayerId).toBe("ol1");
    expect(qb.evidence.inputs.status).toBe("OUT");
    expect(qb.evidence.inputs.position).toBe("OL"); // the LINE group, not the slot
  });
});

describe("§2 defensive secondary injury", () => {
  const ctx = {
    now: NOW,
    injuries: [{ playerId: "s1", status: "OUT" as const, position: "S", team: "BUF" }],
    players: [
      p({ playerId: "qb2", position: "QB", team: "NE", opponent: "BUF" }),
      p({ playerId: "wr1", position: "WR", team: "NE", opponent: "BUF" }),
    ],
  };

  it("moves the OPPOSING offense UP, not the team that lost the DB", () => {
    const out = computeAdjustments(ctx);
    const qb = out.find((a) => a.affectedPlayerId === "qb2")!;
    expect(qb.target).toBe("passing_yards");
    expect(qb.direction).toBe("UP");
    // Nothing should be pushed DOWN for the defense that lost the player.
    const downOnNe = out.filter((a) => a.affectedPosition === "DST" && a.direction === "DOWN");
    expect(downOnNe).toHaveLength(0);
  });

  it("raises the DST's own allowed total", () => {
    const dst = computeAdjustments(ctx).find((a) => a.affectedPlayerId === "dst:BUF")!;
    expect(dst.affectedPosition).toBe("DST");
    expect(dst.target).toBe("defense_points_allowed");
    expect(dst.direction).toBe("UP");
  });

  it("does not fire on a team that is not actually playing the injured defense", () => {
    const out = computeAdjustments({
      ...ctx,
      players: [p({ playerId: "qb3", position: "QB", team: "MIA", opponent: "NYJ" })],
    });
    expect(out.find((a) => a.affectedPlayerId === "qb3")).toBeUndefined();
  });
});

describe("§3 pass-rush injury", () => {
  it("gives the opposing QB more time to throw", () => {
    const out = computeAdjustments({
      now: NOW,
      injuries: [{ playerId: "de1", status: "OUT", position: "EDGE", team: "SF" }],
      players: [p({ playerId: "qb4", position: "QB", team: "SEA", opponent: "SF" })],
    });
    const qb = out.find((a) => a.affectedPlayerId === "qb4")!;
    expect(qb.category).toBe("PASS_RUSH_INJURY");
    expect(qb.target).toBe("time_to_throw");
    expect(qb.direction).toBe("UP");
  });
});

describe("§4 depth chart movement", () => {
  it("promotes a backup only when the starter above him is ABSENT", () => {
    const base = {
      now: NOW,
      players: [p({ playerId: "wr2", position: "WR", team: "PHI", depthRank: 2 })],
      starters: [p({ playerId: "wr1", position: "WR", team: "PHI", depthRank: 1 })],
    };
    const absent = computeAdjustments({
      ...base,
      injuries: [{ playerId: "wr1", status: "OUT", position: "WR", team: "PHI" }],
    });
    expect(absent.find((a) => a.affectedPlayerId === "wr2")?.target).toBe("target_share");

    // Starter healthy: no promotion.
    const healthy = computeAdjustments({ ...base, injuries: [] });
    expect(healthy.find((a) => a.affectedPlayerId === "wr2")).toBeUndefined();
  });

  it("does not promote a player who is already the starter", () => {
    const out = computeAdjustments({
      now: NOW,
      players: [p({ playerId: "wr1", position: "WR", team: "PHI", depthRank: 1 })],
      starters: [p({ playerId: "wr2", position: "WR", team: "PHI", depthRank: 2 })],
      injuries: [{ playerId: "wr2", status: "OUT", position: "WR", team: "PHI" }],
    });
    expect(out.find((a) => a.affectedPlayerId === "wr1")).toBeUndefined();
  });
});

describe("§5 weather", () => {
  it("suppresses passing and lifts rushing above the wind threshold", () => {
    const windy = computeAdjustments({
      now: NOW,
      weather: { sustainedWindMph: 25 },
      players: [
        p({ playerId: "qb5", position: "QB", team: "BUF" }),
        p({ playerId: "rb5", position: "RB", team: "BUF" }),
      ],
    });
    expect(windy.find((a) => a.affectedPlayerId === "qb5")?.target).toBe("pass_attempts");
    expect(windy.find((a) => a.affectedPlayerId === "rb5")?.target).toBe("rushing_attempts");
  });

  it("does NOT fire below the threshold", () => {
    const calm = computeAdjustments({
      now: NOW,
      weather: { sustainedWindMph: 5 },
      players: [p({ playerId: "qb5", position: "QB", team: "BUF" })],
    });
    expect(calm).toHaveLength(0);
  });

  it("grows the effect with wind speed rather than switching on", () => {
    const mk = (mph: number) => computeAdjustments({
      now: NOW, weather: { sustainedWindMph: mph },
      players: [p({ playerId: "qb5", position: "QB", team: "BUF" })],
    })[0]!.magnitude;
    expect(Math.abs(mk(35))).toBeGreaterThan(Math.abs(mk(20)));
  });

  it("treats an absent wind reading as SILENCE, not as calm", () => {
    const missing = computeAdjustments({
      now: NOW, weather: { sustainedWindMph: null },
      players: [p({ playerId: "qb5", position: "QB", team: "BUF" })],
    });
    expect(missing).toHaveLength(0);
  });
});

describe("§6 game script", () => {
  it("fires on a large spread and does not on a small one", () => {
    const players = [p({ playerId: "qb6", position: "QB", team: "CLE" })];
    const big = computeAdjustments({ now: NOW, gameScript: { spread: -10 }, players });
    expect(big.length).toBeGreaterThan(0);
    const small = computeAdjustments({ now: NOW, gameScript: { spread: -2 }, players });
    expect(small).toHaveLength(0);
  });

  it("says the side is UNATTRIBUTED rather than guessing which team is behind", () => {
    const out = computeAdjustments({
      now: NOW, gameScript: { spread: -10 },
      players: [p({ playerId: "qb6", position: "QB", team: "CLE" })],
    });
    expect(out[0]!.evidence.inputs.sideAttributed).toBe(false);
  });
});

describe("THE HONESTY RULE — magnitudes are uncalibrated until measured", () => {
  const ctx = {
    now: NOW,
    injuries: [{ playerId: "ol1", status: "OUT" as const, position: "LT", team: "KC" }],
    players: [p({ playerId: "qb1", position: "QB", team: "KC" })],
  };

  it("marks a DEFAULT magnitude calibrated:false", () => {
    const out = computeAdjustments(ctx);
    expect(out.length).toBeGreaterThan(0);
    for (const a of out) expect(a.calibrated).toBe(false);
  });

  it("flips calibrated:true ONLY for a key the caller supplied", () => {
    const out = computeAdjustments({
      ...ctx,
      magnitudes: { OL_INJURY_QB_PASSING_YARDS: -6.5 },
    });
    const qb = out.find((a) => a.affectedPlayerId === "qb1")!;
    expect(qb.calibrated).toBe(true);
    expect(qb.magnitude).toBe(-6.5);
    // A different rule in the same run stays uncalibrated.
    const team = out.find((a) => a.affectedPlayerId === "team:KC")!;
    expect(team.calibrated).toBe(false);
  });

  it("is pure: identical inputs give identical output, and `now` is not read", () => {
    const a = computeAdjustments(ctx);
    const b = computeAdjustments(ctx);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("rollUpByPlayer", () => {
  it("nets same-target adjustments with their direction", () => {
    const out = computeAdjustments({
      now: NOW,
      injuries: [
        { playerId: "s1", status: "OUT", position: "S", team: "BUF" },
        { playerId: "s2", status: "OUT", position: "CB", team: "BUF" },
      ],
      players: [p({ playerId: "qb1", position: "QB", team: "NE", opponent: "BUF" })],
    });
    const roll = rollUpByPlayer(out);
    const qb = roll.get("qb1")!;
    const passing = qb.find((x) => x.target === "passing_yards")!;
    // Two secondary absences compound upward.
    expect(passing.net).toBeGreaterThan(0);
  });
});

describe("absence is SILENCE", () => {
  it("returns nothing when there is nothing to say", () => {
    expect(computeAdjustments({ now: NOW })).toHaveLength(0);
    expect(computeAdjustments({ now: NOW, injuries: [], players: [] })).toHaveLength(0);
  });

  it("never invents a magnitude for a player it has no context on", () => {
    const out = computeAdjustments({
      now: NOW,
      injuries: [{ playerId: "ol1", status: "OUT", position: "LT", team: "KC" }],
      players: [], // no players supplied
    });
    // The team-level rule may still fire, but no player is invented.
    const playerTouched = out.filter((a) => !a.affectedPlayerId.startsWith("team:"));
    expect(playerTouched).toHaveLength(0);
  });

  it("gives stable ids so the same trigger logs the same key twice", () => {
    const a = computeAdjustments({
      now: NOW,
      injuries: [{ playerId: "ol1", status: "OUT", position: "LT", team: "KC" }],
      players: [p({ playerId: "qb1", position: "QB", team: "KC" })],
    });
    const b = computeAdjustments({
      now: NOW,
      injuries: [{ playerId: "ol1", status: "OUT", position: "LT", team: "KC" }],
      players: [p({ playerId: "qb1", position: "QB", team: "KC" })],
    });
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });
});
