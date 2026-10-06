import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fence from "@/lib/launch/internal-surface-fence";

// The route is exercised on the anonymous path, so auth resolves to null.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));

type Blocked = { error: string; reason: "internal_surface"; surface: string; hint: string };

/**
 * `internalSurfaceBlockedResponse` returns a plain object, not a Response (see
 * internal-surface-fence.ts:161). Probed rather than assumed: the first draft of
 * this test called res.json()/res.text() and failed, which is what surfaced the
 * real shape. The union below is the honest signature of the route.
 */
async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import("@/app/api/sources/catalog/route");
  const res = (await mod.GET(new Request("http://localhost/") as never)) as unknown;

  if (res instanceof Response) {
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }
  // Blocked path: the sentinel object the fence returns instead of a Response.
  return { status: 404, body: res as Blocked as unknown as Record<string, unknown> };
}

describe("source catalog is fenced (SURF-2)", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    delete process.env["SOURCES_CATALOG_PUBLIC"];
  });

  it("is dark by default and says nothing about the source stack", async () => {
    const { body } = await callRoute();
    expect(body["reason"]).toBe("internal_surface");
    expect(body["surface"]).toBe("/api/sources/catalog");

    // The doctrine names this surface: "which sources are used *and* which
    // were refused". A refusal that still echoed a provider name, an envVar, or
    // a source status would be the same leak in a quieter envelope, so the
    // assertions are on the serialized body rather than on the reason alone.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/Sleeper|Odds API|nflverse|envVar/);
    expect(serialized).not.toMatch(/permission-required|founder-gated|planned/);
  });

  it("names the founder opt-in, and that is the only key it adds", () => {
    // The hint is the documented affordance (founder debugging their own
    // deployment), so its presence is asserted, not merely tolerated.
    const { isApiRoutePublic, internalSurfaceBlockedResponse } = fence;
    const blocked = internalSurfaceBlockedResponse("/api/sources/catalog");
    expect(blocked.hint).toContain("SOURCES_CATALOG_PUBLIC");
    expect(Object.keys(blocked).sort()).toEqual(["error", "hint", "reason", "surface"]);
    expect(isApiRoutePublic("/api/sources/catalog")).toBe(false);

    process.env["SOURCES_CATALOG_PUBLIC"] = "true";
    expect(isApiRoutePublic("/api/sources/catalog")).toBe(true);
    delete process.env["SOURCES_CATALOG_PUBLIC"];
  });
});
