/**
 * The waitlist Basic-Auth gate must compare credentials without short-circuiting.
 *
 * THE BUG
 * -------
 * `lib/waitlist/access-gate.ts` did:
 *
 *     // Constant-time-ish comparison: compare both fields before short-circuiting.
 *     const userMatch = user === expectedUser;
 *     const passMatch = pass === expectedPass;
 *
 * Evaluating both fields before branching removes the field-ORDER leak only.
 * String `===` still short-circuits at the first differing byte, so the time it
 * takes is a function of how many leading bytes the attacker guessed right —
 * exactly the signal a byte-at-a-time guessing attack needs. The comment
 * asserted a security property the code did not have, which is worse than no
 * comment: it stops the next reader from looking.
 *
 * THE FIX
 * -------
 * Both fields go through `constantTimeStringEqual` (lib/api-auth/constant-time.ts),
 * the Edge-runtime twin of `node:crypto`'s `timingSafeEqual` — the gate is
 * called from `middleware.ts`, which runs on the Edge runtime and has no
 * `node:crypto`, so `lib/b2b/api-key-auth.ts`'s `constantTimeEquals` and
 * `lib/cron/authorize.ts`'s `safeEqualSecret` are not importable here.
 *
 * Timing is not asserted by wall clock (that flakes under CI contention). The
 * runtime assertions are: the shared comparator is actually CALLED with both
 * fields, and the gate source no longer compares a credential with `===` nor
 * claims a property it lacks. apps/web/tsconfig.json excludes ** / *.test.ts,
 * so a type-level assertion here would prove nothing — these all run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Spy that delegates to the real implementation, so behaviour is unchanged and
// "is this code path used?" becomes a runtime fact rather than a code reading.
const { compareSpy } = vi.hoisted(() => ({ compareSpy: vi.fn() }));

vi.mock("@/lib/api-auth/constant-time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth/constant-time")>();
  compareSpy.mockImplementation(actual.constantTimeStringEqual);
  return { ...actual, constantTimeStringEqual: compareSpy };
});

import { checkWaitlistGate } from "@/lib/waitlist/access-gate";
import { constantTimeStringEqual } from "@/lib/api-auth/constant-time";

const GATE_SOURCE = resolve(__dirname, "..", "lib", "waitlist", "access-gate.ts");

function basicAuthHeader(user: string, pass: string): string {
  return "Basic " + btoa(`${user}:${pass}`);
}

describe("constantTimeStringEqual — correctness", () => {
  it("is true only for identical strings", () => {
    expect(constantTimeStringEqual("hunter2", "hunter2")).toBe(true);
    expect(constantTimeStringEqual("", "")).toBe(true);
    expect(constantTimeStringEqual("hunter2", "hunter3")).toBe(false);
  });

  it("rejects a difference at the FIRST byte and at the LAST byte alike", () => {
    // Both must be false; the point of the primitive is that they also cost the
    // same, which `===` does not.
    expect(constantTimeStringEqual("aaaaaaaa", "baaaaaaa")).toBe(false);
    expect(constantTimeStringEqual("aaaaaaaa", "aaaaaaab")).toBe(false);
  });

  it("returns false on a length mismatch instead of throwing or matching a prefix", () => {
    expect(constantTimeStringEqual("secret", "secretsauce")).toBe(false);
    expect(constantTimeStringEqual("secretsauce", "secret")).toBe(false);
    expect(constantTimeStringEqual("", "x")).toBe(false);
  });

  it("compares BYTES, not UTF-16 code units", () => {
    // "é" is 2 UTF-8 bytes; a naive per-char loop would mis-handle astral pairs.
    expect(constantTimeStringEqual("café", "café")).toBe(true);
    expect(constantTimeStringEqual("café", "cafe")).toBe(false);
    expect(constantTimeStringEqual("🎯x", "🎯x")).toBe(true);
    expect(constantTimeStringEqual("🎯x", "🎯y")).toBe(false);
  });

  it("never treats a missing credential as equal to a missing expectation", () => {
    expect(constantTimeStringEqual(null, null)).toBe(false);
    expect(constantTimeStringEqual(undefined, undefined)).toBe(false);
    expect(constantTimeStringEqual(null, "x")).toBe(false);
    expect(constantTimeStringEqual("x", undefined)).toBe(false);
  });
});

describe("checkWaitlistGate — routes both credentials through the constant-time path", () => {
  beforeEach(() => {
    compareSpy.mockClear();
    process.env["GSE_WAITLIST_GATE_ENABLED"] = "true";
    process.env["GSE_WAITLIST_BASIC_FORCE"] = "true";
    process.env["GSE_WAITLIST_BASIC_USER"] = "testuser";
    process.env["GSE_WAITLIST_BASIC_PASSWORD"] = "testpass";
  });

  afterEach(() => {
    delete process.env["GSE_WAITLIST_GATE_ENABLED"];
    delete process.env["GSE_WAITLIST_BASIC_FORCE"];
    delete process.env["GSE_WAITLIST_BASIC_USER"];
    delete process.env["GSE_WAITLIST_BASIC_PASSWORD"];
  });

  it("calls the shared comparator for BOTH the user and the password", () => {
    expect(checkWaitlistGate(basicAuthHeader("testuser", "testpass")).allowed).toBe(true);
    expect(compareSpy).toHaveBeenCalledTimes(2);
    expect(compareSpy).toHaveBeenCalledWith("testuser", "testuser");
    expect(compareSpy).toHaveBeenCalledWith("testpass", "testpass");
  });

  it("still evaluates BOTH fields when the username is already wrong (no field-order leak)", () => {
    expect(checkWaitlistGate(basicAuthHeader("nope", "testpass")).allowed).toBe(false);
    expect(compareSpy).toHaveBeenCalledTimes(2);
    expect(compareSpy).toHaveBeenCalledWith("nope", "testuser");
    expect(compareSpy).toHaveBeenCalledWith("testpass", "testpass");
  });

  it("denies a near-miss password that shares every byte but the last", () => {
    const result = checkWaitlistGate(basicAuthHeader("testuser", "testpasS"));
    expect(result).toEqual({ allowed: false, reason: "wrong_credentials" });
  });

  it("denies a password that is a strict prefix of the real one", () => {
    expect(checkWaitlistGate(basicAuthHeader("testuser", "testpas")).allowed).toBe(false);
  });
});

describe("access-gate source no longer claims a property it lacks", () => {
  const src = readFileSync(GATE_SOURCE, "utf8");

  it("does not compare a credential with === or !==", () => {
    expect(src).not.toMatch(/user\s*[!=]==\s*expectedUser/);
    expect(src).not.toMatch(/pass\s*[!=]==\s*expectedPass/);
  });

  it("dropped the old 'constant-time-ish' claim and names the real primitive", () => {
    // The exact line that asserted the property the code lacked.
    expect(src).not.toMatch(
      /Constant-time-ish comparison: compare both fields before short-circuiting/i,
    );
    expect(src).toContain("constantTimeStringEqual");
  });

  it("imports the Edge-safe comparator, not node:crypto (middleware runs on Edge)", () => {
    // Prose may reference node:crypto; an IMPORT of it would break the edge
    // bundle, since middleware.ts pulls this module in.
    const IMPORTS_NODE_CRYPTO = /(?:from\s*|require\()\s*["']node:crypto["']/;
    expect(src).toContain("@/lib/api-auth/constant-time");
    expect(src).not.toMatch(IMPORTS_NODE_CRYPTO);
    const primitive = readFileSync(
      resolve(__dirname, "..", "lib", "api-auth", "constant-time.ts"),
      "utf8",
    );
    expect(primitive).not.toMatch(IMPORTS_NODE_CRYPTO);
  });
});
