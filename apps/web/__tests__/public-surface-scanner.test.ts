import { scanPublicSurface } from "../../../scripts/guardrails/public-surface-scanner.mjs";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, afterEach } from "vitest";

let tmpDir: string | null = null;

afterEach(async () => {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
});

describe("scanPublicSurface", () => {
  it("returns an empty array for a clean temp directory", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
    const appDir = path.join(tmpDir, "apps", "web", "app");
    await fs.mkdir(appDir, { recursive: true });

    await fs.writeFile(
      path.join(appDir, "clean.tsx"),
      `export default function Page() {
  return <div>Welcome to our picks platform. All picks are data-driven.</div>;
}
`
    );

    const results = await scanPublicSurface(tmpDir);
    expect(results).toEqual([]);
  });

  it("returns one violation when a tsx file contains 'guaranteed picks'", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
    const appDir = path.join(tmpDir, "apps", "web", "app");
    await fs.mkdir(appDir, { recursive: true });

    await fs.writeFile(
      path.join(appDir, "violation.tsx"),
      `export default function Page() {
  return <div>These are guaranteed picks you can trust.</div>;
}
`
    );

    const results = await scanPublicSurface(tmpDir);
    expect(results).toHaveLength(1);

    const violation = results[0];
    expect(violation).toHaveProperty("ruleId");
    expect(violation).toHaveProperty("match");
    expect(violation).toHaveProperty("line");
    expect(violation).toHaveProperty("file");
    expect(violation.ruleId).toBe("BS-SCAN-01");
    expect(violation.match.toLowerCase()).toContain("guaranteed");
    expect(violation.line).toBe(2);
  });

  it("returns zero violations for 'guaranteed' inside a __tests__/ subdirectory", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
    const appDir = path.join(tmpDir, "apps", "web", "app");
    const testsDir = path.join(appDir, "__tests__");
    await fs.mkdir(testsDir, { recursive: true });

    await fs.writeFile(
      path.join(testsDir, "something.tsx"),
      `// This file is in __tests__ and should be skipped
const phrase = "guaranteed picks for tests";
`
    );

    const results = await scanPublicSurface(tmpDir);
    expect(results).toEqual([]);
  });

  it("result objects have the correct shape: { file, line, match, ruleId }", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "scanner-test-"));
    const componentsDir = path.join(tmpDir, "apps", "web", "components");
    await fs.mkdir(componentsDir, { recursive: true });

    await fs.writeFile(
      path.join(componentsDir, "hero.tsx"),
      `export function Hero() {
  return <h1>Free money awaits with our picks!</h1>;
}
`
    );

    const results = await scanPublicSurface(tmpDir);
    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(typeof result.file).toBe("string");
      expect(typeof result.line).toBe("number");
      expect(typeof result.match).toBe("string");
      expect(typeof result.ruleId).toBe("string");
      // Ensure no extra unexpected keys beyond the four required ones
      expect(Object.keys(result).sort()).toEqual(
        ["file", "line", "match", "ruleId"].sort()
      );
    }
  });
});
