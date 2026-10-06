import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PAGE_PATHS,
  SHARP_FOOTBALL_ATTRIBUTION,
  SHARP_FOOTBALL_BASE,
  SharpFootballClient,
  SharpFootballError,
  isSharpFootballIngestEnabled,
} from "../sharp-football-client.js";
import type { SharpFootballSourceId } from "../sharp-football-client.js";
import { assertIngestible, getSource, isIngestible } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const ENV = { SHARP_FOOTBALL_INGEST: "1" };

function tableHtml(headers: string[], rows: string[][]): string {
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  const head = `<thead><tr>${th}</tr></thead>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<html><head><title>Stats</title></head><body><h1>Through Week 2</h1><table>${head}<tbody>${body}</tbody></table></body></html>`;
}

function mockHtmlFetch(html: string, status = 200) {
  return vi
    .fn()
    .mockResolvedValue(new Response(html, { status, headers: { "Content-Type": "text/html" } }));
}

describe("Sharp Football registry", () => {
  it("declares all 7 pages as use-with-caution under the client base URL", () => {
    const ids = Object.keys(PAGE_PATHS) as SharpFootballSourceId[];
    expect(ids).toHaveLength(7);
    for (const id of ids) {
      expect(getSource(id)?.verdict).toBe("use-with-caution");
      expect(isIngestible(id)).toBe(true);
      expect(assertIngestible(id).baseUrl).toBe(SHARP_FOOTBALL_BASE);
    }
    expect(SHARP_FOOTBALL_ATTRIBUTION).toBe("Team stats via Sharp Football Analysis.");
  });

  it("maps the 7 registry ids to the verified page paths", () => {
    expect(PAGE_PATHS["sharp-football-pace"]).toBe("nfl-team-pace-stats");
    expect(PAGE_PATHS["sharp-football-offensive-tendencies"]).toBe("nfl-offensive-tendencies-stats");
    expect(PAGE_PATHS["sharp-football-personnel"]).toBe("nfl-offensive-personnel");
    expect(PAGE_PATHS["sharp-football-coverage"]).toBe("nfl-coverage-schemes");
    expect(PAGE_PATHS["sharp-football-offensive-line"]).toBe("nfl-offensive-line-stats");
    expect(PAGE_PATHS["sharp-football-defensive-line"]).toBe("nfl-defensive-line-stats");
    expect(PAGE_PATHS["sharp-football-offensive-efficiency"]).toBe("nfl-offensive-stats");
  });
});

describe("SharpFootballClient fail-closed", () => {
  it("is off by default and does not fetch", async () => {
    expect(isSharpFootballIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new SharpFootballClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getPage("sharp-football-pace")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws on HTTP failure and names the source", async () => {
    const fetchImpl = mockHtmlFetch("boom", 500);
    const client = new SharpFootballClient(ENV, fetchImpl as unknown as typeof fetch);
    await expect(client.getPage("sharp-football-coverage")).rejects.toThrow(SharpFootballError);
    await expect(client.getPage("sharp-football-coverage")).rejects.toThrow(/HTTP 500/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("SharpFootballClient page parsing", () => {
  const cases: Array<{
    id: SharpFootballSourceId;
    headers: string[];
    row: string[];
    team: string;
    metrics: Record<string, number | null>;
  }> = [
    {
      id: "sharp-football-pace",
      headers: ["Rank", "Offense", "Play Clock Used", "Neutral", "Plays/Game"],
      row: ["1", "NO", "29.11", "45.2", "65.3"],
      team: "NO",
      metrics: { rank: 1, play_clock_used: 29.11, neutral: 45.2, plays_game: 65.3 },
    },
    {
      id: "sharp-football-offensive-tendencies",
      headers: ["Team", "Motion Rate", "Play Action Rate"],
      row: ["Los Angeles Chargers", "76.5", "25.5"],
      team: "Los Angeles Chargers",
      metrics: { motion_rate: 76.5, play_action_rate: 25.5 },
    },
    {
      id: "sharp-football-personnel",
      headers: ["Offense", "11", "12"],
      row: ["ARI", "70%", "23%"],
      team: "ARI",
      metrics: { "11": 70, "12": 23 },
    },
    {
      id: "sharp-football-coverage",
      headers: ["Team", "Man Rate"],
      row: ["Indianapolis Colts", "46.9"],
      team: "Indianapolis Colts",
      metrics: { man_rate: 46.9 },
    },
    {
      id: "sharp-football-offensive-line",
      headers: ["Team", "Pressure Rate Allowed"],
      row: ["Cincinnati Bengals", "21.6"],
      team: "Cincinnati Bengals",
      metrics: { pressure_rate_allowed: 21.6 },
    },
    {
      id: "sharp-football-defensive-line",
      headers: ["Team", "Pressure Rate"],
      row: ["Minnesota Vikings", "54.3"],
      team: "Minnesota Vikings",
      metrics: { pressure_rate: 54.3 },
    },
    {
      id: "sharp-football-offensive-efficiency",
      headers: ["Team", "EPA/Play"],
      row: ["Chicago Bears", "0.35"],
      team: "Chicago Bears",
      metrics: { epa_play: 0.35 },
    },
  ];

  for (const c of cases) {
    it(`parses the ${c.id} fixture to the exact sample numbers`, async () => {
      const fetchImpl = mockHtmlFetch(tableHtml(c.headers, [c.row]));
      const client = new SharpFootballClient(ENV, fetchImpl as unknown as typeof fetch);
      const page = await client.getPage(c.id);
      expect(page?.sourceId).toBe(c.id);
      expect(page?.path).toBe(PAGE_PATHS[c.id]);
      expect(page?.seasonLabel).toBe("Through Week 2");
      expect(page?.rows).toHaveLength(1);
      expect(page?.rows[0]?.team).toBe(c.team);
      expect(page?.rows[0]?.metrics).toEqual(c.metrics);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const url = String(fetchImpl.mock.calls[0]?.[0]);
      expect(url).toBe(`${SHARP_FOOTBALL_BASE}/${PAGE_PATHS[c.id]}/`);
      const init = fetchImpl.mock.calls[0]?.[1] as { headers?: Record<string, string> };
      expect(init.headers?.["User-Agent"]).toBe("GSE-DataIngestion/1.0");
    });
  }

  it("strips % to a number and turns dashes/empties into null", async () => {
    const fetchImpl = mockHtmlFetch(
      tableHtml(
        ["Team", "Man Rate", "Zone Rate", "Blitz Rate"],
        [["Indianapolis Colts", "46.9%", "&mdash;", ""]],
      ),
    );
    const client = new SharpFootballClient(ENV, fetchImpl as unknown as typeof fetch);
    const page = await client.getPage("sharp-football-coverage");
    expect(page?.rows[0]?.metrics).toEqual({ man_rate: 46.9, zone_rate: null, blitz_rate: null });
  });

  it("returns rows: [] without throwing when the table is missing or has no team column", async () => {
    const client = new SharpFootballClient(ENV, mockHtmlFetch("<html><body><p>No stats yet</p></body></html>") as unknown as typeof fetch);
    const missing = await client.getPage("sharp-football-pace");
    expect(missing).not.toBeNull();
    expect(missing?.rows).toEqual([]);

    const wrongTable = new SharpFootballClient(
      ENV,
      mockHtmlFetch(tableHtml(["Rank", "Score"], [["1", "99"]])) as unknown as typeof fetch,
    );
    const noTeam = await wrongTable.getPage("sharp-football-pace");
    expect(noTeam).not.toBeNull();
    expect(noTeam?.rows).toEqual([]);
  });

  it("throws for an unregistered sourceId via the registry guard", async () => {
    const fetchImpl = vi.fn();
    const client = new SharpFootballClient(ENV, fetchImpl as unknown as typeof fetch);
    await expect(client.getPage("sharp-football-bogus" as SharpFootballSourceId)).rejects.toThrow(
      /Unknown data source/,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
