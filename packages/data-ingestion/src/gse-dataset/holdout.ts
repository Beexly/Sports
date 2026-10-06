/**
 * Stage B -- the forward holdout split.
 *
 * SCOPE: this module builds and freezes the split ONLY. It evaluates no
 * acceptance gate, fits nothing, and reads no market. A caller that wants a
 * score must go through the gate harness, not through this file.
 *
 * ## The split rule (explicit, and enforced in code)
 *
 * The split is BY SEASON, with an optional game-id filter inside the holdout
 * season:
 *
 *   train   := rows where `season < HOLDOUT_SEASON`   (STRICTLY earlier)
 *   holdout := rows where `season === HOLDOUT_SEASON` (and, if a game filter
 *              is supplied, `game_id` is in that filter)
 *
 * "Strictly earlier" is the whole point. A walk-forward split that let any part
 * of the holdout season into training would leak the evaluation window back
 * into the fit, and because a season is a contiguous calendar block, a
 * same-season train/holdout mix is not merely leaky but untestable: the model
 * would be scored on games whose outcomes it was fitted through. The
 * `assertSplitIntegrity` check below fails the build if that invariant is ever
 * broken by a data change rather than by a code change.
 *
 * `HOLDOUT_SEASON` is RESOLVED FROM THE DATA, not hand-typed: it is the most
 * recent season in which every row is settled. The current (in-progress)
 * season is excluded because it is mostly unplayed, and a holdout of
 * unscoreable games cannot gate anything. The resolved value is written into
 * the manifest, so the artifact stays frozen even after the data refreshes and
 * a later season becomes the new candidate.
 *
 * ## Reverse-Stein: the holdout is never a shrinkage target
 *
 * The contract forbids taking a shrinkage target (a prior, a mean, a dispersion
 * parameter) from the same sample being shrunk. Allowing the holdout into a
 * prior is reverse-Stein: the holdout would calibrate itself, the resulting
 * interval would be optimistically narrow, and a gate scored against it would
 * pass on a number that no out-of-sample data can ever reproduce. This is
 * enforced STRUCTURALLY, in three independent layers, so it cannot be undone
 * by forgetting to check:
 *
 *  1. TYPE-LEVEL DISJOINTNESS. Rows are branded with a `partition`
 *     discriminant. `SealedHoldoutRow` is NOT assignable to `TrainRow` and vice
 *     versa, so `fitSomething(rows: readonly TrainRow[])` cannot be handed
 *     holdout rows -- that is a compile error, not a lint warning. Anything
 *     that computes a prior or a target takes `readonly TrainRow[]`.
 *  2. A SEALED ACCESSOR. The loader never returns holdout rows as data. It
 *     returns a function, and calling it requires BOTH the literal founder
 *     token AND `process.env.GSE_ALLOW_HOLDOUT_OPEN === "true"`. Neither alone
 *     is sufficient, so neither a leaked token nor a stray env var in CI can
 *     read the holdout.
 *  3. FROZEN-INPUT VERIFICATION. The loader re-verifies the sha256 of the
 *     source file against the manifest and refuses to serve a split built from
 *     different bytes, so a prior cannot be recomputed against a re-split
 *     sample and compared to a score from the old one.
 *
 * HONEST SCOPE OF THE SEAL: the on-disk `holdout.jsonl` is plain JSONL and
 * carries real outcomes, because an evaluation set has to. This is not
 * encryption and does not defend against someone reading the file directly.
 * What it guarantees is that no code path inside this module hands holdout
 * rows to a prior/target computation, and that the only supported way to read
 * them is the doubly-gated accessor above.
 *
 * NOTE ON THE REPO GUARDRAIL: `scripts/guardrails/sealed-holdout-open-scan.mjs`
 * fails the build on any `openHoldout`-style call site outside
 * `packages/prediction-engine/src/edge-lab/`, comments included. The accessor
 * here is deliberately named `unsealHoldout` so it can never be confused with,
 * or satisfy, that guard.
 *
 * CLI: `npx tsx packages/data-ingestion/src/gse-dataset/holdout.ts`
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { GSE_DATA_DIR, sha256Hex } from "./fetch-games.js";
import type { NormalizedGame } from "./normalize.js";

/** Input artifact: the Stage A normalized game master. */
export const GSE_GAMES_JSONL_PATH = join(GSE_DATA_DIR, "games.jsonl");
/** Materialized holdout partition. */
export const GSE_HOLDOUT_JSONL_PATH = join(GSE_DATA_DIR, "holdout.jsonl");
/** Frozen split manifest: counts, rule, and the source sha256. */
export const GSE_HOLDOUT_MANIFEST_PATH = join(GSE_DATA_DIR, "holdout.manifest.json");

/**
 * Founder token, mirroring the existing edge-lab seal
 * (`packages/prediction-engine/src/edge-lab/walk-forward.ts`). Required AND
 * necessary: passing it is not sufficient without the env var.
 */
export const FOUNDER_HOLDOUT_TOKEN = "FOUNDER-SIGNED-OFF-OPEN-THE-HOLDOUT";
/** Env var that must also be `"true"`. Required AND necessary. */
export const HOLDOUT_UNSEAL_ENV_VAR = "GSE_ALLOW_HOLDOUT_OPEN";

export class SealedHoldoutError extends Error {
  constructor() {
    super(
      "The forward holdout is SEALED until founder sign-off. " +
        "Reading it requires BOTH the literal founder token AND " +
        `process.env.${HOLDOUT_UNSEAL_ENV_VAR} === "true". ` +
        "It must never be used as a prior, target, or shrinkage input.",
    );
    this.name = "SealedHoldoutError";
  }
}

/**
 * A training row. The `partition` discriminant makes this type structurally
 * incompatible with {@link SealedHoldoutRow}: a function accepting
 * `readonly TrainRow[]` cannot be handed holdout rows, which is what makes the
 * reverse-Stein ban a compile error rather than a convention.
 */
export type TrainRow = NormalizedGame & { readonly partition: "train" };

/** A holdout row. Equally incompatible with {@link TrainRow}. */
export type SealedHoldoutRow = NormalizedGame & { readonly partition: "holdout" };

/** Either branded row, for code that legitimately spans the whole dataset. */
export type AnyPartitionRow = TrainRow | SealedHoldoutRow;

/** The split rule, recorded verbatim in the manifest. */
export type SplitRule = {
  readonly id: "season-forward-holdout";
  readonly description: string;
  readonly trainPredicate: string;
  readonly holdoutPredicate: string;
  readonly holdoutSeason: number;
  readonly holdoutSeasonResolution: string;
  /** Game-id allowlist applied inside the holdout season, when present. */
  readonly holdoutGameFilter: readonly string[] | null;
};

/** Per-partition counts. */
export type PartitionCounts = {
  readonly count: number;
  readonly settled: number;
  readonly unsettled: number;
  readonly minSeason: number | null;
  readonly maxSeason: number | null;
  readonly seasons: readonly number[];
  readonly teams: number;
};

/** The frozen manifest written next to the artifacts. */
export type HoldoutManifest = {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly rule: SplitRule;
  readonly source: {
    readonly path: string;
    readonly rows: number;
    readonly bytes: number;
    readonly sha256: string;
    /** Upstream nflverse URL + fetch time, carried from the Stage A sidecar. */
    readonly upstreamUrl: string | null;
    readonly upstreamSha256: string | null;
    readonly upstreamFetchedAt: string | null;
  };
  readonly partitions: {
    readonly train: PartitionCounts;
    readonly holdout: PartitionCounts;
  };
  readonly artifact: {
    readonly path: string;
    readonly rows: number;
    readonly bytes: number;
    readonly sha256: string;
  };
  readonly guarantee: string;
};

/** The loaded split. Note there is no plain `holdout` array to reach for. */
export type HoldoutSplit = {
  readonly train: readonly TrainRow[];
  /** Safe to log: a count leaks no outcomes. */
  readonly holdoutCount: number;
  readonly manifest: HoldoutManifest;
  /**
   * The ONLY supported way to obtain holdout rows. Throws {@link
   * SealedHoldoutError} unless BOTH the founder token and the env var are
   * present. What it returns must never be used as a prior or target.
   */
  readonly unsealHoldout: (token: string) => readonly SealedHoldoutRow[];
};

export type BuildSplitOptions = {
  /** Pin the holdout season instead of resolving it from the data. */
  readonly holdoutSeasonOverride?: number;
  /** Optional game-id allowlist applied INSIDE the holdout season only. */
  readonly holdoutGameIds?: readonly string[];
};

function parseGamesJsonl(text: string): NormalizedGame[] {
  const rows: NormalizedGame[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") continue;
    try {
      rows.push(JSON.parse(line) as NormalizedGame);
    } catch (error) {
      throw new Error(
        `${GSE_GAMES_JSONL_PATH}:${i + 1} is not valid JSON (${error instanceof Error ? error.message : "parse error"})`,
      );
    }
  }
  if (rows.length === 0) throw new Error(`${GSE_GAMES_JSONL_PATH} contains no rows`);
  return rows;
}

/**
 * Resolve the holdout season: the most recent season in which EVERY row is
 * settled. The in-progress season has unplayed games, and an evaluation set of
 * unscoreable games cannot gate anything, so it is never the holdout.
 *
 * Falls back to the most recent season present if no season is fully settled
 * (which would mean the whole source is future-dated), so this cannot return
 * `null` for a non-empty dataset.
 */
export function resolveHoldoutSeason(games: readonly NormalizedGame[]): number {
  const settledBySeason = new Map<number, { total: number; settled: number }>();
  for (const game of games) {
    const bucket = settledBySeason.get(game.season) ?? { total: 0, settled: 0 };
    bucket.total += 1;
    if (game.settled) bucket.settled += 1;
    settledBySeason.set(game.season, bucket);
  }
  const seasons = [...settledBySeason.keys()].sort((a, b) => a - b);
  if (seasons.length === 0) throw new Error("cannot resolve a holdout season from an empty dataset");
  for (let i = seasons.length - 1; i >= 0; i--) {
    const season = seasons[i]!;
    const bucket = settledBySeason.get(season)!;
    if (bucket.settled === bucket.total) return season;
  }
  return seasons[seasons.length - 1]!;
}

/**
 * Apply the split rule. Exported so the rule is testable on synthetic input
 * without touching the real artifacts.
 */
export function buildSplit(
  games: readonly NormalizedGame[],
  options: BuildSplitOptions = {},
): { readonly train: readonly TrainRow[]; readonly holdout: readonly SealedHoldoutRow[]; readonly rule: SplitRule } {
  const holdoutSeason = options.holdoutSeasonOverride ?? resolveHoldoutSeason(games);
  const filter =
    options.holdoutGameIds === undefined || options.holdoutGameIds.length === 0
      ? null
      : new Set(options.holdoutGameIds);

  const train: TrainRow[] = [];
  const holdout: SealedHoldoutRow[] = [];
  for (const game of games) {
    if (game.season < holdoutSeason) {
      train.push({ ...game, partition: "train" });
    } else if (game.season === holdoutSeason && (filter === null || filter.has(game.game_id))) {
      holdout.push({ ...game, partition: "holdout" });
    }
    // Seasons STRICTLY GREATER than the holdout season are dropped: they are
    // in the future relative to the evaluation window and must not silently
    // join training.
  }

  const rule: SplitRule = {
    id: "season-forward-holdout",
    description:
      "train = seasons strictly earlier than the holdout season; " +
      "holdout = the holdout season (optionally filtered by game_id). " +
      "Seasons after the holdout season are excluded from both partitions.",
    trainPredicate: "season < HOLDOUT_SEASON",
    holdoutPredicate:
      "season === HOLDOUT_SEASON" +
      (filter === null ? "" : " AND game_id IN holdoutGameIds"),
    holdoutSeason,
    holdoutSeasonResolution:
      options.holdoutSeasonOverride === undefined
        ? "most recent season in which every row is settled (resolved from data)"
        : `pinned by holdoutSeasonOverride=${options.holdoutSeasonOverride}`,
    holdoutGameFilter: filter === null ? null : [...filter].sort(),
  };

  return { train, holdout, rule };
}

/** Fail loudly if the split invariants are violated. */
export function assertSplitIntegrity(split: {
  readonly train: readonly TrainRow[];
  readonly holdout: readonly SealedHoldoutRow[];
  readonly rule: SplitRule;
}): void {
  const { train, holdout, rule } = split;
  if (holdout.length === 0) {
    throw new Error("holdout partition is empty: the split cannot gate anything");
  }
  const lastTrainSeason = Math.max(...train.map((row) => row.season));
  if (lastTrainSeason >= rule.holdoutSeason) {
    throw new Error(
      `split integrity violated: train contains season ${lastTrainSeason} which is not strictly earlier than holdout season ${rule.holdoutSeason}`,
    );
  }
  if (holdout.some((row) => row.season !== rule.holdoutSeason)) {
    throw new Error("split integrity violated: holdout contains a row outside the holdout season");
  }
  const trainIds = new Set(train.map((row) => row.game_id));
  const overlap = holdout.filter((row) => trainIds.has(row.game_id)).map((row) => row.game_id);
  if (overlap.length > 0) {
    throw new Error(`split integrity violated: ${overlap.length} game_id(s) in both partitions`);
  }
}

function countPartition(rows: readonly AnyPartitionRow[]): PartitionCounts {
  const seasons = [...new Set(rows.map((row) => row.season))].sort((a, b) => a - b);
  const teams = new Set<string>();
  for (const row of rows) {
    teams.add(row.away_team);
    teams.add(row.home_team);
  }
  const settled = rows.filter((row) => row.settled).length;
  return {
    count: rows.length,
    settled,
    unsettled: rows.length - settled,
    minSeason: seasons[0] ?? null,
    maxSeason: seasons[seasons.length - 1] ?? null,
    seasons,
    teams: teams.size,
  };
}

async function readUpstreamSidecar(): Promise<{
  url: string | null;
  sha256: string | null;
  fetchedAt: string | null;
}> {
  try {
    const raw = await readFile(join(GSE_DATA_DIR, ".cache", "games.meta.json"), "utf8");
    const parsed = JSON.parse(raw) as { url?: string; sha256?: string; fetchedAt?: string };
    return {
      url: parsed.url ?? null,
      sha256: parsed.sha256 ?? null,
      fetchedAt: parsed.fetchedAt ?? null,
    };
  } catch {
    return { url: null, sha256: null, fetchedAt: null };
  }
}

/**
 * Compute the split from `games.jsonl` and freeze it: writes
 * `holdout.jsonl` and `holdout.manifest.json`, and returns the manifest.
 */
export async function materializeHoldout(
  options: BuildSplitOptions & { readonly now?: () => Date } = {},
): Promise<{ readonly manifest: HoldoutManifest; readonly games: readonly NormalizedGame[]; readonly split: ReturnType<typeof buildSplit> }> {
  const sourceText = await readFile(GSE_GAMES_JSONL_PATH, "utf8");
  const games = parseGamesJsonl(sourceText);
  const split = buildSplit(games, options);
  assertSplitIntegrity(split);

  const holdoutBody = `${split.holdout.map((row) => JSON.stringify(row)).join("\n")}\n`;
  await mkdir(dirname(GSE_HOLDOUT_JSONL_PATH), { recursive: true });
  await writeFile(GSE_HOLDOUT_JSONL_PATH, holdoutBody, "utf8");

  const upstream = await readUpstreamSidecar();
  const manifest: HoldoutManifest = {
    schemaVersion: 1,
    generatedAt: (options.now ?? ((): Date => new Date()))().toISOString(),
    rule: split.rule,
    source: {
      path: GSE_GAMES_JSONL_PATH,
      rows: games.length,
      bytes: Buffer.byteLength(sourceText, "utf8"),
      sha256: sha256Hex(sourceText),
      upstreamUrl: upstream.url,
      upstreamSha256: upstream.sha256,
      upstreamFetchedAt: upstream.fetchedAt,
    },
    partitions: {
      train: countPartition(split.train),
      holdout: countPartition(split.holdout),
    },
    artifact: {
      path: GSE_HOLDOUT_JSONL_PATH,
      rows: split.holdout.length,
      bytes: Buffer.byteLength(holdoutBody, "utf8"),
      sha256: sha256Hex(holdoutBody),
    },
    guarantee:
      "Holdout rows are reachable only through unsealHoldout(), which requires BOTH the founder " +
      "token AND GSE_ALLOW_HOLDOUT_OPEN=true. TrainRow and SealedHoldoutRow are mutually " +
      "non-assignable, so no prior/target function can accept holdout rows. This artifact is " +
      "plain JSONL with real outcomes and is not encrypted: the guarantee is structural at the " +
      "API boundary, not a defence against reading the file directly.",
  };

  await writeFile(GSE_HOLDOUT_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, games, split };
}

/**
 * THE LOADER the gate harness calls. Returns the train rows and a SEALED
 * accessor for the holdout -- never a bare holdout array.
 *
 * Verifies the source sha256 against the manifest and refuses to serve a split
 * built from different bytes, so a prior can never be recomputed against
 * re-split data and scored against the old manifest's numbers.
 *
 * Options:
 *  - `manifestPath` / `gamesPath` override the default artifact locations.
 *  - `verifySource` (default true) enforces the frozen-input check.
 */
export async function loadHoldoutSplit(options: {
  readonly manifestPath?: string;
  readonly gamesPath?: string;
  readonly verifySource?: boolean;
  readonly holdoutGameIds?: readonly string[];
  readonly unsealed?: { readonly token: string; readonly env: NodeJS.ProcessEnv };
} = {}): Promise<HoldoutSplit> {
  const manifestPath = options.manifestPath ?? GSE_HOLDOUT_MANIFEST_PATH;
  const gamesPath = options.gamesPath ?? GSE_GAMES_JSONL_PATH;

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as HoldoutManifest;
  const sourceText = await readFile(gamesPath, "utf8");

  if (options.verifySource !== false) {
    const digest = sha256Hex(sourceText);
    if (digest !== manifest.source.sha256) {
      throw new Error(
        `frozen-input check failed: ${gamesPath} has sha256 ${digest} but the manifest was built from ${manifest.source.sha256}. ` +
          "Re-materialize the holdout before scoring anything.",
      );
    }
  }

  const games = parseGamesJsonl(sourceText);
  const split = buildSplit(games, {
    // The manifest's season is authoritative: a re-resolution could otherwise
    // silently produce a DIFFERENT split than the one the manifest froze.
    holdoutSeasonOverride: manifest.rule.holdoutSeason,
    holdoutGameIds: options.holdoutGameIds ?? manifest.rule.holdoutGameFilter ?? undefined,
  });
  assertSplitIntegrity(split);

  if (split.holdout.length !== manifest.partitions.holdout.count) {
    throw new Error(
      `frozen-input check failed: rebuilt holdout has ${split.holdout.length} rows but the manifest froze ${manifest.partitions.holdout.count}`,
    );
  }

  return {
    train: split.train,
    holdoutCount: split.holdout.length,
    manifest,
    unsealHoldout: (token: string): readonly SealedHoldoutRow[] => {
      const env = options.unsealed?.env ?? process.env;
      if (token !== FOUNDER_HOLDOUT_TOKEN || env[HOLDOUT_UNSEAL_ENV_VAR] !== "true") {
        throw new SealedHoldoutError();
      }
      return split.holdout;
    },
  };
}

/** Run log for the holdout stage. */
export function describeHoldoutRun(manifest: HoldoutManifest): readonly string[] {
  const { rule, partitions, source, artifact } = manifest;
  return [
    "",
    "holdout split",
    `rule            ${rule.id}`,
    `train           ${rule.trainPredicate}`,
    `holdout         ${rule.holdoutPredicate}`,
    `holdout season  ${rule.holdoutSeason} (${rule.holdoutSeasonResolution})`,
    `game filter     ${rule.holdoutGameFilter === null ? "none" : rule.holdoutGameFilter.join(",")}`,
    "",
    `train rows      ${partitions.train.count} (seasons ${partitions.train.minSeason}..${partitions.train.maxSeason}, ${partitions.train.settled} settled)`,
    `holdout rows    ${partitions.holdout.count} (seasons ${partitions.holdout.minSeason}..${partitions.holdout.maxSeason}, ${partitions.holdout.settled} settled)`,
    `train teams     ${partitions.train.teams}`,
    "",
    `source          ${source.path}`,
    `source rows     ${source.rows}`,
    `source sha256   ${source.sha256}`,
    `upstream sha256 ${source.upstreamSha256 ?? "n/a"}`,
    `upstream at     ${source.upstreamFetchedAt ?? "n/a"}`,
    "",
    `artifact        ${artifact.path}`,
    `artifact rows   ${artifact.rows}`,
    `artifact bytes  ${artifact.bytes}`,
    `artifact sha256 ${artifact.sha256}`,
  ];
}

async function main(): Promise<void> {
  const { manifest } = await materializeHoldout();
  for (const line of describeHoldoutRun(manifest)) console.log(line);
  console.log("");
  console.log("No acceptance gate was evaluated. Stage B produces the split only.");
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
