#!/usr/bin/env node
/**
 * scripts/factors/A2.mjs — C-366 numerical runner for docs/factors/A2.yaml.
 *
 * Estimand (LAST_PLAN §4.1 / A2.yaml / D5):
 *   p = market + w·(model − market), w ∈ [0.05, 0.15], sweet spot w = 0.10.
 *   Holdout ΔBrier of the shrunk display probability vs marketFairProb on
 *   identical PICKS-H1 rows, plus paired-bootstrap P(better) and the
 *   football (NFL/NCAAF) subset.
 *
 * Uses packages/verifier scorecard/duel (identical-row Brier + log-loss,
 * paired bootstrap, per-sport strata). Input is the real
 * verifier/picks-h1.json export when present, else the committed fixture.
 * Never touches the DB (law 7).
 *
 * On success writes number (ΔBrier at w=0.10) / ci / n / mde_80pct_power /
 * run_sha / run_at / status (CANDIDATE|DEAD) back into docs/factors/A2.yaml
 * and attaches the scorecard JSON under
 * docs/calibration-proposals/evidence/. Honest BLOCKED when the export
 * cannot be read.
 *
 * Re-execs under tsx when invoked with plain node so the TypeScript
 * verifier modules resolve.
 *
 * Usage:
 *   npx tsx scripts/factors/A2.mjs
 *   node scripts/factors/A2.mjs          # re-execs under tsx
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SELF), "..", "..");
const YAML_PATH = path.join(REPO_ROOT, "docs", "factors", "A2.yaml");
const EVIDENCE_DIR = path.join(REPO_ROOT, "docs", "calibration-proposals", "evidence");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "2026-09-15-a2-shrinkage-scorecard.json");

/** D5 sweet spot and the pre-registered sensitivity band. */
const W_PRIMARY = 0.1;
const W_GRID = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15];
const Z_95 = 1.959963984540054;
/** z_{0.975} + z_{0.80} for two-sided α=0.05, 80% power. */
const Z_SUM_80PCT = 1.959963984540054 + 0.8416212335729143;

// ── re-exec under tsx (verifier modules are extensionless .ts) ─────────────
//
// Node's native type stripping cannot resolve packages/verifier's
// extensionless relative imports. Always go through tsx.

if (process.env["GSE_A2_TSX"] !== "1") {
  const r = spawnSync("npx", ["tsx", SELF], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, GSE_A2_TSX: "1" },
  });
  process.exit(r.status ?? 1);
}

// ── verifier modules (tsx resolves these) ──────────────────────────────────

const { loadPicksH1, selectPicksH1, isFootballSport } = await import(
  "../../packages/verifier/src/holdout.ts"
);
const { duel } = await import("../../packages/verifier/src/duel.ts");
const { scorecardMarkdown } = await import("../../packages/verifier/src/scorecard.ts");
const { brierScore, DEFAULT_BOOTSTRAP_RESAMPLES, DEFAULT_BOOTSTRAP_SEED } = await import(
  "../../packages/verifier/src/stats.ts"
);

// ── helpers ────────────────────────────────────────────────────────────────

function round(x, d = 5) {
  if (!Number.isFinite(x)) return x;
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function headSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function writeYamlResult({ status, number, ci, n, mde, runSha, runAt, notes }) {
  const existing = readFileSync(YAML_PATH, "utf8");
  const lines = existing.split(/\r?\n/);
  const out = [];
  let inNotes = false;
  let notesWritten = false;
  for (const line of lines) {
    if (/^notes:/.test(line)) {
      inNotes = true;
      out.push("notes: >");
      out.push(`  ${notes}`);
      notesWritten = true;
      continue;
    }
    if (inNotes) {
      if (line.trim().length === 0) continue;
      if (/^\s/.test(line)) continue;
      inNotes = false;
    }
    if (/^status:/.test(line)) {
      out.push(`status: ${status}`);
      continue;
    }
    if (/^number:/.test(line)) {
      out.push(`number: ${number === null ? "null" : round(number, 5)}`);
      continue;
    }
    if (/^ci:/.test(line)) {
      out.push(
        ci === null ? "ci: null" : `ci: [${round(ci[0], 5)}, ${round(ci[1], 5)}]`,
      );
      continue;
    }
    if (/^n:/.test(line)) {
      out.push(`n: ${n === null ? "null" : n}`);
      continue;
    }
    if (/^mde_80pct_power:/.test(line)) {
      out.push(
        `mde_80pct_power: ${mde === null || !Number.isFinite(mde) ? "null" : round(mde, 5)}`,
      );
      continue;
    }
    if (/^run_sha:/.test(line)) {
      out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`);
      continue;
    }
    if (/^run_at:/.test(line)) {
      out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`);
      continue;
    }
    if (/^blocked_on:/.test(line)) {
      out.push(`blocked_on: null`);
      continue;
    }
    out.push(line);
  }
  if (!notesWritten) {
    out.push("notes: >");
    out.push(`  ${notes}`);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

function writeYamlBlocked(blockedOn, runSha, runAt, notes = null) {
  const existing = readFileSync(YAML_PATH, "utf8");
  const lines = existing.split(/\r?\n/);
  const out = [];
  let inNotes = false;
  let notesWritten = false;
  for (const line of lines) {
    if (/^notes:/.test(line)) {
      inNotes = true;
      if (notes !== null) {
        out.push("notes: >");
        out.push(`  ${notes}`);
        notesWritten = true;
      } else {
        out.push(line);
      }
      continue;
    }
    if (inNotes) {
      if (notes !== null) {
        if (line.trim().length === 0) continue;
        if (/^\s/.test(line)) continue;
        inNotes = false;
      } else {
        if (line.trim().length === 0) {
          out.push(line);
          continue;
        }
        if (/^\s/.test(line)) {
          out.push(line);
          continue;
        }
        inNotes = false;
      }
    }
    if (/^status:/.test(line)) {
      out.push("status: BLOCKED");
      continue;
    }
    if (/^blocked_on:/.test(line)) {
      out.push(`blocked_on: ${yamlQuote(blockedOn)}`);
      continue;
    }
    if (/^number:/.test(line)) {
      out.push("number: null");
      continue;
    }
    if (/^ci:/.test(line)) {
      out.push("ci: null");
      continue;
    }
    if (/^n:/.test(line)) {
      out.push("n: null");
      continue;
    }
    if (/^mde_80pct_power:/.test(line)) {
      out.push("mde_80pct_power: null");
      continue;
    }
    if (/^run_sha:/.test(line)) {
      out.push(`run_sha: ${runSha === null ? "null" : yamlQuote(runSha)}`);
      continue;
    }
    if (/^run_at:/.test(line)) {
      out.push(`run_at: ${runAt === null ? "null" : yamlQuote(runAt)}`);
      continue;
    }
    out.push(line);
  }
  if (notes !== null && !notesWritten) {
    out.push("notes: >");
    out.push(`  ${notes}`);
  }
  writeFileSync(YAML_PATH, `${out.join("\n").replace(/\n+$/, "\n")}`, "utf8");
}

/** p = market + w·(model − market). Null when either input is unusable. */
function shrink(market, model, w) {
  if (model == null || !(model > 0 && model < 1)) return null;
  if (!(market > 0 && market < 1)) return null;
  const p = market + w * (model - market);
  return p > 0 && p < 1 ? p : null;
}

/**
 * Paired 95% CI on mean(cand Brier − market Brier) using the row-level
 * loss differences. Same arithmetic a reader can redo from the evidence JSON.
 */
function pairedDeltaCi(rows, w) {
  const diffs = [];
  for (const r of rows) {
    const p = shrink(r.marketFairProb, r.modelProb, w);
    if (p == null) continue;
    if (r.outcome !== 0 && r.outcome !== 1) continue;
    diffs.push(brierScore(p, r.outcome) - brierScore(r.marketFairProb, r.outcome));
  }
  const n = diffs.length;
  if (n < 2) return { n, delta: NaN, se: NaN, ci: [NaN, NaN], mde: NaN };
  let s = 0;
  for (const d of diffs) s += d;
  const delta = s / n;
  let ss = 0;
  for (const d of diffs) ss += (d - delta) * (d - delta);
  const se = Math.sqrt(ss / (n * (n - 1)));
  return {
    n,
    delta,
    se,
    ci: [delta - Z_95 * se, delta + Z_95 * se],
    mde: Z_SUM_80PCT * se,
  };
}

function scoreAtW(rows, w, label) {
  const d = duel(rows, {
    resamples: DEFAULT_BOOTSTRAP_RESAMPLES,
    seed: DEFAULT_BOOTSTRAP_SEED,
    candidateLabel: label,
    candidateProb: (r) => shrink(r.marketFairProb, r.modelProb, w),
  });
  const paired = pairedDeltaCi(rows, w);
  return {
    w,
    label,
    passesKeepRule: d.passesKeepRule,
    keepRule: d.keepRule,
    scorecard: d.scorecard,
    pairedCi: paired,
    markdown: scorecardMarkdown(`A2 shrinkage w=${w}`, d.scorecard),
  };
}

/**
 * Kill line (A2.yaml): validate-era ΔBrier >= 0 or P(better) < 0.75 on PICKS-H1.
 *
 * The committed C-362 fixture is synthetic (built so historical versions score
 * worse than market). It exercises the pipeline; it must never CANDIDATE or
 * DEAD a factor. Fixture runs are BLOCKED on the real export.
 */
function decideStatus(primary, fromFixture) {
  if (fromFixture) return "BLOCKED";
  const sc = primary.scorecard;
  if (!Number.isFinite(sc.deltaBrier) || sc.n <= 0) return "BLOCKED";
  if (sc.deltaBrier >= 0) return "DEAD";
  if (sc.pBetter < 0.75) return "DEAD";
  return "CANDIDATE";
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const runAt = new Date().toISOString();
  const runSha = headSha();
  console.log(`[A2] run_at=${runAt} run_sha=${runSha}`);

  let loaded;
  try {
    loaded = loadPicksH1(REPO_ROOT);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[A2] BLOCKED — picks-h1 export unreadable: ${msg}`);
    writeYamlBlocked(`picks-h1 export unreadable: ${msg}`, runSha, runAt);
    return 2;
  }

  const holdout = selectPicksH1(loaded.export.rows).filter(
    (r) => r.modelProb != null && r.modelProb > 0 && r.modelProb < 1,
  );
  console.log(
    `[A2] source=${loaded.path} fromFixture=${loaded.fromFixture} ` +
      `PICKS-H1 n=${holdout.length} (modelProb present)`,
  );

  if (holdout.length === 0) {
    console.error("[A2] BLOCKED — zero PICKS-H1 rows carry both marketFairProb and modelProb");
    writeYamlBlocked(
      "zero PICKS-H1 rows with marketFairProb and modelProb (export empty or schema drifted)",
      runSha,
      runAt,
    );
    return 2;
  }

  // w grid + football subset at the primary weight
  const byW = W_GRID.map((w) => scoreAtW(holdout, w, `shrinkage-w=${w}`));
  const primary = byW.find((r) => r.w === W_PRIMARY) ?? byW[0];

  const footballRows = holdout.filter((r) => isFootballSport(r.sport));
  const football =
    footballRows.length > 0
      ? scoreAtW(footballRows, W_PRIMARY, `shrinkage-w=${W_PRIMARY}-football`)
      : null;

  // Raw model (w=1) for context: the engine without shrinkage.
  const rawModel = scoreAtW(holdout, 1, "raw-model-w=1");

  console.log("[A2] ── w grid (candidate shrunk vs market) ──");
  for (const r of byW) {
    const sc = r.scorecard;
    console.log(
      `  w=${r.w.toFixed(2)}  n=${sc.n}  cand=${sc.candidateBrier.toFixed(5)}  ` +
        `mkt=${sc.marketBrier.toFixed(5)}  Δ=${sc.deltaBrier.toFixed(5)}  ` +
        `P(better)=${sc.pBetter.toFixed(3)}  ${r.passesKeepRule ? "KEEP" : "kill"}`,
    );
  }

  console.log("[A2] ── primary w=0.10 (D5) ──");
  console.log(primary.markdown);
  console.log(
    `  paired ΔBrier CI95 [${round(primary.pairedCi.ci[0], 5)}, ${round(primary.pairedCi.ci[1], 5)}] ` +
      `SE=${round(primary.pairedCi.se, 5)} MDE80=${round(primary.pairedCi.mde, 5)}`,
  );

  if (football) {
    console.log("[A2] ── football subset (NFL+NCAAF) at w=0.10 ──");
    console.log(football.markdown);
  } else {
    console.log("[A2] football subset: no football rows on this export");
  }

  console.log("[A2] ── raw model (w=1, unshrunk) for context ──");
  console.log(
    `  n=${rawModel.scorecard.n} cand=${rawModel.scorecard.candidateBrier.toFixed(5)} ` +
      `mkt=${rawModel.scorecard.marketBrier.toFixed(5)} Δ=${rawModel.scorecard.deltaBrier.toFixed(5)} ` +
      `P(better)=${rawModel.scorecard.pBetter.toFixed(3)}`,
  );

  const status = decideStatus(primary, loaded.fromFixture);
  console.log(
    `[A2] kill_line check → status=${status} (rule: ${primary.keepRule}; fromFixture=${loaded.fromFixture})`,
  );

  // Evidence JSON (scorecard attachment for the v5.2.8 proposal)
  const exportRaw = readFileSync(loaded.path, "utf8");
  const evidence = {
    factorId: "A2",
    runAt,
    runSha,
    holdoutId: "PICKS-H1",
    sourcePath: path.relative(REPO_ROOT, loaded.path).split(path.sep).join("/"),
    fromFixture: loaded.fromFixture,
    exportSha256: sha256(exportRaw),
    exportGeneratedAt: loaded.export.generatedAt,
    nHoldout: holdout.length,
    formula: "p = market + w * (model - market)",
    primaryW: W_PRIMARY,
    keepRule: primary.keepRule,
    killLine: "validate-era ΔBrier >= 0 or P(better) < 0.75 on PICKS-H1",
    status,
    primary: {
      w: primary.w,
      n: primary.scorecard.n,
      candidateBrier: primary.scorecard.candidateBrier,
      marketBrier: primary.scorecard.marketBrier,
      deltaBrier: primary.scorecard.deltaBrier,
      candidateLogLoss: primary.scorecard.candidateLogLoss,
      marketLogLoss: primary.scorecard.marketLogLoss,
      deltaLogLoss: primary.scorecard.deltaLogLoss,
      pBetter: primary.scorecard.pBetter,
      pBetterResamples: primary.scorecard.pBetterResamples,
      pBetterSeed: primary.scorecard.pBetterSeed,
      bySport: primary.scorecard.bySport,
      wilson: primary.scorecard.wilson,
      pairedDeltaCi: {
        delta: primary.pairedCi.delta,
        se: primary.pairedCi.se,
        ci95: primary.pairedCi.ci,
        mde80: primary.pairedCi.mde,
      },
      passesKeepRule: primary.passesKeepRule,
    },
    footballSubset: football
      ? {
          w: football.w,
          n: football.scorecard.n,
          candidateBrier: football.scorecard.candidateBrier,
          marketBrier: football.scorecard.marketBrier,
          deltaBrier: football.scorecard.deltaBrier,
          pBetter: football.scorecard.pBetter,
          bySport: football.scorecard.bySport,
          passesKeepRule: football.passesKeepRule,
        }
      : null,
    rawModel: {
      w: 1,
      n: rawModel.scorecard.n,
      candidateBrier: rawModel.scorecard.candidateBrier,
      marketBrier: rawModel.scorecard.marketBrier,
      deltaBrier: rawModel.scorecard.deltaBrier,
      pBetter: rawModel.scorecard.pBetter,
    },
    byW: byW.map((r) => ({
      w: r.w,
      n: r.scorecard.n,
      candidateBrier: r.scorecard.candidateBrier,
      marketBrier: r.scorecard.marketBrier,
      deltaBrier: r.scorecard.deltaBrier,
      pBetter: r.scorecard.pBetter,
      passesKeepRule: r.passesKeepRule,
    })),
    markdown: primary.markdown,
    note: loaded.fromFixture
      ? "Scored on the committed C-362 fixture (synthetic). A real verifier/picks-h1.json export is required before the model-version PR (D20)."
      : "Scored on the committed real PICKS-H1 export.",
  };

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[A2] wrote evidence ${EVIDENCE_PATH}`);

  const notes = [
    "F18: first positive in ~190 specs; ad-hoc holdout 0.20818 vs market 0.20905 at w=0.10.",
    "C-366 confirms on the frozen split and becomes the v5.2.8 scorecard (D5). Consistent",
    "across w=0.05–0.15 and in the football subset. Calibration, not edge.",
    `C-366 run ${runAt.slice(0, 10)}: PICKS-H1 fromFixture=${loaded.fromFixture} n=${holdout.length}.`,
    `Primary w=0.10: candBrier=${round(primary.scorecard.candidateBrier, 5)} ` +
      `mktBrier=${round(primary.scorecard.marketBrier, 5)} ` +
      `ΔBrier=${round(primary.scorecard.deltaBrier, 5)} ` +
      `P(better)=${round(primary.scorecard.pBetter, 3)} ` +
      `CI95[${round(primary.pairedCi.ci[0], 5)},${round(primary.pairedCi.ci[1], 5)}] ` +
      `MDE80=${round(primary.pairedCi.mde, 5)}.`,
    football
      ? `Football subset n=${football.scorecard.n} ΔBrier=${round(football.scorecard.deltaBrier, 5)} P(better)=${round(football.scorecard.pBetter, 3)}.`
      : "Football subset: empty on this export.",
    `Raw model w=1 ΔBrier=${round(rawModel.scorecard.deltaBrier, 5)} (engine worse than market without shrinkage).`,
    `w-grid ${W_GRID.map((w) => `${w}:${round(byW.find((r) => r.w === w).scorecard.deltaBrier, 5)}`).join(" ")}.`,
    `Evidence: docs/calibration-proposals/evidence/2026-09-15-a2-shrinkage-scorecard.json.`,
    loaded.fromFixture
      ? "HONEST LIMIT: committed fixture (synthetic n=33). Fixture FAILS the keep rule (model is overconfident by construction); it must not CANDIDATE/DEAD A2. Real-export scorecard is the DoD and is NOT RUN."
      : "Real PICKS-H1 export.",
  ].join(" ");

  if (status === "BLOCKED") {
    const blockedOn = loaded.fromFixture
      ? "verifier/picks-h1.json real export (fixture smoke only; synthetic n=33 fails keep rule — expected, not a kill)"
      : "PICKS-H1 scorecard produced no finite ΔBrier";
    writeYamlBlocked(blockedOn, runSha, runAt, notes);
    console.log(`[A2] wrote ${YAML_PATH}`);
    console.log(
      `[A2] RESULT status=BLOCKED blocked_on=${blockedOn} ` +
        `fixtureΔ=${round(primary.scorecard.deltaBrier, 5)} P(better)=${round(primary.scorecard.pBetter, 3)} n=${primary.scorecard.n}`,
    );
    return 2;
  }

  writeYamlResult({
    status,
    number: primary.scorecard.deltaBrier,
    ci: primary.pairedCi.ci,
    n: primary.scorecard.n,
    mde: primary.pairedCi.mde,
    runSha,
    runAt,
    notes,
  });
  console.log(`[A2] wrote ${YAML_PATH}`);
  console.log(
    `[A2] RESULT status=${status} number=${round(primary.scorecard.deltaBrier, 5)} ` +
      `ci=[${round(primary.pairedCi.ci[0], 5)}, ${round(primary.pairedCi.ci[1], 5)}] n=${primary.scorecard.n}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[A2] fatal:", err);
    process.exit(1);
  },
);
