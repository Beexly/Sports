#!/usr/bin/env node

/**
 * NOVA S3 source cycle — failed-closed polling runtime with durable
 * checkpoints, run leases, partial-run salvage, and crash recovery.
 *
 * Extracted from the frozen #146 reference branch (fbc3cfe) and hardened
 * per the S3 split-unit contract:
 *
 * - RUN LEASE: one cycle at a time. An active lease blocks; an expired or
 *   provably stale lease is taken over. A corrupt lease blocks until stale
 *   (fail closed — an unreadable lease is not proof its holder is gone).
 * - CHECKPOINT COMMIT: after each source the cycle durably writes, in
 *   order, (1) an immutable checkpoint record, (2) the newly emitted
 *   events, (3) the updated state snapshot. Every write is idempotent to
 *   replay, so a crash at any point is recoverable without double-counting.
 * - MODEL-SWITCH / CRASH RECOVERY: on start, a run record with no terminal
 *   state (the process died mid-run — crash, kill, or model switch) is
 *   FAILED_CLOSED. It is NEVER silently resumed as success. Its
 *   checkpoints are salvaged exactly once: state deltas are replayed,
 *   missing events are appended (presence-checked against the event log,
 *   not re-counted), and the successor run skips every salvaged source.
 * - EXACT OUTCOMES: per-source results are FETCHED / NOT_MODIFIED / HELD /
 *   FAILED via `classifySourceResult`. No receipt means HELD or FAILED and
 *   is never promoted to an accepted snapshot or change event.
 * - APPEND-ONLY ARTIFACTS: run receipts, checkpoints, events, briefs, and
 *   alert records are JSON artifacts under `reports/nova/source-runtime/`.
 *   ZERO Prisma — S5 owns persistence.
 * - ALERTS: after N consecutive non-promotable outcomes for the same
 *   source (registry `policy.failureAlertThreshold`, re-emitted at exact
 *   doublings) a structured alert record is appended. Nothing is wired to
 *   any notification channel.
 *
 * Historical NOVA source-validation receipts remain FAILED_CLOSED — see
 * HISTORICAL_SOURCE_VALIDATION_DOCTRINE in `source-runtime-core.mjs`.
 *
 * Deterministic convergence-inventory capability: this runtime CONSUMES
 * the tooling owned by `nova/convergence-inventory-tooling` strictly by
 * npm script name (`npm run nova:inventory` / `npm run nova:inventory:verify`)
 * and records that capability on every run receipt. It never rebuilds it.
 *
 * Scraping posture: read-only conditional HTTPS GETs of registry-
 * allowlisted official metadata sources. Any extraction beyond that must
 * pass `checkClearance()` first. No CAPTCHA/login/paywall bypass, no proxy
 * rotation. Draft state: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED.
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, open, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deduplicateEvents, diffSnapshots, routeEvent, sha256 } from "./change-intelligence.mjs";
import {
  CONVERGENCE_INVENTORY_CAPABILITY,
  RUN_RECORD_SCHEMA_VERSION,
  buildSourceFailureAlert,
  classifySourceResult,
  completeRunRecord,
  createCheckpointRecord,
  createLease,
  createRunRecord,
  failCloseRunRecord,
  isRunTerminal,
  leaseStatus,
  nextConsecutiveFailureCount,
  salvageCheckpoints,
  shouldEmitFailureAlert,
} from "./source-runtime-core.mjs";
import { validateRegistry } from "./source-doctor.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const WORKER_PATH = resolve(HERE, "source-worker.mjs");
const DEFAULT_REGISTRY_PATH = resolve(REPO_ROOT, "data/nova/official-source-registry.json");
const DEFAULT_RUNTIME_DIR = resolve(REPO_ROOT, "reports/nova/source-runtime");

const ITEM_PARSERS = new Set(["github_releases_json", "rss_atom_metadata", "cisa_kev_json"]);
const STRUCTURED_PAGE_PARSER = "structured_page_delta";
const LEASE_GRACE_MS = 60_000;

function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function finiteInteger(value, fallback, minimum = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

export function parseArgs(argv) {
  const args = {
    registryPath: DEFAULT_REGISTRY_PATH,
    runtimeDir: DEFAULT_RUNTIME_DIR,
    maxSources: 12,
    requestBudget: 12,
    byteBudget: 12 * 1024 * 1024,
    sourceTimeoutMs: 25_000,
    cycleTimeoutMs: 5 * 60_000,
    lockStaleMs: 30 * 60_000,
    enabledOnly: false,
    dryRun: false,
    sourceIds: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registryPath = resolve(argv[++index]);
    else if (arg === "--runtime-dir") args.runtimeDir = resolve(argv[++index]);
    else if (arg === "--max-sources") args.maxSources = finiteInteger(argv[++index], args.maxSources);
    else if (arg === "--request-budget") args.requestBudget = finiteInteger(argv[++index], args.requestBudget);
    else if (arg === "--byte-budget") args.byteBudget = finiteInteger(argv[++index], args.byteBudget);
    else if (arg === "--source-timeout-ms") args.sourceTimeoutMs = finiteInteger(argv[++index], args.sourceTimeoutMs, 1_000);
    else if (arg === "--cycle-timeout-ms") args.cycleTimeoutMs = finiteInteger(argv[++index], args.cycleTimeoutMs, 5_000);
    else if (arg === "--lock-stale-ms") args.lockStaleMs = finiteInteger(argv[++index], args.lockStaleMs, 60_000);
    else if (arg === "--enabled-only") args.enabledOnly = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--source") args.sourceIds.push(String(argv[++index] ?? "").trim());
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function defaultState() {
  return {
    schemaVersion: 2,
    updatedAt: null,
    cycleCount: 0,
    sources: {},
    recentEventIds: [],
  };
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && (error.code === "ENOENT" || error instanceof SyntaxError)) {
      return fallback;
    }
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temp, path);
}

/** Write-once JSON: append-only artifacts are never overwritten. */
async function writeOnceJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") return false;
    throw error;
  }
}

async function appendJsonLines(path, values) {
  if (values.length === 0) return;
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

/** Ids already present in an append-only JSONL file (crash-replay guard). */
async function idsPresentInJsonl(path, ids) {
  const wanted = new Set(ids);
  const present = new Set();
  if (wanted.size === 0) return present;
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return present;
    throw error;
  }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value?.id && wanted.has(value.id)) present.add(value.id);
    } catch {
      // A torn trailing line from a crash mid-append is unreadable; the ids
      // inside it are treated as absent, which re-appends them — duplicate
      // *lines* are tolerated, silent loss is not. Consumers dedupe by id.
    }
  }
  return present;
}

function eventLogPath(runtimeDir, isoTime) {
  return resolve(runtimeDir, "events", `${isoTime.slice(0, 10)}.jsonl`);
}

function alertLogPath(runtimeDir, isoTime) {
  return resolve(runtimeDir, "alerts", `${isoTime.slice(0, 10)}.jsonl`);
}

function checkpointDir(runtimeDir, runId) {
  return resolve(runtimeDir, "checkpoints", runId);
}

function checkpointPath(runtimeDir, runId, sequence, sourceId) {
  return resolve(checkpointDir(runtimeDir, runId), `${String(sequence).padStart(3, "0")}-${sourceId}.json`);
}

// ---------------------------------------------------------------------------
// Lease handling
// ---------------------------------------------------------------------------

async function acquireRunLease({ runtimeDir, runId, lockStaleMs, cycleTimeoutMs, clock }) {
  const leasePath = resolve(runtimeDir, "run-lease.json");
  await mkdir(runtimeDir, { recursive: true });
  const ttlMs = cycleTimeoutMs + LEASE_GRACE_MS;

  const writeLease = async () => {
    const lease = createLease({ runId, owner: `pid:${process.pid}`, now: clock(), ttlMs });
    const handle = await open(leasePath, "wx");
    await handle.writeFile(`${JSON.stringify(lease, null, 2)}\n`);
    await handle.close();
    return async () => {
      try {
        await unlink(leasePath);
      } catch (error) {
        if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
      }
    };
  };

  try {
    return await writeLease();
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "EEXIST")) throw error;
    const existing = await readJson(leasePath, null);
    const status = leaseStatus(existing, clock());
    if (status === "ACTIVE") {
      throw new Error(`NOVA cycle lease is active at ${leasePath} (owner ${existing.leaseOwner}, run ${existing.runId}).`);
    }
    if (status === "INVALID") {
      // Fail closed: a corrupt lease only yields to takeover once provably stale.
      const info = await stat(leasePath);
      if (clock().getTime() - info.mtimeMs <= lockStaleMs) {
        throw new Error(`NOVA cycle lease at ${leasePath} is unreadable and not yet stale; refusing takeover.`);
      }
    }
    await unlink(leasePath);
    return writeLease();
  }
}

// ---------------------------------------------------------------------------
// Worker dispatch
// ---------------------------------------------------------------------------

function sanitizedWorkerEnv() {
  const keys = ["SystemRoot", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE"];
  return Object.fromEntries(keys.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])));
}

function failedWorkerResult(error) {
  return {
    outcome: "FAILED",
    holdReason: null,
    receipt: null,
    error,
    installAttempted: false,
    executeAttempted: false,
  };
}

async function runWorker(payload, timeoutMs, maxOutputBytes = 2 * 1024 * 1024) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [WORKER_PATH, encoded], {
      cwd: REPO_ROOT,
      env: sanitizedWorkerEnv(),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let timedOut = false;
    let oversized = false;

    const capture = (target) => (chunk) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > maxOutputBytes) {
        oversized = true;
        child.kill();
        return;
      }
      target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise(failedWorkerResult(`Worker spawn failed: ${error.message}`));
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (timedOut || oversized) {
        resolvePromise(
          failedWorkerResult(timedOut ? `Worker exceeded ${timeoutMs}ms.` : `Worker output exceeded ${maxOutputBytes} bytes.`),
        );
        return;
      }
      const text = Buffer.concat(stdout).toString("utf8").trim();
      try {
        const lines = text.split(/\r?\n/).filter(Boolean);
        resolvePromise(JSON.parse(lines.at(-1) ?? "{}"));
      } catch {
        const errorText = Buffer.concat(stderr).toString("utf8").trim();
        resolvePromise(failedWorkerResult(`Worker returned invalid JSON${errorText ? `: ${errorText.slice(0, 500)}` : "."}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Source selection and per-source state transitions
// ---------------------------------------------------------------------------

function nextDueAt(startedAt, cadenceMinutes, failureCount = 0) {
  const multiplier = failureCount > 0 ? Math.min(2 ** failureCount, 8) : 1;
  return new Date(startedAt.getTime() + cadenceMinutes * multiplier * 60_000).toISOString();
}

function sourceIsDue(sourceState, now) {
  if (!sourceState?.nextDueAt) return true;
  const due = Date.parse(sourceState.nextDueAt);
  return !Number.isFinite(due) || due <= now.getTime();
}

function selectSources(registry, state, args, now) {
  const requested = new Set(args.sourceIds.filter(Boolean));
  return registry.sources
    .filter((source) => source.validationState !== "retired")
    .filter((source) => !args.enabledOnly || source.enabled)
    .filter((source) => requested.size === 0 || requested.has(source.id))
    .filter((source) => sourceIsDue(state.sources[source.id], now))
    .sort((left, right) => {
      const leftLast = state.sources[left.id]?.lastRunAt ?? "";
      const rightLast = state.sources[right.id]?.lastRunAt ?? "";
      if (!leftLast && rightLast) return -1;
      if (leftLast && !rightLast) return 1;
      return leftLast.localeCompare(rightLast) || left.id.localeCompare(right.id);
    })
    .slice(0, Math.min(args.maxSources, args.requestBudget));
}

function snapshotFromResult(result) {
  if (result.summary === null || result.summary === undefined) return null;
  return {
    summary: result.summary,
    summaryHash: sha256(result.summary),
    capturedAt: result.completedAt,
    contentHash: result.receipt?.contentHash ?? null,
    etag: result.http?.etag ?? null,
    lastModified: result.http?.lastModified ?? null,
    finalUrl: result.receipt?.url ?? null,
    parser: result.parser,
    parserVersion: result.parserVersion,
    effectiveTime: result.receipt?.effectiveTime ?? null,
    recordedTime: result.receipt?.recordedTime ?? null,
  };
}

function createInitialSourceState() {
  return {
    lastRunAt: null,
    nextDueAt: null,
    successStreak: 0,
    consecutiveFailures: 0,
    firstFailureAt: null,
    observationState: "UNVALIDATED",
    acceptedSnapshot: null,
    lastObservedSnapshot: null,
    stableObservationCount: 0,
    conditional: {},
    lastError: null,
    lastOutcome: null,
    lastReceiptHash: null,
  };
}

function decorateEvents(source, events) {
  return events.map((event) => ({
    ...event,
    organization: source.organization,
    sourceName: source.name,
    projectScopes: source.projectScopes,
    route: routeEvent(event),
    lifecycleState: event.verified ? "VERIFIED" : "OBSERVED",
    integrationAuthority: "NONE",
  }));
}

/** Applies a promotable (FETCHED / NOT_MODIFIED) result. Caller must have
 * verified promotability via classifySourceResult — this function throws
 * if handed anything else, so the promotion gate cannot be skipped. */
function processSuccessfulObservation(source, priorState, result, classification, observedAt) {
  if (!classification.promotable) {
    throw new Error("processSuccessfulObservation requires a promotable classification");
  }
  const state = { ...createInitialSourceState(), ...priorState };
  const current = classification.outcome === "FETCHED" ? snapshotFromResult(result) : state.lastObservedSnapshot;
  const events = [];

  state.lastRunAt = observedAt;
  state.nextDueAt = nextDueAt(new Date(observedAt), source.cadenceMinutes, 0);
  state.successStreak += 1;
  state.consecutiveFailures = 0;
  state.firstFailureAt = null;
  state.lastError = null;
  state.lastOutcome = classification.outcome;
  state.lastReceiptHash = sha256(result.receipt);
  state.observationState = state.successStreak >= 2 ? "OBSERVATION_READY" : "BASELINE_PROBING";
  state.conditional = {
    ...(result.http?.etag ? { etag: result.http.etag } : state.conditional),
    ...(result.http?.lastModified ? { lastModified: result.http.lastModified } : {}),
  };

  if (!current) return { state, events };

  if (!state.acceptedSnapshot) {
    state.acceptedSnapshot = current;
    state.lastObservedSnapshot = current;
    state.stableObservationCount = 1;
    return { state, events };
  }

  const sameAsLast = state.lastObservedSnapshot?.summaryHash === current.summaryHash;
  state.stableObservationCount = sameAsLast ? state.stableObservationCount + 1 : 1;
  state.lastObservedSnapshot = current;

  if (ITEM_PARSERS.has(source.parser)) {
    if (state.acceptedSnapshot.summaryHash !== current.summaryHash && state.successStreak >= 2) {
      events.push(...diffSnapshots(source, state.acceptedSnapshot, current, new Date(observedAt)));
      state.acceptedSnapshot = current;
    }
  } else if (source.parser === STRUCTURED_PAGE_PARSER) {
    if (
      state.acceptedSnapshot.summaryHash !== current.summaryHash &&
      state.stableObservationCount >= 2 &&
      state.successStreak >= 2
    ) {
      events.push(...diffSnapshots(source, state.acceptedSnapshot, current, new Date(observedAt)));
      state.acceptedSnapshot = current;
    }
  }

  return {
    state,
    events: decorateEvents(source, events.filter((event) => event.kind !== "MISSING_ITEM")),
  };
}

/** Applies a non-promotable (HELD / FAILED) result. Never touches the
 * accepted snapshot. Tracks the consecutive-failure counter for alerts. */
function processFailure(source, priorState, result, classification, observedAt) {
  const state = { ...createInitialSourceState(), ...priorState };
  state.lastRunAt = observedAt;
  state.consecutiveFailures = nextConsecutiveFailureCount(state.consecutiveFailures, classification.outcome);
  state.firstFailureAt = state.firstFailureAt ?? observedAt;
  state.successStreak = 0;
  state.observationState = state.acceptedSnapshot ? "PAUSED_FAILED_CLOSED" : "UNVALIDATED";
  state.nextDueAt = nextDueAt(new Date(observedAt), source.cadenceMinutes, state.consecutiveFailures);
  state.lastError = result?.error ?? classification.reason ?? "Unknown failed-closed source error.";
  state.lastOutcome = classification.outcome;
  state.lastReceiptHash = sha256(result ?? {});
  return state;
}

function maybeBuildAlert({ source, state, classification, runId, threshold, recordedAt }) {
  if (!shouldEmitFailureAlert(state.consecutiveFailures, threshold)) return null;
  return buildSourceFailureAlert({
    sourceId: source.id,
    sourceName: source.name,
    organization: source.organization,
    consecutiveFailures: state.consecutiveFailures,
    threshold,
    firstFailureAt: state.firstFailureAt,
    lastFailureAt: recordedAt,
    lastOutcome: classification.outcome,
    lastError: state.lastError,
    runId,
    recordedAt,
  });
}

/** Alert records carry a deterministic id so crash replay is presence-
 * checkable in the append-only alert log, exactly like events. */
function withAlertId(alert) {
  return { ...alert, id: sha256({ sourceId: alert.sourceId, runId: alert.runId, consecutiveFailures: alert.consecutiveFailures }).slice(0, 24) };
}

// ---------------------------------------------------------------------------
// Crash / model-switch recovery with checkpoint salvage
// ---------------------------------------------------------------------------

async function loadCheckpoints(runtimeDir, runId) {
  const dir = checkpointDir(runtimeDir, runId);
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return [];
    throw error;
  }
  const checkpoints = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".json")) continue;
    const value = await readJson(resolve(dir, name), null);
    if (value) checkpoints.push(value);
  }
  return checkpoints;
}

/**
 * Fail-close and salvage a non-terminal run left behind by a crash or
 * model switch. Idempotent: replaying a salvaged checkpoint overwrites the
 * per-source state with the identical value, and events/alerts are
 * presence-checked against the append-only logs before appending.
 * Returns a summary for the successor run's receipt, or null when there
 * was nothing to recover.
 */
async function recoverInterruptedRun({ runtimeDir, state, threshold, clock, recoveredBy }) {
  const activeRunPath = resolve(runtimeDir, "active-run.json");
  const activeRun = await readJson(activeRunPath, null);
  if (!activeRun || typeof activeRun !== "object") return null;
  if (isRunTerminal(activeRun)) {
    // A terminal record has no business sitting in the active slot; archive it.
    await writeOnceJson(resolve(runtimeDir, "runs", `${activeRun.runId}.json`), activeRun);
    await unlink(activeRunPath);
    return null;
  }

  const checkpoints = await loadCheckpoints(runtimeDir, activeRun.runId);
  const salvage = salvageCheckpoints(activeRun.runId, checkpoints);
  const recoveredAt = nowIso(clock);

  // 1. Replay salvaged per-source state (idempotent overwrite) and collect
  //    events/alerts that never made it into the append-only logs.
  for (const checkpoint of salvage.checkpoints) {
    if (checkpoint.sourceStateAfter) {
      state.sources[checkpoint.sourceId] = checkpoint.sourceStateAfter;
    }
    const logPath = eventLogPath(runtimeDir, checkpoint.recordedAt);
    const eventIds = checkpoint.events.map((event) => event.id).filter(Boolean);
    const present = await idsPresentInJsonl(logPath, eventIds);
    const missing = checkpoint.events.filter((event) => event?.id && !present.has(event.id));
    await appendJsonLines(logPath, missing);
    for (const event of missing) {
      if (!state.recentEventIds.includes(event.id)) state.recentEventIds.unshift(event.id);
    }
    // Recompute the deterministic alert for this checkpoint and append it
    // only if the alert log does not already carry it.
    const after = checkpoint.sourceStateAfter;
    if (after && !checkpoint.promotable && shouldEmitFailureAlert(after.consecutiveFailures, threshold)) {
      const alert = withAlertId(
        buildSourceFailureAlert({
          sourceId: checkpoint.sourceId,
          sourceName: null,
          organization: null,
          consecutiveFailures: after.consecutiveFailures,
          threshold,
          firstFailureAt: after.firstFailureAt,
          lastFailureAt: checkpoint.recordedAt,
          lastOutcome: checkpoint.outcome,
          lastError: after.lastError,
          runId: checkpoint.runId,
          recordedAt: checkpoint.recordedAt,
        }),
      );
      const alertPath = alertLogPath(runtimeDir, checkpoint.recordedAt);
      const alreadyThere = await idsPresentInJsonl(alertPath, [alert.id]);
      if (!alreadyThere.has(alert.id)) await appendJsonLines(alertPath, [alert]);
    }
  }
  state.recentEventIds = state.recentEventIds.slice(0, 2_000);
  state.updatedAt = recoveredAt;
  await atomicWriteJson(resolve(runtimeDir, "state.json"), state);

  // 2. FAILED_CLOSED terminal receipt for the interrupted run. Never a
  //    silent resume-as-success; write-once keeps runs/ append-only.
  const failedClosed = failCloseRunRecord(activeRun, {
    reason: "NON_TERMINAL_RUN_RECORD_RECOVERED_AT_STARTUP",
    recoveredAt,
    recoveredBy,
    salvagedCheckpointCount: salvage.checkpoints.length,
  });
  await writeOnceJson(resolve(runtimeDir, "runs", `${failedClosed.runId}.json`), failedClosed);
  await unlink(activeRunPath);

  return {
    recoveredRunId: activeRun.runId,
    recoveredAt,
    terminalState: "FAILED_CLOSED",
    salvagedSourceIds: salvage.salvagedSourceIds,
    salvagedCheckpointCount: salvage.checkpoints.length,
    salvagedEventIds: salvage.events.map((event) => event.id).filter(Boolean),
    invalidCheckpointCount: salvage.invalidCheckpointCount,
  };
}

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------

function buildBrief(runId, generatedAt, events, sourceResults) {
  const topEvents = [...events]
    .sort((left, right) => (right.urgency ?? 0) - (left.urgency ?? 0) || left.id.localeCompare(right.id))
    .slice(0, 5)
    .map((event) => ({
      eventId: event.id,
      urgency: event.urgency,
      eventClass: event.eventClass,
      title: event.title,
      source: event.sourceName,
      projectScopes: event.projectScopes,
      verified: event.verified,
      immediate: event.route.immediate,
      ownerDecisionRequired: event.route.ownerApprovalRequired,
      nextAction: "Map project fit and build the smallest evidence-backed decision test.",
    }));
  return {
    schemaVersion: 2,
    runId,
    generatedAt,
    headline:
      topEvents.length > 0
        ? `${topEvents.length} verified or observed AI ecosystem changes require review.`
        : "No new governed change events in this cycle.",
    topEvents,
    sourceHealth: {
      checked: sourceResults.length,
      fetched: sourceResults.filter((item) => item.outcome === "FETCHED").length,
      notModified: sourceResults.filter((item) => item.outcome === "NOT_MODIFIED").length,
      held: sourceResults.filter((item) => item.outcome === "HELD").length,
      failed: sourceResults.filter((item) => item.outcome === "FAILED").length,
    },
    externalActionsAllowed: false,
    realizedRevenueUsd: 0,
    usableCreditsUsd: 0,
  };
}

// ---------------------------------------------------------------------------
// The cycle
// ---------------------------------------------------------------------------

/**
 * Run one NOVA source cycle. `dependencies` is a test seam only:
 * `clock` (Date factory), `runWorkerImpl` (replaces the child-process
 * worker), and the fault-injection hooks `onCheckpointWritten` /
 * `onEventsAppended` (both invoked with the sourceId; production leaves
 * them undefined). Nothing here may dispatch a model call or take any
 * external action beyond the bounded read-only GET in the worker.
 */
export async function runNovaCycle(args, dependencies = {}) {
  const clock = dependencies.clock ?? (() => new Date());
  const runWorkerImpl = dependencies.runWorkerImpl ?? runWorker;
  const onCheckpointWritten = dependencies.onCheckpointWritten ?? (() => {});
  const onEventsAppended = dependencies.onEventsAppended ?? (() => {});

  const startedAtDate = clock();
  const startedAt = startedAtDate.toISOString();
  const runId = `nova-${startedAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const registryRaw = await readFile(args.registryPath, "utf8");
  const registry = JSON.parse(registryRaw);
  const validation = validateRegistry(registry);
  if (!validation.valid) throw new Error(`NOVA source registry is invalid:\n${validation.errors.join("\n")}`);
  const threshold = registry.policy.failureAlertThreshold;

  const statePath = resolve(args.runtimeDir, "state.json");
  const state = await readJson(statePath, defaultState());

  if (args.dryRun) {
    const activeRun = await readJson(resolve(args.runtimeDir, "active-run.json"), null);
    const selected = selectSources(registry, state, args, startedAtDate);
    return {
      schemaVersion: RUN_RECORD_SCHEMA_VERSION,
      runId,
      startedAt,
      dryRun: true,
      selectedSourceIds: selected.map((source) => source.id),
      pendingRecoveryRunId: activeRun && !isRunTerminal(activeRun) ? activeRun.runId : null,
      stateChanged: false,
      externalActionsAllowed: false,
    };
  }

  // Recovery precedes selection: salvaged checkpoints advance per-source
  // state, so the selector naturally skips every salvaged source.
  const salvageSummary = await recoverInterruptedRun({
    runtimeDir: args.runtimeDir,
    state,
    threshold,
    clock,
    recoveredBy: runId,
  });

  const selected = selectSources(registry, state, args, startedAtDate);
  let run = createRunRecord({
    runId,
    startedAt,
    registrySha256: sha256(registryRaw),
    selectedSourceIds: selected.map((source) => source.id),
    budgets: {
      requestBudget: args.requestBudget,
      byteBudget: args.byteBudget,
      sourceTimeoutMs: args.sourceTimeoutMs,
      cycleTimeoutMs: args.cycleTimeoutMs,
    },
    salvagedFromRunId: salvageSummary?.recoveredRunId ?? null,
  });
  const activeRunPath = resolve(args.runtimeDir, "active-run.json");
  await atomicWriteJson(activeRunPath, run);

  const cycleDeadline = startedAtDate.getTime() + args.cycleTimeoutMs;
  const sourceResults = [];
  const newEvents = [];
  const alerts = [];
  let consumedBytes = 0;
  let sequence = 0;

  for (const source of selected) {
    if (clock().getTime() >= cycleDeadline) break;
    if (sourceResults.length >= args.requestBudget) break;
    const remainingBytes = args.byteBudget - consumedBytes;
    if (remainingBytes <= 0) break;

    const priorState = state.sources[source.id] ?? createInitialSourceState();
    const result = await runWorkerImpl(
      {
        source,
        timeoutMs: Math.min(args.sourceTimeoutMs - 1_000, registry.policy.defaultTimeoutMs),
        maxBytes: Math.min(registry.policy.defaultMaxBytes, remainingBytes),
        maxRedirects: registry.policy.maxRedirects,
        redirectPolicy: registry.policy.redirectPolicy,
        userAgent: registry.policy.userAgent,
        conditional: priorState.conditional,
        defaultFreshnessHorizonMinutes: registry.policy.defaultFreshnessHorizonMinutes,
      },
      args.sourceTimeoutMs,
    );

    const classification = classifySourceResult(result);
    const observedAt = nowIso(clock);
    const bytes = classification.promotable ? Number(result.receipt?.contentLength) || 0 : 0;
    consumedBytes += bytes;

    let nextSourceState;
    let sourceEvents = [];
    if (classification.promotable) {
      const processed = processSuccessfulObservation(source, priorState, result, classification, observedAt);
      nextSourceState = processed.state;
      sourceEvents = processed.events;
    } else {
      nextSourceState = processFailure(source, priorState, result, classification, observedAt);
    }

    const recentIds = new Set(state.recentEventIds);
    const uniqueEvents = deduplicateEvents(sourceEvents).filter((event) => !recentIds.has(event.id));

    const alert = classification.promotable
      ? null
      : maybeBuildAlert({ source, state: nextSourceState, classification, runId, threshold, recordedAt: observedAt });
    const identifiedAlert = alert ? withAlertId(alert) : null;

    sourceResults.push({
      sourceId: source.id,
      outcome: classification.outcome,
      promotable: classification.promotable,
      reason: classification.reason,
      receipt: classification.promotable ? result.receipt : null,
      receiptErrors: classification.receiptErrors,
      bytes,
      error: result?.error ?? null,
      alertEmitted: Boolean(identifiedAlert),
      resultHash: sha256(result ?? {}),
    });

    // Checkpoint-commit, in crash-recoverable order:
    // (1) immutable checkpoint (carries state delta + events for salvage),
    sequence += 1;
    const checkpoint = createCheckpointRecord({
      runId,
      sequence,
      sourceId: source.id,
      classification,
      result: { outcome: classification.outcome, receipt: classification.promotable ? result.receipt : null, error: result?.error ?? null },
      sourceStateAfter: nextSourceState,
      events: uniqueEvents,
      recordedAt: observedAt,
    });
    await writeOnceJson(checkpointPath(args.runtimeDir, runId, sequence, source.id), checkpoint);
    onCheckpointWritten(source.id);

    // (2) append-only event + alert logs (presence-checked on replay),
    await appendJsonLines(eventLogPath(args.runtimeDir, observedAt), uniqueEvents);
    if (identifiedAlert) {
      await appendJsonLines(alertLogPath(args.runtimeDir, observedAt), [identifiedAlert]);
      alerts.push(identifiedAlert);
    }
    onEventsAppended(source.id);

    // (3) durable state snapshot + active-run progress.
    state.sources[source.id] = nextSourceState;
    state.recentEventIds = [...uniqueEvents.map((event) => event.id), ...state.recentEventIds].slice(0, 2_000);
    state.updatedAt = observedAt;
    await atomicWriteJson(statePath, state);
    run = { ...run, sourceResults: [...sourceResults] };
    await atomicWriteJson(activeRunPath, run);

    newEvents.push(...uniqueEvents);
  }

  state.updatedAt = nowIso(clock);
  state.cycleCount = Number(state.cycleCount || 0) + 1;
  await atomicWriteJson(statePath, state);

  const brief = buildBrief(runId, state.updatedAt, newEvents, sourceResults);
  const terminalRun = completeRunRecord(run, { completedAt: state.updatedAt, sourceResults });
  const runReceipt = {
    ...terminalRun,
    registryPath: args.registryPath,
    salvage: salvageSummary,
    newEventIds: newEvents.map((event) => event.id),
    alertIds: alerts.map((alert) => alert.id),
    requestsUsed: sourceResults.length,
    bytesUsed: consumedBytes,
    convergenceInventoryCapability: CONVERGENCE_INVENTORY_CAPABILITY,
  };

  await writeOnceJson(resolve(args.runtimeDir, "runs", `${runId}.json`), runReceipt);
  await writeOnceJson(resolve(args.runtimeDir, "briefs", `${runId}.json`), brief);
  await unlink(activeRunPath);

  return { runReceipt, brief, events: newEvents, alerts, salvage: salvageSummary };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/nova/run-cycle.mjs [options]");
    console.log("  --enabled-only              Poll only sources explicitly enabled in the registry");
    console.log("  --source ID                 Restrict to one source; repeatable");
    console.log("  --max-sources N             Maximum selected sources per cycle (default 12)");
    console.log("  --request-budget N          Hard request ceiling (default 12)");
    console.log("  --byte-budget N             Aggregate response-byte ceiling (default 12 MiB)");
    console.log("  --source-timeout-ms N       Hard child-process timeout per source");
    console.log("  --cycle-timeout-ms N        Total cycle deadline");
    console.log("  --lock-stale-ms N           Age after which a corrupt lease may be taken over");
    console.log("  --runtime-dir PATH          Append-only runtime artifact directory");
    console.log("  --dry-run                   Select due sources without network or writes");
    return;
  }

  if (args.dryRun) {
    const result = await runNovaCycle(args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const clock = () => new Date();
  const runId = `lease-${Date.now()}`;
  const release = await acquireRunLease({
    runtimeDir: args.runtimeDir,
    runId,
    lockStaleMs: args.lockStaleMs,
    cycleTimeoutMs: args.cycleTimeoutMs,
    clock,
  });
  try {
    const result = await runNovaCycle(args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await release();
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}

export { acquireRunLease, selectSources, processSuccessfulObservation, processFailure, createInitialSourceState, writeOnceJson };
