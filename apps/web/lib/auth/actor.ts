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
 */
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/require-admin";

/** Bump when the actor contract or its authority semantics change. */
export const ACTOR_POLICY_VERSION = "1a" as const;

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
}

export interface SystemActor extends BaseActor {
  readonly actorType: "SYSTEM";
  readonly authMethod: "SYSTEM_INVARIANT";
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

// ─── SERVICE / SYSTEM actor minting (background/non-interactive) ──────────────

export interface ServiceActorParams extends AuditContext {
  /** Stable governed service identity, e.g. "service:pick-generation". */
  readonly subjectId: string;
  readonly emailSnapshot?: string | null;
}

/**
 * Mints a governed SERVICE actor for background/non-interactive server code
 * (workers, cron). This is NOT reachable across the "use server" RPC boundary:
 * only trusted server modules import and call it, so the subjectId is governed,
 * not caller-supplied. Throws InvalidActorError on an empty subjectId.
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
  };
}

export interface SystemActorParams extends AuditContext {
  /** Stable system identity, e.g. "system:invariant-sweep". */
  readonly subjectId: string;
}

/**
 * Mints a SYSTEM actor for invariant/automated paths that act on behalf of no
 * human and no external service. Same trust properties as serviceActor().
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
