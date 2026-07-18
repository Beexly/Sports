import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks — display-state + conversion contract.
 *
 * /picks is the platform's primary conversion surface (free teaser + paywall).
 * Every one of its display states must read clearly and guide conversion
 * without ever fabricating data or dressing a fault as a verdict. These are
 * source-level invariants (the page is an async server component that needs
 * Prisma + auth + a live fetch to render), matching the house test style in
 * picks-page-policy-gate.test.ts and states-matrix-slice.test.ts.
 *
 * Under test:
 *   1. Backend outage renders as its own designed state, DISTINCT from the
 *      deliberate bootstrap/stale gate, and never leaks the raw HTTP status.
 *   2. The locked (free-tier paywall) state always offers a conversion CTA.
 *   3. The empty / gated state fabricates nothing — no hardcoded picks, no
 *      invented record, no implication that picks exist when the board is dark.
 *   4. The loading state paints a skeleton, not a blank frame.
 *   5. The state blocks stay responsive (single-column base, wrapping rows).
 */

const webRoot = resolve(__dirname, "..");
const pageSrc = readFileSync(resolve(webRoot, "app/picks/page.tsx"), "utf8");
const cardSrc = readFileSync(resolve(webRoot, "components/picks/pick-card.tsx"), "utf8");
const loadingSrc = readFileSync(resolve(webRoot, "app/picks/loading.tsx"), "utf8");

/** Slice the exact JSX/source between two markers, so block-scoped assertions
 *  (e.g. "the outage copy differs from the gate copy") can never bleed across
 *  states. Both markers must exist and be ordered. */
function between(src: string, startMarker: string, endMarker: string): string {
  const s = src.indexOf(startMarker);
  expect(s, `expected start marker: ${startMarker}`).toBeGreaterThan(-1);
  const e = src.indexOf(endMarker, s + startMarker.length);
  expect(e, `expected end marker after start: ${endMarker}`).toBeGreaterThan(s);
  return src.slice(s, e);
}

// The three dark-board states, sliced to their own boundaries.
const outageBlock = between(
  pageSrc,
  'data-testid="picks-outage-state"',
  "{/* Empty state — the three designed dark states"
);
// Anchor the gate slice to its branch CONDITION (not the headline text, which is
// also name-dropped in the outage block's explanatory comment above it).
const gateBlock = between(
  pageSrc,
  "!fetchError && bootstrapState && picks.length === 0",
  "!fetchError && !bootstrapState",
);
const emptyBlock = between(pageSrc, "No signals published for this date", "{/* Picks grid */}");

describe("/picks — backend outage is a distinct, honest state (item 3)", () => {
  it("renders a dedicated, testable outage block gated on the fetch-failure branch", () => {
    expect(pageSrc).toContain('data-testid="picks-outage-state"');
    // The outage block is the fetchError branch; the gated/empty branches are
    // the complementary !fetchError branches — three genuinely separate states.
    expect(pageSrc).toMatch(/\{fetchError && \(/);
    expect(pageSrc).toMatch(/\{!fetchError && bootstrapState && picks\.length === 0 && \(/);
    // The true-empty branch also excludes the locked-upgrade state (a free board
    // that is empty only because the published picks are gated to paid tiers),
    // so it carries the `!lockedByPaywall` guard alongside the empty check.
    expect(pageSrc).toMatch(
      /\{!fetchError && !bootstrapState && picks\.length === 0 && !lockedByPaywall && \(/,
    );
  });

  it("never dumps the raw fetch error / HTTP status to the customer", () => {
    // The old block rendered `{fetchError}` (e.g. "Failed to fetch picks: 503")
    // straight into the UI. That raw dump must be gone from every render path.
    expect(pageSrc).not.toMatch(/>\s*\{fetchError\}\s*</);
    expect(pageSrc).not.toMatch(/\{fetchError\}<\/p>/);
    // The throw message still exists as an internal signal, but only as a
    // branch gate — it is never interpolated into the outage block's markup.
    expect(outageBlock).not.toContain("{fetchError}");
    expect(outageBlock).not.toMatch(/Failed to fetch/);
  });

  it("the outage copy says 'connection problem, not a verdict' and stays non-alarming", () => {
    expect(outageBlock).toMatch(/connection problem/i);
    expect(outageBlock).toMatch(/not a verdict/i);
    expect(outageBlock).toMatch(/Temporarily unavailable/i);
    // Calm caution palette, not the alarming red `alert` treatment it used to
    // wear — and role=status so it's announced without shouting.
    expect(outageBlock).toMatch(/border-caution/);
    expect(outageBlock).toMatch(/role="status"/);
    expect(outageBlock).not.toMatch(/border-alert|text-alert|bg-alert/);
  });

  it("outage copy is textually and visually distinct from the deliberate gate copy", () => {
    // The gate is a policy decision ("still gated" / "collecting"); the outage
    // is a transient fault. Neither may borrow the other's wording or palette.
    expect(gateBlock).toMatch(/still gated|collecting/i);
    expect(outageBlock).not.toMatch(/still gated|collecting/i);
    expect(gateBlock).not.toMatch(/connection problem/i);
    expect(gateBlock).toMatch(/cyan/);
    expect(outageBlock).not.toMatch(/\bcyan\b/);
  });
});

describe("/picks — locked/paywalled state always offers a path to unlock (item 4)", () => {
  it("the free-tier paywall banner links to /pricing", () => {
    const banner = between(pageSrc, 'data-testid="paywall-banner"', "function PicksTrustStrip");
    expect(banner).toMatch(/href="\/pricing"/);
    expect(banner).toMatch(/See plans/);
  });

  it("the locked confidence/edge value in a pick card is itself a /pricing link", () => {
    // The most-rendered conversion atom for FREE users must not dead-end.
    const locked = between(cardSrc, "function LockedValue(", "function MissingValue(");
    expect(locked).toMatch(/<Link\s+href="\/pricing"/);
    expect(locked).toMatch(/unlocks with Pro/i);
    // The entitled-but-absent case is deliberately NOT a sell (states doctrine).
    const missing = between(cardSrc, "function MissingValue(", "function DataQualityMeter(");
    expect(missing).not.toContain("/pricing");
  });

  it("free-tier users always see the paywall banner, and it keeps a CTA when the board is dark", () => {
    // Banner renders for every free-tier viewer, independent of pick count.
    expect(pageSrc).toMatch(/\{isFreeTier && \(\s*<PaywallBanner/);
    // The banner always routes to /pricing (the CTA lives below the headline
    // branch), so a free viewer is never dead-ended even when the board is dark.
    const banner = between(pageSrc, 'data-testid="paywall-banner"', "function PicksTrustStrip");
    expect(banner).toMatch(/href="\/pricing"/);
    // When the free board is dark because the published picks are gated to paid
    // tiers, the dedicated locked-upgrade state surfaces the real published
    // count and routes to /pricing, instead of claiming a sample is on screen.
    const lockedState = between(pageSrc, 'data-testid="picks-locked-upgrade"', "{/* Empty state");
    expect(lockedState).toMatch(/href="\/pricing"/);
    expect(lockedState).toMatch(/Upgrade to Pro/i);
  });

  it("the bottom upgrade CTA for free users with a board points at /pricing", () => {
    expect(pageSrc).toMatch(/\{isFreeTier && picks\.length > 0 && \(/);
    const cta = between(pageSrc, "Bottom upgrade CTA", "PRO conversion teaser");
    expect(cta).toMatch(/href="\/pricing"/);
    expect(cta).toMatch(/Upgrade to Pro/);
  });
});

describe("/picks — empty/gated state fabricates nothing (item 2)", () => {
  it("mounts no hardcoded pick fixtures anywhere on the page", () => {
    // Real picks flow through fetchPicks → PicksResponse.data only.
    expect(pageSrc).not.toMatch(/picks\s*=\s*\[\s*\{/);
    // Cards render strictly from the fetched array, and only when it is non-empty.
    expect(pageSrc).toMatch(/\{!fetchError && picks\.length > 0 && \(/);
    expect(pageSrc).toMatch(/picks\.map\(\(pick\) =>/);
  });

  it("the gated empty state is honest and carries no invented record/number", () => {
    expect(gateBlock).toMatch(/still gated/i);
    // No fabricated win rate / record / accuracy number in the dark state.
    expect(gateBlock).not.toMatch(/\d{1,3}\s*%/);
    expect(gateBlock).not.toMatch(/win\s*rate|record:|accuracy/i);
  });

  it("the no-data empty state says nothing was published, not that a pick exists", () => {
    expect(emptyBlock).toMatch(/No signals published/i);
    expect(emptyBlock).not.toMatch(/\d{1,3}\s*%/);
  });
});

describe("/picks — loading paints a skeleton (item 1)", () => {
  it("loading.tsx uses the house ToolPageSkeleton, not a blank frame", () => {
    expect(loadingSrc).toContain("ToolPageSkeleton");
    expect(loadingSrc).toMatch(/label=/);
  });
});

describe("/picks — state blocks stay responsive at mobile width (item 5)", () => {
  it("the pick grid is single-column at the mobile base", () => {
    expect(pageSrc).toMatch(/grid grid-cols-1 gap-5 sm:grid-cols-2/);
  });

  it("the paywall banner stacks before it goes horizontal", () => {
    const banner = between(pageSrc, 'data-testid="paywall-banner"', "function PicksTrustStrip");
    expect(banner).toMatch(/flex-col[\s\S]*sm:flex-row/);
  });

  it("filter rows wrap instead of forcing horizontal overflow", () => {
    // Sport tabs + grade pills can exceed 375px, so they must flex-wrap.
    expect(pageSrc).toMatch(/flex flex-wrap gap-2/);
  });

  it("the outage state copy is width-constrained and centered (no wide runs)", () => {
    expect(outageBlock).toMatch(/text-center/);
    expect(outageBlock).toMatch(/max-w-xl/);
  });
});
