import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderDraft } from "./gen-case-study-stub";
import { usageSummary, type PlatformUsageEvent } from "../../apps/web/lib/platform/usage-meter";

const TEMPLATE = readFileSync(
  join(__dirname, "..", "..", "docs", "devrel", "CASE_STUDY_TEMPLATE.md"),
  "utf8",
);

describe("renderDraft", () => {
  it("substitutes {PLATFORM} and the computed Metrics numbers, leaving other sections as placeholders", () => {
    const events: PlatformUsageEvent[] = [
      { at: new Date("2026-07-01T00:00:00Z"), provider: "aws", metric: "lambda-invocations", quantity: 100, unitCostProxyUsd: 1.5 },
      { at: new Date("2026-07-02T00:00:00Z"), provider: "aws", metric: "lambda-invocations", quantity: 50, unitCostProxyUsd: 0.75 },
    ];
    const summary = usageSummary(events, "aws");
    const draft = renderDraft(TEMPLATE, "aws", summary);

    expect(draft).toContain("# Governed agents on aws");
    expect(draft).toContain("**Usage quantity**: 150");
    expect(draft).toContain("**Estimated cost proxy**: $2.25");
    expect(draft).toContain("caller-supplied");
    expect(draft).toContain("Describe the concrete operational problem"); // Problem left as placeholder
    expect(draft).toContain("[Quote pending]"); // Quote left as placeholder
  });
});

describe("gen-case-study-stub script (end-to-end)", () => {
  let workDir: string;
  const repoRoot = join(__dirname, "..", "..");

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "case-study-fixture-"));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("produces a draft file with the correct computed numbers substituted into Metrics", () => {
    const fixturePath = join(workDir, "usage-events.json");
    const events = [
      { at: "2026-07-01T00:00:00.000Z", provider: "cloudflare", metric: "requests", quantity: 1000, unitCostProxyUsd: 4 },
      { at: "2026-07-05T00:00:00.000Z", provider: "cloudflare", metric: "requests", quantity: 2000, unitCostProxyUsd: 8 },
      { at: "2026-07-05T00:00:00.000Z", provider: "aws", metric: "other", quantity: 999 },
    ];
    writeFileSync(fixturePath, JSON.stringify(events, null, 2), "utf8");

    const env = { ...process.env, CASE_STUDY_OUTPUT_DIR: workDir };
    execFileSync(
      "npx",
      ["tsx", join(repoRoot, "scripts", "devrel", "gen-case-study-stub.ts"), fixturePath, "cloudflare"],
      { cwd: repoRoot, env },
    );

    const outPath = join(workDir, "draft-cloudflare.md");
    const content = readFileSync(outPath, "utf8");

    expect(content).toContain("# Governed agents on cloudflare");
    expect(content).toContain("**Usage quantity**: 3000");
    expect(content).toContain("**Estimated cost proxy**: $12.00");

    // Rerun to confirm it overwrites cleanly rather than appending/duplicating.
    execFileSync(
      "npx",
      ["tsx", join(repoRoot, "scripts", "devrel", "gen-case-study-stub.ts"), fixturePath, "cloudflare"],
      { cwd: repoRoot, env },
    );
    const rerunContent = readFileSync(outPath, "utf8");
    expect(rerunContent).toBe(content);
    expect((rerunContent.match(/# Governed agents on cloudflare/g) ?? []).length).toBe(1);
  });
});
