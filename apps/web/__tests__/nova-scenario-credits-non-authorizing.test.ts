/**
 * Guard: `OpportunityEconomics.scenarioAvailableCreditsUsd` is a
 * scenario/discovery value ONLY. It can never authorize workload, count as
 * runway, or feed any admission decision — the sole admissible credit
 * evidence is a receipted `CreditGrantSnapshot` evaluated through
 * `evaluateCreditSnapshotAdmissibility`.
 *
 * This test enforces that structurally: no admission-path module may
 * reference the field (under its new name or the retired `availableCredits`
 * name), and the admission evaluator's signature admits no economics input.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateCreditSnapshotAdmissibility } from "@/lib/opportunity-engine";

const ENGINE_DIR = path.join(__dirname, "..", "lib", "opportunity-engine");

/** Admission-path modules: state machines, adapters, and the snapshot evaluator. */
const ADMISSION_PATH_MODULES = ["lifecycle.ts", "credit.ts", "credit-snapshot.ts"] as const;

describe("scenarioAvailableCreditsUsd is non-authorizing", () => {
  it("is never referenced by any admission-path module", () => {
    for (const moduleFile of ADMISSION_PATH_MODULES) {
      const source = readFileSync(path.join(ENGINE_DIR, moduleFile), "utf8");
      expect(source.includes("scenarioAvailableCreditsUsd"), moduleFile).toBe(false);
      expect(source.includes("availableCredits"), moduleFile).toBe(false);
      // Admission modules must not even import the economics container.
      expect(source.includes("OpportunityEconomics"), moduleFile).toBe(false);
    }
  });

  it("the admission evaluator takes exactly snapshot + scope + instant — no economics parameter", () => {
    // Function.length only counts formals before the first defaulted/rest
    // parameter, so on its own it could be satisfied by a signature like
    // (snapshot, request, evaluationAtIso, economics = undefined). Keep it as
    // a cheap smoke check...
    expect(evaluateCreditSnapshotAdmissibility.length).toBe(3);

    // ...but enforce the real guarantee at the source level: the declared
    // parameter list is exactly the three named inputs, with no defaulted or
    // rest parameters through which anything else could be fed in.
    const source = readFileSync(path.join(ENGINE_DIR, "credit-snapshot.ts"), "utf8");
    const signature = source.match(
      /export function evaluateCreditSnapshotAdmissibility\(([^)]*)\)/,
    );
    const paramList = signature?.[1] ?? "";
    expect(paramList.length).toBeGreaterThan(0);
    const params = paramList
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    expect(params.map((p) => (p.split(":")[0] ?? "").trim())).toEqual([
      "snapshot",
      "request",
      "evaluationAtIso",
    ]);
    for (const param of params) {
      expect(param.includes("="), param).toBe(false);
      expect(param.includes("..."), param).toBe(false);
      expect(param.includes("?"), param).toBe(false);
    }
  });

  it("the field's contract doc marks it scenario-only and names the enforcement", () => {
    const typesSource = readFileSync(path.join(ENGINE_DIR, "types.ts"), "utf8");
    expect(typesSource).toContain("scenarioAvailableCreditsUsd");
    expect(typesSource).toContain("SCENARIO/DISCOVERY VALUE ONLY");
    // The retired ambiguous name must not resurface anywhere in the contract.
    expect(typesSource.includes("availableCredits?")).toBe(false);
  });
});
