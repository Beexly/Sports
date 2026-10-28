/**
 * Model-invocation surface — the live caller for 178 wireable modules.
 *
 * Why this exists
 * ---------------
 * 178 of the 196 disabled modules in `@sports/prediction-engine` are PURE_MATH
 * or SELF_CONTAINED: they need no external dataset, only a caller. They have
 * tests and no production consumer, so they are dead despite being correct.
 *
 * This route is that caller. It dispatches to `invokeModel` in the engine's
 * generated dispatch map, so every wireable module is reachable from the live
 * website through one endpoint instead of 178 bespoke integration files.
 *
 * Contract
 * --------
 *   GET  -> { ok, moduleCount, modules: [{name, exports}] }
 *   POST -> { module, export, args?: unknown[] }
 *        -> { ok: true, module, export, value }
 *        -> { ok: false, module, export, error }  (422)
 *
 * Auth: ops bearer. This surface executes arbitrary exported functions on the
 * server; it is not public.
 *
 * Honesty boundary
 * ----------------
 * This does NOT make the modules "part of a workflow." It makes them callable.
 * A module only affects a prediction once a decision path calls it with real
 * inputs. Reachability is the precondition, not the completion, of that wiring.
 * DATA_* modules are absent by design — they need data the repo does not have.
 */

import { NextResponse } from "next/server";
import {
  invokeModel,
  listWireableModules,
  WIREABLE_MODULE_COUNT,
} from "@sports/prediction-engine/src/wireable-dispatch.js";
import { hasOpsAuth } from "@/lib/ops/ops-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json(
    { ok: false, reason: "ops auth required — not imputed" },
    { status: 401 },
  );
}

export async function GET(): Promise<NextResponse> {
  const modules = listWireableModules();
  return NextResponse.json({
    ok: true,
    contract: "model-invoke-v1",
    moduleCount: WIREABLE_MODULE_COUNT,
    modules,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasOpsAuth(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "request body must be JSON" },
      { status: 400 },
    );
  }

  const { module, export: exportName, args } = (body ?? {}) as {
    module?: unknown;
    export?: unknown;
    args?: unknown;
  };

  if (typeof module !== "string" || module.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "`module` must be a non-empty string" },
      { status: 400 },
    );
  }
  if (typeof exportName !== "string" || exportName.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "`export` must be a non-empty string" },
      { status: 400 },
    );
  }
  if (args !== undefined && !Array.isArray(args)) {
    return NextResponse.json(
      { ok: false, reason: "`args` must be an array when present" },
      { status: 400 },
    );
  }

  const result = invokeModel(module, exportName, (args as unknown[]) ?? []);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
