#!/usr/bin/env node
/**
 * generate-episode-script — weekly podcast script DRAFT from real data (POD-01).
 *
 * Composes a spoken-word episode draft for the weekly show from the platform's
 * ACTUAL week: settled picks (wins AND losses — trust-first), the gate's pass
 * discipline, and the calibration sample state. Design doc:
 * docs/command-center/launch/weekly-podcast-design.md
 *
 * PIPELINE POSITION — this is step 1 of 4, and the ONLY automated one:
 *   1. this script writes a DRAFT (never publishable as-is)
 *   2. the founder rewrites/approves the script (his words, his judgment)
 *   3. scripts/podcast/render-episode.mjs renders it in HIS voice, locally
 *   4. the founder listens and publishes by hand (manifest + RSS)
 *
 * SAFETY / HONESTY (same contract as generate-calibration-report.mjs):
 *   - Every draft opens with an explicit DRAFT header; nothing here publishes.
 *   - The composed text is scanned against the banned-phrase list MIRRORED
 *     from apps/web/lib/trust-claims.ts (parity-pinned by
 *     apps/web/__tests__/podcast-episode-script.test.ts). A violation fails
 *     generation (exit 1) — a non-compliant draft is never written.
 *   - No win-rate/accuracy claim is composed beyond counting the week's own
 *     settled results; the calibration gate line states the report's status.
 *   - Stub-safe: no DATABASE_URL -> honest empty-week draft, exit 0.
 *     DB set but unreachable -> honest "could not read" draft, exit 0.
 *   - Reads only; writes one markdown file under apps/web/content/podcast/.
 *
 * Usage (from repo root):
 *   node scripts/podcast/generate-episode-script.mjs
 *   npm run podcast:script
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPISODES_DIR = path.resolve(__dirname, "../../apps/web/content/podcast/episodes");

/** Seed-model picks are demo data and never appear in show material. */
const SEED_MODEL_VERSION = "v5.0.0-seed";

// ============================================================
// Banned-phrase scan — MIRRORS apps/web/lib/trust-claims.ts
// (the banned claim copies + the word-boundary rule in
// scanForBannedPhrases). Parity-pinned by the podcast test —
// if the lib's banned list changes, the test fails until this
// mirror is updated.
// ============================================================

export const BANNED_PHRASES_MIRROR = [
  "guaranteed",
  "lock",
  "sure thing",
  "risk-free",
  "easy money",
  "can't lose",
  "verified track record",
  "thousands of bettors",
  "trusted by serious bettors",
  "guaranteed profit",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mirrors trust-claims scanForBannedPhrases word-boundary behavior. */
export function scanScriptForBannedPhrases(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (const phrase of BANNED_PHRASES_MIRROR) {
    const useWordBoundary = !phrase.includes(" ") && phrase.length <= 6;
    const pattern = useWordBoundary
      ? new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i")
      : new RegExp(escapeRegex(phrase), "i");
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        hits.push({ phrase, line: idx + 1, snippet: line.trim() });
      }
    });
  }
  return hits;
}

// ============================================================
// Script composition (pure — tested directly)
// ============================================================

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function resultWord(result) {
  if (result === "WIN") return "a win";
  if (result === "LOSS") return "a loss";
  return "a push";
}

/**
 * Pure composer. `week` = { picks, gatedCount, calibration, dataStatus,
 * dbErrorMessage } where picks are the last 7 days' settled, published,
 * non-bootstrap picks. Returns { markdown, hits } — hits non-empty means the
 * draft violated the banned-phrase scan and MUST NOT be written.
 */
export function buildEpisodeScript(week, now = new Date()) {
  const { picks, gatedCount, calibration, dataStatus, dbErrorMessage } = week;
  const date = fmtDate(now);
  const lines = [];

  lines.push("---");
  lines.push("STATUS: DRAFT — NOT FOR AIR");
  lines.push("This is raw material composed from the week's actual data.");
  lines.push("It does not air until the founder rewrites it in his own words,");
  lines.push("renders it (scripts/podcast/render-episode.mjs), listens, and");
  lines.push("publishes by hand. The engine cannot publish this.");
  lines.push(`GENERATED: ${now.toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push(`# Weekly episode draft — week ending ${date}`);
  lines.push("");

  if (dataStatus === "stub") {
    lines.push("## (No database configured)");
    lines.push("");
    lines.push(
      "There is no settled data to talk about yet — the database is not " +
        "configured in this environment. This draft exists so the pipeline " +
        "can be exercised; the real show starts when real picks settle."
    );
    return finishScript(lines);
  }

  if (dataStatus === "unreachable") {
    lines.push("## (Database unreachable)");
    lines.push("");
    lines.push(
      "The week's data could not be read" +
        (dbErrorMessage ? ` (${dbErrorMessage})` : "") +
        ". This draft refuses to invent a week. Restore connectivity and re-run."
    );
    return finishScript(lines);
  }

  // --- Cold open ---
  lines.push("## Cold open");
  lines.push("");
  const wins = picks.filter((p) => p.result === "WIN").length;
  const losses = picks.filter((p) => p.result === "LOSS").length;
  const pushes = picks.filter((p) => p.result === "PUSH").length;

  if (picks.length === 0) {
    lines.push(
      "Quiet week on the board. Nothing settled in the last seven days — " +
        "which is itself the discipline: we publish when the process finds " +
        "edge, and this week it mostly said no."
    );
  } else {
    lines.push(
      `The week's record, all of it: ${wins} ${wins === 1 ? "win" : "wins"}, ` +
        `${losses} ${losses === 1 ? "loss" : "losses"}` +
        (pushes > 0 ? `, ${pushes} push${pushes === 1 ? "" : "es"}` : "") +
        ". Every one of them is on the public ledger with the reasoning that " +
        "was attached BEFORE the game — wins and losses get the same spotlight here."
    );
  }
  lines.push("");

  // --- The week's calls (losses first — trust posture) ---
  if (picks.length > 0) {
    lines.push("## The calls, graded");
    lines.push("");
    const ordered = [...picks].sort((a, b) =>
      a.result === b.result ? 0 : a.result === "LOSS" ? -1 : 1
    );
    for (const p of ordered.slice(0, 8)) {
      const why = p.reasoningShort ? ` The read at the time: ${p.reasoningShort}` : "";
      lines.push(`- ${p.selection} — ${resultWord(p.result)}.${why}`);
    }
    if (picks.length > 8) {
      lines.push(`- …and ${picks.length - 8} more, all on the ledger.`);
    }
    lines.push("");
  }

  // --- The discipline ---
  lines.push("## What we passed on");
  lines.push("");
  if (typeof gatedCount === "number" && gatedCount > 0) {
    lines.push(
      `${gatedCount} evaluated game${gatedCount === 1 ? "" : "s"} did not clear ` +
        "the gate this week — thin markets, weak evidence, or no edge. " +
        "The pass list is public, with reasons. Discipline is the product."
    );
  } else {
    lines.push(
      "The pass list is public, with reasons. When the process says no, we say no."
    );
  }
  lines.push("");

  // --- The honest close ---
  lines.push("## Close");
  lines.push("");
  if (calibration && calibration.sampleSize >= 150 && calibration.ready) {
    lines.push(
      `The calibration report stands at ${calibration.sampleSize} graded picks ` +
        "and currently passes its own thresholds — the full curves are on the site."
    );
  } else {
    const n = calibration ? calibration.sampleSize : 0;
    lines.push(
      `The record is being built in public — ${n} graded pick${n === 1 ? "" : "s"} ` +
        "toward the 150 the calibration report demands before this show will " +
        "claim anything about a rate. Until then: the picks, the reasons, the " +
        "grades, all visible. That's the bet we're making with you."
    );
  }
  lines.push("");
  // Required disclosure — verbatim from GSN_PODCAST_AND_VOICE_SYSTEM.md.
  lines.push(
    "This episode uses an AI-generated version of Garrett Baxley's voice " +
      "reading a human-approved GSN script. The analysis is source-reviewed " +
      "before publication."
  );
  lines.push("");
  lines.push(
    "If you or someone you know has a gambling problem, call 1-800-GAMBLER. " +
      "This is research, not financial advice. Play responsibly."
  );

  return finishScript(lines);
}

function finishScript(lines) {
  const markdown = lines.join("\n") + "\n";
  const hits = scanScriptForBannedPhrases(markdown);
  return { markdown, hits };
}

// ============================================================
// Data load (never throws; same posture as the calibration script)
// ============================================================

async function loadWeek(now = new Date()) {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    return { dataStatus: "stub", picks: [], gatedCount: null, calibration: null, dbErrorMessage: null };
  }

  let db = null;
  try {
    const require = createRequire(import.meta.url);
    const { PrismaClient } = require("@prisma/client");
    db = new PrismaClient();
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const rows = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        settledAt: { gte: since },
        NOT: { modelVersion: SEED_MODEL_VERSION },
      },
      orderBy: { settledAt: "asc" },
    });
    const picks = rows.map((p) => ({
      selection: p.selection,
      result: p.result,
      reasoningShort: p.reasoningShort ?? null,
    }));

    const gatedCount = await db.gateDecision
      .count({ where: { status: "GATED", isBootstrap: false, evaluatedAt: { gte: since } } })
      .catch(() => null);

    const totalGraded = await db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          result: { in: ["WIN", "LOSS", "PUSH"] },
          NOT: { modelVersion: SEED_MODEL_VERSION },
        },
      })
      .catch(() => 0);

    return {
      dataStatus: "live",
      picks,
      gatedCount,
      // ready=false until the calibration report itself says otherwise — this
      // script never asserts a rate; it only counts toward the 150 gate.
      calibration: { sampleSize: totalGraded, ready: false },
      dbErrorMessage: null,
    };
  } catch (err) {
    return {
      dataStatus: "unreachable",
      picks: [],
      gatedCount: null,
      calibration: null,
      dbErrorMessage: err instanceof Error ? err.message.split("\n")[0] : String(err),
    };
  } finally {
    if (db) await db.$disconnect().catch(() => {});
  }
}

export async function generateEpisodeScript(now = new Date()) {
  const week = await loadWeek(now);
  const { markdown, hits } = buildEpisodeScript(week, now);
  if (hits.length > 0) {
    return { ok: false, hits, scriptPath: null, dataStatus: week.dataStatus };
  }
  const scriptPath = path.join(EPISODES_DIR, `${fmtDate(now)}-draft.md`);
  mkdirSync(EPISODES_DIR, { recursive: true });
  writeFileSync(scriptPath, markdown, "utf8");
  return { ok: true, hits: [], scriptPath, dataStatus: week.dataStatus };
}

async function main() {
  const { ok, hits, scriptPath, dataStatus } = await generateEpisodeScript();
  if (!ok) {
    console.error("[podcast-script] BLOCKED — banned phrases in the composed draft:");
    for (const h of hits) console.error(`  line ${h.line}: "${h.phrase}" in: ${h.snippet}`);
    process.exit(1);
  }
  console.log(`[podcast-script] wrote ${scriptPath} (dataStatus=${dataStatus})`);
  console.log("[podcast-script] DRAFT only — founder edit + render + manual publish required.");
  process.exit(0);
}

// CLI-only side effects; importing this module (tests) is side-effect free.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[podcast-script] Fatal:", err);
    process.exit(1);
  });
}
