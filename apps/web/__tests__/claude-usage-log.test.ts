import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCHEMA = resolve(REPO_ROOT, "packages/db/prisma/schema.prisma");
const TELEMETRY_LIB = resolve(__dirname, "..", "lib/ai/telemetry.ts");
const TELEMETRY_SUMMARY = resolve(__dirname, "..", "lib/cockpit/telemetry-summary.ts");
const TELEMETRY_ROUTE = resolve(__dirname, "..", "app/api/cockpit/telemetry/route.ts");

describe("ClaudeUsageLog Prisma model", () => {
  const schema = readFileSync(SCHEMA, "utf8");

  it("model ClaudeUsageLog exists in schema", () => {
    expect(schema).toMatch(/model ClaudeUsageLog/);
  });

  it("maps to claude_usage_logs table", () => {
    expect(schema).toMatch(/@@map\("claude_usage_logs"\)/);
  });

  it("has all required telemetry fields", () => {
    expect(schema).toMatch(/callSite\s+String/);
    expect(schema).toMatch(/inputTokens\s+Int/);
    expect(schema).toMatch(/cacheCreationInputTokens\s+Int/);
    expect(schema).toMatch(/cacheReadInputTokens\s+Int/);
    expect(schema).toMatch(/outputTokens\s+Int/);
    expect(schema).toMatch(/latencyMs\s+Int/);
    expect(schema).toMatch(/status\s+String/);
    expect(schema).toMatch(/errorClass\s+String\?/);
  });

  it("has ts (DateTime) + createdAt (DateTime) indexed", () => {
    expect(schema).toMatch(/ts\s+DateTime/);
    expect(schema).toMatch(/@@index\(\[ts\]\)/);
    expect(schema).toMatch(/@@index\(\[callSite, ts\]\)/);
  });
});

describe("withTelemetry DB persistence", () => {
  const src = readFileSync(TELEMETRY_LIB, "utf8");

  it("imports isStubMode from @sports/db", () => {
    expect(src).toMatch(/isStubMode/);
    expect(src).toMatch(/@sports\/db/);
  });

  it("calls db.claudeUsageLog.create when not in stub mode", () => {
    expect(src).toMatch(/db\.claudeUsageLog\.create/);
    expect(src).toMatch(/isStubMode\(\)/);
  });

  it("wraps the DB write in try/catch so failures never crash callers", () => {
    // The DB create must sit inside a try block
    const createIdx = src.indexOf("db.claudeUsageLog.create");
    const tryBefore = src.lastIndexOf("try {", createIdx);
    const catchAfter = src.indexOf("} catch {", createIdx);
    expect(tryBefore).toBeGreaterThan(-1);
    expect(catchAfter).toBeGreaterThan(createIdx);
  });

  it("still writes to the file (VERCEL guard intact)", () => {
    expect(src).toMatch(/VERCEL/);
    expect(src).toMatch(/appendFile/);
  });

  it("never blocks on DB when isStubMode is true", () => {
    // The DB create must be guarded by the !isStubMode() check
    const guardIdx = src.indexOf("!isStubMode()");
    const createIdx = src.indexOf("db.claudeUsageLog.create");
    expect(guardIdx).toBeLessThan(createIdx);
  });
});

describe("readTelemetryFromDb", () => {
  const src = readFileSync(TELEMETRY_SUMMARY, "utf8");

  it("exports readTelemetryFromDb", () => {
    expect(src).toMatch(/export async function readTelemetryFromDb/);
  });

  it("queries claudeUsageLog.findMany with a ts gte cutoff", () => {
    expect(src).toMatch(/claudeUsageLog\.findMany/);
    expect(src).toMatch(/ts.*gte/);
  });

  it("maps DB rows to TelemetryRow (ts is ISO string)", () => {
    expect(src).toMatch(/\.toISOString\(\)/);
  });

  it("returns empty array on error (best-effort)", () => {
    expect(src).toMatch(/return \[\]/);
  });
});

describe("telemetry route DB-first path", () => {
  const src = readFileSync(TELEMETRY_ROUTE, "utf8");

  it("imports isStubMode from @sports/db", () => {
    expect(src).toMatch(/isStubMode/);
    expect(src).toMatch(/@sports\/db/);
  });

  it("imports readTelemetryFromDb from the summary lib", () => {
    expect(src).toMatch(/readTelemetryFromDb/);
  });

  it("uses DB path when not in stub mode", () => {
    expect(src).toMatch(/!isStubMode\(\)/);
    expect(src).toMatch(/readTelemetryFromDb/);
  });

  it("falls back to file when in stub mode", () => {
    expect(src).toMatch(/parseTelemetryLog/);
    expect(src).toMatch(/readFile/);
  });

  it("response meta carries a source field", () => {
    expect(src).toMatch(/source.*db/);
    expect(src).toMatch(/source.*file/);
  });

  it("still exports dynamic = force-dynamic", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
  });
});
