#!/usr/bin/env node
/**
 * Agent Bus Bridge for GSE / Beexly fleet coordination.
 * Wraps C:\Users\Garrett\orca\agent-bus\agent-bus\bin\bus.mjs
 * Defaults agent identity to 'orca' (or process.env.GSE_AGENT_ID).
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const BUS_REPO = process.env.GSE_BUS_REPO || resolve("C:/Users/Garrett/orca/agent-bus/agent-bus");
const BUS_SCRIPT = resolve(BUS_REPO, "bin/bus.mjs");

if (!existsSync(BUS_SCRIPT)) {
  console.error(`[agent_bus_bridge] bus.mjs not found at ${BUS_SCRIPT}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const hasAgent = args.some((a) => a === "--agent" || a.startsWith("--agent="));
const agentArgs = hasAgent ? [] : ["--agent", process.env.GSE_AGENT_ID || "orca"];

const child = spawnSync(process.execPath, [BUS_SCRIPT, ...args, ...agentArgs], {
  cwd: BUS_REPO,
  stdio: "inherit",
  env: {
    ...process.env,
    GSE_BUS_REPO: BUS_REPO,
  },
});

process.exit(child.status ?? 0);
