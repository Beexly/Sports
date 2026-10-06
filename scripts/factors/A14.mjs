#!/usr/bin/env node
/**
 * scripts/factors/A14.mjs — C-378 numerical runner for docs/factors/A14.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A14.yaml):
 *   Out-of-sample ΔBrier of FTN charting pressure/coverage/motion rates
 *   added to a props-style receiving baseline.
 *
 *   A26 finding (cited, not invented): the public ftn_charting release has
 *   NO man/zone coverage column (verified 2022–2025). Proxies used here:
 *     n_defense_box, n_blitzers, n_pass_rushers  (pressure / box)
 *     is_motion, is_play_action, is_screen_pass, is_rpo  (offensive rates)
 *
 *   Unit: WR/TE/RB player-game. Baseline = logistic on trailing receiving
 *   yards (prior games only). Full model adds the OPPONENT defense's
 *   season-to-date prior FTN rates for that game. Binary outcome =
 *   receiving_yards >= player trailing-3-game median (props over/under
 *   shape without a posted line — never invent a book line).
 *
 *   kill_line: validate-era ΔBrier >= 0 or P(better) < 0.75 → DEAD.
 *
 * Data: ftn_charting 2022–2025 (fetched directly, catalogued in
 * nflverse-source.ts; C-395 loader already pulled 2024), player_stats
 * combined, games.csv. Discover 2022–2023 / validate 2024–2025.
 *
 * Usage:
 *   node scripts/factors/A14.mjs
 *   node scripts/factors/A14.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  FTN_URL, eraOf, headSha, loadCachedText, loadTextCached,
  normTeam, pairedBootstrap, parseCsv, round, fitLogistic,
  logisticPredict, brierScore, mean, Z_95, Z_SUM_80PCT,
  writeYamlBlocked, writeYamlResult,
} from "./lib/common.mjs";

const TAG = "A14";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A14.yaml");

const FTN_SEASONS = [2022, 2023, 2024, 2025];
const DISCOVER_MIN = 2022;
const DISCOVER_MAX = 2023;
const VALIDATE_MIN = 2024;
const VALIDATE_MAX = 2025;
const TRAILING_GAMES = 3;
const MIN_PRIOR_FTN_GAMES = 3;
const MIN_TARGETS = 2;
const RECEIVING_POS = new Set(["WR", "TE", "RB"]);
const noCache = process.argv.includes("--no-cache");

const FTN_COLS = [
  "nflverse_game_id", "season", "week", "n_defense_box", "is_motion",
  "is_play_action", "is_screen_pass", "is_rpo", "n_blitzers", "n_pass_rushers",
];

const PS_COLS = [
  "player_id", "player_display_name", "position", "recent_team", "season",
  "week", "season_type", "opponent_team", "receiving_yards", "targets",
  "receptions",
];

function parseBool(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1") return 1;
  if (s === "false" || s === "0") return 0;
  return null;
}

function toNum(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Aggregate FTN rows to team-game defensive/offensive rates.
 * FTN rows are offense-facing: n_defense_box / blitzers are the defense
 * the offense is looking at. We key by (game, offense team) and also
 * store the defense team via games.csv join later.
 */
function aggregateFtn(records) {
  const byGameOffense = new Map();
  for (const r of records) {
    const gid = r.nflverse_game_id;
    if (!gid) continue;
    // gid looks like 2024_10_CIN_BAL → season_week_away_home
    const parts = String(gid).split("_");
    if (parts.length < 4) continue;
    const season = toNum(parts[0]);
    const week = toNum(parts[1]);
    const away = normTeam(parts[2]);
    const home = normTeam(parts[3]);
    // We do not have posteam on every FTN row in the projected set — use
    // play-level aggregates keyed by game, then split by offense later via
    // nflverse_play_id if needed. Here: game-level mean rates for both
    // sides cannot be split without posteam, so we keep GAME-level rates
    // and attach them as the opponent-defense context for both teams.
    // (Honest: this is a game-context FTN rate, not a pure defense split.)
    const key = gid;
    let e = byGameOffense.get(key);
    if (!e) {
      e = {
        season, week, away, home,
        n: 0, box: [], blitz: [], rush: [], motion: [], pa: [], screen: [], rpo: [],
      };
      byGameOffense.set(key, e);
    }
    const box = toNum(r.n_defense_box);
    const blitz = toNum(r.n_blitzers);
    const rush = toNum(r.n_pass_rushers);
    if (box != null) e.box.push(box);
    if (blitz != null) e.blitz.push(blitz);
    if (rush != null) e.rush.push(rush);
    const m = parseBool(r.is_motion);
    const pa = parseBool(r.is_play_action);
    const sc = parseBool(r.is_screen_pass);
    const rpo = parseBool(r.is_rpo);
    if (m != null) e.motion.push(m);
    if (pa != null) e.pa.push(pa);
    if (sc != null) e.screen.push(sc);
    if (rpo != null) e.rpo.push(rpo);
    e.n += 1;
  }
  const out = new Map();
  for (const [gid, e] of byGameOffense) {
    if (e.n < 20) continue;
    out.set(gid, {
      season: e.season,
      week: e.week,
      away: e.away,
      home: e.home,
      meanBox: mean(e.box),
      meanBlitz: mean(e.blitz),
      meanRush: mean(e.rush),
      motionRate: mean(e.motion),
      paRate: mean(e.pa),
      screenRate: mean(e.screen),
      rpoRate: mean(e.rpo),
      n: e.n,
    });
  }
  return out;
}

/** Season-to-date prior FTN rates for a team's upcoming game (defense context). */
function priorFtnForTeam(ftnByGame, team, season, week) {
  // Collect that team's prior games this season as the opponent they faced.
  const priors = [];
  for (const [, e] of ftnByGame) {
    if (e.season !== season) continue;
    if (e.week >= week) continue;
    if (e.home !== team && e.away !== team) continue;
    priors.push(e);
  }
  if (priors.length < MIN_PRIOR_FTN_GAMES) return null;
  return {
    meanBox: mean(priors.map((p) => p.meanBox)),
    meanBlitz: mean(priors.map((p) => p.meanBlitz)),
    meanRush: mean(priors.map((p) => p.meanRush)),
    motionRate: mean(priors.map((p) => p.motionRate)),
    paRate: mean(priors.map((p) => p.paRate)),
    screenRate: mean(priors.map((p) => p.screenRate)),
    rpoRate: mean(priors.map((p) => p.rpoRate)),
    nGames: priors.length,
  };
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  if (a.length === 0) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

async function loadFtn() {
  const all = [];
  for (const season of FTN_SEASONS) {
    const name = `ftn_charting_${season}.csv`;
    const { text, fromCache } = await loadTextCached(name, FTN_URL(season), { noCache, tag: TAG });
    console.log(`[${TAG}] ftn ${season}: ${fromCache ? "cache" : "fetched"} bytes=${text.length}`);
    const { records } = parseCsv(text, FTN_COLS);
    console.log(`[${TAG}] ftn ${season}: rows=${records.length}`);
    all.push(...records);
  }
  return all;
}

async function loadPlayerStats() {
  // Already-present combined file (plain CSV despite the .gz name).
  let text = loadCachedText("player_stats_combined.csv.gz", { noCache }) ??
    loadCachedText("player_stats_combined.csv", { noCache });
  if (text == null) {
    throw new Error("player_stats_combined not in packages/verifier/data/");
  }
  const { records } = parseCsv(text, PS_COLS);
  console.log(`[${TAG}] player_stats rows=${records.length}`);
  return records;
}

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  let ftnRecords;
  try {
    ftnRecords = await loadFtn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `ftn_charting unreachable: ${msg}`, runSha, runAt);
    return 2;
  }

  let psRecords;
  try {
    psRecords = await loadPlayerStats();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeYamlBlocked(YAML, `player_stats unavailable: ${msg}`, runSha, runAt);
    return 2;
  }

  const ftnByGame = aggregateFtn(ftnRecords);
  console.log(`[${TAG}] ftn game aggregates: ${ftnByGame.size}`);

  // Build player-game rows with trailing baseline + opponent prior FTN.
  const byPlayer = new Map();
  for (const r of psRecords) {
    if ((r.season_type ?? "").toUpperCase() !== "REG") continue;
    const pos = (r.position ?? "").toUpperCase();
    if (!RECEIVING_POS.has(pos)) continue;
    const season = toNum(r.season);
    const week = toNum(r.week);
    if (season == null || week == null) continue;
    if (season < DISCOVER_MIN || season > VALIDATE_MAX) continue;
    const targets = toNum(r.targets);
    const yards = toNum(r.receiving_yards);
    if (targets == null || targets < MIN_TARGETS || yards == null) continue;
    const pid = r.player_id || r.player_display_name;
    if (!pid) continue;
    const key = `${pid}|${season}`;
    const list = byPlayer.get(key) ?? [];
    list.push({
      pid,
      season,
      week,
      team: normTeam(r.recent_team),
      opp: normTeam(r.opponent_team),
      yards,
      targets,
      pos,
    });
    byPlayer.set(key, list);
  }

  const samples = [];
  for (const [, list] of byPlayer) {
    list.sort((a, b) => a.week - b.week);
    const hist = [];
    for (const g of list) {
      if (hist.length >= TRAILING_GAMES) {
        const trailYards = hist.map((h) => h.yards);
        const trailMean = mean(trailYards);
        const trailMed = median(trailYards);
        // Opponent defense prior FTN = the rates the OPPONENT defense has
        // been charted with this season (game-context proxy; see header).
        const ftn = priorFtnForTeam(ftnByGame, g.opp, g.season, g.week);
        if (!ftn) {
          hist.push(g);
          continue;
        }
        samples.push({
          season: g.season,
          week: g.week,
          era: eraOf(g.season, DISCOVER_MIN, DISCOVER_MAX, VALIDATE_MIN, VALIDATE_MAX),
          pid: g.pid,
          trailMean,
          trailMed,
          yards: g.yards,
          outcome: g.yards >= trailMed ? 1 : 0,
          ftn,
        });
      }
      hist.push(g);
    }
  }

  const discover = samples.filter((s) => s.era === "discover");
  const validate = samples.filter((s) => s.era === "validate");
  console.log(`[${TAG}] player-game samples: discover=${discover.length} validate=${validate.length}`);

  if (discover.length < 80 || validate.length < 80) {
    writeYamlBlocked(
      YAML,
      `insufficient FTN-joined player-games (discover=${discover.length} validate=${validate.length})`,
      runSha, runAt,
    );
    return 2;
  }

  const baseX = (s) => [s.trailMean / 50]; // scale yards
  const fullX = (s) => [
    s.trailMean / 50,
    s.ftn.meanBox,
    s.ftn.meanBlitz,
    s.ftn.motionRate,
    s.ftn.paRate,
    s.ftn.screenRate,
    s.ftn.rpoRate,
  ];

  const betaBase = fitLogistic(discover.map(baseX), discover.map((s) => s.outcome));
  const betaFull = fitLogistic(discover.map(fullX), discover.map((s) => s.outcome));
  if (!betaBase || !betaFull) {
    writeYamlBlocked(YAML, "logistic fit failed on discover era", runSha, runAt);
    return 2;
  }

  const yv = validate.map((s) => s.outcome);
  const pBase = logisticPredict(betaBase, validate.map(baseX));
  const pFull = logisticPredict(betaFull, validate.map(fullX));
  const baseLoss = pBase.map((p, i) => brierScore(p, yv[i]));
  const fullLoss = pFull.map((p, i) => brierScore(p, yv[i]));
  const bBase = mean(baseLoss);
  const bFull = mean(fullLoss);
  const deltaBrier = bFull - bBase;
  const boot = pairedBootstrap(fullLoss, baseLoss);
  const diffs = fullLoss.map((v, i) => v - baseLoss[i]);
  const dMean = mean(diffs);
  let ss = 0;
  for (const d of diffs) ss += (d - dMean) ** 2;
  const se = Math.sqrt(ss / (diffs.length * (diffs.length - 1)));
  const ci = [dMean - Z_95 * se, dMean + Z_95 * se];
  const mde = Z_SUM_80PCT * se;

  console.log(
    `[${TAG}] Brier baseline=${round(bBase, 5)} with-FTN=${round(bFull, 5)} ` +
      `ΔBrier=${round(deltaBrier, 5)} P(better)=${round(boot.pBetter, 3)}`,
  );

  const status = deltaBrier >= 0 || boot.pBetter < 0.75 ? "DEAD" : "CANDIDATE";
  console.log(`[${TAG}] kill_line check → status=${status}`);

  const notes = [
    "Closest thing to tracking we can legally have. A26: NO man/zone column in the public ftn_charting release — proxies are n_defense_box, n_blitzers, n_pass_rushers plus motion/PA/screen/RPO rates.",
    "FTN rates are game-context (not a pure defense split) because the projected FTN set lacks a posteam column; attached as opponent prior-season-to-date context.",
    "Props shape without a posted line: outcome = receiving_yards >= trailing-3-game median; baseline = trailing mean yards only.",
    "C-378.",
    `C-378 run ${runAt.slice(0, 10)}: WR/TE/RB REG 2022–2025.`,
    `Discover n=${discover.length}; Validate n=${validate.length}.`,
    `Brier baseline=${round(bBase, 5)} with-FTN=${round(bFull, 5)}.`,
    `ΔBrier=${round(deltaBrier, 5)} CI[${round(ci[0], 5)},${round(ci[1], 5)}] ` +
      `P(better)=${round(boot.pBetter, 3)} MDE80=${round(mde, 5)}.`,
    "Data: nflverse ftn_charting + player_stats + nfldata games.csv (CC BY 4.0); no DB.",
    "Big Data Bowl tracking is CC BY-NC-4.0 non-commercial and closed.",
  ].join(" ");

  writeYamlResult(YAML, {
    status,
    number: deltaBrier,
    ci,
    n: validate.length,
    mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[${TAG}] wrote ${YAML}`);
  console.log(
    `[${TAG}] RESULT status=${status} number=${round(deltaBrier, 5)} ` +
      `ci=[${round(ci[0], 5)}, ${round(ci[1], 5)}] n=${validate.length}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
