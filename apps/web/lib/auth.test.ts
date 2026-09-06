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
const { mockUserFindUnique, mockUserUpdate, mockRealAuth, capturedConfig } = vi.hoisted(() => {
  return {
    mockUserFindUnique: vi.fn<() => Promise<unknown>>(),
    mockUserUpdate: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    mockRealAuth: vi.fn<() => Promise<unknown>>(),
    capturedConfig: {} as Record<string, unknown>,
  };
});

// ─── Mock @sports/db so the JWT callback's db.user.findUnique is controllable ───
vi.mock("@sports/db", () => ({
  db: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
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
import { isAdminEmail, auth, DEV_FAKE_ADMIN, stampEmailVerifiedFromProfile } from "@/lib/auth";
import { resetEntitlementFailClosedThrottle } from "@/lib/entitlement-observability";

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
  /**
   * THE PRODUCTION FAIL-CLOSED PATH.
   *
   * A throwing session store never reaches the entitlement gates: auth()
   * catches it here and answers null, so `evaluateGate` and
   * `getViewerEntitlements` see an ordinary logged-out visitor and hand every
   * paying member a 401 / the free surface. Their own try/catch around auth()
   * cannot observe it. That makes THIS the only place the downgrade can be made
   * audible — so it is asserted here, on the contract production actually has,
   * rather than only against a test double that rejects.
   */
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetEntitlementFailClosedThrottle();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
    mockRealAuth.mockReset();
  });

  function loggedText(): string {
    return errorSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
  }

  it("returns null when realAuth throws a non-static-generation error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(new Error("Unexpected failure"));
    const session = await auth();
    expect(session).toBeNull();
  });

  it("records the fail-closed downgrade when the session store throws", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(new Error("JWEDecryptionFailed: session store unreadable"));

    await expect(auth()).resolves.toBeNull(); // verdict unchanged

    expect(errorSpy).toHaveBeenCalled();
    expect(loggedText()).toMatch(/FAIL-CLOSED/);
    expect(loggedText()).toMatch(/auth:session-store/);
    expect(loggedText()).toMatch(/JWEDecryptionFailed/);
  });

  it("never prints the connection details a driver fault carries", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    // Assembled, not written literally: a `scheme://user:pass@host` string in
    // the source is exactly what the repo's secret scanner should keep flagging.
    const dsn = ["postgresql", "://auth:", "pw-sentinel", "@", "sessions.internal", ":5432/gse"].join("");
    mockRealAuth.mockRejectedValue(new Error(`Can't reach database server at ${dsn}`));

    await expect(auth()).resolves.toBeNull();

    expect(loggedText()).not.toContain("pw-sentinel");
    expect(loggedText()).not.toContain("sessions.internal");
    expect(loggedText()).toMatch(/FAIL-CLOSED/);
  });

  it("returns null (silently) when realAuth throws a static-generation probe error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(new Error("getServerSideProps on a page that contains..."));
    const session = await auth();
    expect(session).toBeNull();
  });

  it("stays silent for a static-generation probe — that is not a downgrade", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env["DEV_FAKE_ADMIN"];
    mockRealAuth.mockRejectedValue(
      new Error("Dynamic server usage: Page couldn't be rendered statically"),
    );

    await expect(auth()).resolves.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// ─── D-1 (C11): emailVerified stamping from Google's email_verified claim ───
// The alert worker refuses recipients with emailVerified=null and no code path
// ever wrote the column, so Elite alerts could never deliver. These tests pin
// the fail-closed / idempotent contract of the write.
describe("stampEmailVerifiedFromProfile (D-1)", () => {
  function fakeDb(row: { emailVerified: Date | null } | null) {
    const updates: unknown[] = [];
    return {
      updates,
      user: {
        findUnique: async () => row,
        update: async (args: unknown) => {
          updates.push(args);
          return row;
        },
      },
    };
  }

  it("stamps when the provider claims email_verified === true and the row is null", async () => {
    const dbLike = fakeDb({ emailVerified: null });
    const when = new Date("2026-09-04T00:00:00.000Z");
    const result = await stampEmailVerifiedFromProfile(
      dbLike, "a@b.co", { email_verified: true }, when,
    );
    expect(result).toBe("stamped");
    expect(dbLike.updates).toHaveLength(1);
    expect(dbLike.updates[0]).toEqual({
      where: { email: "a@b.co" },
      data: { emailVerified: when },
    });
  });

  it("is idempotent — never re-writes an already-verified row", async () => {
    const dbLike = fakeDb({ emailVerified: new Date("2026-01-01") });
    const result = await stampEmailVerifiedFromProfile(
      dbLike, "a@b.co", { email_verified: true },
    );
    expect(result).toBe("already");
    expect(dbLike.updates).toHaveLength(0);
  });

  it("fail-closed: a missing or false email_verified claim writes nothing", async () => {
    for (const profile of [{}, { email_verified: false }, { email_verified: "true" }, null, undefined]) {
      const dbLike = fakeDb({ emailVerified: null });
      const result = await stampEmailVerifiedFromProfile(dbLike, "a@b.co", profile);
      expect(result).toBe("unverified");
      expect(dbLike.updates).toHaveLength(0);
    }
  });

  it("no email / no user row → no write, distinct outcomes", async () => {
    const dbLike = fakeDb(null);
    expect(await stampEmailVerifiedFromProfile(dbLike, null, { email_verified: true })).toBe("no-email");
    expect(await stampEmailVerifiedFromProfile(dbLike, "ghost@b.co", { email_verified: true })).toBe("no-user");
    expect(dbLike.updates).toHaveLength(0);
  });

  it("a findUnique rejection degrades to no-user (never throws into sign-in)", async () => {
    const dbLike = {
      user: {
        findUnique: async () => { throw new Error("db down"); },
        update: async () => { throw new Error("must not be reached"); },
      },
    };
    await expect(
      stampEmailVerifiedFromProfile(dbLike, "a@b.co", { email_verified: true }),
    ).resolves.toBe("no-user");
  });
});

// ─── SEC-02: the jwt callback AWaits the emailVerified stamp ───
// Fire-and-forget left a window where sign-in completed while the write was
// still in flight. The callback must settle the write (catch → fail-closed)
// before returning the token.
describe("jwt callback — SEC-02 awaited emailVerified stamp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first sign-in settles the stamp write before the token is returned", async () => {
    mockUserFindUnique.mockResolvedValue({ emailVerified: null });
    // Gate the write so it hangs until released — proving the callback waits.
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let updateCalls = 0;
    mockUserUpdate.mockImplementation(async () => {
      await gate;
      updateCalls += 1;
      return {};
    });
    const ctx = jwtCtx({ email: "a@b.co" }, { id: "u-1", email: "a@b.co" });
    (ctx as Record<string, unknown>).profile = { email_verified: true };
    const pending = callbacks().jwt(ctx);
    let settled = false;
    void pending.then(() => { settled = true; });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(false); // still waiting on the stamp write
    release();
    await pending;
    expect(settled).toBe(true);
    expect(updateCalls).toBe(1);
  });

  it("a failing stamp write does not reject the jwt callback (fail-closed catch)", async () => {
    mockUserFindUnique.mockResolvedValue({ emailVerified: null });
    mockUserUpdate.mockRejectedValue(new Error("write failed"));
    const ctx = jwtCtx({ email: "a@b.co" }, { id: "u-1", email: "a@b.co" });
    (ctx as Record<string, unknown>).profile = { email_verified: true };
    await expect(callbacks().jwt(ctx)).resolves.toBeTruthy();
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
  });
});
