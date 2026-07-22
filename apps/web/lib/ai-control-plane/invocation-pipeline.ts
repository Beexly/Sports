/**
 * Ledgered invocation pipeline (directive §9) — the production implementation
 * of the sealed executor's dispatch seam.
 *
 * Runs AFTER the executor's authority pipeline (§8: policy, env, validation,
 * narrowing, mode, emergency receipt, funding) and owns everything between
 * "authority granted" and "result returned":
 *
 *   1. Fingerprint the full request (canonical JSON, sha256 — §9.2).
 *   2. Atomic create-or-claim on `ai_invocations` through the
 *      AuthoritativeControlStore — FAIL CLOSED: a store problem is
 *      `StoreUnavailable` and NOTHING is dispatched (§9.1).
 *        - same requestId + different fingerprint  → InvalidInput (conflict);
 *        - active lease                            → IN_PROGRESS, no dispatch;
 *        - stale lease                             → explicit fenced steal;
 *        - terminal replay                         → original persisted result
 *          (or the honest typed error the original run ended with) — never a
 *          second dispatch, never `output: undefined` under a success claim.
 *   3. One pre-dispatch financial attribution (estimate + funding intent
 *      only; the create path has no reconciliation fields — §9.5).
 *   4. Walk `authority.permittedProviderRoutes` IN ORDER — the control plane
 *      alone owns fallback (§9.3). Per route: authoritative attempt row
 *      BEFORE transport (§9.4; a refused attempt row blocks dispatch), then
 *      ONE exact provider adapter. Clean failures advance to the next route;
 *      TIMEOUT/AMBIGUOUS stops the walk (never re-spend ambiguous funds) and
 *      finalizes AMBIGUOUS.
 *   5. Success: finalize durable state (result JSON + hash for replay). If
 *      that write fails or is fenced AFTER the paid call, the result is STILL
 *      returned and a durable recovery entry is queued (§9.7/§9.8) — a
 *      successful provider call is never retried because of telemetry.
 */

import { createHash, randomUUID } from "node:crypto";

import { pickModelForSurface } from "@/lib/claude-api/model-router";
import type { AiAttemptSummary } from "./contracts";
import type { AiDispatchFn, AiDispatchOutcome, AiDispatchPlan } from "./executor";
import {
  AmbiguousCharge,
  BudgetBlocked,
  InvalidInput,
  PolicyBlocked,
  ProviderUnavailable,
  StoreUnavailable,
} from "./errors";
import type { AuthoritativeControlStore } from "./control-store";
import type { ObservabilitySink } from "./observability";
import type { ProviderDispatchFn, ProviderDispatchPayload } from "./dispatch";
import type { ProviderRouteId } from "./contracts";

// ─── Canonical fingerprint (§9.2) ─────────────────────────────────────────────

/** Deterministic JSON: object keys sorted at every depth, arrays in order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(",")}}`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Fingerprint of everything that makes two "same requestId" calls the same
 * request: task class, entity, the full input payload, and any narrowing.
 * A replay with a different fingerprint is a hard conflict, never a merge.
 */
export function computeRequestFingerprint(args: {
  readonly taskClass: string;
  readonly entity: string;
  readonly input: unknown;
  readonly narrowing: unknown;
}): string {
  return sha256Hex(
    canonicalJson({
      taskClass: args.taskClass,
      entity: args.entity,
      input: args.input ?? null,
      narrowing: args.narrowing ?? null,
    }),
  );
}

// ─── Task payload derivation ──────────────────────────────────────────────────

const MAX_TASK_TOKENS = 64_000;
const DEFAULT_TASK_TOKENS = 1_024;

/**
 * The transport payload shape a control-plane task input must carry. Until
 * per-task prompt builders exist, callers pass the prompt fields explicitly;
 * anything else is a validation failure BEFORE any row is written.
 */
export interface TaskPromptInput {
  readonly user: string;
  readonly system?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export function deriveProviderPayload(
  input: unknown,
  modelRequested: string,
): ProviderDispatchPayload {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidInput(
      "Task input must be an object with a non-empty `user` prompt field.",
    );
  }
  const candidate = input as Partial<TaskPromptInput>;
  if (typeof candidate.user !== "string" || candidate.user.trim() === "") {
    throw new InvalidInput("Task input requires a non-empty string `user` field.");
  }
  if (candidate.system !== undefined && typeof candidate.system !== "string") {
    throw new InvalidInput("Task input `system` must be a string when present.");
  }
  const maxTokens = candidate.maxTokens ?? DEFAULT_TASK_TOKENS;
  if (
    typeof maxTokens !== "number" ||
    !Number.isInteger(maxTokens) ||
    maxTokens <= 0 ||
    maxTokens > MAX_TASK_TOKENS
  ) {
    throw new InvalidInput(
      `Task input maxTokens must be a positive integer ≤ ${MAX_TASK_TOKENS}.`,
    );
  }
  if (
    candidate.temperature !== undefined &&
    (typeof candidate.temperature !== "number" ||
      !Number.isFinite(candidate.temperature))
  ) {
    throw new InvalidInput("Task input temperature must be a finite number.");
  }
  return {
    modelRequested,
    system: candidate.system ?? "",
    user: candidate.user,
    maxTokens,
    ...(candidate.temperature !== undefined
      ? { temperature: candidate.temperature }
      : {}),
  };
}

// ─── The pipeline ─────────────────────────────────────────────────────────────

export interface LedgeredDispatchDeps {
  readonly store: AuthoritativeControlStore;
  /** Built fresh per invocation so DEGRADED state never leaks across calls. */
  readonly observability: () => ObservabilitySink;
  readonly dispatchers: Record<ProviderRouteId, ProviderDispatchFn>;
  readonly now: () => Date;
  /** Id/nonce factory. Defaults to crypto.randomUUID. */
  readonly idFactory?: () => string;
  /** Claim lease duration; default 120s. */
  readonly leaseMs?: number;
}

const DEFAULT_LEASE_MS = 120_000;

function replayTerminal(
  outcome: Extract<
    Awaited<ReturnType<AuthoritativeControlStore["claimInvocation"]>>,
    { kind: "REPLAY_TERMINAL" }
  >,
): AiDispatchOutcome {
  switch (outcome.status) {
    case "SUCCEEDED": {
      if (outcome.resultHash === null || outcome.output === null) {
        // Never fabricate a success payload (§9.2: no `output: undefined`
        // under a terminal-success claim). The durable result is missing —
        // that is a store problem, not a reason to re-dispatch.
        throw new StoreUnavailable(
          "Terminal SUCCEEDED replay has no durable result payload — refusing " +
            "to fabricate output and refusing to re-dispatch a completed request.",
        );
      }
      return {
        kind: "COMPLETED",
        invocationId: outcome.invocationId,
        output: outcome.output,
        attempts: outcome.attempts,
        telemetryStatus: "OK",
        replayed: true,
      };
    }
    case "AMBIGUOUS":
      throw new AmbiguousCharge(
        `Replay of invocation ${outcome.invocationId}: the original run ended ` +
          "AMBIGUOUS (unproven vendor charge). It must be reconciled, never re-dispatched.",
      );
    case "FAILED":
      throw new ProviderUnavailable(
        `Replay of invocation ${outcome.invocationId}: the original run failed ` +
          "on every permitted provider route.",
      );
    case "BUDGET_BLOCKED":
      throw new BudgetBlocked(
        `Replay of invocation ${outcome.invocationId}: originally budget-blocked.`,
      );
    default:
      // POLICY_BLOCKED, BLOCKED, or any future non-dispatchable terminal.
      throw new PolicyBlocked(
        `Replay of invocation ${outcome.invocationId}: original decision was ` +
          `${outcome.status} — non-dispatchable.`,
      );
  }
}

/**
 * Build the production dispatch seam. The returned function is what the
 * sealed executor invokes AFTER all §8 authority gates pass.
 */
export function createLedgeredDispatch(deps: LedgeredDispatchDeps): AiDispatchFn {
  const idFactory = deps.idFactory ?? randomUUID;
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;

  return async (plan: AiDispatchPlan): Promise<AiDispatchOutcome> => {
    const { request, authority } = plan;
    const observability = deps.observability();

    // Payload + model resolution BEFORE any row exists — a malformed input
    // never creates claim state.
    const modelRequested = pickModelForSurface(authority.surface);
    const payload = deriveProviderPayload(request.input, modelRequested);

    const requestFingerprint = computeRequestFingerprint({
      taskClass: request.taskClass,
      entity: request.entity,
      input: request.input,
      narrowing: request.narrowing ?? null,
    });

    // ── Atomic create-or-claim (§9.2). Store failure = StoreUnavailable =
    // no dispatch, by construction (the store throws before we ever touch a
    // provider adapter).
    const ownerToken = idFactory();
    const claim = await deps.store.claimInvocation({
      invocationId: idFactory(),
      requestId: request.requestId,
      taskClass: request.taskClass,
      surface: authority.surface,
      entity: request.entity,
      dataClass: authority.dataPolicy.tags.join(","),
      costMode: plan.costMode,
      envClass: plan.envClass,
      envClassSource: plan.envClassSource,
      policyVersion: authority.policyVersion,
      actorType: request.actor.actorType,
      actorSubjectId: request.actor.subjectId,
      requestFingerprint,
      ownerToken,
      leaseMs,
      now: deps.now(),
    });

    if (claim.kind === "FINGERPRINT_CONFLICT") {
      throw new InvalidInput(
        `requestId "${request.requestId}" was already used for task class ` +
          `"${request.taskClass}" with a DIFFERENT payload (fingerprint ` +
          `${claim.existingFingerprint.slice(0, 12)}… ≠ ` +
          `${requestFingerprint.slice(0, 12)}…). An idempotency key can never ` +
          "be reused for a changed request.",
      );
    }
    if (claim.kind === "IN_PROGRESS") {
      return { kind: "IN_PROGRESS", invocationId: claim.invocationId };
    }
    if (claim.kind === "REPLAY_TERMINAL") {
      return replayTerminal(claim);
    }

    const { invocationId, nextOrdinal } = claim;

    // ── One pre-dispatch attribution: estimate + intent only (§9.5).
    await deps.store.createAttribution({
      attributionId: idFactory(),
      invocationId,
      estimatedGrossUsd: plan.maxVendorCashUsd,
      fundingLabel: plan.fundingLabel,
    });

    // ── Provider walk: control-plane-owned fallback order (§9.3).
    const summaries: AiAttemptSummary[] = [];
    const routes = authority.permittedProviderRoutes;
    let lastErrorCode: string | null = null;

    for (let i = 0; i < routes.length; i += 1) {
      const route = routes[i] as ProviderRouteId;
      const ordinal = nextOrdinal + i;
      const attemptId = idFactory();

      // Authoritative attempt row BEFORE transport (§9.4) — throws
      // StoreUnavailable (blocking dispatch) if the store or the lease is gone.
      await deps.store.startAttempt({
        attemptId,
        invocationId,
        ownerToken,
        ordinal,
        providerRequested: route,
        modelRequested,
        requestFingerprint,
        policyVersion: authority.policyVersion,
        attemptNonce: idFactory(),
        now: deps.now(),
      });

      const outcome = await deps.dispatchers[route](payload);

      if (outcome.kind === "SUCCEEDED") {
        const resultJson = canonicalJson(outcome.output);
        const resultHash = sha256Hex(resultJson);
        const finalizeInput = {
          invocationId,
          ownerToken,
          attemptId,
          providerUsed: outcome.providerUsed,
          modelResolved: outcome.modelResolved,
          providerRequestId: outcome.providerRequestId,
          inputTokens: outcome.inputTokens,
          outputTokens: outcome.outputTokens,
          resultJson,
          resultHash,
          now: deps.now(),
        };
        let telemetryStatus: "OK" | "DEGRADED" = "OK";
        try {
          const applied = await deps.store.finalizeSuccess(finalizeInput);
          if (!applied) {
            observability.markDegraded(
              `finalizeSuccess fenced out for invocation ${invocationId}`,
              null,
            );
            await observability.enqueueRecovery({
              id: idFactory(),
              invocationId,
              kind: "FINALIZE_SUCCESS",
              payload: { ...finalizeInput, now: finalizeInput.now.toISOString() },
            });
            telemetryStatus = "DEGRADED";
          }
        } catch (error) {
          // §9.8: a post-success store failure NEVER retries the paid call.
          observability.markDegraded(
            `finalizeSuccess failed for invocation ${invocationId}`,
            error,
          );
          await observability.enqueueRecovery({
            id: idFactory(),
            invocationId,
            kind: "FINALIZE_SUCCESS",
            payload: { ...finalizeInput, now: finalizeInput.now.toISOString() },
          });
          telemetryStatus = "DEGRADED";
        }
        summaries.push({
          ordinal,
          providerRequested: route,
          providerUsed: outcome.providerUsed,
          modelRequested,
          modelResolved: outcome.modelResolved,
          status: "SUCCEEDED",
        });
        return {
          kind: "COMPLETED",
          invocationId,
          output: outcome.output,
          attempts: summaries,
          telemetryStatus,
          replayed: false,
        };
      }

      // Failure taxonomy (§9.4): record authoritatively BEFORE any further
      // route — an unrecorded failure must not be followed by more dispatch.
      const providerUsed = outcome.dispatched ? route : null;
      await deps.store.recordAttemptFailure({
        attemptId,
        invocationId,
        ownerToken,
        status: outcome.kind,
        providerUsed,
        errorCode: outcome.errorCode,
        now: deps.now(),
      });
      summaries.push({
        ordinal,
        providerRequested: route,
        providerUsed,
        modelRequested,
        modelResolved: null,
        status: outcome.kind,
        errorCode: outcome.errorCode,
      });
      lastErrorCode = outcome.errorCode;

      if (outcome.kind === "TIMEOUT" || outcome.kind === "AMBIGUOUS") {
        // We cannot prove the vendor did not charge — never spend the same
        // funds on another route. Finalize AMBIGUOUS and stop.
        await deps.store.finalizeFailure({
          invocationId,
          ownerToken,
          status: "AMBIGUOUS",
          now: deps.now(),
        });
        throw new AmbiguousCharge(
          `Attempt ${ordinal} on route "${route}" ended ${outcome.kind} after ` +
            "dispatch — the charge state is unproven; reconciliation required " +
            "before any re-spend.",
        );
      }
    }

    // Every permitted route failed cleanly (no charge proven or possible).
    try {
      await deps.store.finalizeFailure({
        invocationId,
        ownerToken,
        status: "FAILED",
        now: deps.now(),
      });
    } catch (error) {
      observability.markDegraded(
        `finalizeFailure failed for invocation ${invocationId}`,
        error,
      );
    }
    throw new ProviderUnavailable(
      `All ${routes.length} permitted provider route(s) failed for task ` +
        `"${request.taskClass}"` +
        (lastErrorCode ? ` (last error: ${lastErrorCode})` : "") +
        ".",
    );
  };
}
