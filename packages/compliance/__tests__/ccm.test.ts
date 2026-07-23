import { describe, it, expect, vi } from "vitest";
import {
  checkReceiptLogging,
  checkReceiptSignatures,
  checkPolicyVersionPresent,
  type ReceiptRow,
} from "../src/checks/receipts-check";
import { checkProdDeployChangeMgmt, type DeployEvent } from "../src/checks/deploy-check";
import { checkMfaCoverage, type AccessSnapshotRow } from "../src/checks/access-check";
import { runCcm, type CcmDeps } from "../src/runner";
import { exportCompliancePack, NON_CLAIM_DISCLAIMER } from "../src/export-pack";
import { CONTROL_LIBRARY } from "../src/control-library";
import type { EvidenceObject } from "../src/types";

function mockPersist() {
  let n = 0;
  const calls: Omit<EvidenceObject, "id">[] = [];
  const fn = vi.fn(async (ev: Omit<EvidenceObject, "id">) => {
    calls.push(ev);
    n += 1;
    return `evidence-${n}`;
  });
  return { fn, calls };
}

const rowA: ReceiptRow = { id: "r1", decision: "ADMIT", policyVersion: "v1", signature: { kid: "k1", sig: "sig1", alg: "ed25519" } };
const rowB: ReceiptRow = { id: "r2", decision: "ADMIT", policyVersion: "v1", signature: { kid: "k1", sig: "sig2", alg: "ed25519" } };

describe("checkReceiptLogging", () => {
  it("flags an empty window", async () => {
    const { fn } = mockPersist();
    const result = await checkReceiptLogging([], fn);
    expect(result.ok).toBe(false);
    expect(result.controlId).toBe("CTL-LOG-001");
  });

  it("passes with a non-empty window and correct count/evidenceIds", async () => {
    const { fn } = mockPersist();
    const result = await checkReceiptLogging([rowA, rowB], fn);
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("2 receipt(s)");
    expect(result.evidenceIds).toHaveLength(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("checkReceiptSignatures", () => {
  it("ok when all signatures verify", async () => {
    const { fn } = mockPersist();
    const verify = vi.fn(async () => ({ ok: true }));
    const result = await checkReceiptSignatures([rowA, rowB], verify, fn);
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("2 receipt signature(s) verified");
  });

  it("flags a failing signature with the failure count in the detail", async () => {
    const { fn } = mockPersist();
    const verify = vi.fn(async (row: ReceiptRow) =>
      row.id === "r2" ? { ok: false, reason: "bad-sig" } : { ok: true },
    );
    const result = await checkReceiptSignatures([rowA, rowB], verify, fn);
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/1/);
    expect(result.detail.toLowerCase()).toContain("failed");
  });
});

describe("checkPolicyVersionPresent", () => {
  it("ok when all rows have a policy version", async () => {
    const { fn } = mockPersist();
    const result = await checkPolicyVersionPresent([rowA, rowB], fn);
    expect(result.ok).toBe(true);
  });

  it("fails when some rows are missing a policy version", async () => {
    const { fn } = mockPersist();
    const missing: ReceiptRow = { id: "r3", decision: "ADMIT", policyVersion: "" };
    const result = await checkPolicyVersionPresent([rowA, missing], fn);
    expect(result.ok).toBe(false);
  });

  it("is vacuously ok on an empty list", async () => {
    const { fn } = mockPersist();
    const result = await checkPolicyVersionPresent([], fn);
    expect(result.ok).toBe(true);
  });
});

describe("checkProdDeployChangeMgmt", () => {
  const good: DeployEvent = { id: "d1", env: "production", prNumber: 42, requiredChecksOk: true, deployedAt: new Date().toISOString() };

  it("ok when all prod deploys have a PR and passing checks", async () => {
    const { fn } = mockPersist();
    const result = await checkProdDeployChangeMgmt([good], fn);
    expect(result.ok).toBe(true);
  });

  it("flags a prod deploy missing a PR number", async () => {
    const { fn } = mockPersist();
    const bad: DeployEvent = { id: "d2", env: "production", requiredChecksOk: true, deployedAt: new Date().toISOString() };
    const result = await checkProdDeployChangeMgmt([good, bad], fn);
    expect(result.ok).toBe(false);
  });

  it("flags a prod deploy with failed required checks", async () => {
    const { fn } = mockPersist();
    const bad: DeployEvent = { id: "d3", env: "production", prNumber: 7, requiredChecksOk: false, deployedAt: new Date().toISOString() };
    const result = await checkProdDeployChangeMgmt([good, bad], fn);
    expect(result.ok).toBe(false);
  });
});

describe("checkMfaCoverage", () => {
  it("ok when all privileged users have MFA", async () => {
    const { fn } = mockPersist();
    const rows: AccessSnapshotRow[] = [
      { userId: "u1", mfaEnabled: true, privileged: true },
      { userId: "u2", mfaEnabled: false, privileged: false },
    ];
    const result = await checkMfaCoverage(rows, fn);
    expect(result.ok).toBe(true);
  });

  it("flags a privileged user without MFA", async () => {
    const { fn } = mockPersist();
    const rows: AccessSnapshotRow[] = [
      { userId: "u1", mfaEnabled: true, privileged: true },
      { userId: "u2", mfaEnabled: false, privileged: true },
    ];
    const result = await checkMfaCoverage(rows, fn);
    expect(result.ok).toBe(false);
  });
});

describe("runCcm", () => {
  function buildDeps(overrides: Partial<CcmDeps> = {}): { deps: CcmDeps; openException: ReturnType<typeof vi.fn>; saveRun: ReturnType<typeof vi.fn> } {
    const { fn: persistEvidence } = mockPersist();
    const openException = vi.fn(async () => undefined);
    const saveRun = vi.fn(async () => undefined);
    const deps: CcmDeps = {
      receiptRows: [rowA, rowB],
      verifyReceiptSignature: vi.fn(async () => ({ ok: true })),
      deployEvents: [{ id: "d1", env: "production", prNumber: 1, requiredChecksOk: true, deployedAt: new Date().toISOString() }],
      accessRows: [{ userId: "u1", mfaEnabled: true, privileged: true }],
      persistEvidence,
      saveRun,
      openException,
      ...overrides,
    };
    return { deps, openException, saveRun };
  }

  it("passes end to end when every check passes: no exceptions, saveRun ok=true, CTL-MON-001 present and ok", async () => {
    const { deps, openException, saveRun } = buildDeps();
    const run = await runCcm(deps);

    expect(run.ok).toBe(true);
    expect(openException).not.toHaveBeenCalled();
    expect(saveRun).toHaveBeenCalledTimes(1);
    expect(saveRun).toHaveBeenCalledWith(run);

    const mon = run.results.find((r) => r.controlId === "CTL-MON-001");
    expect(mon).toBeDefined();
    expect(mon?.ok).toBe(true);
  });

  it("opens exactly one exception per failing check and aggregates ok as AND of all results", async () => {
    const { deps, openException, saveRun } = buildDeps({
      receiptRows: [], // fails checkReceiptLogging
      accessRows: [{ userId: "u1", mfaEnabled: false, privileged: true }], // fails checkMfaCoverage
    });
    const run = await runCcm(deps);

    const failing = run.results.filter((r) => !r.ok);
    expect(failing.length).toBeGreaterThanOrEqual(2);
    expect(openException).toHaveBeenCalledTimes(failing.length);
    expect(run.ok).toBe(false);
    expect(run.ok).toBe(run.results.every((r) => r.ok));

    expect(saveRun).toHaveBeenCalledTimes(1);
    const mon = run.results.find((r) => r.controlId === "CTL-MON-001");
    expect(mon?.ok).toBe(true);
  });
});

describe("exportCompliancePack", () => {
  it("carries the verbatim disclaimer, correct frameworks, and CONTROL_LIBRARY by reference", () => {
    const pack = exportCompliancePack({ lastCcmRun: null, evidenceSample: [] });
    expect(pack.disclaimer).toBe("Internal alignment pack only. Not a SOC 2 report or ISO 27001 certificate.");
    expect(pack.disclaimer).toBe(NON_CLAIM_DISCLAIMER);
    expect(pack.frameworks).toEqual(["SOC2_TSC_mapping", "ISO27001_AnnexA_mapping"]);
    expect(pack.controls).toBe(CONTROL_LIBRARY);
  });
});
