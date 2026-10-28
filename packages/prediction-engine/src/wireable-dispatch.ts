/**
 * @file wireable-dispatch.ts
 * Callable surface over every wireable disabled module.
 *
 * Why this exists
 * ---------------
 * 178 of the 196 disabled modules in this package are PURE_MATH or
 * SELF_CONTAINED: they need no external dataset, only a caller. They have no
 * production consumer, so they are dead code despite their tests passing.
 *
 * `wireable-dispatch.generated.ts` statically imports all 178 and maps
 * `moduleName -> { exportName: fn }`. This module wraps that map in a single
 * typed entry point so the live web app can reach any of them through one API
 * route instead of 178 bespoke integration files.
 *
 * What this does NOT do
 * ---------------------
 * It changes no prediction. Nothing calls `invokeModel` unless a request asks
 * for it. It makes the modules *reachable*, which is the precondition for
 * wiring them into live workflows — not a substitute for that wiring.
 *
 * DATA_* modules are deliberately absent: calling them would require inventing
 * data the repository does not contain. They remain in `model-registry.ts` as
 * blocked.
 */

import {
  WIREABLE_DISPATCH,
  WIREABLE_MODULE_COUNT,
  type ModelFn,
} from "./wireable-dispatch.generated.js";

export { WIREABLE_MODULE_COUNT };
export type { ModelFn };

/** One callable module in the dispatch surface. */
export interface WireableModule {
  readonly name: string;
  readonly exports: readonly string[];
}

/** Every module reachable through the dispatch surface, in name order. */
export function listWireableModules(): readonly WireableModule[] {
  return Object.keys(WIREABLE_DISPATCH)
    .sort()
    .map((name) => ({
      name,
      exports: Object.keys(WIREABLE_DISPATCH[name] ?? {}).sort(),
    }));
}

/** Look up one module's export map, or undefined when the name is unknown. */
export function findWireableModule(
  name: string,
): Readonly<Record<string, ModelFn>> | undefined {
  return WIREABLE_DISPATCH[name];
}

/** Result of an invocation attempt. */
export type InvokeResult =
  | { readonly ok: true; readonly module: string; readonly export: string; readonly value: unknown }
  | { readonly ok: false; readonly module: string; readonly export: string; readonly error: string };

/**
 * Call one exported function on one wireable module.
 *
 * Args are passed positionally as an array. The caller is responsible for
 * matching the module's signature — there is no shared interface across these
 * 178 modules, so this surface deliberately does not pretend to validate shape.
 *
 * Returns a discriminated result rather than throwing, so an API route can
 * report a structured failure without a try/catch at every call site.
 */
export function invokeModel(
  moduleName: string,
  exportName: string,
  args: readonly unknown[] = [],
): InvokeResult {
  const mod = WIREABLE_DISPATCH[moduleName];
  if (!mod) {
    return {
      ok: false,
      module: moduleName,
      export: exportName,
      error: `unknown module: ${moduleName}`,
    };
  }
  const fn = mod[exportName];
  if (typeof fn !== "function") {
    return {
      ok: false,
      module: moduleName,
      export: exportName,
      error: `unknown export: ${moduleName}.${exportName}`,
    };
  }
  try {
    const value = fn(...args);
    return { ok: true, module: moduleName, export: exportName, value };
  } catch (err) {
    return {
      ok: false,
      module: moduleName,
      export: exportName,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
