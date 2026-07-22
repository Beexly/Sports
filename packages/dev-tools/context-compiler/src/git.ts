import { execFileSync } from "node:child_process";

/**
 * Thin wrappers over the real `git` binary. Every read here comes from the
 * actual git object store (`git show <sha>:<path>`, `git log`), never the
 * working tree, so results are pinned to an exact commit and reproducible
 * regardless of what's currently checked out — except where a function is
 * explicitly documented otherwise.
 */

export function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    // Probing calls (e.g. readBlobAtSha against a path that may not exist) are expected to fail
    // often and are caught by callers; keep git's stderr out of the compiler's own stdout/stderr.
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function resolveSha(ref: string, cwd: string): string {
  return git(["rev-parse", ref], cwd).trim();
}

export function resolveRemoteUrl(cwd: string): string {
  try {
    return git(["remote", "get-url", "origin"], cwd).trim();
  } catch {
    return "unknown";
  }
}

export function currentBranch(cwd: string): string | undefined {
  try {
    const b = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd).trim();
    return b === "HEAD" ? undefined : b;
  } catch {
    return undefined;
  }
}

export function isWorkingTreeDirty(cwd: string): boolean {
  try {
    return git(["status", "--porcelain"], cwd).trim().length > 0;
  } catch {
    return false;
  }
}

/** Read a file's exact content at a specific commit, straight from the git object store. */
export function readBlobAtSha(sha: string, path: string, cwd: string): string {
  return git(["show", `${sha}:${path}`], cwd);
}

export interface LogEntry {
  sha: string;
  subject: string;
  dateIso: string;
}

/**
 * Real commit history touching `path`, oldest-relevance-agnostic (git's
 * natural newest-first order), each entry a real object from `git log`.
 */
export function logForPath(path: string, cwd: string, maxCount = 30, upToSha?: string): LogEntry[] {
  const ref = upToSha ?? "HEAD";
  const sep = "\x1f";
  const out = git(
    [
      "log",
      `--max-count=${maxCount}`,
      `--pretty=format:%H${sep}%s${sep}%aI`,
      ref,
      "--",
      path,
    ],
    cwd
  );
  if (!out.trim()) return [];
  return out
    .trim()
    .split("\n")
    .map((line) => {
      const [sha, subject, dateIso] = line.split(sep);
      return { sha: sha ?? "", subject: subject ?? "", dateIso: dateIso ?? "" };
    });
}

/** Files touched by a commit, real diff-tree output. */
export function filesTouchedBy(sha: string, cwd: string): string[] {
  const out = git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha], cwd);
  return out.trim().length ? out.trim().split("\n") : [];
}

/** grep the repo tree at a given sha for a literal string, return matching file paths (repo-relative). */
export function grepFilesAtSha(sha: string, pattern: string, cwd: string): string[] {
  try {
    const out = git(
      ["grep", "-l", "-F", pattern, sha, "--"],
      cwd
    );
    if (!out.trim()) return [];
    // Lines look like "<sha>:<path>"
    return out
      .trim()
      .split("\n")
      .map((l) => {
        const idx = l.indexOf(":");
        return idx === -1 ? l : l.slice(idx + 1);
      });
  } catch {
    // git grep exits 1 when there are no matches — not an error for us.
    return [];
  }
}

export function extractPrNumber(subject: string): number | undefined {
  const m = subject.match(/\(#(\d+)\)\s*$/);
  return m && m[1] ? Number(m[1]) : undefined;
}
