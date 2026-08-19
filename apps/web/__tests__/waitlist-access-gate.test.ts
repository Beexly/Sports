import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkWaitlistGate } from "@/lib/waitlist/access-gate";
import {
  BACKTEST_TRUTH,
  ALL_WAITLIST_COPY_STRINGS,
} from "@/lib/gse/waitlist-copy";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helper: build a valid Basic Auth header
// ---------------------------------------------------------------------------
function basicAuthHeader(user: string, pass: string): string {
  return "Basic " + btoa(`${user}:${pass}`);
}

// ---------------------------------------------------------------------------
// Access gate unit tests
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

describe("checkWaitlistGate — gate disabled", () => {
  beforeEach(() => {
    delete process.env["GSE_WAITLIST_GATE_ENABLED"];
    delete process.env["GSE_WAITLIST_BASIC_USER"];
    delete process.env["GSE_WAITLIST_BASIC_PASSWORD"];
  });

  it("allows any request when gate env var is absent", () => {
    const result = checkWaitlistGate(null);
    expect(result.allowed).toBe(true);
  });

  it("allows any request when gate env var is 'false'", () => {
    process.env["GSE_WAITLIST_GATE_ENABLED"] = "false";
    const result = checkWaitlistGate(null);
    expect(result.allowed).toBe(true);
  });

  it("allows request with no Authorization header when disabled", () => {
    const result = checkWaitlistGate(null);
    expect(result.allowed).toBe(true);
  });
});

/**
 * The lock is a TWO-flag design. `checkWaitlistGate` delegates to
 * `waitlistGated()` (lib/env/flags.ts:28), which requires
 * GSE_WAITLIST_GATE_ENABLED *and* GSE_WAITLIST_BASIC_FORCE to both be "true":
 * "legacy single-flag true (gate without FORCE) stays OPEN so FOUNDING ships
 * without a Vercel env click. Intentional lock requires the second flag."
 *
 * This block set only the first flag, so the gate was correctly OPEN and all
 * five deny assertions failed. That reads like a fail-open auth bug and is not
 * one — the gate's own deny paths are all correct, including the unconfigured
 * -credentials case. Both flags are now set, and the single-flag-stays-open
 * invariant gets its own block below, since nothing covered it before.
 */
describe("checkWaitlistGate — gate enabled", () => {
  beforeEach(() => {
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

  it("denies request with no Authorization header", () => {
    const result = checkWaitlistGate(null);
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe(
      "missing_credentials"
    );
  });

  it("denies request with non-Basic Authorization header", () => {
    const result = checkWaitlistGate("Bearer some-token");
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe(
      "missing_credentials"
    );
  });

  it("denies request with wrong credentials", () => {
    const result = checkWaitlistGate(basicAuthHeader("testuser", "wrongpass"));
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe(
      "wrong_credentials"
    );
  });

  it("denies request with wrong username", () => {
    const result = checkWaitlistGate(basicAuthHeader("wronguser", "testpass"));
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe(
      "wrong_credentials"
    );
  });

  it("allows request with correct credentials", () => {
    const result = checkWaitlistGate(basicAuthHeader("testuser", "testpass"));
    expect(result.allowed).toBe(true);
  });

  it("allows password containing colon", () => {
    process.env["GSE_WAITLIST_BASIC_PASSWORD"] = "p:a:s:s";
    const result = checkWaitlistGate(basicAuthHeader("testuser", "p:a:s:s"));
    expect(result.allowed).toBe(true);
  });

  it("denies when gate is enabled but credentials env vars are missing (fail-closed)", () => {
    delete process.env["GSE_WAITLIST_BASIC_USER"];
    delete process.env["GSE_WAITLIST_BASIC_PASSWORD"];
    const result = checkWaitlistGate(basicAuthHeader("testuser", "testpass"));
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe(
      "gate_not_configured"
    );
  });
});

// ---------------------------------------------------------------------------
// No positive performance claims guard
// ---------------------------------------------------------------------------

describe("no-claim guard: BACKTEST_TRUTH preserves beatsNaive === false", () => {
  it("BACKTEST_TRUTH.beatsNaive is false in source module", () => {
    expect(BACKTEST_TRUTH.beatsNaive).toBe(false);
  });
});

describe("no-claim guard: waitlist copy contains no positive performance claims", () => {
  const BANNED_PATTERNS = [
    // Positive claim: "beats naive" — NOT matched by "did not beat naive" (negative lookbehind)
    /(?<!not )\bbeats? (?:the )?naive\b/i,
    /we (win|beat|outperform)/i,
    /guaranteed/i,
    /\b5[2-9]\.\d+%/,  // 52.x%–59.x% win-rate claims
    /\b6\d\.\d+%/,     // 60%+ claims
    /profitable/i,
    /positive (ROI|return)/i,
  ];

  it("no copy string matches a positive performance claim pattern", () => {
    for (const line of ALL_WAITLIST_COPY_STRINGS) {
      for (const pattern of BANNED_PATTERNS) {
        expect(line).not.toMatch(pattern);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Credentials never appear in client bundle paths
// ---------------------------------------------------------------------------

describe("access-gate credentials never reach client code", () => {
  it("access-gate.ts does not reference NEXT_PUBLIC_ prefixed names", () => {
    const src = readFileSync(
      resolve(REPO_ROOT, "apps/web/lib/waitlist/access-gate.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
  });

  it("middleware.ts does not embed credential values or NEXT_PUBLIC_ names", () => {
    const src = readFileSync(
      resolve(REPO_ROOT, "apps/web/middleware.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/NEXT_PUBLIC_/);
    // Should only reference the env var names, not raw credential values
    expect(src).not.toMatch(/Basic [A-Za-z0-9+/=]{8,}/);
  });

  it("access-gate.ts reads from process.env, not hard-coded strings", () => {
    const src = readFileSync(
      resolve(REPO_ROOT, "apps/web/lib/waitlist/access-gate.ts"),
      "utf8"
    );
    expect(src).toContain('process.env["GSE_WAITLIST_BASIC_USER"]');
    expect(src).toContain('process.env["GSE_WAITLIST_BASIC_PASSWORD"]');
  });
});

describe("checkWaitlistGate — one flag is not a lock", () => {
  // Previously untested, and the reason the drift above went unnoticed. If this
  // ever starts denying, the FOUNDING signup funnel has silently shut behind a
  // Basic Auth prompt on nothing but a legacy flag.
  afterEach(() => {
    delete process.env["GSE_WAITLIST_GATE_ENABLED"];
    delete process.env["GSE_WAITLIST_BASIC_FORCE"];
    delete process.env["GSE_WAITLIST_BASIC_USER"];
    delete process.env["GSE_WAITLIST_BASIC_PASSWORD"];
  });

  it("stays open with GATE_ENABLED alone, even with credentials configured", () => {
    process.env["GSE_WAITLIST_GATE_ENABLED"] = "true";
    process.env["GSE_WAITLIST_BASIC_USER"] = "testuser";
    process.env["GSE_WAITLIST_BASIC_PASSWORD"] = "testpass";
    expect(checkWaitlistGate(null).allowed).toBe(true);
  });

  it("stays open with BASIC_FORCE alone", () => {
    process.env["GSE_WAITLIST_BASIC_FORCE"] = "true";
    process.env["GSE_WAITLIST_BASIC_USER"] = "testuser";
    process.env["GSE_WAITLIST_BASIC_PASSWORD"] = "testpass";
    expect(checkWaitlistGate(null).allowed).toBe(true);
  });

  it("locks only when both are set — and still fails closed without credentials", () => {
    process.env["GSE_WAITLIST_GATE_ENABLED"] = "true";
    process.env["GSE_WAITLIST_BASIC_FORCE"] = "true";
    const result = checkWaitlistGate(null);
    expect(result.allowed).toBe(false);
    expect((result as { allowed: false; reason: string }).reason).toBe("gate_not_configured");
  });
});
