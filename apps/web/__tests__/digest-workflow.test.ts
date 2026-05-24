import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("digest workflow", () => {
  it("daily-digest.yml exists", async () => {
    const p = path.resolve(__dirname, "../../../.github/workflows/daily-digest.yml");
    await expect(fs.access(p)).resolves.not.toThrow();
  });

  it("generate-digest.mjs exists", async () => {
    const p = path.resolve(__dirname, "../../../scripts/generate-digest.mjs");
    await expect(fs.access(p)).resolves.not.toThrow();
  });

  it("extractChangelogSlice returns empty string when no date headers match", async () => {
    const { extractChangelogSlice } = await import("../../../scripts/generate-digest.mjs");
    const tmpPath = path.join(os.tmpdir(), `changelog-${Date.now()}.md`);
    await fs.writeFile(tmpPath, "## 1999-01-01\n\nSome old entry\n");
    const result = await extractChangelogSlice(tmpPath, 24);
    expect(result).toBe("");
    await fs.unlink(tmpPath).catch(() => {});
  });

  it("generateDigest writes stub file when ANTHROPIC_API_KEY is not set", async () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { generateDigest } = await import("../../../scripts/generate-digest.mjs");
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "digest-test-"));
    const outputPath = path.join(tmpDir, "2026-05-24.md");

    try {
      await generateDigest("", outputPath);
      const content = await fs.readFile(outputPath, "utf8");
      expect(content).toContain("# Galaxy Sports Edge — Daily Digest");
    } finally {
      if (origKey !== undefined) process.env.ANTHROPIC_API_KEY = origKey;
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("output file contains Galaxy Sports Edge header", async () => {
    const { generateDigest } = await import("../../../scripts/generate-digest.mjs");
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "digest-test-"));
    const outputPath = path.join(tmpDir, "test-digest.md");
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await generateDigest("some content", outputPath);
      const content = await fs.readFile(outputPath, "utf8");
      expect(content).toContain("# Galaxy Sports Edge — Daily Digest");
    } finally {
      if (origKey !== undefined) process.env.ANTHROPIC_API_KEY = origKey;
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
