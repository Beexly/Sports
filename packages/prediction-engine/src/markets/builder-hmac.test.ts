import { describe, expect, it } from "vitest";
import { builderHmacSignature } from "./builder-hmac.js";

describe("builder hmac", () => {
  it("matches the MIT py-sdk vector and does not print a live key", () => {
    expect(builderHmacSignature("dGVzdC1zZWNyZXQta2V5ISE", 1700000000, "POST", "/order", "{}")).toBe(
      "LkTJvnKgvjeM6QZCq3mMps-FuPuJilYLylZOE3qqnYI=",
    );
  });
});
