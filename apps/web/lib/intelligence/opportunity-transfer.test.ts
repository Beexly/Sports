import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOpportunityTransfer,
  buildUsageRates,
  loadOpportunityTransfer,
  type OpportunityTransferRow,
} from "@/lib/intelligence/opportunity-transfer";
import { buildDepthCharts, type DepthChartRow } from "@/lib/nflverse/depth-charts";
import type { InjuryRow } from "@/lib/nflverse/injury-report";

// ---- tiny synthetic fixtures (offline; no network) -------------------------

const injury = (over: Partial<InjuryRow>): InjuryRow => ({
  playerId: "",
  playerName: "Star Starter",
  team: "KC",
  position: "WR",
  reportStatus: "Out",
  reportStatusRaw: "Out",
  primaryInjury: "Knee",
  practiceStatus: "Did Not Participate",
  ...over,
});

const depthRow = (over: Partial<DepthChartRow>): DepthChartRow => ({
  playerId: "",
  playerName: "Backup Bob",
  team: "KC",
  position: "WR",
  depthOrder: 2,
  week: 10,
  ...over,
});

// player_stats_week-shaped usage fixture for the pure usage-rate builder.
const STATS_HEADER = "season,season_type,week,player_display_name,targets,carries";
const STATS_ROWS = [
  STATS_HEADER,
  // Star Starter: heavy WR usage (8 targets/game over 2 weeks)
  "2024,REG,9,Star Starter,9,0",
  "2024,REG,10,Star Starter,7,0",
  // Workhorse Rb: real carries (15/game)
  "2024,REG,9,Workhorse Rb,2,16",
  "2024,REG,10,Workhorse Rb,4,14",
  // Ghost Player: no recent usage
  "2024,REG,10,Ghost Player,0,0",
  // a prior season row that must be ignored
  "2023,REG,1,Star Starter,20,0",
].join("\n");

function rowFor(rows: readonly OpportunityTransferRow[], name: string): OpportunityTransferRow | undefined {
  return rows.find((r) => r.outPlayer === name);
}

describe("opportunity-transfer builder", () => {
  it("quantifies vacated targets+carries and names the next man up", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    const depth: DepthChartRow[] = [
      depthRow({ playerName: "Star Starter", depthOrder: 1 }),
      depthRow({ playerName: "Backup Bob", depthOrder: 2 }),
    ];
    const rows = buildOpportunityTransfer([injury({})], depth, usage);

    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.outPlayer).toBe("Star Starter");
    expect(r.team).toBe("KC");
    expect(r.position).toBe("WR");
    expect(r.vacatedTargets).toBe(8); // (9+7)/2
    expect(r.vacatedCarries).toBe(0);
    expect(r.beneficiary).toBe("Backup Bob"); // next man up, not the OUT player
    expect(r.confidence).toBe("high"); // 8 vacated ≥ threshold
    expect(r.note).toContain("Backup Bob");
  });

  it("returns no transfer rows when there are no injuries (no fabrication)", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    expect(buildOpportunityTransfer([], [depthRow({})], usage)).toEqual([]);
  });

  it("ignores non-OUT and non-skill-position injuries", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    const depth = [depthRow({ playerName: "Backup Bob" })];
    const rows = buildOpportunityTransfer(
      [
        injury({ playerName: "Questionable Quinn", reportStatus: "Questionable" }),
        injury({ playerName: "Out Olineman", position: "OT" }),
        injury({ playerName: "Out Quarterback", position: "QB" }),
      ],
      depth,
      usage,
    );
    expect(rows).toEqual([]);
  });

  it("downgrades confidence when the OUT player has negligible recent usage", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    const depth = [
      depthRow({ playerName: "Ghost Player", depthOrder: 1 }),
      depthRow({ playerName: "Backup Bob", depthOrder: 2 }),
    ];
    const rows = buildOpportunityTransfer([injury({ playerName: "Ghost Player" })], depth, usage);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.vacatedTargets).toBe(0);
    expect(rows[0]!.confidence).toBe("low");
    expect(rows[0]!.note).toContain("negligible");
  });

  it("flags an open role with medium confidence when no backup is listed", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    // Depth chart only lists the OUT player himself — no next man up.
    const depth = [depthRow({ playerName: "Workhorse Rb", position: "RB", depthOrder: 1 })];
    const rows = buildOpportunityTransfer(
      [injury({ playerName: "Workhorse Rb", position: "RB" })],
      depth,
      usage,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.beneficiary).toBeNull();
    expect(rows[0]!.vacatedCarries).toBe(15); // (16+14)/2
    expect(rows[0]!.confidence).toBe("medium");
    expect(rows[0]!.note).toContain("no same-position backup");
  });

  it("ranks the largest vacated opportunity first", () => {
    const usage = buildUsageRates(parseStats(STATS_ROWS), 2024);
    const depth = [
      depthRow({ playerName: "Star Starter", depthOrder: 1 }),
      depthRow({ playerName: "Backup Bob", depthOrder: 2 }),
      depthRow({ playerName: "Workhorse Rb", position: "RB", depthOrder: 1 }),
      depthRow({ playerName: "Rb Reserve", position: "RB", depthOrder: 2 }),
    ];
    const rows = buildOpportunityTransfer(
      [injury({}), injury({ playerName: "Workhorse Rb", position: "RB" })],
      depth,
      usage,
    );
    // Workhorse Rb vacates 19 (4 tgt + 15 car); Star Starter vacates 8 → Rb first.
    expect(rows.map((r) => r.outPlayer)).toEqual(["Workhorse Rb", "Star Starter"]);
    expect(rowFor(rows, "Workhorse Rb")!.beneficiary).toBe("Rb Reserve");
  });
});

describe("depth-charts builder (defensive across schemas)", () => {
  it("parses the legacy schema (full_name / depth_team / club_code / game_type)", () => {
    const csv = [
      "season,game_type,club_code,week,gsis_id,position,depth_position,depth_team,full_name",
      "2024,REG,KC,10,00-1,WR,LWR,1,Star Starter",
      "2024,REG,KC,10,00-2,WR,RWR,2,Backup Bob",
      // earlier week dropped by latest-week scoping
      "2024,REG,KC,9,00-1,WR,LWR,1,Star Starter",
      // POST dropped by season-type filter
      "2024,POST,KC,20,00-3,WR,LWR,1,Playoff Pat",
    ].join("\n");
    const { rows, week } = buildDepthCharts(parseRecords(csv));
    expect(week).toBe(10);
    expect(rows).toHaveLength(2);
    const starter = rows.find((r) => r.playerName === "Star Starter")!;
    expect(starter.depthOrder).toBe(1);
    expect(starter.team).toBe("KC");
    expect(starter.position).toBe("WR");
  });

  it("parses the 2025+ schema (player_name / pos_abb / pos_rank / team)", () => {
    const csv = [
      "team,player_name,pos_abb,pos_rank,gsis_id",
      "KC,Star Starter,WR,1,00-1",
      "KC,Backup Bob,WR,2,00-2",
    ].join("\n");
    const { rows } = buildDepthCharts(parseRecords(csv));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.playerName === "Backup Bob")!.depthOrder).toBe(2);
  });

  it("drops rows missing a name, position, team, or depth order (never invents)", () => {
    const csv = [
      "season,game_type,club_code,week,position,depth_team,full_name",
      "2024,REG,KC,10,WR,1,Has Everything",
      "2024,REG,KC,10,WR,,No Order Ned", // no depth order → dropped
      "2024,REG,,10,WR,1,No Team Tim", // no team → dropped
    ].join("\n");
    const { rows } = buildDepthCharts(parseRecords(csv));
    expect(rows.map((r) => r.playerName)).toEqual(["Has Everything"]);
  });
});

describe("opportunity-transfer loader (honest boundaries)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("surfaces a source-error empty state when injuries cannot load", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const data = await loadOpportunityTransfer({ season: 2024, fetcher });
    expect(data.status).toBe("source-error");
    expect(data.rows).toHaveLength(0);
    expect(data.canPublishProjections).toBe(false);
    expect(data.error).not.toBeNull();
  });

  it("produces live transfer rows from end-to-end mocked sources", async () => {
    const injuriesCsv = [
      "season,game_type,team,week,gsis_id,position,full_name,first_name,last_name,report_primary_injury,report_secondary_injury,report_status,practice_primary_injury,practice_secondary_injury,practice_status,date_modified",
      "2024,REG,KC,10,00-1,WR,Star Starter,Star,Starter,Knee,,Out,Knee,,Did Not Participate,2024",
    ].join("\n");
    const depthCsv = [
      "season,game_type,club_code,week,gsis_id,position,depth_team,full_name",
      "2024,REG,KC,10,00-1,WR,1,Star Starter",
      "2024,REG,KC,10,00-2,WR,2,Backup Bob",
    ].join("\n");

    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("injuries_2024.csv")) return new Response(injuriesCsv, { status: 200 });
      if (url.includes("depth_charts_2024.csv")) return new Response(depthCsv, { status: 200 });
      if (url.includes("player_stats.csv")) return new Response(STATS_ROWS, { status: 200 });
      return new Response("missing", { status: 404 });
    });

    const data = await loadOpportunityTransfer({ season: 2024, fetcher });
    expect(data.status).toBe("live");
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]!.outPlayer).toBe("Star Starter");
    expect(data.rows[0]!.beneficiary).toBe("Backup Bob");
    expect(data.rows[0]!.vacatedTargets).toBe(8);
  });
});

// ---- helpers ---------------------------------------------------------------

/** Minimal CSV → records parser for the offline fixtures (header + comma split). */
function parseRecords(csv: string): Readonly<Record<string, string>>[] {
  const lines = csv.split("\n").filter((l) => l.trim() !== "");
  const header = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = cells[i] ?? ""));
    return rec;
  });
}

function parseStats(csv: string): Readonly<Record<string, string>>[] {
  return parseRecords(csv);
}
