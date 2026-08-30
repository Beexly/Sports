/**
 * governed-gate.ts — wires `@sports/governed`'s `GateOutput` contract to the
 * control plane's existing SRQC admission machinery (`admitUnderSRQC` over a
 * window of `readRecentEvents`).
 *
 * This file lives inside `apps/web/lib/ai-control-plane/` — one of the two
 * allowed importers of `./internal` per the sealing guardrail
 * (`scripts/guardrails/ai-control-plane-sealing.mjs`): tests and
 * control-plane-internal modules within this directory. It imports
 * `readRecentEvents` from `./internal` for that reason.
 *
 * SHADOW is the default posture: `resolveSrqcModeFromEnv` returns SHADOW
 * unless the lab-only `SRQC_ENFORCE=1` flag is set (see
 * srqc-projection.ts), and nothing here overrides that. A REFUSE decision
 * from this gate only actually blocks a call when the CALLER's
 * `PolicyContext.mode` is `"ENFORCE"` — `createGoverned()` downgrades REFUSE
 * to an effective ADMIT (tagged `SHADOW_WOULD_REFUSE`) in SHADOW mode. This
 * module never picks ENFORCE on its own initiative.
 */

import type { GateOutput } from "@sports/governed";
import {
  admitUnderSRQC,
  resolveSrqcModeFromEnv,
  type SrqcMode,
  type SrqcEnvLike,
  type ProjectableEvent,
} from "./srqc-projection";
import { readRecentEvents, prismaSqlClient, type ControlSqlClient, type ControlEventRow } from "./internal";

// Same row -> ProjectableEvent adapter formal-receipt-job.ts uses (kept
// local rather than imported since it's a small private helper there too).
function toProjectable(row: ControlEventRow): ProjectableEvent {
  const rawPayload =
    row.payload !== null && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {};
  const invocationId = rawPayload["invocationId"];
  const attemptId = rawPayload["attemptId"];
  const rejectedFingerprint = rawPayload["rejectedFingerprint"];
  return {
    eventType: row.eventType,
    source: row.source,
    sourceId: row.sourceId,
    payload: {
      ...rawPayload,
      ...(typeof invocationId === "string" ? { invocationId } : {}),
      ...(typeof attemptId === "string" ? { attemptId } : {}),
      ...(rejectedFingerprint === true ? { rejectedFingerprint: true } : {}),
    },
  };
}

/**
 * Tools this gate is wired to evaluate. Any tool NOT in this allowlist is
 * always ADMIT (no ledger read, no SRQC projection) — the allowlist exists
 * so the (currently expensive, ledger-reading) gate is only exercised for
 * tool calls that have opted into governance, not as a default deny.
 */
const GATED_TOOLS = new Set<string>([
  "ai.invoke",
  "ai.dispatch",
]);

export type GovernedGateDeps = {
  sql: ControlSqlClient;
  now?: () => Date;
  /** How far back to read the ledger window. Defaults to 5 minutes. */
  windowMs?: number;
  /**
   * Env-like source `resolveSrqcModeFromEnv` reads `SRQC_ENFORCE` from.
   * Defaults to `process.env`. Overriding this is for TESTS ONLY — it lets
   * a test assert ENFORCE behavior via an injected object instead of
   * mutating the real `process.env`, which is unsafe under a parallel test
   * runner (a global env mutation races against any other test file that
   * reads or resets the same variable concurrently).
   */
  env?: SrqcEnvLike;
};

/**
 * Build a `GateOutput`-producing gate function for `createGoverned()`. Reads
 * a recent window of `control_event_ledger` rows for the given `agentId`'s
 * `ai_invocation` source and projects it through `admitUnderSRQC`.
 *
 * Mode resolution: honors `resolveSrqcModeFromEnv()` — the SAME single flag
 * (`SRQC_ENFORCE=1`) the rest of the control plane reads — rather than
 * trusting the caller-supplied `ctx.mode` for the *admission* computation,
 * so this gate's own REFUSE/ADMIT reflects the process's actual SRQC
 * posture. `createGoverned()` separately uses `ctx.mode` to decide whether a
 * REFUSE from this gate is enforced or only shadow-recorded — that caller
 * gate is unaffected by this file.
 */
export function createGovernedSrqcGate(deps: GovernedGateDeps) {
  const windowMs = deps.windowMs ?? 5 * 60 * 1000;
  const now = deps.now ?? (() => new Date());

  return async function gate(input: {
    tool: string;
    args: unknown;
    ctx: { agentId: string };
  }): Promise<GateOutput> {
    if (!GATED_TOOLS.has(input.tool)) {
      return { decision: "ADMIT", reasons: [] };
    }

    const untilExclusive = now();
    const sinceInclusive = new Date(untilExclusive.getTime() - windowMs);
    // No `source` filter: the GE2 (two-concurrently-pending) violation is
    // built from `ATTEMPT_STARTED`/`ATTEMPT_FAILED` events, which are
    // `source: "ai_attempt"`, not `"ai_invocation"`. Filtering to just
    // ai_invocation drops every attempt event before projection, so the gate
    // would never observe a real two-pending window and would ADMIT under
    // ENFORCE instead of REFUSE. Read the whole window across both sources.
    const events = await readRecentEvents(deps.sql, {
      sinceInclusive,
      untilExclusive,
    });

    const mode: SrqcMode = resolveSrqcModeFromEnv(deps.env);
    const result = admitUnderSRQC(events.map(toProjectable), mode);

    if (result.decision === "REFUSE") {
      return {
        decision: "REFUSE",
        reasons: result.violations.map((v) => `srqc_violation:${v.pendingCountClass}`),
      };
    }
    return { decision: "ADMIT", reasons: [] };
  };
}

/** Convenience: adapt a PrismaClient-like object via prismaSqlClient. */
export { prismaSqlClient };
