import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Acceptance guard (directive 5.8): live-mode Stripe keys are NEVER used in
 * tests. Two enforcement layers:
 *
 *  1. the test process env must not carry a live-mode secret/publishable key;
 *  2. no test or billing-lib source file may embed one.
 *
 * (The repo-wide secret-scan guardrail covers the whole tree; this test keeps
 * the payment suite self-verifying even when run in isolation.)
 *
 * The patterns are BUILT, not written literally, so this file never trips the
 * scanners it mirrors.
 */

const LIVE_PREFIXES = ["sk", "pk", "rk"].map((p) => `${p}_` + "live_");
const LIVE_KEY_RE = new RegExp(`\\b(?:${LIVE_PREFIXES.join("|")})[A-Za-z0-9]{8,}\\b`);

describe("live-mode Stripe keys never reach tests", () => {
  it("the test environment carries no live-mode key in any env var", () => {
    for (const [name, value] of Object.entries(process.env)) {
      if (!value) continue;
      expect(LIVE_KEY_RE.test(value), `env var ${name} looks like a live-mode Stripe key`).toBe(
        false,
      );
    }
  });

  it("no payment-suite test file or billing lib embeds a live-mode key", () => {
    // Scope: the payment/checkout suite + billing libs. (brand-safety-v2 and
    // the repo-wide secret-scan guardrail deliberately carry fake live-shaped
    // fixtures to test the scanners themselves, so the whole-tree scan is
    // theirs; this guard keeps the payment suite self-verifying.)
    const PAYMENT_FILE_RE = /(checkout|stripe|billing|subscription)/i;
    const files: string[] = [join(__dirname, "..", "lib", "stripe.ts")];
    for (const entry of readdirSync(join(__dirname))) {
      if ((entry.endsWith(".ts") || entry.endsWith(".tsx")) && PAYMENT_FILE_RE.test(entry)) {
        files.push(join(__dirname, entry));
      }
    }
    for (const entry of readdirSync(join(__dirname, "..", "lib", "billing"))) {
      if (entry.endsWith(".ts")) files.push(join(__dirname, "..", "lib", "billing", entry));
    }
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(LIVE_KEY_RE.test(content), `${file} contains a live-mode Stripe key`).toBe(false);
    }
  });
});
