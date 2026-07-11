/**
 * Outage gate — the DISTINCT 503 body for a public surface whose backend read
 * FAILED (T-picks-outage, states doctrine).
 *
 * The public dark states are three different diagnoses with three different
 * runbooks, and each must be distinguishable from the outside:
 *
 *   | state           | discriminator            | meaning                    |
 *   |-----------------|--------------------------|----------------------------|
 *   | bootstrap gate  | `bootstrapMode: true`    | deliberately gated by env  |
 *   | stale-data gate | `reason: "stale_data"`   | suppressed awaiting data   |
 *   | OUTAGE (this)   | `reason: "backend_outage"` | the read itself failed   |
 *
 * Before this module, a DB failure on /api/picks and /api/clv reused the
 * bootstrap body — an outage dressed as deliberate gating. A monitor reading
 * "disabled in bootstrap mode" during an outage pages nobody and sends an
 * operator to the environment flags instead of the database — the same
 * wrong-runbook failure the 2026-07-10 incident taught (see
 * staleDataGateResponse, born of the identical lesson).
 *
 * Still fails SOFT: 503 + structured body, never a stack trace, on public
 * unauthenticated routes. The surface recovers on the next successful read.
 */
export function outageGateResponse(featureName: string): {
  error: string;
  reason: "backend_outage";
  bootstrapMode: false;
  hint: string;
} {
  return {
    error: `${featureName} is temporarily unavailable.`,
    reason: "backend_outage",
    bootstrapMode: false,
    hint:
      "The backend read behind this surface failed — this is an outage, NOT bootstrap " +
      "gating and NOT the stale-data kill switch. Check /api/health (database check), " +
      "the database provider, and recent deploys. The surface recovers on the next " +
      "successful read; no environment flag needs changing.",
  };
}
