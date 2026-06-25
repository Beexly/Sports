import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

/**
 * Brand-Safety v2 lock-in tests (docs/brand-safety-rules-v2.md).
 *
 * Covers the rules implemented in the deploy track (the Evidence-Engine
 * rules BS-010..014/020/050..053 are deferred until that engine exists):
 *
 *  - BS-023  sharp/smart-money framing — context-aware ban in trust-gate.
 *  - BS-040  secret-scan pre-commit hook (functional + wiring).
 *  - BS-021  the user-driven Kelly calculator stays (owner decision).
 *  - BS-024  the personal CLV tracker stays (owner decision).
 *
 * These assert the guard SOURCE / behavior so a future regression that
 * silently removes a rule — or "enforces" a deferred rule by deleting a
 * legitimate user tool — fails CI loudly.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const WEB = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(REPO_ROOT, rel), "utf8");
}

function runScan(args: string[]) {
  const r = spawnSync("node", [resolve(REPO_ROOT, "scripts/guardrails/secret-scan.mjs"), ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: typeof r.status === "number" ? r.status : 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("BS-023 — sharp/smart-money is context-aware, not a blanket ban", () => {
  const src = read("scripts/guardrails/trust-gate.mjs");

  it("trust-gate defines the sharp/smart-money rules", () => {
    expect(src).toContain("banned.sharp-money");
    expect(src).toContain("banned.smart-money");
  });

  it("exempts the verified education/glossary/internal/demo files (not a phrase ban)", () => {
    // The handoff vouches these as legitimate uses; a blanket ban would fail
    // the build on correct copy. They must stay on the per-rule allowlist.
    for (const f of [
      "apps/web/lib/glossary.ts",
      "apps/web/app/vs/tout-services/page.tsx",
      "apps/web/lib/jarvis/capability-registry.ts",
      "apps/web/components/slate-twin/galaxy-slate-twin.tsx",
    ]) {
      expect(src).toContain(f);
    }
  });

  it("the exemption is per-rule (allowFiles), so other bans still apply to those files", () => {
    expect(src).toContain("allowFiles");
    expect(src).toContain("entry.allowFiles && entry.allowFiles.has(relNorm)");
  });
});

describe("BS-040 — secret-scan pre-commit hook", () => {
  const tmp = mkdtempSync(join(tmpdir(), "gse-secretscan-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it("flags a real-looking Stripe live key and webhook secret", () => {
    const f = join(tmp, "leak.ts");
    // Build the fixtures by concatenation so the contiguous token never appears
    // as a literal in this source file — that keeps GitHub push-protection (and
    // our own scanner, which whitelists this file) from flagging the test itself,
    // while the temp file written below still contains the full token to detect.
    const fakeLive = "sk_live_" + "51AbcdEFGhijkLMNOpqrstuvwx";
    const fakeHook = "whsec_" + "abcdefghijklmnopqrstuvwxyz0123456789";
    writeFileSync(f, `const k = "${fakeLive}";\nconst w = "${fakeHook}";\n`);
    const r = runScan([f]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("stripe.secret.live");
    expect(r.stderr).toContain("stripe.webhook");
  });

  it("does NOT flag placeholders or local dev credentials", () => {
    const f = join(tmp, "ok.ts");
    writeFileSync(
      f,
      'const k = "sk_live_placeholder";\nconst w = "whsec_placeholder";\n' +
        'const d = "postgresql://postgres:postgres@localhost:5432/app";\n'
    );
    const r = runScan([f]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("[secret-scan] OK");
  });

  it("the pre-commit hook exists and runs the scan", () => {
    const hook = resolve(REPO_ROOT, ".githooks/pre-commit");
    expect(existsSync(hook)).toBe(true);
    expect(readFileSync(hook, "utf8")).toContain("scripts/guardrails/secret-scan.mjs");
  });

  it("is wired into package.json (guard:secrets + prepare auto-registers hooks)", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["guard:secrets"]).toContain("secret-scan.mjs");
    expect(pkg.scripts["prepare"]).toContain("setup-git-hooks.mjs");
  });

  // --- --all mode: the CI gate must scan the whole tree, not the empty stage ---
  // Regression for the launch-backlog finding "secret-scan is a no-op in CI"
  // (it scanned `git diff --cached`, which is empty in CI → always passed on 0 files).

  it("--all scans every tracked file, not just the staged set", () => {
    const r = runScan(["--all"]);
    expect(r.status).toBe(0);
    const m = r.stdout.match(/scanned (\d+) file\(s\) \[all-tracked\]/);
    expect(m).not.toBeNull();
    // The whole tree is hundreds+ of files — proving CI no longer scans 0.
    expect(Number(m![1])).toBeGreaterThan(100);
  });

  it("CI has a dedicated secret-scan job that runs --all (gate has teeth)", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toMatch(/secret-scan:/);
    expect(ci).toContain("scripts/guardrails/secret-scan.mjs --all");
  });

  it("the composite guardrails script runs secret-scan in --all mode", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["guardrails"]).toContain("secret-scan.mjs --all");
    expect(pkg.scripts["guard:secrets"]).toContain("--all");
  });
});

describe("BS-021 / BS-024 — user-driven tools stay (owner decision 2026-06-21)", () => {
  it("BS-021: the educational Kelly calculator (user inputs, not engine output) stays", () => {
    const f = resolve(WEB, "components/tracker/staking-calculator.tsx");
    expect(existsSync(f)).toBe(true);
    const txt = readFileSync(f, "utf8");
    // BS-021 bans the ENGINE sizing its own picks; this tool sizes from the
    // user's own inputs and is explicitly framed as educational, not advice.
    expect(txt).toContain("Educational, not advice");
  });

  it("BS-024: the personal, on-device CLV tracker (the user's own bets) stays", () => {
    const f = resolve(WEB, "components/tracker/bet-tracker.tsx");
    expect(existsSync(f)).toBe(true);
    const txt = readFileSync(f, "utf8");
    // BS-024 gates the PLATFORM's published CLV; this tracks the user's own
    // bets locally and never leaves the device.
    expect(txt).toContain("nothing leaves the device");
  });
});
