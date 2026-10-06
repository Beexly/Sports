/**
 * Fixture-backed tests for the C-395 nflverse release loader.
 *
 * One fixture per dataset, built from the LIVE release headers verified
 * 2026-09-15 (see ../loaders/nflverse-releases.ts header). Fixtures are
 * synthetic rows with the real column names — they are NOT the real player
 * data (except where a known public fact makes the assertion meaningful).
 *
 * Network is never touched: every load injects a fetcher that serves the
 * fixture and asserts the expected release URL. Persistence is exercised
 * against a temp directory so the repo's data/ tree is not written by tests.
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { nflverseUrl } from "@sports/data-ingestion";
import {
  RELEASE_COLUMN_REQUIREMENTS,
  RELEASE_SPECS,
  loadNflverseRelease,
  type NflverseReleaseDataset,
  type NgsVariant,
} from "../loaders/nflverse-releases.js";

// ── fixture helpers ─────────────────────────────────────────────────────────

function csv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  for (const row of rows) {
    if (row.length !== header.length) {
      throw new Error(`fixture row has ${row.length} fields, expected ${header.length}: ${row.join(",")}`);
    }
  }
  return [header.join(","), ...rows.map((r) => r.map(quoteIfNeeded).join(","))].join("\n");
}

function quoteIfNeeded(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function fixtureFetcher(expectedUrl: string, body: string): typeof fetch {
  return (async (input: string | URL | Request) => {
    const actual = String(input);
    // Accept the primary URL or its ghproxy failover twin — fetchWithFailover
    // walks the mirror list, and a hard equality assert on the primary alone
    // would make the mirror attempt look like a network failure.
    const allowed = new Set([expectedUrl, `https://ghproxy.net/${expectedUrl}`]);
    if (!allowed.has(actual)) {
      throw new Error(`unexpected fetch URL: ${actual} (expected ${expectedUrl})`);
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
      text: async () => body,
    } as unknown as Response;
  }) as typeof fetch;
}

function failingFetcher(message = "network down"): typeof fetch {
  return (async () => {
    throw new Error(message);
  }) as typeof fetch;
}

const tempDirs: string[] = [];

async function tempDataDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "verifier-nflverse-"));
  tempDirs.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── fixtures (live headers, synthetic rows) ─────────────────────────────────

/** Live header 2026-09-15: officials.csv */
const OFFICIALS_FIXTURE = csv(
  ["game_id", "game_key", "official_name", "position", "jersey_number", "official_id", "season", "season_type", "week"],
  [
    ["2024090500", "58110", "Carl Cheffers", "Referee", "51", "12", "2024", "REG", "1"],
    ["2024090500", "58110", "Brad Freeman", "Field Judge", "88", "25", "2024", "REG", "1"],
  ],
);

/** Live header 2026-09-15: draft_picks.csv (subset of the wide career columns). */
const DRAFT_PICKS_FIXTURE = csv(
  ["season", "round", "pick", "team", "gsis_id", "pfr_player_id", "pfr_player_name", "position", "college"],
  [
    ["2024", "1", "1", "CHI", "00-0039854", "WillCa00", "Caleb Williams", "QB", "USC"],
    ["2024", "1", "2", "WAS", "00-0039163", "DaniJa00", "Jayden Daniels", "QB", "LSU"],
  ],
);

/** Live header 2026-09-15: historical_contracts.csv.gz (decoded). */
const CONTRACTS_FIXTURE = csv(
  ["player", "position", "team", "is_active", "year_signed", "years", "value", "apy", "guaranteed", "otc_id", "draft_year", "draft_round", "draft_overall"],
  [
    ["Josh Allen", "QB", "Bills", "TRUE", "2021", "6", "258000000", "43000000", "150000000", "6892", "2018", "1", "7"],
    ["Patrick Mahomes", "QB", "Chiefs", "TRUE", "2020", "10", "450000000", "45000000", "141481805", "58501", "2017", "1", "10"],
  ],
);

/** Live header 2026-09-15: ftn_charting_<season>.csv (2022–2025 identical). */
const FTN_FIXTURE = csv(
  [
    "ftn_game_id",
    "nflverse_game_id",
    "season",
    "week",
    "ftn_play_id",
    "nflverse_play_id",
    "n_offense_backfield",
    "n_defense_box",
    "is_no_huddle",
    "is_motion",
    "is_play_action",
    "is_screen_pass",
    "is_rpo",
    "n_blitzers",
    "n_pass_rushers",
  ],
  [
    ["6587", "2024_10_CIN_BAL", "2024", "10", "1081232", "40", "0", "0", "FALSE", "FALSE", "FALSE", "FALSE", "FALSE", "0", "0"],
    ["6587", "2024_10_CIN_BAL", "2024", "10", "1081233", "57", "1", "7", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "0", "4"],
  ],
);

/** Live header 2026-09-15: roster_weekly_<season>.csv (join-critical subset). */
const WEEKLY_ROSTERS_FIXTURE = csv(
  ["season", "team", "position", "status", "full_name", "birth_date", "gsis_id", "week", "entry_year", "draft_club"],
  [
    ["2024", "NYJ", "QB", "ACT", "Aaron Rodgers", "1983-12-02", "00-0023459", "1", "2005", "GB"],
    ["2024", "GB", "QB", "ACT", "Jordan Love", "1998-11-02", "00-0036262", "1", "2020", "GB"],
  ],
);

/** Live header 2026-09-15: trades.csv */
const TRADES_FIXTURE = csv(
  ["trade_id", "season", "trade_date", "gave", "received", "pick_season", "pick_round", "pick_number", "conditional", "pfr_id", "pfr_name"],
  [
    ["701", "2002", "2002-03-04", "HOU", "WAS", "", "", "", "", "WuerDa00", "Danny Wuerffel"],
    ["9000", "2024", "2024-03-15", "NYJ", "GB", "2024", "1", "15", "FALSE", "RodgAa00", "Aaron Rodgers"],
  ],
);

/** Live header 2026-09-15: ngs_receiving.csv.gz (decoded). Includes week 0 rollup. */
const NGS_RECEIVING_FIXTURE = csv(
  [
    "season",
    "season_type",
    "week",
    "player_display_name",
    "player_position",
    "team_abbr",
    "avg_cushion",
    "avg_separation",
    "avg_intended_air_yards",
    "percent_share_of_intended_air_yards",
    "receptions",
    "targets",
    "avg_yac",
    "player_gsis_id",
  ],
  [
    // week 0 = full-season aggregate — must be filtered out in weekly mode
    ["2024", "REG", "0", "Tyreek Hill", "WR", "MIA", "7.1", "2.9", "9.5", "22.1", "110", "160", "5.2", "00-0033040"],
    ["2024", "REG", "1", "Tyreek Hill", "WR", "MIA", "6.8", "3.2", "10.1", "24.0", "7", "11", "4.8", "00-0033040"],
    ["2024", "REG", "2", "Tyreek Hill", "WR", "MIA", "7.0", "3.0", "9.8", "23.5", "6", "9", "5.0", "00-0033040"],
  ],
);

// ── shared: every dataset is registered and required-column complete ────────

const ALL_DATASETS: readonly NflverseReleaseDataset[] = [
  "nextgen_stats_weekly",
  "officials",
  "draft_picks",
  "contracts",
  "ftn_charting",
  "weekly_rosters",
  "trades",
];

const SEASONAL: ReadonlySet<NflverseReleaseDataset> = new Set(["ftn_charting", "weekly_rosters"]);

function urlFor(dataset: NflverseReleaseDataset, ngsVariant: NgsVariant = "receiving"): string {
  const spec = RELEASE_SPECS[dataset];
  // Build through the same catalog URL builder the loader uses, so the
  // fixture assertion cannot drift from nflverseUrl (catalog tag ≠ key).
  if (dataset === "nextgen_stats_weekly") {
    return nflverseUrl(spec.catalogKey, 0, ngsVariant);
  }
  if (spec.seasonal) {
    return nflverseUrl(spec.catalogKey, 2024);
  }
  return nflverseUrl(spec.catalogKey, 0);
}

function fixtureBodyFor(dataset: NflverseReleaseDataset): string {
  switch (dataset) {
    case "nextgen_stats_weekly":
      return NGS_RECEIVING_FIXTURE;
    case "officials":
      return OFFICIALS_FIXTURE;
    case "draft_picks":
      return DRAFT_PICKS_FIXTURE;
    case "contracts":
      return CONTRACTS_FIXTURE;
    case "ftn_charting":
      return FTN_FIXTURE;
    case "weekly_rosters":
      return WEEKLY_ROSTERS_FIXTURE;
    case "trades":
      return TRADES_FIXTURE;
    default:
      throw new Error(`no fixture for ${dataset}`);
  }
}

function loadOptions(dataset: NflverseReleaseDataset, dataDir?: string) {
  const base = {
    dataset,
    fetcher: fixtureFetcher(urlFor(dataset), fixtureBodyFor(dataset)),
    persist: dataDir !== undefined,
    ...(dataDir !== undefined ? { dataDir } : {}),
  } as const;
  return SEASONAL.has(dataset) ? { ...base, season: 2024 } : base;
}

// ── registry shape ──────────────────────────────────────────────────────────

describe("RELEASE_SPECS / RELEASE_COLUMN_REQUIREMENTS", () => {
  it("covers exactly the C-395 release set", () => {
    expect(Object.keys(RELEASE_SPECS).sort()).toEqual([...ALL_DATASETS].sort());
    expect(Object.keys(RELEASE_COLUMN_REQUIREMENTS).sort()).toEqual([...ALL_DATASETS].sort());
  });

  it("every dataset names at least one factor and a non-empty required column list", () => {
    for (const dataset of ALL_DATASETS) {
      const req = RELEASE_COLUMN_REQUIREMENTS[dataset];
      expect(req.factors.length, dataset).toBeGreaterThan(0);
      expect(req.columns.length, dataset).toBeGreaterThan(0);
      expect(RELEASE_SPECS[dataset].catalogKey.length).toBeGreaterThan(0);
    }
  });

  it("A14/A26 share ftn_charting; A27 uses officials; A28 uses draft_picks; A15 uses contracts; A1 uses rosters/trades", () => {
    expect(RELEASE_COLUMN_REQUIREMENTS.ftn_charting.factors).toContain("A14");
    expect(RELEASE_COLUMN_REQUIREMENTS.ftn_charting.factors).toContain("A26");
    expect(RELEASE_COLUMN_REQUIREMENTS.officials.factors).toContain("A27");
    expect(RELEASE_COLUMN_REQUIREMENTS.draft_picks.factors).toContain("A28");
    expect(RELEASE_COLUMN_REQUIREMENTS.contracts.factors).toContain("A15");
    expect(RELEASE_COLUMN_REQUIREMENTS.weekly_rosters.factors).toContain("A1");
    expect(RELEASE_COLUMN_REQUIREMENTS.trades.factors).toContain("A1");
  });
});

// ── per-dataset fixture-backed load ─────────────────────────────────────────

describe("loadNflverseRelease — fixture-backed per dataset", () => {
  for (const dataset of ALL_DATASETS) {
    it(`${dataset}: loads rows, asserts required columns, returns honest ok state`, async () => {
      const result = await loadNflverseRelease(loadOptions(dataset));
      expect(result.status, `${dataset}: ${result.status === "ok" ? "" : "error=" + ("error" in result ? result.error : result.reason)}`).toBe("ok");
      if (result.status !== "ok") return;

      expect(result.dataset).toBe(dataset);
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.records.length).toBe(result.rowCount);
      expect(result.url).toBe(urlFor(dataset));
      expect(result.attribution).toMatch(/nflverse/i);
      expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);

      const required = RELEASE_COLUMN_REQUIREMENTS[dataset].columns;
      for (const col of required) {
        expect(result.columns, `${dataset} header must contain ${col}`).toContain(col);
      }
      expect(result.requiredColumns).toEqual(expect.arrayContaining([...required]));
    });
  }

  it("nextgen_stats_weekly filters out week 0 full-season rollup rows", async () => {
    const weekly = await loadNflverseRelease(loadOptions("nextgen_stats_weekly"));
    expect(weekly.status).toBe("ok");
    if (weekly.status !== "ok") return;
    expect(weekly.rowCount).toBe(2); // fixture has 1 rollup + 2 weekly
    for (const row of weekly.records) {
      expect(Number(row["week"])).toBeGreaterThan(0);
    }

    const withRollup = await loadNflverseRelease({
      ...loadOptions("nextgen_stats_weekly"),
      weeklyOnly: false,
    });
    expect(withRollup.status).toBe("ok");
    if (withRollup.status !== "ok") return;
    expect(withRollup.rowCount).toBe(3);
  });

  it("ftn_charting asserts A14 motion/play-action flags and A26 box/blitz proxies (no man/zone column exists)", async () => {
    const result = await loadNflverseRelease(loadOptions("ftn_charting"));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    for (const col of ["is_motion", "is_play_action", "is_screen_pass", "is_rpo", "n_defense_box", "n_blitzers", "n_pass_rushers"]) {
      expect(result.columns).toContain(col);
    }
    // The public FTN release has no coverage-scheme column — A26 cannot read
    // man/zone from this asset. Assert the absence so a future addition is
    // noticed rather than silently ignored.
    expect(result.columns.some((c) => /man|zone|coverage/i.test(c))).toBe(false);
  });

  it("contracts asserts OTC fields (otc_id/apy) and does not invent gsis_id", async () => {
    const result = await loadNflverseRelease(loadOptions("contracts"));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.columns).toContain("otc_id");
    expect(result.columns).toContain("apy");
    expect(result.columns).toContain("guaranteed");
    expect(result.columns).not.toContain("gsis_id");
  });
});

// ── honest empty state + schema drift ───────────────────────────────────────

describe("loadNflverseRelease — honest empty state and fail-closed schema", () => {
  it("returns source-error (empty records) when every mirror fails", async () => {
    const result = await loadNflverseRelease({
      dataset: "trades",
      fetcher: failingFetcher("ECONNREFUSED"),
      persist: false,
    });
    expect(result.status).toBe("source-error");
    if (result.status !== "source-error") return;
    expect(result.records).toEqual([]);
    expect(result.error).toContain("ECONNREFUSED");
    expect(result.reason).toMatch(/honest empty state/i);
  });

  it("returns source-error when a required column is missing (schema drift, not a silent empty table)", async () => {
    const drifted = csv(["trade_id", "season"], [["1", "2024"]]); // no gave/received/pfr_*
    const result = await loadNflverseRelease({
      dataset: "trades",
      fetcher: fixtureFetcher(urlFor("trades"), drifted),
      persist: false,
    });
    expect(result.status).toBe("source-error");
    if (result.status !== "source-error") return;
    expect(result.records).toEqual([]);
    expect(result.error).toMatch(/missing-columns/);
    expect(result.reason).toMatch(/gave/);
  });

  it("returns empty (not ok, not invented rows) when the asset is header-only", async () => {
    const headerOnly = OFFICIALS_FIXTURE.split("\n")[0] ?? "";
    const result = await loadNflverseRelease({
      dataset: "officials",
      fetcher: fixtureFetcher(urlFor("officials"), headerOnly),
      persist: false,
    });
    expect(result.status).toBe("empty");
    if (result.status !== "empty") return;
    expect(result.records).toEqual([]);
    expect(result.reason).toMatch(/zero data rows/i);
  });

  it("refuses a seasonal load without a season (no silent default)", async () => {
    const result = await loadNflverseRelease({
      dataset: "ftn_charting",
      fetcher: fixtureFetcher(urlFor("ftn_charting"), FTN_FIXTURE),
      persist: false,
    });
    expect(result.status).toBe("source-error");
    if (result.status !== "source-error") return;
    expect(result.reason).toMatch(/season is required/i);
  });
});

// ── persist: files under verifier data dir + SHA-256 manifest ───────────────

describe("loadNflverseRelease — persistence + SHA-256 manifest", () => {
  it("writes the CSV under the data dir and upserts a manifest entry with the matching SHA-256", async () => {
    const dataDir = await tempDataDir();
    const result = await loadNflverseRelease(loadOptions("officials", dataDir));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.writtenPath).toBe(path.join(dataDir, "officials.csv"));
    const written = await readFile(result.writtenPath!, "utf8");
    expect(written).toBe(OFFICIALS_FIXTURE);

    const digest = createHash("sha256").update(OFFICIALS_FIXTURE, "utf8").digest("hex");
    expect(result.sha256).toBe(digest);

    const manifestRaw = await readFile(path.join(dataDir, "manifest.json"), "utf8");
    const manifest = JSON.parse(manifestRaw) as {
      attribution: string;
      entries: Array<{
        dataset: string;
        file: string;
        sha256: string;
        releaseTag: string;
        rowCount: number;
        url: string;
      }>;
    };
    expect(manifest.attribution).toMatch(/nflverse/i);
    expect(manifest.entries).toHaveLength(1);
    const entry = manifest.entries[0];
    expect(entry?.dataset).toBe("officials");
    expect(entry?.file).toBe("officials.csv");
    expect(entry?.sha256).toBe(digest);
    expect(entry?.releaseTag).toBe("officials");
    expect(entry?.rowCount).toBe(2);
    expect(entry?.url).toBe(urlFor("officials"));
  });

  it("replaces (not duplicates) the manifest entry for the same dataset+file on re-load", async () => {
    const dataDir = await tempDataDir();
    const first = await loadNflverseRelease(loadOptions("trades", dataDir));
    expect(first.status).toBe("ok");

    const bodyV2 = csv(
      ["trade_id", "season", "trade_date", "gave", "received", "pick_season", "pick_round", "pick_number", "conditional", "pfr_id", "pfr_name"],
      [["9001", "2025", "2025-03-01", "A", "B", "", "", "", "", "X", "Y"]],
    );
    const second = await loadNflverseRelease({
      ...loadOptions("trades", dataDir),
      fetcher: fixtureFetcher(urlFor("trades"), bodyV2),
    });
    expect(second.status).toBe("ok");

    const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as {
      entries: Array<{ file: string; sha256: string }>;
    };
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]?.sha256).toBe(
      createHash("sha256").update(bodyV2, "utf8").digest("hex"),
    );
  });

  it("does not write files when persist=false", async () => {
    const dataDir = await tempDataDir();
    const result = await loadNflverseRelease({
      ...loadOptions("draft_picks", dataDir),
      persist: false,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.writtenPath).toBeNull();
    await expect(readFile(path.join(dataDir, "manifest.json"), "utf8")).rejects.toThrow();
  });
});

// ── no database write surface ───────────────────────────────────────────────

describe("loader surface", () => {
  it("exports no db/prisma client and performs no network in the fixture path", async () => {
    // Smoke: seven loads + the empty/error cases above never touch the network
    // because every path injects a fetcher. If someone removes the injectable
    // default this file goes red on the first live DNS attempt.
    let calls = 0;
    const counting = (async (input: string | URL | Request) => {
      calls += 1;
      return fixtureFetcher(urlFor("trades"), TRADES_FIXTURE)(input);
    }) as typeof fetch;
    const result = await loadNflverseRelease({ dataset: "trades", fetcher: counting, persist: false });
    expect(result.status).toBe("ok");
    expect(calls).toBe(1);
  });
});
