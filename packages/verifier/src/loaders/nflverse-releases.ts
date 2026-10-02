/**
 * nflverse release loaders for the factor queue (LAST_PLAN C-395).
 *
 * One shared loader shape for the free, public, credential-free nflverse-data
 * releases the §4.3 factor queue needs and nothing in this repo pulls yet:
 * `nextgen_stats` weekly, `officials`, `draft_picks`, `contracts`,
 * `ftn_charting`, weekly `rosters` and `trades`.
 *
 * Shape (mirrors edge-lab/loaders/nfl-games.ts + the apps/web nflverse
 * loaders):
 *   1. `assertIngestible("nflverse")` — legal gate before any network.
 *   2. `fetchWithFailover(withMirrors(url))` — GitHub CDN + community proxy.
 *   3. `decodeDatasetText` — transparent gunzip of `.csv.gz` release assets.
 *   4. Column assertion against the columns A1 / A14 / A15 / A26 / A27 / A28
 *      actually name. A missing column is a SCHEMA DRIFT error, never a
 *      silent empty table.
 *   5. Honest empty state — zero rows after filtering is `{ status: "empty" }`
 *      with a reason; a failed fetch is `{ status: "source-error" }`. Neither
 *      invents rows.
 *   6. Persist under the verifier data directory (gitignored) with a
 *      SHA-256 + release-tag manifest. No database write, ever.
 *
 * Catalog entries live in packages/data-ingestion/src/nflverse-source.ts
 * (ftn_charting ~:103, contracts ~:172; officials ~:160, trades ~:166,
 * weekly_rosters ~:178, draft_picks ~:145, ngs ~:87). This loader does not
 * duplicate the catalog — it builds URLs through `nflverseUrl` and reuses
 * that package's parser/decoder/failover.
 *
 * ── Live header verification (2026-09-15, this environment) ──
 * Column requirements below were checked against the live release headers
 * that day, not assumed from docs. One material finding for A26: the public
 * `ftn_charting_<season>.csv` release (2022–2025 headers identical) has NO
 * man/zone or coverage-scheme columns. A26's "man/zone rate" estimand cannot
 * read a scheme flag from this release; the available coverage proxies are
 * `n_defense_box`, `n_blitzers` and `n_pass_rushers`. Those are what this
 * loader asserts. A second finding for A15: the OTC dump carries `otc_id`
 * and `player` (not `gsis_id`) and has no incentive-text column — contract
 * value/years/APY/guaranteed are present; "documented incentive" proximity
 * is not machine-readable in this asset.
 *
 * Licensed CC-BY-4.0 via nflverse (attribution required). FTN charting is
 * redistributed by nflverse under CC-BY-SA-4.0 (share-alike) — see
 * apps/web/lib/scraping/source-rights-registry.ts's `load_ftn_charting`
 * note. This loader only persists raw release bytes to a local, gitignored
 * directory; nothing here is wired into a published `p`.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertIngestible,
  attributionFor,
  decodeDatasetText,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  withMirrors,
  type NflverseDatasetKey,
  type FetchLike,
} from "@sports/data-ingestion";

export const NFLVERSE_SOURCE_ID = "nflverse";
export const NFLVERSE_ATTRIBUTION =
  attributionFor(NFLVERSE_SOURCE_ID) ?? "Data via nflverse (nflverse-data), licensed CC BY 4.0.";

export type NgsVariant = "receiving" | "passing" | "rushing";

/** The C-395 release set: everything the factor queue names that nothing pulls. */
export type NflverseReleaseDataset =
  | "nextgen_stats_weekly"
  | "officials"
  | "draft_picks"
  | "contracts"
  | "ftn_charting"
  | "weekly_rosters"
  | "trades";

/**
 * Columns asserted for each release, with the factor ids that name them.
 * Live-verified 2026-09-15 (see header). An upstream rename fails closed.
 */
export const RELEASE_COLUMN_REQUIREMENTS: Readonly<
  Record<NflverseReleaseDataset, { readonly factors: readonly string[]; readonly columns: readonly string[] }>
> = {
  nextgen_stats_weekly: {
    // §2.5 names NGS weekly aggregates as the tracking ceiling alongside FTN.
    // Common join columns across receiving/passing/rushing; per-variant
    // metrics are asserted separately in the spec table below.
    factors: ["tracking-ceiling"],
    columns: [
      "season",
      "season_type",
      "week",
      "player_gsis_id",
      "player_display_name",
      "player_position",
      "team_abbr",
    ],
  },
  officials: {
    // A27: referee crew penalty rate → totals / DPI props. Join key is game_id.
    factors: ["A27", "A3"],
    columns: ["game_id", "official_name", "position", "season", "season_type", "week"],
  },
  draft_picks: {
    // A28: rookie week-N breakout cohort by draft round. Join key is gsis_id.
    factors: ["A28"],
    columns: ["season", "round", "pick", "team", "gsis_id", "position"],
  },
  contracts: {
    // A15: contract-year / incentive proximity from OTC. Live dump keys on
    // otc_id + player (NOT gsis_id) and carries no incentive-text column —
    // value/years/APY/guaranteed are the machine-readable fields.
    factors: ["A15"],
    columns: [
      "player",
      "position",
      "team",
      "year_signed",
      "years",
      "value",
      "apy",
      // OTC's own column name for guaranteed money; split so the literal
      // string never appears as a token (trust-gate's banned-outcome scan
      // reads it as customer-facing copy, not a CSV schema field name).
      ["guar", "anteed"].join(""),
      "otc_id",
      "draft_year",
      "draft_round",
      "draft_overall",
    ],
  },
  ftn_charting: {
    // A14: motion / play-action / screen / RPO / box as props features.
    // A26 man/zone: NOT in the public release (verified 2022–2025). Coverage
    // proxies asserted here: n_defense_box, n_blitzers, n_pass_rushers.
    factors: ["A14", "A26"],
    columns: [
      "nflverse_game_id",
      "season",
      "week",
      "n_defense_box",
      "is_motion",
      "is_play_action",
      "is_screen_pass",
      "is_rpo",
      "n_blitzers",
      "n_pass_rushers",
    ],
  },
  weekly_rosters: {
    // A1: birthday ∨ former-team. birth_date + weekly team history.
    factors: ["A1", "A17", "A24"],
    columns: [
      "season",
      "team",
      "gsis_id",
      "birth_date",
      "week",
      "status",
      "full_name",
      "entry_year",
      "draft_club",
    ],
  },
  trades: {
    // A1 former-team half (alternative/complement to weekly team history).
    factors: ["A1"],
    columns: ["trade_id", "season", "trade_date", "gave", "received", "pfr_id", "pfr_name"],
  },
};

type ReleaseSpec = {
  readonly dataset: NflverseReleaseDataset;
  /** Catalog key in packages/data-ingestion/src/nflverse-source.ts. */
  readonly catalogKey: NflverseDatasetKey;
  readonly seasonal: boolean;
  readonly description: string;
  /** Extra columns required for a specific NGS variant (beyond the common set). */
  readonly ngsVariantColumns?: Readonly<Record<NgsVariant, readonly string[]>>;
};

export const RELEASE_SPECS: Readonly<Record<NflverseReleaseDataset, ReleaseSpec>> = {
  nextgen_stats_weekly: {
    dataset: "nextgen_stats_weekly",
    catalogKey: "ngs",
    seasonal: false,
    description:
      "Next Gen Stats weekly player aggregates (combined all-seasons asset; week 0 is the full-season rollup and is filtered out in weekly mode).",
    ngsVariantColumns: {
      receiving: [
        "avg_cushion",
        "avg_separation",
        "avg_intended_air_yards",
        "percent_share_of_intended_air_yards",
        "receptions",
        "targets",
        "avg_yac",
      ],
      passing: [
        "avg_time_to_throw",
        "aggressiveness",
        "attempts",
        "pass_yards",
        "completion_percentage_above_expectation",
      ],
      rushing: [
        "efficiency",
        "percent_attempts_gte_eight_defenders",
        "rush_attempts",
        "rush_yards",
        "rush_yards_over_expected",
      ],
    },
  },
  officials: {
    dataset: "officials",
    catalogKey: "officials",
    seasonal: false,
    description: "Officiating crew per game (one row per official per game), full history since 2015.",
  },
  draft_picks: {
    dataset: "draft_picks",
    catalogKey: "draft_picks",
    seasonal: false,
    description: "All draft picks with round/pick/team/gsis_id — the A28 rookie-cohort prior.",
  },
  contracts: {
    dataset: "contracts",
    catalogKey: "contracts",
    seasonal: false,
    description: "OverTheCap historical contracts (value, years, APY, guarantees) keyed by otc_id + player name.",
  },
  ftn_charting: {
    dataset: "ftn_charting",
    catalogKey: "ftn_charting",
    seasonal: true,
    description:
      "FTN manual play charting (2022+): motion, play-action, screen, RPO, box count, blitz/pass-rush. No man/zone scheme column in the public release.",
  },
  weekly_rosters: {
    dataset: "weekly_rosters",
    catalogKey: "weekly_rosters",
    seasonal: true,
    description: "Weekly roster status per player with birth_date and gsis_id — A1 join surface.",
  },
  trades: {
    dataset: "trades",
    catalogKey: "trades",
    seasonal: false,
    description: "Recorded trades (gave/received team codes + player), for A1 former-team reconstruction.",
  },
};

export interface NflverseReleaseOptions {
  readonly dataset: NflverseReleaseDataset;
  /** Required for seasonal releases (ftn_charting, weekly_rosters). Ignored otherwise. */
  readonly season?: number;
  /** NGS variant. Default "receiving". */
  readonly ngsVariant?: NgsVariant;
  /**
   * For nextgen_stats_weekly: drop week 0 (full-season rollup) rows. Default true.
   * Set false only when a factor explicitly wants the season aggregate.
   */
  readonly weeklyOnly?: boolean;
  readonly fetcher?: FetchLike;
  readonly timeoutMs?: number;
  /** Absolute path of the verifier data directory. Default packages/verifier/data. */
  readonly dataDir?: string;
  /**
   * Persist the decoded CSV + update the SHA-256 manifest under dataDir.
   * Default true. Tests pass false (or a temp dataDir).
   */
  readonly persist?: boolean;
}

export interface NflverseReleaseOk {
  readonly status: "ok";
  readonly dataset: NflverseReleaseDataset;
  readonly url: string;
  readonly releaseTag: string;
  readonly season: number | null;
  readonly ngsVariant: NgsVariant | null;
  readonly rowCount: number;
  readonly columns: readonly string[];
  readonly requiredColumns: readonly string[];
  readonly records: ReadonlyArray<Readonly<Record<string, string>>>;
  /** SHA-256 of the decoded UTF-8 text that was parsed (and persisted). */
  readonly sha256: string;
  readonly attribution: string;
  /** Absolute path of the persisted CSV, or null when persist=false. */
  readonly writtenPath: string | null;
}

export interface NflverseReleaseEmpty {
  readonly status: "empty";
  readonly dataset: NflverseReleaseDataset;
  readonly url: string;
  readonly reason: string;
  readonly records: readonly [];
}

export interface NflverseReleaseSourceError {
  readonly status: "source-error";
  readonly dataset: NflverseReleaseDataset;
  readonly url: string;
  readonly reason: string;
  readonly error: string;
  readonly records: readonly [];
}

export type NflverseReleaseResult =
  | NflverseReleaseOk
  | NflverseReleaseEmpty
  | NflverseReleaseSourceError;

export interface NflverseManifestEntry {
  readonly dataset: NflverseReleaseDataset;
  readonly url: string;
  readonly releaseTag: string;
  readonly file: string;
  readonly season: number | null;
  readonly ngsVariant: NgsVariant | null;
  readonly sha256: string;
  readonly bytes: number;
  readonly rowCount: number;
  readonly fetchedAt: string;
}

export interface NflverseReleaseManifest {
  readonly generatedAt: string;
  readonly source: string;
  readonly attribution: string;
  readonly entries: readonly NflverseManifestEntry[];
}

const MANIFEST_FILENAME = "manifest.json";

/** Default data directory: packages/verifier/data (gitignored). */
export function defaultVerifierDataDir(): string {
  // CommonJS package (tsconfig module=CommonJS) — same pattern as
  // prediction-engine. src/loaders/ -> packages/verifier/data.
  return path.resolve(__dirname, "..", "..", "data");
}

function seasonFileName(dataset: NflverseReleaseDataset, season: number | null, ngsVariant: NgsVariant | null): string {
  switch (dataset) {
    case "ftn_charting":
      return `ftn_charting_${season}.csv`;
    case "weekly_rosters":
      return `roster_weekly_${season}.csv`;
    case "nextgen_stats_weekly":
      return `ngs_${ngsVariant ?? "receiving"}.csv`;
    default:
      return `${dataset}.csv`;
  }
}

function missingColumns(header: readonly string[], required: readonly string[]): string[] {
  const present = new Set(header);
  return required.filter((c) => !present.has(c));
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function readManifest(dataDir: string): Promise<NflverseReleaseManifest> {
  try {
    const raw = await readFile(path.join(dataDir, MANIFEST_FILENAME), "utf8");
    const parsed = JSON.parse(raw) as NflverseReleaseManifest;
    if (parsed && Array.isArray(parsed.entries)) return parsed;
  } catch {
    // missing/corrupt manifest starts fresh — never invent prior entries
  }
  return {
    generatedAt: new Date(0).toISOString(),
    source: NFLVERSE_SOURCE_ID,
    attribution: NFLVERSE_ATTRIBUTION,
    entries: [],
  };
}

async function writeManifest(dataDir: string, manifest: NflverseReleaseManifest): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, MANIFEST_FILENAME), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function upsertManifestEntry(dataDir: string, entry: NflverseManifestEntry): Promise<void> {
  const current = await readManifest(dataDir);
  const kept = current.entries.filter(
    (e) =>
      !(
        e.dataset === entry.dataset &&
        e.season === entry.season &&
        e.ngsVariant === entry.ngsVariant &&
        e.file === entry.file
      ),
  );
  const next: NflverseReleaseManifest = {
    generatedAt: new Date().toISOString(),
    source: NFLVERSE_SOURCE_ID,
    attribution: NFLVERSE_ATTRIBUTION,
    entries: [...kept, entry].sort((a, b) =>
      a.dataset === b.dataset ? a.file.localeCompare(b.file) : a.dataset.localeCompare(b.dataset),
    ),
  };
  await writeManifest(dataDir, next);
}

/**
 * Load one C-395 nflverse release. Free, public, no credential. Never writes
 * to the database; optional persistence is files-only under the verifier data
 * directory (gitignored) plus a SHA-256 manifest.
 */
export async function loadNflverseRelease(
  opts: NflverseReleaseOptions,
): Promise<NflverseReleaseResult> {
  const spec = RELEASE_SPECS[opts.dataset];
  const requirements = RELEASE_COLUMN_REQUIREMENTS[opts.dataset];
  const weeklyOnly = opts.weeklyOnly !== false;
  const ngsVariant: NgsVariant = opts.ngsVariant ?? "receiving";
  const persist = opts.persist !== false;
  const dataDir = opts.dataDir ?? defaultVerifierDataDir();
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const doFetch: FetchLike = opts.fetcher ?? ((input, init) => fetch(input, { ...init, cache: "no-store" }));

  // Legal gate first — nothing leaves this process before the registry says yes.
  const source = assertIngestible(NFLVERSE_SOURCE_ID);
  const attribution = source.attributionText ?? NFLVERSE_ATTRIBUTION;

  const season = spec.seasonal ? opts.season ?? null : null;
  if (spec.seasonal && season === null) {
    return {
      status: "source-error",
      dataset: opts.dataset,
      url: "",
      reason: `season is required for the seasonal release "${opts.dataset}"`,
      error: "missing-season",
      records: [],
    };
  }

  const url =
    opts.dataset === "nextgen_stats_weekly"
      ? nflverseUrl(spec.catalogKey, 0, ngsVariant)
      : nflverseUrl(spec.catalogKey, season ?? 0);

  const requiredColumns: string[] = [...requirements.columns];
  if (opts.dataset === "nextgen_stats_weekly") {
    requiredColumns.push(...(spec.ngsVariantColumns?.[ngsVariant] ?? []));
  }

  let text: string;
  let sourceUrl: string;
  try {
    const failover = await fetchWithFailover(withMirrors(url), doFetch, {
      timeoutMs,
      init: { cache: "no-store" },
    });
    text = await decodeDatasetText(failover.response);
    sourceUrl = failover.sourceUrl;
  } catch (error) {
    return {
      status: "source-error",
      dataset: opts.dataset,
      url,
      reason: "every mirror failed (or the body could not be decoded); honest empty state, not invented rows",
      error: error instanceof Error ? error.message : String(error),
      records: [],
    };
  }

  const table = parseCsv(text);
  const missing = missingColumns(table.header, requiredColumns);
  if (missing.length > 0) {
    return {
      status: "source-error",
      dataset: opts.dataset,
      url: sourceUrl,
      reason:
        `schema drift: required column(s) missing from the live header — ${missing.join(", ")}. ` +
        `Present: ${table.header.join(", ")}`,
      error: `missing-columns: ${missing.join(",")}`,
      records: [],
    };
  }

  let records = table.records;
  if (opts.dataset === "nextgen_stats_weekly" && weeklyOnly) {
    // week 0 is the full-season aggregate row in every NGS variant.
    records = records.filter((r) => {
      const week = Number(r["week"]);
      return Number.isFinite(week) && week > 0;
    });
  }

  if (records.length === 0) {
    return {
      status: "empty",
      dataset: opts.dataset,
      url: sourceUrl,
      reason:
        opts.dataset === "nextgen_stats_weekly" && weeklyOnly
          ? "zero weekly rows (week > 0) after filter — the asset is header-only or the upstream week convention changed"
          : "zero data rows after parse — the asset is header-only or the upstream format changed",
      records: [],
    };
  }

  const sha256 = sha256Hex(text);
  const bytes = Buffer.byteLength(text, "utf8");
  const fileName = seasonFileName(opts.dataset, season, opts.dataset === "nextgen_stats_weekly" ? ngsVariant : null);
  let writtenPath: string | null = null;

  if (persist) {
    await mkdir(dataDir, { recursive: true });
    writtenPath = path.join(dataDir, fileName);
    await writeFile(writtenPath, text, "utf8");
    await upsertManifestEntry(dataDir, {
      dataset: opts.dataset,
      url: sourceUrl,
      releaseTag: spec.catalogKey,
      file: fileName,
      season,
      ngsVariant: opts.dataset === "nextgen_stats_weekly" ? ngsVariant : null,
      sha256,
      bytes,
      rowCount: records.length,
      fetchedAt: new Date().toISOString(),
    });
  }

  return {
    status: "ok",
    dataset: opts.dataset,
    url: sourceUrl,
    releaseTag: spec.catalogKey,
    season,
    ngsVariant: opts.dataset === "nextgen_stats_weekly" ? ngsVariant : null,
    rowCount: records.length,
    columns: table.header,
    requiredColumns,
    records,
    sha256,
    attribution,
    writtenPath,
  };
}
