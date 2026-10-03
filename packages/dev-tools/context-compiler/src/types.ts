/**
 * W2-04: Context Compiler v0 — ContextPackManifest schema.
 *
 * A ContextPackManifest is a content-addressed "task packet": everything an
 * agent needs to safely execute one small, well-defined objective against a
 * real repo, without loading the whole repo (or even whole files) into
 * context.
 *
 * Design principles:
 * - Every field is populated from a verifiable source (git object store,
 *   AST parse of a real blob, or a cited file/commit) — never invented.
 * - The manifest is deterministic: compiling the same objective + target
 *   against the same repo state twice must produce byte-identical JSON.
 *   Volatile facts (wall-clock compile time, tool version, run duration)
 *   live in a separate CompileReceipt, never in the manifest itself, so the
 *   manifest's own contentHash is stable across repeated runs. This split
 *   mirrors the pattern already used by the NOVA convergence-inventory
 *   tooling (scripts/nova/build-convergence-inventory.mjs on
 *   origin/nova/convergence-inventory-tooling): deterministic artifact +
 *   volatile receipt, kept apart on purpose.
 */

/** Exact repository identity the pack was compiled against. */
export interface RepoHead {
  /** e.g. "https://github.com/beexly/sports" */
  remote: string;
  /** Full 40-char commit SHA the pack was compiled from. Never a branch name alone. */
  sha: string;
  /** Branch name the SHA was resolved from, if known (informational only). */
  branch?: string;
}

/** A relevant PR head — a branch/commit the objective must reconcile with or was derived from. */
export interface RelevantPrHead {
  /** PR number if resolvable from a commit subject "(#NNN)"; omitted if unknown. */
  number?: number;
  /** Full commit SHA of the head referenced. */
  sha: string;
  /** Short commit subject line, verbatim from `git log`. */
  subject: string;
  /** Why this head is relevant (e.g. "touches target file", "merge commit for target"). */
  relevance: string;
}

export type SymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "const"
  | "enum"
  | "method";

/** One named symbol plus its exact byte/line span in a specific blob. */
export interface RelevantSymbol {
  /** Repo-relative path. */
  file: string;
  symbolName: string;
  kind: SymbolKind;
  /** 1-indexed, inclusive. */
  startLine: number;
  /** 1-indexed, inclusive. */
  endLine: number;
  /** sha256 of the exact source text of [startLine, endLine] at RepoHead.sha — lets a consumer detect drift. */
  contentSha256: string;
  /** True if the symbol is exported from its module. */
  exported: boolean;
}

export type DependencyEdgeKind =
  | "imports"
  | "imported-by"
  | "tested-by"
  | "tests";

/** A directed edge in the dependency/ownership graph relevant to the objective. */
export interface DependencyEdge {
  from: string;
  to: string;
  kind: DependencyEdgeKind;
}

/** A test file judged relevant to the objective, plus why. */
export interface RelevantTest {
  file: string;
  /** e.g. "imports target file", "filename stem matches target", "named in target's commit history" */
  matchedBy: string;
}

/** A real, cited prior decision or failure pulled from git history — never fabricated. */
export interface PriorDecisionOrFailure {
  sha: string;
  subject: string;
  /** ISO 8601 commit date. */
  date: string;
  /** Which relevant file(s) this commit touched. */
  touchedFiles: string[];
  /** "decision" (feat/refactor changing behavior on purpose) or "failure" (fix/revert of a prior bug). */
  category: "decision" | "failure";
}

/** A known collision pulled from a real, runnable inventory tool — cited by source artifact, never invented. */
export interface KnownCollision {
  description: string;
  /** Path to the source artifact this was read from, relative to repo root, plus the git ref it was read at. */
  source: string;
  relatedSymbolOrPath: string;
}

export interface ForbiddenAction {
  statement: string;
  /** Where this rule is sourced from: a file path (+ line) or "compiler-derived" for scope-based rules. */
  source: string;
}

export interface AcceptanceCondition {
  statement: string;
  /** How a compiler/agent can mechanically check this, e.g. an exact shell command. */
  checkCommand?: string;
}

/**
 * The full task packet. This is the object that gets hashed for
 * determinism and is what an agent is handed instead of repo context.
 */
export interface ContextPackManifest {
  /** Schema version — bump on breaking shape changes. */
  schemaVersion: "0.1.0";
  objective: string;
  repoHead: RepoHead;
  relevantPrHeads: RelevantPrHead[];
  relevantSymbols: RelevantSymbol[];
  dependencyEdges: DependencyEdge[];
  relevantTests: RelevantTest[];
  priorDecisionsAndFailures: PriorDecisionOrFailure[];
  knownCollisions: KnownCollision[];
  forbiddenActions: ForbiddenAction[];
  acceptanceConditions: AcceptanceCondition[];
  /**
   * sha256 over the canonical (sorted-key, LF, trailing-newline) JSON
   * serialization of this object with contentHash itself set to the empty
   * string. Lets any consumer verify the pack wasn't tampered with and lets
   * us verify determinism by recompiling and comparing hashes.
   */
  contentHash: string;
}

/** Volatile, non-deterministic facts about one compile run. Kept separate from the manifest on purpose. */
export interface CompileReceipt {
  compiledAtIso: string;
  toolVersion: string;
  compileDurationMs: number;
  /** sha256 of the manifest this receipt describes (cross-check). */
  manifestContentHash: string;
  /** Working tree dirty at compile time? (informational; manifest always reads from git blobs, not the working tree, except where noted in compiler.ts) */
  workingTreeDirty: boolean;
}
