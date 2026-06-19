import { describe, it, expect, vi } from "vitest";
import {
  coerceScore,
  resolveClearance,
  unhealthyScoreResult,
  type ScoreClearanceRequest,
  type ScoreClearanceResult,
  type ScoreRightsSnapshot,
} from "./score-provider";

// A representative "allowed" snapshot — shape only; values are illustrative.
export const ALLOWED_SNAPSHOT: ScoreRightsSnapshot = {
  source_id: "espn-public-api",
  source_url: "https://site.api.espn.com",
  status: "approved_public_logged_off",
  automation_allowed: true,
  public_logged_off_allowed: true,
  commercial_display_allowed: false,
  storage_allowed: false,
  derived_analytics_allowed: true,
  model_training_allowed: false,
  attribution_required: true,
  attribution_text: "Scores data via ESPN",
  reviewed_at: "2026-06-01T00:00:00.000Z",
  snapshotted_at: "2026-06-19T00:00:00.000Z",
};

const REQUEST: ScoreClearanceRequest = {
  source_id: "espn-public-api",
  mode: "public_logged_off_fact_extract",
  tool_id: "fetch-native",
  intents: ["derived_analytics"],
};

describe("coerceScore", () => {
  it("passes through finite numbers", () => {
    expect(coerceScore(0)).toBe(0);
    expect(coerceScore(27)).toBe(27);
    expect(coerceScore(-3)).toBe(-3);
  });

  it("parses numeric strings as integers", () => {
    expect(coerceScore("20")).toBe(20);
    expect(coerceScore("7")).toBe(7);
  });

  it("returns null for null/undefined/non-finite/garbage", () => {
    expect(coerceScore(null)).toBeNull();
    expect(coerceScore(undefined)).toBeNull();
    expect(coerceScore(NaN)).toBeNull();
    expect(coerceScore(Infinity)).toBeNull();
    expect(coerceScore("not-a-number")).toBeNull();
    expect(coerceScore({})).toBeNull();
  });
});

describe("unhealthyScoreResult", () => {
  it("builds an empty, unhealthy result with the reason and null snapshot by default", () => {
    const r = unhealthyScoreResult("espn-public-api", "clearance-denied");
    expect(r).toEqual({
      provider: "espn-public-api",
      scores: [],
      healthy: false,
      error: "clearance-denied",
      rightsSnapshot: null,
    });
  });

  it("carries a provided snapshot through", () => {
    const r = unhealthyScoreResult("espn-public-api", "http-503", ALLOWED_SNAPSHOT);
    expect(r.rightsSnapshot).toBe(ALLOWED_SNAPSHOT);
    expect(r.healthy).toBe(false);
  });
});

describe("resolveClearance (fail-closed)", () => {
  it("DENIES when no clearance fn is injected (never extracts without a decision)", () => {
    const out = resolveClearance(REQUEST, undefined);
    expect(out.allowed).toBe(false);
    if (!out.allowed) expect(out.reason).toBe("clearance-fn-not-injected");
  });

  it("allows and returns the snapshot when the injected fn allows", () => {
    const fn = vi.fn(
      (): ScoreClearanceResult => ({ allowed: true, rightsSnapshot: ALLOWED_SNAPSHOT }),
    );
    const out = resolveClearance(REQUEST, fn);
    expect(fn).toHaveBeenCalledWith(REQUEST);
    expect(out.allowed).toBe(true);
    if (out.allowed) expect(out.rightsSnapshot).toBe(ALLOWED_SNAPSHOT);
  });

  it("denies (clearance-denied) when the injected fn returns allowed:false", () => {
    const fn = vi.fn((): ScoreClearanceResult => ({ allowed: false, rightsSnapshot: null }));
    const out = resolveClearance(REQUEST, fn);
    expect(out.allowed).toBe(false);
    if (!out.allowed) expect(out.reason).toBe("clearance-denied");
  });

  it("denies (does not propagate) when the injected fn throws", () => {
    const fn = vi.fn((): ScoreClearanceResult => {
      throw new TypeError("registry offline");
    });
    const out = resolveClearance(REQUEST, fn);
    expect(out.allowed).toBe(false);
    if (!out.allowed) expect(out.reason).toBe("clearance-threw:TypeError");
  });
});
