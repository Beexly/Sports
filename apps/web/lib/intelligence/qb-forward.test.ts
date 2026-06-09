import { describe, expect, it } from "vitest";
import { adjustedNetYardsPerAttempt, buildQbForward } from "./qb-forward";

type Row = Record<string, string>;

/**
 * One synthetic weekly QB row. Defaults are a clean, qualifying line; override any
 * box column per test. Kept tiny so the pure builder runs fully offline.
 */
function qbWeek(over: Partial<Row> = {}): Row {
  return {
    season: "2024",
    season_type: "REG",
    week: "1",
    position: "QB",
    player_id: "00-0000001",
    player_display_name: "Test QB",
    recent_team: "TST",
    attempts: "30",
    sacks: "2",
    passing_yards: "250",
    passing_tds: "2",
    interceptions: "1",
    sack_yards: "12",
    dakota: "0.10",
    ...over,
  };
}

describe("adjustedNetYardsPerAttempt", () => {
  it("matches a hand-computed ANY/A on a known stat line", () => {
    // (4000 + 20*30 - 45*10 - 200) / (550 + 30) = 3950 / 580 = 6.8103...
    const anyA = adjustedNetYardsPerAttempt({
      passingYards: 4000,
      passingTds: 30,
      interceptions: 10,
      sackYards: 200,
      attempts: 550,
      sacks: 30,
    });
    expect(anyA).not.toBeNull();
    expect(anyA!).toBeCloseTo(3950 / 580, 6);
    expect(Math.round(anyA! * 100) / 100).toBe(6.81);
  });

  it("penalizes interceptions heavily (the -45 term) vs a clean line", () => {
    const clean = adjustedNetYardsPerAttempt({ passingYards: 300, passingTds: 3, interceptions: 0, sackYards: 0, attempts: 30, sacks: 0 })!;
    const picks = adjustedNetYardsPerAttempt({ passingYards: 300, passingTds: 3, interceptions: 3, sackYards: 0, attempts: 30, sacks: 0 })!;
    // 3 INTs cost 45*3 = 135 yards over 30 dropbacks = 4.5 ANY/A.
    expect(clean - picks).toBeCloseTo(4.5, 6);
  });

  it("returns null when there are no dropbacks (no fabricated value)", () => {
    expect(
      adjustedNetYardsPerAttempt({ passingYards: 0, passingTds: 0, interceptions: 0, sackYards: 0, attempts: 0, sacks: 0 }),
    ).toBeNull();
  });
});

describe("buildQbForward", () => {
  it("aggregates weekly rows and computes ANY/A from the season totals", () => {
    // Three identical weeks (to clear the 80-attempt floor) → season:
    //   yards 750, td 6, int 3, sackYds 36, att 90, sacks 6.
    // ANY/A = (750 + 120 - 135 - 36) / 96 = 699 / 96 = 7.28125 → 7.28
    const records = [qbWeek({ week: "1" }), qbWeek({ week: "2" }), qbWeek({ week: "3" })];
    const { rows, throughWeek } = buildQbForward(records, 2024);
    expect(rows).toHaveLength(1);
    expect(throughWeek).toBe(3);
    const r = rows[0]!;
    expect(r.attempts).toBe(90);
    expect(r.games).toBe(3);
    expect(r.anyA).toBe(7.28);
    expect(r.dakota).toBeCloseTo(0.1, 6); // mean of three 0.10 weeks
  });

  it("drops QBs under the attempts floor and those with no dakota weeks", () => {
    const records = [
      // Qualifies: high volume across many weeks, has dakota.
      ...Array.from({ length: 4 }, (_, i) =>
        qbWeek({ week: String(i + 1), player_id: "00-QUALIFY", player_display_name: "Qualifier", attempts: "30" }),
      ),
      // Below the attempts floor → drops out.
      qbWeek({ player_id: "00-LOWVOL", player_display_name: "Low Volume", attempts: "20" }),
      // Enough volume but never a dakota value → drops out (agreement would be dishonest).
      ...Array.from({ length: 4 }, (_, i) =>
        qbWeek({ week: String(i + 1), player_id: "00-NODAK", player_display_name: "No Dakota", attempts: "30", dakota: "" }),
      ),
    ];
    const { rows } = buildQbForward(records, 2024);
    expect(rows.map((r) => r.playerId)).toEqual(["00-QUALIFY"]);
  });

  it("surfaces agreement: priors that point the same way agree; a divergent QB does not", () => {
    // A realistic-size pool. Eight "filler" QBs occupy the middle so that the two
    // engineered anchors (ELITE, WEAK) land at the same extreme on BOTH lenses
    // (high agreement), while the SPLIT QB is a deliberate disagreement: top tier
    // by DAKOTA but bottom tier by ANY/A (turnover-wrecked), so its agreement drops.
    const weeks = (id: string, name: string, over: Partial<Row>): Row[] =>
      Array.from({ length: 4 }, (_, i) => qbWeek({ week: String(i + 1), player_id: id, player_display_name: name, ...over }));

    // Filler QBs: dakota and ANY/A both scale together (clean lines), spread across
    // the middle so percentile ranks are fine-grained, not the coarse 3-QB case.
    const filler: Row[] = [];
    for (let k = 0; k < 8; k++) {
      const dak = (0.0 + k * 0.02).toFixed(2); // 0.00 .. 0.14
      const yards = String(200 + k * 8); // efficiency rises with dakota → aligned
      filler.push(...weeks(`00-FILL${k}`, `Filler ${k}`, { dakota: dak, passing_yards: yards, passing_tds: "1", interceptions: "1", sack_yards: "10" }));
    }

    const records = [
      ...filler,
      // Best on both lenses (highest dakota, cleanest efficient line).
      ...weeks("00-ELITE", "Elite Both", { dakota: "0.40", passing_yards: "320", passing_tds: "3", interceptions: "0", sack_yards: "4" }),
      // Worst on both lenses (lowest dakota, turnover/sack-wrecked line).
      ...weeks("00-WEAK", "Weak Both", { dakota: "-0.20", passing_yards: "150", passing_tds: "0", interceptions: "3", sack_yards: "30" }),
      // Divergent: top dakota tier, but bottom ANY/A (interception-driven).
      ...weeks("00-SPLIT", "The Split", { dakota: "0.38", passing_yards: "170", passing_tds: "1", interceptions: "3", sack_yards: "28" }),
    ];

    const { rows } = buildQbForward(records, 2024);
    const byId = Object.fromEntries(rows.map((r) => [r.playerId, r]));

    // The aligned anchors agree strongly; the split QB clearly disagrees.
    expect(byId["00-ELITE"]!.agreement).toBeGreaterThanOrEqual(0.8);
    expect(byId["00-WEAK"]!.agreement).toBeGreaterThanOrEqual(0.8);
    expect(byId["00-SPLIT"]!.agreement).toBeLessThan(0.8);

    // The split QB ranks high by dakota but low by ANY/A within this pool.
    expect(byId["00-SPLIT"]!.dakotaPct).toBeGreaterThan(byId["00-SPLIT"]!.anyaPct);

    // Its note is the "second look" message, not the agreement message.
    expect(byId["00-SPLIT"]!.note).toMatch(/second look/i);
    expect(byId["00-ELITE"]!.note).toMatch(/same tier|higher.?confidence/i);

    // forwardGrade is the mean of the two percentiles, rounded.
    expect(byId["00-ELITE"]!.forwardGrade).toBe(
      Math.round((byId["00-ELITE"]!.dakotaPct + byId["00-ELITE"]!.anyaPct) / 2),
    );
  });

  it("returns empty when no rows match the active season (no fabrication)", () => {
    const { rows, throughWeek } = buildQbForward([qbWeek({ season: "2023" })], 2024);
    expect(rows).toEqual([]);
    expect(throughWeek).toBeNull();
  });
});
