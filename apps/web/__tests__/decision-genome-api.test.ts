import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Route is ADMIN-gated (lib/auth/require-admin). Mock the session for the happy path,
// and assert the gate fires (403) for non-admins.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/decision-genome/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/decision-genome", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
  });
  afterEach(() => {
    authMock.mockReset();
  });

  it("returns the illustrative Decision Genome spine end-to-end for admins", async () => {
    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    expect(body["label"]).toBe("illustrative");

    const data = body["data"] as Record<string, unknown>;
    const decisions = data["decisions"] as Array<Record<string, unknown>>;
    expect(decisions.length).toBeGreaterThanOrEqual(3);

    // Every decision carries an aperture verdict and stays shadow (never priced).
    for (const d of decisions) {
      expect(d["aperture"]).toBeTruthy();
      expect(d["priced"]).toBe(false);
    }

    // The denominator summary is present and consistent.
    const denom = data["denominator"] as Record<string, unknown>;
    expect(denom["total"]).toBe(decisions.length);
  });

  it("rejects non-admin callers with 403", async () => {
    authMock.mockResolvedValue(null);
    const { status, body } = await callRoute();
    expect(status).toBe(403);
    expect(body["success"]).toBeUndefined();
  });
});
