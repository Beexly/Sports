/**
 * Actor-identity boundary for server actions ("use server" files).
 *
 * A server action is a network-invokable RPC endpoint regardless of whether
 * any current UI component calls it — the "use server" directive alone
 * exposes it. Gating must not depend on trusting caller-supplied identity
 * fields (e.g. an `actor: string` in the request body): that is exactly the
 * shape of vulnerability this module closes. The only trustworthy identity
 * source is the server-resolved session from `auth()`.
 *
 * Typed errors distinguish "no session" from "session but not admin" — both
 * from "the ledger/moderation store is unavailable" (a different failure
 * class entirely, handled by each call site's own *StoreUnavailableError).
 * Conflating these was the root cause of a prior regression: an earlier fix
 * reordered input validation before the auth check specifically to work
 * around auth() throwing an untyped error in a test environment with no
 * request scope. That masked auth failures behind whatever the validation
 * layer happened to catch first. This module's `requireAdminActor()` is
 * mockable in tests (`vi.mock("@/lib/auth")`), so callers can put the auth
 * check back FIRST, before any domain validation, which is the correct
 * order: an unauthenticated caller should never learn whether their input
 * was even well-formed.
 */
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/auth/require-admin";

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(message = "Admin role required for this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AdminActor {
  /** The session user's DB id. Empty string only if the session is malformed (id missing) — never null/undefined, so callers can persist it without a null-check. */
  readonly userId: string;
  readonly email: string | null;
}

/**
 * Resolves the caller's session and asserts ADMIN role. Throws
 * UnauthenticatedError (no session) or ForbiddenError (session, wrong role)
 * — never silently returns a partial/guest actor.
 */
export async function requireAdminActor(): Promise<AdminActor> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthenticatedError();
  }
  if (!isAdminSession(session)) {
    throw new ForbiddenError();
  }
  const userId = (session.user as { id?: string }).id ?? "";
  return { userId, email: session.user.email ?? null };
}
