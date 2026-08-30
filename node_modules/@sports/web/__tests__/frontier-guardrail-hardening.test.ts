import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
let sandbox = "";

function write(relativePath: string, content: string): void {
  const absolutePath = join(sandbox, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

function run(
  executable: string,
  args: string[],
  cwd = sandbox,
): ReturnType<typeof spawnSync> {
  return spawnSync(executable, args, { cwd, encoding: "utf8" });
}

function runGuard(name: string, args: string[] = []): ReturnType<typeof spawnSync> {
  return run("node", [resolve(REPO_ROOT, "scripts", "guardrails", name), ...args]);
}

function initGit(): void {
  expect(run("git", ["init"]).status).toBe(0);
  expect(run("git", ["config", "user.email", "guardrails@gse.invalid"]).status).toBe(0);
  expect(run("git", ["config", "user.name", "GSE Guardrails"]).status).toBe(0);
}

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "gse-guardrail-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe("public copy scanners", () => {
  it("rejects Unicode-obscured tout copy on an arbitrary rendered route", () => {
    write(
      "apps/web/app/arbitrary/page.tsx",
      'export default function Page() { return <p>Guar\u200Banteed winner. Easy money.</p>; }',
    );
    const result = runGuard("commercial-copy-scan.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("commercial-copy.tout");
    expect(result.stderr).toContain("arbitrary/page.tsx");
  });

  it("rejects a hardcoded numeric record on an arbitrary rendered route", () => {
    write(
      "apps/web/app/arbitrary/page.tsx",
      'export default function Page() { return <p>Our 68% win rate and 14-3 ATS record.</p>; }',
    );
    const result = runGuard("no-unsupported-performance-claims.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("hardcoded-numeric");
    expect(result.stderr).toContain("arbitrary/page.tsx");
  });

  it("allows legitimate lock-time and evidence vocabulary", () => {
    write(
      "apps/web/app/arbitrary/page.tsx",
      'export default function Page() { return <p>The receipt commits at lock time; settled CLV remains evidence.</p>; }',
    );
    expect(runGuard("commercial-copy-scan.mjs").status).toBe(0);
    expect(runGuard("no-unsupported-performance-claims.mjs").status).toBe(0);
  });
});

describe("secret scanner", () => {
  it("scans the staged index blob instead of a cleaned worktree copy", () => {
    initGit();
    const secret = "ghp_" + "A1b2C3d4".repeat(5);
    write("fixture.txt", secret);
    expect(run("git", ["add", "fixture.txt"]).status).toBe(0);
    write("fixture.txt", "clean worktree copy");
    const result = runGuard("secret-scan.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("github.token");
  });

  it("scans tracked build artifacts in full-tree mode", () => {
    initGit();
    const secret = "github_pat_" + "Z9y8X7w6".repeat(8);
    write("dist/bundle.js", secret);
    expect(run("git", ["add", "dist/bundle.js"]).status).toBe(0);
    const result = runGuard("secret-scan.mjs", ["--all"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("github.pat.fine-grained");
  });

  it("detects remote Redis credentials without flagging localhost development", () => {
    const remoteUrl = [
      "redis://default:",
      "realPass99",
      "@prod-cache.gse.test:6379",
    ].join("");
    write("remote.txt", remoteUrl);
    write("local.txt", "redis://default:devpass99@localhost:6379");
    const remote = runGuard("secret-scan.mjs", ["remote.txt"]);
    const local = runGuard("secret-scan.mjs", ["local.txt"]);
    expect(remote.status).toBe(1);
    expect(remote.stderr).toContain("redis.url.with-password");
    expect(local.status).toBe(0);
  });
});

describe("draft-only scanner", () => {
  it("does not let a trailing comment exempt executable publishing code", () => {
    write(
      "apps/web/lib/publish-bypass.ts",
      "export async function bypass() { await publishNow(pick); // INTENTIONALLY safe\n}",
    );
    const result = runGuard("draft-only.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("publishnow-call");
  });

  it("does not let a null marker exempt publishing code on the same line", () => {
    write(
      "apps/web/lib/publish-null-bypass.ts",
      'export async function bypass() { const marker = "publishedAt: null"; await publishNow(pick); }',
    );
    const result = runGuard("draft-only.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("publishnow-call");
  });
});

describe("trust scanner exemptions", () => {
  it("allows the exact negative lexicon declaration", () => {
    write(
      "apps/web/lib/brand.ts",
      'export const BANNED_LANGUAGE = [\n  "easy money",\n] as const;',
    );
    expect(runGuard("trust-gate.mjs").status).toBe(0);
  });

  it("still rejects customer copy elsewhere in a negative-lexicon file", () => {
    write(
      "apps/web/lib/brand.ts",
      'export const HERO_COPY = "easy money";',
    );
    const result = runGuard("trust-gate.mjs");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("banned.easy-money");
  });
});

describe("CI topology", () => {
  const source = readFileSync(resolve(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8");

  it("runs checks for every pull-request target, including future stacked trunks", () => {
    const pullRequestBlock =
      source.split("pull_request:")[1]?.split("concurrency:")[0] ?? "";
    expect(pullRequestBlock).not.toContain("branches:");
  });

  it("deduplicates push and pull-request runs by source branch without canceling main", () => {
    expect(source).toContain("github.head_ref || github.ref_name");
    expect(source).toContain(
      "github.event.pull_request.head.repo.full_name || github.repository",
    );
    expect(source).toContain("github.ref != 'refs/heads/main'");
    expect(source).not.toContain("github.event_name }}-${{ github.ref");
  });

  it("executes the Vercel skip-gate test outside the Vitest workspaces", () => {
    expect(source).toContain("node --test scripts/vercel-skip-build.test.mjs");
  });
});
