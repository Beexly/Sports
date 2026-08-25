import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Checkout → return: the banner must reflect the RECONCILED ENTITLEMENT, never
 * the URL alone.
 *
 * Stripe's success_url is `/dashboard?upgraded=true`. That param is an
 * unauthenticated string: it survives in a bookmark, in browser history, and on
 * the back button after an abandoned checkout. It is also present in the one
 * failure mode this landing page exists to absorb — `reconcileUserEntitlement`
 * is deliberately fail-safe, so when the webhook has not landed AND the Stripe
 * read is ambiguous, it grants nothing and returns quietly.
 *
 * Before this fix the banner rendered on the param alone, announcing
 * "Subscription active — You're in ... Confidence scores, the full factor
 * trail, and line movement are now live on every pick" to a viewer whose
 * entitlement was still FREE. The next click ("See today's board →") landed on
 * the paywall the banner had just promised was gone.
 *
 * Two claims are pinned here, both RUNTIME assertions on the real page output:
 *   1. FREE + ?upgraded=true → the honest "Confirming your subscription"
 *      waiting state, and NOT the "Subscription active" claim.
 *   2. FANTASY + ?upgraded=true → a success banner that does NOT promise the
 *      full betting board, because `canSeePremiumPicks` is false for that tier.
 *
 * Nothing here changes a gate; it narrows a claim to match the gate.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  entitlements: vi.fn(),
  reconcile: vi.fn(),
  perfGate: vi.fn(),
  readinessGates: vi.fn(),
  perfPolicy: vi.fn(),
  clvPolicy: vi.fn(),
  billingNotice: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.entitlements }));
vi.mock("@/lib/billing/reconcile-entitlements", () => ({
  reconcileUserEntitlement: mocks.reconcile,
}));
vi.mock("@/lib/ops/effective-performance-gate", () => ({
  resolveEffectivePerformanceGate: mocks.perfGate,
}));
vi.mock("@sports/prediction-engine", () => ({ getReadinessGates: mocks.readinessGates }));
vi.mock("@/lib/performance/public-performance-policy", () => ({
  evaluatePublicPerformancePolicy: mocks.perfPolicy,
}));
vi.mock("@/lib/performance/public-clv-policy", () => ({ loadPublicClvPolicy: mocks.clvPolicy }));
vi.mock("@/lib/billing/notice", () => ({ getBillingNotice: mocks.billingNotice }));
vi.mock("@sports/db", () => ({
  db: { pick: { count: mocks.count, findMany: mocks.findMany } },
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
}));
vi.mock("@/components/ui/risk-disclosure", () => ({ RiskDisclosure: (): null => null }));
vi.mock("@/components/ui/billing-notice-banner", () => ({
  BillingNoticeBanner: (): null => null,
}));
vi.mock("@/components/ui/manage-subscription-button", () => ({
  ManageSubscriptionButton: (): null => null,
}));

import DashboardPage from "@/app/dashboard/page";
import { getEntitlements } from "@sports/types";

// ── element-tree helpers ─────────────────────────────────────────────────────

interface ElementNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

function isElement(node: unknown): node is ElementNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    typeof (node as { props: unknown }).props === "object" &&
    (node as { props: unknown }).props !== null
  );
}

function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  if (isElement(node)) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key === "children" || key === "className" || key === "style") continue;
      if (typeof value === "string" || typeof value === "number") out.push(String(value));
    }
    collectText(node.props.children, out);
  }
}

function textOf(tree: unknown): string {
  const out: string[] = [];
  collectText(tree, out);
  return out.join(" ");
}

function collectTestIds(node: unknown, out: Set<string>): void {
  if (node == null || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) collectTestIds(child, out);
    return;
  }
  if (isElement(node)) {
    const id = node.props["data-testid"];
    if (typeof id === "string") out.add(id);
    collectTestIds(node.props.children, out);
  }
}

function testIdsOf(tree: unknown): Set<string> {
  const out = new Set<string>();
  collectTestIds(tree, out);
  return out;
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const PENDING_POLICY = {
  canExposePerformanceStats: false,
  publicRecord: "Collecting…",
  publicWinRate: null,
  publicWinRateCiLabel: null,
  headlineMetric: { label: "Not yet published" },
  publicMessage: "The verified record opens once enough picks settle.",
};

describe("checkout return — /dashboard?upgraded=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user_new", email: "new@example.com", name: null, role: "USER" },
    });
    mocks.reconcile.mockResolvedValue(undefined);
    mocks.perfGate.mockResolvedValue({ canExposePerformanceStats: false });
    mocks.readinessGates.mockReturnValue({
      minSettledPicksForLearning: 100,
      canExposePerformanceStats: false,
    });
    mocks.perfPolicy.mockReturnValue(PENDING_POLICY);
    mocks.clvPolicy.mockResolvedValue(null);
    mocks.billingNotice.mockResolvedValue(null);
    mocks.count.mockResolvedValue(0);
    mocks.findMany.mockResolvedValue([]);
  });

  it("does NOT claim 'Subscription active' while the entitlement is still FREE", async () => {
    // The real race: checkout completed, but neither the webhook nor the
    // fail-safe Stripe reconcile has confirmed it yet.
    mocks.entitlements.mockResolvedValue(getEntitlements("FREE"));

    const tree = await DashboardPage({ searchParams: { upgraded: "true" } });
    const text = textOf(tree);
    const ids = testIdsOf(tree);

    expect(ids.has("upgrade-success-banner")).toBe(false);
    expect(text).not.toContain("Subscription active");
    expect(text).not.toContain("You're in");
    expect(text).not.toContain("now live on every pick");

    // ...and instead says something true, with a way forward.
    expect(ids.has("upgrade-pending-banner")).toBe(true);
    expect(text).toContain("Confirming your subscription");
    expect(text).toContain("Re-check now");
  });

  it("still confirms the purchase once the entitlement really is paid", async () => {
    mocks.entitlements.mockResolvedValue(getEntitlements("PRO"));

    const tree = await DashboardPage({ searchParams: { upgraded: "true" } });
    const text = textOf(tree);
    const ids = testIdsOf(tree);

    expect(ids.has("upgrade-success-banner")).toBe(true);
    expect(ids.has("upgrade-pending-banner")).toBe(false);
    expect(text).toContain("Subscription active");
    expect(text).toContain("now live on every pick");
  });

  it("does not promise the full betting board to a FANTASY subscriber", async () => {
    const fantasy = getEntitlements("FANTASY");
    // Pin the premise: FANTASY genuinely does not get the premium board.
    expect(fantasy.canSeePremiumPicks).toBe(false);
    mocks.entitlements.mockResolvedValue(fantasy);

    const tree = await DashboardPage({ searchParams: { upgraded: "true" } });
    const text = textOf(tree);
    const ids = testIdsOf(tree);

    // It IS a real purchase, so it is confirmed...
    expect(ids.has("upgrade-success-banner")).toBe(true);
    expect(text).toContain("Subscription active");
    // ...but it must not claim confidence scores / full factor trail on picks
    // that this plan still sees as the free teaser.
    expect(text).not.toContain("now live on every pick");
    expect(text).toContain("Your fantasy suite is unlocked");
  });

  it("shows neither banner on a normal dashboard visit", async () => {
    mocks.entitlements.mockResolvedValue(getEntitlements("FREE"));

    const tree = await DashboardPage({ searchParams: {} });
    const ids = testIdsOf(tree);

    expect(ids.has("upgrade-success-banner")).toBe(false);
    expect(ids.has("upgrade-pending-banner")).toBe(false);
  });
});
