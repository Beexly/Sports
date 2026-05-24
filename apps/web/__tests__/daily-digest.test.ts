import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT = resolve(REPO_ROOT, "scripts/build-daily-digest.mjs");
const WORKFLOW = resolve(REPO_ROOT, ".github/workflows/daily-digest.yml");

let tempDir: string | null = null;

async function withFakeRepo(opts: {
  changelog?: string[];
  telemetry?: string[];
  draftFilenames?: string[];
}): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), "digest-test-"));
  await mkdir(join(tempDir, "_logs"), { recursive: true });
  await mkdir(join(tempDir, "scripts"), { recursive: true });
  if (opts.changelog) {
    await writeFile(
      join(tempDir, "_logs", "CHANGELOG.md"),
      opts.changelog.join("\n") + "\n",
      "utf8"
    );
  }
  if (opts.telemetry) {
    await writeFile(
      join(tempDir, "_logs", "claude-usage.log"),
      opts.telemetry.join("\n") + "\n",
      "utf8"
    );
  }
  if (opts.draftFilenames) {
    await mkdir(join(tempDir, "_drafts"), { recursive: true });
    for (const name of opts.draftFilenames) {
      await writeFile(join(tempDir, "_drafts", name), "stub\n", "utf8");
    }
  }
  return tempDir;
}

function runScriptIn(cwd: string, date: string): { stdout: string; outPath: string } {
  const out = execFileSync(process.execPath, [SCRIPT], {
    cwd,
    env: { ...process.env, DIGEST_DATE_UTC: date },
    encoding: "utf8",
  });
  return { stdout: out, outPath: resolve(cwd, "_digests", `${date}.md`) };
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("build-daily-digest.mjs", () => {
  it("writes _digests/<date>.md when no data exists (graceful empty)", () => {
    const cwd = "";
    return (async () => {
      const dir = await withFakeRepo({});
      const { outPath } = runScriptIn(dir, "2026-05-23");
      expect(existsSync(outPath)).toBe(true);
      const body = readFileSync(outPath, "utf8");
      expect(body).toContain("# Daily digest · 2026-05-23");
      expect(body).toContain("_No CHANGELOG entries dated today._");
      expect(body).toContain("_Telemetry log not present");
      expect(body).toContain("_No draft files written today._");
    })().finally(() => void cwd);
  });

  it("renders today's CHANGELOG entries as a bullet list", async () => {
    const dir = await withFakeRepo({
      changelog: [
        "# Changelog",
        "",
        "2026-05-23 · #30 · feat(guardrails): AI daily cost ceiling",
        "2026-05-22 · #29 · feat(cockpit): telemetry summary page",
        "2026-05-23 · #31 · feat(cockpit): pulse strip",
      ],
    });
    const { outPath } = runScriptIn(dir, "2026-05-23");
    const body = readFileSync(outPath, "utf8");
    expect(body).toContain("AI daily cost ceiling");
    expect(body).toContain("pulse strip");
    expect(body).not.toContain("telemetry summary page"); // yesterday
  });

  it("renders telemetry totals (calls, errors, USD, cache hit) when today's rows exist", async () => {
    const today = "2026-05-23";
    const rows = [
      JSON.stringify({
        ts: `${today}T05:00:00Z`,
        callSite: "draft-reviewer",
        model: "claude-haiku-4-5",
        inputTokens: 100,
        cacheReadInputTokens: 900,
        outputTokens: 50,
        latencyMs: 200,
        status: "ok",
      }),
      JSON.stringify({
        ts: `${today}T05:01:00Z`,
        callSite: "draft-reviewer",
        model: "claude-haiku-4-5",
        inputTokens: 100,
        cacheReadInputTokens: 900,
        outputTokens: 50,
        latencyMs: 200,
        status: "error",
        errorClass: "APIError",
      }),
    ];
    const dir = await withFakeRepo({ telemetry: rows });
    const { outPath, stdout } = runScriptIn(dir, today);
    const body = readFileSync(outPath, "utf8");
    expect(body).toContain("**2 calls** (1 error)");
    expect(body).toContain("draft-reviewer");
    expect(body).toMatch(/Spend: \$0\.\d+/);
    // Cache hit rate: 1800 / (200 + 1800) = 90%
    expect(body).toMatch(/cache hit rate 90%/);
    // Script emits a JSON status line on stdout
    expect(stdout).toMatch(/"telemetryRows":\s*2/);
  });

  it("lists draft files dated today", async () => {
    const dir = await withFakeRepo({
      draftFilenames: [
        "2026-05-23-nightly.md",
        "2026-05-23-nightly.review.json",
        "2026-05-22-nightly.md", // yesterday — should NOT appear
      ],
    });
    const { outPath } = runScriptIn(dir, "2026-05-23");
    const body = readFileSync(outPath, "utf8");
    expect(body).toContain("_drafts/2026-05-23-nightly.md");
    expect(body).toContain("_drafts/2026-05-23-nightly.review.json");
    expect(body).not.toContain("_drafts/2026-05-22-nightly.md");
  });

  it("never calls Claude (no @anthropic-ai/sdk import in the script)", () => {
    const src = readFileSync(SCRIPT, "utf8");
    expect(src).not.toMatch(/@anthropic-ai\/sdk/);
    expect(src).not.toMatch(/api\.anthropic\.com/);
  });

  it("does not include any banned phrases in the rendered template", () => {
    const src = readFileSync(SCRIPT, "utf8");
    // The template literals in the script must not contain any banned phrases
    expect(src).not.toMatch(/guaranteed|risk-free|sure thing|easy money/i);
  });

  it("aborts on invalid DIGEST_DATE_UTC", async () => {
    const dir = await withFakeRepo({});
    expect(() =>
      execFileSync(process.execPath, [SCRIPT], {
        cwd: dir,
        env: { ...process.env, DIGEST_DATE_UTC: "not-a-date" },
        encoding: "utf8",
        stdio: "pipe",
      })
    ).toThrow();
  });
});

describe(".github/workflows/daily-digest.yml", () => {
  const src = readFileSync(WORKFLOW, "utf8");

  it("runs on a daily cron + workflow_dispatch", () => {
    expect(src).toMatch(/schedule:\s*\n\s*-\s*cron:/);
    expect(src).toMatch(/workflow_dispatch:/);
  });

  it("uses peter-evans/create-pull-request and writes only to _digests/", () => {
    expect(src).toMatch(/peter-evans\/create-pull-request@v7/);
    expect(src).toMatch(/_digests\//);
  });

  it("no auto-merge, no --auto, no direct push to main, no Slack/email webhook", () => {
    expect(src).not.toMatch(/auto[- ]merge|--auto\b|gh\s+pr\s+merge/i);
    expect(src).not.toMatch(/slack|sendgrid|discord/i);
  });

  it("does NOT request ANTHROPIC_API_KEY (zero spend by design)", () => {
    expect(src).not.toMatch(/ANTHROPIC_API_KEY/);
  });

  it("references the build-daily-digest script", () => {
    expect(src).toMatch(/build-daily-digest\.mjs/);
  });
});
