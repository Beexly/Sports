import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
  buildBroadcast: vi.fn(),
  generateWeeklyBrief: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/fantasy/host", () => ({ buildBroadcast: mocks.buildBroadcast }));
vi.mock("@/lib/fantasy/studio", () => ({ generateWeeklyBrief: mocks.generateWeeklyBrief }));
vi.mock("@/components/fantasy/fantasy-shell", () => ({
  FantasyShell: () => null,
}));
vi.mock("@/components/fantasy/studio-host", () => ({ StudioHost: () => null }));
vi.mock("@/components/fantasy/studio-brief", () => ({ StudioBrief: () => null }));

import StudioPage from "@/app/fantasy/studio/page";

const REDIRECT = new Error("NEXT_REDIRECT");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation(() => {
    throw REDIRECT;
  });
});

describe("fantasy studio access", () => {
  it("redirects an anonymous viewer before illustrative content is built", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(StudioPage()).rejects.toBe(REDIRECT);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=/fantasy/studio",
    );
    expect(mocks.buildBroadcast).not.toHaveBeenCalled();
  });

  it("redirects a signed-in non-admin before illustrative content is built", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "USER" } });
    await expect(StudioPage()).rejects.toBe(REDIRECT);
    expect(mocks.redirect).toHaveBeenCalledWith("/");
    expect(mocks.buildBroadcast).not.toHaveBeenCalled();
  });

  it("builds the internal draft only for an admin session", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "ADMIN" } });
    mocks.buildBroadcast.mockReturnValue({ segments: [] });
    mocks.generateWeeklyBrief.mockReturnValue({ sections: [] });
    await expect(StudioPage()).resolves.toBeDefined();
    expect(mocks.buildBroadcast).toHaveBeenCalledOnce();
    expect(mocks.generateWeeklyBrief).toHaveBeenCalledOnce();
  });
});
