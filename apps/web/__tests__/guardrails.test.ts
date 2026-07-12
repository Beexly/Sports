import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Guardrail integration tests.
 *
 * Run the three Node guardrail scripts as subprocesses and assert on
 * exit code + stdout. These tests cover the Phase 9 "trust gate /
 * model freeze / draft only" suite so a future regression that
 * breaks the guard surface fails CI loudly, not silently.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
// spawnSync blocks the vitest worker thread synchronously, so vitest's own
// testTimeout can't interrupt it — this ceiling is what actually bounds each
// guard. Standalone the guards finish well under a minute, but when the full
// suite runs them concurrently the CPU contention can push a single guard past
// 2 minutes; a 120s ceiling then kills the child and the test fails spuriously.
// 5 minutes gives headroom under load without weakening the guard: it still runs
// to completion and must exit 0. The per-test vitest timeout below is set just
// above this so the spawn ceiling (which yields a clean assertion) trips first.
const GUARD_TIMEOUT_MS = 300_000;
const GUARD_TEST_TIMEOUT_MS = 330_000;

function runGuard(relativePath: string): {
  status: number;
  stdout: string;
  stderr: string;
  error: string;
  signal: NodeJS.Signals | null;
} {
  const script = resolve(REPO_ROOT, relativePath);
  expect(existsSync(script)).toBe(true);
  const r = spawnSync("node", [script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: GUARD_TIMEOUT_MS,
  });
  return {
    status: typeof r.status === "number" ? r.status : 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    error: r.error?.message ?? "",
    signal: r.signal ?? null,
  };
}

describe("Phase 9 guardrails", () => {
  it("trust-gate exits 0 on a clean repo", () => {
    const r = runGuard("scripts/guardrails/trust-gate.mjs");
    if (r.status !== 0) {
      // surface the failure detail for easier triage
      throw new Error(
        `trust-gate failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[trust-gate\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate documents source-contract exceptions for scanner/template definitions", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"), "utf8");
    expect(src).toContain('"apps/web/lib/compliance-scanner/"');
    expect(src).toContain('"apps/web/lib/studio/templates/"');
  });

  it("trust-gate enforces BS-004 — picks are a deterministic engine, never 'AI picks'", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"), "utf8");
    // The brand position (deterministic engine, AI only in the content layer)
    // must stay machine-enforced; this locks the rule so it can't silently vanish.
    expect(src).toContain("banned.ai-picks");
    expect(src).toContain("banned.ai-generated-picks");
  });

  it("model-freeze exits 0 with the FROZEN baseline marker in place", () => {
    const r = runGuard("scripts/guardrails/model-freeze.mjs");
    if (r.status !== 0) {
      throw new Error(
        `model-freeze failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[model-freeze\] OK/);
  });

  it("draft-only exits 0 — no engine path writes publishedAt or flips PUBLISHED", () => {
    const r = runGuard("scripts/guardrails/draft-only.mjs");
    if (r.status !== 0) {
      throw new Error(
        `draft-only failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[draft-only\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("claude-api-usage exits 0 with direct calls limited to approved paths", () => {
    const r = runGuard("scripts/guardrails/claude-api-usage.mjs");
    if (r.status !== 0) {
      throw new Error(
        `claude-api-usage failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[claude-api-usage\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy-scan exits 0 on launch-facing revenue surfaces", () => {
    const r = runGuard("scripts/guardrails/commercial-copy-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `commercial-copy-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[commercial-copy-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("no-unsupported-performance-claims exits 0 on public monetization copy", () => {
    const r = runGuard("scripts/guardrails/no-unsupported-performance-claims.mjs");
    if (r.status !== 0) {
      throw new Error(
        `no-unsupported-performance-claims failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[no-unsupported-performance-claims\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("no-raw-ngs-export exits 0 without raw Next Gen Stats redistribution language", () => {
    const r = runGuard("scripts/guardrails/no-raw-ngs-export.mjs");
    if (r.status !== 0) {
      throw new Error(
        `no-raw-ngs-export failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[no-raw-ngs-export\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("partner-offer-compliance-scan exits 0 with high-risk offers fail-closed", () => {
    const r = runGuard("scripts/guardrails/partner-offer-compliance-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `partner-offer-compliance-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[partner-offer-compliance-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("api-payload-rights-scan exits 0 with unsafe API fields fail-closed", () => {
    const r = runGuard("scripts/guardrails/api-payload-rights-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `api-payload-rights-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[api-payload-rights-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("openapi-security-scan exits 0 with shadow auth metadata intact", () => {
    const r = runGuard("scripts/guardrails/openapi-security-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `openapi-security-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[openapi-security-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("root guardrails chain includes commercial, performance, payload-rights, OpenAPI, and raw-NGS checks", () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["guard:commercial-copy"]).toContain("commercial-copy-scan.mjs");
    expect(pkg.scripts["guard:performance-claims"]).toContain("no-unsupported-performance-claims.mjs");
    expect(pkg.scripts["guard:no-raw-ngs"]).toContain("no-raw-ngs-export.mjs");
    expect(pkg.scripts["guard:partner-offers"]).toContain("partner-offer-compliance-scan.mjs");
    expect(pkg.scripts["guard:api-payload-rights"]).toContain("api-payload-rights-scan.mjs");
    expect(pkg.scripts["guard:openapi-security"]).toContain("openapi-security-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("commercial-copy-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("no-unsupported-performance-claims.mjs");
    expect(pkg.scripts.guardrails).toContain("no-raw-ngs-export.mjs");
    expect(pkg.scripts.guardrails).toContain("partner-offer-compliance-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("api-payload-rights-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("openapi-security-scan.mjs");
  });
});

/**
 * Guardrail-hardening pins (adversarial findings O-2.1 / O-3.x / O-4.x / O-5.1).
 *
 * These tests prove the gates have TEETH: each detector must FIRE on a
 * planted violation and stay quiet on excluded surfaces. Plants NEVER touch
 * the real repository tree — every plant test builds a minimal repo skeleton
 * in the OS temp dir and runs the scanner with cwd there (the scanners
 * resolve their root from process.cwd()). A plant inside the real tree races
 * against every repo-scanning test in a parallel vitest worker (public-copy
 * and docs scans walk the same dirs), failing the suite nondeterministically.
 * The clean-tree OK tests above still run against the REAL repo root.
 */
import { afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

let sandbox: string | null = null;
function sandboxRepo(): string {
  if (!sandbox) sandbox = mkdtempSync(join(tmpdir(), "guardrail-sandbox-"));
  return sandbox;
}
function cleanSandbox(): void {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
  sandbox = null;
}
function plantFile(relPath: string, content: string): string {
  const abs = join(sandboxRepo(), relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}
function plantPage(relDir: string, jsxCopy: string): void {
  plantFile(
    `${relDir}/page.tsx`,
    `export default function Fixture() {\n  return <p>${jsxCopy}</p>;\n}\n`,
  );
}
/** Run a guard with the SANDBOX as its repo root (never the real tree). */
function runGuardInSandbox(relativePath: string, args: string[] = []): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const script = resolve(REPO_ROOT, relativePath);
  const r = spawnSync("node", [script, ...args], {
    cwd: sandboxRepo(),
    encoding: "utf8",
    timeout: GUARD_TIMEOUT_MS,
  });
  return { status: typeof r.status === "number" ? r.status : 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("guardrail-hardening: full public-surface sweep has teeth", () => {
  afterEach(cleanSandbox);

  it("commercial-copy-scan FAILS on tout copy planted on an arbitrary public route", () => {
    plantPage("apps/web/app/__fixture__", "Tonight is a lock. Guaranteed winner, easy money.");
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("commercial-copy.tout");
    expect(r.stderr).toContain("__fixture__/page.tsx");
  }, GUARD_TEST_TIMEOUT_MS);

  it("no-unsupported-performance-claims FAILS on a hardcoded numeric record planted on a public route", () => {
    plantPage("apps/web/app/__fixture__", "We are 14-3 ATS with a 68% win rate, up 42 units this month.");
    const r = runGuardInSandbox("scripts/guardrails/no-unsupported-performance-claims.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("hardcoded-numeric");
    expect(r.stderr).toContain("__fixture__/page.tsx");
  }, GUARD_TEST_TIMEOUT_MS);

  it("the sweep excludes non-public surfaces: the same plant under app/api stays quiet", () => {
    plantPage("apps/web/app/api/__fixture__", "Tonight is a lock with a 68% win rate, up 42 units.");
    const commercial = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    const perf = runGuardInSandbox("scripts/guardrails/no-unsupported-performance-claims.mjs");
    expect(commercial.status).toBe(0);
    expect(perf.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);

  it("legitimate product vocabulary does not trip the sweep (lock-time, grandfathered guarantee)", () => {
    plantPage(
      "apps/web/app/__fixture__",
      "Every pick commits a Merkle root at lock time. Your founding rate carries a grandfather guarantee.",
    );
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);
});

describe("guardrail-hardening: secret-scan rule coverage (O-4.x)", () => {
  afterEach(cleanSandbox);

  function runSecretScanOn(content: string): { status: number; stderr: string } {
    // Plants live in the SANDBOX, never the repo tree: a constructed token on
    // disk inside the repo would race a parallel --all scan in another worker.
    const planted = plantFile("planted.txt", content + "\n");
    return runGuardInSandbox("scripts/guardrails/secret-scan.mjs", [planted]);
  }

  // Tokens are CONSTRUCTED so this test file never contains a scannable
  // literal itself (secret-scan --all covers test files in CI).
  it("flags a GitHub personal access token", () => {
    const r = runSecretScanOn(`const t = "${"ghp_" + "A1b2C3d4".repeat(5)}";`);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("github.token");
  });

  it("flags a fine-grained GitHub PAT", () => {
    const r = runSecretScanOn(`token: ${"github_pat_" + "Z9y8X7w6".repeat(8)}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("github.pat.fine-grained");
  });

  it("flags a Neon API key", () => {
    const r = runSecretScanOn(`NEON_KEY=${"napi_" + "k4J9mQ2p".repeat(6)}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("neon.api-key");
  });

  it("flags a remote Redis URL with an embedded password", () => {
    // Host must not look like a placeholder (example/dummy hosts are
    // correctly ignored by the scanner's PLACEHOLDER heuristic).
    const r = runSecretScanOn(`REDIS_URL=${"redis://default:" + "s3cr3tPazz" + "@prod-redis.gse-app.net:6379"}`);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("redis.url.with-password");
  });

  it("does NOT flag a local dev Redis URL", () => {
    const r = runSecretScanOn(`REDIS_URL=${"redis://:devpass99@localhost:6379"}`);
    expect(r.status).toBe(0);
  });

  it("staged mode scans INDEX content, not the worktree (partial-stage bypass closed)", () => {
    // Pin the mechanism in source: the staged path must be read via
    // `git show :<path>` and renames must be included (ACMR).
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/secret-scan.mjs"), "utf8");
    expect(src).toMatch(/"git",\s*\["show",\s*`:\$\{relPath\}`\]/);
    expect(src).toContain("stagedContent(relNorm)");
    expect(src).toContain("--diff-filter=ACMR");
    // And the worktree copy must NOT be what staged mode scans.
    expect(src).toMatch(/stagedMode[\s\S]*stagedContent/);
  });

  it("--all mode does not skip tracked build-artifact dirs", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/secret-scan.mjs"), "utf8");
    expect(src).toContain("SKIP_DIRS_ARTIFACTS");
    expect(src).toMatch(/!scanAll && SKIP_DIRS_ARTIFACTS/);
  });
});

describe("guardrail-hardening: CI topology (O-5.1)", () => {
  it("pull_request runs cover the claude/* trunks, not just main", () => {
    const ci = readFileSync(resolve(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
    const prBlock = ci.split("pull_request:")[1]?.split("jobs:")[0] ?? "";
    expect(prBlock).toContain('"claude/*"');
    expect(prBlock).toContain("main");
  });

  it("duplicate push+PR runs are deduped by a concurrency group that never cancels main", () => {
    const ci = readFileSync(resolve(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("concurrency:");
    expect(ci).toContain("cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}");
  });
});

describe("guardrail-hardening: Unicode-evasion normalization (O-3.x)", () => {
  afterEach(cleanSandbox);

  function plantLib(name: string, content: string): void {
    plantFile(`apps/web/lib/__fixture__/${name}`, content);
  }

  it("trust-gate catches a zero-width-split banned phrase", () => {
    // "guar<ZWSP>anteed" — invisible in review, previously invisible to the gate.
    plantLib("copy.ts", `export const claim = "guar​anteed to win";\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.guaranteed-outcome");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate catches a curly-apostrophe variant of a banned phrase", () => {
    // Marketing copy typically ships “can’t lose” with U+2019, which the
    // ASCII-apostrophe ban silently missed before normalization.
    plantLib("copy.ts", `export const claim = "you can’t lose tonight";\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.cant-lose");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate catches fullwidth compatibility forms via NFKC", () => {
    plantLib("copy.ts", `export const claim = "ｇｕａｒａｎｔｅｅｄ winner";\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.guaranteed");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate scans markdown headings and list items (not comments)", () => {
    // "#" and "*" are rendered copy in markdown; treating them as comment
    // prefixes let a "# Guaranteed winners" heading pass the gate.
    plantLib("copy.md", "# Guaranteed winners\n\n* a risk-free system\n");
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.guaranteed-outcome");
    expect(r.stderr).toContain("banned.risk-free");
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy sweep catches a zero-width-split tout phrase", () => {
    plantPage("apps/web/app/__fixture__", "This is easy​ money, a sure thing.");
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("commercial-copy.tout");
  }, GUARD_TEST_TIMEOUT_MS);

  it("code comments and TS/JS '#' lines are still skipped outside markdown (no new false positives)", () => {
    plantLib("copy.ts", `// the word guaranteed appears only in this comment\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);
});

describe("guardrail-hardening: O-3.x remainder (concat joins, cross-line, confusables, exemption windows)", () => {
  afterEach(cleanSandbox);

  function plantLib(name: string, content: string): void {
    plantFile(`apps/web/lib/__fixture__/${name}`, content);
  }

  it("trust-gate sees through a string-concatenation split of a banned phrase", () => {
    // "guaran" + "teed" renders as one word but split the phrase for the scanner.
    plantLib("copy.ts", `export const claim = "guaran" + "teed profit tonight";\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.guaranteed");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate sees through a template-interpolation split of a banned phrase", () => {
    plantLib("copy.ts", "const x = 'x';\nexport const claim = `risk${x}-free returns`;\n");
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.risk-free");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate catches a cross-script homoglyph (Cyrillic) in a banned phrase", () => {
    // "lоck of the day" with a Cyrillic 'о' (U+043E) — NFKC does NOT fold it.
    plantLib("copy.ts", `export const claim = "tonight is the lоck of the day";\n`);
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.lock");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate catches a multi-word ban split across a line break", () => {
    // "easy money" broken across two JSX text lines still renders as one phrase.
    plantPage("apps/web/app/__fixture__", "It is easy\n      money for everyone.");
    const r = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("banned.easy-money");
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate: bare 'the lock' slang is caught; temporal 'before the lock' is not", () => {
    plantLib("slang.ts", `export const a = "it is the lock of the century";\n`);
    const slang = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(slang.status).toBe(1);
    expect(slang.stderr).toContain("banned.lock");
    cleanSandbox();
    plantLib("temporal.ts", `export const b = "the line freezes before the lock each night";\n`);
    const temporal = runGuardInSandbox("scripts/guardrails/trust-gate.mjs");
    expect(temporal.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy: a distant negation no longer excuses a tout in a later clause", () => {
    // "not" negates "hype"; the touts sit in the next sentence and must fire.
    // An arbitrary public route → the O-2.1 tout sweep (clause-scoped safe ctx).
    plantPage("apps/web/app/__fixture__", "This is not hype. Guaranteed profit, easy money.");
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("commercial-copy.tout");
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy: a same-clause negation still legitimately excuses the term", () => {
    plantPage("apps/web/app/__fixture__", "We never call a pick a lock or a sure thing.");
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy: an 'export const' copy line is scanned (only structural import/export shapes are exempt)", () => {
    // lib/revenue is a deep-scan target, so this exercises the BANNED word
    // list; the point is that `export const tagline = "…"` is NOT waved through
    // as if it were an import/export statement.
    plantFile(
      "apps/web/lib/revenue/__fixture__/tagline.ts",
      `export const tagline = "Tonight is a lock of the day";\n`,
    );
    const r = runGuardInSandbox("scripts/guardrails/commercial-copy-scan.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("commercial-copy.banned");
    expect(r.stderr).toContain("tagline.ts");
  }, GUARD_TEST_TIMEOUT_MS);

  it("draft-only: a real publish call is caught even behind a reassuring trailing comment", () => {
    // The comment-suffix hole: "// INTENTIONALLY" used to exempt the whole line.
    plantFile(
      "apps/web/lib/__fixture__/evade.ts",
      "export async function f(pick){\n  await publishNow(pick); // INTENTIONALLY safe per review\n}\n",
    );
    const r = runGuardInSandbox("scripts/guardrails/draft-only.mjs");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("publishnow-call");
  }, GUARD_TEST_TIMEOUT_MS);

  it("draft-only: a genuine documented publishedAt: null stays exempt (no new false positive)", () => {
    plantFile(
      "apps/web/lib/__fixture__/ok.ts",
      "export const draft = { data: { publishedAt: null } }; // NEVER auto-set\n",
    );
    const r = runGuardInSandbox("scripts/guardrails/draft-only.mjs");
    expect(r.status).toBe(0);
  }, GUARD_TEST_TIMEOUT_MS);
});
