import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * /board/gate — the gate decided live, in front of the reader.
 *
 * The page's whole value rests on three properties, so all three are pinned:
 *
 *  1. It runs the REAL gate. If the decision logic were ever swapped for
 *     hand-written outcomes, the page would become the thing it argues
 *     against. The reason strings come from the consumer, so asserting they
 *     match the consumer's own vocabulary catches a divergence.
 *  2. It never asserts a performance number. This is a public honesty surface;
 *     a stray percentage here would be exactly the fabrication the product
 *     refuses elsewhere.
 *  3. Its claims about the INPUTS track the actual mode. The failure this
 *     guards is the worst one available to this page: illustrative rows shown
 *     under a live label, or live rows disclaimed as illustrative. Both are
 *     tested by driving the real `resolveGateSlate` through a mocked loader,
 *     rather than by mocking the mode itself — mocking the mode would assert
 *     only that the page renders a variable it was handed.
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

// The DB boundary, not the mode decision. `resolveGateSlate` runs for real.
const flagEnabled = vi.fn((): boolean => false);
const fetchSlate = vi.fn();
vi.mock("@/lib/board/load-gate-slate", () => ({
  isLiveGateSlateEnabled: (): boolean => flagEnabled(),
  fetchGateSlate: (): unknown => fetchSlate(),
}));

import GatePage, { metadata } from "@/app/board/gate/page";
import { buildCalibrationRows, buildCandidateRows, type RawPickRow } from "@/lib/board/gate-rows";

const DIGIT_PERCENT = /\d+(\.\d+)?%/;

/** Render the async server component. */
async function renderPage(): Promise<HTMLElement> {
  return render(await GatePage()).container;
}

async function pageText(): Promise<string> {
  return (await renderPage()).textContent ?? "";
}

beforeEach(() => {
  flagEnabled.mockReset();
  flagEnabled.mockReturnValue(false);
  fetchSlate.mockReset();
});

describe("/board/gate — illustrative mode (the default)", () => {
  it("renders without a live database dependency", async () => {
    await expect(renderPage()).resolves.toBeTruthy();
    // The default path must not even attempt a read.
    expect(fetchSlate).not.toHaveBeenCalled();
  });

  it("shows all three kinds of 'no' as distinct, named states", async () => {
    const text = await pageText();

    // The distinction is the point of the page.
    expect(text).toContain("No bet");
    expect(text).toContain("Not judged");
    expect(text).toContain("Not evaluated");
    expect(text).toContain("Collapsing these into a single");
  });

  it("surfaces the gate's own reason vocabulary, not page-authored copy", async () => {
    const text = await pageText();

    // These strings live in gate-consumer.ts. If the page ever stops calling
    // the real consumer, they disappear and this fails.
    expect(text).toContain("not enough settled history");
    expect(text).toContain("not a judgement about the game");
  });

  it("states plainly that the inputs are illustrative and the logic is real", async () => {
    const text = await pageText();

    expect(text).toContain("The decision logic is production code");
    expect(text).toContain("The input rows are illustrative");
    expect(text.toLowerCase()).toContain("not today's slate");
    expect(text).toContain("Illustrative inputs");
  });

  it("asserts NO performance number anywhere on the page", async () => {
    const text = await pageText();

    // A digit-percent is the actual fabrication signal — a rate presented as
    // fact. Absence of one is the property that matters.
    expect(text).not.toMatch(DIGIT_PERCENT);

    // "win rate" and "roi" DO appear on the page, inside its own non-claim
    // ("No win rate, ROI, or edge is asserted..."). A naive substring ban
    // would fail on the disclaimer itself — punishing the page for being
    // explicit about what it refuses to claim. So assert the disclaimer is
    // present rather than banning the words.
    expect(text).toContain("No win rate, ROI, or performance result is asserted");

    // The page DOES print a lower-bound edge on fired rows — that number is
    // evidence the gate really ran. It must therefore be labelled as arithmetic
    // on illustrative inputs, or it reads as a measured edge and contradicts
    // the non-claim directly above it.
    expect(text).toContain("not a measured edge in any real market");
    expect(text).toContain("on illustrative inputs");

    // These have no honest use on this surface in any context.
    expect(text.toLowerCase()).not.toContain("proven");
    expect(text.toLowerCase()).not.toContain("guaranteed");
  });

  it("discloses the edge threshold rather than leaving the bar implicit", async () => {
    const text = await pageText();

    // A reader cannot judge the outcomes without knowing the bar they were
    // judged against. Pinned so the threshold can never quietly become a
    // tuned, undisclosed number.
    expect(text).toContain("edge threshold");
    expect(text).toContain("with no added margin");
  });

  it("carries explicit non-claims, including that nothing is persisted", async () => {
    const text = await pageText();

    expect(text).toContain("What this page does not claim");
    expect(text).toContain("Nothing here is persisted to the ledger");
    expect(text).toContain("not today's published picks");
  });

  it("does not claim the gate already governs the published board", async () => {
    // It runs the real gate, but nothing on /board is decided by it yet.
    // Claiming otherwise would overstate where this is wired — on the one page
    // that cannot afford to.
    const text = await pageText();
    expect(text).toContain("does not yet decide the published board");
  });

  it("distinguishes itself from the agent-governance claim", async () => {
    const container = await renderPage();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/integrity");
    expect(container.textContent).toContain("separate claim about a separate subject");
  });

  it("is deterministic — two renders produce identical decisions", async () => {
    const a = await pageText();
    const b = await pageText();
    expect(a).toBe(b);
  });

  it("sets a canonical metadata entry", () => {
    expect(metadata.alternates?.canonical).toBe("/board/gate");
  });
});

/**
 * A minimal live slate: enough settled nfl|SPREAD history to clear the
 * calibration floor, plus one pending candidate. Built through the real row
 * builders so the rows are the shape the gate actually receives.
 */
function liveSlate(): {
  calibration: ReturnType<typeof buildCalibrationRows>;
  candidates: ReturnType<typeof buildCandidateRows>;
  undescribable: number;
} {
  const mk = (i: number, result: RawPickRow["result"]): RawPickRow => ({
    id: `live-${result}-${i}`,
    selection: `Real Home ${i} -2.5`,
    confidence: 50 + (i % 30),
    pickType: "SPREAD",
    result,
    sportName: "nfl",
    homeTeamName: `Real Home ${i}`,
    awayTeamName: `Real Away ${i}`,
    homePrice: -110,
    awayPrice: -110,
  });

  const settled: RawPickRow[] = [];
  for (let i = 0; i < 200; i++) settled.push(mk(i, i % 2 === 0 ? "WIN" : "LOSS"));

  return {
    calibration: buildCalibrationRows(settled),
    candidates: buildCandidateRows([mk(900, "PENDING")]),
    undescribable: 0,
  };
}

describe("/board/gate — live mode", () => {
  beforeEach(() => {
    flagEnabled.mockReturnValue(true);
  });

  it("labels the slate live and drops the illustrative disclaimer", async () => {
    fetchSlate.mockResolvedValue(liveSlate());
    const text = await pageText();

    expect(text).toContain("Live slate");
    expect(text).toContain("today's published slate");
    // The illustrative disclaimer must NOT survive into live mode — leaving it
    // in would disclaim real rows as invented, which is dishonest in the
    // opposite direction and would make the page useless as evidence.
    expect(text).not.toContain("The input rows are illustrative");
    expect(text).not.toContain("on illustrative inputs");
    expect(text).not.toContain("not today's published picks");
  });

  it("still asserts no performance number, and still runs the real gate", async () => {
    fetchSlate.mockResolvedValue(liveSlate());
    const text = await pageText();

    // The property that must hold in EVERY mode. A live slate is exactly when
    // the temptation to print a rate is strongest.
    expect(text).not.toMatch(DIGIT_PERCENT);
    expect(text).toContain("No win rate, ROI, or performance result is asserted");
    expect(text.toLowerCase()).not.toContain("guaranteed");
    // Real consumer vocabulary, same as illustrative mode.
    expect(text).toContain("What the gate returned");
  });

  it("warns that a live price is the one evaluated, not the one obtainable", async () => {
    fetchSlate.mockResolvedValue(liveSlate());
    const text = await pageText();
    expect(text).toContain("not the one you would get");
  });

  it("reports undescribable rows instead of dropping them silently", async () => {
    fetchSlate.mockResolvedValue({ ...liveSlate(), undescribable: 3 });
    const text = await pageText();
    expect(text).toContain("could not be described completely enough to judge");
  });
});

describe("/board/gate — fails closed, and says so", () => {
  beforeEach(() => {
    flagEnabled.mockReturnValue(true);
  });

  it("falls back to illustrative WITH a stated reason when the read throws", async () => {
    fetchSlate.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const text = await pageText();

    // Fell back...
    expect(text).toContain("Illustrative inputs");
    expect(text).toContain("The input rows are illustrative");
    expect(text).not.toContain("Live slate");
    // ...and admitted it.
    expect(text).toContain("could not be read on this request");
    // Without leaking infrastructure detail onto an unauthenticated page.
    expect(text).not.toContain("ECONNREFUSED");
    expect(text).not.toContain("10.0.0.5");
  });

  it("falls back with a reason when no live slate is available", async () => {
    fetchSlate.mockResolvedValue(null);
    const text = await pageText();

    expect(text).toContain("Illustrative inputs");
    expect(text).toContain("No live slate is available in this environment");
  });

  it("never shows an empty live board as a live board", async () => {
    // The failure this prevents: a live read that found nothing to judge,
    // rendered as a live slate, asserts "we considered today's games and
    // declined them all". The truth is that there was nothing to consider.
    fetchSlate.mockResolvedValue({
      calibration: buildCalibrationRows([]),
      candidates: buildCandidateRows([]),
      undescribable: 0,
    });
    const text = await pageText();

    expect(text).not.toContain("Live slate");
    expect(text).toContain("had no upcoming games to judge");
    // And the illustrative board is genuinely shown, not an empty page.
    expect(text).toContain("Not judged");
  });
});
