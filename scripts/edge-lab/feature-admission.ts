/**
 * FEATURE ADMISSION — the registered path out of FIRE_NOTHING (handoff §2 P3
 * bullet 4 + §5). Runs against REAL nflverse data (CC-BY-4.0):
 *
 *   1. loads historical NFL games with closing lines (same working seasons as
 *      phase 0), SEALS season 2025 as the untouched forward holdout,
 *   2. loads real play-by-play for the WORKING seasons (per-season download,
 *      locally cached under .cache/edge-lab/), folds it once into
 *      per-team-per-game EPA aggregates, and windows those into five
 *      team-form candidate features through the real AsOfFeatureStore
 *      (packages/prediction-engine/src/edge-lab/features/nfl-team-form.ts),
 *   3. records the run configuration itself as a threshold-grid trial (the
 *      family + q choice is a trial too), then records ONE feature_admission
 *      trial per candidate — I(feature; Y | q_close) against the permutation
 *      null — in the tamper-evident trials registry,
 *   4. decides admissions at FAMILY level via Benjamini–Hochberg FDR q=0.10,
 *   5. writes a provenance-stamped report to reports/edge-lab/.
 *
 * THE HONEST FRAME: the closing price already encodes team form heavily, so
 * the LIKELY honest outcome is few-or-zero admissions. A truthful "nothing
 * admitted" is a PASS for this runner — the deliverable is the registered,
 * reproducible answer, not a positive result. If a feature IS admitted it is
 * flagged for adversarial review (possible leak) rather than celebrated.
 *
 * Exit codes: 0 = ran to completion and report written (REGARDLESS of how
 * many features were admitted) · 2 = mechanical failure (clearance denied,
 * fetch failure, corpus too thin, join failure, registry invalid).
 *
 * Run: NODE_OPTIONS=--use-system-ca npx tsx scripts/edge-lab/feature-admission.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkClearance } from "../../apps/web/lib/scraping/clearance-engine";
import { fetchWithFailover, withMirrors } from "../../packages/data-ingestion/src/fetch-failover.js";
import {
  decodeDatasetText,
  nflverseUrl,
  parseCsv,
} from "../../packages/data-ingestion/src/nflverse-source.js";
import {
  assertIngestible,
  attributionFor,
} from "../../packages/data-ingestion/src/source-registry.js";
import { AsOfFeatureStore } from "../../packages/prediction-engine/src/edge-lab/asof-store.js";
import {
  aggregateNflPbpTeamGames,
  buildTeamFormFeatureRows,
  NFL_TEAM_FORM_FEATURE_KEYS,
  NFL_TEAM_FORM_PBP_COLUMNS,
  type TeamFormPbpRow,
} from "../../packages/prediction-engine/src/edge-lab/features/nfl-team-form.js";
import { loadNflGames } from "../../packages/prediction-engine/src/edge-lab/loaders/nfl-games.js";
import { stampProvenance } from "../../packages/prediction-engine/src/edge-lab/provenance.js";
import {
  createTrialsRegistry,
  decideFamilyAdmissions,
  recordFeatureAdmissionTrial,
  recordThresholdGrid,
} from "../../packages/prediction-engine/src/edge-lab/trials-registry.js";
import { sealHoldout } from "../../packages/prediction-engine/src/edge-lab/walk-forward.js";

// ── Registered run configuration (recorded via recordThresholdGrid below) ────

const WORKING_SEASONS = [2019, 2020, 2021, 2022, 2023, 2024];
const HOLDOUT_SEASON = 2025; // SEALED (§2 P0) — never loaded into pbp, never evaluated
const FAMILY = "nfl-team-form-2026-07";
const FDR_Q = 0.1;
const WINDOW = 8; // prior completed games pooled per side
const MIN_HISTORY = 4; // minimum prior games to emit a row (mirrors schedule-features' half-window)
const MIN_PLAYS_PER_GAME = 10; // corrupt-aggregate floor
const PERMUTATIONS = 1000;
const SEED = 20260716;
const FETCH_TIMEOUT_MS = 180_000; // pbp assets are large; scripts have no serverless deadline

// ── PBP fetch with local cache (per-season download, cached under .cache/) ──

interface PbpSeasonProvenance {
  readonly season: number;
  readonly sourceUrl: string;
  /** Mirror URL that actually served the bytes, or "cache:<path>". */
  readonly servedBy: string;
  readonly attempts: number;
  readonly fromCache: boolean;
  readonly fetchedAt: string;
  readonly projectedRows: number;
}

async function loadPbpSeason(
  season: number,
  cacheDir: string,
): Promise<{ records: readonly TeamFormPbpRow[]; provenance: PbpSeasonProvenance }> {
  const url = nflverseUrl("pbp", season);
  const cachePath = join(cacheDir, `play_by_play_${season}.csv`);
  let text: string;
  let servedBy: string;
  let attempts = 0;
  let fromCache = false;
  if (existsSync(cachePath)) {
    text = readFileSync(cachePath, "utf8");
    servedBy = `cache:${cachePath}`;
    fromCache = true;
  } else {
    const result = await fetchWithFailover(withMirrors(url), fetch, {
      timeoutMs: FETCH_TIMEOUT_MS,
    });
    text = await decodeDatasetText(result.response);
    servedBy = result.sourceUrl;
    attempts = result.attempts;
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, text, "utf8");
  }
  const { records } = parseCsv(text, { columns: NFL_TEAM_FORM_PBP_COLUMNS });
  if (records.length === 0) throw new Error(`empty play_by_play asset for season ${season}`);
  return {
    records,
    provenance: {
      season,
      sourceUrl: url,
      servedBy,
      attempts,
      fromCache,
      fetchedAt: new Date().toISOString(),
      projectedRows: records.length,
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(scriptDir, "..", "..");

  // 1. Clearance (CLAUDE.md: every extraction job goes through the engine) +
  //    registry gate + attribution propagation.
  const clearance = checkClearance({
    source_id: "nflverse",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["derived_analytics", "model_training"],
  });
  if (!clearance.allowed || clearance.rightsSnapshot === null) {
    console.error(
      `[feature-admission] clearance DENIED for nflverse: ` +
        `[${clearance.blocks.map((b) => b.code).join(", ")}]`,
    );
    return 2;
  }
  const rightsSnapshot = clearance.rightsSnapshot; // point-in-time capture; never mutated
  assertIngestible("nflverse");
  const registryAttribution = attributionFor("nflverse") ?? "";

  // 2. Games corpus + sealed holdout (identical to phase0-acceptance.ts).
  const games = await loadNflGames({ seasons: [...WORKING_SEASONS, HOLDOUT_SEASON] });
  if (games.length < 1000) {
    console.error(`[feature-admission] too few games (${games.length}) — refusing a stub corpus.`);
    return 2;
  }
  const sealed = sealHoldout(
    games.map((g) => ({ ...g, id: g.gameId, decisionAt: g.startTime, eventEndAt: g.startTime })),
    (row) => row.season === HOLDOUT_SEASON,
  );
  const workingGames = sealed.working;

  // 3. Real play-by-play for the WORKING seasons only — the sealed season's
  //    pbp is never downloaded, so no holdout play can enter any window.
  const cacheDir = join(repoRoot, ".cache", "edge-lab");
  const pbpRecords: TeamFormPbpRow[] = [];
  const pbpProvenance: PbpSeasonProvenance[] = [];
  for (const season of WORKING_SEASONS) {
    const { records, provenance } = await loadPbpSeason(season, cacheDir);
    pbpRecords.push(...records);
    pbpProvenance.push(provenance);
    console.error(
      `[feature-admission] pbp ${season}: ${provenance.projectedRows} rows ` +
        `(${provenance.fromCache ? "cache" : provenance.servedBy})`,
    );
  }
  const aggregates = aggregateNflPbpTeamGames(pbpRecords);

  // 4. Candidate features through the real store, honest as-of discipline.
  const store = new AsOfFeatureStore();
  const { rows, skipped, historyCounts } = buildTeamFormFeatureRows(
    workingGames,
    aggregates,
    store,
    { window: WINDOW, minHistory: MIN_HISTORY, minPlaysPerGame: MIN_PLAYS_PER_GAME },
  );
  store.assertNoLookahead();

  // Mechanical sanity: the pbp↔games join must actually cover the corpus.
  const completedWorking = workingGames.filter(
    (g) => g.homeScore !== null && g.awayScore !== null,
  ).length;
  const joinCoverage = completedWorking === 0 ? 0 : historyCounts.gamesFullyJoined / completedWorking;
  if (rows.length < 500 || joinCoverage < 0.95) {
    console.error(
      `[feature-admission] MECHANICAL FAILURE: eval rows ${rows.length}, ` +
        `pbp join coverage ${(joinCoverage * 100).toFixed(1)}% ` +
        `(${historyCounts.gamesFullyJoined}/${completedWorking} completed games joined, ` +
        `${historyCounts.gamesMissingAggregates} missing aggregates).`,
    );
    return 2;
  }

  // 5. REGISTERED admission flow. The run configuration is recorded FIRST —
  //    the family/q/window choice is itself a trial — then one
  //    feature_admission trial per candidate, then ONE family-level decision.
  const registry = createTrialsRegistry();
  recordThresholdGrid({
    registry,
    family: FAMILY,
    gridName: "run-config",
    recordedAt: startedAt,
    candidates: {
      featureKeys: [...NFL_TEAM_FORM_FEATURE_KEYS],
      workingSeasons: WORKING_SEASONS,
      holdoutSeason: HOLDOUT_SEASON,
      window: WINDOW,
      minHistory: MIN_HISTORY,
      minPlaysPerGame: MIN_PLAYS_PER_GAME,
      fdrQ: FDR_Q,
      permutations: PERMUTATIONS,
      seed: SEED,
    },
    chosen: { fdrQ: FDR_Q, window: WINDOW, minHistory: MIN_HISTORY },
    notes:
      "Single pre-registered configuration — no grid was searched; recorded so the trial count stays honest.",
  });

  const outcomes = rows.map((r) => r.y);
  const qClose = rows.map((r) => r.qClose);
  for (const featureKey of NFL_TEAM_FORM_FEATURE_KEYS) {
    const values = rows.map((r) => {
      const v = r.features.get(featureKey);
      if (v === undefined) {
        throw new Error(`feature ${featureKey} missing on row ${r.id} — builder invariant broken`);
      }
      return v;
    });
    recordFeatureAdmissionTrial({
      registry,
      family: FAMILY,
      featureKey,
      recordedAt: new Date().toISOString(),
      values,
      outcomes,
      qClose,
      permutations: PERMUTATIONS,
      seed: SEED,
      notes: `prior-${WINDOW}-game pooled team-form diff from real nflverse pbp (${WORKING_SEASONS[0]}–${WORKING_SEASONS[WORKING_SEASONS.length - 1]})`,
    });
  }
  const admissions = decideFamilyAdmissions(registry, FAMILY, FDR_Q);
  const chainCheck = registry.verify();
  if (!chainCheck.valid) {
    console.error(`[feature-admission] registry chain invalid at seq ${chainCheck.brokenSeq}`);
    return 2;
  }

  // 6. Report.
  const trialsByKey = new Map(
    registry
      .entries()
      .filter((e) => e.kind === "feature_admission")
      .map((e) => {
        const params = e.params as { featureKey?: string; n?: number; strata?: number };
        return [params.featureKey ?? "", e] as const;
      }),
  );
  const perFeature = admissions.decisions.map((d) => {
    const trial = d.featureKey !== null ? trialsByKey.get(d.featureKey) : undefined;
    const params = (trial?.params ?? {}) as { n?: number; strata?: number; permutations?: number };
    return {
      featureKey: d.featureKey,
      miNats: trial?.statistic ?? null,
      pValue: d.pValue,
      bhAdjustedP: d.adjustedP,
      admitted: d.admitted,
      n: params.n ?? null,
      strata: params.strata ?? null,
      permutations: params.permutations ?? null,
    };
  });

  const anyAdmitted = admissions.admittedKeys.length > 0;
  const interpretation = anyAdmitted
    ? `${admissions.admittedKeys.length} of ${perFeature.length} candidates cleared BH-FDR at q=${FDR_Q} ` +
      `(${admissions.admittedKeys.join(", ")}). DO NOT treat this as edge: an admission at this stage is a ` +
      `red flag for leakage before it is evidence of signal, because the closing price already encodes team ` +
      `form heavily. Leading benign-but-not-edge explanation to rule out FIRST: the MI probe conditions on ` +
      `q_close via coarse equal-mass strata, and a feature this correlated with the price can pick up ` +
      `RESIDUAL WITHIN-STRATUM MARKET INFORMATION (reconstructing the close, not beating it). Required next ` +
      `checks before ANY downstream use, each as a NEW registered family (never silent re-runs): ` +
      `(1) finer-conditioning re-probe — more q strata / score bins, fresh seeds — expecting the MI to shrink ` +
      `if it is residual-market artifact; (2) adversarial leak review of the windowing and observedAt stamps ` +
      `for the admitted key(s), plus the shuffled-time placebo on exactly these features; (3) walk-forward ` +
      `EV-vs-close with the admitted key(s) added to the Phase-1 logit-pool, expecting the β test — not this ` +
      `MI probe — to be the binding gate.`
    : `Zero of ${perFeature.length} candidates cleared BH-FDR at q=${FDR_Q}. This is the expected honest ` +
      `outcome: the closing price already prices public team form (EPA/play, success rate, pass rate are ` +
      `exactly what market participants model), so conditional on q_close these windows carry no measurable ` +
      `extra information about the outcome at this corpus size. The deliverable stands: the admission flow is ` +
      `registered, reproducible (fixed seed, cached inputs, hash-chained trials), and the FIRE_NOTHING verdict ` +
      `remains honestly in force. The registered next moves are candidates the market prices LESS completely — ` +
      `decision-time injury/availability deltas and line-movement microstructure once the line archive ` +
      `accumulates — through this same trial flow, never around it.`;

  const report = {
    runner: "feature-admission",
    startedAt,
    finishedAt: new Date().toISOString(),
    data: {
      gamesSource: "nflverse/nfldata games.csv (CC-BY-4.0)",
      pbpSource: "nflverse-data play_by_play_<season>.csv (CC-BY-4.0)",
      attribution: registryAttribution,
      rightsSnapshot: JSON.parse(JSON.stringify(rightsSnapshot)) as unknown,
      workingSeasons: WORKING_SEASONS,
      gamesLoaded: games.length,
      sealedHoldout: { season: HOLDOUT_SEASON, ...sealed.holdoutSummary, pbpDownloaded: false },
      pbpSeasons: pbpProvenance,
      pbpAggregation: aggregates.counts,
      evalRows: rows.length,
      skipped,
      historyCounts,
      pbpJoinCoverage: joinCoverage,
      teamCodeNote:
        "GameRow era codes canonicalized to pbp's retroactive current codes (OAK→LV, SD→LAC, STL→LA) " +
        "at the join — found and fixed after a first run left all 16 games of 2019 OAK unjoined; " +
        "disclosed here because the repair post-dates one sight of the family's numbers.",
    },
    config: {
      family: FAMILY,
      fdrQ: FDR_Q,
      window: WINDOW,
      minHistory: MIN_HISTORY,
      minPlaysPerGame: MIN_PLAYS_PER_GAME,
      permutations: PERMUTATIONS,
      seed: SEED,
    },
    features: perFeature,
    familyDecision: {
      family: admissions.family,
      q: admissions.q,
      admittedKeys: admissions.admittedKeys,
      admittedSetHash: admissions.admittedSetHash,
      trialsInFamily: registry.family(FAMILY).length,
    },
    trialsRegistry: {
      chainValid: chainCheck.valid,
      entries: registry.entries().map((e) => ({
        seq: e.seq,
        trialId: e.trialId,
        kind: e.kind,
        recordedAt: e.recordedAt,
        pValue: e.pValue,
        statistic: e.statistic ?? null,
        outcome: e.outcome,
        prevHash: e.prevHash,
        hash: e.hash,
      })),
    },
    interpretation,
    noLookaheadCertificate:
      "AsOfFeatureStore.assertNoLookahead() passed over the full served audit",
  };

  const stamp = stampProvenance({
    producer: "edge-lab/feature-admission",
    asOf: startedAt,
    inputs: {
      family: FAMILY,
      fdrQ: FDR_Q,
      window: WINDOW,
      minHistory: MIN_HISTORY,
      minPlaysPerGame: MIN_PLAYS_PER_GAME,
      permutations: PERMUTATIONS,
      seed: SEED,
      workingSeasons: WORKING_SEASONS,
      holdoutSeason: HOLDOUT_SEASON,
      evalRows: rows.length,
      featureKeys: [...NFL_TEAM_FORM_FEATURE_KEYS],
    },
    output: JSON.parse(JSON.stringify(report)),
  });

  const outDir = join(repoRoot, "reports", "edge-lab");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "feature-admission-nfl.json"),
    JSON.stringify({ report, provenance: stamp }, null, 2),
  );

  const fmt = (v: number | null, digits: number): string => (v === null ? "n/a" : v.toFixed(digits));
  const md = [
    "# Feature admission — NFL team-form candidates (real nflverse data)",
    "",
    `Generated ${report.finishedAt} by \`scripts/edge-lab/feature-admission.ts\` (provenance ${stamp.inputsHash.slice(0, 16)}…, model ${stamp.modelVersion}).`,
    "",
    "The registered attempt at a path out of FIRE_NOTHING: five prior-window team-form",
    "features from real play-by-play, each tried ONCE through the trials registry",
    `(family \`${FAMILY}\`) with the market-conditional MI probe I(feature; Y | q_close)`,
    `against a ${PERMUTATIONS}-draw permutation null, decided together under BH-FDR q=${FDR_Q}.`,
    "",
    "| item | value |",
    "|---|---|",
    `| games loaded | ${games.length} (${WORKING_SEASONS[0]}–${HOLDOUT_SEASON}) |`,
    `| sealed holdout | season ${HOLDOUT_SEASON}: ${sealed.holdoutSummary.count} games — NEVER evaluated, pbp never downloaded |`,
    `| pbp rows (projected) | ${aggregates.counts.sourceRows} → ${aggregates.counts.usableRows} usable scrimmage plays, ${aggregates.counts.games} games |`,
    `| eval rows | ${rows.length} (skipped: ${JSON.stringify(skipped)}) |`,
    `| pbp↔games join | ${historyCounts.gamesFullyJoined}/${completedWorking} completed games (${(joinCoverage * 100).toFixed(1)}%) |`,
    `| window | last ${WINDOW} completed games, min ${MIN_HISTORY}, pooled per-play |`,
    `| family decision | **${admissions.admittedKeys.length} of ${perFeature.length} admitted** at BH-FDR q=${FDR_Q} |`,
    `| admitted set hash | ${admissions.admittedSetHash.slice(0, 16)}… |`,
    `| trials chain | ${chainCheck.valid ? "valid" : "BROKEN"} (${registry.entries().length} entries incl. run-config grid) |`,
    "",
    "## Per-feature trials (each recorded BEFORE the family decision)",
    "",
    "| feature | MI (nats) | p | BH-adj p | admitted |",
    "|---|---|---|---|---|",
    ...perFeature.map(
      (f) =>
        `| \`${f.featureKey ?? "?"}\` | ${fmt(f.miNats, 5)} | ${fmt(f.pValue, 4)} | ${fmt(f.bhAdjustedP, 4)} | ${f.admitted ? "**YES — flag for adversarial review**" : "no"} |`,
    ),
    "",
    "## Honest interpretation",
    "",
    interpretation,
    "",
    "## Expectation management (written before the numbers existed)",
    "",
    "The closing price already prices team form heavily — public EPA/success/pass-rate",
    "aggregates are the most-modeled quantities in this market — so few-or-zero admissions",
    "was the expected honest outcome of this run. The deliverable is the REGISTERED,",
    "reproducible answer with real numbers, not a positive result. An admission here would",
    "be treated first as a possible leak (adversarial review + shuffled-time placebo on the",
    "admitted key) and only after surviving that as candidate signal.",
    "",
    `Attribution: ${registryAttribution}`,
  ].join("\n");
  writeFileSync(join(outDir, "feature-admission-nfl.md"), md);

  console.log(md);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[feature-admission] mechanical failure:", err);
    process.exit(2);
  });
