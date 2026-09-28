/**
 * GET /api/cron/generate-drafts — route contract.
 *
 * The defect this pins. The route builds four independent drafts (daily,
 * weeklyRecap, quietBoard, honestRecord). Three of the four are wrapped in
 * isolated catches that log to console.error and leave the outcome `null` —
 * deliberately, so a failed Monday recap cannot take down the daily brief. But
 * the response was an unconditional `ok: true` on a 200, so a cycle where
 * EVERY generator failed answered 200 with:
 *
 *   { ok: true, daily: null, weeklyRecap: null, quietBoard: null,
 *     honestRecord: null }
 *
 * This is the content lane, so "no drafts were generated" is a customer-visible
 * absence, not an internal metric — the most consequential instance of the
 * 200-shaped failure fixed in the four sibling crons. The isolation stays; the
 * invisibility does not.
 *
 * The draft-only guarantee is separate and is pinned here too: nothing in this
 * route may set a published status. `publishedAt` stays null and status stays
 * DRAFT, because publishing is a human action through the cockpit review flow.
 * The `scripts/guardrails/draft-only.mjs` CI guard enforces it mechanically;
 * these tests assert the route does not become the thing that breaks it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const contentDraftCreate = vi.fn();
const contentDraftFindFirst = vi.fn();
const gameCount = vi.fn();
const pickCount = vi.fn();
const getReadinessGates = vi.fn();
const boardSurfacePosture = vi.fn();
const classifyPublicDarkHint = vi.fn();
const buildDailyBriefDraft = vi.fn();
const buildWeeklyRecapDraft = vi.fn();
const buildWhyBoardQuietDraft = vi.fn();
const buildHonestRecordDraft = vi.fn();
const rotateKillLedgerFeature = vi.fn();
const rotateBookGradeHighlight = vi.fn();
const contentDraftToCreateData = vi.fn();

vi.mock("@/lib/cron/authorize", () => ({ cronAuthError: () => null }));
vi.mock("@sports/db", () => ({
  db: {
    contentDraft: {
      create: (...a: unknown[]) => contentDraftCreate(...a),
      findFirst: (...a: unknown[]) => contentDraftFindFirst(...a),
    },
    game: { count: (...a: unknown[]) => gameCount(...a) },
    pick: { count: (...a: unknown[]) => pickCount(...a) },
  },
}));
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: (...a: unknown[]) => getReadinessGates(...a),
}));
vi.mock("@/lib/content-engine/build-draft", () => ({
  buildDailyBriefDraft: (...a: unknown[]) => buildDailyBriefDraft(...a),
  buildWeeklyRecapDraft: (...a: unknown[]) => buildWeeklyRecapDraft(...a),
  buildWhyBoardQuietDraft: (...a: unknown[]) => buildWhyBoardQuietDraft(...a),
}));
vi.mock("@/lib/content-engine/honest-record", () => ({
  buildHonestRecordDraft: (...a: unknown[]) => buildHonestRecordDraft(...a),
  rotateKillLedgerFeature: (...a: unknown[]) => rotateKillLedgerFeature(...a),
  rotateBookGradeHighlight: (...a: unknown[]) => rotateBookGradeHighlight(...a),
}));
vi.mock("@/lib/board/board-surface-policy", () => ({
  boardSurfacePosture: (...a: unknown[]) => boardSurfacePosture(...a),
}));
vi.mock("@/lib/public/dark-reason", () => ({
  classifyPublicDarkHint: (...a: unknown[]) => classifyPublicDarkHint(...a),
}));
vi.mock("@/lib/content-engine/persist-draft", () => ({
  contentDraftToCreateData: (...a: unknown[]) => contentDraftToCreateData(...a),
}));

const RECORD = { slug: "x", title: "t", body: "b", status: "DRAFT" };

async function invoke(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/app/api/cron/generate-drafts/route");
  return (await mod.GET(new Request("http://localhost/api/cron/generate-drafts"))) as Response;
}

describe("GET /api/cron/generate-drafts", () => {
  beforeEach(() => {
    for (const m of [
      contentDraftCreate,
      contentDraftFindFirst,
      gameCount,
      pickCount,
      getReadinessGates,
      boardSurfacePosture,
      classifyPublicDarkHint,
      buildDailyBriefDraft,
      buildWeeklyRecapDraft,
      buildWhyBoardQuietDraft,
      buildHonestRecordDraft,
      rotateKillLedgerFeature,
      rotateBookGradeHighlight,
      contentDraftToCreateData,
    ]) {
      m.mockReset();
    }
    // Healthy: nothing exists yet, every builder works, every create lands.
    contentDraftFindFirst.mockResolvedValue(null);
    contentDraftCreate.mockResolvedValue({ id: "d1" });
    gameCount.mockResolvedValue(5);
    // Per-slug answers, so ONE generator can be made to skip or fail while the
    // others still produce. A blanket `null` (nothing exists) or a blanket
    // non-null (everything already exists) cannot express "the daily landed but
    // the quiet board half-failed", which is the state under test.
    contentDraftFindFirst.mockImplementation(({ where }: { where?: { slug?: string } }) => {
      const slug = where?.slug ?? "";
      if (slug.startsWith("why-board-quiet")) return Promise.resolve(null);
      if (slug.startsWith("daily-slate-brief")) return Promise.resolve(null);
      if (slug.startsWith("honest-record")) return Promise.resolve(null);
      // weekly-transparency-recap only runs on Mondays; resolve to "exists" so
      // the suite does not depend on the day it is run.
      return Promise.resolve({ id: "existing" });
    });
    pickCount.mockResolvedValue(3);
    getReadinessGates.mockReturnValue({ canExposePerformanceStats: true });
    boardSurfacePosture.mockReturnValue({ surface: "board" });
    classifyPublicDarkHint.mockReturnValue("test");
    for (const b of [
      buildDailyBriefDraft,
      buildWeeklyRecapDraft,
      buildWhyBoardQuietDraft,
      buildHonestRecordDraft,
    ]) {
      b.mockReturnValue(RECORD);
    }
    rotateKillLedgerFeature.mockReturnValue({ kind: "kill" });
    rotateBookGradeHighlight.mockReturnValue({ kind: "grade" });
    contentDraftToCreateData.mockReturnValue({ slug: "x" });
  });

  it("a HEALTHY cycle is a 200 with ok=true — the positive control", async () => {
    const res = await invoke();
    const body = (await res.json()) as { ok: boolean; coverage: { produced: number } };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.coverage.produced).toBeGreaterThan(0);
  });

  it("a cycle where the ONLY reachable generator SILENTLY failed is NOT a 200", async () => {
    // The defect, driven through the real mechanism.
    //
    // PROBED first, and the probe corrected the premise: the route CONSTRUCTS
    // each `DraftOutcome` itself (`return { slug, created: true, reason }`), so a
    // builder cannot hand back a half-failed outcome. Silent failure has exactly
    // one real shape here — the isolated catches around the optional three
    // leave their outcome `null` after logging to console.error. That null is
    // what the old unconditional `ok: true` reported as success.
    //
    // So the state under test is: the daily brief legitimately SKIPS (its slug
    // already exists), and the three OPTIONAL generators reach their builders,
    // which THROW into the isolated catches and leave their outcome null. So
    // nothing was produced by this cycle and those generators failed silently.
    //
    // The `findFirst`-before-builder order is the subtlety: a slug that already
    // exists returns early and never reaches the builder, so it SKIPS instead of
    // failing. Only the optional generators must be absent, so their builders
    // actually run. That was the thing my first two drafts of this test got
    // wrong in opposite directions.
    contentDraftFindFirst.mockImplementation(({ where }: { where?: { slug?: string } }) => {
      const slug = where?.slug ?? "";
      // daily-slate-brief and weekly-transparency-recap already exist -> skip.
      if (slug.startsWith("daily-slate-brief")) return Promise.resolve({ id: "existing" });
      if (slug.startsWith("weekly-transparency-recap")) return Promise.resolve({ id: "existing" });
      // The optional ones do not exist yet -> they run, then throw.
      return Promise.resolve(null);
    });
    for (const b of [buildWhyBoardQuietDraft, buildHonestRecordDraft]) {
      b.mockImplementation(() => {
        throw new Error("builder failed");
      });
    }
    pickCount.mockResolvedValue(0);
    const res = await invoke();
    const body = (await res.json()) as {
      ok: boolean;
      daily: { created: boolean; skipped?: boolean } | null;
      quietBoard: unknown;
      coverage: { produced: number; notRun: number; verdict: string };
    };
    // Printed so a future failure is diagnosable from the test output alone
    // rather than requiring a re-probe. This run: the daily brief LEGITIMATELY
    // SKIPS (its slug already exists), and the optional three all fail into
    // their isolated catches, so nothing was produced BY THIS CYCLE.
    console.log("PROBE daily:", JSON.stringify(body.daily), "coverage:", JSON.stringify(body.coverage));
    // The daily brief legitimately skipped (already generated today).
    expect(body.coverage.produced).toBe(0);
    // And at least one generator came back null — the silent failure.
    expect(body.coverage.notRun).toBeGreaterThan(0);
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
    expect(body.coverage.verdict).toMatch(/FAILED|NOTHING PRODUCED/i);
  });

  it("a cycle that PRODUCED a draft stays 200 even if an optional one failed", async () => {
    // The other side, and the reason the fix is not a blanket 503: the daily
    // brief landing IS the job being done. A failed optional generator is
    // reported as PARTIAL and must not turn a working content cycle red.
    // Real mechanism again: the daily brief produces (no existing draft), and
    // the quiet-board builder throws into its isolated catch (outcome null).
    contentDraftFindFirst.mockImplementation(({ where }: { where?: { slug?: string } }) => {
      const slug = where?.slug ?? "";
      if (slug.startsWith("weekly-transparency-recap")) return Promise.resolve({ id: "existing" });
      return Promise.resolve(null); // daily brief runs and produces
    });
    pickCount.mockResolvedValue(0); // let the quiet-board path proceed
    buildWhyBoardQuietDraft.mockImplementation(() => {
      throw new Error("quiet board builder failed");
    });
    const res = await invoke();
    const body = (await res.json()) as {
      ok: boolean;
      coverage: { produced: number; silentlyFailed: number; notRun: number; verdict: string };
    };
    expect(body.coverage.produced).toBeGreaterThan(0);
    // The quiet board came back null: one generator silently failed.
    expect(body.coverage.notRun).toBeGreaterThan(0);
    expect(body.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it("never sets a PUBLISHED status — the draft-only guarantee", async () => {
    await invoke();
    // Every draft that leaves this route must be a DRAFT with no publishedAt.
    // Publishing is a human action through the cockpit review flow; if a cron
    // ever started publishing, that would be the worst possible regression in
    // this file and no status code would reveal it.
    for (const call of contentDraftCreate.mock.calls) {
      const arg = call[0] as { data?: Record<string, unknown> };
      const data = arg?.data ?? {};
      if (data["status"] !== undefined) {
        expect(String(data["status"]).toUpperCase()).not.toBe("PUBLISHED");
      }
      if (data["publishedAt"] !== undefined) {
        expect(data["publishedAt"]).toBeNull();
      }
    }
  });

  it("a RACED unique-slug create is treated as already-generated, not a crash", async () => {
    // Prisma P2002 between findFirst and create. The route documents this as
    // "already generated" rather than a 500, so overlapping invocations both
    // return the skipped shape.
    contentDraftCreate.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await invoke();
    const body = (await res.json()) as { daily: { created: boolean; skipped?: boolean } };
    expect(res.status).toBe(200);
    expect(body.daily.created).toBe(false);
    expect(body.daily.skipped).toBe(true);
  });
});
