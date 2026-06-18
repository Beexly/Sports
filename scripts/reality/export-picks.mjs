#!/usr/bin/env node
/**
 * export-picks.mjs — Workstream-K reality-engine OFFLINE export step (slice B+D).
 *
 * Reads SETTLED picks (joined to their game + sport) from the database into
 * data/reality-engine/inputs/settled-picks.json, in the exact `SettledPickRecord`
 * shape that apps/web/lib/reality/diagnostics.ts consumes. It also reads the
 * learning-eligible settled count (same predicate as scripts/calibration/
 * fit-and-validate.mjs) so the diagnostics calibration line is HONEST, not fabricated.
 *
 * It is EXPORT-ONLY and strictly READ-ONLY on the database:
 *   - exactly two SELECTs, zero writes, ever;
 *   - mutates no row, flips no gate, bumps no MODEL_VERSION, touches no live path.
 *
 * Mirrors the statking precedent + fit-and-validate.mjs: npm-scripted, JSON out,
 * offline/batch, NEVER imported into the Next.js request path, NO new dependency
 * (uses the already-present `pg` driver, exactly as fit-and-validate.mjs does).
 *
 * ── How to run ──────────────────────────────────────────────────────────────
 *   DATABASE_URL=postgres://... npm run reality:export
 *
 * If DATABASE_URL is unset, `pg` is missing, or the DB is unreachable, it prints a
 * clear message and exits 0 — accumulation simply has not happened in this
 * environment, which is not an error (identical posture to fit-and-validate.mjs).
 */

import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_PATH = resolve(ROOT, "data/reality-engine/inputs/settled-picks.json");

const out = (s = "") => process.stdout.write(s + "\n");

/**
 * Pull settled picks (joined to game + sport) as read-only rows in the diagnostics
 * record shape, plus the learning-eligible settled count. Returns null on any DB
 * unavailability so the caller exits 0 cleanly.
 */
async function loadExport() {
  if (!process.env.DATABASE_URL) {
    out("DATABASE_URL is not set — no settled picks to export in this environment.");
    out("This is expected outside production; accumulation happens there. Exiting cleanly.");
    return null;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    out("`pg` is not installed — cannot read the settled picks. Run `npm install pg`.");
    out("Treating as no-export (not an error). Exiting cleanly.");
    return null;
  }

  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    out(`Database unreachable: ${err instanceof Error ? err.message : String(err)}`);
    out("Cannot read the settled picks. Exiting cleanly (this is not an export failure).");
    try { await client.end(); } catch { /* ignore */ }
    return null;
  }

  try {
    // STRICTLY READ-ONLY SELECT #1: settled picks joined to game + sport.
    const picks = await client.query(
      `SELECT s."key"               AS sport,
              p."pickType"           AS market,
              p."result"             AS result,
              p."tier"               AS tier,
              p."confidence"         AS confidence,
              p."clvVerdict"         AS clv_verdict,
              p."clvValue"           AS clv_value,
              p."clvKind"            AS clv_kind,
              p."generatedAt"        AS generated_at,
              g."commenceTime"       AS commence_time,
              p."isBootstrap"        AS is_bootstrap
         FROM picks p
         JOIN games g  ON g."id" = p."gameId"
         JOIN sports s ON s."id" = g."sportId"
        WHERE p."result" IN ('WIN','LOSS','PUSH','VOID')
        ORDER BY p."settledAt" ASC NULLS LAST, p."generatedAt" ASC`,
    );

    // STRICTLY READ-ONLY SELECT #2: the learning-eligible settled count — the SAME
    // predicate fit-and-validate.mjs uses, so the diagnostics calibration line is honest.
    let eligibleSampleSize = null;
    try {
      const elig = await client.query(
        `SELECT COUNT(*)::int AS n
           FROM pick_signal_snapshots
          WHERE "eligibleForLearning" = true
            AND "isBootstrap" = false
            AND "settlementResult" IN ('WIN','LOSS')
            AND "confidenceAtPrediction" IS NOT NULL`,
      );
      eligibleSampleSize = elig.rows[0]?.n ?? null;
    } catch {
      // Eligible-count table/columns may be absent in some environments — leave null
      // so the diagnostics line reads "unknown" rather than fabricating a number.
      eligibleSampleSize = null;
    }

    const records = picks.rows.map((r) => ({
      sport: r.sport ?? null,
      market: r.market ?? null,
      result: r.result ?? null,
      tier: r.tier ?? null,
      confidence: r.confidence != null ? Number(r.confidence) : null,
      clvVerdict: r.clv_verdict ?? null,
      clvValue: r.clv_value != null ? Number(r.clv_value) : null,
      clvKind: r.clv_kind ?? null,
      generatedAt: r.generated_at ? new Date(r.generated_at).toISOString() : null,
      commenceTime: r.commence_time ? new Date(r.commence_time).toISOString() : null,
      isBootstrap: r.is_bootstrap ?? null,
      // Line-movement / book-dispersion / nullProb are NOT yet exported here — they
      // require deriving from the Odds history (a later slice). The diagnostics
      // aggregator degrades honestly when they are absent.
    }));

    return { records, eligibleSampleSize };
  } catch (err) {
    out(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    out("Cannot read the settled picks. Exiting cleanly (this is not an export failure).");
    return null;
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

async function main() {
  out("");
  out("=== Reality-engine settled-pick export (Workstream-K, slice B+D) ===");
  out("READ-ONLY. Two SELECTs, zero writes. No model change, no gate flip.");
  out("");

  const result = await loadExport();
  if (result === null) {
    process.exit(0);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    eligibleSampleSize: result.eligibleSampleSize,
    records: result.records,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  out(`Exported ${result.records.length} settled picks → ${OUT_PATH}`);
  out(
    `Learning-eligible settled count: ${
      result.eligibleSampleSize == null ? "unknown" : result.eligibleSampleSize
    }`,
  );
  out("Run `npm run reality:diagnostics` to build the human-readable report.");
  out("");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Unexpected export error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
