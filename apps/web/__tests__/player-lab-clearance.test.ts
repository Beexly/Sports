import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClearanceRequest, ClearanceResult } from "@/lib/scraping/clearance-engine";

/**
 * Enforcement proof for the Player Production Lab's rights gate.
 *
 * WHY THIS SUITE EXISTS
 * `loadNflversePlayerLab()` is a live, customer-facing extraction job: it fetches
 * the nflverse `player_stats_week` and `rosters` release assets and serves them
 * through the Pro/Elite `/api/nflverse/player-lab` route and the `/players` board.
 * CLAUDE.md's Legal Scraping Posture requires every extraction job to pass
 * `checkClearance()` BEFORE it runs, and requires a result with `allowed=false` to
 * STOP the job. Until this suite landed, the lab called neither `checkClearance()`
 * nor `assertIngestible()` — it was the one nflverse loader in the tree with no
 * rights gate of either kind.
 *
 * WHAT MAKES THESE TESTS PROVE SOMETHING
 * A happy-path test ("the lab loads rows") passes against completely unenforced
 * code and proves nothing. Every assertion below is written against a DENIED
 * clearance and checks the two things a denial must produce: NO network call and
 * NO rows. The intent test goes further — it denies only `commercial_display`, so
 * it fails if the loader ever downgrades to a weaker facts-only intent that would
 * slip a display-restricted source past the gate.
 *
 * All assertions are runtime assertions on purpose: `apps/web/tsconfig.json`
 * excludes the `__tests__` tree, so a type-level assertion here is never checked.
 */

const checkClearanceMock = vi.fn<(request: ClearanceRequest) => ClearanceResult>();

vi.mock("@/lib/scraping/clearance-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/scraping/clearance-engine")>();
  return {
    ...actual,
    checkClearance: (request: ClearanceRequest): ClearanceResult => checkClearanceMock(request),
  };
});

import {
  loadNflversePlayerLab,
  resetNflversePlayerLabCacheForTests,
} from "@/lib/nflverse/player-lab";

function denied(code: string, message: string): ClearanceResult {
  return {
    allowed: false,
    requiresReview: true,
    source_id: "nflverse",
    mode: "open_dataset_ingest",
    tool_id: "fetch-native",
    intents: ["commercial_display", "derived_analytics"],
    blocks: [{ code, message }],
    warnings: [],
    rightsSnapshot: null,
    checkedAt: new Date().toISOString(),
  };
}

function granted(request: ClearanceRequest): ClearanceResult {
  return {
    allowed: true,
    requiresReview: false,
    source_id: request.source_id,
    mode: request.mode,
    tool_id: request.tool_id,
    intents: request.intents,
    blocks: [],
    warnings: [],
    rightsSnapshot: {
      source_id: "nflverse",
      source_url: "https://github.com/nflverse/nflverse-data",
      status: "approved_open_license",
      automation_allowed: true,
      public_logged_off_allowed: true,
      commercial_display_allowed: true,
      storage_allowed: true,
      derived_analytics_allowed: true,
      model_training_allowed: true,
      attribution_required: true,
      attribution_text: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
      reviewed_at: "2026-06-10",
      snapshotted_at: new Date().toISOString(),
    },
    checkedAt: new Date().toISOString(),
  };
}

describe("player lab — clearance is enforced before extraction", () => {
  beforeEach(() => {
    checkClearanceMock.mockReset();
    resetNflversePlayerLabCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNflversePlayerLabCacheForTests();
  });

  it("does not fetch and returns no rows when clearance is denied", async () => {
    checkClearanceMock.mockReturnValue(
      denied("COMMERCIAL_DISPLAY_NOT_ALLOWED", "display not permitted"),
    );
    const fetcher = vi.fn(async () => new Response("should never be requested"));

    const lab = await loadNflversePlayerLab({ season: 2025, fetcher, cacheTtlMs: 0 });

    // THE assertion: a denial stops the job before any network egress.
    expect(fetcher).not.toHaveBeenCalled();
    expect(checkClearanceMock).toHaveBeenCalledTimes(1);

    // ...and produces no data, rather than degrading to a partial/unlabelled board.
    expect(lab.status).toBe("source-error");
    expect(lab.sourceRows).toBe(0);
    expect(lab.seasonRows).toBe(0);
    expect(lab.leaders.RB).toHaveLength(0);
    expect(lab.leaders.WR).toHaveLength(0);
    expect(lab.leaders.TE).toHaveLength(0);
    expect(lab.defenseVsPosition.RB).toHaveLength(0);
    expect(lab.canPublishProjections).toBe(false);
    expect(lab.error).toContain("rights-gated");
    expect(lab.error).toContain("COMMERCIAL_DISPLAY_NOT_ALLOWED");
    expect(lab.blockReason).toContain("rights-gated");
  });

  it("checks clearance BEFORE the first fetch, not after", async () => {
    const order: string[] = [];
    checkClearanceMock.mockImplementation((request) => {
      order.push("clearance");
      return granted(request);
    });
    const fetcher = vi.fn(async () => {
      order.push("fetch");
      return new Response("bad", { status: 404 });
    });

    await loadNflversePlayerLab({ season: 2025, fetcher, cacheTtlMs: 0 });

    expect(order.length).toBeGreaterThan(1);
    expect(order[0]).toBe("clearance");
    expect(order).toContain("fetch");
  });

  it("declares the TRUE customer-display intent, so a display block stops it", async () => {
    // This fake clears a facts-only request but denies commercial_display — exactly
    // the split the registry can express and `assertIngestible` cannot. If the
    // loader ever asks for only `derived_analytics`, this fake ALLOWS, the fetch
    // happens, and this test fails. That is the intent-mismatch defect, caught.
    checkClearanceMock.mockImplementation((request) =>
      request.intents.includes("commercial_display")
        ? denied("COMMERCIAL_DISPLAY_NOT_ALLOWED", "share-alike / display not cleared")
        : granted(request),
    );
    const fetcher = vi.fn(async () => new Response("should never be requested"));

    const lab = await loadNflversePlayerLab({ season: 2025, fetcher, cacheTtlMs: 0 });

    expect(fetcher).not.toHaveBeenCalled();
    expect(lab.status).toBe("source-error");
    expect(lab.leaders.WR).toHaveLength(0);

    const request = checkClearanceMock.mock.calls[0]?.[0];
    expect(request).toBeDefined();
    expect(request?.source_id).toBe("nflverse");
    expect(request?.intents).toContain("commercial_display");
    expect(request?.intents).toContain("derived_analytics");
    expect(request?.tool_id).toBe("fetch-native");
  });

  it("re-checks clearance on every load, so a warm cache cannot outlive the rights", async () => {
    // A gate placed after the cache read would keep serving cached rows for the
    // full TTL after a source's rights were revoked. Prove the gate runs first.
    const csv =
      "player_id,player_name,player_display_name,position,headshot_url,recent_team," +
      "season,week,season_type,opponent_team,attempts,carries,rushing_yards,receptions," +
      "targets,receiving_yards,receiving_air_yards,target_share,air_yards_share,wopr," +
      "fantasy_points_ppr\n";
    const okFetch = vi.fn(async () => new Response(csv, { status: 200 }));
    checkClearanceMock.mockImplementation((request) => granted(request));

    // Warm the module cache through the real global-fetch path.
    vi.stubGlobal("fetch", okFetch);
    await loadNflversePlayerLab({ season: 2025, cacheTtlMs: 60_000 });
    expect(checkClearanceMock).toHaveBeenCalledTimes(1);

    // Rights are revoked between requests.
    checkClearanceMock.mockReturnValue(denied("CEASE_AND_DESIST", "c&d received"));
    const lab = await loadNflversePlayerLab({ season: 2025, cacheTtlMs: 60_000 });

    expect(lab.status).toBe("source-error");
    expect(lab.error).toContain("CEASE_AND_DESIST");
    expect(lab.leaders.WR).toHaveLength(0);
  });
});
