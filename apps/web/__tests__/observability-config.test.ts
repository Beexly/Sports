import { describe, expect, it } from "vitest";
import {
  resolveReplaySampleRate,
  resolveTracesSampleRate,
} from "@/lib/observability/sample-rate";
import { buildVercelCronsConfig } from "@/lib/observability/vercel-crons";

// Telemetry wiring: Sentry sample-rate defaults (prod traces 0.15, dev 1.0,
// validated env override) and the pure vercel.json -> crons-config builder
// that feeds the SDK's runtime Vercel Cron check-in hooks.
describe("resolveTracesSampleRate", () => {
  it("defaults to 0.15 in production", () => {
    expect(resolveTracesSampleRate({ NODE_ENV: "production" })).toBe(0.15);
    expect(resolveTracesSampleRate({})).toBe(0.15);
    expect(resolveTracesSampleRate({ NODE_ENV: "test" })).toBe(0.15);
  });

  it("defaults to 1.0 in development", () => {
    expect(resolveTracesSampleRate({ NODE_ENV: "development" })).toBe(1.0);
  });

  it("honours a valid env override in any environment", () => {
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "0.5", NODE_ENV: "production" }),
    ).toBe(0.5);
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "0", NODE_ENV: "development" }),
    ).toBe(0);
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "1", NODE_ENV: "production" }),
    ).toBe(1);
  });

  it("falls back to the default for invalid overrides instead of emitting NaN", () => {
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "abc", NODE_ENV: "production" }),
    ).toBe(0.15);
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "1.5", NODE_ENV: "production" }),
    ).toBe(0.15);
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "-0.2", NODE_ENV: "production" }),
    ).toBe(0.15);
    expect(
      resolveTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "  ", NODE_ENV: "development" }),
    ).toBe(1.0);
  });
});

describe("resolveReplaySampleRate", () => {
  it("defaults to 0.1 and honours a valid override", () => {
    expect(resolveReplaySampleRate({})).toBe(0.1);
    expect(resolveReplaySampleRate({ SENTRY_REPLAY_SAMPLE_RATE: "0.25" })).toBe(0.25);
    expect(resolveReplaySampleRate({ SENTRY_REPLAY_SAMPLE_RATE: "nope" })).toBe(0.1);
  });
});

describe("buildVercelCronsConfig", () => {
  it("extracts valid crons as the JSON string the SDK global expects", () => {
    const raw = JSON.stringify({
      crons: [
        { path: "/api/cron/refresh-odds", schedule: "*/15 * * * *" },
        { path: "/api/cron/settle-picks", schedule: "20 * * * *" },
      ],
    });
    expect(buildVercelCronsConfig(raw)).toBe(
      JSON.stringify([
        { path: "/api/cron/refresh-odds", schedule: "*/15 * * * *" },
        { path: "/api/cron/settle-picks", schedule: "20 * * * *" },
      ]),
    );
  });

  it("drops invalid entries but keeps the valid ones", () => {
    const raw = JSON.stringify({
      crons: [
        { path: "/api/cron/good", schedule: "0 * * * *" },
        { path: "", schedule: "0 * * * *" },
        { path: "/api/cron/no-schedule" },
        { path: 42, schedule: "0 * * * *" },
        null,
        "not-an-object",
      ],
    });
    expect(buildVercelCronsConfig(raw)).toBe(
      JSON.stringify([{ path: "/api/cron/good", schedule: "0 * * * *" }]),
    );
  });

  it("returns undefined for malformed JSON, missing crons, or an empty valid set", () => {
    expect(buildVercelCronsConfig("{not json")).toBeUndefined();
    expect(buildVercelCronsConfig(JSON.stringify({}))).toBeUndefined();
    expect(buildVercelCronsConfig(JSON.stringify({ crons: [] }))).toBeUndefined();
    expect(buildVercelCronsConfig(JSON.stringify({ crons: "nope" }))).toBeUndefined();
    expect(buildVercelCronsConfig("null")).toBeUndefined();
    expect(
      buildVercelCronsConfig(JSON.stringify({ crons: [{ path: "  ", schedule: " " }] })),
    ).toBeUndefined();
  });
});