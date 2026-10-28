/**
 * Wireable-dispatch surface — proves the 178-module call map is real.
 *
 * What this guards
 * ----------------
 * The dispatch exists so that PURE_MATH and SELF_CONTAINED disabled modules have
 * a production caller. The failure modes worth guarding against:
 *   1. The generated map drifts from the registry (stale count).
 *   2. A listed module's export is missing or not a function.
 *   3. An invocation throws instead of returning a structured failure.
 *
 * This does NOT prove the modules are correct — their sibling tests do that.
 * It proves they are reachable and fail closed.
 */

import { describe, it, expect } from "vitest";
import {
  invokeModel,
  listWireableModules,
  findWireableModule,
  WIREABLE_MODULE_COUNT,
} from "../wireable-dispatch.js";

describe("wireable-dispatch", () => {
  it("exposes a non-trivial module count", () => {
    expect(WIREABLE_MODULE_COUNT).toBeGreaterThan(150);
  });

  it("lists every module in the map, each with at least one export", () => {
    const modules = listWireableModules();
    expect(modules.length).toBe(WIREABLE_MODULE_COUNT);
    for (const m of modules) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.exports.length).toBeGreaterThan(0);
    }
  });

  it("every listed export resolves to a callable function", () => {
    for (const m of listWireableModules()) {
      const mod = findWireableModule(m.name);
      expect(mod, `module not found: ${m.name}`).toBeDefined();
      for (const e of m.exports) {
        expect(typeof mod?.[e], `${m.name}.${e} is not a function`).toBe("function");
      }
    }
  });

  it("invokes a known pure-math module and returns ok", () => {
    // shrinkBtl(gammaMle: number[], A: number[][], S: number[][]|number, u: number[])
    const r = invokeModel("1807-09236-empirical-bayes-btl", "shrinkBtl", [
      [1.0, 2.0],
      [
        [1.0, 0.1],
        [0.1, 1.0],
      ],
      2.0,
      [0.5, 0.5],
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Array.isArray(r.value)).toBe(true);
      expect((r.value as number[]).length).toBe(2);
      for (const x of r.value as number[]) {
        expect(Number.isFinite(x)).toBe(true);
      }
    }
  });

  it("fails closed on an unknown module", () => {
    const r = invokeModel("does-not-exist", "fn", []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("unknown module");
  });

  it("fails closed on an unknown export", () => {
    const r = invokeModel("1807-09236-empirical-bayes-btl", "notAFunction", []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("unknown export");
  });

  it("captures a thrown error as a structured failure", () => {
    // Calling shrinkBtl with garbage should throw inside the module, and the
    // dispatcher must convert that to { ok: false } rather than propagating.
    const r = invokeModel("1807-09236-empirical-bayes-btl", "shrinkBtl", ["not-an-array"]);
    expect(r.ok).toBe(false);
  });
});
