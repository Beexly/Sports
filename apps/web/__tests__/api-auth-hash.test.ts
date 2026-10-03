import { describe, it, expect } from "vitest";
import { sha256Hex, timingSafeHashEqual } from "@/lib/api-auth/hash";

describe("sha256Hex", () => {
  it("produces a 64-char lowercase hex digest", () => {
    const digest = sha256Hex("some-value");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input and namespace", () => {
    expect(sha256Hex("value", "ns")).toBe(sha256Hex("value", "ns"));
  });

  it("differs across namespaces for the same value", () => {
    expect(sha256Hex("value", "ns-a")).not.toBe(sha256Hex("value", "ns-b"));
  });
});

describe("timingSafeHashEqual", () => {
  it("returns true for two equal valid digests", () => {
    const digest = sha256Hex("match-me");
    expect(timingSafeHashEqual(digest, digest)).toBe(true);
  });

  it("returns false for two different valid digests", () => {
    expect(timingSafeHashEqual(sha256Hex("a"), sha256Hex("b"))).toBe(false);
  });

  it("returns false, not throws, for a too-short string", () => {
    const valid = sha256Hex("x");
    expect(() => timingSafeHashEqual(valid, "abc")).not.toThrow();
    expect(timingSafeHashEqual(valid, "abc")).toBe(false);
  });

  it("returns false, not throws, for a too-long string", () => {
    const valid = sha256Hex("x");
    expect(timingSafeHashEqual(valid, valid + "00")).toBe(false);
  });

  it("returns false, not throws, for invalid hex characters at the right length", () => {
    const valid = sha256Hex("x");
    const invalidCharsSameLength = "g".repeat(64);
    expect(() => timingSafeHashEqual(valid, invalidCharsSameLength)).not.toThrow();
    expect(timingSafeHashEqual(valid, invalidCharsSameLength)).toBe(false);
  });

  it("rejects uppercase hex even though the charset is otherwise valid", () => {
    const valid = sha256Hex("x");
    expect(timingSafeHashEqual(valid, valid.toUpperCase())).toBe(false);
  });

  it("never throws on empty strings", () => {
    expect(() => timingSafeHashEqual("", "")).not.toThrow();
    expect(timingSafeHashEqual("", "")).toBe(false);
  });

  it("never throws on non-hex garbage of arbitrary length", () => {
    expect(() => timingSafeHashEqual("not-a-hash-at-all", "also-not-one")).not.toThrow();
    expect(timingSafeHashEqual("not-a-hash-at-all", "also-not-one")).toBe(false);
  });

  it("does not silently truncate-match two different malformed strings of the same decoded length", () => {
    // Both have a non-hex char right after one valid hex pair — a naive
    // Buffer.from(str, "hex") without upfront validation would silently
    // truncate both to a 1-byte buffer (0xab), which would then compare
    // equal via timingSafeEqual despite the two 64-char inputs being
    // different strings. Strict validation must reject both before that
    // truncation can ever happen.
    const malformedA = "ab" + "g".repeat(62);
    const malformedB = "ab" + "h".repeat(62);
    expect(timingSafeHashEqual(malformedA, malformedB)).toBe(false);
  });
});
