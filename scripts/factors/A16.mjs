#!/usr/bin/env node
/**
 * scripts/factors/A16.mjs — C-394 numerical runner for docs/factors/A16.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A16.yaml; arXiv 2507.22472 home-field
 * consistency; 2605.24445 rating uncertainty; 2312.04711 luck-vs-skill):
 *   Out-of-sample ΔBrier of a Bradley–Terry rating with covariates added
 *   as ONE feature on the market logit for REG home-win.
 *
 *   This is NOT the standalone team model (DEAD at 49.83% ATS). The
 *   question is whether the rating carries information the price lacks.
 *
 *   Prequential BT with covariates on games.csv:
 *     logit P(home win) = (θ_home − θ_away) + β_h + β_r·(home_rest − away_rest)
 *                         + β_q·QB-change indicators
 *   Ratings θ are updated online (gradient on the score residual) in
 *   chronological order so each game's factor uses PRIOR games only.
 *   Factor = (θ_home − θ_away) + fitted covariate contribution.
 *
 *   Discover ≤2019; validate 2020–2025. Joint logistic on the market
 *   logit, fitted on discover, scored on validate (§4.2).
 *
 *   kill_line: validate-era ΔBrier >= 0 or P(better) < 0.75 or
 *              discover-vs-validate sign disagrees → DEAD.
 *
 * Data: nfldata games.csv (already cached under packages/verifier/data/).
 *
 * Usage:
 *   node scripts/factors/A16.mjs
 *   node scripts/factors/A16.mjs --no-cache
 */

import path from "node:path";
import {
  REPO_ROOT,
  eraOf, headSha, isReg, loadGames, marketFairHome, mean, round,
  runJointFactor, sigmoid, toNumber, writeYamlBlocked, writeYamlResult,
  normTeam,
} from "./lib/common.mjs";

const TAG = "A16";
const YAML = path.join(REPO_ROOT, "docs", "factors", "A16.yaml");

const DISCOVER_MAX = 2019;
const VALIDATE_MAX = 2025;
const LR = 0.08;
const RIDGE = 0.02;
const MIN_PRIOR_TEAM_GAMES = 8;
const noCache = process.argv.includes("--no-cache");

function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[${TAG}] run_at=${runAt} run_sha=${runSha}`);

  return loadGames({ noCache, tag: TAG })
    .then((gamesRecords) => {
      const rows = [];
      for (const g of gamesRecords) {
        if (!isReg(g)) continue;
        const season = Number(g.season);
        if (season < 1999 || season > VALIDATE_MAX) continue;
        const home = normTeam(g.home_team);
        const away = normTeam(g.away_team);
        if (!home || !away) continue;
        const hs = toNumber(g.home_score);
        const as = toNumber(g.away_score);
        if (hs == null || as == null) continue;
        const outcome = hs > as ? 1 : hs < as ? 0 : null;
        if (outcome === null) continue;
        const mkt = marketFairHome(g.home_moneyline, g.away_moneyline);
        const homeRest = toNumber(g.home_rest);
        const awayRest = toNumber(g.away_rest);
        const homeQb = g.home_qb_name ?? "";
        const awayQb = g.away_qb_name ?? "";
        rows.push({
          season,
          week: Number(g.week) || 0,
          era: season <= DISCOVER_MAX ? "discover" : "validate",
          home,
          away,
          outcome,
          marketFairProb: mkt,
          homeRest: homeRest ?? 7,
          awayRest: awayRest ?? 7,
          homeQb,
          awayQb,
          gameday: g.gameday ?? "",
        });
      }
      rows.sort((a, b) => {
        if (a.season !== b.season) return a.season - b.season;
        return a.week - b.week;
      });

      // Online BT with covariates (prequential).
      const theta = new Map();
      const lastQb = new Map(); // team -> last qb name
      const gamesPlayed = new Map();
      let betaHome = 0.3; // typical home edge prior
      let betaRest = 0;
      let betaQbHome = 0;
      let betaQbAway = 0;

      const rated = [];
      for (const r of rows) {
        const th = theta.get(r.home) ?? 0;
        const ta = theta.get(r.away) ?? 0;
        const gpH = gamesPlayed.get(r.home) ?? 0;
        const gpA = gamesPlayed.get(r.away) ?? 0;
        const enough = gpH >= MIN_PRIOR_TEAM_GAMES && gpA >= MIN_PRIOR_TEAM_GAMES;
        const restDiff = (r.homeRest - r.awayRest) / 7; // weeks
        const qbChangeHome = lastQb.has(r.home) && lastQb.get(r.home) !== r.homeQb && r.homeQb ? 1 : 0;
        const qbChangeAway = lastQb.has(r.away) && lastQb.get(r.away) !== r.awayQb && r.awayQb ? 1 : 0;
        const z =
          (th - ta) +
          betaHome +
          betaRest * restDiff +
          betaQbHome * qbChangeHome +
          betaQbAway * qbChangeAway;
        const p = sigmoid(z);
        const err = r.outcome - p;
        // Factor is the BT+covariate logit BEFORE seeing this game's outcome.
        if (enough && r.marketFairProb != null) {
          rated.push({
            season: r.season,
            era: r.era,
            marketFairProb: r.marketFairProb,
            factor: z,
            outcome: r.outcome,
            home: r.home,
            away: r.away,
          });
        }
        if (enough) {
          // update
          const thNew = th + LR * (err - RIDGE * th);
          const taNew = ta - LR * (err - RIDGE * ta);
          theta.set(r.home, thNew);
          theta.set(r.away, taNew);
          betaHome += 0.25 * LR * err;
          betaRest += 0.05 * LR * err * restDiff;
          betaQbHome += 0.05 * LR * err * qbChangeHome;
          betaQbAway += 0.05 * LR * err * qbChangeAway;
        } else {
          theta.set(r.home, th);
          theta.set(r.away, ta);
        }
        gamesPlayed.set(r.home, gpH + 1);
        gamesPlayed.set(r.away, gpA + 1);
        if (r.homeQb) lastQb.set(r.home, r.homeQb);
        if (r.awayQb) lastQb.set(r.away, r.awayQb);
      }

      console.log(
        `[${TAG}] rated games=${rated.length} β_home=${round(betaHome, 4)} ` +
          `β_rest=${round(betaRest, 4)} β_qbH=${round(betaQbHome, 4)} β_qbA=${round(betaQbAway, 4)}`,
      );
      const teams = [...theta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      console.log(`[${TAG}] top θ: ${teams.map(([t, v]) => `${t}=${round(v, 3)}`).join(", ")}`);

      const discover = rated.filter((r) => r.era === "discover");
      const validate = rated.filter((r) => r.era === "validate");
      console.log(`[${TAG}] joint rows: discover=${discover.length} validate=${validate.length}`);

      if (discover.length < 30 || validate.length < 30) {
        writeYamlBlocked(
          YAML,
          `insufficient rated market rows (discover=${discover.length} validate=${validate.length})`,
          runSha, runAt,
        );
        return 2;
      }

      const joint = runJointFactor(rated);
      console.log(
        `[${TAG}] joint: ΔBrier=${round(joint.deltaBrier, 5)} P(better)=${round(joint.pBetter, 3)} ` +
          `coefD=${round(joint.coefD, 4)} coefV=${round(joint.coefV, 4)} signAgrees=${joint.signAgrees}`,
      );

      if (!joint.ok) {
        writeYamlBlocked(YAML, joint.reason, runSha, runAt);
        return 2;
      }

      // kill_line: ΔBrier >= 0 or P(better) < 0.75 or sign disagrees
      let status;
      if (joint.deltaBrier >= 0 || joint.pBetter < 0.75 || !joint.signAgrees) status = "DEAD";
      else status = "CANDIDATE";
      console.log(`[${TAG}] kill_line check → status=${status}`);

      const notes = [
        "Bradley–Terry rating with covariates (home, rest, QB change) as ONE feature added to the market logit — not the standalone team model (DEAD at 49.83% ATS).",
        "Prequential online BT: each game's factor uses prior games only; logistic joint fit on discover, scored on validate.",
        "C-394; runs after C-379.",
        `C-394 run ${runAt.slice(0, 10)}: REG home-win 1999–2025 games.csv.`,
        `Discover n=${joint.nDiscover}; Validate n=${joint.nValidate}.`,
        `Brier market-only=${round(joint.bBase, 5)} with-factor=${round(joint.bFull, 5)}.`,
        `ΔBrier=${round(joint.deltaBrier, 5)} CI[${round(joint.ci[0], 5)},${round(joint.ci[1], 5)}] ` +
          `P(better)=${round(joint.pBetter, 3)} MDE80=${round(joint.mde, 5)} ` +
          `coefD=${round(joint.coefD, 4)} coefV=${round(joint.coefV, 4)} signAgrees=${joint.signAgrees}.`,
        `Final β_home=${round(betaHome, 4)} β_rest=${round(betaRest, 4)} β_qbH=${round(betaQbHome, 4)} β_qbA=${round(betaQbAway, 4)}.`,
        "arXiv 2507.22472 / 2605.24445 / 2312.04711 cited as priors, not assumed.",
        "Data: nflverse/nfldata games.csv (CC BY 4.0); no DB.",
      ].join(" ");

      writeYamlResult(YAML, {
        status,
        number: joint.deltaBrier,
        ci: joint.ci,
        n: joint.nValidate,
        mde: joint.mde,
        runSha,
        runAt,
        notes,
      });
      console.log(`[${TAG}] wrote ${YAML}`);
      console.log(
        `[${TAG}] RESULT status=${status} number=${round(joint.deltaBrier, 5)} ` +
          `ci=[${round(joint.ci[0], 5)}, ${round(joint.ci[1], 5)}] n=${joint.nValidate}`,
      );
      return 0;
    })
    .catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${TAG}] fatal:`, e);
      return loadGames({ noCache, tag: TAG })
        .catch(() => null)
        .then(() => {
          const runAt = new Date().toISOString();
          const runSha = headSha();
          writeYamlBlocked(YAML, `games.csv / runner failure: ${msg}`, runSha, runAt);
          return 2;
        });
    });
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[${TAG}] fatal:`, err);
    process.exit(1);
  },
);
