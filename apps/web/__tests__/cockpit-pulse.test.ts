import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";

import { loadCockpitPulse } from "@/lib/cockpit/pulse";

const ORIGINAL_CWD = process.cwd();
let tempDir: string | null = null;

async function withFakeLog(lines: string[]): Promise<void> {
  tempDir = await mkdtemp(join(tmpdir(), "pulse-test-"));
  await mkdir(join(tempDir, "_logs"), { recursive: true });
  await writeFile(join(tempDir, "_logs", "claude-usage.log"), lines.join("\n") + "\n", "utf8");
  process.chdir(tempDir);
}

async function withoutLog(): Promise<void> {
  tempDir = await mkdtemp(join(tmpdir(), "pulse-test-"));
  process.chdir(tempDir);
}

afterEach(async () => {
  process.chdir(ORIGINAL_CWD);
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

function row(opts: Partial<Record<string, unknown>> & { ts: string }) {
  return JSON.stringify({
    callSite: "draft-reviewer",
    model: "claude-haiku-4-5",
    inputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 0,
    latencyMs: 100,
    status: "ok",
    ...opts,
  });
}

describe("loadCockpitPulse", () => {
  it("returns an empty pulse when the log doesn't exist", async () => {
    await withoutLog();
    const pulse = await loadCockpitPulse(new Date("2026-05-23T20:00:00Z"));
    expect(pulse.telemetryLogPresent).toBe(false);
    expect(pulse.callsLast24h).toBe(0);
    expect(pulse.todayUsd).toBe(0);
  });

  it("reports calls + errors + cache hit rate over the last 24h", async () => {
    const now = new Date("2026-05-23T20:00:00Z");
    const inWindow = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1h ago
    const oldRow = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 2 days ago
    await withFakeLog([
      row({ ts: inWindow, inputTokens: 100, cacheReadInputTokens: 900 }),
      row({ ts: inWindow, inputTokens: 100, cacheReadInputTokens: 900 }),
      row({ ts: inWindow, status: "error", errorClass: "APIError" }),
      row({ ts: oldRow, inputTokens: 1000 }),
    ]);
    const pulse = await loadCockpitPulse(now);
    expect(pulse.telemetryLogPresent).toBe(true);
    expect(pulse.callsLast24h).toBe(3); // old row excluded
    expect(pulse.errorsLast24h).toBe(1);
    // 1800 cache-read / (200 input + 1800 cache-read) = 0.9
    expect(pulse.cacheHitRate24h).toBeCloseTo(0.9, 5);
  });

  it("sums today's + yesterday's USD spend separately", async () => {
    const now = new Date("2026-05-23T20:00:00Z");
    await withFakeLog([
      row({ ts: "2026-05-22T05:00:00Z", model: "claude-haiku-4-5", inputTokens: 1_000_000 }), // $1 yesterday
      row({ ts: "2026-05-23T05:00:00Z", model: "claude-haiku-4-5", inputTokens: 2_000_000 }), // $2 today
    ]);
    const pulse = await loadCockpitPulse(now);
    expect(pulse.yesterdayUsd).toBeCloseTo(1, 5);
    expect(pulse.todayUsd).toBeCloseTo(2, 5);
  });

  it("collects distinct call sites active in the last 24h", async () => {
    const now = new Date("2026-05-23T20:00:00Z");
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await withFakeLog([
      row({ ts: recent, callSite: "a" }),
      row({ ts: recent, callSite: "a" }),
      row({ ts: recent, callSite: "b" }),
      row({ ts: recent, callSite: "c" }),
    ]);
    const pulse = await loadCockpitPulse(now);
    expect([...pulse.activeCallSites].sort()).toEqual(["a", "b", "c"]);
  });

  it("does not throw on malformed log lines (silently drops them)", async () => {
    const now = new Date("2026-05-23T20:00:00Z");
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await withFakeLog([
      "not valid json",
      row({ ts: recent }),
      "{",
      row({ ts: recent }),
    ]);
    const pulse = await loadCockpitPulse(now);
    expect(pulse.callsLast24h).toBe(2);
  });

  it("cacheHitRate24h is 0 when no input tokens were recorded", async () => {
    const now = new Date("2026-05-23T20:00:00Z");
    const recent = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    await withFakeLog([row({ ts: recent, outputTokens: 100 })]);
    const pulse = await loadCockpitPulse(now);
    expect(pulse.cacheHitRate24h).toBe(0);
  });
});

// ── Component + page integration ─────────────────────────────────────
const repoRoot = resolve(__dirname, "..");

describe("CockpitPulse component", () => {
  const componentSrc = readFileSync(
    resolve(repoRoot, "components/cockpit/cockpit-pulse.tsx"),
    "utf8"
  );

  it("exposes deterministic test ids the layout suite can rely on", () => {
    // Some ids appear as literal data-testid attributes, others as PulseStat
    // testId props — assert the string is present either way.
    for (const id of [
      "cockpit-pulse",
      "cockpit-pulse-calls",
      "cockpit-pulse-cache",
      "cockpit-pulse-today-usd",
      "cockpit-pulse-sites",
      "cockpit-pulse-empty",
      "cockpit-pulse-nav",
    ]) {
      expect(componentSrc).toContain(`"${id}"`);
    }
  });

  it("links to every new operator page from the pulse nav", () => {
    expect(componentSrc).toMatch(/href="\/cockpit\/telemetry"/);
    expect(componentSrc).toMatch(/href="\/cockpit\/source-health"/);
    expect(componentSrc).toMatch(/href="\/cockpit\/brief\/preview"/);
    expect(componentSrc).toMatch(/href="\/cockpit\/review-draft"/);
    expect(componentSrc).toMatch(/href="\/cockpit\/pick-narrator"/);
  });

  it("emits no hype / automation language", () => {
    expect(componentSrc).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });
});

describe("/cockpit page integration", () => {
  const pageSrc = readFileSync(resolve(repoRoot, "app/cockpit/page.tsx"), "utf8");

  it("renders CockpitPulse above the Jarvis assessment", () => {
    expect(pageSrc).toMatch(/CockpitPulse/);
    expect(pageSrc).toMatch(/loadCockpitPulse/);
    // The pulse component should appear before the Jarvis assessment section.
    const pulseIdx = pageSrc.indexOf("<CockpitPulse");
    const jarvisIdx = pageSrc.indexOf('data-testid="jarvis-assessment"');
    expect(pulseIdx).toBeGreaterThan(0);
    expect(jarvisIdx).toBeGreaterThan(pulseIdx);
  });

  it("does NOT remove any existing cockpit testids (the suite depends on them)", () => {
    expect(pageSrc).toMatch(/data-testid="jarvis-assessment"/);
    expect(pageSrc).toMatch(/data-testid="cockpit-public-performance"/);
    expect(pageSrc).toMatch(/data-testid="cockpit-today-picks-list"/);
    expect(pageSrc).toMatch(/data-testid="cockpit-generated-at"/);
  });
});
