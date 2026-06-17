/**
 * Pure decision logic for the gate-flip readiness check.
 *
 * This module is intentionally I/O-free so it can be unit-tested without a
 * live database. The DB-querying wrapper lives in
 * `scripts/check-gate-flip-readiness.mjs`, which gathers the facts (seed-row
 * count, settled-pick count, ingestion freshness, today's free-pick count,
 * env gates) and hands them to `evaluateGateFlip()` here.
 *
 * Why a separate file: an .mjs lib can be imported both by the Node ops
 * script (`import` at runtime) and by the Vitest suite (a `.ts` test importing
 * this `.mjs` by relative path), so the same predicate that the operator runs
 * is the one the tests pin.
 */

/**
 * Refresh staleness threshold in MINUTES.
 *
 * SOURCE OF TRUTH: apps/web/lib/data-reliability/refresh-sla.ts
 *   → REFRESH_STALE_AFTER_MINUTES (= 240, i.e. 4h).
 *
 * Duplicated here (not imported) because that const lives in a TypeScript
 * module that cannot be cleanly imported into a plain .mjs ops script without
 * a build step. If the SLA changes, update it there FIRST and mirror it here.
 */
export const REFRESH_STALE_AFTER_MINUTES = 240;

/**
 * Minimum settled, canonical, non-seed picks before performance stats may be
 * exposed. Mirrors MIN_SETTLED_PICKS_FOR_LEARNING (default 100) in
 * packages/prediction-engine/src/platform-config.ts.
 */
export const MIN_SETTLED_PICKS_FOR_PERFORMANCE = 100;

/** The seed model-version string that /api/picks does NOT filter out. */
export const SEED_MODEL_VERSION = "v5.0.0-seed";

/** The valid gate targets this script understands. */
export const GATE_TARGETS = Object.freeze(["public-picks", "performance-stats"]);

/**
 * Always-on safety checks, independent of the target gate. A true value in
 * `devFakeAdmin` or `demoPicksEnabled` is an immediate hard fail: neither may
 * ever be on in a production gate flip.
 *
 * @param {{ devFakeAdmin: boolean, demoPicksEnabled: boolean }} env
 * @returns {string[]} failure messages (empty = clean)
 */
export function evaluateAlwaysFailClosed(env) {
  const failures = [];
  if (env.devFakeAdmin === true) {
    failures.push("DEV_FAKE_ADMIN=true — must never be true in production.");
  }
  if (env.demoPicksEnabled === true) {
    failures.push("DEMO_PICKS_ENABLED=true — must never be true in production.");
  }
  return failures;
}

/**
 * Decide whether the PUBLIC_PICKS_ENABLED gate is safe to flip.
 *
 * @param {{
 *   seedCount: number,            // Pick rows with modelVersion === SEED_MODEL_VERSION
 *   ingestionAgeMinutes: number|null, // age of latest SUCCESS IngestionRun.completedAt; null = none ever
 *   freePicksToday: number,       // published, non-bootstrap, FREE-tier picks for today passing the quality floor
 *   gates: {
 *     demoPicksEnabled: boolean,
 *     derivedModelHistoryEnabled: boolean,
 *   },
 * }} facts
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function evaluatePublicPicksFlip(facts) {
  const failures = [];

  // (a) Seed-leak guard. /api/picks does NOT filter seed rows, so any seed row
  // would leak straight onto the public board.
  if (facts.seedCount > 0) {
    failures.push(
      `${facts.seedCount} seed pick(s) (modelVersion="${SEED_MODEL_VERSION}") present — /api/picks does NOT filter these, so they would leak onto the public board. Purge before flipping.`
    );
  }

  // (b) DEMO_PICKS_ENABLED must be off.
  if (facts.gates.demoPicksEnabled === true) {
    failures.push("DEMO_PICKS_ENABLED=true — must be off before exposing public picks.");
  }

  // (c) Ingestion freshness within the Refresh SLA.
  if (facts.ingestionAgeMinutes === null) {
    failures.push(
      "No successful IngestionRun found — public picks would be served against absent/unknown odds freshness."
    );
  } else if (facts.ingestionAgeMinutes > REFRESH_STALE_AFTER_MINUTES) {
    failures.push(
      `Latest successful ingestion is ${facts.ingestionAgeMinutes} min old (> ${REFRESH_STALE_AFTER_MINUTES} min SLA) — odds are stale. Refresh before flipping.`
    );
  }

  // (d) At least one publishable FREE-tier pick for today, so the board isn't empty.
  if (!(facts.freePicksToday >= 1)) {
    failures.push(
      "Zero published, non-bootstrap, FREE-tier picks passing the quality floor for today — the public board would be empty on flip."
    );
  }

  // (e) Sequencing: derived model history must already be on.
  if (facts.gates.derivedModelHistoryEnabled !== true) {
    failures.push(
      "DERIVED_MODEL_HISTORY_ENABLED is off — public picks require derived model history first (sequencing)."
    );
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Decide whether the PERFORMANCE_STATS_ENABLED gate is safe to flip.
 *
 * @param {{
 *   seedCount: number,            // Pick rows with modelVersion === SEED_MODEL_VERSION
 *   settledCount: number,         // settled (WIN/LOSS/PUSH), non-bootstrap, non-seed picks
 *   gates: {
 *     publicPicksEnabled: boolean,
 *   },
 * }} facts
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function evaluatePerformanceStatsFlip(facts) {
  const failures = [];

  // (a) Enough settled, canonical, non-seed picks for an honest record.
  if (!(facts.settledCount >= MIN_SETTLED_PICKS_FOR_PERFORMANCE)) {
    failures.push(
      `Only ${facts.settledCount} settled, non-bootstrap, non-seed pick(s) — need >= ${MIN_SETTLED_PICKS_FOR_PERFORMANCE} (MIN_SETTLED_PICKS_FOR_LEARNING) before publishing a win-rate.`
    );
  }

  // (b) Public picks must already be live (sequencing).
  if (facts.gates.publicPicksEnabled !== true) {
    failures.push(
      "PUBLIC_PICKS_ENABLED is off — performance stats require public picks live first (sequencing)."
    );
  }

  // (c) Seed-leak guard — seed rows would pollute the published record.
  if (facts.seedCount > 0) {
    failures.push(
      `${facts.seedCount} seed pick(s) (modelVersion="${SEED_MODEL_VERSION}") present — would pollute the published performance record. Purge before flipping.`
    );
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Top-level dispatcher. Combines the always-on fail-closed checks with the
 * target-specific predicate. The wrapper passes everything it gathered as a
 * single facts object; unused fields are ignored per target.
 *
 * @param {"public-picks"|"performance-stats"} target
 * @param {{
 *   seedCount: number,
 *   settledCount: number,
 *   ingestionAgeMinutes: number|null,
 *   freePicksToday: number,
 *   gates: {
 *     devFakeAdmin: boolean,
 *     demoPicksEnabled: boolean,
 *     derivedModelHistoryEnabled: boolean,
 *     publicPicksEnabled: boolean,
 *   },
 * }} facts
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function evaluateGateFlip(target, facts) {
  const failures = [...evaluateAlwaysFailClosed(facts.gates)];

  if (target === "public-picks") {
    failures.push(...evaluatePublicPicksFlip(facts).failures);
  } else if (target === "performance-stats") {
    failures.push(...evaluatePerformanceStatsFlip(facts).failures);
  } else {
    failures.push(
      `Unknown target "${target}". Use one of: ${GATE_TARGETS.join(", ")}.`
    );
  }

  return { ok: failures.length === 0, failures };
}
