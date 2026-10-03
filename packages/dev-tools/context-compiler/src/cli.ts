#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { compileContextPack } from "./compiler.js";
import { canonicalStringify } from "./canonical.js";
import { isWorkingTreeDirty } from "./git.js";
import type { CompileReceipt } from "./types.js";

interface Args {
  cwd: string;
  objective: string;
  targetFiles: string[];
  headRef?: string;
  out: string;
  collisionInventoryRef?: string;
  collisionInventoryPath?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> & { targetFiles: string[] } = { targetFiles: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd") args.cwd = argv[++i];
    else if (a === "--objective") args.objective = argv[++i];
    else if (a === "--target") args.targetFiles.push(argv[++i] as string);
    else if (a === "--head") args.headRef = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--collision-ref") args.collisionInventoryRef = argv[++i];
    else if (a === "--collision-path") args.collisionInventoryPath = argv[++i];
  }
  if (!args.cwd || !args.objective || args.targetFiles.length === 0 || !args.out) {
    console.error(
      "Usage: cli.ts --cwd <repo> --objective <text> --target <file> [--target <file> ...] --out <path.json> [--head <ref>] [--collision-ref <ref> --collision-path <path>]"
    );
    process.exit(1);
  }
  return args as Args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const start = Date.now();
  const manifest = await compileContextPack({
    cwd: args.cwd,
    objective: args.objective,
    targetFiles: args.targetFiles,
    headRef: args.headRef,
    collisionInventoryRef: args.collisionInventoryRef,
    collisionInventoryPath: args.collisionInventoryPath,
  });
  const durationMs = Date.now() - start;

  const manifestJson = canonicalStringify(manifest);
  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, manifestJson, "utf8");

  const receipt: CompileReceipt = {
    compiledAtIso: new Date().toISOString(),
    toolVersion: "context-compiler@0.1.0",
    compileDurationMs: durationMs,
    manifestContentHash: manifest.contentHash,
    workingTreeDirty: isWorkingTreeDirty(args.cwd),
  };
  const receiptPath = args.out.replace(/\.json$/, ".receipt.json");
  writeFileSync(receiptPath, canonicalStringify(receipt), "utf8");

  console.log(`Wrote ${args.out} (${manifestJson.length} bytes, contentHash=${manifest.contentHash.slice(0, 16)}...)`);
  console.log(`Wrote ${receiptPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
