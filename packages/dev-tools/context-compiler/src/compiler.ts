import path from "node:path";
import {
  extractPrNumber,
  filesTouchedBy,
  git,
  grepFilesAtSha,
  logForPath,
  readBlobAtSha,
  resolveRemoteUrl,
  resolveSha,
  currentBranch,
} from "./git.js";
import { parseSource } from "./symbols.js";
import { canonicalStringify, sha256Hex } from "./canonical.js";
import type {
  AcceptanceCondition,
  ContextPackManifest,
  DependencyEdge,
  ForbiddenAction,
  KnownCollision,
  PriorDecisionOrFailure,
  RelevantPrHead,
  RelevantSymbol,
  RelevantTest,
} from "./types.js";

export interface CompileInput {
  cwd: string;
  objective: string;
  /** Repo-relative target file paths, e.g. "apps/web/lib/jarvis/ledgers.ts". */
  targetFiles: string[];
  /** Ref to compile against. Defaults to "HEAD". */
  headRef?: string;
  /** How many git-log entries per target file to consider for PR heads / prior decisions. */
  historyDepth?: number;
  /** Optional: git ref holding a real, runnable multi-head convergence-inventory receipt to mine for known collisions. */
  collisionInventoryRef?: string;
  collisionInventoryPath?: string;
}

function isFailureCommit(subject: string): boolean {
  return /^fix(\(|:)|revert/i.test(subject);
}

function lineSlice(text: string, startLine: number, endLine: number): string {
  const lines = text.split("\n");
  return lines.slice(startLine - 1, endLine).join("\n");
}

/** Best-effort resolution of a relative import specifier to a repo-relative .ts/.tsx file, verified to actually exist at `sha`. */
function resolveRelativeImport(fromFile: string, specifier: string, sha: string, cwd: string): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const dir = path.posix.dirname(fromFile);
  const base = path.posix.normalize(path.posix.join(dir, specifier));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    base, // already has extension
  ];
  for (const c of candidates) {
    try {
      readBlobAtSha(sha, c, cwd);
      return c;
    } catch {
      // not this candidate
    }
  }
  return undefined;
}

function detectTestRunnerCommand(file: string): string {
  if (file.startsWith("apps/web/")) return `npm run test --workspace=apps/web -- ${path.basename(file)}`;
  if (file.startsWith("scripts/")) return `node --test ${file}`;
  return `node --test ${file}`;
}

export async function compileContextPack(input: CompileInput): Promise<ContextPackManifest> {
  const { cwd, objective, targetFiles } = input;
  const headRef = input.headRef ?? "HEAD";
  const historyDepth = input.historyDepth ?? 12;

  const sha = resolveSha(headRef, cwd);
  const remote = resolveRemoteUrl(cwd);
  const branch = headRef === "HEAD" ? currentBranch(cwd) : headRef;

  const relevantSymbols: RelevantSymbol[] = [];
  const dependencyEdgesSet = new Map<string, DependencyEdge>();
  const relevantTestsSet = new Map<string, RelevantTest>();
  const relevantPrHeadsSet = new Map<string, RelevantPrHead>();
  const priorDecisionsSet = new Map<string, PriorDecisionOrFailure>();
  const forbiddenActions: ForbiddenAction[] = [];
  const acceptanceConditions: AcceptanceCondition[] = [];

  const fileTexts = new Map<string, string>();

  for (const file of targetFiles) {
    const text = readBlobAtSha(sha, file, cwd);
    fileTexts.set(file, text);

    const { symbols, imports } = parseSource(file, text);
    for (const s of symbols) {
      const content = lineSlice(text, s.startLine, s.endLine);
      relevantSymbols.push({
        file,
        symbolName: s.symbolName,
        kind: s.kind,
        startLine: s.startLine,
        endLine: s.endLine,
        contentSha256: sha256Hex(content),
        exported: s.exported,
      });
    }

    // Forward dependency edges: real static imports resolved against the real tree at `sha`.
    for (const imp of imports) {
      const resolved = resolveRelativeImport(file, imp.specifier, sha, cwd);
      if (resolved) {
        const key = `${file}=>${resolved}=>imports`;
        dependencyEdgesSet.set(key, { from: file, to: resolved, kind: "imports" });
      }
    }

    // Reverse dependency edges: grep the tree at `sha` for files that reference this file's
    // module stem in an import/require string. Heuristic (string match, not full resolution)
    // but every hit is a real grep result against the real blob, not invented.
    const stem = file.replace(/\.tsx?$/, "").replace(/^.*\//, "");
    const dirStem = path.posix.dirname(file).split("/").slice(-1)[0] ?? "";
    const searchToken = `${dirStem}/${stem}`;
    const importers = grepFilesAtSha(sha, searchToken, cwd).filter((f) => f !== file && (f.endsWith(".ts") || f.endsWith(".tsx")));
    for (const importer of importers) {
      const key = `${importer}=>${file}=>imported-by`;
      dependencyEdgesSet.set(key, { from: importer, to: file, kind: "imported-by" });
      if (/\.test\.tsx?$/.test(importer) || importer.includes("__tests__")) {
        relevantTestsSet.set(importer, { file: importer, matchedBy: `imports target via "${searchToken}" (git grep at ${sha.slice(0, 12)})` });
        dependencyEdgesSet.set(`${importer}=>${file}=>tests`, { from: importer, to: file, kind: "tests" });
        dependencyEdgesSet.set(`${file}=>${importer}=>tested-by`, { from: file, to: importer, kind: "tested-by" });
      }
    }

    // Same-stem test file convention (file.ts -> file.test.ts / __tests__/file.test.ts), verified to exist at sha.
    const stemCandidates = [
      file.replace(/\.tsx?$/, ".test.ts"),
      file.replace(/\.tsx?$/, ".test.tsx"),
      path.posix.join(path.posix.dirname(file), "__tests__", `${stem}.test.ts`),
      path.posix.join(path.posix.dirname(path.posix.dirname(file)), "__tests__", `${stem}.test.ts`),
    ];
    for (const c of stemCandidates) {
      try {
        readBlobAtSha(sha, c, cwd);
        relevantTestsSet.set(c, { file: c, matchedBy: "filename-stem convention, verified present at compiled sha" });
      } catch {
        // doesn't exist, skip
      }
    }

    // Git history: real commits touching this exact file, oldest facts from `git log`.
    const entries = logForPath(file, cwd, historyDepth, sha);
    for (const e of entries) {
      const prNum = extractPrNumber(e.subject);
      if (prNum !== undefined) {
        relevantPrHeadsSet.set(e.sha, {
          number: prNum,
          sha: e.sha,
          subject: e.subject,
          relevance: `touches target file "${file}" (git log --follow-equivalent path history)`,
        });
      }
      const touched = filesTouchedBy(e.sha, cwd);
      priorDecisionsSet.set(e.sha, {
        sha: e.sha,
        subject: e.subject,
        date: e.dateIso,
        touchedFiles: touched.filter((t) => targetFiles.includes(t) || t === file),
        category: isFailureCommit(e.subject) ? "failure" : "decision",
      });
    }

    // Scope-fence forbidden action, always present, cites the real compiled scope.
    forbiddenActions.push({
      statement: `Do not modify files outside {${targetFiles.join(", ")}} and their captured dependency edges without recompiling this pack to expand scope.`,
      source: "compiler-derived: scope fence over targetFiles",
    });

    if (/auth|guard|assert|valid/i.test(text)) {
      forbiddenActions.push({
        statement: `"${file}" contains auth/guard/assertion logic (matched /auth|guard|assert|valid/i) — do not change the pass/fail outcome of any existing guard, only its ordering/execution context, unless the objective explicitly requires a behavior change.`,
        source: "compiler-derived: symbol-text heuristic scan of the target file at the compiled sha",
      });
    }

    acceptanceConditions.push({
      statement: `"${file}" type-checks with no new errors at the compiled sha's tsconfig.`,
      checkCommand: `npx tsc --noEmit -p ${path.posix.dirname(file).startsWith("apps/web") ? "apps/web/tsconfig.json" : path.posix.dirname(file).startsWith("packages/db") ? "packages/db/tsconfig.json" : "tsconfig.base.json"}`,
    });
  }

  // De-dupe & sort relevantTests into a deterministic runnable list with commands.
  const relevantTests: RelevantTest[] = Array.from(relevantTestsSet.values());
  for (const t of relevantTests) {
    acceptanceConditions.push({
      statement: `Relevant test "${t.file}" passes.`,
      checkCommand: detectTestRunnerCommand(t.file),
    });
  }

  // Repo-wide non-negotiables the lab charter requires for every W2 objective — real, cited to the
  // instructions governing this compile run rather than invented policy.
  forbiddenActions.push(
    {
      statement: "No fake or fabricated data/stats anywhere in the change.",
      source: "lab charter: security non-negotiables governing this compile run",
    },
    {
      statement: "Authorization/entitlement enforcement must be server-side only, never a frontend-only gate.",
      source: "lab charter: security non-negotiables governing this compile run",
    },
    {
      statement: "No secrets committed to code; environment variables only.",
      source: "lab charter: security non-negotiables governing this compile run",
    },
    {
      statement: "No destructive git operations (force-push, reset --hard on shared branches) and no `prisma migrate deploy` against a non-disposable database.",
      source: "lab charter: additive-only lab work constraints governing this compile run",
    }
  );

  acceptanceConditions.push({
    statement: "The objective's change ships with a passing, non-trivial automated test covering the fixed behavior.",
  });

  // Known collisions: mined from a real, runnable inventory artifact if the caller pointed us at one.
  // We never invent a collision — if the referenced ref/path is unavailable, or nothing in it
  // matches the target files, the result is an honestly empty list.
  const knownCollisions: KnownCollision[] = [];
  if (input.collisionInventoryRef && input.collisionInventoryPath) {
    try {
      const raw = readBlobAtSha(input.collisionInventoryRef, input.collisionInventoryPath, cwd);
      const parsed = JSON.parse(raw) as {
        collisionScan?: { collisions?: Array<Record<string, unknown>> };
      };
      const collisions = parsed.collisionScan?.collisions ?? [];
      for (const c of collisions) {
        const heads = (c["heads"] as Array<Record<string, unknown>> | undefined) ?? [];
        for (const h of heads) {
          const paths = (h["paths"] as string[] | undefined) ?? [];
          for (const p of paths) {
            if (targetFiles.includes(p)) {
              knownCollisions.push({
                description: `${String(c["rule"])} on symbol/model "${String(c["symbol"] ?? c["model"] ?? "unknown")}" involving head "${String(h["label"])}"`,
                source: `${input.collisionInventoryPath} @ ${input.collisionInventoryRef}`,
                relatedSymbolOrPath: p,
              });
            }
          }
        }
      }
    } catch {
      // Ref or path unavailable in this clone — honestly report nothing rather than fabricate.
    }
  }

  const manifestWithoutHash: Omit<ContextPackManifest, "contentHash"> = {
    schemaVersion: "0.1.0",
    objective,
    repoHead: { remote, sha, branch },
    relevantPrHeads: Array.from(relevantPrHeadsSet.values()).sort((a, b) => (a.sha < b.sha ? -1 : a.sha > b.sha ? 1 : 0)),
    relevantSymbols: relevantSymbols.sort((a, b) => (a.file + a.symbolName < b.file + b.symbolName ? -1 : 1)),
    dependencyEdges: Array.from(dependencyEdgesSet.values()).sort((a, b) =>
      `${a.from}${a.to}${a.kind}` < `${b.from}${b.to}${b.kind}` ? -1 : 1
    ),
    relevantTests: relevantTests.sort((a, b) => (a.file < b.file ? -1 : 1)),
    priorDecisionsAndFailures: Array.from(priorDecisionsSet.values()).sort((a, b) => (a.sha < b.sha ? -1 : 1)),
    knownCollisions,
    forbiddenActions,
    acceptanceConditions,
  };

  const hashInput = canonicalStringify({ ...manifestWithoutHash, contentHash: "" });
  const contentHash = sha256Hex(hashInput);

  return { ...manifestWithoutHash, contentHash };
}

export { canonicalStringify, sha256Hex };
export { git };
