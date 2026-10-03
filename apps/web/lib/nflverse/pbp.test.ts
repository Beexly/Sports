import { describe, expect, it, vi } from "vitest";
import { loadPbp } from "./pbp";
import { buildTeamEnvironment, TEAM_ENVIRONMENT_PBP_COLUMNS } from "@/lib/intelligence/team-environment";

type Row = Record<string, string>;

/**
 * A pbp-shaped fixture with the columns the team-environment reducer reads PLUS
 * noise columns (a fat `desc` with embedded commas, and `air_yards`) that the
 * projection must DROP. This mirrors the real asset's shape (lots of columns the
 * consumer ignores) so the test proves projection both keeps the right keys and
 * sheds the rest — the OOM fix's contract.
 */
const COLS = [
  "down",
  "wp",
  "qtr",
  "posteam",
  "defteam",
  "pass",
  "rush",
  "epa",
  "success",
  "pass_oe",
  "no_huddle",
  // noise the projection must drop:
  "desc",
  "air_yards",
] as const;

function play(over: Partial<Row>): Row {
  return {
    down: "1",
    wp: "0.50",
    qtr: "1",
    posteam: "TMA",
    defteam: "TMB",
    pass: "1",
    rush: "0",
    epa: "0.2",
    success: "1",
    pass_oe: "10",
    no_huddle: "0",
    desc: "(12:00) deep pass, complete to the 30",
    air_yards: "18",
    ...over,
  };
}

function csv(rows: readonly Row[]): string {
  const header = COLS.join(",");
  const body = rows.map((r) =>
    COLS.map((c) => {
      const v = r[c] ?? "";
      // Quote the desc column (it has commas) so the parse must stay quote-aware.
      return c === "desc" ? `"${v}"` : v;
    }).join(","),
  );
  return [header, ...body].join("\n");
}

function fetcherFor(body: string) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("play_by_play_2024.csv")) {
      return new Response(body, { status: 200, headers: { "content-length": String(Buffer.byteLength(body)) } });
    }
    return new Response("missing", { status: 404 });
  });
}

describe("loadPbp column projection", () => {
  it("keeps only allowlisted columns on each record and drops the rest", async () => {
    const body = csv([play({}), play({ posteam: "TMB", defteam: "TMA", epa: "-0.1" })]);
    let seen: ReadonlyArray<Readonly<Record<string, string>>> = [];

    const result = await loadPbp({
      season: 2024,
      fetcher: fetcherFor(body) as unknown as typeof fetch,
      columns: ["posteam", "defteam", "epa"],
      onRecords: (records) => {
        seen = records;
        return records.length;
      },
    });

    expect(result.status).toBe("live");
    expect(result.season).toBe(2024);
    expect(result.sourceRows).toBe(2);

    // Every record carries exactly the allowlist — the fat `desc`/`air_yards`
    // (and every other unkept column) are gone, which is what frees the heap.
    for (const r of seen) {
      expect(Object.keys(r).sort()).toEqual(["defteam", "epa", "posteam"]);
      expect("desc" in r).toBe(false);
      expect("air_yards" in r).toBe(false);
    }
    expect(seen[0]).toEqual({ posteam: "TMA", defteam: "TMB", epa: "0.2" });
  });

  it("a builder produces correct rows from a projected parse (team-environment)", async () => {
    // Enough neutral-script early-down plays for each team to clear minPlays=2.
    const rows: Row[] = [
      play({ posteam: "TMA", defteam: "TMB", down: "1", qtr: "1", epa: "0.5", success: "1", pass_oe: "10" }),
      play({ posteam: "TMA", defteam: "TMB", down: "2", qtr: "2", epa: "0.3", success: "1", pass_oe: "20" }),
      play({ posteam: "TMA", defteam: "TMB", down: "1", qtr: "3", epa: "-0.1", success: "0", pass_oe: "30", pass: "0", rush: "1" }),
      play({ posteam: "TMB", defteam: "TMA", down: "1", qtr: "1", epa: "-0.2", success: "0", pass_oe: "5" }),
      play({ posteam: "TMB", defteam: "TMA", down: "2", qtr: "2", epa: "0.1", success: "1", pass_oe: "15", pass: "0", rush: "1" }),
    ];
    const body = csv(rows);

    const result = await loadPbp({
      season: 2024,
      fetcher: fetcherFor(body) as unknown as typeof fetch,
      columns: TEAM_ENVIRONMENT_PBP_COLUMNS,
      onRecords: (records) => buildTeamEnvironment(records, 2),
    });

    expect(result.status).toBe("live");
    const out = result.value!;
    const tma = out.find((r) => r.team === "TMA");
    expect(tma).toBeDefined();
    // Same result the builder gives on a full-column fixture: 3 neutral off plays,
    // PROE = mean(10,20,30) = 20, offEpa = (0.5+0.3-0.1)/3 = 0.233.
    expect(tma!.offPlays).toBe(3);
    expect(tma!.proe).toBe(20);
    expect(tma!.offEpaPerPlay).toBe(0.233);
  });

  it("returns an honest source-error when pbp cannot load", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const result = await loadPbp({
      season: 2024,
      fetcher: fetcher as unknown as typeof fetch,
      columns: ["posteam"],
      onRecords: (records) => records.length,
    });
    expect(result.status).toBe("source-error");
    expect(result.value).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
