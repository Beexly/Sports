/**
 * NFL expected-metrics validation harness — EP / WP / Success / Drives on REAL
 * nflverse play-by-play, with the nflverse `ep`/`epa`/`wp`/`wpa` columns as
 * REFEREE ONLY (the y-axis of a correlation; never a served metric).
 *
 * RUN:  NODE_OPTIONS=--use-system-ca npx tsx scripts/validation/nfl-expected-metrics-validation.ts \
 *         [--season <yyyy>] [--out <dir>] [--timeout-ms <n>] [--fixture <path.csv>] [--strict]
 *
 * What it does (thin composition — every piece of logic lives in an
 * already-unit-tested module):
 *   1. Clearance: checkClearance("nflverse", open_dataset_ingest, fetch-native,
 *      [derived_analytics, model_training]) — denied ⇒ hard stop (exit 1). The
 *      returned RightsSnapshot is embedded verbatim in the report provenance.
 *   2. Registry gate + attribution: assertIngestible("nflverse") +
 *      attributionFor("nflverse"). BOTH registry attribution lines propagate
 *      into the artifacts (CLAUDE.md: registry attribution must propagate to
 *      all derived outputs).
 *   3. Fetch: the loadPbp recipe — nflverseUrl("pbp", s) → withMirrors →
 *      fetchWithFailover → decodeDatasetText → parseCsv({ columns }) with the
 *      same [season, season − 1] fallback. No new fetch client. Two declared
 *      deviations from loadPbp: decodeDatasetText (a strict superset of
 *      response.text(): gzip magic-byte sniff, byte-identical on the plain-CSV
 *      pbp asset) and a 60s default timeout (a script has no serverless
 *      deadline; the asset is large).
 *   4. Map: mapNflversePbpToExpectedMetrics (pure, unit-tested).
 *   5. Fit-on-load: fitExpectedPointsModel / fitWinProbabilityModel with the
 *      default honesty gates (null model ⇒ "insufficient-sample", continue).
 *   6. Calibrate vs referee with the equal-length discipline (a misjoin throws
 *      inside validation.ts ⇒ exit 2). EPA is graded under the `ep` threshold
 *      family — no `epa` family exists in DEFAULT_GRADUATION_THRESHOLDS.
 *   7. Success + drives rollups, with the drive partition invariant asserted.
 *   8. Write reports/expected-metrics/<YYYY-MM-DD>-validation.{json,md}.
 *
 * Exit codes: 0 = report written (verdicts are evidence, not gates);
 * 1 = clearance denied or fetch failed for both seasons; 2 = internal
 * invariant violation (misjoin / partition / claims self-scan); 3 = --strict
 * and EP or WP verdict is "failed" or "insufficient-sample".
 *
 * TYPECHECK HONESTY: scripts/ is not a workspace and is not covered by
 * `npm run typecheck` (same status as scripts/calibration-validate.ts); this
 * file is still written strict-clean. The fully-tsc-gated logic (mapper +
 * engine) is deliberately maximized; this harness is thin composition.
 *
 * Environment: no env vars, no DB, no keys — read-only public data (CC-BY-4.0).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkClearance } from "../../apps/web/lib/scraping/clearance-engine";
import { assertIngestible, attributionFor } from "../../packages/data-ingestion/src/source-registry.js";
import { decodeDatasetText, nflverseUrl, parseCsv } from "../../packages/data-ingestion/src/nflverse-source.js";
import { fetchWithFailover, withMirrors } from "../../packages/data-ingestion/src/fetch-failover.js";
import {
  attachOwnEpa,
  buildDrives,
  buildEpCalibration,
  buildWpCalibration,
  DEFAULT_GRADUATION_THRESHOLDS,
  DRIVES_MODEL_VERSION,
  expectedPointsAdded,
  fitExpectedPointsModel,
  fitWinProbabilityModel,
  graduationVerdict,
  mapNflversePbpToExpectedMetrics,
  NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS,
  predictExpectedPoints,
  predictWinProbability,
  SUCCESS_RATE_MODEL_VERSION,
  successRateByDown,
  successRateByPlayer,
  successRateBySituation,
  successRateByTeam,
  winProbabilityAdded,
  type CalibrationReport,
  type GraduationResult,
  type MappedExpectedMetricsPlays,
  type SuccessRateSplit,
} from "../../packages/prediction-engine/src/expected-metrics/index.js";

// ── CLI ─────────────────────────────────────────────────────────────────────────

interface CliOptions {
  readonly season: number;
  readonly outDir: string;
  readonly timeoutMs: number;
  readonly fixture: string | null;
  readonly strict: boolean;
}

/** Same rule as latestNflverseInspectionSeason(): season = its September start year. */
function currentNflSeason(now = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let season = currentNflSeason();
  let outDir = "reports/expected-metrics";
  let timeoutMs = 60000; // deliberate deviation from loadPbp's 20000 — no serverless deadline
  let fixture: string | null = null;
  let strict = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--season") season = Number(argv[++i]);
    else if (arg === "--out") outDir = argv[++i] ?? outDir;
    else if (arg === "--timeout-ms") timeoutMs = Number(argv[++i]);
    else if (arg === "--fixture") fixture = argv[++i] ?? null;
    else if (arg === "--strict") strict = true;
  }
  if (!Number.isFinite(season)) season = currentNflSeason();
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) timeoutMs = 60000;
  return { season, outDir, timeoutMs, fixture, strict };
}

// ── Claims self-scan (defense-in-depth; voluntary — scripts/ and reports/ are ──
// ── outside the CI guardrail's SCAN_TARGETS) ───────────────────────────────────

/**
 * Verbatim CLAIMS list from scripts/guardrails/no-unsupported-performance-claims.mjs
 * plus "guarantee" (a harness-added extra), with the same whole-phrase matching.
 */
const BANNED_CLAIMS = [
  "win rate",
  "roi",
  "profit",
  "profitable",
  "verified",
  "proven",
  "calibrated",
  "beats market",
  "beat the market",
  "closing line value",
  "clv",
  "positive expected value",
  "+ev",
  "guarantee",
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseRegex(phrase: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}([^a-z0-9]|$)`, "i");
}

function scanClaims(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");
  return BANNED_CLAIMS.filter((claim) => phraseRegex(claim).test(normalized));
}

// ── Fetch (the loadPbp recipe; no new client) ──────────────────────────────────

interface FetchedPbp {
  readonly records: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly season: number;
  readonly sourceUrl: string;
  readonly servedBy: string;
  readonly attempts: number;
  readonly fetchTimestamp: string;
}

async function fetchPbp(season: number, timeoutMs: number): Promise<FetchedPbp> {
  const errors: string[] = [];
  for (const candidate of [season, season - 1]) {
    const url = nflverseUrl("pbp", candidate);
    try {
      const result = await fetchWithFailover(withMirrors(url), fetch, { timeoutMs });
      const text = await decodeDatasetText(result.response);
      const { records } = parseCsv(text, { columns: NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS });
      // loadPbp treats 0 records as failure and falls through — replicated.
      if (records.length === 0) throw new Error(`empty play_by_play ${candidate}`);
      return {
        records,
        season: candidate,
        sourceUrl: url,
        servedBy: result.sourceUrl,
        attempts: result.attempts,
        fetchTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      errors.push(`${url} -> ${error instanceof Error ? error.message : "error"}`);
    }
  }
  throw new Error(`pbp fetch failed for [${season}, ${season - 1}]: ${errors.join("; ")}`);
}

// ── Report shapes ───────────────────────────────────────────────────────────────

interface FamilyCalibration {
  readonly report: CalibrationReport;
  readonly verdict: GraduationResult["verdict"] | "insufficient-sample";
  readonly reason: string;
  readonly thresholds: GraduationResult["thresholds"] | null;
  readonly thresholdFamily?: string;
  readonly informational?: boolean;
}

const EMPTY_REPORT: CalibrationReport = {
  n: 0, pearson: 0, spearman: 0, rmse: 0, mae: 0, bias: 0, ourMean: 0, truthMean: 0,
};

const GRAIN_NOTE =
  "n counts paired plays; engine reason strings say 'players' at every grain.";

function insufficient(reason: string): FamilyCalibration {
  return { report: EMPTY_REPORT, verdict: "insufficient-sample", reason, thresholds: null };
}

function fromGraduation(result: GraduationResult): FamilyCalibration {
  return {
    report: result.report,
    verdict: result.verdict,
    reason: result.reason, // engine-authored, embedded verbatim (see GRAIN_NOTE)
    thresholds: result.thresholds,
  };
}

function splitRows(splits: readonly SuccessRateSplit[]): Array<{
  key: string; plays: number; successes: number; successRate: number;
}> {
  return splits.map((s) => ({
    key: s.key, plays: s.plays, successes: s.successes, successRate: s.successRate,
  }));
}

function round4(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10000) / 10000 : 0;
}

// ── MD rendering ────────────────────────────────────────────────────────────────

function familyTable(rows: ReadonlyArray<readonly [string, FamilyCalibration]>): string {
  const lines = [
    "| family | n | pearson | spearman | rmse | mae | bias | verdict | reason |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [name, fam] of rows) {
    const r = fam.report;
    const verdict = fam.informational === true ? "informational (no gate)" : fam.verdict;
    lines.push(
      `| ${name} | ${r.n} | ${r.pearson} | ${r.spearman} | ${r.rmse} | ${r.mae} | ${r.bias} | ${verdict} | ${fam.reason} |`,
    );
  }
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // 1. Clearance (mirrors the nflverse-gate.ts pattern). The harness fits
  //    logistic models, which is the registry's definition of model_training;
  //    "storage" is deliberately omitted — that intent means "persist to
  //    database" and report files are not DB rows.
  const clearance = checkClearance({
    source_id: "nflverse",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["derived_analytics", "model_training"],
  });
  if (!clearance.allowed || clearance.rightsSnapshot === null) {
    console.error(
      `[expected-metrics-validation] clearance DENIED for nflverse: ` +
        `[${clearance.blocks.map((b) => b.code).join(", ")}]`,
    );
    process.exit(1);
  }
  const rightsSnapshot = clearance.rightsSnapshot; // point-in-time capture; never mutated

  // 2. Registry gate + both attribution lines.
  assertIngestible("nflverse");
  const registryAttribution = attributionFor("nflverse") ?? "";
  const rightsAttribution = rightsSnapshot.attribution_text ?? "";

  // 3. Fetch (or offline fixture).
  let fetched: FetchedPbp;
  if (options.fixture !== null) {
    const text = readFileSync(options.fixture, "utf8");
    const { records } = parseCsv(text, { columns: NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS });
    fetched = {
      records,
      season: options.season,
      sourceUrl: `fixture:${options.fixture}`,
      servedBy: `fixture:${options.fixture}`,
      attempts: 0,
      fetchTimestamp: new Date().toISOString(),
    };
  } else {
    try {
      fetched = await fetchPbp(options.season, options.timeoutMs);
    } catch (error) {
      console.error(
        `[expected-metrics-validation] ${error instanceof Error ? error.message : "fetch failed"}`,
      );
      process.exit(1);
    }
  }

  // 4. Map (pure, unit-tested).
  const mapped: MappedExpectedMetricsPlays = mapNflversePbpToExpectedMetrics(fetched.records, {
    season: fetched.season,
  });

  // 5. Fit-on-load with the default honesty gates.
  const epModel = fitExpectedPointsModel([...mapped.epPlays]);
  const wpModel = fitWinProbabilityModel([...mapped.wpPlays]);

  // 6. Calibrate vs referee. Pair indices are constructed in-range by the
  //    mapper (structural invariant), justifying the `!` assertions. A length
  //    mismatch inside build*Calibration is a misjoin and exits 2.
  let ep: FamilyCalibration;
  let epa: FamilyCalibration;
  let wp: FamilyCalibration;
  let wpa: FamilyCalibration;
  let ourEpaByPlayId = new Map<string, number>();
  try {
    if (epModel === null) {
      ep = insufficient(`EP model unfit: ${mapped.epPlays.length} plays below the fit floor.`);
      epa = insufficient("EPA requires a fitted EP model.");
    } else {
      const ourEp = mapped.epPlays.map((p) => predictExpectedPoints(epModel, p));
      ep = fromGraduation(graduationVerdict(buildEpCalibration(ourEp, mapped.epRef), DEFAULT_GRADUATION_THRESHOLDS.ep));
      const ourEpa = mapped.epaPairs.map((p) =>
        expectedPointsAdded(epModel, mapped.epPlays[p.beforeIndex]!, mapped.epPlays[p.afterIndex]!, p.possessionChanged),
      );
      const refEpa = mapped.epaPairs.map((p) => p.refDelta);
      epa = {
        // No `epa` family exists in DEFAULT_GRADUATION_THRESHOLDS — graded
        // under the `ep` family (documented in-report).
        ...fromGraduation(graduationVerdict(buildEpCalibration(ourEpa, refEpa), DEFAULT_GRADUATION_THRESHOLDS.ep)),
        thresholdFamily: "ep",
      };
      ourEpaByPlayId = new Map(
        mapped.epaPairs.map((p, k) => [mapped.epPlays[p.beforeIndex]!.playId, ourEpa[k]!] as const),
      );
    }
    if (wpModel === null) {
      wp = insufficient(`WP model unfit: ${mapped.wpPlays.length} plays below the fit floor.`);
      wpa = { ...insufficient("WPA requires a fitted WP model."), informational: true };
    } else {
      const ourWp = mapped.wpPlays.map((p) => predictWinProbability(wpModel, p));
      wp = fromGraduation(graduationVerdict(buildWpCalibration(ourWp, mapped.wpRef), DEFAULT_GRADUATION_THRESHOLDS.wp));
      const ourWpa = mapped.wpaPairs.map((p) =>
        winProbabilityAdded(wpModel, mapped.wpPlays[p.beforeIndex]!, mapped.wpPlays[p.afterIndex]!, p.possessionChanged),
      );
      const refWpa = mapped.wpaPairs.map((p) => p.refDelta);
      wpa = {
        report: buildWpCalibration(ourWpa, refWpa),
        verdict: "insufficient-sample", // unused for informational families
        reason: "Informational only — WPA carries no graduation gate in v1.",
        thresholds: null,
        informational: true,
      };
    }
  } catch (error) {
    console.error(
      `[expected-metrics-validation] INVARIANT VIOLATION (misjoin): ` +
        `${error instanceof Error ? error.message : "unknown"}`,
    );
    process.exit(2);
  }

  // 7. Success + drives rollups.
  const successPlays = [...mapped.successPlays];
  const byTeam = successRateByTeam(successPlays);
  const byDown = successRateByDown(successPlays);
  const bySituation = successRateBySituation(successPlays);
  const byPlayer = successRateByPlayer(successPlays);

  const drivePlays = attachOwnEpa(mapped.drivePlays, ourEpaByPlayId);
  const drives = buildDrives(drivePlays);
  // Partition invariant (same assertion as drives.test.ts's assertPartition).
  const totalPlayCount = drives.reduce((s, d) => s + d.playCount, 0);
  const emittedIds = drives.flatMap((d) => [...d.playIds]).sort();
  const inputIds = drivePlays.map((p) => p.playId).sort();
  const partitionInvariantHolds =
    totalPlayCount === drivePlays.length &&
    emittedIds.length === inputIds.length &&
    emittedIds.every((id, i) => id === inputIds[i]);
  if (!partitionInvariantHolds) {
    console.error(
      `[expected-metrics-validation] INVARIANT VIOLATION: drive partition broke ` +
        `(plays ${drivePlays.length} vs drive playCount total ${totalPlayCount}).`,
    );
    process.exit(2);
  }

  const resultDistribution: Record<string, number> = {};
  let pointsTotal = 0;
  let successRateTotal = 0;
  let startYardlineTotal = 0;
  for (const d of drives) {
    resultDistribution[d.result] = (resultDistribution[d.result] ?? 0) + 1;
    pointsTotal += d.points;
    successRateTotal += d.successRate;
    startYardlineTotal += d.startYardline100;
  }
  const driveCount = drives.length;

  // 8. Artifacts.
  const generatedAt = new Date().toISOString();
  const reportDate = generatedAt.slice(0, 10);

  const provenance = {
    sourceId: "nflverse",
    datasetKey: "pbp",
    releaseTag: "pbp",
    sourceUrl: fetched.sourceUrl,
    servedBy: fetched.servedBy,
    attempts: fetched.attempts,
    fetchTimestamp: fetched.fetchTimestamp,
    license: "CC-BY-4.0",
    attribution: registryAttribution,
    rightsSnapshot, // verbatim from checkClearance (includes the rights-registry attribution_text)
    sourceRows: mapped.counts.sourceRows,
    mapperCounts: mapped.counts,
    columnsProjected: NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS.length,
    ftnColumnsUsed: 0,
  };

  const json = {
    generatedAt,
    script: "scripts/validation/nfl-expected-metrics-validation.ts",
    season: mapped.season,
    seasonType: mapped.seasonType,
    provenance,
    models: {
      ep: epModel === null ? null : epModel.provenance,
      wp: wpModel === null ? null : wpModel.provenance,
    },
    calibration: { grainNote: GRAIN_NOTE, ep, epa, wp, wpa },
    successRate: {
      modelVersion: SUCCESS_RATE_MODEL_VERSION,
      byDown: splitRows(byDown),
      bySituation: splitRows(bySituation),
      teams: byTeam.length,
      qualifiedPlayers: byPlayer.length,
    },
    drives: {
      modelVersion: DRIVES_MODEL_VERSION,
      drives: driveCount,
      plays: drivePlays.length,
      partitionInvariantHolds,
      resultDistribution,
      meanPointsPerDrive: driveCount === 0 ? 0 : round4(pointsTotal / driveCount),
      meanSuccessRate: driveCount === 0 ? 0 : round4(successRateTotal / driveCount),
      meanStartYardline: driveCount === 0 ? 0 : round4(startYardlineTotal / driveCount),
      yardlineFilled: mapped.counts.yardlineFilled,
    },
    claims: {
      scope: "engineering-evidence-only",
      note:
        "Historical, descriptive measurement of agreement between our fitted EP/WP surfaces " +
        "and the nflverse referee columns. Referee values are used only as the y-axis of a " +
        "correlation and are not served. Nothing here is a projection, pick, " +
        "betting-performance figure, or product claim.",
    },
  };

  const md = [
    `# NFL Expected Metrics Validation — season ${mapped.season} (REG)`,
    "",
    `Generated ${generatedAt} by \`scripts/validation/nfl-expected-metrics-validation.ts\`.`,
    "",
    "## Provenance",
    "",
    "| field | value |",
    "|---|---|",
    `| source | nflverse \`pbp\` (release tag \`pbp\`) |`,
    `| season | ${mapped.season} (${mapped.seasonType}) |`,
    `| source URL | ${fetched.sourceUrl} |`,
    `| served by | ${fetched.servedBy} (attempts: ${fetched.attempts}) |`,
    `| fetched at | ${fetched.fetchTimestamp} |`,
    `| license | CC-BY-4.0 |`,
    `| attribution (ingestion registry) | ${registryAttribution} |`,
    `| attribution (rights registry) | ${rightsAttribution} |`,
    `| rights snapshot captured | ${rightsSnapshot.snapshotted_at} (reviewed ${rightsSnapshot.reviewed_at}) |`,
    `| source rows | ${mapped.counts.sourceRows} (REG kept: ${mapped.counts.regRows}) |`,
    `| columns projected | ${NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS.length} of ~372 (FTN/participation columns used: 0) |`,
    "",
    "## Model fits (fit-on-load)",
    "",
    "| model | version | method | sample | feature schema hash |",
    "|---|---|---|---|---|",
    epModel === null
      ? "| EP | (unfit) | - | - | - |"
      : `| EP | ${epModel.provenance.modelVersion} | ${epModel.provenance.method} | ${epModel.provenance.sampleSize} | ${epModel.provenance.featureSchemaHash} |`,
    wpModel === null
      ? "| WP | (unfit) | - | - | - |"
      : `| WP | ${wpModel.provenance.modelVersion} | ${wpModel.provenance.method} | ${wpModel.provenance.sampleSize} | ${wpModel.provenance.featureSchemaHash} |`,
    "",
    "## Calibration vs nflverse referee columns",
    "",
    familyTable([
      ["EP (vs `ep`, non-terminal mask)", ep],
      ["EPA (vs `epa`, paired transitions; graded under the `ep` family)", epa],
      ["WP (vs `wp`, full play grain)", wp],
      ["WPA (vs `wpa`)", wpa],
    ]),
    "",
    `> ${GRAIN_NOTE}`,
    "",
    "## Success rate (deterministic rule, no fit)",
    "",
    `Teams: ${byTeam.length} · qualified players (>=20 plays): ${byPlayer.length} · model ${SUCCESS_RATE_MODEL_VERSION}`,
    "",
    "| split | plays | successes | rate |",
    "|---|---|---|---|",
    ...byDown.map((s) => `| ${s.key} | ${s.plays} | ${s.successes} | ${s.successRate} |`),
    ...bySituation.map((s) => `| ${s.key} | ${s.plays} | ${s.successes} | ${s.successRate} |`),
    "",
    "## Drives (deterministic partition, no fit)",
    "",
    "| field | value |",
    "|---|---|",
    `| drives | ${driveCount} |`,
    `| plays partitioned | ${drivePlays.length} |`,
    `| partition invariant | ${partitionInvariantHolds ? "holds" : "VIOLATED"} |`,
    `| mean points / drive | ${driveCount === 0 ? 0 : round4(pointsTotal / driveCount)} |`,
    `| mean drive success rate | ${driveCount === 0 ? 0 : round4(successRateTotal / driveCount)} |`,
    `| mean start yardline_100 | ${driveCount === 0 ? 0 : round4(startYardlineTotal / driveCount)} |`,
    `| yardline fills (display only) | ${mapped.counts.yardlineFilled} |`,
    "",
    "| result | drives |",
    "|---|---|",
    ...Object.entries(resultDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([result, count]) => `| ${result} | ${count} |`),
    "",
    "## Scope",
    "",
    "Historical, descriptive measurement of agreement between our fitted EP/WP surfaces and",
    "the nflverse referee columns. Referee values are used only as the y-axis of a correlation",
    "and are not served. Nothing here is a projection, pick, betting-performance figure, or",
    "product claim.",
    "",
  ].join("\n");

  // Claims self-scan of the rendered MD prose before writing (voluntary
  // defense-in-depth — scripts/ and reports/ sit outside the CI guardrail's
  // SCAN_TARGETS, so this gate is enforced here).
  const claimHits = scanClaims(md);
  if (claimHits.length > 0) {
    console.error(
      `[expected-metrics-validation] claims self-scan hit(s) in rendered report: ` +
        `[${claimHits.join(", ")}] — refusing to write.`,
    );
    process.exit(2);
  }

  mkdirSync(options.outDir, { recursive: true });
  const jsonPath = join(options.outDir, `${reportDate}-validation.json`);
  const mdPath = join(options.outDir, `${reportDate}-validation.md`);
  writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, md, "utf8");

  console.log(`[expected-metrics-validation] EP:  n=${ep.report.n} pearson=${ep.report.pearson} verdict=${ep.verdict}`);
  console.log(`[expected-metrics-validation] EPA: n=${epa.report.n} pearson=${epa.report.pearson} verdict=${epa.verdict}`);
  console.log(`[expected-metrics-validation] WP:  n=${wp.report.n} pearson=${wp.report.pearson} verdict=${wp.verdict}`);
  console.log(`[expected-metrics-validation] WPA: n=${wpa.report.n} pearson=${wpa.report.pearson} (informational)`);
  console.log(`[expected-metrics-validation] success: teams=${byTeam.length} players=${byPlayer.length}; drives=${driveCount} (partition holds)`);
  console.log(`[expected-metrics-validation] wrote ${jsonPath}`);
  console.log(`[expected-metrics-validation] wrote ${mdPath}`);

  if (options.strict) {
    const gate = (fam: FamilyCalibration): boolean =>
      fam.verdict === "failed" || fam.verdict === "insufficient-sample";
    if (gate(ep) || gate(wp)) {
      console.error("[expected-metrics-validation] --strict: EP or WP did not clear the gate.");
      process.exit(3);
    }
  }
}

main().catch((error) => {
  console.error("[expected-metrics-validation] unexpected error:", error);
  process.exit(2);
});
