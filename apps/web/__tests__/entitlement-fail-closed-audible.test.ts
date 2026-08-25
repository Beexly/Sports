import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: a fail-CLOSED entitlement downgrade must be audible.
 *
 * Failing closed to FREE is the correct posture and is unchanged here. What was
 * wrong is that it happened in TOTAL SILENCE at four separate call sites, so an
 * infrastructure fault (Postgres unreachable, Auth.js throwing) was
 * indistinguishable from a genuine free-tier reader. A DB outage therefore
 * served the free surface to the entire paying membership — 401s from the API
 * gate, teaser boards from the page gate — with nothing at all in the logs to
 * explain the support wave.
 *
 * Every test here drives the underlying operation to REJECT and asserts the
 * failure is RECORDED. "Returns FREE" alone would pass against the broken code
 * and prove nothing.
 */

const findFirstMock = vi.fn();
const authMock = vi.fn();

vi.mock("@sports/db", () => ({
  db: { subscription: { findFirst: (...a: unknown[]) => findFirstMock(...a) } },
}));

vi.mock("@/lib/auth", () => ({
  auth: (...a: unknown[]) => authMock(...a),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  consumeRateLimit: () => ({ ok: true, retryAfterSec: 0 }),
}));

import { getUserEntitlements } from "@/lib/entitlements";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { requirePremiumApi } from "@/lib/api-entitlement";

/** P1001 is the code `getUserEntitlements` classifies as "database unreachable". */
const DB_UNREACHABLE = Object.assign(
  new Error("Can't reach database server at db:5432"),
  { code: "P1001" },
);
/** Any OTHER failure is rethrown by getUserEntitlements and caught by its callers. */
const OTHER_DB_FAULT = new Error("Timed out fetching a new connection from the pool");
const AUTH_BROKEN = new Error("JWEDecryptionFailed: session store unreadable");

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  findFirstMock.mockReset();
  authMock.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function loggedText(): string {
  return errorSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
}

describe("getUserEntitlements", () => {
  it("logs the FAIL-CLOSED downgrade when the database is unreachable", async () => {
    findFirstMock.mockRejectedValue(DB_UNREACHABLE);

    const entitlements = await getUserEntitlements("user_paying");

    expect(entitlements.tier).toBe("FREE"); // verdict unchanged
    expect(errorSpy).toHaveBeenCalled();
    expect(loggedText()).toMatch(/FAIL-CLOSED/);
    expect(loggedText()).toMatch(/getUserEntitlements/);
    expect(loggedText()).toMatch(/user_paying/);
    expect(loggedText()).toMatch(/Can't reach database server/);
  });

  it("stays silent for a genuine free-tier user (no row, no error)", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getUserEntitlements("user_free")).resolves.toMatchObject({ tier: "FREE" });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("stays silent for a paying member", async () => {
    findFirstMock.mockResolvedValue({ tier: "ELITE" });

    await expect(getUserEntitlements("user_elite")).resolves.toMatchObject({ tier: "ELITE" });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("getViewerEntitlements (page gate)", () => {
  it("logs when auth() throws and the viewer is downgraded to anonymous FREE", async () => {
    authMock.mockRejectedValue(AUTH_BROKEN);

    const entitlements = await getViewerEntitlements();

    expect(entitlements.tier).toBe("FREE");
    expect(loggedText()).toMatch(/FAIL-CLOSED/);
    expect(loggedText()).toMatch(/tier-access:auth/);
    expect(loggedText()).toMatch(/JWEDecryptionFailed/);
  });

  it("logs when the entitlement lookup throws for a signed-in viewer", async () => {
    authMock.mockResolvedValue({ user: { id: "user_pro" } });
    findFirstMock.mockRejectedValue(OTHER_DB_FAULT);

    const entitlements = await getViewerEntitlements();

    expect(entitlements.tier).toBe("FREE");
    expect(loggedText()).toMatch(/tier-access:entitlements/);
    expect(loggedText()).toMatch(/user_pro/);
    expect(loggedText()).toMatch(/Timed out fetching a new connection/);
  });

  it("stays silent for an ordinary anonymous visitor", async () => {
    authMock.mockResolvedValue(null);

    await expect(getViewerEntitlements()).resolves.toMatchObject({ tier: "FREE" });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("requirePremiumApi (API gate)", () => {
  it("logs when auth() throws before answering 401", async () => {
    authMock.mockRejectedValue(AUTH_BROKEN);

    const denied = await requirePremiumApi();

    expect(denied?.status).toBe(401); // fail-closed verdict unchanged
    expect(loggedText()).toMatch(/api-entitlement:auth/);
    expect(loggedText()).toMatch(/JWEDecryptionFailed/);
  });

  it("logs when the entitlement lookup throws before answering 403", async () => {
    authMock.mockResolvedValue({ user: { id: "user_pro" } });
    findFirstMock.mockRejectedValue(OTHER_DB_FAULT);

    const denied = await requirePremiumApi();

    expect(denied?.status).toBe(403);
    expect(loggedText()).toMatch(/api-entitlement:gate/);
    expect(loggedText()).toMatch(/user_pro/);
  });

  it("stays silent when a genuine FREE user is denied on policy", async () => {
    authMock.mockResolvedValue({ user: { id: "user_free" } });
    findFirstMock.mockResolvedValue(null);

    const denied = await requirePremiumApi();

    expect(denied?.status).toBe(403);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("grants a PRO member and logs nothing", async () => {
    authMock.mockResolvedValue({ user: { id: "user_pro" } });
    findFirstMock.mockResolvedValue({ tier: "PRO" });

    await expect(requirePremiumApi()).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
