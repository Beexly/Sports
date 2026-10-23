import { describe, expect, it } from "vitest";
import { negativePlayRateByTeam } from "../negative-play-rate.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";

function row(overrides: Record<string, string>): PbpRow {
  const base: Record<string, string> = {
    game_id: "2025_01_AAA_BBB",
    season: "2025",
    season_type: "REG",
    week: "1",
    posteam: "AAA",
    play_type: "pass",
    yards_gained: "0",
    qb_kneel: "0",
  };
  return { ...base, ...overrides } as Readonly<Record<string, string>>;
}

describe("negativePlayRateByTeam", () => {
  it("computes exact rate arithmetic for a small hand-computed line", () => {
    const plays: PbpRow[] = [];

    // Team AAA: 40 qualifying plays over 3 weeks. 3 negative plays.
    // 3 / 40 = 0.075
    // Week 1: 15 plays, 1 neg
    for (let i = 0; i < 14; i++) plays.push(row({ posteam: "AAA", week: "1", yards_gained: "5" }));
    plays.push(row({ posteam: "AAA", week: "1", yards_gained: "-2" })); // 1 neg

    // Week 2: 15 plays, 2 neg
    for (let i = 0; i < 13; i++) plays.push(row({ posteam: "AAA", week: "2", yards_gained: "5" }));
    plays.push(row({ posteam: "AAA", week: "2", yards_gained: "-1" })); // 2 neg
    plays.push(row({ posteam: "AAA", week: "2", yards_gained: "-3" })); // 3 neg

    // Week 3: 10 plays, 0 neg
    for (let i = 0; i < 10; i++) plays.push(row({ posteam: "AAA", week: "3", yards_gained: "4" }));

    // Team BBB: 100 qualifying plays over 3 distinct weeks. 10 negative plays.
    // 10 / 100 = 0.1000
    for (let i = 0; i < 80; i++) plays.push(row({ posteam: "BBB", week: "1", yards_gained: "5" }));
    for (let i = 0; i < 10; i++) plays.push(row({ posteam: "BBB", week: "2", yards_gained: "-2" }));
    for (let i = 0; i < 10; i++) plays.push(row({ posteam: "BBB", week: "3", yards_gained: "5" }));

    // Additional AAA plays in week 4 to reach 100 total plays across distinct weeks for AAA
    for (let i = 0; i < 60; i++) plays.push(row({ posteam: "AAA", week: "4", yards_gained: "5" }));

    // AAA total now: 100 plays, 3 neg -> 0.03
    // BBB total now: 100 plays, 10 neg -> 0.10
    // League total: 200 plays, 13 neg -> 0.0650

    const results = negativePlayRateByTeam(plays, 5);

    const aaa = results.find(r => r.teamId === "AAA")!;
    expect(aaa.seasonToDate.qualifyingPlays).toBe(100);
    expect(aaa.seasonToDate.negativePlays).toBe(3);
    expect(aaa.seasonToDate.negativePlayRate).toBe(0.03); // 3 / 100
    expect(aaa.seasonToDate.leagueRate).toBe(0.065); // 13 / 200
    expect(aaa.seasonToDate.rateVsLeague).toBe(0.035); // 0.065 - 0.03

    const bbb = results.find(r => r.teamId === "BBB")!;
    expect(bbb.seasonToDate.qualifyingPlays).toBe(100);
    expect(bbb.seasonToDate.distinctWeeks).toBe(3);
    expect(bbb.seasonToDate.negativePlays).toBe(10);
    expect(bbb.seasonToDate.negativePlayRate).toBe(0.10);
  });

  it("handles exclusions correctly (qb_kneel, no_play, spikes, unratable)", () => {
    const plays: PbpRow[] = [
      // Qualifying, negative
      row({ yards_gained: "-1" }), // 1
      row({ play_type: "run", yards_gained: "-5" }), // 2

      // Qualifying, non-negative (spike / zero yard run)
      row({ yards_gained: "0" }), // 3
      row({ play_type: "run", yards_gained: "0" }), // 4

      // Excluded: qb_kneel
      row({ qb_kneel: "1", yards_gained: "-2", play_type: "run" }), // excluded from both

      // Excluded: no_play
      row({ play_type: "no_play", yards_gained: "-5" }), // excluded from both

      // Excluded: unratable yards_gained
      row({ yards_gained: "" }), // excluded from both
      row({ yards_gained: "NaN" }), // excluded from both

      // Excluded: wrong play type
      row({ play_type: "punt", yards_gained: "-2" }), // excluded from both
    ];

    // 4 qualifying plays above

    // Make sure we meet floors for AAA to get a rate
    // 96 plays will make it 96 + 4 = 100 qualifying plays
    for (let i = 0; i < 96; i++) plays.push(row({ week: String((i % 3) + 1), yards_gained: "5" }));

    const results = negativePlayRateByTeam(plays, 5);
    const aaa = results[0];

    // Qualifying plays: 96 + 4 = 100
    expect(aaa.seasonToDate.qualifyingPlays).toBe(100);
    // Negative plays: 2
    expect(aaa.seasonToDate.negativePlays).toBe(2);
    // Excluded rows: 2 (unratable yards_gained)
    expect(aaa.seasonToDate.excludedRows).toBe(2);
  });

  it("respects point-in-time discipline", () => {
    const plays: PbpRow[] = [];
    for (let i = 0; i < 100; i++) plays.push(row({ week: "1", yards_gained: "5" }));
    for (let i = 0; i < 100; i++) plays.push(row({ week: "2", yards_gained: "5" }));
    for (let i = 0; i < 100; i++) plays.push(row({ week: "3", yards_gained: "5" }));

    // Target week 3 means we only see week 1 and 2
    const results = negativePlayRateByTeam(plays, 3);
    const aaa = results[0];

    expect(aaa.seasonToDate.qualifyingPlays).toBe(200);
    expect(aaa.seasonToDate.distinctWeeks).toBe(2);
  });

  it("handles distinct weeks and bye weeks properly for windows", () => {
    const plays: PbpRow[] = [];
    // Week 1, 2, 4, 5, 6, 7, 8, 9, 10
    const weeks = [1, 2, 4, 5, 6, 7, 8, 9, 10];
    for (const w of weeks) {
      for (let i = 0; i < 20; i++) {
        plays.push(row({ week: String(w), yards_gained: w === 10 ? "-1" : "5" })); // neg in week 10
      }
    }

    const results = negativePlayRateByTeam(plays, 11);
    const aaa = results[0];

    // distinct weeks total = 9
    expect(aaa.seasonToDate.distinctWeeks).toBe(9);
    expect(aaa.seasonToDate.qualifyingPlays).toBe(180);
    expect(aaa.seasonToDate.negativePlays).toBe(20);

    // last 4: weeks 10, 9, 8, 7
    expect(aaa.last4.distinctWeeks).toBe(4);
    expect(aaa.last4.qualifyingPlays).toBe(80);
    expect(aaa.last4.negativePlays).toBe(20);

    // last 8: weeks 10, 9, 8, 7, 6, 5, 4, 2 (skips 3, skips 1)
    expect(aaa.last8.distinctWeeks).toBe(8);
    expect(aaa.last8.qualifyingPlays).toBe(160);
    expect(aaa.last8.negativePlays).toBe(20);
  });

  it("returns null rate when floors are not met", () => {
    const plays: PbpRow[] = [];
    // 2 weeks, 100 plays -> fails distinct weeks floor
    for (let i = 0; i < 50; i++) plays.push(row({ week: "1", yards_gained: "5" }));
    for (let i = 0; i < 50; i++) plays.push(row({ week: "2", yards_gained: "5" }));

    // 3 weeks, 99 plays -> fails qualifying plays floor
    for (let i = 0; i < 33; i++) plays.push(row({ posteam: "BBB", week: "1", yards_gained: "5" }));
    for (let i = 0; i < 33; i++) plays.push(row({ posteam: "BBB", week: "2", yards_gained: "5" }));
    for (let i = 0; i < 33; i++) plays.push(row({ posteam: "BBB", week: "3", yards_gained: "5" }));

    // BBB has another team so league rate has data
    const results = negativePlayRateByTeam(plays, 4);

    const aaa = results.find(r => r.teamId === "AAA")!;
    expect(aaa.seasonToDate.distinctWeeks).toBe(2);
    expect(aaa.seasonToDate.qualifyingPlays).toBe(100);
    expect(aaa.seasonToDate.negativePlayRate).toBeNull();
    expect(aaa.seasonToDate.rateVsLeague).toBeNull();
    // League rate still emitted
    expect(aaa.seasonToDate.leagueRate).toBe(0);

    const bbb = results.find(r => r.teamId === "BBB")!;
    expect(bbb.seasonToDate.distinctWeeks).toBe(3);
    expect(bbb.seasonToDate.qualifyingPlays).toBe(99);
    expect(bbb.seasonToDate.negativePlayRate).toBeNull();
    expect(bbb.seasonToDate.rateVsLeague).toBeNull();
  });
});
