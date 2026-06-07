import { describe, it, expect } from "vitest";
import { buildRouteRate, loadRouteRate } from "./route-rate";

type Row = Record<string, string>;

// --- player_stats_week rows (targets + team dropbacks via QB attempts/sacks) ---
function stat(o: Partial<Row>): Row {
  return {
    season: "2025", season_type: "REG", week: "1",
    player_display_name: "X", recent_team: "KC", position: "WR",
    targets: "0", attempts: "0", sacks: "0",
    ...o,
  };
}

// --- snap_counts rows (offense_pct per player-game) ---
function snap(o: Partial<Row>): Row {
  return {
    game_type: "REG", week: "1", player: "X", team: "KC", position: "WR",
    offense_pct: "0.8",
    ...o,
  };
}

// Two teams. Each team's QB throws to set dropbacks. 2 weeks.
// Team KC: QB 40 att + 0 sacks => 40 dropbacks/week, 80 over 2 weeks.
// Team SF: QB 50 att + 0 sacks => 50 dropbacks/week, 100 over 2 weeks.
const STATS: Row[] = [
  // KC QB dropbacks
  stat({ player_display_name: "KC QB", position: "QB", recent_team: "KC", week: "1", attempts: "40", targets: "0" }),
  stat({ player_display_name: "KC QB", position: "QB", recent_team: "KC", week: "2", attempts: "40", targets: "0" }),
  // SF QB dropbacks (45 att + 5 sacks = 50)
  stat({ player_display_name: "SF QB", position: "QB", recent_team: "SF", week: "1", attempts: "45", sacks: "5", targets: "0" }),
  stat({ player_display_name: "SF QB", position: "QB", recent_team: "SF", week: "2", attempts: "45", sacks: "5", targets: "0" }),

  // BREAKOUT WR — KC, low route share (0.5 -> 40 routes), lots of targets (efficient).
  stat({ player_display_name: "Breakout Bo", position: "WR", recent_team: "KC", week: "1", targets: "12" }),
  stat({ player_display_name: "Breakout Bo", position: "WR", recent_team: "KC", week: "2", targets: "12" }),
  // FADE WR — SF, high route share (1.0 -> 100 routes), few targets (empty volume).
  stat({ player_display_name: "Fade Fred", position: "WR", recent_team: "SF", week: "1", targets: "3" }),
  stat({ player_display_name: "Fade Fred", position: "WR", recent_team: "SF", week: "2", targets: "3" }),
  // STEADY WR — KC, mid route share, mid targets.
  stat({ player_display_name: "Steady Sid", position: "WR", recent_team: "KC", week: "1", targets: "8" }),
  stat({ player_display_name: "Steady Sid", position: "WR", recent_team: "KC", week: "2", targets: "8" }),
  // SUB-THRESHOLD WR — one week, tiny share -> below MIN_ROUTES, excluded.
  stat({ player_display_name: "Tiny Tom", position: "WR", recent_team: "KC", week: "1", targets: "2" }),
];

const SNAPS: Row[] = [
  // Breakout Bo: 0.5 snap-share each week × 40 KC dropbacks = 20 + 20 = 40 routes.
  snap({ player: "Breakout Bo", team: "KC", week: "1", offense_pct: "0.5" }),
  snap({ player: "Breakout Bo", team: "KC", week: "2", offense_pct: "0.5" }),
  // Fade Fred: 1.0 × 50 SF dropbacks = 50 + 50 = 100 routes.
  snap({ player: "Fade Fred", team: "SF", week: "1", offense_pct: "1.0" }),
  snap({ player: "Fade Fred", team: "SF", week: "2", offense_pct: "1.0" }),
  // Steady Sid: ~0.9 × 40 = 36 + 36 = 72 routes.
  snap({ player: "Steady Sid", team: "KC", week: "1", offense_pct: "0.9" }),
  snap({ player: "Steady Sid", team: "KC", week: "2", offense_pct: "0.9" }),
  // Tiny Tom: one week 0.3 × 40 = 12 routes -> below MIN_ROUTES (40), excluded.
  snap({ player: "Tiny Tom", team: "KC", week: "1", offense_pct: "0.3" }),
  // A POST game that must be excluded entirely.
  snap({ player: "Breakout Bo", team: "KC", week: "19", offense_pct: "1.0", game_type: "POST" }),
];

describe("buildRouteRate", () => {
  const { rows, throughWeek } = buildRouteRate(SNAPS, STATS, 2025);
  const by = (n: string) => rows.find((r) => r.name === n);

  it("approximates routes as snap-share × team dropbacks and reports the week", () => {
    expect(throughWeek).toBe(2);
    expect(by("Breakout Bo")!.routes).toBe(40); // 0.5*40 + 0.5*40
    expect(by("Fade Fred")!.routes).toBe(100); // 1.0*50 + 1.0*50 (sacks counted in dropbacks)
    expect(by("Steady Sid")!.routes).toBe(72); // 0.9*40 + 0.9*40
  });

  it("joins targets across the two sources by normalized name + team", () => {
    expect(by("Breakout Bo")!.targets).toBe(24);
    expect(by("Fade Fred")!.targets).toBe(6);
  });

  it("computes TPRR = targets / approxRoutes", () => {
    expect(by("Breakout Bo")!.tprr).toBe(0.6); // 24 / 40
    expect(by("Fade Fred")!.tprr).toBe(0.06); // 6 / 100
  });

  it("drops players below the minimum approximate-route base", () => {
    expect(by("Tiny Tom")).toBeUndefined();
    expect(rows.map((r) => r.name).sort()).toEqual(["Breakout Bo", "Fade Fred", "Steady Sid"]);
  });

  it("flags high TPRR on low routes as a breakout/buy", () => {
    expect(by("Breakout Bo")!.signal).toBe("breakout");
  });

  it("flags empty volume (low TPRR, high routes) as a fade", () => {
    expect(by("Fade Fred")!.signal).toBe("fade");
  });

  it("labels every row a proxy in the note", () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => /PROXY/i.test(r.note))).toBe(true);
  });

  it("sorts by TPRR descending", () => {
    expect(rows[0]!.name).toBe("Breakout Bo");
  });

  it("handles a zero-dropback denominator without inventing routes", () => {
    // QB with no attempts/sacks -> team has no dropbacks that week -> player's routes that week are 0.
    const zeroStats: Row[] = [
      stat({ player_display_name: "Q", position: "QB", recent_team: "KC", week: "1", attempts: "0", sacks: "0" }),
      stat({ player_display_name: "W", position: "WR", recent_team: "KC", week: "1", targets: "5" }),
    ];
    const zeroSnaps: Row[] = [snap({ player: "W", team: "KC", week: "1", offense_pct: "1.0" })];
    const { rows: zr } = buildRouteRate(zeroSnaps, zeroStats, 2025);
    expect(zr).toEqual([]); // no dropbacks -> no approximated routes -> nothing qualifies, no NaN/Infinity
  });

  it("ignores POST-season snap games", () => {
    // Breakout Bo had a POST week with 1.0 share that would inflate routes if counted.
    expect(by("Breakout Bo")!.routes).toBe(40);
  });
});

describe("loadRouteRate", () => {
  it("degrades to source-error when nflverse is unreachable", async () => {
    const r = await loadRouteRate({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.canPublishProjections).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
