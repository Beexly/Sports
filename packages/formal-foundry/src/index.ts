/**
 * GSE Formal Foundry — Public Entry Point
 * Additive, silent-launch compatible, fail-closed.
 */

export * from "./types";
export * from "./itf";
export * from "./apalache-client";
export * from "./cti-lifting";
export * from "./safety-ledger";
export * from "./velocity-dashboard";
export * from "./inductive-profile";
export * from "./ic3-controller";

import { ApalacheJsonRpcClient } from "./apalache-client";
import { IC3Controller } from "./ic3-controller";
import { ledger } from "./safety-ledger";
import { getVelocitySnapshot } from "./velocity-dashboard";
import { INDUCTIVE_PROFILE } from "./inductive-profile";

/**
 * One-call initialization of the Formal Foundry.
 */
export async function initializeFoundry(options: {
  baseUrl?: string;
  sources: string[];
  invariants?: string[];
  varTypes?: Record<string, string>;
}) {
  const client = new ApalacheJsonRpcClient(options.baseUrl);
  const controller = new IC3Controller(client);
  await controller.init(
    options.sources,
    options.invariants ?? ["TypeOK"],
    options.varTypes ?? {}
  );
  return { client, controller, ledger, profile: INDUCTIVE_PROFILE };
}

/**
 * Manual, explicitly-invoked dev smoke-test helper (run after a real
 * Apalache explorer server is up — NOT invoked automatically by anything in
 * this package). Prints to the console by design: unlike `SafetyLedger`/
 * `VelocityDashboard`, which stay silent during normal operation (see those
 * files' headers), a caller invoking THIS function by name is explicitly
 * asking for console output.
 */
export async function smokeTest() {
  console.log("Formal Foundry smoke test");
  console.log("Inductive profile:", INDUCTIVE_PROFILE);
  console.log("Ledger:", ledger.summary());
  console.log("Velocity:", getVelocitySnapshot());
}
