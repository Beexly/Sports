import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntitlements } from "@sports/types";

/**
 * /picks — paywall copy truth contract.
 *
 * The /picks board is the highest-trafficked customer surface. A FALSE claim
 * to Free users that contradicts the server-enforced paywall is a HIGH-severity
 * integrity bug. This locks the copy to the DOCUMENTED product model:
 *
 *   FREE = a small daily TEASER (dailyPickLimit picks), public Edge Index only,
 *          NO confidence scores. The full board is a paid (Pro) feature.
 *   PRO  = the full board + confidence score + factor trail + line movement.
 *
 * The copy must never say the free board is "every pick, free" or has "no daily
 * limit" — the server hard-filters FREE tier and applies a take limit.
 *
 * Source-level assertions (the full server component needs Prisma + auth); the
 * model-alignment and API-gate assertions run against the real entitlements
 * source of truth and the live route, so a copy/paywall drift fails the build.
 */

const repoRoot = resolve(__dirname, "..");
const picksSrc = readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8");
const routeSrc = readFileSync(resolve(repoRoot, "app/api/picks/route.ts"), "utf8");

/** Slice of the source that renders the locked/upgrade empty state. */
function lockedBlock(): string {
  const start = picksSrc.indexOf('data-testid="picks-locked-upgrade"');
  expect(start).toBeGreaterThan(-1);
  // Grab a generous window covering the whole card.
  return picksSrc.slice(start, start + 1200);
}

describe("/picks — the documented FREE model is the ground truth", () => {
  it("getEntitlements('FREE') is a capped teaser with no premium board", () => {
    const free = getEntitlements("FREE");
    // The copy claims a small daily teaser — that number must be the enforced
    // dailyPickLimit, and it must be finite (not the unlimited PRO board).
    expect(free.dailyPickLimit).toBe(2);
    expect(free.canSeePremiumPicks).toBe(false);
    // Confidence is a paid metric; the free teaser copy claims "no confidence
    // scores", which must match the entitlement.
    expect(free.canSeeConfidence).toBe(false);
    // Edge Index is the free trust signal the teaser copy leans on.
    expect(free.canSeeEdgeScore).toBe(true);
  });

  it("PRO unlocks the full board + confidence the copy promises", () => {
    const pro = getEntitlements("PRO");
    expect(pro.canSeePremiumPicks).toBe(true);
    expect(pro.canSeeConfidence).toBe(true);
    expect(pro.dailyPickLimit).toBeNull();
  });
});

describe("/picks — no false 'free / no-limit' copy survives", () => {
  it("never claims the free board has no daily limit", () => {
    expect(picksSrc).not.toMatch(/no daily limit/i);
  });

  it("never claims every pick is free", () => {
    expect(picksSrc).not.toMatch(/every pick,? free/i);
    expect(picksSrc).not.toMatch(/every pick is free/i);
  });

  it("does not call the free view a 'sample' (it is a defined teaser)", () => {
    expect(picksSrc).not.toMatch(/free sample/i);
  });
});

describe("/picks — the free teaser copy states the true model", () => {
  it("describes a daily teaser with no confidence scores", () => {
    expect(picksSrc).toMatch(/daily teaser/i);
    expect(picksSrc).toMatch(/no confidence scores/i);
  });

  it("drives the teaser size from entitlements, not a hardcoded absolute", () => {
    expect(picksSrc).toMatch(/teaserSize\s*=\s*entitlements\.dailyPickLimit\s*\?\?\s*2/);
    // The banner receives dailyPickLimit and derives its own teaserSize from it.
    expect(picksSrc).toMatch(/dailyPickLimit=\{entitlements\.dailyPickLimit\}/);
    expect(picksSrc).toMatch(/teaserSize\s*=\s*dailyPickLimit\s*\?\?\s*2/);
  });

  it("points free users to Pro for the full board (never the reverse)", () => {
    expect(picksSrc).toMatch(/Pro unlocks the full board/);
  });
});

describe("/picks — empty board is honest about the paywall", () => {
  it("gates the locked state on a free viewer, empty board, real count > 0", () => {
    expect(picksSrc).toMatch(
      /lockedByPaywall\s*=\s*[\s\S]{0,40}isFreeTier\s*&&[\s\S]{0,80}picks\.length\s*===\s*0\s*&&[\s\S]{0,120}totalAvailableToday\s*!==\s*null\s*&&[\s\S]{0,40}totalAvailableToday\s*>\s*0/
    );
  });

  it("renders the real published count from API meta (not a fabricated N)", () => {
    const block = lockedBlock();
    // The count shown is the interpolated meta value immediately before the
    // date-aware "published for this date" claim — never a literal.
    expect(block).toMatch(/\{totalAvailableToday\}[\s\S]{0,120}published for this date/i);
    // No hardcoded pick-count digit is presented as the published total.
    expect(block).not.toMatch(/\b\d+\s+picks?\s+published for this date/i);
    // Finding B: the locked-state count copy is date-aware, never "today".
    expect(block).not.toMatch(/published today/i);
  });

  it("routes the locked state to the /pricing upgrade CTA", () => {
    const block = lockedBlock();
    expect(block).toMatch(/href="\/pricing"/);
    expect(block).toMatch(/Upgrade to Pro/);
  });

  it("shows the locked state instead of the true-empty state when paywalled", () => {
    // The true-empty branch must yield to the locked branch.
    expect(picksSrc).toMatch(/picks\.length === 0 && !lockedByPaywall/);
  });
});

describe("/picks — the true-empty state fabricates nothing", () => {
  it("reflects the active sport filter rather than always blaming the date", () => {
    expect(picksSrc).toMatch(/activeSportLabel\s*\?\s*`No \$\{activeSportLabel\} signals published for this date`/);
    expect(picksSrc).toMatch(
      /activeSportLabel\s*=\s*sport[\s\S]{0,80}SPORTS\.find\([\s\S]{0,80}\?\?\s*null/
    );
  });

  it("carries no numeric performance / record claim in the empty copy", () => {
    // The empty + locked states must not invent win-rate / record numbers.
    const start = picksSrc.indexOf('data-testid="picks-locked-upgrade"');
    const region = picksSrc.slice(start, start + 2400);
    expect(region).not.toMatch(/win\s*rate/i);
    expect(region).not.toMatch(/\d{1,3}\s*%/);
    expect(region).not.toMatch(/record\s*:\s*\d/i);
  });
});

describe("/picks — the three Codex findings stay fixed", () => {
  // ── Finding A — the anon banner / bottom CTA must not present the teaser
  //    LIMIT as the actual count. On a zero/low-pick day the banner renders
  //    above the empty/locked state; an exact "N picks" claim would contradict
  //    "No signals published" on the same page. The count is an "up to N" cap. ──
  it("presents the teaser as an 'up to {teaserSize}' cap, never an exact count", () => {
    // The cap phrasing is what renders wherever the teaser size is shown.
    expect(picksSrc).toMatch(/up to \$\{teaserSize\} picks/);
    // No copy asserts the teaser as a definite quantity the page can't guarantee.
    expect(picksSrc).not.toMatch(/teaser:\s*\$\{teaserSize\} picks/);
    expect(picksSrc).not.toMatch(/\$\{teaserSize\}-pick/);
    // The anon banner headline uses the cap, not "${teaserSize} picks,".
    expect(picksSrc).toMatch(
      /You're seeing today's free teaser: up to \$\{teaserSize\} picks/
    );
  });

  // ── Finding B — the published-count copy must track the SELECTED date, not
  //    hard-code "today". fetchPicks forwards ?date= / the date picker to the
  //    API, so "today" is wrong for a non-today slate. Match the empty-state
  //    "for this date" phrasing. ──
  it("makes every published-count claim date-aware ('this date'), not 'today'", () => {
    // Banner over-limit headline is date-aware.
    expect(picksSrc).toMatch(
      /\$\{totalAvailableToday\} picks published for this date\. Upgrade to Pro/
    );
    expect(picksSrc).not.toMatch(/\$\{totalAvailableToday\} picks published today/);
    // Locked-upgrade state is date-aware (mirrors the empty-state wording).
    // Tolerate the JSX line wrap between "date." and "Upgrade".
    const block = lockedBlock();
    expect(block).toMatch(/published for this date\.\s+Upgrade to Pro to see them/);
    expect(block).not.toMatch(/published today/i);
  });

  // ── Finding C — a paid non-Pro (FANTASY) signed-in user sees only the teaser
  //    on the betting board, but is NOT on Free. The copy must not tell them
  //    "You're on Free"; the real subscription tier is threaded in and gates
  //    neutral limited-board wording instead. ──
  it("threads the real tier into the banner (not just entitlement booleans)", () => {
    expect(picksSrc).toMatch(/tier=\{entitlements\.tier\}/);
    expect(picksSrc).toMatch(/tier:\s*SubscriptionTier/);
    expect(picksSrc).toMatch(/isPaidTeaser\s*=\s*tier\s*!==\s*"FREE"/);
  });

  it("gives a paid non-Pro (Fantasy) viewer neutral wording, not 'You're on Free'", () => {
    // Neutral limited-board wording exists for the paid-teaser branch.
    expect(picksSrc).toMatch(/sees the daily teaser on the betting board/);
    // Every "You're on Free" label is the ELSE of a paid-teaser guard — it is
    // reachable ONLY for a genuinely-free viewer, never for all signed-in users.
    const labels = [...picksSrc.matchAll(/You're on Free/g)];
    expect(labels.length).toBeGreaterThan(0);
    // The banner label is guarded by isPaidTeaser; the CTA label by the tier check.
    expect(picksSrc).toMatch(/isPaidTeaser[\s\S]{0,240}You're on Free/);
    expect(picksSrc).toMatch(/entitlements\.tier\s*!==\s*"FREE"[\s\S]{0,240}You're on Free/);
    // "You're on Free" is never the direct consequent of `hasAccount ?`.
    expect(picksSrc).not.toMatch(/hasAccount\s*\n?\s*\?\s*`You're on Free/);
  });
});

describe("/picks — the server paywall is NOT weakened by the copy fix", () => {
  it("still hard-filters non-premium viewers to the FREE tier", () => {
    expect(routeSrc).toMatch(
      /entitlements\.canSeePremiumPicks\s*\?\s*\{\}\s*:\s*\{\s*tier:\s*"FREE"\s*\}/
    );
  });

  it("still caps the response to the entitled daily limit after projection", () => {
    expect(routeSrc).toMatch(/take:\s*candidateTake/);
    expect(routeSrc).toMatch(/const publicPicks\s*=\s*projectedPicks\.slice/);
    expect(routeSrc).toMatch(/dailyLimit === null[\s\S]{0,100}Math\.max\(0, dailyLimit\)/);
  });

  it("still gates confidence on the viewer entitlement, not the pick tier", () => {
    expect(routeSrc).toMatch(/entitlements\.canSeeConfidence\s*\?\s*pick\.confidence\s*:\s*null/);
  });
});
