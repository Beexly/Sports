/**
 * Cost modes + fail-closed resolver (blueprint §A.3) — the CRUX of PR A.
 *
 * Governing invariant: "cost mode explicit + fail-safe". There is NO default
 * that spends money. In production, an unset or invalid mode is a
 * ConfigurationError that fails the deploy — the system can never silently
 * become cash-capable.
 *
 * This module is PURE. It reads plain env-shaped inputs, takes an injected
 * `now`, and throws typed ConfigurationError. The SEALED executor
 * (executor.ts) is its production consumer; the env-taking functions here are
 * exported to tests/tooling via internal.ts only — index.ts deliberately does
 * not re-export them (directive §8.2).
 */

import { ConfigurationError } from "./errors";

/**
 * Canonical cost modes, ordered ascending by spend authority.
 *
 *   NO_BILLABLE_EXTERNAL   — no billable external provider call may occur.
 *   CONFIRMED_CREDITS_ONLY — external calls allowed only against confirmed credits.
 *   BUDGETED_CASH          — cash spend allowed within budget caps.
 *   EMERGENCY_RELIABILITY  — owner-enabled, time-boxed, reason-coded escalation.
 *                            NOT part of the linear <, <, < ordering (see below);
 *                            it is an explicitly-resolved state, never derived.
 */
export type CostMode =
  | "NO_BILLABLE_EXTERNAL"
  | "CONFIRMED_CREDITS_ONLY"
  | "BUDGETED_CASH"
  | "EMERGENCY_RELIABILITY";

/**
 * The linearly-ordered "spend authority" modes. EMERGENCY_RELIABILITY is
 * intentionally excluded — it is a separate, explicitly-resolved state, not a
 * rung the intersection logic can climb to or clamp against.
 */
export type OrderedCostMode = Exclude<CostMode, "EMERGENCY_RELIABILITY">;

/** Ascending spend-authority rank. Lower = less spend authority = safer. */
const MODE_RANK: Record<OrderedCostMode, number> = {
  NO_BILLABLE_EXTERNAL: 0,
  CONFIRMED_CREDITS_ONLY: 1,
  BUDGETED_CASH: 2,
};

const CANONICAL_MODES: ReadonlySet<string> = new Set<CostMode>([
  "NO_BILLABLE_EXTERNAL",
  "CONFIRMED_CREDITS_ONLY",
  "BUDGETED_CASH",
  "EMERGENCY_RELIABILITY",
]);

/**
 * Legacy aliases from draft PR #148 kept TEMPORARILY so a pre-existing
 * `LLM_COST_MODE=zero-cash` (etc.) still resolves during migration. Aligned by
 * NAME only — nothing is imported from #148 (which is not on main).
 *
 *   zero-cash    → NO_BILLABLE_EXTERNAL
 *   credits-only → CONFIRMED_CREDITS_ONLY
 *   normal       → BUDGETED_CASH
 *
 * (There is deliberately NO alias for EMERGENCY_RELIABILITY — it can never be
 * reached via a legacy name.)
 */
const LEGACY_ALIASES: Readonly<Record<string, CostMode>> = {
  "zero-cash": "NO_BILLABLE_EXTERNAL",
  "credits-only": "CONFIRMED_CREDITS_ONLY",
  normal: "BUDGETED_CASH",
};

/** Environment class — decides what an UNSET mode means (blueprint §A.3). */
export type AiEnvClass = "production" | "preview" | "development" | "test";

/** How the env class was determined, recorded into every invocation record. */
export type EnvClassSource = "explicit" | "derived";

export interface ResolvedEnvClass {
  readonly envClass: AiEnvClass;
  readonly source: EnvClassSource;
}

/** Env-shaped input (a subset of process.env). Injected, never read globally. */
export interface EnvLike {
  readonly AI_ENV_CLASS?: string;
  readonly VERCEL_ENV?: string;
  readonly NODE_ENV?: string;
  readonly LLM_COST_MODE?: string;
  readonly EMERGENCY_RELIABILITY_UNTIL?: string;
  readonly EMERGENCY_REASON?: string;
  /**
   * REFERENCE to a durable owner-decision receipt (§8.6). The env var may only
   * name an override id — it can never create one. The executor verifies the
   * referenced receipt against the sealed EmergencyReceiptStore.
   */
  readonly EMERGENCY_OVERRIDE_ID?: string;
}

const VALID_ENV_CLASSES: ReadonlySet<string> = new Set<AiEnvClass>([
  "production",
  "preview",
  "development",
  "test",
]);

/**
 * Resolve the environment class.
 *
 *   - An explicit, valid `AI_ENV_CLASS` always wins (source: 'explicit').
 *   - An explicit but INVALID `AI_ENV_CLASS` fails closed (ConfigurationError)
 *     rather than silently falling back — a typo'd class must not downgrade
 *     production into a permissive default.
 *   - Otherwise derive conservatively (source: 'derived'):
 *       VERCEL_ENV=production  → 'production'
 *       VERCEL_ENV=preview     → 'preview'
 *       VERCEL_ENV=development → 'development'
 *       NODE_ENV=test          → 'test'
 *       NODE_ENV=production    → 'production'
 *       else                   → 'development'
 *
 * NODE_ENV=production maps to 'production' so a NON-Vercel production deploy
 * (self-hosted/Docker with only NODE_ENV set) still gets the production-only
 * gates: an unset LLM_COST_MODE fails the deploy instead of silently
 * defaulting, and the §8.4 ban on policyVersion "unversioned" applies. The
 * VERCEL_ENV checks run FIRST because Vercel preview builds also run with
 * NODE_ENV=production — a preview must classify as 'preview', not
 * 'production'.
 */
export function resolveEnvClass(env: EnvLike): ResolvedEnvClass {
  const explicit = env.AI_ENV_CLASS?.trim();
  if (explicit !== undefined && explicit !== "") {
    if (!VALID_ENV_CLASSES.has(explicit)) {
      throw new ConfigurationError(
        `AI_ENV_CLASS is set to an unrecognized value "${explicit}"; ` +
          `expected one of production | preview | development | test.`,
      );
    }
    return { envClass: explicit as AiEnvClass, source: "explicit" };
  }

  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") {
    return { envClass: "production", source: "derived" };
  }
  if (vercelEnv === "preview") {
    return { envClass: "preview", source: "derived" };
  }
  if (vercelEnv === "development") {
    return { envClass: "development", source: "derived" };
  }

  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === "test") {
    return { envClass: "test", source: "derived" };
  }
  if (nodeEnv === "production") {
    return { envClass: "production", source: "derived" };
  }
  return { envClass: "development", source: "derived" };
}

/**
 * Normalize a raw LLM_COST_MODE string to a canonical CostMode.
 * Returns `null` if the value is not a recognized canonical name or legacy
 * alias (the caller decides whether "unrecognized" means throw).
 */
function normalizeRawMode(rawMode: string): CostMode | null {
  const trimmed = rawMode.trim();
  if (CANONICAL_MODES.has(trimmed)) return trimmed as CostMode;
  const alias = LEGACY_ALIASES[trimmed] ?? LEGACY_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

export interface ResolveCostModeInput {
  /** The already-resolved environment class. */
  readonly envClass: AiEnvClass;
  /** The raw LLM_COST_MODE value (canonical or legacy alias), or undefined/"" if unset. */
  readonly rawMode?: string;
  /** ISO-8601 timestamp; EMERGENCY_RELIABILITY is only valid while now < emergencyUntil. */
  readonly emergencyUntil?: string;
  /** Non-empty reason string required for EMERGENCY_RELIABILITY. */
  readonly emergencyReason?: string;
  /**
   * Non-empty durable owner-decision receipt REFERENCE required for
   * EMERGENCY_RELIABILITY (§8.6). Resolution here only checks the reference is
   * present; the executor must additionally verify the receipt itself
   * (existence, expiry, revocation, scope) via the sealed receipt store before
   * any authority is honored.
   */
  readonly emergencyOverrideId?: string;
  /** Injected clock — NEVER Date.now() inline, so resolution is deterministic. */
  readonly now: Date;
}

/**
 * Resolve the effective ENVIRONMENT cost mode, fail-closed.
 *
 * Matrix (blueprint §A.3):
 *
 *   | envClass    | unset mode              | invalid mode        |
 *   |-------------|-------------------------|---------------------|
 *   | production  | ConfigurationError      | ConfigurationError  |  ← deploy fails
 *   | preview     | NO_BILLABLE_EXTERNAL    | ConfigurationError  |
 *   | development | NO_BILLABLE_EXTERNAL    | ConfigurationError  |
 *   | test        | NO_BILLABLE_EXTERNAL    | ConfigurationError  |
 *
 * A recognized mode is returned as-is, EXCEPT EMERGENCY_RELIABILITY which
 * additionally requires a non-expired `emergencyUntil`, a non-empty
 * `emergencyReason`, AND a non-empty `emergencyOverrideId` referencing a
 * durable owner-decision receipt (§8.6); any of them missing/expired →
 * ConfigurationError. This mode can never be produced from a bare env var,
 * and even a well-formed reference grants nothing until the executor verifies
 * the receipt against the sealed store.
 */
export function resolveCostMode(input: ResolveCostModeInput): CostMode {
  const {
    envClass,
    rawMode,
    emergencyUntil,
    emergencyReason,
    emergencyOverrideId,
    now,
  } = input;
  const raw = rawMode?.trim();

  // Unset mode.
  if (raw === undefined || raw === "") {
    if (envClass === "production") {
      throw new ConfigurationError(
        "LLM_COST_MODE is unset in a production environment class. The cost " +
          "mode must be explicit in production (fail-closed); refusing to " +
          "default to any spend-capable or spend-incapable mode.",
      );
    }
    // Non-production: safe, spend-incapable default.
    return "NO_BILLABLE_EXTERNAL";
  }

  const normalized = normalizeRawMode(raw);
  if (normalized === null) {
    // Invalid/unrecognized in ANY environment class → fail closed.
    throw new ConfigurationError(
      `LLM_COST_MODE is set to an unrecognized value "${raw}"; expected one of ` +
        `NO_BILLABLE_EXTERNAL | CONFIRMED_CREDITS_ONLY | BUDGETED_CASH | ` +
        `EMERGENCY_RELIABILITY (or a legacy alias: zero-cash | credits-only | normal).`,
    );
  }

  if (normalized === "EMERGENCY_RELIABILITY") {
    return resolveEmergency({
      raw,
      emergencyUntil,
      emergencyReason,
      emergencyOverrideId,
      now,
    });
  }

  return normalized;
}

function resolveEmergency(args: {
  readonly raw: string;
  readonly emergencyUntil?: string;
  readonly emergencyReason?: string;
  readonly emergencyOverrideId?: string;
  readonly now: Date;
}): CostMode {
  const { emergencyUntil, emergencyReason, emergencyOverrideId, now } = args;

  const reason = emergencyReason?.trim();
  if (reason === undefined || reason === "") {
    throw new ConfigurationError(
      "EMERGENCY_RELIABILITY requires a non-empty EMERGENCY_REASON.",
    );
  }

  const overrideId = emergencyOverrideId?.trim();
  if (overrideId === undefined || overrideId === "") {
    throw new ConfigurationError(
      "EMERGENCY_RELIABILITY requires EMERGENCY_OVERRIDE_ID referencing a " +
        "durable owner-decision receipt (§8.6); environment variables may " +
        "only reference an approved override, never create one.",
    );
  }

  const untilRaw = emergencyUntil?.trim();
  if (untilRaw === undefined || untilRaw === "") {
    throw new ConfigurationError(
      "EMERGENCY_RELIABILITY requires an EMERGENCY_RELIABILITY_UNTIL ISO timestamp.",
    );
  }

  const untilMs = Date.parse(untilRaw);
  if (Number.isNaN(untilMs)) {
    throw new ConfigurationError(
      `EMERGENCY_RELIABILITY_UNTIL is not a valid ISO-8601 timestamp: "${untilRaw}".`,
    );
  }

  if (untilMs <= now.getTime()) {
    throw new ConfigurationError(
      `EMERGENCY_RELIABILITY_UNTIL (${untilRaw}) has expired; the emergency ` +
        `escalation is no longer valid.`,
    );
  }

  return "EMERGENCY_RELIABILITY";
}

/**
 * Intersect the environment mode with a task's per-request permitted modes
 * (blueprint §A.3): "effective = min(envMode, task.permittedModes)".
 *
 * Semantics:
 *   - A task may RESTRICT below the environment (e.g. env allows BUDGETED_CASH,
 *     task permits only NO_BILLABLE_EXTERNAL → NO_BILLABLE_EXTERNAL).
 *   - A task may NEVER ESCALATE above the environment. If a task's permitted
 *     modes are all strictly above the env mode, there is no admissible mode →
 *     ConfigurationError (the task cannot buy more authority than the env grants).
 *   - The result is the HIGHEST task-permitted mode that does not exceed the
 *     env mode (i.e. min(envMode, max(permitted ≤ envMode))).
 *
 * EMERGENCY_RELIABILITY ordering: it is NOT on the linear scale. It is treated
 * as its own explicitly-resolved state:
 *   - If the env mode IS EMERGENCY_RELIABILITY, the task must explicitly permit
 *     EMERGENCY_RELIABILITY to run under it; otherwise the highest ordered mode
 *     the task permits (BUDGETED_CASH being the ceiling of the linear scale)
 *     applies — an emergency env never silently forces a task that opted out.
 *   - A task may not name EMERGENCY_RELIABILITY unless the env mode is also
 *     EMERGENCY_RELIABILITY (a task cannot self-escalate into emergency).
 */
export function effectiveMode(
  envMode: CostMode,
  permittedModes: readonly CostMode[],
): CostMode {
  if (permittedModes.length === 0) {
    throw new ConfigurationError(
      "task.permittedModes is empty; a task must permit at least one cost mode.",
    );
  }

  const taskPermitsEmergency = permittedModes.includes("EMERGENCY_RELIABILITY");

  // A task can only name EMERGENCY_RELIABILITY when the env is itself in it.
  if (taskPermitsEmergency && envMode !== "EMERGENCY_RELIABILITY") {
    throw new ConfigurationError(
      "A task cannot permit EMERGENCY_RELIABILITY unless the environment cost " +
        "mode is EMERGENCY_RELIABILITY (a task may not self-escalate into emergency).",
    );
  }

  if (envMode === "EMERGENCY_RELIABILITY") {
    // Emergency env: honor the task only if it explicitly opted in.
    if (taskPermitsEmergency) return "EMERGENCY_RELIABILITY";
    // Task opted out of emergency → fall back to the highest ordered mode the
    // task permits (its own self-imposed ceiling on the linear scale).
    return highestOrdered(permittedModes);
  }

  // Linear scale. Clamp to the highest task-permitted mode that is ≤ envMode.
  const envRank = MODE_RANK[envMode as OrderedCostMode];
  const admissible = permittedModes
    .filter((m): m is OrderedCostMode => m !== "EMERGENCY_RELIABILITY")
    .filter((m) => MODE_RANK[m] <= envRank);

  if (admissible.length === 0) {
    throw new ConfigurationError(
      `Task permitted modes [${permittedModes.join(", ")}] all exceed the ` +
        `environment mode ${envMode}; a task may restrict below the environment ` +
        `but may never escalate above it.`,
    );
  }

  return admissible.reduce((best, m) =>
    MODE_RANK[m] > MODE_RANK[best] ? m : best,
  );
}

/** The highest-authority mode on the linear scale among the given modes. */
function highestOrdered(modes: readonly CostMode[]): OrderedCostMode {
  const ordered = modes.filter(
    (m): m is OrderedCostMode => m !== "EMERGENCY_RELIABILITY",
  );
  if (ordered.length === 0) {
    // Only EMERGENCY_RELIABILITY was permitted but env wasn't emergency — the
    // caller guards against this, but stay safe (fail closed to the floor).
    return "NO_BILLABLE_EXTERNAL";
  }
  return ordered.reduce((best, m) => (MODE_RANK[m] > MODE_RANK[best] ? m : best));
}

/** Convenience for callers/tests: is `s` a canonical or legacy-alias mode? */
export function isRecognizedCostMode(s: string): boolean {
  return normalizeRawMode(s) !== null;
}

/** The legacy alias → canonical map, exposed read-only for tests/tooling. */
export const LEGACY_COST_MODE_ALIASES: Readonly<Record<string, CostMode>> =
  LEGACY_ALIASES;
