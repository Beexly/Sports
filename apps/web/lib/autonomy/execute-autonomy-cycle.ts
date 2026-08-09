/**
 * Autonomy executor — closes plan → act → verify for autonomousSafe actions.
 *
 * Laws (hard):
 *   - Never flips LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS / PUBLISH_LEDGER
 *   - Never executes requiresOwner actions
 *   - Never invents scores; only triggers existing free-path crons
 *   - ATTACK_RCA_WAVE_A / ACCUMULATE_SETTLED_SAMPLE map to settle-picks
 *
 * Allow-list SoT: safe-cron-targets.ts (must stay in sync with posture).
 * V1 executes HTTP cron targets with CRON_SECRET.
 */

import {
  planAutonomyCycle,
  type AutonomyAction,
  type AutonomyActionKind,
  type AutonomyObservation,
  type AutonomyPlan,
} from "@/lib/autonomy/operating-kernel";
import {
  AUTONOMY_MAX_ACTIONS_PER_CYCLE,
  AUTONOMY_SAFE_CRON_TARGETS,
} from "@/lib/autonomy/safe-cron-targets";

/** Cron paths the executor is allowed to invoke. Anything else is skipped. */
export const EXECUTABLE_CRON_TARGETS = {
  RUN_FREE_SPINE_HEALTH: "/api/cron/free-spine-health",
  RUN_FREE_SETTLE: "/api/cron/settle-picks",
  RUN_REFRESH_ODDS_FREE: "/api/cron/refresh-odds",
  RUN_GENERATE_DRAFTS: "/api/cron/generate-drafts",
  RUN_CALIBRATION_METRICS: "/api/cron/calibration-metrics",
  RUN_GENERATE_SIGNAL_SLATE: "/api/cron/generate-signal-slate",
} as const satisfies Partial<Record<AutonomyActionKind, string>>;

/** Soft load-time check: EXECUTABLE paths must equal SAFE allow-list. */
const _safeSet = new Set<string>(AUTONOMY_SAFE_CRON_TARGETS as readonly string[]);
for (const p of Object.values(EXECUTABLE_CRON_TARGETS)) {
  if (!_safeSet.has(p)) {
    console.warn(`[autonomy] EXECUTABLE path not in SAFE list: ${p}`);
  }
}
for (const p of AUTONOMY_SAFE_CRON_TARGETS) {
  if (!(Object.values(EXECUTABLE_CRON_TARGETS) as string[]).includes(p)) {
    console.warn(`[autonomy] SAFE target missing from EXECUTABLE: ${p}`);
  }
}

export type AutonomyActStatus =
  | "executed"
  | "skipped_owner"
  | "skipped_not_executable"
  | "skipped_dry_run"
  | "skipped_cap"
  | "failed"
  | "skipped_duplicate";

export interface AutonomyActResult {
  readonly kind: AutonomyActionKind;
  readonly title: string;
  readonly target: string;
  readonly status: AutonomyActStatus;
  readonly httpStatus: number | null;
  readonly ok: boolean;
  readonly detail: string;
  readonly elapsedMs: number;
}

export interface AutonomyCycleResult {
  readonly version: "gse-autonomy-exec-v1";
  readonly dryRun: boolean;
  readonly plannedSeverity: AutonomyPlan["severity"];
  readonly headline: string;
  readonly honestyScore: number;
  readonly refuseDefaultHeld: boolean;
  readonly acts: readonly AutonomyActResult[];
  readonly executedCount: number;
  readonly failedCount: number;
  readonly elapsedMs: number;
  readonly observedAt: string;
}

export type AutonomyFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface ExecuteAutonomyCycleOptions {
  /** Precomputed plan; if omitted, planAutonomyCycle(observation) is used. */
  readonly plan?: AutonomyPlan;
  readonly observation?: AutonomyObservation;
  /** Base origin, e.g. https://www.galaxysportsedge.com — no trailing slash. */
  readonly baseUrl: string;
  /** Production CRON_SECRET (or previous) for Bearer auth to sibling crons. */
  readonly cronSecret: string;
  /** Max autonomous acts per cycle (default AUTONOMY_MAX_ACTIONS_PER_CYCLE = 4). */
  readonly maxActions?: number;
  /** When true, do not call network — mark executable acts as skipped_dry_run. */
  readonly dryRun?: boolean;
  /** Inject for tests. Defaults to global fetch. */
  readonly fetchImpl?: AutonomyFetch;
  /** Request timeout ms per cron call (default 90_000). */
  readonly timeoutMs?: number;
}

function resolveBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "");
}

/** Resolve public base URL for internal cron calls (server-side). */
export function resolveAutonomyBaseUrl(): string {
  const fromEnv =
    process.env["NEXT_PUBLIC_APP_URL"]?.trim() ||
    process.env["APP_URL"]?.trim() ||
    (process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"].trim()}` : "");
  if (fromEnv) return resolveBaseUrl(fromEnv);
  return "https://www.galaxysportsedge.com";
}

/** Map action kinds to a single cron path when executable. */
export function executableTargetFor(action: AutonomyAction): string | null {
  if (!action.autonomousSafe || action.requiresOwner) return null;
  if (action.kind === "RUN_FREE_SPINE_HEALTH") {
    return EXECUTABLE_CRON_TARGETS.RUN_FREE_SPINE_HEALTH;
  }
  if (action.kind === "RUN_FREE_SETTLE") {
    return EXECUTABLE_CRON_TARGETS.RUN_FREE_SETTLE;
  }
  if (action.kind === "RUN_REFRESH_ODDS_FREE") {
    return EXECUTABLE_CRON_TARGETS.RUN_REFRESH_ODDS_FREE;
  }
  if (action.kind === "RUN_GENERATE_DRAFTS") {
    return EXECUTABLE_CRON_TARGETS.RUN_GENERATE_DRAFTS;
  }
  if (action.kind === "RUN_CALIBRATION_METRICS") {
    return EXECUTABLE_CRON_TARGETS.RUN_CALIBRATION_METRICS;
  }
  // Safe subset of Wave A: settle path only (free-spine is usually a sibling item).
  if (action.kind === "ATTACK_RCA_WAVE_A") {
    return EXECUTABLE_CRON_TARGETS.RUN_FREE_SETTLE;
  }
  // Sample accumulation → settle finished games (honest grades only).
  if (action.kind === "ACCUMULATE_SETTLED_SAMPLE") {
    return EXECUTABLE_CRON_TARGETS.RUN_FREE_SETTLE;
  }
  return null;
}

/**
 * Deduplicate by cron path so one cycle does not hit settle-picks twice.
 */
export function selectExecutableActions(
  plan: AutonomyPlan,
  maxActions: number,
): AutonomyAction[] {
  const seen = new Set<string>();
  const out: AutonomyAction[] = [];
  for (const action of plan.autonomousQueue) {
    if (out.length >= maxActions) break;
    const path = executableTargetFor(action);
    if (!path) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(action);
  }
  return out;
}

async function invokeCron(
  fetchImpl: AutonomyFetch,
  baseUrl: string,
  path: string,
  cronSecret: string,
  timeoutMs: number,
): Promise<{ httpStatus: number; ok: boolean; bodyPreview: string; elapsedMs: number }> {
  const started = Date.now();
  const url = `${resolveBaseUrl(baseUrl)}${path}`;
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    let bodyPreview = "";
    try {
      const text = await res.text();
      bodyPreview = text.slice(0, 240);
    } catch {
      bodyPreview = "";
    }
    return {
      httpStatus: res.status,
      ok: res.ok,
      bodyPreview,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    return {
      httpStatus: 0,
      ok: false,
      bodyPreview: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    };
  }
}

/**
 * Execute autonomousSafe cron-backed actions from a plan.
 * Pure planning stays in operating-kernel; this module is the actuator.
 */
export async function executeAutonomyCycle(
  options: ExecuteAutonomyCycleOptions,
): Promise<AutonomyCycleResult> {
  const cycleStarted = Date.now();
  const dryRun = options.dryRun === true;
  const maxActions = Math.max(0, options.maxActions ?? AUTONOMY_MAX_ACTIONS_PER_CYCLE);
  const timeoutMs = options.timeoutMs ?? 90_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  let plan = options.plan;
  if (!plan) {
    if (!options.observation) {
      throw new Error("executeAutonomyCycle requires plan or observation");
    }
    plan = planAutonomyCycle(options.observation);
  }

  const acts: AutonomyActResult[] = [];

  // Record non-executable autonomous queue items for transparency
  for (const action of plan.autonomousQueue) {
    if (executableTargetFor(action)) continue;
    acts.push({
      kind: action.kind,
      title: action.title,
      target: action.target,
      status: action.requiresOwner ? "skipped_owner" : "skipped_not_executable",
      httpStatus: null,
      ok: true,
      detail: action.requiresOwner
        ? "requiresOwner — never auto-executed"
        : "no safe cron mapping in executor v1",
      elapsedMs: 0,
    });
  }

  for (const action of plan.ownerQueue) {
    acts.push({
      kind: action.kind,
      title: action.title,
      target: action.target,
      status: "skipped_owner",
      httpStatus: null,
      ok: true,
      detail: "owner queue — founder only",
      elapsedMs: 0,
    });
  }

  const toRun = selectExecutableActions(plan, maxActions);
  const runnableKinds = new Set(toRun.map((a) => a.kind));

  // Mark autonomous items beyond cap / duplicates
  for (const action of plan.autonomousQueue) {
    const path = executableTargetFor(action);
    if (!path) continue;
    if (runnableKinds.has(action.kind)) continue;
    if (toRun.some((a) => executableTargetFor(a) === path)) {
      acts.push({
        kind: action.kind,
        title: action.title,
        target: path,
        status: "skipped_duplicate",
        httpStatus: null,
        ok: true,
        detail: `path ${path} already selected this cycle`,
        elapsedMs: 0,
      });
      continue;
    }
    acts.push({
      kind: action.kind,
      title: action.title,
      target: path,
      status: "skipped_cap",
      httpStatus: null,
      ok: true,
      detail: `maxActions=${maxActions}`,
      elapsedMs: 0,
    });
  }

  for (const action of toRun) {
    const path = executableTargetFor(action)!;
    if (dryRun) {
      acts.push({
        kind: action.kind,
        title: action.title,
        target: path,
        status: "skipped_dry_run",
        httpStatus: null,
        ok: true,
        detail: "dryRun=true — no network",
        elapsedMs: 0,
      });
      continue;
    }

    if (!options.cronSecret) {
      acts.push({
        kind: action.kind,
        title: action.title,
        target: path,
        status: "failed",
        httpStatus: null,
        ok: false,
        detail: "CRON_SECRET empty — cannot authorize sibling cron",
        elapsedMs: 0,
      });
      continue;
    }

    const result = await invokeCron(
      fetchImpl,
      options.baseUrl,
      path,
      options.cronSecret,
      timeoutMs,
    );

    acts.push({
      kind: action.kind,
      title: action.title,
      target: path,
      status: result.ok ? "executed" : "failed",
      httpStatus: result.httpStatus || null,
      ok: result.ok,
      detail: result.ok
        ? `cron ok (${result.httpStatus})`
        : `cron failed status=${result.httpStatus} body=${result.bodyPreview}`,
      elapsedMs: result.elapsedMs,
    });
  }

  const executedCount = acts.filter((a) => a.status === "executed").length;
  const failedCount = acts.filter((a) => a.status === "failed").length;

  return {
    version: "gse-autonomy-exec-v1",
    dryRun,
    plannedSeverity: plan.severity,
    headline: plan.headline,
    honestyScore: plan.introspection.honestyScore,
    refuseDefaultHeld: plan.introspection.refuseDefaultHeld,
    acts,
    executedCount,
    failedCount,
    elapsedMs: Date.now() - cycleStarted,
    observedAt: new Date().toISOString(),
  };
}
