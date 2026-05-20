import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(
  resolve(repoRoot, "app/cockpit/jarvis/trend/page.tsx"),
  "utf8"
);

describe("/cockpit/jarvis/trend page", () => {
  it("inherits the cockpit layout's admin gate (no inline auth check)", () => {
    expect(src).not.toMatch(/role\s*!==\s*["']ADMIN["']/);
    // No standalone auth() import either — the layout owns this.
    expect(src).not.toMatch(/from\s+["']@\/lib\/auth["']/);
  });

  it("uses sharedJarvisHistory (not a fresh buffer per request)", () => {
    expect(src).toMatch(/sharedJarvisHistory\(\)/);
  });

  it("renders JarvisTrend (oldest → newest) to match the documented convention", () => {
    expect(src).toMatch(/JarvisTrend/);
    expect(src).toMatch(/orderedOldFirst|reverse\(\)/);
  });

  it("falls back gracefully when the buffer is empty", () => {
    expect(src).toMatch(/No assessments in the buffer yet/);
  });

  it("notes the buffer is process-local in the page copy", () => {
    expect(src).toMatch(/process-local/);
  });

  it("dynamic = 'force-dynamic' so each render gets a fresh push", () => {
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });
});
