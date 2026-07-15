import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  fantasyGateDestination,
  isPublicFantasyToolPath,
} from "@/lib/fantasy/public-gate";

describe("public fantasy data gate", () => {
  it.each([
    "/fantasy/draft",
    "/fantasy/bestball",
    "/fantasy/connect",
    "/fantasy/dfs",
    "/fantasy/trade",
    "/fantasy/waivers",
    "/fantasy/new-future-tool",
    "/optimizer",
  ])("classifies %s as publicly gated", (pathname) => {
    expect(isPublicFantasyToolPath(pathname)).toBe(true);
  });

  it.each(["/fantasy", "/fantasy/studio", "/fantasy/studio/review", "/picks"])(
    "does not intercept %s",
    (pathname) => {
      expect(isPublicFantasyToolPath(pathname)).toBe(false);
    },
  );

  it("encodes the requested path without creating a legacy tool redirect loop", () => {
    expect(fantasyGateDestination("/fantasy/draft")).toBe(
      "/fantasy?from=%2Ffantasy%2Fdraft",
    );
  });

  it.each(["/fantasy/draft", "/fantasy/props", "/optimizer"])(
    "redirects %s before the tool page runs",
    (pathname) => {
      const response = middleware(new NextRequest(`https://gse.test${pathname}`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `https://gse.test${fantasyGateDestination(pathname)}`,
      );
    },
  );

  it("leaves the public gate page reachable", () => {
    const response = middleware(new NextRequest("https://gse.test/fantasy"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
