#!/usr/bin/env node

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFile,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  deduplicateEvents,
  diffSnapshots,
  routeEvent,
  sha256,
} from "./change-intelligence.mjs";
import { validateRegistry } from "./source-doctor.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const WORKER_PATH = resolve(HERE, "source-worker.mjs");
const DEFAULT_REGISTRY_PATH = resolve(REPO_ROOT, "data/nova/official-source-registry.json");
const DEFAULT_RUNTIME_DIR = resolve(REPO_ROOT, ".nova-runtime");

const ITEM_PARSERS = new Set(["github_releases_json", "rss_atom_metadata", "cisa_kev_json"]);
const STRUCTURED_PAGE_PARSER = "structured_page_delta";

function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

function finiteInteger(value, fallback, minimum = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

function parseArgs(argv) {
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
    schemaVersion: 1,
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
    if (error && typeof error === "object" && error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temp, path);
}

async function appendJsonLines(path, values) {
  if (values.length === 0) return;
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

async function acquireLock(path, staleMs, clock = () => new Date()) {
  await mkdir(dirname(path), { recursive: true });
  const attempt = async () => {
    const handle = await open(path, "wx");
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, acquiredAt: clock().toISOString() })}\n`);
    await handle.close();
    return async () => {
      try {
        await unlink(path);
      } catch (error) {
        if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
      }
    };
  };

  try {
    return await attempt();
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "EEXIST")) throw error;
    const info = await stat(path);
    if (clock().getTime() - info.mtimeMs <= staleMs) {
      throw new Error(`NOVA cycle lock is active at ${path}.`);
    }
    await unlink(path);
    return attempt();
  }
}

function sanitizedWorkerEnv() {
  const keys = ["SystemRoot", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE"];
  return Object.fromEntries(keys.flatMap((key) => process.env[key] ? [[key, process.env[key]]] : []));
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
      resolvePromise({
        outcome: "FAILED_CLOSED",
        error: `Worker spawn failed: ${error.message}`,
        installAttempted: false,
        executeAttempted: false,
      });
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (timedOut || oversized) {
        resolvePromise({
          outcome: "FAILED_CLOSED",
          error: timedOut ? `Worker exceeded ${timeoutMs}ms.` : `Worker output exceeded ${maxOutputBytes} bytes.`,
          installAttempted: false,
          executeAttempted: false,
        });
        return;
      }
      const text = Buffer.concat(stdout).toString("utf8").trim();
      try {
        const lines = text.split(/\r?\n/).filter(Boolean);
        resolvePromise(JSON.parse(lines.at(-1) ?? "{}"));
      } catch {
        const errorText = Buffer.concat(stderr).toString("utf8").trim();
        resolvePromise({
          outcome: "FAILED_CLOSED",
          error: `Worker returned invalid JSON${errorText ? `: ${errorText.slice(0, 500)}` : "."}`,
          installAttempted: false,
          executeAttempted: false,
        });
      }
    });
  });
}

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
    bodySha256: result.http?.sha256 ?? null,
    etag: result.http?.etag ?? null,
    lastModified: result.http?.lastModified ?? null,
    finalUrl: result.http?.finalUrl ?? null,
    parser: result.parser,
    parserVersion: result.parserVersion,
  };
}

function createInitialSourceState() {
  return {
    lastRunAt: null,
    nextDueAt: null,
    successStreak: 0,
    failureCount: 0,
    observationState: "UNVALIDATED",
    acceptedSnapshot: null,
    lastObservedSnapshot: null,
    stableObservationCount: 0,
    conditional: {},
    lastError: null,
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

function processSuccessfulObservation(source, priorState, result, observedAt) {
  const state = { ...createInitialSourceState(), ...priorState };
  const current = result.outcome === "FETCHED" ? snapshotFromResult(result) : state.lastObservedSnapshot;
  const events = [];

  state.lastRunAt = observedAt;
  state.nextDueAt = nextDueAt(new Date(observedAt), source.cadenceMinutes, 0);
  state.successStreak += 1;
  state.failureCount = 0;
  state.lastError = null;
  state.lastReceiptHash = sha256(result);
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

function processFailure(source, priorState, result, observedAt) {
  const state = { ...createInitialSourceState(), ...priorState };
  state.lastRunAt = observedAt;
  state.failureCount += 1;
  state.successStreak = 0;
  state.observationState = state.acceptedSnapshot ? "PAUSED_FAILED_CLOSED" : "UNVALIDATED";
  state.nextDueAt = nextDueAt(new Date(observedAt), source.cadenceMinutes, state.failureCount);
  state.lastError = result.error ?? "Unknown failed-closed source error.";
  state.lastReceiptHash = sha256(result);
  return state;
}

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
    schemaVersion: 1,
    runId,
    generatedAt,
    headline: topEvents.length > 0 ? `${topEvents.length} verified or observed AI ecosystem changes require review.` : "No new governed change events in this cycle.",
    topEvents,
    sourceHealth: {
      checked: sourceResults.length,
      fetched: sourceResults.filter((item) => item.outcome === "FETCHED").length,
      unchanged: sourceResults.filter((item) => item.outcome === "UNCHANGED").length,
      failedClosed: sourceResults.filter((item) => item.outcome === "FAILED_CLOSED").length,
    },
    externalActionsAllowed: false,
    realizedRevenueUsd: 0,
    usableCreditsUsd: 0,
  };
}

export async function runNovaCycle(args, dependencies = {}) {
  const clock = dependencies.clock ?? (() => new Date());
  const startedAtDate = clock();
  const startedAt = startedAtDate.toISOString();
  const runId = `nova-${startedAt.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const registryRaw = await readFile(args.registryPath, "utf8");
  const registry = JSON.parse(registryRaw);
  const validation = validateRegistry(registry);
  if (!validation.valid) throw new Error(`NOVA source registry is invalid:\n${validation.errors.join("\n")}`);

  const statePath = resolve(args.runtimeDir, "state.json");
  const state = await readJson(statePath, defaultState());
  const selected = selectSources(registry, state, args, startedAtDate);
  if (args.dryRun) {
    return {
      schemaVersion: 1,
      runId,
      startedAt,
      dryRun: true,
      selectedSourceIds: selected.map((source) => source.id),
      stateChanged: false,
      externalActionsAllowed: false,
    };
  }

  const cycleDeadline = startedAtDate.getTime() + args.cycleTimeoutMs;
  const sourceResults = [];
  const newEvents = [];
  let consumedBytes = 0;

  for (const source of selected) {
    if (clock().getTime() >= cycleDeadline) break;
    if (sourceResults.length >= args.requestBudget) break;
    const remainingBytes = args.byteBudget - consumedBytes;
    if (remainingBytes <= 0) break;

    const priorState = state.sources[source.id] ?? createInitialSourceState();
    const result = await runWorker({
      source,
      timeoutMs: Math.min(args.sourceTimeoutMs - 1_000, registry.policy.defaultTimeoutMs),
      maxBytes: Math.min(registry.policy.defaultMaxBytes, remainingBytes),
      maxRedirects: registry.policy.maxRedirects,
      userAgent: registry.policy.userAgent,
      conditional: priorState.conditional,
    }, args.sourceTimeoutMs);

    const observedAt = nowIso(clock);
    consumedBytes += Number(result.http?.bytes) || 0;
    sourceResults.push({
      sourceId: source.id,
      outcome: result.outcome,
      bytes: Number(result.http?.bytes) || 0,
      error: result.error ?? null,
      receiptHash: sha256(result),
    });

    if (result.outcome === "FETCHED" || result.outcome === "UNCHANGED") {
      const processed = processSuccessfulObservation(source, priorState, result, observedAt);
      state.sources[source.id] = processed.state;
      newEvents.push(...processed.events);
    } else {
      state.sources[source.id] = processFailure(source, priorState, result, observedAt);
    }
  }

  const recentIds = new Set(state.recentEventIds ?? []);
  const uniqueEvents = deduplicateEvents(newEvents).filter((event) => !recentIds.has(event.id));
  state.recentEventIds = [...uniqueEvents.map((event) => event.id), ...(state.recentEventIds ?? [])].slice(0, 2_000);
  state.updatedAt = nowIso(clock);
  state.cycleCount = Number(state.cycleCount || 0) + 1;

  const brief = buildBrief(runId, state.updatedAt, uniqueEvents, sourceResults);
  const runReceipt = {
    schemaVersion: 1,
    runId,
    startedAt,
    completedAt: state.updatedAt,
    registrySha256: sha256(registryRaw),
    selectedSourceIds: selected.map((source) => source.id),
    sourceResults,
    newEventIds: uniqueEvents.map((event) => event.id),
    requestBudget: args.requestBudget,
    requestsUsed: sourceResults.length,
    byteBudget: args.byteBudget,
    bytesUsed: consumedBytes,
    sourceTimeoutMs: args.sourceTimeoutMs,
    cycleTimeoutMs: args.cycleTimeoutMs,
    externalActionsAllowed: false,
    installAttempted: false,
    executeDiscoveredCodeAttempted: false,
    billableModelCalls: 0,
    realizedRevenueUsd: 0,
    usableCreditsUsd: 0,
  };

  const date = startedAt.slice(0, 10);
  await atomicWriteJson(statePath, state);
  await atomicWriteJson(resolve(args.runtimeDir, "runs", `${runId}.json`), runReceipt);
  await atomicWriteJson(resolve(args.runtimeDir, "briefs", `${runId}.json`), brief);
  await appendJsonLines(resolve(args.runtimeDir, "events", `${date}.jsonl`), uniqueEvents);

  return { runReceipt, brief, events: uniqueEvents };
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
    console.log("  --runtime-dir PATH          Append-only local runtime directory");
    console.log("  --dry-run                   Select due sources without network or writes");
    return;
  }

  const lockPath = resolve(args.runtimeDir, "run.lock");
  const release = await acquireLock(lockPath, args.lockStaleMs);
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
