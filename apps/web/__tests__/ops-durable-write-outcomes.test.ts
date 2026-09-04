import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: durable OPS control writes must report whether they landed.
 *
 * `persistRankingPauseApply` and `persistProvenPathPlan` both ended in a bare
 * "best-effort" catch and returned `void`, so a failed write was byte-identical
 * to a successful one. Every caller discarded the (absent) result:
 *
 *   - POST /api/ops/ranking-pause-apply answered a hard-coded
 *     `{ ok: true, durable: snap }`, echoing back a SUPPRESSION control the
 *     founder believes is live in every isolate while nothing was stored;
 *   - the calibration-metrics cron and proven-path-seed both reported a healthy
 *     cycle while the selective-publish pause list and the FOUNDING → PROVEN
 *     proof gate silently kept running on the previous plan.
 *
 * These assertions check the failure is RECORDED and PROPAGATED. Asserting
 * "resolves without throwing" would pass against the broken code too.
 */

const createMock = vi.fn();
const findFirstMock = vi.fn();
const stubMock = vi.fn(() => false);

vi.mock("@sports/db", () => ({
  isStubMode: () => stubMock(),
  db: {
    jarvisMemoryEvent: {
      create: (...args: unknown[]) => createMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

vi.mock("@/lib/cron/authorize", () => ({
  cronAuthError: () => null,
}));

vi.mock("@/lib/calibration/selective-publish-runtime", () => ({
  clearSelectiveRuntimeCaches: () => undefined,
}));

import {
  loadRankingPauseApply,
  persistRankingPauseApply,
  type RankingPauseDurableSnap,
} from "@/lib/ops/ranking-pause-durable";
import {
  loadProvenPathPlan,
  persistProvenPathPlan,
} from "@/lib/ops/proven-path-durable";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { POST as rankingPausePost } from "@/app/api/ops/ranking-pause-apply/route";

const BOOM = new Error("P1001: Can't reach database server");

const SNAP: RankingPauseDurableSnap = {
  enabled: true,
  groups: ["nfl:spread", "nba:total"],
  setAt: "2026-08-25T00:00:00.000Z",
  setBy: "founder",
  note: "Founder-yes pause apply.",
};

const PLAN = {
  generatedAt: "2026-08-25T00:00:00.000Z",
  bestScore: 0.41,
  baseline: { murphyResolution: 0.02 },
  selectiveGainRes: 0.004,
  pauseGroups: ["nfl:spread"],
  defaultDelta: 0.05,
} as unknown as ProvenPathPlan;

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  createMock.mockReset();
  findFirstMock.mockReset();
  stubMock.mockReset();
  stubMock.mockReturnValue(false);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

function loggedText(): string {
  return errorSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
}

describe("persistRankingPauseApply reports its outcome", () => {
  it("returns 'error' and logs the cause when the write rejects", async () => {
    createMock.mockRejectedValue(BOOM);

    const result = await persistRankingPauseApply(SNAP);

    expect(result).toBe("error");
    expect(errorSpy).toHaveBeenCalled();
    expect(loggedText()).toMatch(/persistRankingPauseApply FAILED/);
    expect(loggedText()).toMatch(/Can't reach database server/);
  });

  it("returns 'ok' and logs nothing on a successful write", async () => {
    createMock.mockResolvedValue({ id: "evt_1" });

    await expect(persistRankingPauseApply(SNAP)).resolves.toBe("ok");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns 'stub' without touching the database in stub mode", async () => {
    stubMock.mockReturnValue(true);

    await expect(persistRankingPauseApply(SNAP)).resolves.toBe("stub");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("distinguishes a failed read from a genuine absence on load", async () => {
    // Both answers are `null` — that is the loader's whole contract — so the
    // LOG is what separates "no pause set" from "the database could not
    // answer". `loadRankingPauseApply` is now a thin wrapper over the single
    // reader, so the line names `readRankingPauseApply`.
    findFirstMock.mockResolvedValue(null);
    await expect(loadRankingPauseApply()).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();

    findFirstMock.mockRejectedValue(BOOM);
    await expect(loadRankingPauseApply()).resolves.toBeNull();
    expect(loggedText()).toMatch(/readRankingPauseApply FAILED/);
    expect(loggedText()).toMatch(/not proof of absence/);
  });
});

describe("POST /api/ops/ranking-pause-apply refuses to claim a pause it did not store", () => {
  function request(): Request {
    return new Request("http://localhost/api/ops/ranking-pause-apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, groups: ["nfl:spread"], setBy: "founder" }),
    });
  }

  it("answers 500 with ok:false when the durable write fails", async () => {
    // loadProvenPathPlan (called for the default pause groups) and the durable
    // write share the same mocked delegate; the body supplies groups explicitly.
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(BOOM);

    const res = await rankingPausePost(request());
    const body = (await res.json()) as { ok: boolean; persist?: string; error?: string };

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.persist).toBe("error");
    expect(String(body.error)).toMatch(/NOT applied/);
  });

  it("still answers 200/ok when the durable write lands", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "evt_1" });

    const res = await rankingPausePost(request());
    const body = (await res.json()) as { ok: boolean; persist?: string };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.persist).toBe("ok");
  });

  it("refuses ok:true in stub mode, where nothing was written at all", async () => {
    // "stub" is not a softer "ok": no DATABASE_URL means no row now and no row
    // on retry. A 200/ok here would tell the founder a suppression control is
    // live in every isolate while none of them can see it — the exact defect
    // this route was fixed for, one state over.
    stubMock.mockReturnValue(true);

    const res = await rankingPausePost(request());
    const body = (await res.json()) as { ok: boolean; persist?: string; error?: string };

    expect(res.status).toBe(503); // distinct from 500: retrying cannot help
    expect(body.ok).toBe(false);
    expect(body.persist).toBe("stub");
    expect(String(body.error)).toMatch(/NOT stored/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("cannot be made to forge a log record through setBy", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(BOOM);

    const forged =
      "founder\n[ops:ranking-pause] persistRankingPauseApply OK (enabled=true): stored";
    const res = await rankingPausePost(
      new Request("http://localhost/api/ops/ranking-pause-apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true, groups: ["nfl:spread"], setBy: forged }),
      }),
    );

    expect(res.status).toBe(500);

    const records = errorSpy.mock.calls.map((c) => c.map(String).join(" "));
    // Exactly ONE record, and it is the real failure. The forged text survives
    // inside it as inert payload — flattening does not delete the caller's
    // string, it denies the newline that would have made it a record of its
    // own. That is the whole of the exploit.
    expect(records).toHaveLength(1);
    expect(records[0]).not.toContain("\n");
    expect(records[0]).toMatch(/^\[ops:ranking-pause\] persistRankingPauseApply FAILED/);
  });
});

describe("persistProvenPathPlan reports its outcome", () => {
  it("returns 'error' and logs the cause when the write rejects", async () => {
    createMock.mockRejectedValue(BOOM);

    const result = await persistProvenPathPlan(PLAN);

    expect(result).toBe("error");
    expect(errorSpy).toHaveBeenCalled();
    expect(loggedText()).toMatch(/persistProvenPathPlan FAILED/);
    expect(loggedText()).toMatch(/Can't reach database server/);
  });

  it("returns 'ok' and logs nothing on a successful write", async () => {
    createMock.mockResolvedValue({ id: "evt_1" });

    await expect(persistProvenPathPlan(PLAN)).resolves.toBe("ok");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("distinguishes a failed read from a genuine absence on load", async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(loadProvenPathPlan()).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();

    findFirstMock.mockRejectedValue(BOOM);
    await expect(loadProvenPathPlan()).resolves.toBeNull();
    expect(loggedText()).toMatch(/readProvenPathPlan FAILED/);
    expect(loggedText()).toMatch(/not proof of absence/);
  });
});
