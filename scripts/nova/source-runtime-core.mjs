/**
 * NOVA S3 source-runtime core — pure, deterministic, failed-closed.
 *
 * Single executable authority for the source-cycle state machine used by
 * `run-cycle.mjs`, `source-worker.mjs`, and `source-doctor.mjs`. Every
 * function here is side-effect free: no network, no filesystem, no clock
 * reads (time is always an explicit argument).
 *
 * ## Outcome vocabulary (exact, closed)
 *
 * Per-source outcomes are exactly:
 *
 *   FETCHED       — 2xx response with a schema-valid source receipt.
 *   NOT_MODIFIED  — 304 conditional response with a schema-valid receipt.
 *   HELD          — policy deliberately withheld the fetch or refused the
 *                   result (off-origin redirect, disallowed content type,
 *                   size ceiling, clearance not granted). Carries a
 *                   holdReason, never a promotable receipt.
 *   FAILED        — network error, timeout, HTTP error status, parse
 *                   failure, or an invalid/missing receipt on a claimed
 *                   success.
 *
 * NO RECEIPT MEANS HELD OR FAILED. A result without a schema-valid receipt
 * is NEVER promoted, never updates an accepted snapshot, and never emits
 * change events. A claimed FETCHED/NOT_MODIFIED with a missing or invalid
 * receipt is demoted to FAILED here, not trusted.
 *
 * ## Run terminal states
 *
 * A run record is RUNNING until it reaches exactly one terminal state:
 * COMPLETED or FAILED_CLOSED. On the next start, any run record found with
 * no terminal state (crash, kill, or model switch mid-run — the same
 * failure mode that killed the #146 inventory subagent) is FAILED_CLOSED.
 * It is never silently resumed as success. Its per-source checkpoints are
 * salvaged exactly once into the successor run.
 *
 * ## Historical receipts doctrine
 *
 * Historical NOVA source-validation receipts remain FAILED_CLOSED. The
 * 2026-07-21 live source-validation run produced no receipt
 * (`NOVA_LIVE_SOURCE_VALIDATION_REPORT`): under this module's rules that
 * outcome is and stays FAILED_CLOSED; it is never retroactively promoted.
 *
 * ## Scraping posture (unchanged by S3)
 *
 * The runtime performs read-only, conditional HTTPS GETs of registry-
 * allowlisted official metadata sources only. Any extraction pattern beyond
 * registry-authorized public metadata capture MUST pass `checkClearance()`
 * (`apps/web/lib/scraping/clearance-engine.ts`) before running. No CAPTCHA,
 * login, or paywall bypass; no proxy rotation; one declared user agent.
 *
 * Draft state: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED. Zero Prisma —
 * S5 owns persistence; every runtime artifact here is an append-only JSON
 * file under `reports/nova/source-runtime/`.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const SOURCE_FETCH_OUTCOMES = Object.freeze(["FETCHED", "NOT_MODIFIED", "HELD", "FAILED"]);
export const PROMOTABLE_OUTCOMES = Object.freeze(["FETCHED", "NOT_MODIFIED"]);
export const RUN_TERMINAL_STATES = Object.freeze(["COMPLETED", "FAILED_CLOSED"]);
export const RUN_STATES = Object.freeze(["RUNNING", ...RUN_TERMINAL_STATES]);

export const RECEIPT_SCHEMA_VERSION = 1;
export const RUN_RECORD_SCHEMA_VERSION = 1;
export const CHECKPOINT_SCHEMA_VERSION = 1;
export const ALERT_SCHEMA_VERSION = 1;

/**
 * Deterministic convergence-inventory capability integration point.
 *
 * S3 CONSUMES the deterministic convergence-inventory tooling; it does not
 * rebuild it. The tooling is owned by the `nova/convergence-inventory-tooling`
 * unit and is referenced here strictly by npm script name (`nova:inventory` /
 * `nova:inventory:verify`). Those scripts are NOT guaranteed to exist on the
 * branch this code runs on: the capability's resolvability MUST be checked
 * against the actual `package.json` scripts at run time via
 * `resolveConvergenceInventoryCapability()` and recorded honestly on every
 * run receipt. A declared-but-absent script is recorded as
 * `DECLARED_NOT_RESOLVABLE_ON_THIS_BRANCH`, never as a working capability.
 *
 * A model may interpret the resulting receipt; it may not manufacture it.
 */
export const CONVERGENCE_INVENTORY_CAPABILITY = Object.freeze({
  capability: "deterministic-convergence-inventory",
  buildNpmScript: "nova:inventory",
  verifyNpmScript: "nova:inventory:verify",
  owningUnit: "nova/convergence-inventory-tooling",
  integration: "NPM_SCRIPT_NAME_ONLY",
  rebuiltInS3: false,
});

export const CAPABILITY_RESOLUTION_STATUSES = Object.freeze([
  "RESOLVABLE_AT_RUNTIME",
  "DECLARED_NOT_RESOLVABLE_ON_THIS_BRANCH",
]);

/**
 * Resolve the declared convergence-inventory capability against the npm
 * scripts actually present at run time (the caller reads `package.json` and
 * passes its `scripts` object). Fail closed: unless BOTH declared scripts
 * exist, the capability is recorded as
 * `DECLARED_NOT_RESOLVABLE_ON_THIS_BRANCH` — the receipt never claims a
 * runnable capability that this branch cannot actually run.
 */
export function resolveConvergenceInventoryCapability(npmScripts) {
  const scripts = isPlainObject(npmScripts) ? npmScripts : {};
  const buildResolvable = isNonEmptyString(scripts[CONVERGENCE_INVENTORY_CAPABILITY.buildNpmScript]);
  const verifyResolvable = isNonEmptyString(scripts[CONVERGENCE_INVENTORY_CAPABILITY.verifyNpmScript]);
  return Object.freeze({
    ...CONVERGENCE_INVENTORY_CAPABILITY,
    status:
      buildResolvable && verifyResolvable ? "RESOLVABLE_AT_RUNTIME" : "DECLARED_NOT_RESOLVABLE_ON_THIS_BRANCH",
    scriptPresence: Object.freeze({
      [CONVERGENCE_INVENTORY_CAPABILITY.buildNpmScript]: buildResolvable,
      [CONVERGENCE_INVENTORY_CAPABILITY.verifyNpmScript]: verifyResolvable,
    }),
  });
}

/**
 * Immutable doctrine record: the historical NOVA live source validation
 * (2026-07-21) produced no receipt and therefore remains FAILED_CLOSED.
 */
export const HISTORICAL_SOURCE_VALIDATION_DOCTRINE = Object.freeze({
  event: "NOVA live source validation 2026-07-21",
  result: "FAILED_CLOSED",
  reason: "The validation command produced no receipt; no receipt is never promoted.",
  retroactivePromotion: "FORBIDDEN",
});

/** Content types each parser may accept; anything else is a policy HOLD. */
export const CONTENT_TYPES_BY_PARSER = Object.freeze({
  structured_page_delta: Object.freeze(["text/html", "text/plain", "application/xhtml+xml"]),
  github_releases_json: Object.freeze(["application/json", "application/vnd.github+json", "text/json"]),
  rss_atom_metadata: Object.freeze([
    "application/rss+xml",
    "application/atom+xml",
    "application/xml",
    "text/xml",
    "text/plain",
  ]),
  cisa_kev_json: Object.freeze(["application/json", "text/json", "text/plain"]),
});

// ---------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isInteger(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

// ---------------------------------------------------------------------------
// Timeout floors — a configured timeout may never derive an insta-abort
// ---------------------------------------------------------------------------

/** Minimum accepted `--source-timeout-ms`. The worker timeout is derived as
 * `sourceTimeoutMs - WORKER_TIMEOUT_HEADROOM_MS`, so this floor guarantees
 * the derived worker timeout is >= MIN_WORKER_TIMEOUT_MS. */
export const MIN_SOURCE_TIMEOUT_MS = 2_000;
export const MIN_WORKER_TIMEOUT_MS = 1_000;
export const WORKER_TIMEOUT_HEADROOM_MS = 1_000;

/**
 * Derive the per-source worker timeout from the configured hard source
 * timeout and the registry policy default. A derived timeout of zero or
 * less is a CONFIGURATION ERROR, never a silently accepted insta-abort:
 * this throws instead of returning anything below MIN_WORKER_TIMEOUT_MS.
 */
export function deriveWorkerTimeoutMs(sourceTimeoutMs, policyDefaultTimeoutMs) {
  if (!isInteger(sourceTimeoutMs, MIN_SOURCE_TIMEOUT_MS)) {
    throw new Error(
      `Configuration error: sourceTimeoutMs must be an integer >= ${MIN_SOURCE_TIMEOUT_MS} (got ${String(sourceTimeoutMs)}).`,
    );
  }
  const candidate = sourceTimeoutMs - WORKER_TIMEOUT_HEADROOM_MS;
  const derived = isInteger(policyDefaultTimeoutMs, 1) ? Math.min(candidate, policyDefaultTimeoutMs) : candidate;
  if (!isInteger(derived, MIN_WORKER_TIMEOUT_MS)) {
    throw new Error(
      `Configuration error: derived worker timeout ${String(derived)}ms is below the ${MIN_WORKER_TIMEOUT_MS}ms floor.`,
    );
  }
  return derived;
}

export function contentTypeBase(value) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function canonicalHost(value) {
  return String(value).trim().toLowerCase().replace(/\.$/, "");
}

// ---------------------------------------------------------------------------
// Source receipt schema
// ---------------------------------------------------------------------------

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

/**
 * Validate a source receipt against the exact S3 receipt schema.
 *
 * Required: sourceId, url (https), fetchedAt, httpStatus, contentType,
 * contentLength, contentHash (`sha256:<hex64>`; null permitted only for
 * 304), parserVersion, redirectChain (array of https hops with 3xx
 * statuses), recordedTime, freshnessHorizonMinutes. `effectiveTime` (the
 * source-declared publication/effective moment) is nullable but must be a
 * parseable timestamp when present — it is deliberately distinct from
 * `recordedTime` (when this runtime recorded the observation).
 */
export function validateSourceReceipt(receipt) {
  const errors = [];
  if (!isPlainObject(receipt)) {
    return { valid: false, errors: ["receipt must be an object"] };
  }
  if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${RECEIPT_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(receipt.sourceId)) errors.push("sourceId must be a non-empty string");
  if (!isNonEmptyString(receipt.url) || !receipt.url.startsWith("https://")) {
    errors.push("url must be an https:// string");
  }
  if (!isIsoTime(receipt.fetchedAt)) errors.push("fetchedAt must be a parseable timestamp");
  if (!isInteger(receipt.httpStatus, 100) || receipt.httpStatus > 599) {
    errors.push("httpStatus must be an integer between 100 and 599");
  }
  if (!isNonEmptyString(receipt.contentType)) errors.push("contentType must be a non-empty string");
  if (!isInteger(receipt.contentLength, 0)) errors.push("contentLength must be an integer >= 0");
  if (receipt.contentHash === null || receipt.contentHash === undefined) {
    if (receipt.httpStatus !== 304) errors.push("contentHash is required unless httpStatus is 304");
  } else if (typeof receipt.contentHash !== "string" || !SHA256_PATTERN.test(receipt.contentHash)) {
    errors.push("contentHash must match sha256:<64 hex>");
  }
  if (!isInteger(receipt.parserVersion, 1)) errors.push("parserVersion must be an integer >= 1");
  if (!Array.isArray(receipt.redirectChain)) {
    errors.push("redirectChain must be an array (possibly empty)");
  } else {
    receipt.redirectChain.forEach((hop, index) => {
      if (!isPlainObject(hop)) {
        errors.push(`redirectChain[${index}] must be an object`);
        return;
      }
      if (!isNonEmptyString(hop.url) || !hop.url.startsWith("https://")) {
        errors.push(`redirectChain[${index}].url must be an https:// string`);
      }
      if (!isInteger(hop.httpStatus, 300) || hop.httpStatus > 399) {
        errors.push(`redirectChain[${index}].httpStatus must be a 3xx integer`);
      }
    });
  }
  if (receipt.effectiveTime !== null && receipt.effectiveTime !== undefined && !isIsoTime(receipt.effectiveTime)) {
    errors.push("effectiveTime must be null or a parseable timestamp");
  }
  if (!isIsoTime(receipt.recordedTime)) errors.push("recordedTime must be a parseable timestamp");
  if (!isInteger(receipt.freshnessHorizonMinutes, 1)) {
    errors.push("freshnessHorizonMinutes must be an integer >= 1");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Freshness of a receipt relative to `now`: FRESH while `recordedTime +
 * freshnessHorizonMinutes` has not elapsed, STALE after, INVALID when the
 * receipt itself fails schema validation (invalid is treated as stale by
 * every consumer — fail closed).
 */
export function receiptFreshness(receipt, now) {
  const validation = validateSourceReceipt(receipt);
  if (!validation.valid) return "INVALID";
  const recorded = Date.parse(receipt.recordedTime);
  const horizonMs = receipt.freshnessHorizonMinutes * 60_000;
  return now.getTime() - recorded <= horizonMs ? "FRESH" : "STALE";
}

/**
 * Observability helper: minutes between the source-declared effective time
 * and our recorded time. Null when the source declared no effective time.
 */
export function effectiveLagMinutes(receipt) {
  if (!isPlainObject(receipt) || !isIsoTime(receipt.effectiveTime) || !isIsoTime(receipt.recordedTime)) {
    return null;
  }
  return Math.round((Date.parse(receipt.recordedTime) - Date.parse(receipt.effectiveTime)) / 60_000);
}

// ---------------------------------------------------------------------------
// Outcome classification — the failed-closed gate
// ---------------------------------------------------------------------------

/**
 * Classify a raw per-source worker result into the exact outcome vocabulary
 * and decide promotability. Fail-closed rules, in order:
 *
 * 1. Not an object, or unknown/missing outcome claim      -> FAILED
 * 2. Claimed HELD without a holdReason                    -> FAILED
 * 3. Claimed HELD with a holdReason                       -> HELD
 * 4. Claimed FAILED                                       -> FAILED
 * 5. Claimed FETCHED/NOT_MODIFIED w/o schema-valid receipt-> FAILED (demoted)
 * 6. Claimed FETCHED with non-2xx receipt status          -> FAILED
 * 7. Claimed NOT_MODIFIED with non-304 receipt status     -> FAILED
 * 8. Otherwise                                            -> claimed outcome,
 *                                                            promotable.
 *
 * Only rule 8 is promotable. HELD and FAILED never are.
 */
export function classifySourceResult(result) {
  if (!isPlainObject(result)) {
    return { outcome: "FAILED", promotable: false, reason: "result_not_object", receiptErrors: [] };
  }
  const claimed = result.outcome;
  if (!SOURCE_FETCH_OUTCOMES.includes(claimed)) {
    return { outcome: "FAILED", promotable: false, reason: "unknown_outcome_claim", receiptErrors: [] };
  }
  if (claimed === "HELD") {
    if (!isNonEmptyString(result.holdReason)) {
      return { outcome: "FAILED", promotable: false, reason: "held_without_hold_reason", receiptErrors: [] };
    }
    return { outcome: "HELD", promotable: false, reason: result.holdReason, receiptErrors: [] };
  }
  if (claimed === "FAILED") {
    return {
      outcome: "FAILED",
      promotable: false,
      reason: isNonEmptyString(result.error) ? result.error : "failed_without_error_detail",
      receiptErrors: [],
    };
  }
  const receiptValidation = validateSourceReceipt(result.receipt);
  if (!receiptValidation.valid) {
    return {
      outcome: "FAILED",
      promotable: false,
      reason: "claimed_success_without_valid_receipt",
      receiptErrors: receiptValidation.errors,
    };
  }
  if (claimed === "FETCHED" && (result.receipt.httpStatus < 200 || result.receipt.httpStatus > 299)) {
    return { outcome: "FAILED", promotable: false, reason: "fetched_claim_without_2xx", receiptErrors: [] };
  }
  if (claimed === "NOT_MODIFIED" && result.receipt.httpStatus !== 304) {
    return { outcome: "FAILED", promotable: false, reason: "not_modified_claim_without_304", receiptErrors: [] };
  }
  return { outcome: claimed, promotable: true, reason: null, receiptErrors: [] };
}

/** True iff the result may update accepted snapshots or emit change events. */
export function canPromoteSourceResult(result) {
  return classifySourceResult(result).promotable;
}

// ---------------------------------------------------------------------------
// Redirect / content-type / size policy
// ---------------------------------------------------------------------------

/**
 * Evaluate one redirect hop. Same-origin only by default: the redirect
 * target must share the exact origin (scheme + host + port) of the URL that
 * issued the redirect. Even when a registry policy widens redirects to
 * `allowlisted_hosts`, the target host must still be in the source's
 * allowedHosts. Anything else is a policy HOLD, not a follow.
 */
export function evaluateRedirectHop({ fromUrl, toUrl, redirectPolicy = "same_origin", allowedHosts = [] }) {
  let from;
  let to;
  try {
    from = new URL(fromUrl);
    to = new URL(toUrl);
  } catch {
    return { allowed: false, reason: "redirect_target_unparseable" };
  }
  if (to.protocol !== "https:") return { allowed: false, reason: "redirect_target_not_https" };
  if (to.username || to.password) return { allowed: false, reason: "redirect_target_has_credentials" };
  const hosts = new Set(allowedHosts.map(canonicalHost));
  if (!hosts.has(canonicalHost(to.hostname))) {
    return { allowed: false, reason: "redirect_target_not_allowlisted" };
  }
  if (redirectPolicy === "same_origin" && from.origin !== to.origin) {
    return { allowed: false, reason: "redirect_target_cross_origin" };
  }
  if (redirectPolicy !== "same_origin" && redirectPolicy !== "allowlisted_hosts") {
    return { allowed: false, reason: "unknown_redirect_policy" };
  }
  return { allowed: true, reason: null };
}

/** Content-type allowlist check for a parser. Unknown parser -> not allowed. */
export function isContentTypeAllowed(contentType, parser) {
  const allowed = CONTENT_TYPES_BY_PARSER[parser];
  if (!allowed) return false;
  return allowed.includes(contentTypeBase(contentType));
}

/**
 * Max-size policy. Declared Content-Length above the ceiling is refused
 * before the body is read; received bytes above the ceiling abort the read.
 */
export function checkSizePolicy({ declaredLength = null, receivedBytes = null, maxBytes }) {
  if (!isInteger(maxBytes, 1)) return { allowed: false, reason: "max_bytes_policy_missing" };
  if (declaredLength !== null && Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { allowed: false, reason: "declared_length_exceeds_ceiling" };
  }
  if (receivedBytes !== null && Number.isFinite(receivedBytes) && receivedBytes > maxBytes) {
    return { allowed: false, reason: "received_bytes_exceed_ceiling" };
  }
  return { allowed: true, reason: null };
}

// ---------------------------------------------------------------------------
// Run records
// ---------------------------------------------------------------------------

export function createRunRecord({ runId, startedAt, registrySha256, selectedSourceIds, budgets, salvagedFromRunId = null }) {
  if (!isNonEmptyString(runId)) throw new Error("runId is required");
  if (!isIsoTime(startedAt)) throw new Error("startedAt must be a parseable timestamp");
  return {
    schemaVersion: RUN_RECORD_SCHEMA_VERSION,
    runId,
    state: "RUNNING",
    startedAt,
    completedAt: null,
    registrySha256: registrySha256 ?? null,
    selectedSourceIds: [...(selectedSourceIds ?? [])],
    budgets: budgets ?? null,
    salvagedFromRunId,
    sourceResults: [],
    failureReason: null,
    externalActionsAllowed: false,
    installAttempted: false,
    executeDiscoveredCodeAttempted: false,
    billableModelCalls: 0,
  };
}

export function isRunTerminal(run) {
  return isPlainObject(run) && RUN_TERMINAL_STATES.includes(run.state);
}

export function completeRunRecord(run, { completedAt, sourceResults }) {
  if (!isPlainObject(run) || run.state !== "RUNNING") {
    throw new Error("only a RUNNING run record can be completed");
  }
  if (!isIsoTime(completedAt)) throw new Error("completedAt must be a parseable timestamp");
  return {
    ...run,
    state: "COMPLETED",
    completedAt,
    sourceResults: [...(sourceResults ?? run.sourceResults)],
  };
}

/**
 * Fail-close a run record. The ONLY path for a non-terminal run found at
 * startup (crash, kill, model switch): it becomes FAILED_CLOSED with an
 * explicit reason. There is no API that resumes a RUNNING record as success.
 */
export function failCloseRunRecord(run, { reason, recoveredAt, recoveredBy = null, salvagedCheckpointCount = 0 }) {
  if (!isPlainObject(run)) throw new Error("run record is required");
  if (isRunTerminal(run)) throw new Error("run record is already terminal");
  if (!isNonEmptyString(reason)) throw new Error("a fail-closed reason is required");
  if (!isIsoTime(recoveredAt)) throw new Error("recoveredAt must be a parseable timestamp");
  return {
    ...run,
    state: "FAILED_CLOSED",
    completedAt: recoveredAt,
    failureReason: reason,
    recovery: {
      recoveredAt,
      recoveredBy,
      salvagedCheckpointCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Checkpoints and partial-run salvage
// ---------------------------------------------------------------------------

export function createCheckpointRecord({ runId, sequence, sourceId, classification, result, sourceStateAfter, events, recordedAt }) {
  if (!isNonEmptyString(runId)) throw new Error("runId is required");
  if (!isInteger(sequence, 1)) throw new Error("sequence must be an integer >= 1");
  if (!isNonEmptyString(sourceId)) throw new Error("sourceId is required");
  if (!SOURCE_FETCH_OUTCOMES.includes(classification?.outcome)) {
    throw new Error("classification.outcome must be in the exact outcome vocabulary");
  }
  if (!isIsoTime(recordedAt)) throw new Error("recordedAt must be a parseable timestamp");
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    runId,
    sequence,
    sourceId,
    outcome: classification.outcome,
    promotable: Boolean(classification.promotable),
    result: result ?? null,
    sourceStateAfter: sourceStateAfter ?? null,
    events: [...(events ?? [])],
    recordedAt,
  };
}

export function validateCheckpointRecord(checkpoint) {
  const errors = [];
  if (!isPlainObject(checkpoint)) return { valid: false, errors: ["checkpoint must be an object"] };
  if (checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${CHECKPOINT_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(checkpoint.runId)) errors.push("runId must be a non-empty string");
  if (!isInteger(checkpoint.sequence, 1)) errors.push("sequence must be an integer >= 1");
  if (!isNonEmptyString(checkpoint.sourceId)) errors.push("sourceId must be a non-empty string");
  if (!SOURCE_FETCH_OUTCOMES.includes(checkpoint.outcome)) errors.push("outcome must be in the exact vocabulary");
  if (typeof checkpoint.promotable !== "boolean") errors.push("promotable must be boolean");
  if (!Array.isArray(checkpoint.events)) errors.push("events must be an array");
  if (!isIsoTime(checkpoint.recordedAt)) errors.push("recordedAt must be a parseable timestamp");
  return { valid: errors.length === 0, errors };
}

/**
 * Salvage the checkpoints of an interrupted run. Deterministic and
 * double-count safe:
 *
 * - only schema-valid checkpoints belonging to `runId` are considered;
 * - one checkpoint per source survives (highest sequence wins);
 * - events are unique by id across all salvaged checkpoints;
 * - the salvaged source set is exactly the set a resuming run must skip.
 */
export function salvageCheckpoints(runId, checkpoints) {
  const bySource = new Map();
  const invalid = [];
  for (const checkpoint of checkpoints ?? []) {
    const validation = validateCheckpointRecord(checkpoint);
    if (!validation.valid || checkpoint.runId !== runId) {
      invalid.push({ checkpoint, errors: validation.errors });
      continue;
    }
    const existing = bySource.get(checkpoint.sourceId);
    if (!existing || checkpoint.sequence > existing.sequence) {
      bySource.set(checkpoint.sourceId, checkpoint);
    }
  }
  const ordered = [...bySource.values()].sort((a, b) => a.sequence - b.sequence);
  const eventById = new Map();
  for (const checkpoint of ordered) {
    for (const event of checkpoint.events) {
      if (event?.id && !eventById.has(event.id)) eventById.set(event.id, event);
    }
  }
  return {
    runId,
    salvagedSourceIds: ordered.map((checkpoint) => checkpoint.sourceId),
    checkpoints: ordered,
    events: [...eventById.values()],
    invalidCheckpointCount: invalid.length,
  };
}

/**
 * Plan the remainder of an interrupted run: the originally planned sources,
 * in original order, minus every salvaged source. Wired into
 * `runNovaCycle()` recovery: the successor run's selection is filtered
 * through this plan, so a salvaged source is structurally excluded from
 * re-polling regardless of whether its cadence makes it look due again.
 */
export function planResume({ plannedSourceIds, salvagedSourceIds }) {
  const done = new Set(salvagedSourceIds ?? []);
  return (plannedSourceIds ?? []).filter((sourceId) => !done.has(sourceId));
}

// ---------------------------------------------------------------------------
// Run lease
// ---------------------------------------------------------------------------

export function createLease({ runId, owner, now, ttlMs }) {
  if (!isNonEmptyString(runId)) throw new Error("runId is required");
  if (!isNonEmptyString(owner)) throw new Error("lease owner is required");
  if (!(now instanceof Date)) throw new Error("now must be a Date");
  if (!isInteger(ttlMs, 1000)) throw new Error("ttlMs must be an integer >= 1000");
  return {
    runId,
    leaseOwner: owner,
    acquiredAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

export function heartbeatLease(lease, { now, ttlMs }) {
  if (leaseStatus(lease, now) !== "ACTIVE") throw new Error("cannot heartbeat a non-active lease");
  return {
    ...lease,
    heartbeatAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

/**
 * ACTIVE while unexpired; EXPIRED after; INVALID when malformed. Callers
 * treat INVALID as blocking (fail closed) until the artifact is stale by
 * mtime — an unreadable lease is not proof the holder is gone.
 */
export function leaseStatus(lease, now) {
  if (!isPlainObject(lease) || !isNonEmptyString(lease.runId) || !isNonEmptyString(lease.leaseOwner) || !isIsoTime(lease.expiresAt)) {
    return "INVALID";
  }
  if (!(now instanceof Date)) return "INVALID";
  return now.getTime() <= Date.parse(lease.expiresAt) ? "ACTIVE" : "EXPIRED";
}

// ---------------------------------------------------------------------------
// Consecutive-failure alerting (structured records only — nothing is wired
// to email/push/webhooks; delivery is a later, owner-gated unit)
// ---------------------------------------------------------------------------

/** FAILED and HELD both count as a failure to obtain promotable evidence. */
export function nextConsecutiveFailureCount(priorCount, outcome) {
  const prior = isInteger(priorCount, 0) ? priorCount : 0;
  if (!SOURCE_FETCH_OUTCOMES.includes(outcome)) return prior + 1;
  return PROMOTABLE_OUTCOMES.includes(outcome) ? 0 : prior + 1;
}

/**
 * Emit at the threshold and at exact doublings of it (N, 2N, 4N, ...) so a
 * chronically failing source cannot flood the alert stream every cycle.
 */
export function shouldEmitFailureAlert(consecutiveFailures, threshold) {
  if (!isInteger(threshold, 1) || !isInteger(consecutiveFailures, 1)) return false;
  if (consecutiveFailures < threshold) return false;
  let mark = threshold;
  while (mark <= consecutiveFailures) {
    if (mark === consecutiveFailures) return true;
    mark *= 2;
  }
  return false;
}

export function buildSourceFailureAlert({
  sourceId,
  sourceName = null,
  organization = null,
  consecutiveFailures,
  threshold,
  firstFailureAt = null,
  lastFailureAt,
  lastOutcome,
  lastError = null,
  runId,
  recordedAt,
}) {
  if (!isNonEmptyString(sourceId)) throw new Error("sourceId is required");
  if (!isInteger(consecutiveFailures, 1)) throw new Error("consecutiveFailures must be an integer >= 1");
  if (!isInteger(threshold, 1)) throw new Error("threshold must be an integer >= 1");
  if (!["HELD", "FAILED"].includes(lastOutcome)) {
    throw new Error("alerts are only built for non-promotable outcomes");
  }
  if (!isNonEmptyString(runId)) throw new Error("runId is required");
  if (!isIsoTime(recordedAt)) throw new Error("recordedAt must be a parseable timestamp");
  return {
    schemaVersion: ALERT_SCHEMA_VERSION,
    kind: "SOURCE_CONSECUTIVE_FAILURE_ALERT",
    sourceId,
    sourceName,
    organization,
    consecutiveFailures,
    threshold,
    firstFailureAt,
    lastFailureAt: lastFailureAt ?? recordedAt,
    lastOutcome,
    lastError,
    runId,
    recordedAt,
    delivery: "RECORD_ONLY_NO_NOTIFICATION_WIRED",
    ownerActionRequired: true,
  };
}
