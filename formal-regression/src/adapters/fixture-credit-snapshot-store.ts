/**
 * A fixture `CreditSnapshotStore` whose ONE snapshot is modeled directly on
 * the real S1 conformance fixture
 * `/workspace/wt/prd/apps/web/lib/opportunity-engine/fixtures/credit-grant-snapshot.conformance.json`
 * case `"valid-partially-consumed-admissible"` — same shape, same
 * `grantState`/`reconciliationState`/expiry/freshness posture, so it passes
 * the REAL `evaluateCreditSnapshotAdmissibility` (S1) admissibility gates
 * unmodified. Only the balance fields are parameterized per test (the
 * `remainingMinorUnits` this harness treats as "the verified balance" for
 * the flagship no-double-spend property).
 *
 * This is a TEST FIXTURE, not fabricated financial data: it is a synthetic
 * grant used only to drive the real admission/authorization code under
 * test, structurally identical to S1's own published conformance case.
 */
import type {
  CreditAdmissionScope,
  CreditGrantSnapshot,
  CreditSnapshotStore,
} from "../../../../../wt/prd/apps/web/lib/ai-control-plane/credit-admission";

export function makeFixtureSnapshot(overrides: {
  grantId: string;
  remainingMinorUnits: number;
  reservedMinorUnits?: number;
  now: Date;
}): CreditGrantSnapshot {
  const observedAt = new Date(overrides.now.getTime() - 60_000).toISOString();
  return {
    programId: "gcp-startup-credits",
    applicationId: "app-2026-formal-regression",
    grantId: overrides.grantId,
    // Must equal FIXTURE_SCOPE.provider exactly (evaluateCreditAdmission
    // refuses "scope_not_covered" on any mismatch) — "vertex" is a real,
    // valid `ProviderRouteId` (contracts.ts), unlike an arbitrary label.
    provider: "vertex",
    billingAccountId: "billing-acct-01",
    billingProjectId: "proj-nova",
    currency: "USD",
    originalAwardMinorUnits: 25_000_000,
    remainingMinorUnits: overrides.remainingMinorUnits,
    reservedMinorUnits: overrides.reservedMinorUnits ?? 0,
    grantState: "partially_consumed",
    activatedAt: "2026-01-15T00:00:00.000Z",
    expiresAt: "2027-01-15T00:00:00.000Z",
    eligibleProducts: ["vertex-ai", "compute-engine"],
    eligibleModels: ["*"],
    eligibleRegions: ["us-central1", "us-east1"],
    exclusions: ["marketplace-third-party"],
    cashOverageBehavior: "converts_to_paid_usage",
    observedAt,
    recordedAt: observedAt,
    freshnessHorizonMs: 21_600_000,
    sourceReceiptId: "receipt-formal-regression",
    sourceReceiptHash: "sha256:formal-regression",
    reconciliationState: "reconciled",
    attestedBy: "formal-regression-harness@2026-07",
    schemaVersion: "credit-grant-snapshot@1",
    policyVersion: "credit-policy@1",
  } as CreditGrantSnapshot;
}

export const FIXTURE_SCOPE: CreditAdmissionScope = {
  product: "vertex-ai",
  model: "gemini-3-pro",
  region: "us-central1",
  provider: "vertex",
};

/**
 * A store whose `remainingMinorUnits` is a mutable "verified balance" the
 * test controls directly — `findCovering` always re-reads the CURRENT
 * value, exactly mirroring how `createPgCreditAuthorizationPort.authorize`
 * re-reads `spendableAtAuthTime` fresh on every call (never a cached read).
 */
export class FixtureCreditSnapshotStore implements CreditSnapshotStore {
  private snapshot: CreditGrantSnapshot;

  /** Injectable fault: throw on the NEXT findCovering call, then clear itself (one-shot). */
  faultOnce: Error | null = null;

  constructor(grantId: string, remainingMinorUnits: number, now: Date) {
    this.snapshot = makeFixtureSnapshot({ grantId, remainingMinorUnits, now });
  }

  async findCovering(): Promise<readonly CreditGrantSnapshot[]> {
    if (this.faultOnce) {
      const err = this.faultOnce;
      this.faultOnce = null;
      throw err;
    }
    return [this.snapshot];
  }
}
