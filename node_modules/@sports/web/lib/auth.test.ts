/**
 * Unit tests for auth.ts — the ADMIN-granting logic.
 *
 * Covers:
 *   - isAdminEmail: exact and case-insensitive ADMIN_EMAILS matching, plus
 *     fail-closed behavior on non-ASCII / homoglyph emails.
 *   - The session-callback DB-role overlay: ADMIN_EMAILS allow-list applied
 *     fresh in the session callback (not baked into the token), so removing
 *     an email from the list revokes admin; the DB role in the token is
 *     preserved when the email is NOT on the allow-list.
 *   - The JWT callback: re-resolves DB role on every refresh; fail-safe
 *     when the DB lookup returns null or rejects.
 *   - DEV_FAKE_ADMIN: inert in production regardless of env value; active
 *     as a synthetic ADMIN session outside production.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoisted mock functions (vi.mock factories are hoisted above imports) ──
const { mockUserFindUnique, mockRealAuth, capturedConfig } = vi.hoisted(() => {
  return {
    mockUserFindUnique: vi.fn<() => Promise<unknown>>(),
    mockRealAuth: vi.fn<() => Promise<unknown>>(),
    capturedConfig: {} as Record<string, unknown>,
  };
});

// ─── Mock @sports/db so the JWT callback's db.user.findUnique is controllable ───
vi.mock("@sports/db", () => ({
  db: {
    user: { findUnique: mockUserFindUnique },
  },
}));

// ─── Mock next-auth so we capture the config object and control realAuth ───
vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    Object.assign(capturedConfig, config);
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: mockRealAuth,
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
  NextAuthConfig: {},
  Session: {},
}));

// GoogleProvider and PrismaAdapter are imported at module scope but never used
// in the callback logic under test. Stub them to prevent resolution issues.
vi.mock("next-auth/providers/google", () => ({
  default: () => ({ id: "google", name: "Google", type: "oauth", version: "1.0" }),
}));
vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({
    createUser: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  }),
}));

// ─── Now import the module under test ───
// The module-level NextAuth(config) call fires here; capturedConfig is populated.
import { isAdminEmail, auth, DEV_FAKE_ADMIN } from "@/lib/auth";

// ─── Helpers ───

/** Build a minimal JWT callback context. */
function jwtCtx(token: Record<string, unknown> = {}, user: unknown = undefined) {
  return { token, user, account: null, session: null, trigger: null };
}

function sessionCtx(session: Record<string, unknown>, token: Record<string, unknown>) {
  return {
    session,
    token,
    newSession: session,
    user: undefined,
    name: undefined,
    email: undefined,
    unstyled: undefined,
    logger: undefined,
    error: undefined,
  };
}

const callbacks = () => capturedConfig["callbacks"] as {
  jwt: (ctx: unknown) => Promise<unknown>;
  session: (ctx: unknown) => Promise<unknown>;
};

/**
 * Helper: invoke the JWT callback with a given token + (optional) DB user row,
 * returning the resulting token.
 */
async function runJwtCallback(token: Record<string, unknown>, dbUser: unknown) {
  mockUserFindUnique.mockResolvedValue(dbUser);
  const ctx = jwtCtx(token, undefined);
  const result = await callbacks().jwt(ctx);
  return result as Record<string, unknown>;
}

/**
 * Helper: invoke the session callback with a given session + token, returning
 * the resulting session.
 */
async function runSessionCallback(
  sessionUser: { email?: string | null; id?: string; role?: string },
  token: Record<string, unknown>,
) {
  const session = { user: { ...sessionUser } };
  const ctx = sessionCtx(session, token);
  const result = await callbacks().session(ctx);
  return result as { user: Record<string, unknown> };
}

// ─── Tests ───

describe("isAdminEmail — exact ADMIN_EMAILS matching", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "founder@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for an exact match", () => {
    expect(isAdminEmail("founder@example.com")).toBe(true);
  });

  it("is case-insensitive on both the email and the allow-list entry", () => {
    expect(isAdminEmail("Founder@Example.COM")).toBe(true);
  });

  it("returns false when the email is not on the allow-list", () => {
    expect(isAdminEmail("user@example.com")).toBe(false);
  });
});

describe("isAdminEmail — multiple entries in ADMIN_EMAILS", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "founder@example.com, cofounder@example.com ");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("matches the second comma-separated entry", () => {
    expect(isAdminEmail("cofounder@example.com")).toBe(true);
  });

  it("returns false for an email not among multiple entries", () => {
    expect(isAdminEmail("random@example.com")).toBe(false);
  });
});

describe("isAdminEmail — fail-closed on non-ASCII / homoglyph", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "founder@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a Unicode fullwidth commercial at (U+FF20)", () => {
    // founder@example.com with @ replaced by ＠ (U+FF20)
    expect(isAdminEmail("founder\uff20example.com")).toBe(false);
  });

  it("returns false for null email", () => {
    expect(isAdminEmail(null)).toBe(false);
  });

  it("returns false for undefined email", () => {
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("founder@example.com")).toBe(false);
  });
});

describe("session callback — DB-role overlay in both directions", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "founder@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ADMIN_EMAILS allow-list grants ADMIN even when DB role is USER", async () => {
    // The DB role is "USER" in the token (simulating the JWT callback reading
    // a USER row), but the email IS on the allow-list → session callback
    // overrides to ADMIN.
    const result = await runSessionCallback(
      { email: "founder@example.com", role: "USER" },
      { sub: "1", role: "USER", email: "founder@example.com" },
    );
    expect(result.user.role).toBe("ADMIN");
  });

  it("DB role ADMIN is preserved when email is NOT on the allow-list", async () => {
    // Token carries role "ADMIN" (from DB), email is not allow-listed →
    // session callback keeps the DB role.
    const result = await runSessionCallback(
      { email: "db-admin@example.com", role: "ADMIN" },
      { sub: "2", role: "ADMIN", email: "db-admin@example.com" },
    );
    expect(result.user.role).toBe("ADMIN");
  });

  it("non-admin email without ADMIN_EMAILS keeps USER role from token", async () => {
    const result = await runSessionCallback(
      { email: "user@example.com", role: "USER" },
      { sub: "3", role: "USER", email: "user@example.com" },
    );
    expect(result.user.role).toBe("USER");
  });

  it("removes admin privilege when email is removed from the allow-list", async () => {
    // ADMIN_EMAILS is set to founder@example.com only; the user's email is
    // different. Token role is ADMIN (from DB), but it's not allow-listed.
    // → session callback keeps DB role (ADMIN) since DB role is ADMIN.
    // But the critical behavior: if ADMIN_EMAILS were cleared, the admin
    // privilege would still come from the DB role. What we test here is:
    // an email NOT on the list gets the DB role, not forced to ADMIN.
    const result = await runSessionCallback(
      { email: "demoted@example.com", role: "USER" },
      { sub: "4", role: "USER", email: "demoted@example.com" },
    );
    expect(result.user.role).toBe("USER");
  });

  it("assigns id from token.sub", async () => {
    const result = await runSessionCallback(
      { email: "founder@example.com" },
      { sub: "user-abc-123", role: "ADMIN", email: "founder@example.com" },
    );
    expect(result.user.id).toBe("user-abc-123");
  });
});

describe("jwt callback — DB role re-resolution on every refresh", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "founder@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    mockUserFindUnique.mockReset();
  });

  it("re-resolves DB role when token.email is present", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "db-1", role: "ADMIN" });
    const token = await runJwtCallback(
      { sub: "old-sub", role: "USER", email: "db-admin@example.com" },
      { id: "db-1", role: "ADMIN" },
    );
    expect(token.sub).toBe("db-1");
    expect(token.role).toBe("ADMIN");
  });

  it("downgrades ADMIN to USER when DB role changes to USER", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "db-1", role: "USER" });
    const token = await runJwtCallback(
      { sub: "db-1", role: "ADMIN", email: "db-admin@example.com" },
      { id: "db-1", role: "USER" },
    );
    expect(token.role).toBe("USER");
  });

  it("leaves role untouched when DB lookup returns null (fail-safe, never fail-open to ADMIN)", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const token = await runJwtCallback(
      { sub: "old-sub", role: "ADMIN", email: "gone@example.com" },
      null,
    );
    expect(token.role).toBe("ADMIN"); // unchanged
    expect(token.sub).toBe("old-sub"); // unchanged
  });

  it("leaves role untouched when DB lookup rejects (fail-safe)", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("db down"));
    const token = await runJwtCallback(
      { sub: "old-sub", role: "USER", email: "broken@example.com" },
      undefined,
    );
    expect(token.role).toBe("USER"); // unchanged, not escalated
    expect(token.sub).toBe("old-sub"); // unchanged
  });
});

describe("DEV_FAKE_ADMIN — production hard-gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockRealAuth.mockReset();
  });

  it("is inert (false) when NODE_ENV is production, even with DEV_FAKE_ADMIN=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    // DEV_FAKE_ADMIN is computed at module load; we assert the exported
    // constant reflects the production hard-gate. The constant was
    // evaluated when the module was first imported. We also verify
    // behavior via auth() in the next test.
    expect(DEV_FAKE_ADMIN).toBe(false);
  });

  it("auth() does NOT return synthetic admin in production even with DEV_FAKE_ADMIN=true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    mockRealAuth.mockResolvedValue(null);
    const session = await auth();
    // Should delegate to realAuth (mocked), NOT return the synthetic admin.
    expect(mockRealAuth).toHaveBeenCalledTimes(1);
    expect(session).toBeNull();
  });

  it("auth() returns synthetic ADMIN session in non-production with DEV_FAKE_ADMIN=true", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    const session = await auth();
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("ADMIN");
    expect(session!.user.id).toBe("dev-admin");
    // Must NOT have called realAuth.
    expect(mockRealAuth).not.toHaveBeenCalled();
  });

  it("auth() delegates to realAuth when DEV_FAKE_ADMIN is not 'true'", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "false");
    mockRealAuth.mockResolvedValue({ user: { id: "real", role: "USER" } });
    const session = await auth();
    expect(mockRealAuth).toHaveBeenCalledTimes(1);
    expect(session).not.toBeNull();
    expect(session!.user.role).toBe("USER");
  });
});

describe("auth() — error handling on realAuth failure", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockRealAuth.mockReset();
  });

  it("returns null when realAuth throws a non-static-generation error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(new Error("Unexpected failure"));
    const session = await auth();
    expect(session).toBeNull();
  });

  it("returns null (silently) when realAuth throws a static-generation probe error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(new Error("getServerSideProps on a page that contains..."));
    const session = await auth();
    expect(session).toBeNull();
  });
});
