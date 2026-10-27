import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * P0 seal-isolation invariant, enforced rather than asserted in prose.
 *
 * Three P0 modules (`2609-33664-hmm-pass-blocking`, `1807-09236-empirical-bayes-btl`,
 * `2502-16313-snap-timing-multilevel`) each carry a header comment claiming
 * "this module touches no coach seal state", and only one of them (`2606`)
 * backed that claim with a real assertion. A comment cannot fail a build: if a
 * later edit introduced a `coachTau` read into one of these modules, nothing
 * would notice.
 *
 * This file converts the prose claim into a check over each module's full
 * source. It reads the whole file, not one exported function's `toString()`
 * (the weaker form used in 2606's own suite), so a seal reference in ANY
 * function — exported or not — trips it.
 *
 * The positive control matters: a guard that never fires is worthless. The last
 * case asserts the same detector DOES flag `coach-sim/locked-projection.ts`,
 * which legitimately consumes tau and the mindset hash. If that case ever
 * stops failing to match, the detector has gone vacuous and the P0 cases are
 * passing for the wrong reason.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..");

/** Identifiers that mean "this module participates in the coach seal". */
const SEAL_IDENTIFIER = /coachTau|coachMindsetHash|assertTauSealed|Sinkhorn|sealLock/;

const P0_MODULES = [
  "2609-33664-hmm-pass-blocking.ts",
  "1807-09236-empirical-bayes-btl.ts",
  "2502-16313-snap-timing-multilevel.ts",
  "2606-18512-causal-panel-forecasting.ts",
] as const;

describe("P0 modules stay outside the coach seal boundary", () => {
  for (const moduleFile of P0_MODULES) {
    it(`${moduleFile} references no coach seal parameter in its source`, () => {
      const source = readFileSync(resolve(SRC, moduleFile), "utf8");

      // Strip comments so the header's own explanation of the invariant
      // ("touches no coach seal state") does not count as a violation.
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      const hit = SEAL_IDENTIFIER.exec(code);
      expect(
        hit,
        hit
          ? `${moduleFile} claims to sit outside the coach seal boundary but ` +
            `references seal identifier "${hit[0]}" in code. Either remove the ` +
            `dependency or correct the header comment and add real seal coverage.`
          : undefined,
      ).toBeNull();
    });
  }

  it("the detector is not vacuous: it flags a module that really consumes seal state", () => {
    // Positive control. locked-projection.ts recovers tau, seals a mindset hash,
    // and applies the injury overlay — the detector must see that.
    const source = readFileSync(resolve(SRC, "coach-sim/locked-projection.ts"), "utf8");
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(SEAL_IDENTIFIER.test(code)).toBe(true);
  });
});
