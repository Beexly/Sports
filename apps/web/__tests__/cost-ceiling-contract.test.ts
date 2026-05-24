import { computeDailyCost, isOverCeiling } from "../../../scripts/guardrails/cost-ceiling.mjs";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, afterEach } from "vitest";

describe("cost-ceiling guardrail contract", () => {
  const tempFiles: string[] = [];

  async function makeTempFile(content: string): Promise<string> {
    const filePath = path.join(os.tmpdir(), crypto.randomUUID() + ".jsonl");
    await fs.writeFile(filePath, content, "utf8");
    tempFiles.push(filePath);
    return filePath;
  }

  afterEach(async () => {
    for (const file of tempFiles.splice(0)) {
      await fs.unlink(file).catch(() => undefined);
    }
  });

  it("exports computeDailyCost and isOverCeiling without error", () => {
    expect(typeof computeDailyCost).toBe("function");
    expect(typeof isOverCeiling).toBe("function");
  });

  it("computeDailyCost returns 0 for a nonexistent log path", async () => {
    const nonExistentPath = path.join(
      os.tmpdir(),
      "definitely-does-not-exist-" + crypto.randomUUID() + ".jsonl"
    );
    const cost = await computeDailyCost(nonExistentPath);
    expect(cost).toBe(0);
  });

  it("isOverCeiling returns false for an empty log file", async () => {
    const filePath = await makeTempFile("");
    const over = await isOverCeiling(filePath, 5.0);
    expect(over).toBe(false);
  });

  it("isOverCeiling returns true when synthetic entry totals > $5.00 against a $5.00 ceiling", async () => {
    // claude-opus-4-5: in=$15/M, out=$75/M
    // 100k input tokens  = 0.1M * $15 = $1.50
    // 100k output tokens = 0.1M * $75 = $7.50
    // total = $9.00 → over $5.00
    const entry = {
      model: "claude-opus-4-5",
      inputTokens: 100_000,
      outputTokens: 100_000,
      timestamp: new Date().toISOString(),
    };
    const filePath = await makeTempFile(JSON.stringify(entry) + "\n");
    const over = await isOverCeiling(filePath, 5.0);
    expect(over).toBe(true);
  });

  it("24h window correctly excludes entries older than 86,400,000ms", async () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const entry = {
      model: "claude-opus-4-5",
      inputTokens: 100_000,
      outputTokens: 100_000,
      timestamp: twentyFiveHoursAgo,
    };
    const filePath = await makeTempFile(JSON.stringify(entry) + "\n");
    const cost = await computeDailyCost(filePath);
    expect(cost).toBe(0);
    const over = await isOverCeiling(filePath, 5.0);
    expect(over).toBe(false);
  });
});
