import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/jarvis/route.ts");

describe("/api/cockpit/jarvis — admin gating + shape", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("imports auth() and enforces ADMIN", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/status:\s*403/);
  });

  it("uses loadJarvisAssessment (not a re-implementation)", () => {
    expect(src).toMatch(/loadJarvisAssessment/);
  });

  it("emits the JARVIS_VERSION on every response", () => {
    expect(src).toMatch(/JARVIS_VERSION/);
  });

  it("never returns 503 — failures fall back to a 200 error envelope", () => {
    // Read-only spec: callers (cron, monitoring) shouldn't need to
    // distinguish transport from synthesis failures.
    expect(src).not.toMatch(/status:\s*503/);
  });

  it("sets Cache-Control: no-store so monitoring callers always see fresh data", () => {
    expect(src).toMatch(/Cache-Control[^"]*no-store/);
  });

  it("does not call write APIs (no PATCH/POST/DELETE/PUT export)", () => {
    expect(src).not.toMatch(/export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)/);
  });

  it("wraps the synthesizer call in try/catch so a failure becomes a 200 error envelope", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*loadJarvisAssessment[\s\S]*\}\s*catch/);
    // The catch branch must still return JSON.
    expect(src).toMatch(/catch[\s\S]*NextResponse\.json/);
  });

  it("does not access db.* directly (delegates to the loader)", () => {
    // The endpoint must NOT import @sports/db. The loader handles that.
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
  });

  it("emits no auto-bet, auto-publish, or hype words anywhere in the file", () => {
    expect(src).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });

  it("happy-path response includes version + assessment + performancePolicy keys", () => {
    // The admin dashboard probe reads `body.assessment?.launchStatus`.
    // Make sure the keys are present in the success branch by matching
    // the JSON shape literally.
    expect(src).toMatch(/version:\s*JARVIS_VERSION/);
    expect(src).toMatch(/assessment,/);
    expect(src).toMatch(/performancePolicy,/);
  });

  it("error envelope keeps the same top-level shape (null assessment + error string)", () => {
    expect(src).toMatch(/assessment:\s*null/);
    expect(src).toMatch(/performancePolicy:\s*null/);
    expect(src).toMatch(/error:\s*message/);
  });
});
