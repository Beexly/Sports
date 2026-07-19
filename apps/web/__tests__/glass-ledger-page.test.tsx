import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { SubstantiatedMetric } from "@/lib/ledger/display-guard";

/**
 * /ledger — The Glass Ledger (handoff §2 Phase 2). Pins the founder gate and
 * the honesty guarantees:
 *
 *   - PUBLISH_LEDGER unset (the default): an honest "being built" state —
 *     the sealed-vault design — with NO numbers anywhere — not a
 *     digit-percent pattern, not the phrase "win rate" (calibration is the
 *     lead, never win-rate framing), and zero rendered
 *     `[data-testid="ledger-metric-value"]` nodes (the guard's render path
 *     never even executes on this branch).
 *   - PUBLISH_LEDGER=true, with today's empty ledger-view contract: every
 *     metric cell renders the honest "not yet substantiated" state — still
 *     no digit-percent patterns and no "win rate" — because `renderableMetricOrNull`
 *     rejects every metric on this page today (none carry all four statutory
 *     legs; see `@/lib/ledger/display-guard`) — as the deliberately-styled
 *     `[data-testid="ledger-guard-refusal"]` element, not a blank cell.
 *   - PUBLISH_LEDGER=true with a MOCKED ledger-view supplying one fully
 *     substantiated fixture metric: the guard renders it, and all four
 *     bundle legs (coverage, lower bound, CLV backing, walk-forward
 *     lineage/hash) are visible in the DOM.
 *   - The "record defaults to all picks / transparency tool, never a
 *     cherry-pick" sentence is present in both states.
 *   - `robots` is noindex only while unpublished.
 */

// Nav is an async server component that calls auth(); Footer is pure chrome.
// Neither carries ledger data, so stub both to keep the render focused.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

import LedgerPage, { generateMetadata } from "@/app/glass-ledger/page";

const DIGIT_PERCENT = /\d+(\.\d+)?%/;

/** A metric that clears every statutory leg — mirrors the fixture pinned in ledger-display-guard.test.ts. */
const FULLY_SUBSTANTIATED_METRIC: SubstantiatedMetric = {
  label: "Straight-up settle rate",
  value: 0.583,
  coverage: { fired: 812, eligible: 940 },
  lowerBound: { method: "wilson", value: 0.552 },
  clv: { meanBps: 41, settledCount: 812 },
  provenance: {
    walkForward: true,
    modelVersion: "v5.1.0",
    stampHash: "b".repeat(64),
    generatedAt: "2026-06-01T00:00:00.000Z",
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/ledger — PUBLISH_LEDGER unset (default): honest unpublished state", () => {
  it("renders the exact 'being built' headline and no numbers anywhere", async () => {
    vi.unstubAllEnvs();
    const { container } = render(await LedgerPage());
    const text = container.textContent ?? "";

    expect(text).toContain("The Glass Ledger is being built — nothing is published yet.");
    expect(text).not.toMatch(DIGIT_PERCENT);
    expect(text.toLowerCase()).not.toContain("win rate");
  });

  it("renders ZERO numeric metric values — the guard's render path never executes here", async () => {
    const { container } = render(await LedgerPage());

    // The unpublished branch returns before any MetricValue/MetricTile/
    // DerivedValue mounts, so no guarded value — and no guard-refusal either,
    // since there is nothing to refuse — should ever appear on this branch.
    expect(container.querySelectorAll('[data-testid="ledger-metric-value"]').length).toBe(0);
    expect(container.querySelectorAll('[data-testid="ledger-guard-refusal"]').length).toBe(0);
  });

  it("still shows the sealed-vault design content — the four-field plaque and the verifier reference", async () => {
    const { container } = render(await LedgerPage());
    const text = container.textContent ?? "";

    // The specification plaque (four statutory legs), rendered as a visible
    // design element even though nothing is published yet.
    expect(text).toContain("Coverage");
    expect(text).toContain("Lower bound");
    expect(text).toContain("CLV backing");
    expect(text).toContain("Walk-forward lineage");
    // The open recompute verifier is named, not just alluded to.
    expect(text).toContain("scripts/edge-lab/recompute.ts");
  });

  it("keeps the vault-section cards from blowing out the page width on narrow viewports", async () => {
    // Regression: the sealed-vault `grid sm:grid-cols-3` cards embed a
    // `whitespace-pre` <code> command ("Independently re-computable"). Grid
    // items default to `min-width: auto`, so the unbreakable command string
    // forced the card wider than the viewport on mobile — the same confirmed
    // bug as /sealed's verify-path cards (see sealed-slate-page.test.tsx).
    // `min-w-0` on the grid item is the fix; pin it so it can't regress.
    const { container } = render(await LedgerPage());

    const heading = Array.from(container.querySelectorAll("h2")).find(
      (el) => el.textContent === "Independently re-computable"
    );
    expect(heading?.parentElement?.className).toContain("min-w-0");
  });

  it("carries the ALL-picks-default / transparency-tool sentence", async () => {
    const { container } = render(await LedgerPage());
    const text = container.textContent ?? "";

    expect(text).toContain("The record defaults to all picks");
    expect(text.toLowerCase()).toContain("transparency tool, never a cherry-pick");
  });

  it("never uses banned/marketing performance language", async () => {
    const { container } = render(await LedgerPage());
    const text = container.textContent ?? "";
    const lower = text.toLowerCase();

    expect(lower).not.toContain("proven");
    expect(lower).not.toContain("60%");
    expect(lower).not.toContain("guaranteed");
    expect(lower).not.toContain("roi");
    // No fabricated/sample rows or "coming soon" performance teasers.
    expect(lower).not.toContain("coming soon");
  });

  it("robots is noindex while unpublished", async () => {
    const meta = await generateMetadata();
    expect(meta.title).toBe("The Glass Ledger");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("/ledger — PUBLISH_LEDGER=true with today's empty ledger-view contract", () => {
  it("every metric cell renders the honest 'not yet substantiated' state, still no fabricated numbers", async () => {
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const { container } = render(await LedgerPage());
    const text = container.textContent ?? "";

    expect(text).not.toMatch(DIGIT_PERCENT);
    expect(text.toLowerCase()).not.toContain("win rate");
    expect(text).toContain("Not yet substantiated");
    expect(text).toContain("needs coverage + lower bound + CLV + provenance");
    // Season table skeleton columns are present even though no rows exist.
    expect(text).toContain("SU%");
    expect(text).toContain("ATS vs. Close");
    expect(text).toContain("CLV");
    expect(text).toContain("MAE");
    expect(text).toContain("No seasons recorded yet");
  });

  it("renders the guard-refusal element (not a blank cell) for every unsubstantiated metric", async () => {
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const { container } = render(await LedgerPage());

    // The headline strip alone renders four MetricTile instances, and with
    // today's always-empty contract every one of them is unsubstantiated —
    // so the deliberately-styled refusal element must be present, not just
    // implied by absent text. Zero `ledger-metric-value` nodes render
    // alongside it (nothing here fabricates a number).
    const refusals = container.querySelectorAll('[data-testid="ledger-guard-refusal"]');
    expect(refusals.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="ledger-metric-value"]').length).toBe(0);

    for (const node of Array.from(refusals)) {
      expect(node.textContent ?? "").toContain("Insufficient record — not shown");
    }
  });

  it("carries the ALL-picks-default / transparency-tool sentence and defaults the tier filter to All picks", async () => {
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const { container, getByText } = render(await LedgerPage());
    const text = container.textContent ?? "";

    expect(text).toContain("The record defaults to all picks");
    expect(text.toLowerCase()).toContain("transparency tool, never a cherry-pick");
    expect(getByText("All picks (default)").getAttribute("aria-current")).toBe("true");
  });

  it("robots is not forced to noindex once published", async () => {
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const meta = await generateMetadata();
    expect(meta.robots).toBeUndefined();
  });
});

describe("/ledger — PUBLISH_LEDGER=true with a fully substantiated fixture metric (mocked ledger-view)", () => {
  afterEach(async () => {
    vi.doUnmock("@/lib/ledger/ledger-view");
    vi.resetModules();
  });

  it("renders the value, and all four bundle legs — coverage, lower bound, CLV backing, walk-forward lineage — in the DOM", async () => {
    vi.resetModules();
    vi.doMock("@/lib/ledger/ledger-view", () => ({
      loadLedgerView: () => ({
        published: true,
        seasons: [
          {
            season: "2025",
            sport: "NFL",
            suPct: FULLY_SUBSTANTIATED_METRIC,
            atsVsClose: null,
            clv: null,
            mae: null,
          },
        ],
        calibration: null,
        significance: null,
        note: "fixture note",
      }),
    }));

    const { default: FixturePage } = await import("@/app/glass-ledger/page");
    const { container } = render(await FixturePage());
    const text = container.textContent ?? "";

    // The headline value itself, rendered through the real guard path.
    expect(text).toContain("58.3%");
    // Leg 1 — coverage.
    expect(text).toContain("812/940");
    // Leg 2 — Wilson lower bound.
    expect(text).toContain("55.2%");
    // Leg 3 — CLV backing.
    expect(text).toContain("+41.0 bps");
    // Leg 4 — walk-forward lineage (short hash form + model version).
    expect(text).toContain("bbbbbbbbbb");
    expect(text).toContain("v5.1.0");

    // A real substantiated value rendered — not a refusal — for this metric,
    // alongside refusals for everything else the fixture left unsubstantiated.
    expect(container.querySelectorAll('[data-testid="ledger-metric-value"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="ledger-guard-refusal"]').length).toBeGreaterThan(0);
  });
});
