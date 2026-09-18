import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPreRegistration, PreRegistrationError, FEATURE_TRIALS_DIR } from "../pre-registration";

function validDoc() {
  return {
    hypothesis: "rest days raise totals",
    featureDefinition: "gamesInLast7Days as integer",
    codeHash: "abc123",
    strata: ["NFL"],
    killLine: { threshold: 0.01, confidenceLevel: 0.95, nFloor: 200 },
    familyId: "rest-totals",
    falseDiscoveryLevel: 0.1,
    placeboSpec: "permute rest independently of outcome",
  };
}

describe("committed pre-registration loader", () => {
  it("loads a committed pre-registration", () => {
    const root = join(tmpdir(), `prereg-${Date.now()}`);
    mkdirSync(join(root, FEATURE_TRIALS_DIR), { recursive: true });
    writeFileSync(join(root, FEATURE_TRIALS_DIR, "rest.json"), JSON.stringify(validDoc()));
    const loaded = loadPreRegistration("rest", root);
    expect(loaded.killLine.threshold).toBe(0.01);
    expect(loaded.familyId).toBe("rest-totals");
    rmSync(root, { recursive: true, force: true });
  });

  it("refuses a missing file", () => {
    const root = join(tmpdir(), `prereg-missing-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    expect(() => loadPreRegistration("absent", root)).toThrow(PreRegistrationError);
    rmSync(root, { recursive: true, force: true });
  });

  it("refuses a kill line that is not a number", () => {
    const root = join(tmpdir(), `prereg-bad-${Date.now()}`);
    mkdirSync(join(root, FEATURE_TRIALS_DIR), { recursive: true });
    writeFileSync(
      join(root, FEATURE_TRIALS_DIR, "bad.json"),
      JSON.stringify({ ...validDoc(), killLine: { threshold: "0.01", confidenceLevel: 0.95, nFloor: 200 } }),
    );
    expect(() => loadPreRegistration("bad", root)).toThrow(/killLine.threshold must be a finite number/);
    rmSync(root, { recursive: true, force: true });
  });
});
