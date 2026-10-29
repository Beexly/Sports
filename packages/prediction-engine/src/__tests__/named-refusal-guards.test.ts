import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENABLED as ENABLED_2606,
  counterfactualEfficiency,
} from "../2606-18512-causal-panel-forecasting.js";
import {
  ENABLED as ENABLED_2609,
  gammaIt,
  adjustedPlusMinus,
  pocketSurvival,
} from "../2609-33664-hmm-pass-blocking.js";

/**
 * Named refusals must be the ONLY path when a module is disabled.
 *
 * Goal 3: "confirm the refusal is the only path and that no production importer
 * can bypass it. Add a test that imports the module with ENABLED forced false
 * and asserts the named error is thrown. Do not flip the flags."
 *
 * Both modules export ENABLED = false (ACCEPTANCE_GATE / HUMAN_CALL). The failure mode being guarded against is
 * a disabled module quietly returning 0 or a uniform placeholder instead of
 * refusing — a fabricated "measured zero" is indistinguishable from a real
 * estimate downstream, which is exactly the hallucination class this codebase
 * exists to prevent.
 *
 * Note the two modules refuse for different reasons, and the test encodes each
 * honestly rather than forcing them into one shape:
 *   - 2606 gates on the flag: the counterfactual model is absent, so ANY call
 *     refuses while ENABLED is false.
 *   - 2609 gates on input: gammaIt and adjustedPlusMinus have no ledger math, so
 *     they refuse as soon as they are handed real frames; empty input returns
 *     empty/0, which is a true statement about nothing rather than a fabrication.
 *     pocketSurvival IS implemented and deliberately does not throw.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..");

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walkTs(full, out);
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

const sampleFrame = {
  t: 1.2,
  blockers: [{ id: "b1", x: 0, y: 0, vx: 0.1, vy: 0 }],
  rushers: [{ id: "r1", x: 1, y: 1, vx: 0, vy: 0.1 }],
};

describe("2606-18512 refuses rather than fabricating when disabled", () => {
  it("exports ENABLED = false and does not advertise itself as live", () => {
    expect(ENABLED_2606).toBe(false);
  });

  it("throws the named refusal instead of returning 0", () => {
    expect(() =>
      counterfactualEfficiency(
        [{ team: "KC", week: 1, efficiency: 0.5, starterOut: false }],
        "KC",
        2,
      ),
    ).toThrow(/2606-18512: causal panel counterfactual not implemented/);
  });

  it("the refusal names the fabricated value it is avoiding", () => {
    expect(() =>
      counterfactualEfficiency([], "KC", 2),
    ).toThrow(/refusing to return 0/);
  });
});

describe("2609-33664 refuses rather than fabricating when the math is absent", () => {
  it("exports ENABLED = false", () => {
    expect(ENABLED_2609).toBe(false);
  });

  it("gammaIt throws the named refusal rather than a uniform posterior", () => {
    expect(() => gammaIt([sampleFrame])).toThrow(
      /2609-33664: HMM forward-backward posterior not implemented/,
    );
  });

  it("gammaIt returns empty for empty input (honest, not fabricated)", () => {
    expect(gammaIt([])).toEqual([]);
  });

  it("adjustedPlusMinus throws the named refusal rather than zeros", () => {
    expect(() => adjustedPlusMinus([sampleFrame])).toThrow(
      /2609-33664: continuous-time adjusted plus-minus not implemented/,
    );
  });

  it("adjustedPlusMinus returns an empty map for empty input", () => {
    expect(adjustedPlusMinus([]).size).toBe(0);
  });

  it("pocketSurvival IS implemented and must not throw", () => {
    // The one genuinely computed quantity in this module. If this starts
    // throwing, a working estimator was disabled by mistake.
    expect(() => pocketSurvival([sampleFrame])).not.toThrow();
    expect(pocketSurvival([])).toBe(0);
  });
});

describe("no production importer bypasses the refusal guards", () => {
  it("neither module is imported by non-test source anywhere in the package", () => {
    const offenders: string[] = [];
    for (const file of walkTs(SRC)) {
      if (file.endsWith(".test.ts")) continue;
      const base = file.split(/[\\/]/).pop() ?? "";
      if (base.startsWith("2606-18512") || base.startsWith("2609-33664")) continue;
      const code = readFileSync(file, "utf8");
      // Match actual import/export/require statements, not bare mentions.
      // Catalog files (model-registry.generated.ts) list module ids as string
      // metadata; that is not an importer and cannot bypass a runtime refusal.
      const importLines = code
        .split("\n")
        .filter((line) => /^\s*(import|export)\s/.test(line));
      const reachesGated = importLines.some(
        (line) =>
          /2606-18512-causal-panel-forecasting/.test(line) ||
          /2609-33664-hmm-pass-blocking/.test(line),
      );
      if (reachesGated) {
        offenders.push(relative(SRC, file));
      }
    }
    expect(
      offenders,
      offenders.length
        ? `Production importer(s) reach a disabled module and could bypass its refusal:\n  ${offenders.join("\n  ")}`
        : undefined,
    ).toEqual([]);
  });
});
