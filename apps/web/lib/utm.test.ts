import { describe, expect, it } from "vitest";
import { buildVaultSourceHref } from "./utm";

describe("Vault source links", () => {
  it("builds a contextual Vault href with source attribution", () => {
    expect(buildVaultSourceHref("loss-room")).toBe("/vault?source=loss-room");
  });

  it("URL-encodes source values", () => {
    expect(buildVaultSourceHref("model journal")).toBe(
      "/vault?source=model+journal",
    );
  });
});
