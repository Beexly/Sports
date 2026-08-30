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
 *   3. Atomic budget reservation (blueprint §C) — BILLABLE modes only
 *      (BUDGETED_CASH / EMERGENCY_RELIABILITY). The policy's
 *      `requiredBudgetScopes` templates are resolved to concrete window ids
 *      and the worst-case cash (`plan.maxVendorCashUsd`) is HELD against
 *      every one, all-or-nothing, before any attribution or attempt row
 *      exists. A reservation failure finalizes the ALREADY-CLAIMED
 *      invocation BUDGET_BLOCKED and throws — no attribution, no attempt,
 *      no dispatch. Non-billable lanes skip this step entirely.
 *   4. One pre-dispatch financial attribution (estimate + funding intent
 *      only; the create path has no reconciliation fields — §9.5).
 *   5. Walk `authority.permittedProviderRoutes` IN ORDER — the control plane
 *      alone owns fallback (§9.3). Per route: authoritative attempt row
 *      BEFORE transport (§9.4; a refused attempt row blocks dispatch), then
 *      ONE exact provider adapter. Clean failures advance to the next route;
 *      TIMEOUT/AMBIGUOUS stops the walk (never re-spend ambiguous funds) and
 *      finalizes AMBIGUOUS.
 *   6. Success: finalize durable state (result JSON + hash for replay). If
 *      that write fails or is fenced AFTER the paid call, the result is STILL
 *      returned and a durable recovery entry is queued (§9.7/§9.8) — a
 *      successful provider call is never retried because of telemetry.
 *      Budget close-out mirrors this: SETTLE the hold on success (worst-case
 *      remainder released back to the window), RELEASE it on a clean FAILED
 *      exhaustion. An AMBIGUOUS/TIMEOUT stop NEVER releases the hold — we
 *      cannot prove the vendor did not charge, so the funds stay reserved
 *      until reconciliation (mirrors budget.ts's own sweepExpired doctrine).
 *      Budget close-out failures are best-effort and NEVER convert a
 *      successful paid call into an error (the expiry sweep is the safety
 *      net) — mirrors the ObservabilitySink isolation rule.
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
import {
  type CreditAdmissionScope,
  type CreditAuthorizationHandle,
  type CreditAuthorizationPort,
  type CreditSnapshotStore,
} from "./credit-admission";
import type { AuthoritativeControlStore } from "./control-store";
import type { ObservabilitySink } from "./observability";
import type { ProviderDispatchFn, ProviderDispatchPayload } from "./dispatch";
import type { ProviderRouteId } from "./contracts";
import type { AttemptActualPricer, OwnerIncidentSink } from "./budget";
import {
  CONTROL_PLANE_PRICING_VERSION,
  CONTROL_PLANE_PROVIDER_MINIMUM_USD,
  estimateAttemptPlanWorstCaseUsd,
  holdForReconciliation,
  release as releaseBudgetHold,
  requiresCashReservation,
  reserve as reserveBudgetHold,
  resolveRequiredBudgetWindows,
  settleProvisional,
  toUsdString,
  usdToMicros,
} from "./budget";

// ─── Exact-decimal USD → credit minor-units (cents) conversion ────────────────

/**
 * Convert a USD amount to credit "minor units" (cents) using the same
 * exact-decimal validation as the rest of the codebase's money handling
 * (budget.ts's `usdToMicros`), rounded UP to the nearest cent so a worst-case
 * hold or a settled actual is never understated by float error.
 *
 * Replaces the previous `Math.round(usd * 100)`, which is float arithmetic:
 * for a value with more than 2 decimal places, or one that lands near an
 * IEEE-754 representation boundary, `x * 100` can be off by a fractional
 * amount that rounds to the wrong integer cent. `usdToMicros` already
 * refuses lossy amounts (more than 6 decimal places) and returns an exact
 * BigInt micro-dollar count; ceiling-dividing that by 10_000 (1 cent =
 * 10_000 micro-dollars) gives an exact, never-understated cent count with no
 * float step in between.
 */
function usdToCreditMinorUnitsCeil(usd: number, label: string): number {
  const micros = usdToMicros(usd, label);
  const minorUnits = (micros + 9_999n) / 10_000n;
  if (minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BudgetBlocked(`${label} is too large to represent as a safe-integer minor-unit count.`);
  }
  return Number(minorUnits);
}

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

/**
 * Budget seam (§10): the raw-SQL database the reservation engine writes to,
 * plus the non-throwing owner-incident sink for §10.2 overages. When a plan's
 * cost mode requires a cash reservation and this seam is absent, the pipeline
 * FAILS CLOSED — a billable dispatch without a budget store is impossible.
 */
export interface BudgetSeam {
  readonly db: unknown;
  readonly incidents?: OwnerIncidentSink;
  /** Hold TTL before the attempt-state-aware sweeper may act; default 15 min. */
  readonly holdTtlMs?: number;
  /**
   * §10.7: prices a successful attempt's ACTUAL vendor cash from real token
   * usage. Wired by the sealed composition root (never a caller). When absent
   * or unable to price, the pipeline settles the CONSERVATIVE per-attempt
   * ceiling instead — over-counting, never under-counting — and the amount
   * stays provisional until reconciliation. A priced actual above the hold is
   * preserved in full and drives the §10.2 OVERAGE_LOCKED circuit breaker.
   */
  readonly priceActual?: AttemptActualPricer;
  /**
   * §10.4 provider per-attempt minimums fed into the worst-case estimate.
   * Defaults to the control-plane-owned
   * {@link CONTROL_PLANE_PROVIDER_MINIMUM_USD} registry; overridable only by
   * the sealed composition root (a test seam, not caller policy).
   */
  readonly providerMinimumUsd?: Readonly<Record<string, string | number>>;
}

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
  /** §10 budget reservations. Absent + billable mode = fail closed. */
  readonly budget?: BudgetSeam;

  // ── Credit admission + atomic authorization (directive §11.3) — CONFIRMED_CREDITS_ONLY ONLY
  /**
   * Read-only NOVA credit-grant snapshot store (S5 materializes the real
   * implementation). REQUIRED for CONFIRMED_CREDITS_ONLY: absent store fails
   * closed (`PolicyBlocked`, "no-credit-store") with zero dispatch — a
   * provider/model id alone can never produce credit admission.
   */
  readonly creditStore?: CreditSnapshotStore;
  /**
   * Atomic reservation port (`credit-admission.ts`'s
   * `CreditAuthorizationPort`) preventing a double-spend across concurrent
   * authorizers of the same grant. REQUIRED alongside `creditStore` for
   * CONFIRMED_CREDITS_ONLY.
   */
  readonly creditPort?: CreditAuthorizationPort;
  /** Auto-release safety-net deadline for a credit hold; default 15 minutes. */
  readonly creditHoldMs?: number;
}

const DEFAULT_LEASE_MS = 120_000;
const DEFAULT_HOLD_TTL_MS = 15 * 60_000;
const DEFAULT_CREDIT_HOLD_MS = 15 * 60_000;

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
 * Best-effort release of the invocation's §10 budget hold. Used on every "no
 * charge occurred / could have occurred" exit from the pipeline AFTER a
 * reservation was taken (attribution failure, a pre-transport
 * StoreUnavailable, or full route exhaustion). Never throws — a release
 * failure is logged and left to the expiry sweep, exactly like the
 * settle-on-success path.
 */
async function releaseReservationBestEffort(
  budgetHeld: boolean,
  deps: LedgeredDispatchDeps,
  observability: ObservabilitySink,
  invocationId: string,
): Promise<void> {
  if (!budgetHeld || deps.budget === undefined) return;
  try {
    await releaseBudgetHold(deps.budget.db, {
      invocationId,
      now: deps.now(),
    });
  } catch (error) {
    observability.markDegraded(
      `budget release failed for invocation ${invocationId} ` +
        "(expiry sweep will reclaim the hold)",
      error,
    );
  }
}

/**
 * Best-effort release of one credit authorization hold (directive §11.3).
 * Same never-throws, log-and-move-on contract as
 * {@link releaseReservationBestEffort}.
 */
async function releaseCreditHoldBestEffort(
  handle: CreditAuthorizationHandle | null,
  deps: LedgeredDispatchDeps,
  observability: ObservabilitySink,
  invocationId: string,
): Promise<void> {
  if (!handle || !deps.creditPort) return;
  try {
    await deps.creditPort.release(handle);
  } catch (error) {
    observability.markDegraded(
      `credit release of reservation ${handle.reservationId} failed for ` +
        `invocation ${invocationId} (expiry sweep will reclaim the hold)`,
      error,
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

    // ── §10 budget reservation: the worst case of the ENTIRE attempt plan
    // (§10.4), against every policy-required window (§10.5), BEFORE any
    // attribution/attempt row exists. A failure here dispatches NOTHING and
    // finalizes the already-ACQUIRED claim BUDGET_BLOCKED.
    let budgetHeld = false;
    const finalizeBudgetBlocked = async (): Promise<void> => {
      try {
        await deps.store.finalizeFailure({
          invocationId,
          ownerToken,
          status: "BUDGET_BLOCKED",
          now: deps.now(),
        });
      } catch (error) {
        observability.markDegraded(
          `finalizeFailure(BUDGET_BLOCKED) failed for invocation ${invocationId}`,
          error,
        );
      }
    };
    if (requiresCashReservation(plan.costMode)) {
      try {
        if (deps.budget === undefined) {
          throw new BudgetBlocked(
            "billable cost mode with no budget store wired — a cash dispatch " +
              "without an atomic reservation is impossible (§10). Failing closed.",
          );
        }
        // §10.3: a zero-dollar cap authorizes NOTHING billable.
        if (usdToMicros(plan.maxVendorCashUsd, "maxVendorCashUsd") <= 0n) {
          throw new BudgetBlocked(
            "maxVendorCashUsd = 0 authorizes no billable provider call (§10.3) " +
              "— a zero cap means no cash authorization exists at all.",
          );
        }
        // §10.5: required windows come from the POLICY REGISTRY, never a
        // call-site-chosen window id. Missing/empty scopes fail closed.
        const windows = resolveRequiredBudgetWindows(
          authority.requiredBudgetScopes,
          {
            entity: request.entity,
            surface: authority.surface,
            requestId: request.requestId,
            now: deps.now(),
          },
        );
        if (windows.length === 0) {
          throw new BudgetBlocked(
            `task class "${request.taskClass}" grants no required budget ` +
              "scopes — an unscoped cash spend is unrepresentable (§10.5).",
          );
        }
        // §10.4: reserve the worst case of EVERY permitted attempt.
        const worstCaseUsd = estimateAttemptPlanWorstCaseUsd({
          routes: authority.permittedProviderRoutes,
          perAttemptCeilingUsd: plan.maxVendorCashUsd,
          pricingVersion: CONTROL_PLANE_PRICING_VERSION,
          // §10.4: provider per-attempt minimums are IN EFFECT at this — the
          // only — production cash call site, from the control-plane-owned
          // registry unless the sealed composition root overrides.
          providerMinimumUsd:
            deps.budget.providerMinimumUsd ?? CONTROL_PLANE_PROVIDER_MINIMUM_USD,
        });
        const reserveNow = deps.now();
        await reserveBudgetHold(deps.budget.db, {
          windowIds: windows.map((w) => w.windowId),
          amountUsd: worstCaseUsd,
          invocationId,
          reservationVersion: 1,
          now: reserveNow,
          expiresAt: new Date(
            reserveNow.getTime() +
              (deps.budget.holdTtlMs ?? DEFAULT_HOLD_TTL_MS),
          ),
          idFactory,
        });
        budgetHeld = true;
      } catch (error) {
        await finalizeBudgetBlocked();
        throw error;
      }
    }

    // ── One pre-dispatch attribution: estimate + intent only (§9.5).
    try {
      await deps.store.createAttribution({
        attributionId: idFactory(),
        invocationId,
        estimatedGrossUsd: plan.maxVendorCashUsd,
        fundingLabel: plan.fundingLabel,
      });
    } catch (error) {
      await releaseReservationBestEffort(budgetHeld, deps, observability, invocationId);
      throw error;
    }

    // ── Credit admission pre-flight (directive §11.3) — CONFIRMED_CREDITS_ONLY
    // ONLY. Fails closed BEFORE any attempt row: a provider/model id alone can
    // never produce credit admission, so an unconfigured store/port is a
    // systemic misconfiguration, not a per-route refusal.
    if (plan.costMode === "CONFIRMED_CREDITS_ONLY") {
      if (!deps.creditStore || !deps.creditPort) {
        try {
          await deps.store.finalizeFailure({
            invocationId,
            ownerToken,
            status: "POLICY_BLOCKED",
            blockedDetail:
              "CONFIRMED_CREDITS_ONLY requires an injected credit store and " +
              "authorization port; neither was configured.",
            now: deps.now(),
          });
        } catch (storeError) {
          observability.markDegraded(
            `finalizeFailure(POLICY_BLOCKED) failed for invocation ${invocationId}`,
            storeError,
          );
        }
        await releaseReservationBestEffort(budgetHeld, deps, observability, invocationId);
        throw new PolicyBlocked(
          "no-credit-store: CONFIRMED_CREDITS_ONLY requires an injected credit " +
            "snapshot store and authorization port; a provider/model id alone " +
            "can never produce credit admission — failing closed with zero dispatch.",
        );
      }
    }

    // ── Provider walk: control-plane-owned fallback order (§9.3).
    const summaries: AiAttemptSummary[] = [];
    const routes = authority.permittedProviderRoutes;
    let lastErrorCode: string | null = null;

    for (let i = 0; i < routes.length; i += 1) {
      const route = routes[i] as ProviderRouteId;
      const ordinal = nextOrdinal + i;
      const attemptId = idFactory();

      // ── Credit authorization for THIS route (directive §11.3) — atomic,
      // CONFIRMED_CREDITS_ONLY only. A refusal skips transport for this route
      // entirely (advances to the next route exactly like a clean provider
      // failure); it never takes a hold. An admitted route's hold is settled
      // on that route's SUCCEEDED outcome or released on its clean failure
      // below — never on an AMBIGUOUS/TIMEOUT outcome (unproven charge; same
      // doctrine as the invocation-level budget hold).
      let creditHandle: CreditAuthorizationHandle | null = null;
      if (plan.costMode === "CONFIRMED_CREDITS_ONLY") {
        const creditScope: CreditAdmissionScope = {
          provider: route,
          product: authority.surface,
          model: modelRequested,
          region: null,
        };
        const authorization = await deps.creditPort!.authorize({
          store: deps.creditStore!,
          scope: creditScope,
          // No per-token pricing yet (mirrors budget.ts): the worst case IS
          // the plan's cash ceiling, converted to integer cents — the only
          // currency an AI control-plane policy cap is denominated in today.
          worstCaseMinorUnits: usdToCreditMinorUnitsCeil(plan.maxVendorCashUsd, "maxVendorCashUsd"),
          worstCaseCurrency: "USD",
          now: deps.now(),
          expiresAt: new Date(deps.now().getTime() + (deps.creditHoldMs ?? DEFAULT_CREDIT_HOLD_MS)),
          idFactory,
        });
        if (!authorization.admitted) {
          const errorCode = `CREDIT_BLOCKED:${authorization.reason ?? "unknown"}`;
          try {
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
          } catch (error) {
            await releaseReservationBestEffort(budgetHeld, deps, observability, invocationId);
            throw error;
          }
          await deps.store.recordAttemptFailure({
            attemptId,
            invocationId,
            ownerToken,
            status: "FAILED",
            providerUsed: null, // transport never began
            errorCode,
            now: deps.now(),
          });
          summaries.push({
            ordinal,
            providerRequested: route,
            providerUsed: null,
            modelRequested,
            modelResolved: null,
            status: "FAILED",
            errorCode,
          });
          lastErrorCode = errorCode;
          continue; // next route — no dispatch, no hold ever taken
        }
        creditHandle = authorization.handle;
      }

      // Authoritative attempt row BEFORE transport (§9.4) — throws
      // StoreUnavailable (blocking dispatch) if the store or the lease is gone.
      // An unexpected failure here means NO transport occurred for this
      // route, so (for a billable mode) the hold is released the same as any
      // other never-charged exit — best-effort; the expiry sweep is the
      // ultimate safety net.
      try {
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
      } catch (error) {
        await releaseReservationBestEffort(budgetHeld, deps, observability, invocationId);
        await releaseCreditHoldBestEffort(creditHandle, deps, observability, invocationId);
        throw error;
      }

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
        // §10.7: PROVISIONAL settlement of the attempt's ACTUAL cost. When
        // the composition root wires a token pricer, the real token-priced
        // actual settles — including an actual ABOVE the hold, which is
        // preserved in full and trips the §10.2 OVERAGE_LOCKED circuit
        // breaker through this production path. Without a pricer (or when it
        // cannot price this attempt) the CONSERVATIVE per-attempt ceiling
        // settles instead — over-counting, never under-counting — and either
        // way the amount stays provisional (never confirmed) until
        // reconciliation. A budget-store hiccup after a successful PAID call
        // never converts the success into an error: the hold stays and the
        // attempt-state-aware sweeper preserves it as a RECONCILIATION_HOLD
        // (§10.1) instead of releasing.
        if (budgetHeld && deps.budget !== undefined) {
          let actualUsd = toUsdString(plan.maxVendorCashUsd, "maxVendorCashUsd");
          if (deps.budget.priceActual !== undefined) {
            try {
              const priced = deps.budget.priceActual({
                providerUsed: outcome.providerUsed,
                modelResolved: outcome.modelResolved,
                inputTokens: outcome.inputTokens,
                outputTokens: outcome.outputTokens,
              });
              if (priced !== null) {
                actualUsd = toUsdString(priced, "priceActual");
              }
            } catch (error) {
              // A broken pricer never turns a paid success into an error and
              // never under-counts: fall back to the conservative ceiling.
              observability.markDegraded(
                `budget priceActual failed for invocation ${invocationId} — ` +
                  "settling the conservative per-attempt ceiling instead",
                error,
              );
              telemetryStatus = "DEGRADED";
            }
          }
          try {
            await settleProvisional(deps.budget.db, {
              invocationId,
              actualUsd,
              now: deps.now(),
              incidents: deps.budget.incidents,
            });
          } catch (error) {
            observability.markDegraded(
              `budget settleProvisional failed for invocation ${invocationId}`,
              error,
            );
            telemetryStatus = "DEGRADED";
          }
        }
        summaries.push({
          ordinal,
          providerRequested: route,
          providerUsed: outcome.providerUsed,
          modelRequested,
          modelResolved: outcome.modelResolved,
          status: "SUCCEEDED",
        });
        // Credit close-out (directive §11.3, CONFIRMED_CREDITS_ONLY only):
        // same best-effort settle doctrine as the budget hold above.
        if (creditHandle) {
          try {
            await deps.creditPort!.settle(
              creditHandle,
              usdToCreditMinorUnitsCeil(plan.maxVendorCashUsd, "maxVendorCashUsd"),
            );
          } catch (error) {
            observability.markDegraded(
              `credit settle of reservation ${creditHandle.reservationId} failed ` +
                `for invocation ${invocationId} (expiry sweep will reclaim the hold)`,
              error,
            );
          }
        }
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
        // §10.1: AMBIGUOUS_AFTER_DISPATCH retains the hold — the money moves
        // to RECONCILIATION_HOLD (unsweepable; resolved only by authoritative
        // reconciliation). If even this transition fails, the hold simply
        // stays HELD and the sweeper's attempt-state query converts it —
        // there is NO path on which an ambiguous charge frees its budget.
        if (budgetHeld && deps.budget !== undefined) {
          try {
            await holdForReconciliation(deps.budget.db, {
              invocationId,
              now: deps.now(),
            });
          } catch (error) {
            observability.markDegraded(
              `budget holdForReconciliation failed for invocation ${invocationId}`,
              error,
            );
          }
        }
        // We cannot prove the vendor did not charge — never spend the same
        // funds on another route. Finalize AMBIGUOUS and stop. The finalize
        // is GUARDED: a store failure here must never swallow the
        // AmbiguousCharge verdict (the caller would see a retryable-looking
        // store error while the durable "charge unproven" record is lost).
        // Instead: mark degraded, queue a durable FINALIZE_AMBIGUOUS recovery
        // entry (§9.7), and STILL raise AmbiguousCharge. The attempt row
        // already durably carries the AMBIGUOUS/TIMEOUT status, so even
        // before recovery drains, the claim-steal path refuses to
        // re-dispatch this invocation. The budget AND credit holds are
        // DELIBERATELY NOT released here: an unproven charge must never free
        // budget/credit that may have actually been spent (a double-spend
        // risk). They stay HELD until reconciliation; the expiry sweep's
        // AMBIGUOUS exclusion is the caller's job once this invocation's
        // status is known (mirrors budget.ts's doctrine).
        const finalizeInput = {
          invocationId,
          ownerToken,
          status: "AMBIGUOUS" as const,
          now: deps.now(),
        };
        try {
          const applied = await deps.store.finalizeFailure(finalizeInput);
          if (!applied) {
            observability.markDegraded(
              `finalizeFailure(AMBIGUOUS) fenced out for invocation ${invocationId}`,
              null,
            );
            await observability.enqueueRecovery({
              id: idFactory(),
              invocationId,
              kind: "FINALIZE_AMBIGUOUS",
              payload: { ...finalizeInput, now: finalizeInput.now.toISOString() },
            });
          }
        } catch (error) {
          observability.markDegraded(
            `finalizeFailure(AMBIGUOUS) failed for invocation ${invocationId}`,
            error,
          );
          await observability.enqueueRecovery({
            id: idFactory(),
            invocationId,
            kind: "FINALIZE_AMBIGUOUS",
            payload: { ...finalizeInput, now: finalizeInput.now.toISOString() },
          });
        }
        throw new AmbiguousCharge(
          `Attempt ${ordinal} on route "${route}" ended ${outcome.kind} after ` +
            "dispatch — the charge state is unproven; reconciliation required " +
            "before any re-spend.",
        );
      }

      // Clean FAILED (this route, transport attempted and cleanly refused/
      // errored, no charge possible): release THIS route's credit hold
      // right away — unlike the invocation-spanning budget hold, a credit
      // authorization is per-route and its grant's headroom should be freed
      // for the NEXT route's authorize() attempt within the same walk.
      await releaseCreditHoldBestEffort(creditHandle, deps, observability, invocationId);
    }

    // Every permitted route failed cleanly (no charge proven or possible).
    // Guarded the same way: losing this finalize must not replace the honest
    // ProviderUnavailable verdict, and the durable FAILED terminal is
    // recovered via the §9.7 queue instead of relying on a lease-expiry steal.
    //
    // §10.1 FAILED_NO_CHARGE: release the entire budget hold. If the release
    // itself fails, the stale hold is recovered by the sweeper AFTER it
    // re-proves the clean ledger (§10.9 crash recovery) — never by trusting
    // this caller.
    if (budgetHeld && deps.budget !== undefined) {
      try {
        await releaseBudgetHold(deps.budget.db, {
          invocationId,
          now: deps.now(),
        });
      } catch (error) {
        observability.markDegraded(
          `budget release failed for invocation ${invocationId}`,
          error,
        );
      }
    }
    const failedFinalizeInput = {
      invocationId,
      ownerToken,
      status: "FAILED" as const,
      now: deps.now(),
    };
    try {
      const applied = await deps.store.finalizeFailure(failedFinalizeInput);
      if (!applied) {
        observability.markDegraded(
          `finalizeFailure(FAILED) fenced out for invocation ${invocationId}`,
          null,
        );
      }
    } catch (error) {
      observability.markDegraded(
        `finalizeFailure(FAILED) failed for invocation ${invocationId}`,
        error,
      );
      await observability.enqueueRecovery({
        id: idFactory(),
        invocationId,
        kind: "FINALIZE_FAILURE",
        payload: {
          ...failedFinalizeInput,
          now: failedFinalizeInput.now.toISOString(),
        },
      });
    }
    // No charge occurred on any route — release the whole hold.
    await releaseReservationBestEffort(budgetHeld, deps, observability, invocationId);
    throw new ProviderUnavailable(
      `All ${routes.length} permitted provider route(s) failed for task ` +
        `"${request.taskClass}"` +
        (lastErrorCode ? ` (last error: ${lastErrorCode})` : "") +
        ".",
    );
  };
}
