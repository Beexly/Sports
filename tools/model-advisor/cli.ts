/**
 * CLI for the model-advisor tool.
 *
 *   npx tsx tools/model-advisor/cli.ts list
 *   npx tsx tools/model-advisor/cli.ts recommend --kind coding --complexity 2 --privacy local-only
 */
import { MODEL_CATALOG } from "./catalog";
import { recommendModel } from "./recommend";
import type { ModelEntry, TaskKind, TaskProfile } from "./types";

const TASK_KINDS: readonly TaskKind[] = [
  "coding",
  "reasoning",
  "agentic",
  "long-context",
  "multimodal",
  "bulk",
];

function flag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function money(v: number | null): string {
  return v === null ? "—" : `$${v}`;
}

function row(m: ModelEntry): string {
  return [
    m.id.padEnd(22),
    m.label.padEnd(34),
    m.license.padEnd(14),
    (m.localRunnable ? "local" : "hosted").padEnd(7),
    m.verification.padEnd(11),
    `${money(m.reportedInputUsdPerM)}/${money(m.reportedOutputUsdPerM)}`.padEnd(10),
    m.roles.join(","),
  ].join(" ");
}

function list(): void {
  const header = [
    "id".padEnd(22),
    "model".padEnd(34),
    "license".padEnd(14),
    "where".padEnd(7),
    "verified".padEnd(11),
    "$I/$O rep.".padEnd(10),
    "roles",
  ].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const m of MODEL_CATALOG.filter((x) => x.localRunnable)) console.log(row(m));
  for (const m of MODEL_CATALOG.filter((x) => !x.localRunnable)) console.log(row(m));
  console.log(
    "\nPricing is third-party-REPORTED, not provider-confirmed. Local models cost $0/token.",
  );
}

function recommend(): void {
  const kindRaw = flag("kind") ?? "coding";
  if (!TASK_KINDS.includes(kindRaw as TaskKind)) {
    console.error(`--kind must be one of: ${TASK_KINDS.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const task: TaskProfile = {
    kind: kindRaw as TaskKind,
    complexity: Number(flag("complexity") ?? "5"),
    contextTokens: flag("context") ? Number(flag("context")) : undefined,
    toolUse: flag("tooluse") === "true" ? true : undefined,
    privacy: flag("privacy") === "local-only" ? "local-only" : undefined,
    budget:
      flag("budget") === "free" ? "free" : flag("budget") === "cheap" ? "cheap" : undefined,
  };
  const rec = recommendModel(task);
  console.log(`tier      : ${rec.tier}`);
  console.log(`primary   : ${rec.primary.label} (${rec.primary.id})`);
  console.log(`fallbacks : ${rec.fallbacks.map((f) => f.label).join(" -> ") || "none"}`);
  console.log(`rationale : ${rec.rationale}`);
}

const command = process.argv[2];
if (command === "list") list();
else if (command === "recommend") recommend();
else {
  console.log("usage: tsx tools/model-advisor/cli.ts <list|recommend> [--kind K] [--complexity N]");
  console.log("       [--context TOKENS] [--tooluse true] [--privacy local-only] [--budget free|cheap]");
  process.exitCode = command === undefined ? 0 : 1;
}
