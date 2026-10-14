/**
 * Walk-forward emission gate (Horizon 1 emission lock, 2026-10-14).
 *
 * The signal slate (generateSignalSlate) and the board-fill cron
 * (runBoardFillPipeline) may mint picks ONLY when the walk-forward gate file
 * dfs/walk_forward/walk_forward.json exists, parses, is fresh, and carries
 * `passed === true` (strict boolean). Anything else (missing, unreadable,
 * unparseable, stale, missing/invalid generated_at, passed=false or any
 * non-true value) is fail-closed: the caller emits the 0-object and never
 * reaches pickCreate / pickUpdateMany.
 *
 * Path: WALK_FORWARD_GATE_PATH env, else <cwd ancestors>/dfs/walk_forward/walk_forward.json.
 * Max age: WALK_FORWARD_GATE_MAX_AGE_HOURS env, else 168h, measured from generated_at.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const WALK_FORWARD_GATE_REL = join("dfs", "walk_forward", "walk_forward.json");
export const WALK_FORWARD_GATE_DEFAULT_MAX_AGE_HOURS = 168;

export type WalkForwardGateDecision = {
  readonly open: boolean;
  readonly reason: "open" | "missing" | "unreadable" | "unparseable" | "stale" | "no_generated_at" | "not_passed";
  readonly path: string | null;
  readonly detail: string;
};

export type WalkForwardGateOptions = {
  readonly path?: string;
  readonly now?: Date;
  readonly maxAgeHours?: number;
};

function locateGateFile(): string | null {
  const envPath = process.env.WALK_FORWARD_GATE_PATH;
  if (envPath) return resolve(envPath);
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const p = join(dir, WALK_FORWARD_GATE_REL);
    if (existsSync(p)) return p;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

export function readWalkForwardGate(opts: WalkForwardGateOptions = {}): WalkForwardGateDecision {
  const path = opts.path ?? locateGateFile();
  if (!path || !existsSync(path)) {
    return { open: false, reason: "missing", path: path ?? null, detail: "walk_forward.json not found" };
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    return { open: false, reason: "unreadable", path, detail: e instanceof Error ? e.message : String(e) };
  }
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    return { open: false, reason: "unparseable", path, detail: e instanceof Error ? e.message : String(e) };
  }
  if (!doc || typeof doc !== "object") {
    return { open: false, reason: "unparseable", path, detail: "gate file is not a JSON object" };
  }
  const d = doc as Record<string, unknown>;
  const gen = typeof d.generated_at === "string" ? Date.parse(d.generated_at) : NaN;
  if (!Number.isFinite(gen)) {
    return { open: false, reason: "no_generated_at", path, detail: "generated_at missing or invalid" };
  }
  const envAge = Number(process.env.WALK_FORWARD_GATE_MAX_AGE_HOURS);
  const maxAgeH = opts.maxAgeHours ?? (Number.isFinite(envAge) && envAge > 0 ? envAge : WALK_FORWARD_GATE_DEFAULT_MAX_AGE_HOURS);
  const now = (opts.now ?? new Date()).getTime();
  const ageH = (now - gen) / 3_600_000;
  if (ageH > maxAgeH || ageH < -1) {
    return { open: false, reason: "stale", path, detail: `generated_at age ${ageH.toFixed(1)}h outside [0, ${maxAgeH}]h` };
  }
  if (d.passed !== true) {
    return { open: false, reason: "not_passed", path, detail: `passed=${JSON.stringify(d.passed)}` };
  }
  return { open: true, reason: "open", path, detail: "passed=true and fresh" };
}
