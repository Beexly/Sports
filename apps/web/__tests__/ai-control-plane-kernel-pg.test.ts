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
  type AbstractControlState,
  type ProjectableEvent,
} from "@/lib/ai-control-plane/srqc-projection";
import {
  admitUnderSRQCWithVersion,
  resolveSrqcModeFromEnv,
  emitProposalsFromOpenCtis,
  evaluateWindowWithSkills,
  runSkillAugmentedCti,
  acceptProposalAndActivate,
  getActiveSrqcVersion,
  publishSrqcHealthDp,
  type ForbiddenPair,
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
    expect(await emitProposalsFromOpenCtis(sql)).toBe(1);

    const rows = (
      await pool.query(
        `SELECT "activeVersionAtMint", "status", "skillKind" FROM "ind_inv_proposal"`,
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].activeVersionAtMint).toBe(1);
    expect(rows[0].status).toBe("open");
    expect(rows[0].skillKind).toBe("strengthen");

    // Idempotent re-run: same open cti + same active baseline → 0 new.
    expect(await emitProposalsFromOpenCtis(sql)).toBe(0);
    expect(
      (await pool.query(`SELECT count(*)::int AS n FROM "ind_inv_proposal"`)).rows[0].n,
    ).toBe(1);
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
