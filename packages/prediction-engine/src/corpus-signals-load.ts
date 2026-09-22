/**
 * Loads the generated corpus registry. Node only. Called from the shadow
 * path and tests, not from a client bundle path that must stay fs-free.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CorpusSignal } from "./corpus-signals.js";

export function corpusRegistryPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../data/corpus-signals.jsonl");
}

export function loadCorpusSignals(path: string = corpusRegistryPath()): CorpusSignal[] {
  const text = readFileSync(path, "utf8");
  const signals: CorpusSignal[] = [];
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    const parsed: unknown = JSON.parse(line);
    if (!isCorpusSignal(parsed)) {
      throw new Error("corpus registry row is missing key, family, source, or path");
    }
    signals.push(parsed);
  }
  return signals;
}

function isCorpusSignal(value: unknown): value is CorpusSignal {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === "string" &&
    row.key.length > 0 &&
    typeof row.family === "string" &&
    row.family.length > 0 &&
    typeof row.source === "string" &&
    typeof row.path === "string"
  );
}
