import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SealedCommitment } from "@/lib/sealed/sealed-slate-view";

/**
 * /sealed — THE SEALED ENGINE, the commitment ritual (task #12). Pins the
 * founder gate, the "zero fabricated commitments" guarantee, and the flagship's
 * standing doctrine: the commitment and its verification are public; the METHOD
 * is not, and no pick's CONTENTS leak before kickoff.
 *
 *   - SEALED_ENGINE_ENABLED unset (default): an honest "being built" ritual —
 *     the mechanism explained, ZERO rendered commitment values, no 64-hex hash
 *     anywhere, and the verification paths named. robots is noindex.
 *   - Flag on + a REAL commitment fixture (mocked loader): the published root,
 *     the pre-kickoff timestamp, the population count, and the live re-fold path
 *     all render — and no sealed pick-content vocabulary appears.
 *   - Outage and quiet states are distinct (outage is not a verdict; a quiet
 *     day is restraint, not brokenness).
 */

// Nav is an async server component that calls auth(); Footer is pure chrome.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

const HEX64 = /[0-9a-f]{64}/i;

/** A well-formed, real commitment — the exact SealedCommitment shape, nothing more. */
const FIXTURE_COMMITMENT: SealedCommitment = {
  slateKey: "AMERICANFOOTBALL_NFL:2026-09-14",
  root: "a1b2c3d4".repeat(8), // 64 hex
  count: 12,
  committedAt: "2026-09-14T13:00:00.000Z",
};

// HashMaterialize (the reused engine atom) reads window.matchMedia in an effect;
// jsdom does not implement it. Shim it so the real client atom renders.
beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/sealed — SEALED_ENGINE_ENABLED unset (default): honest 'being built' ritual", () => {
  it("renders the exact 'being built' headline and NO commitment values", async () => {
    vi.unstubAllEnvs();
    const { default: SealedPage } = await import("@/app/sealed/page");
    const { container } = render(await SealedPage());
    const text = container.textContent ?? "";

    expect(text).toContain("The Sealed Engine is being built — nothing is sealed in public yet.");
    // Zero real seals, and — critically — no fabricated hash anywhere on the page.
    expect(container.querySelectorAll('[data-testid="sealed-commitment"]').length).toBe(0);
    expect(text, "no 64-hex hash may appear on the unpublished ritual").not.toMatch(HEX64);
  });

  it("still explains the mechanism: the three ritual stages and both verify paths", async () => {
    const { default: SealedPage } = await import("@/app/sealed/page");
    const { container } = render(await SealedPage());
    const text = container.textContent ?? "";

    expect(text).toContain("Commit — before kickoff");
    expect(text).toContain("Seal — nothing can move");
    expect(text).toContain("Reveal — check it yourself");
    // The verification paths are named, not merely alluded to.
    expect(text).toContain("/api/verify/slate");
    expect(text).toContain("scripts/edge-lab/recompute.ts");
  });

  it("refuses fabrication explicitly and never uses banned performance language", async () => {
    const { default: SealedPage } = await import("@/app/sealed/page");
    const { container } = render(await SealedPage());
    const lower = (container.textContent ?? "").toLowerCase();

    expect(lower).toContain("ship this empty than ship it fabricated");
    expect(lower).not.toContain("proven");
    expect(lower).not.toContain("guaranteed");
    expect(lower).not.toContain("win rate");
    expect(lower).not.toContain("roi");
    expect(lower).not.toContain("coming soon");
  });

  it("is noindex while unpublished", async () => {
    const { generateMetadata } = await import("@/app/sealed/page");
    const meta = await generateMetadata();
    expect(meta.title).toBe("The Sealed Engine: Watch the Machine Commit");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("/sealed — flag on, a REAL commitment fixture (mocked loader)", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/sealed/sealed-slate-view");
    vi.resetModules();
  });

  async function renderWithView(view: unknown) {
    vi.resetModules();
    vi.doMock("@/lib/sealed/sealed-slate-view", () => ({
      loadSealedSlateView: () => Promise.resolve(view),
    }));
    const { default: SealedPage } = await import("@/app/sealed/page");
    return render(await SealedPage());
  }

  it("renders the published root, the pre-kickoff timestamp, the count, and the live re-fold path", async () => {
    const { container } = await renderWithView({
      published: true,
      unreachable: false,
      generatedAt: "2026-09-14T15:00:00.000Z",
      commitments: [FIXTURE_COMMITMENT],
    });
    const text = container.textContent ?? "";

    // A real seal is rendered.
    expect(container.querySelectorAll('[data-testid="sealed-commitment"]').length).toBe(1);
    // The published root hash reaches the DOM (in full, for copy/paste + a11y).
    expect(text).toContain(FIXTURE_COMMITMENT.root);
    // The pre-kickoff publish timestamp.
    expect(text).toContain("14 Sep 2026");
    // The pre-registered population count + label.
    expect(container.querySelector('[data-testid="sealed-commitment-count"]')?.textContent).toBe("12");
    expect(text).toContain("picks sealed before kickoff");
    // The live re-fold verification path, keyed to this exact slate.
    const verifyLink = container.querySelector(
      'a[href^="/api/verify/slate?slateKey="]',
    ) as HTMLAnchorElement | null;
    expect(verifyLink).not.toBeNull();
    expect(verifyLink?.getAttribute("href")).toContain(encodeURIComponent(FIXTURE_COMMITMENT.slateKey));
  });

  it("leaks NO sealed pick contents — only the fingerprint, count, and timestamp", async () => {
    const { container } = await renderWithView({
      published: true,
      unreachable: false,
      generatedAt: "2026-09-14T15:00:00.000Z",
      commitments: [FIXTURE_COMMITMENT],
    });
    const lower = (container.textContent ?? "").toLowerCase();

    // None of the sealed payload / method vocabulary may appear pre-kickoff.
    for (const leak of [
      "payload",
      "selection",
      "moneyline",
      "confidence",
      "reasoning",
      "factor",
      "weight",
      "threshold",
      "formula",
    ]) {
      expect(lower, `sealed page must not leak "${leak}"`).not.toContain(leak);
    }
  });

  it("shows a distinct outage state (not a verdict) when the feed is unreachable", async () => {
    const { container } = await renderWithView({
      published: true,
      unreachable: true,
      generatedAt: "2026-09-14T15:00:00.000Z",
      commitments: [],
    });
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-testid="sealed-unreachable-state"]')).not.toBeNull();
    expect(text).toContain("not a verdict");
    // An outage must not fabricate a seal.
    expect(text).not.toMatch(HEX64);
  });

  it("shows a distinct quiet state (restraint, not brokenness) when nothing is sealed yet", async () => {
    const { container } = await renderWithView({
      published: true,
      unreachable: false,
      generatedAt: "2026-09-14T15:00:00.000Z",
      commitments: [],
    });
    const text = container.textContent ?? "";
    expect(container.querySelector('[data-testid="sealed-quiet-state"]')).not.toBeNull();
    expect(text).toContain("Nothing sealed yet");
    expect(text).not.toMatch(HEX64);
  });
});

describe("/sealed — method opacity (CI-enforced page source)", () => {
  it("renders no method vocabulary in page copy", () => {
    const page = readFileSync(join(__dirname, "..", "app/sealed/page.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const banned of ["factor", "weight", "threshold", "formula", "model"]) {
      expect(page.toLowerCase(), `page copy must not mention ${banned}`).not.toContain(banned);
    }
  });
});
