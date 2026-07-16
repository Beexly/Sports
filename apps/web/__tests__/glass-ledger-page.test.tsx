import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * /ledger — The Glass Ledger (handoff §2 Phase 2). Pins the founder gate and
 * the honesty guarantees:
 *
 *   - PUBLISH_LEDGER unset (the default): an honest "being built" state,
 *     with NO numbers anywhere — not a digit-percent pattern, not the phrase
 *     "win rate" (calibration is the lead, never win-rate framing).
 *   - PUBLISH_LEDGER=true, with today's empty ledger-view contract: every
 *     metric cell renders the honest "not yet substantiated" state — still
 *     no digit-percent patterns and no "win rate" — because `renderableMetricOrNull`
 *     rejects every metric on this page today (none carry all four statutory
 *     legs; see `@/lib/ledger/display-guard`).
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
