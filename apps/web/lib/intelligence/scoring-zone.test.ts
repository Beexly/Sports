import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: async () => null }));
import { buildScoringZone, loadScoringZone } from "./scoring-zone";

type Row = Record<string, string>;

/**
 * Minimal pbp column set the builder reads. Anything else is ignored.
 */
const COLS = [
  "season",
  "season_type",
  "week",
  "posteam",
  "yardline_100",
  "play_type",
  "rush_attempt",
  "pass_attempt",
  "rusher_player_id",
  "rusher_player_name",
  "receiver_player_id",
  "receiver_player_name",
  "rush_touchdown",
  "pass_touchdown",
  "td_player_id",
] as const;

function rush(over: Partial<Row>): Row {
  return {
    season: "2024",
    season_type: "REG",
    week: "1",
    posteam: "KC",
    yardline_100: "8",
    play_type: "run",
    rush_attempt: "1",
    pass_attempt: "0",
    rusher_player_id: "",
    rusher_player_name: "",
    receiver_player_id: "",
    receiver_player_name: "",
    rush_touchdown: "0",
    pass_touchdown: "0",
    td_player_id: "",
    ...over,
  };
}

function pass(over: Partial<Row>): Row {
  return rush({ play_type: "pass", rush_attempt: "0", pass_attempt: "1", ...over });
}

/** Serialize synthetic rows into the CSV text loadScoringZone parses. */
function csv(rows: readonly Row[]): string {
  const header = COLS.join(",");
  const body = rows.map((r) => COLS.map((c) => r[c] ?? "").join(","));
  return [header, ...body].join("\n");
}

describe("buildScoringZone", () => {
  it("filters to the red zone and computes opportunity share, inside-5, and TDs", () => {
    const rows: Row[] = [
      // KC bell-cow back: 10 RZ carries, 3 inside the 5, 1 TD.
      ...Array.from({ length: 7 }, (_, i) =>
        rush({ week: String(i + 1), yardline_100: "15", rusher_player_id: "rb_kc", rusher_player_name: "Bell Cow", rush_touchdown: i === 0 ? "1" : "0", td_player_id: i === 0 ? "rb_kc" : "" }),
      ),
      ...Array.from({ length: 3 }, (_, i) => rush({ week: String(i + 1), yardline_100: "3", rusher_player_id: "rb_kc", rusher_player_name: "Bell Cow" })),
      // KC backup back: 2 RZ carries (below MIN_OPPS on its own but counts toward team total).
      rush({ rusher_player_id: "rb_kc2", rusher_player_name: "Backup", yardline_100: "12" }),
      rush({ rusher_player_id: "rb_kc2", rusher_player_name: "Backup", yardline_100: "18" }),
      // A play OUTSIDE the red zone must be ignored entirely.
      rush({ rusher_player_id: "rb_kc", rusher_player_name: "Bell Cow", yardline_100: "45" }),
      // A sack / no-touch play (no rusher, no receiver) must drop out.
      pass({ receiver_player_id: "", play_type: "pass", pass_attempt: "1" }),
    ];

    const { rows: out, throughWeek } = buildScoringZone(rows, 2024);
    expect(throughWeek).toBe(7);

    const bell = out.find((r) => r.playerId === "rb_kc");
    expect(bell).toBeDefined();
    expect(bell!.rzCarries).toBe(10); // 7 @15 + 3 @3, the @45 is filtered out
    expect(bell!.rzTargets).toBe(0);
    expect(bell!.inside5).toBe(3); // the three @3
    expect(bell!.rzTds).toBe(1);
    expect(bell!.position).toBe("RB");
    // Team total = 10 (bell) + 2 (backup) = 12 → share = 10/12.
    expect(bell!.rzShare).toBeCloseTo(10 / 12, 3);

    // Backup is below MIN_OPPS so it never reaches the output board.
    expect(out.find((r) => r.playerId === "rb_kc2")).toBeUndefined();
  });

  it("flags high-share/low-TD as buy and low-share/high-TD as sell", () => {
    const rows: Row[] = [];
    // BUY: owns a huge share of the team's scoring-zone work but hasn't scored.
    for (let i = 0; i < 16; i++) {
      rows.push(rush({ posteam: "BUF", week: String((i % 4) + 1), yardline_100: "10", rusher_player_id: "buy_rb", rusher_player_name: "Volume Vic", rush_touchdown: "0" }));
    }
    // A second BUF back gets a sliver, so Vic's share is dominant but not 100%.
    for (let i = 0; i < 4; i++) {
      rows.push(rush({ posteam: "BUF", rusher_player_id: "buf_rb2", rusher_player_name: "Spell Sam", yardline_100: "9" }));
    }

    // SELL: small share on a different team, but every touch scored (TD-luck).
    for (let i = 0; i < 8; i++) {
      const scored = i < 5; // 5 TDs on 8 looks — unsustainably hot
      rows.push(
        rush({ posteam: "MIA", week: String((i % 4) + 1), yardline_100: "4", rusher_player_id: "sell_rb", rusher_player_name: "Lucky Luke", rush_touchdown: scored ? "1" : "0", td_player_id: scored ? "sell_rb" : "" }),
      );
    }
    // Pile on MIA team opportunities so Lucky Luke's SHARE is small.
    for (let i = 0; i < 24; i++) {
      rows.push(rush({ posteam: "MIA", rusher_player_id: "mia_rb2", rusher_player_name: "Workhorse Will", yardline_100: "11" }));
    }

    const { rows: out } = buildScoringZone(rows, 2024);
    const buy = out.find((r) => r.playerId === "buy_rb");
    const sell = out.find((r) => r.playerId === "sell_rb");

    expect(buy?.signal).toBe("buy");
    expect(sell?.signal).toBe("sell");

    // Regression pulls the hot scorer's expected rate BELOW his raw rate.
    expect(sell!.tdRate).toBeGreaterThan(sell!.expectedTdRate);
    // And lifts the cold high-volume back's expected rate ABOVE his raw (zero) rate.
    expect(buy!.expectedTdRate).toBeGreaterThan(buy!.tdRate);
  });

  it("attributes targets to the receiver and credits a receiving TD", () => {
    const rows: Row[] = [];
    for (let i = 0; i < 8; i++) {
      const scored = i === 0;
      rows.push(
        pass({ posteam: "SF", week: String((i % 4) + 1), yardline_100: "6", receiver_player_id: "te_sf", receiver_player_name: "Red Zone TE", pass_touchdown: scored ? "1" : "0", td_player_id: scored ? "te_sf" : "" }),
      );
    }
    const { rows: out } = buildScoringZone(rows, 2024);
    const te = out.find((r) => r.playerId === "te_sf");
    expect(te).toBeDefined();
    expect(te!.rzTargets).toBe(8);
    expect(te!.rzCarries).toBe(0);
    expect(te!.rzTds).toBe(1);
    expect(te!.position).toBe("WR/TE");
  });

  it("returns empty when no rows match the active season", () => {
    const rows = [rush({ season: "2019", rusher_player_id: "old", rusher_player_name: "Old Timer" })];
    expect(buildScoringZone(rows, 2024)).toEqual({ rows: [], throughWeek: null });
  });
});

describe("loadScoringZone", () => {
  afterEach(() => vi.unstubAllGlobals());

  function fixtureCsv(): string {
    const rows: Row[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(rush({ week: String((i % 4) + 1), yardline_100: "8", rusher_player_id: "rb_a", rusher_player_name: "Anchor Andy", rush_touchdown: i === 0 ? "1" : "0", td_player_id: i === 0 ? "rb_a" : "" }));
    }
    for (let i = 0; i < 6; i++) {
      rows.push(rush({ rusher_player_id: "rb_b", rusher_player_name: "Bench Ben", yardline_100: "12" }));
    }
    return csv(rows);
  }

  it("loads live scoring-zone rows from a mocked pbp fetch", async () => {
    const body = fixtureCsv();
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("play_by_play_2024.csv")) {
        return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
      }
      return new Response("missing", { status: 404 });
    });

    const sz = await loadScoringZone({ season: 2024, fetcher });
    expect(sz.status).toBe("live");
    expect(sz.season).toBe(2024);
    expect(sz.canPublishProjections).toBe(false);
    expect(sz.rows.length).toBeGreaterThan(0);
    expect(sz.rows[0]?.playerId).toBe("rb_a"); // biggest share leads
  });

  it("returns an honest source-error when pbp cannot load", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const sz = await loadScoringZone({ season: 2024, fetcher });
    expect(sz.status).toBe("source-error");
    expect(sz.rows).toHaveLength(0);
    expect(sz.error).not.toBeNull();
    expect(sz.canPublishProjections).toBe(false);
  });

  it("serves the scoring-zone API route", async () => {
    const body = fixtureCsv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("play_by_play")) {
          return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
        }
        return new Response("missing", { status: 404 });
      }),
    );
    vi.resetModules();
    const mod = await import("@/app/api/intelligence/scoring-zone/route");
    const response = (await mod.GET()) as Response;
    const json = (await response.json()) as { success: boolean; data: { status: string } };
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("live");
  });
});
