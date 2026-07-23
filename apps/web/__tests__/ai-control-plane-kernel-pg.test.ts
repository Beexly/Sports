/**
 * LSRQC KERNEL v1 (closed on-policy self-refinement loop) acceptance.
 *
 * Two layers, mirroring ai-control-plane-cti-miner-pg.test.ts:
 *
 *   A. PURE (no DB, always runs): the skill-augmented CTI ranking core, the
 *      pure admission core's SHADOW/ENFORCE/version-stamp behavior, the replay
 *      harness core, the DP publisher's determinism + noise-scaling + never-raw
 *      law, and a source guard that the kernel writes nothing under formal/**.
 *
 *   B. REAL POSTGRES (gated on DATABASE_URL): the ON-POLICY proposal emitter
 *      (no active version → 0; active v1 + open cti → 1; re-run → 0 idempotent),
 *      the logged skill-augmented runner, and the accept → activate → admit flow
 *      (single active guaranteed by supersede).
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     npx vitest run ai-control-plane-kernel-pg
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";

import {
  admitUnderSRQC,
  admitUnderSRQCLogged,
  type AbstractControlState,
  type ProjectableEvent,
} from "@/lib/ai-control-plane/srqc-projection";
import {
  admitUnderSRQCWithVersion,
  resolveSrqcModeFromEnv,
  emitProposalsFromOpenCtis,
  rescoreOpenProposals,
  evaluateWindowWithSkills,
  runSkillAugmentedCti,
  acceptProposalAndActivate,
  getActiveSrqcVersion,
  publishSrqcHealthDp,
  violationCount,
  delta,
  multiWindowStats,
  rankByStrength,
  softGate,
  predicateKeysForCti,
  predsFromKeys,
  skillKindFromCti,
  type ForbiddenPair,
  type IndInvPred,
  type SrqcHealthRaw,
  type UniformRng,
  type ControlSqlClient,
} from "@/lib/ai-control-plane/internal";
import { replayEvents } from "../../../scripts/srqc-replay";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function started(invocationId: string, attemptId: string): ProjectableEvent {
  return {
    eventType: "ATTEMPT_STARTED",
    source: "ai_attempt",
    sourceId: attemptId,
    payload: { invocationId, attemptId, status: "DISPATCHED" },
  };
}

const ONE_PENDING: AbstractControlState = {
  invocationId: "inv-fixture",
  claimPhase: "OPEN",
  exposurePhase: "HELD",
  pendingCountClass: "ONE",
  fingerprintBound: true,
  hasRejectedFp: false,
};

const GE2_AFTER: AbstractControlState = {
  ...ONE_PENDING,
  pendingCountClass: "GE2",
};

const SAFE_TERMINAL: AbstractControlState = {
  invocationId: "inv-safe",
  claimPhase: "TERMINAL",
  exposurePhase: "NONE",
  pendingCountClass: "ZERO",
  fingerprintBound: true,
  hasRejectedFp: false,
};

const REJECTED_UNBOUND: AbstractControlState = {
  invocationId: "inv-rej",
  claimPhase: "OPEN",
  exposurePhase: "HELD",
  pendingCountClass: "ONE",
  fingerprintBound: false,
  hasRejectedFp: true,
};

/** A deterministic seeded uniform rng (mulberry32) for DP tests. */
function seededRng(seed: number): UniformRng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Layer A: pure, always-runs ─────────────────────────────────────────────

describe("kernel pure — skill-augmented CTI ranking", () => {
  it("augmented ≥ ordinary; a near-miss ONE-pending state adds delta the baseline misses", () => {
    const window = [started("inv-1", "att-1")]; // projects ONE-pending (not a violation)
    const forbidden: ForbiddenPair[] = [
      { before: ONE_PENDING, action: "StartPending" },
    ];
    const evalNoSkills = evaluateWindowWithSkills(window, 1, []);
    expect(evalNoSkills.violationsOrdinary).toBe(0);
    expect(evalNoSkills.violationsAugmented).toBe(0);
    expect(evalNoSkills.delta).toBe(0);

    const evalWithSkills = evaluateWindowWithSkills(window, 1, forbidden);
    expect(evalWithSkills.violationsOrdinary).toBe(0);
    expect(evalWithSkills.violationsAugmented).toBeGreaterThanOrEqual(
      evalWithSkills.violationsOrdinary,
    );
    expect(evalWithSkills.violationsAugmented).toBe(1);
    expect(evalWithSkills.delta).toBe(1);
  });

  it("presence of proposals NEVER changes the ordinary admit decision (ranking-only)", () => {
    const window = [started("inv-1", "att-1"), started("inv-1", "att-2")]; // GE2
    const admit = admitUnderSRQC(window); // SHADOW default
    expect(admit.decision).toBe("ADMIT");
    // The skill-augmented evaluation observes the same window but cannot flip
    // the admit decision — admitUnderSRQC does not even take proposals.
    evaluateWindowWithSkills(window, 1, [
      { before: ONE_PENDING, action: "StartPending" },
    ]);
    expect(admitUnderSRQC(window).decision).toBe("ADMIT");
  });
});

describe("kernel pure — violation-delta ranking core", () => {
  const GE2_PENDING: AbstractControlState = { ...ONE_PENDING, pendingCountClass: "GE2" };

  it("violationCount uses BASE_INDS: GE2 and rejected-unbound violate, safe does not", () => {
    expect(violationCount([SAFE_TERMINAL])).toBe(0);
    expect(violationCount([GE2_PENDING])).toBe(1);
    expect(violationCount([REJECTED_UNBOUND])).toBe(1);
    expect(violationCount([GE2_PENDING, REJECTED_UNBOUND, SAFE_TERMINAL])).toBe(2);
  });

  it("delta counts the ADDITIONAL near-misses a strengthening catches (≥0)", () => {
    const extra = predsFromKeys(["GE2_FORBIDDEN"]); // forbids OPEN+ONE-pending
    // ONE_PENDING is not a baseline violation but IS caught by the strengthening.
    expect(violationCount([ONE_PENDING])).toBe(0);
    expect(delta([ONE_PENDING], extra)).toBe(1);
    // A safe terminal is unaffected.
    expect(delta([SAFE_TERMINAL], extra)).toBe(0);
    // No extra predicates ⇒ delta 0 by definition.
    expect(delta([ONE_PENDING], [])).toBe(0);
  });

  it("multiWindowStats: support = #windows with delta>0, strength = Σ max(0,delta), population variance", () => {
    const extra = predsFromKeys(["GE2_FORBIDDEN"]);
    const windows = [
      [ONE_PENDING], // delta 1
      [ONE_PENDING, { ...ONE_PENDING, invocationId: "b" }], // delta 2
      [SAFE_TERMINAL], // delta 0
    ];
    const stats = multiWindowStats(windows, extra);
    expect(stats.deltas).toEqual([1, 2, 0]);
    expect(stats.support).toBe(2);
    expect(stats.strength).toBe(3);
    expect(stats.mean).toBeCloseTo(1, 10);
    // population variance of [1,2,0] about mean 1 = (0+1+1)/3
    expect(stats.variance).toBeCloseTo(2 / 3, 10);
  });

  it("rankByStrength filters below kMin support and sorts DESC by strength", () => {
    const items = [
      { id: "weak", support: 3, strength: 1 },
      { id: "strong", support: 4, strength: 9 },
      { id: "thin", support: 1, strength: 100 }, // below kMin=2 → dropped
      { id: "zero", support: 5, strength: 0 }, // strength 0 → dropped
    ];
    const ranked = rankByStrength(items, 2);
    expect(ranked.map((r) => r.id)).toEqual(["strong", "weak"]);
  });

  it("softGate is monotonic increasing in delta and centered at 0.5 for d=0", () => {
    expect(softGate(0)).toBeCloseTo(0.5, 10);
    expect(softGate(1)).toBeGreaterThan(softGate(0));
    expect(softGate(2)).toBeGreaterThan(softGate(1));
    expect(softGate(-1)).toBeLessThan(softGate(0));
  });

  it("predicateKeysForCti / predsFromKeys / skillKindFromCti mapping", () => {
    expect(predicateKeysForCti(GE2_PENDING)).toEqual(["GE2_FORBIDDEN"]);
    expect(predicateKeysForCti(REJECTED_UNBOUND)).toEqual(["REJECTED_IMPLIES_BOUND"]);
    expect(predicateKeysForCti(SAFE_TERMINAL)).toEqual(["STRENGTHEN_GENERIC"]);

    expect(skillKindFromCti(GE2_PENDING)).toBe("failure_avoidance");
    expect(skillKindFromCti(SAFE_TERMINAL)).toBe("strengthen");

    // GENERIC contributes no extra predicate (advisory only).
    const generic: IndInvPred[] = predsFromKeys(["STRENGTHEN_GENERIC"]);
    expect(generic).toHaveLength(0);
    expect(predsFromKeys(["GE2_FORBIDDEN"])).toHaveLength(1);
    expect(predsFromKeys(["REJECTED_IMPLIES_BOUND"])).toHaveLength(1);
  });
});

describe("kernel pure — admitUnderSRQCLogged (pure sync logged wrapper)", () => {
  it("returns the same result as the core and emits one console.info srqc_admit line", () => {
    const ge2 = [started("inv-1", "att-1"), started("inv-1", "att-2")];
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = admitUnderSRQCLogged(ge2, "SHADOW", { version: 4, indInvHash: "h" });
    expect(r.decision).toBe("ADMIT"); // SHADOW admits even on GE2
    expect(r.srqcVersion).toBe(4);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse((infoSpy.mock.calls[0]![0] as string));
    expect(line.kind).toBe("srqc_admit");
    expect(line.decision).toBe("ADMIT");
    expect(line.srqcVersion).toBe(4);
    expect(line.violationCount).toBe(1);
    expect(line.violationPending).toBe(true);
    infoSpy.mockRestore();
  });
});

describe("kernel pure — admission core purity + version stamp", () => {
  it("admitUnderSRQC core is pure: SHADOW admits even on a GE2 violation, no env read", () => {
    const ge2 = [started("inv-1", "att-1"), started("inv-1", "att-2")];
    const r = admitUnderSRQC(ge2); // no mode, no active
    expect(r.decision).toBe("ADMIT");
    expect(r.violations).toHaveLength(1);
    expect(r.srqcVersion).toBeNull();
  });

  it("ENFORCE (lab-only) REFUSEs iff there is a violation; SHADOW always admits", () => {
    const ge2 = [started("inv-1", "att-1"), started("inv-1", "att-2")];
    const clean = [started("inv-1", "att-1")];
    expect(admitUnderSRQC(ge2, "ENFORCE").decision).toBe("REFUSE");
    expect(admitUnderSRQC(clean, "ENFORCE").decision).toBe("ADMIT");
    expect(admitUnderSRQC(ge2, "SHADOW").decision).toBe("ADMIT");
  });

  it("active certificate stamps srqcVersion on the result (observability only)", () => {
    const clean = [started("inv-1", "att-1")];
    const r = admitUnderSRQC(clean, "SHADOW", { version: 7, indInvHash: "h" });
    expect(r.srqcVersion).toBe(7);
    expect(r.decision).toBe("ADMIT");
  });

  it("resolveSrqcModeFromEnv is ENFORCE only when SRQC_ENFORCE=1", () => {
    expect(resolveSrqcModeFromEnv({})).toBe("SHADOW");
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "0" })).toBe("SHADOW");
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "true" })).toBe("SHADOW");
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "1" })).toBe("ENFORCE");
  });
});

describe("kernel pure — replay harness", () => {
  it("a synthetic GE2 window yields exit code 1", () => {
    const result = replayEvents([
      started("inv-1", "att-1"),
      started("inv-1", "att-2"),
    ]);
    expect(result.violations).toHaveLength(1);
    expect(result.exitCode).toBe(1);
  });

  it("a legal sequential window yields exit code 0", () => {
    const result = replayEvents([
      started("inv-1", "att-1"),
      {
        eventType: "ATTEMPT_FAILED",
        source: "ai_attempt",
        sourceId: "att-1",
        payload: { invocationId: "inv-1", attemptId: "att-1", status: "FAILED" },
      },
      started("inv-1", "att-2"),
    ]);
    expect(result.violations).toHaveLength(0);
    expect(result.exitCode).toBe(0);
  });
});

describe("kernel pure — DP health publisher", () => {
  const RAW: SrqcHealthRaw = {
    windowId: "w-2026-07-23",
    ge2Count: 100,
    shadowWouldRefuse: 100,
    enforceRefuse: 100,
    versionActivations: 100,
  };

  it("same injected rng+seed → identical privatized output", () => {
    const a = publishSrqcHealthDp(RAW, 0.5, seededRng(42));
    const b = publishSrqcHealthDp(RAW, 0.5, seededRng(42));
    expect(a).toEqual(b);
  });

  it("smaller epsilon → larger noise magnitude (fixed rng sequence)", () => {
    const dev = (r: SrqcHealthRaw): number =>
      Math.abs(r.ge2Count - 100) +
      Math.abs(r.shadowWouldRefuse - 100) +
      Math.abs(r.enforceRefuse - 100) +
      Math.abs(r.versionActivations - 100);
    const tight = publishSrqcHealthDp(RAW, 5.0, seededRng(7)); // scale 0.2
    const loose = publishSrqcHealthDp(RAW, 0.05, seededRng(7)); // scale 20
    expect(dev(loose)).toBeGreaterThan(dev(tight));
  });

  it("windowId passes through un-noised; every count is a non-negative integer", () => {
    const out = publishSrqcHealthDp(RAW, 0.1, seededRng(99));
    expect(out.windowId).toBe("w-2026-07-23");
    for (const v of [
      out.ge2Count,
      out.shadowWouldRefuse,
      out.enforceRefuse,
      out.versionActivations,
    ]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("publish API never returns the raw counts object (fresh object, values differ under noise)", () => {
    const rawFrozen: SrqcHealthRaw = { ...RAW };
    const out = publishSrqcHealthDp(rawFrozen, 0.05, seededRng(123));
    expect(out).not.toBe(rawFrozen); // not the same reference
    // Raw object is untouched.
    expect(rawFrozen.ge2Count).toBe(100);
  });
});

describe("kernel pure — no writes under formal/**", () => {
  it("kernel modules contain no filesystem write to a formal/ path", () => {
    const dir = join(__dirname, "..", "lib", "ai-control-plane");
    const files = [
      "ctiToProposals.ts",
      "skillAugmentedCti.ts",
      "accept-proposal.ts",
      "srqc-projection.ts",
      "violation-delta.ts",
      "metrics/dpPublish.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      // The real constraint is that no kernel module performs any filesystem
      // write (they are DB-only), so no job/script path can ever write under
      // formal/** or edit a .tla file. Docstrings may name the spec by file.
      expect(src).not.toMatch(/writeFileSync|writeFile|appendFile|createWriteStream/);
      expect(src).not.toMatch(/fs\.write|fs\/promises/);
    }
  });
});

// ─── Layer B: real Postgres ─────────────────────────────────────────────────

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

const SCHEMA = "kernel_acceptance";

const MIGRATIONS_DIR = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "db",
  "prisma",
  "migrations",
);

suite("LSRQC KERNEL v1 against real Postgres", () => {
  let pool: Pool;
  let sql: ControlSqlClient;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      options: `-c search_path=${SCHEMA}`,
    });
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${SCHEMA}`);
    for (const dir of [
      "20260722140000_add_ai_control_plane_ledger",
      "20260722220000_add_control_event_ledger",
      "20260722230000_add_formal_incident_srqc_version",
      "20260722240000_add_cti_candidate",
      "20260723100000_add_ind_inv_proposal",
    ]) {
      const ddl = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      await pool.query(ddl);
    }
    sql = {
      async query<T>(text: string, params: readonly unknown[]): Promise<T[]> {
        const res = await pool.query(text, params as unknown[]);
        return res.rows as T[];
      },
    };
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE "ind_inv_proposal", "cti_candidate", "srqc_version", "control_event_ledger" CASCADE`,
    );
  });

  async function seedOpenCti(before: AbstractControlState): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO "cti_candidate" ("id", "before", "action", "after", "status")
       VALUES ($1, $2::jsonb, $3, $4::jsonb, 'open')`,
      [id, JSON.stringify(before), "StartPending", JSON.stringify(GE2_AFTER)],
    );
    return id;
  }

  async function activate(version: number): Promise<void> {
    await pool.query(
      `INSERT INTO "srqc_version" ("version", "indInvHash", "status")
       VALUES ($1, $2, 'candidate') ON CONFLICT ("version") DO NOTHING`,
      [version, `hash-v${version}`],
    );
    await pool.query(
      `WITH s AS (UPDATE "srqc_version" SET "status"='superseded'
                   WHERE "status"='active' AND "version" <> $1 RETURNING 1)
       UPDATE "srqc_version" SET "status"='active', "activatedAt"=now() WHERE "version"=$1`,
      [version],
    );
  }

  it("emit: no active version → 0 minted; active v1 + open cti → 1 (activeVersionAtMint=1, open); re-run → 0", async () => {
    await seedOpenCti(ONE_PENDING);

    // No active certificate → on-policy gate returns 0, mints nothing.
    expect(await emitProposalsFromOpenCtis(sql)).toBe(0);
    expect(
      (await pool.query(`SELECT count(*)::int AS n FROM "ind_inv_proposal"`)).rows[0].n,
    ).toBe(0);

    await activate(1);
    // Supply two windows that each contain a ONE-pending near-miss so the
    // GE2_FORBIDDEN strengthening scores strength>0 / support=2 at mint time.
    const nearMissWindows = [[ONE_PENDING], [{ ...ONE_PENDING, invocationId: "y" }]];
    expect(await emitProposalsFromOpenCtis(sql, nearMissWindows)).toBe(1);

    const rows = (
      await pool.query(
        `SELECT "activeVersionAtMint", "status", "skillKind", "predicateKeys",
                "ctiCandidateIds", "strength", "support", "variance"
           FROM "ind_inv_proposal"`,
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].activeVersionAtMint).toBe(1);
    expect(rows[0].status).toBe("open");
    // GE2 successor ⇒ failure_avoidance + GE2_FORBIDDEN key.
    expect(rows[0].skillKind).toBe("failure_avoidance");
    expect(rows[0].predicateKeys).toEqual(["GE2_FORBIDDEN"]);
    expect(Array.isArray(rows[0].ctiCandidateIds)).toBe(true);
    expect(rows[0].ctiCandidateIds).toHaveLength(1);
    // Two near-miss windows ⇒ strength 2, support 2, variance 0.
    expect(rows[0].strength).toBe(2);
    expect(rows[0].support).toBe(2);
    expect(rows[0].variance).toBe(0);

    // Idempotent re-run: same open cti + same active baseline → 0 new.
    expect(await emitProposalsFromOpenCtis(sql, nearMissWindows)).toBe(0);
    expect(
      (await pool.query(`SELECT count(*)::int AS n FROM "ind_inv_proposal"`)).rows[0].n,
    ).toBe(1);
  });

  it("rescore: recomputes stored stats under current traffic (Prop3 anti-staleness)", async () => {
    await seedOpenCti(ONE_PENDING);
    await activate(1);
    expect(await emitProposalsFromOpenCtis(sql)).toBe(1); // no windows → stats 0
    let row = (
      await pool.query(`SELECT "strength", "support" FROM "ind_inv_proposal"`)
    ).rows[0];
    expect(row.strength).toBe(0);
    expect(row.support).toBe(0);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const rescored = await rescoreOpenProposals(
      sql,
      [[ONE_PENDING], [{ ...ONE_PENDING, invocationId: "z" }], [SAFE_TERMINAL]],
      1,
    );
    logSpy.mockRestore();
    expect(rescored).toBe(1);

    row = (
      await pool.query(`SELECT "strength", "support" FROM "ind_inv_proposal"`)
    ).rows[0];
    // Two of three windows have a near-miss ONE-pending ⇒ strength 2, support 2.
    expect(row.strength).toBe(2);
    expect(row.support).toBe(2);
  });

  it("skill-augmented runner: an open proposal adds delta over the baseline and logs it", async () => {
    await seedOpenCti(ONE_PENDING);
    await activate(1);
    expect(await emitProposalsFromOpenCtis(sql)).toBe(1);

    const window = [started(randomUUID(), randomUUID())]; // projects ONE-pending
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const evaluation = await runSkillAugmentedCti(sql, window, 1);
    logSpy.mockRestore();

    expect(evaluation.violationsOrdinary).toBe(0);
    expect(evaluation.violationsAugmented).toBeGreaterThanOrEqual(
      evaluation.violationsOrdinary,
    );
    expect(evaluation.delta).toBe(1);
  });

  it("accept → activate → admit: accept flips v2 active, proposal accepted; admit stamps srqcVersion=2; v3 supersedes (single active)", async () => {
    await seedOpenCti(ONE_PENDING);
    await activate(1);
    expect(await emitProposalsFromOpenCtis(sql)).toBe(1);
    const proposalId = (
      await pool.query(`SELECT "id" FROM "ind_inv_proposal" LIMIT 1`)
    ).rows[0].id as string;

    await acceptProposalAndActivate(sql, { proposalId, newVersion: 2 });

    const active = await getActiveSrqcVersion(sql);
    expect(active?.version).toBe(2);

    // Provenance notes carry predicateKeys + ranking evidence + baseline.
    const notesRaw = (
      await pool.query(`SELECT "notes" FROM "srqc_version" WHERE "version" = 2`)
    ).rows[0].notes as string;
    const notes = JSON.parse(notesRaw);
    expect(notes.fromProposal).toBe(proposalId);
    expect(notes.skillKind).toBe("failure_avoidance");
    expect(notes.predicateKeys).toEqual(["GE2_FORBIDDEN"]);
    expect(notes.activeVersionAtMint).toBe(1);
    expect(notes).toHaveProperty("strength");
    expect(notes).toHaveProperty("support");

    const p = (
      await pool.query(
        `SELECT "status", "acceptedSrqcVersion" FROM "ind_inv_proposal" WHERE "id" = $1`,
        [proposalId],
      )
    ).rows[0];
    expect(p.status).toBe("accepted");
    expect(p.acceptedSrqcVersion).toBe(2);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const admit = await admitUnderSRQCWithVersion(sql, [started("i", "a")]);
    logSpy.mockRestore();
    expect(admit.decision).toBe("ADMIT");
    expect(admit.srqcVersion).toBe(2);

    // A second activation supersedes — single active guaranteed.
    await acceptProposalAndActivate(sql, { proposalId, newVersion: 3 });
    expect((await getActiveSrqcVersion(sql))?.version).toBe(3);
    const activeCount = (
      await pool.query(
        `SELECT count(*)::int AS n FROM "srqc_version" WHERE "status"='active'`,
      )
    ).rows[0].n;
    expect(activeCount).toBe(1);
  });
});
