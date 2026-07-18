import { describe, expect, it } from "vitest";
import { byeCollisions, marketDisagreements, type RosterPlayerRef } from "./waiver-war-room";
import type { FfcAdpRow } from "./adp-source";
import type { PlayerProfile } from "../intelligence/player-model";
import type { TrendingRow } from "../integrations/sleeper";

function adpRow(over: Partial<FfcAdpRow> & { player: string; pos: string; bye: number }): FfcAdpRow {
  return { team: "KC", adp: 50, high: 40, low: 60, stdev: 5, timesDrafted: 100, ...over };
}

function profile(over: Partial<PlayerProfile> & { name: string; position: PlayerProfile["position"]; signal: PlayerProfile["signal"] }): PlayerProfile {
  return {
    playerId: over.name.toLowerCase().replace(/\s/g, "-"),
    team: "KC",
    games: 10,
    plays: 300,
    fantasyPpr: 150,
    fppg: 15,
    epaPerPlay: 0.1,
    touches: 100,
    wopr: null,
    targetShare: null,
    dakota: null,
    pacr: null,
    processGrade: 70,
    productionPct: 50,
    note: "n",
    ...over,
  };
}

function trend(name: string, position: string, count: number): TrendingRow {
  return { playerId: name.toLowerCase(), name, position, team: "KC", count };
}

describe("byeCollisions", () => {
  const ROSTER: RosterPlayerRef[] = [
    { name: "Alpha WR", pos: "WR", team: "KC" },
    { name: "Beta RB", pos: "RB", team: "BUF" },
    { name: "Gamma TE", pos: "TE", team: "SF" },
    { name: "Delta QB", pos: "QB", team: "NYJ" },
  ];

  it("groups only weeks with 2+ rostered players, most crowded first", () => {
    const report = byeCollisions(ROSTER, [
      adpRow({ player: "Alpha WR", pos: "WR", bye: 7 }),
      adpRow({ player: "Beta RB", pos: "RB", bye: 7 }),
      adpRow({ player: "Gamma TE", pos: "TE", bye: 7 }),
      adpRow({ player: "Delta QB", pos: "QB", bye: 9 }),
    ]);
    expect(report.collisions).toHaveLength(1);
    expect(report.collisions[0]!.bye).toBe(7);
    expect(report.collisions[0]!.players.map((p) => p.name)).toEqual(["Alpha WR", "Beta RB", "Gamma TE"]);
    expect(report.clear.map((p) => p.name)).toEqual(["Delta QB"]);
    expect(report.unknown).toHaveLength(0);
  });

  it("bye 0 means no-bye-joined: reported as unknown, never a Week 0 collision group", () => {
    const report = byeCollisions(ROSTER.slice(0, 2), [
      adpRow({ player: "Alpha WR", pos: "WR", bye: 0 }),
      adpRow({ player: "Beta RB", pos: "RB", bye: 0 }),
    ]);
    expect(report.collisions).toHaveLength(0);
    expect(report.unknown.map((p) => p.name)).toEqual(["Alpha WR", "Beta RB"]);
  });

  it("joins by name AND position — a same-named player at another position never attaches", () => {
    const report = byeCollisions([{ name: "Same Name", pos: "WR", team: "KC" }], [
      adpRow({ player: "Same Name", pos: "RB", bye: 5 }),
    ]);
    expect(report.collisions).toHaveLength(0);
    expect(report.clear).toHaveLength(0);
    expect(report.unknown.map((p) => p.name)).toEqual(["Same Name"]);
  });

  it("a roster player with no ADP row at all is unknown, never guessed", () => {
    const report = byeCollisions([{ name: "Undrafted Guy", pos: "WR", team: "FA" }], []);
    expect(report.unknown.map((p) => p.name)).toEqual(["Undrafted Guy"]);
  });
});

describe("marketDisagreements", () => {
  it("reports model buy-low vs market dropping, and model sell-high vs market adding — nothing else", () => {
    const profiles = [
      profile({ name: "Contrarian Add", position: "WR", signal: "buy-low", processGrade: 82 }),
      profile({ name: "Hot Hand", position: "RB", signal: "sell-high", processGrade: 35 }),
      profile({ name: "Agreed Upon", position: "TE", signal: "buy-low" }),
      profile({ name: "In Line Guy", position: "QB", signal: "in-line" }),
    ];
    const rows = marketDisagreements(
      profiles,
      {
        adds: [trend("Hot Hand", "RB", 4200), trend("Agreed Upon", "TE", 900), trend("In Line Guy", "QB", 100)],
        drops: [trend("Contrarian Add", "WR", 1300), trend("Agreed Upon", "TE", 5)],
      },
      [],
    );
    expect(rows.map((r) => r.name).sort()).toEqual(["Contrarian Add", "Hot Hand"]);
    const contrarian = rows.find((r) => r.name === "Contrarian Add")!;
    expect(contrarian.marketDirection).toBe("dropping");
    expect(contrarian.modelSignal).toBe("buy-low");
    expect(contrarian.marketCount).toBe(1300);
    // Descriptive two-sided language, never merged advice or an outcome promise.
    expect(contrarian.description).toContain("Two live signals, opposite directions");
  });

  it("tags roster membership and sorts rostered disagreements first", () => {
    const profiles = [
      profile({ name: "My Guy", position: "WR", signal: "buy-low" }),
      profile({ name: "Free Agent", position: "RB", signal: "buy-low" }),
    ];
    const rows = marketDisagreements(
      profiles,
      { adds: [], drops: [trend("Free Agent", "RB", 9000), trend("My Guy", "WR", 10)] },
      ["My Guy"],
    );
    expect(rows[0]!.name).toBe("My Guy");
    expect(rows[0]!.onRoster).toBe(true);
    expect(rows[1]!.onRoster).toBe(false);
  });

  it("joins by name AND position — a trending row at another position never matches the profile", () => {
    const rows = marketDisagreements(
      [profile({ name: "Same Name", position: "WR", signal: "buy-low" })],
      { adds: [], drops: [trend("Same Name", "RB", 500)] },
      [],
    );
    expect(rows).toHaveLength(0);
  });

  it("churn: market direction is the DOMINANT side, never mere presence in one list", () => {
    const profiles = [
      profile({ name: "Heavily Added", position: "WR", signal: "buy-low" }),
      profile({ name: "Net Dropped", position: "RB", signal: "buy-low" }),
      profile({ name: "Dead Even", position: "TE", signal: "buy-low" }),
    ];
    const rows = marketDisagreements(
      profiles,
      {
        // Heavily Added: 900 adds vs 5 drops → dominant ADDING → agreement with buy-low → NOT reported.
        // Net Dropped: 40 adds vs 700 drops → dominant DROPPING → conflicts with buy-low → reported with the dominant count.
        // Dead Even: 50/50 → ambiguous → skipped, never guessed.
        adds: [trend("Heavily Added", "WR", 900), trend("Net Dropped", "RB", 40), trend("Dead Even", "TE", 50)],
        drops: [trend("Heavily Added", "WR", 5), trend("Net Dropped", "RB", 700), trend("Dead Even", "TE", 50)],
      },
      [],
    );
    expect(rows.map((r) => r.name)).toEqual(["Net Dropped"]);
    expect(rows[0]!.marketDirection).toBe("dropping");
    expect(rows[0]!.marketCount).toBe(700);
  });
});
