/**
 * Trusted Actor boundary for server actions ("use server" files) and
 * background/non-interactive write paths.
 *
 * WHY THIS EXISTS
 * ---------------
 * A server action is a network-invokable RPC endpoint regardless of whether
 * any current UI component calls it — the "use server" directive alone
 * exposes it. Gating must NEVER depend on trusting caller-supplied identity
 * fields (an `actor: string`, a `reporterUserId`, a `reviewer` in the request
 * body): those are exactly the shape of vulnerability this module closes.
 * The only trustworthy identity sources are:
 *   - the server-resolved session from `auth()` (interactive HUMAN callers), and
 *   - a governed SERVICE / SYSTEM identity minted server-side for
 *     background/non-interactive paths (workers, cron, invariants).
 *
 * A `TrustedActor` can only be produced by the constructors in this module,
 * every one of which guarantees a **non-empty, stable `subjectId`** (throwing
 * `InvalidActorError` otherwise). Because the constructors run server-side and
 * are never handed a caller-supplied actor object across the RPC boundary, a
 * network caller cannot forge authority by shaping the request body.
 *
 * ERROR TAXONOMY
 * --------------
 *   - UnauthenticatedError — no session at all.
 *   - ForbiddenError       — a session/actor exists but lacks the required
 *                            role or actor type.
 *   - InvalidActorError    — an actor would carry an empty/absent subjectId
 *                            (a malformed privileged session). Fail closed:
 *                            we throw rather than persist an empty identity.
 * These are distinct from each call site's *StoreUnavailableError (a different
 * failure class — the datastore, not the caller). Conflating them was the root
 * cause of a prior regression where input validation ran before the auth check
 * and masked auth failures behind whatever validation caught first. The auth
 * check MUST run before any domain/sensitive validation: an unauthenticated
 * caller should never learn whether their input was even well-formed.
 *
 * SERVICE / SYSTEM GOVERNANCE (Phase 1B)
 * --------------------------------------
 * Non-interactive identity is GOVERNED, not merely constructed. The only
 * sanctioned way for application code to obtain a SERVICE/SYSTEM actor is
 * `resolveServiceActor()`, which enforces:
 *   - an allowlisted `ServicePrincipalId` (unknown ids throw
 *     UnknownServicePrincipalError — never minted on the fly);
 *   - a `VerifiedCredentialContext` naming HOW the caller's credential was
 *     verified (cron bearer, worker process boot, system invariant) and by
 *     which module (missing/invalid context throws
 *     InvalidServiceCredentialError);
 *   - an operation-scope check against the principal's registered operations
 *     (out-of-scope operations throw ForbiddenError);
 *   - a correlation requirement: every SERVICE/SYSTEM actor MUST carry a
 *     `runId` or `requestId` (otherwise InvalidActorError) so background writes
 *     are always traceable to a concrete run.
 * The raw `serviceActor()` / `systemActor()` constructors are deprecated for
 * application code and enforced by the import-boundary guard
 * `scripts/guardrails/actor-minting-boundary.mjs`: only this module, the
 * test-internal re-export module, and test files may reference them.
 *
 * AUDIT PERSISTENCE DECISION (directive 4.3)
 * ------------------------------------------
 * The TrustedActor contract carries more audit facts (auth method, authority
 * scope, tenant/project, request/run id, observedAt, policyVersion, operation,
 * credential method) than any single audit row persists inline. Of the two
 * sanctioned paths — widen every audit table, or persist one immutable
 * receipt — we chose the IMMUTABLE ACTOR-RECEIPT: the choke points here
 * (requireSessionActor / requireAdminActor / resolveServiceActor) mint the
 * complete contract, and `persistActorReceipt()` (see ./actor-receipt.ts)
 * writes it as one append-only `actor_receipts` row at the audited write; the
 * audit row stores the receipt id (e.g. `actorReceiptId`). Inline columns
 * (subject id, actor type, email snapshot, policy version) remain as
 * denormalized conveniences; the receipt is the complete record. Fields on the
 * actor are therefore NEVER silently discarded: everything the contract claims
 * is either inline or in the referenced receipt.
 *
 * SEAT IDENTITY RULE (directive 4.4)
 * ----------------------------------
 * Council "seats" (reviewer seat labels on subagent-run reviews) are
 * NON-AUTHORITATIVE workflow labels. Authority always comes from the
 * authenticated HUMAN actor (session-derived); any ADMIN human may review on
 * behalf of a parent seat, and the seat label is validated only for workflow
 * consistency. The audit path records the human actor's stable subject id (and
 * its receipt) as the authority — a seat label never implies the seat itself
 * authenticated.
 */
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/require-admin";

/**
 * Bump when the actor contract or its authority semantics change.
 * 1a — discriminated union, server-derived human identity.
 * 1b — governed service principals (allowlist + credential context +
 *      operation scopes), actor receipts, seat-label rule made explicit.
 */
export const ACTOR_POLICY_VERSION = "1b" as const;

// ─── Typed errors ─────────────────────────────────────────────────────────────

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(message = "You do not have authority for this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when an actor would carry an empty/absent stable subject id. A
 * privileged session whose subject id is missing is malformed — we refuse to
 * mint an actor or persist a blank identity from it.
 */
export class InvalidActorError extends Error {
  readonly code = "INVALID_ACTOR" as const;
  constructor(message = "Actor subject id is missing or empty.") {
    super(message);
    this.name = "InvalidActorError";
  }
}

/**
 * Thrown when a caller asks to resolve a SERVICE/SYSTEM actor for a principal
 * id that is not in the allowlisted registry. Service identity is governed:
 * an unknown principal is never minted on the fly.
 */
export class UnknownServicePrincipalError extends Error {
  readonly code = "UNKNOWN_SERVICE_PRINCIPAL" as const;
  constructor(principalId: string) {
    super(`Unknown service principal "${principalId}". Principals must be allowlisted in the service-principal registry.`);
    this.name = "UnknownServicePrincipalError";
  }
}

/**
 * Thrown when a SERVICE/SYSTEM actor is requested without a well-formed
 * VerifiedCredentialContext — i.e. nothing attests HOW the caller's service
 * credential was verified. Fail closed: no context, no actor.
 */
export class InvalidServiceCredentialError extends Error {
  readonly code = "INVALID_SERVICE_CREDENTIAL" as const;
  constructor(message = "A verified service credential context is required to resolve a service actor.") {
    super(message);
    this.name = "InvalidServiceCredentialError";
  }
}

// ─── The discriminated union ──────────────────────────────────────────────────

export type ActorType = "HUMAN" | "SERVICE" | "SYSTEM";
export type AuthMethod = "SESSION" | "SERVICE_CREDENTIAL" | "SYSTEM_INVARIANT";
export type AuthorityScope = "ADMIN" | "USER" | "SERVICE" | "SYSTEM";

interface BaseActor {
  /** Discriminant. */
  readonly actorType: ActorType;
  /**
   * Non-empty, stable identifier for the acting principal. For HUMAN this is
   * the session user's DB id; for SERVICE/SYSTEM a governed service/system id.
   * NEVER empty — the constructors throw InvalidActorError before that could
   * happen, so persistence sites can write it without a null-check.
   */
  readonly subjectId: string;
  readonly authMethod: AuthMethod;
  readonly authorityScope: AuthorityScope;
  /** Multi-tenant hints; nullable until tenanting lands. */
  readonly tenant: string | null;
  readonly project: string | null;
  /** Correlation ids for audit; nullable when not supplied by the call site. */
  readonly requestId: string | null;
  readonly runId: string | null;
  /** When the actor was observed/minted. */
  readonly observedAt: Date;
  /** Best-effort human-readable snapshot; display/audit only, never authority. */
  readonly emailSnapshot: string | null;
  readonly policyVersion: string;
}

export interface HumanActor extends BaseActor {
  readonly actorType: "HUMAN";
  readonly authMethod: "SESSION";
}

export interface ServiceActor extends BaseActor {
  readonly actorType: "SERVICE";
  readonly authMethod: "SERVICE_CREDENTIAL";
  /**
   * Operation this actor was resolved for (registry-scoped). Null only for
   * legacy/test-minted actors from the deprecated raw constructor.
   */
  readonly operation: ServiceOperation | null;
  /** How the service credential was verified. Null only for raw-minted actors. */
  readonly credentialMethod: ServiceCredentialMethod | null;
}

export interface SystemActor extends BaseActor {
  readonly actorType: "SYSTEM";
  readonly authMethod: "SYSTEM_INVARIANT";
  /** Operation this actor was resolved for. Null only for raw-minted actors. */
  readonly operation: ServiceOperation | null;
  /** How the invariant context was verified. Null only for raw-minted actors. */
  readonly credentialMethod: ServiceCredentialMethod | null;
}

export type TrustedActor = HumanActor | ServiceActor | SystemActor;

// ─── Subject-id invariant ─────────────────────────────────────────────────────

/**
 * Returns a trimmed, guaranteed non-empty subject id or throws
 * InvalidActorError. This is the single choke point that makes an empty
 * subjectId unrepresentable in a TrustedActor.
 */
function requireNonEmptySubject(id: string | null | undefined, ctx: string): string {
  const trimmed = (id ?? "").trim();
  if (!trimmed) {
    throw new InvalidActorError(
      `${ctx}: actor subject id must be a non-empty, stable identifier.`
    );
  }
  return trimmed;
}

interface AuditContext {
  readonly requestId?: string | null;
  readonly runId?: string | null;
  readonly tenant?: string | null;
  readonly project?: string | null;
}

// ─── HUMAN actor resolution (session-derived, never caller-supplied) ──────────

/**
 * Resolves the caller's session into a HUMAN actor for ANY authenticated user
 * (USER or ADMIN). Used by user-facing gated actions (filing an authenticated
 * report, appealing one's own action) where the identity must be derived from
 * the session — never accepted from the request body.
 *
 * Throws UnauthenticatedError (no session) or InvalidActorError (session with
 * an empty subject id — malformed). Auth resolution happens here, before any
 * domain validation at the call site.
 */
export async function requireSessionActor(ctx: AuditContext = {}): Promise<HumanActor> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }
  const subjectId = requireNonEmptySubject(
    (session.user as { id?: string }).id,
    "requireSessionActor"
  );
  return {
    actorType: "HUMAN",
    subjectId,
    authMethod: "SESSION",
    authorityScope: isAdminSession(session) ? "ADMIN" : "USER",
    tenant: ctx.tenant ?? null,
    project: ctx.project ?? null,
    requestId: ctx.requestId ?? null,
    runId: ctx.runId ?? null,
    observedAt: new Date(),
    emailSnapshot: session.user.email ?? null,
    policyVersion: ACTOR_POLICY_VERSION,
  };
}

/**
 * Resolves the caller's session and asserts ADMIN authority, returning a HUMAN
 * actor. Throws UnauthenticatedError (no session), ForbiddenError (session,
 * wrong role), or InvalidActorError (privileged session with an empty/missing
 * subject id — MUST throw, never return an empty subject).
 */
export async function requireAdminActor(ctx: AuditContext = {}): Promise<HumanActor> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }
  if (!isAdminSession(session)) {
    throw new ForbiddenError("Admin role required for this action.");
  }
  const subjectId = requireNonEmptySubject(
    (session.user as { id?: string }).id,
    "requireAdminActor"
  );
  return {
    actorType: "HUMAN",
    subjectId,
    authMethod: "SESSION",
    authorityScope: "ADMIN",
    tenant: ctx.tenant ?? null,
    project: ctx.project ?? null,
    requestId: ctx.requestId ?? null,
    runId: ctx.runId ?? null,
    observedAt: new Date(),
    emailSnapshot: session.user.email ?? null,
    policyVersion: ACTOR_POLICY_VERSION,
  };
}

// ─── SERVICE / SYSTEM governance (registry + credential context) ──────────────

/**
 * How a non-interactive caller's credential was verified before a
 * SERVICE/SYSTEM actor may be resolved.
 *   - CRON_BEARER       — the request carried the CRON_SECRET bearer token and
 *                         was verified by lib/cron/authorize (constant-time).
 *   - WORKER_PROCESS    — a long-running worker process booted with trusted
 *                         deploy-time configuration (no inbound request).
 *   - SYSTEM_INVARIANT  — an in-process invariant/maintenance path with no
 *                         external trigger at all.
 *   - TEST_HARNESS      — test code only; never a production verification.
 */
export type ServiceCredentialMethod =
  | "CRON_BEARER"
  | "WORKER_PROCESS"
  | "SYSTEM_INVARIANT"
  | "TEST_HARNESS";

const SERVICE_CREDENTIAL_METHODS: ReadonlySet<string> = new Set([
  "CRON_BEARER",
  "WORKER_PROCESS",
  "SYSTEM_INVARIANT",
  "TEST_HARNESS",
] satisfies ServiceCredentialMethod[]);

/**
 * Attestation that a service credential was actually verified, produced by the
 * verifying module (e.g. the cron authorizer after a constant-time bearer
 * check). This is an in-process trust token, not a network-supplied value: it
 * must be constructed at the point of verification, never deserialized from a
 * request body.
 */
export interface VerifiedCredentialContext {
  readonly method: ServiceCredentialMethod;
  /** Module that performed the verification, e.g. "lib/cron/authorize". */
  readonly verifiedBy: string;
  readonly verifiedAt: Date;
}

/**
 * Operations a service/system principal can be scoped to. Extend this union
 * (and the registry below) when a new background surface needs an identity —
 * never widen an existing principal to "everything".
 */
export type ServiceOperation =
  | "settlement:run"
  | "ingestion:refresh"
  | "picks:generate"
  | "content:publish"
  | "outbox:deliver"
  | "ai:reconcile"
  | "nova:source-cycle"
  | "jarvis:log-handoff"
  | "jarvis:log-subagent-run"
  | "moderation:prune-rate-limits"
  | "system:invariant-sweep";

interface ServicePrincipalRegistration {
  readonly kind: "SERVICE" | "SYSTEM";
  readonly operations: readonly ServiceOperation[];
}

/**
 * The allowlist. A principal id not present here CANNOT become an actor —
 * resolveServiceActor throws UnknownServicePrincipalError. Each principal is
 * scoped to the exact operations it needs (least authority).
 */
const SERVICE_PRINCIPAL_REGISTRY = {
  "service:settlement-worker": {
    kind: "SERVICE",
    operations: ["settlement:run", "jarvis:log-handoff", "jarvis:log-subagent-run"],
  },
  "service:data-refresh-worker": {
    kind: "SERVICE",
    operations: ["ingestion:refresh", "jarvis:log-handoff", "jarvis:log-subagent-run"],
  },
  "service:pick-generation-worker": {
    kind: "SERVICE",
    operations: ["picks:generate", "jarvis:log-handoff", "jarvis:log-subagent-run"],
  },
  "service:content-publishing-worker": {
    kind: "SERVICE",
    operations: ["content:publish", "jarvis:log-handoff", "jarvis:log-subagent-run"],
  },
  "service:outbox-delivery": {
    kind: "SERVICE",
    operations: ["outbox:deliver"],
  },
  "service:ai-reconciliation": {
    kind: "SERVICE",
    operations: ["ai:reconcile"],
  },
  "service:nova-source-cycle": {
    kind: "SERVICE",
    operations: ["nova:source-cycle"],
  },
  "system:invariant-sweep": {
    kind: "SYSTEM",
    operations: ["system:invariant-sweep"],
  },
  "system:rate-limit-retention": {
    kind: "SYSTEM",
    operations: ["moderation:prune-rate-limits"],
  },
} as const satisfies Record<string, ServicePrincipalRegistration>;

/** Allowlisted non-interactive principal ids. */
export type ServicePrincipalId = keyof typeof SERVICE_PRINCIPAL_REGISTRY;

export interface ResolveServiceActorParams {
  readonly principalId: ServicePrincipalId;
  readonly verifiedCredentialContext: VerifiedCredentialContext;
  readonly operation: ServiceOperation;
  /** At least one of requestId / runId is REQUIRED (traceability). */
  readonly requestId?: string | null;
  readonly runId?: string | null;
  readonly tenant?: string | null;
  readonly project?: string | null;
}

function assertVerifiedCredentialContext(
  ctx: VerifiedCredentialContext | null | undefined
): asserts ctx is VerifiedCredentialContext {
  if (!ctx || typeof ctx !== "object") {
    throw new InvalidServiceCredentialError();
  }
  if (!SERVICE_CREDENTIAL_METHODS.has(ctx.method)) {
    throw new InvalidServiceCredentialError(
      `Unrecognised service credential method "${String(ctx.method)}".`
    );
  }
  if (typeof ctx.verifiedBy !== "string" || ctx.verifiedBy.trim() === "") {
    throw new InvalidServiceCredentialError(
      "Credential context must name the verifying module (verifiedBy)."
    );
  }
  if (!(ctx.verifiedAt instanceof Date) || Number.isNaN(ctx.verifiedAt.getTime())) {
    throw new InvalidServiceCredentialError(
      "Credential context must carry a valid verifiedAt timestamp."
    );
  }
}

/**
 * The ONLY sanctioned way for application code to obtain a SERVICE/SYSTEM
 * actor. Enforces, in order (fail closed at each step):
 *   1. principal allowlist  → UnknownServicePrincipalError;
 *   2. verified credential  → InvalidServiceCredentialError;
 *   3. operation scope      → ForbiddenError (operation-scope denial);
 *   4. correlation identity → InvalidActorError when BOTH requestId and runId
 *      are absent/empty (a background actor must be traceable to a run).
 * The resolved actor's subjectId is the registry principal id — never a
 * caller-invented string.
 */
export function resolveServiceActor(params: ResolveServiceActorParams): ServiceActor | SystemActor {
  const registration: ServicePrincipalRegistration | undefined =
    SERVICE_PRINCIPAL_REGISTRY[params.principalId];
  if (!registration) {
    // Reachable from JS / any-typed callers even though the TS signature
    // narrows principalId — the runtime allowlist is the authority.
    throw new UnknownServicePrincipalError(String(params.principalId));
  }

  assertVerifiedCredentialContext(params.verifiedCredentialContext);

  if (!registration.operations.includes(params.operation)) {
    throw new ForbiddenError(
      `Principal "${params.principalId}" is not authorized for operation "${params.operation}". ` +
        `Authorized operations: ${registration.operations.join(", ")}.`
    );
  }

  const requestId = (params.requestId ?? "").trim() || null;
  const runId = (params.runId ?? "").trim() || null;
  if (!requestId && !runId) {
    throw new InvalidActorError(
      `resolveServiceActor("${params.principalId}"): a runId or requestId is required for SERVICE/SYSTEM actors.`
    );
  }

  const shared = {
    subjectId: params.principalId as string,
    authorityScope: registration.kind,
    tenant: params.tenant ?? null,
    project: params.project ?? null,
    requestId,
    runId,
    observedAt: new Date(),
    emailSnapshot: null,
    policyVersion: ACTOR_POLICY_VERSION,
    operation: params.operation,
    credentialMethod: params.verifiedCredentialContext.method,
  } as const;

  if (registration.kind === "SYSTEM") {
    return { ...shared, actorType: "SYSTEM", authMethod: "SYSTEM_INVARIANT" };
  }
  return { ...shared, actorType: "SERVICE", authMethod: "SERVICE_CREDENTIAL" };
}

// ─── Deprecated raw minting (guard-enforced to actor internals + tests) ───────

export interface ServiceActorParams extends AuditContext {
  /** Stable governed service identity, e.g. "service:pick-generation". */
  readonly subjectId: string;
  readonly emailSnapshot?: string | null;
}

/**
 * @deprecated Application code must use {@link resolveServiceActor}. This raw
 * constructor performs NO allowlist, credential, or operation-scope checks.
 * The import-boundary guard (scripts/guardrails/actor-minting-boundary.mjs)
 * fails CI when any module other than this file, the test-internal re-export
 * module, or a test file references it.
 */
export function serviceActor(params: ServiceActorParams): ServiceActor {
  const subjectId = requireNonEmptySubject(params.subjectId, "serviceActor");
  return {
    actorType: "SERVICE",
    subjectId,
    authMethod: "SERVICE_CREDENTIAL",
    authorityScope: "SERVICE",
    tenant: params.tenant ?? null,
    project: params.project ?? null,
    requestId: params.requestId ?? null,
    runId: params.runId ?? null,
    observedAt: new Date(),
    emailSnapshot: params.emailSnapshot ?? null,
    policyVersion: ACTOR_POLICY_VERSION,
    operation: null,
    credentialMethod: null,
  };
}

export interface SystemActorParams extends AuditContext {
  /** Stable system identity, e.g. "system:invariant-sweep". */
  readonly subjectId: string;
}

/**
 * @deprecated Application code must use {@link resolveServiceActor}. Same
 * guard enforcement as {@link serviceActor}.
 */
export function systemActor(params: SystemActorParams): SystemActor {
  const subjectId = requireNonEmptySubject(params.subjectId, "systemActor");
  return {
    actorType: "SYSTEM",
    subjectId,
    authMethod: "SYSTEM_INVARIANT",
    authorityScope: "SYSTEM",
    tenant: params.tenant ?? null,
    project: params.project ?? null,
    requestId: params.requestId ?? null,
    runId: params.runId ?? null,
    observedAt: new Date(),
    emailSnapshot: null,
    policyVersion: ACTOR_POLICY_VERSION,
    operation: null,
    credentialMethod: null,
  };
}

// ─── Authority-type gate ──────────────────────────────────────────────────────

/**
 * Asserts the actor is one of the allowed types for an operation. Use to keep
 * human-only operations (e.g. deciding a moderation appeal) closed to SERVICE
 * actors, and to keep automated-only operations closed to interactive humans.
 * Throws ForbiddenError otherwise.
 */
export function assertActorType(
  actor: TrustedActor,
  allowed: readonly ActorType[],
  operation: string
): void {
  if (!allowed.includes(actor.actorType)) {
    throw new ForbiddenError(
      `${operation} requires actor type ${allowed.join(" | ")}; got ${actor.actorType}.`
    );
  }
}

// ─── Backwards-compatible view ────────────────────────────────────────────────

/**
 * Legacy shape retained for any call site that only needs {userId, email}.
 * Prefer TrustedActor. `userId` is guaranteed non-empty (it is the actor's
 * subjectId).
 */
export interface AdminActor {
  readonly userId: string;
  readonly email: string | null;
}

/** Narrow a TrustedActor to the legacy {userId, email} view. */
export function toAdminActorView(actor: TrustedActor): AdminActor {
  return { userId: actor.subjectId, email: actor.emailSnapshot };
}
