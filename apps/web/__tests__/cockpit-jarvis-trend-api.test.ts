import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "..", "app/api/cockpit/jarvis/trend/route.ts"),
  "utf8"
);

describe("/api/cockpit/jarvis/trend — contract", () => {
  it("admin-gated", () => {
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/status:\s*403/);
  });

  it("uses sharedJarvisHistory rather than building a new buffer per request", () => {
    expect(src).toMatch(/sharedJarvisHistory\(\)/);
  });

  it("clamps the limit query parameter at MAX_LIMIT", () => {
    expect(src).toMatch(/MAX_LIMIT/);
    expect(src).toMatch(/Math\.min\(/);
  });

  it("emits no-store cache headers (admin trend is always fresh)", () => {
    // The route DOES set no-store (route.ts:68). `[^"]*` could never match the
    // ordinary object-literal form `"Cache-Control": "no-store"` because a quote
    // sits between the two halves — the assertion failed on correct code. Allow
    // the punctuation that separates a header name from its value.
    expect(src).toMatch(/Cache-Control["'\s:]*no-store/);
  });

  it("never returns 503 — synthesis failures fall back to the existing buffer", () => {
    expect(src).not.toMatch(/status:\s*503/);
  });

  it("does not expose write methods", () => {
    expect(src).not.toMatch(/export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)/);
  });

  it("pushes new assessments best-effort, swallowing errors", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*loadJarvisAssessment[\s\S]*push\(assessment\)[\s\S]*\}\s*catch/);
  });
});
