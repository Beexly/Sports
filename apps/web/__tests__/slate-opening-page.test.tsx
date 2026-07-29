import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * /verify/slate/opening — the public explainer for the slate-commitment
 * opening layer (Phase 0.5b).
 *
 * This page is a STATIC explainer, not a per-slate checker: it never queries
 * a database and never calls the opening API itself. So the properties that
 * matter here are narrower than a data-driven page's, but non-negotiable:
 *
 *  1. Gated off by default. `SLATE_OPENING_REVEAL_ENABLED` is unset in git;
 *     the page must say openings are founder-gated and not yet enabled, and
 *     must point at the sealed commitment endpoint that IS live.
 *  2. It never fetches anything — the network must stay untouched regardless
 *     of gate state, because rendering this page must never itself perform
 *     (or appear to perform) the disclosure decision.
 *  3. No opener material — not even the field NAMES `blindingSum` /
 *     `aggregateValue` — appears anywhere in the page's source, mirroring the
 *     same ban already enforced on the route's JSON responses
 *     (slate-opening-route.test.ts). A source-scan is used because it is
 *     robust to how the copy is phrased and cannot be defeated by a rendering
 *     path this test happens not to exercise.
 *  4. The only cryptographic vocabulary used is "commitment" / "opening" /
 *     "binding" — no ZK or post-quantum language, ever.
 *  5. No performance claim (win rate, ROI, "proven", "guaranteed").
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

const ENV_KEY = "SLATE_OPENING_REVEAL_ENABLED";

// GeneratedPlate reads window.matchMedia in an effect when a motion asset is
// configured. The "proof-crystal" plate this page uses has no motion source
// today, so the effect short-circuits before touching matchMedia — but stub it
// anyway so this test does not silently start depending on that detail.
beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
});

beforeEach(() => {
  delete process.env[ENV_KEY];
});

afterEach(() => {
  delete process.env[ENV_KEY];
});

async function renderPage() {
  const { default: SlateOpeningPage } = await import("@/app/verify/slate/opening/page");
  return render(<SlateOpeningPage />);
}

async function pageText(): Promise<string> {
  return (await renderPage()).container.textContent ?? "";
}

describe("/verify/slate/opening — gated off by default (env unset)", () => {
  it("states plainly that openings are founder-gated and not yet enabled", async () => {
    const text = await pageText();
    expect(text).toContain("founder-gated");
    expect(text).toContain("not yet enabled");
  });

  it("points at the sealed commitment endpoint that remains verifiable", async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? "";
    expect(text).toContain("/api/verify/slate");
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(links).toContain("/api/verify/slate");
  });

  it("links to the machine-readable opening endpoint without ever calling it", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { container } = await renderPage();
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(links).toContain("/api/verify/slate/opening");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("shows the off badge, not the enabled badge", async () => {
    const { container } = await renderPage();
    const badge = container.querySelector('[data-testid="opening-gate-badge"]');
    expect(badge?.textContent).toBe("Openings founder-gated");
  });
});

describe("/verify/slate/opening — env enabled", () => {
  it("switches the badge and copy to the enabled state, still with no opener material", async () => {
    process.env[ENV_KEY] = "true";
    const { container } = await renderPage();
    const text = container.textContent ?? "";
    const badge = container.querySelector('[data-testid="opening-gate-badge"]');

    expect(badge?.textContent).toBe("Openings enabled");
    expect(text).toContain("Query");
    expect(text).toContain("/api/verify/slate/opening");
    // Still no rendered opener values — this is an explainer, not a lookup.
    expect(text).not.toMatch(/blindingSum|aggregateValue/i);
  });

  it("stays closed for near-miss flag values — only the exact string opens it", async () => {
    for (const v of ["", "false", "1", "TRUE", "yes"]) {
      process.env[ENV_KEY] = v;
      const { container } = await renderPage();
      const badge = container.querySelector('[data-testid="opening-gate-badge"]');
      expect(badge?.textContent, `flag value ${JSON.stringify(v)} must stay closed`).toBe(
        "Openings founder-gated",
      );
    }
  });
});

describe("/verify/slate/opening — what an opening does and does not prove", () => {
  it("states what an opening proves", async () => {
    const text = await pageText();
    expect(text).toContain("The total published before kickoff is the one being opened now");
    expect(text.toLowerCase()).toContain("binding check on the record");
  });

  it("states what an opening does NOT prove, and never asserts a performance claim", async () => {
    const text = await pageText();
    const lower = text.toLowerCase();

    expect(text).toContain("Whether the picks in that total were good");
    expect(text).toContain("Whether the edge behind them was real");
    expect(text).toContain("Whether the slate made money");

    // Non-negotiable across every honesty surface in the product.
    expect(lower).not.toContain("win rate");
    expect(lower).not.toContain("roi");
    expect(lower).not.toContain("guaranteed");
    expect(lower).not.toContain("proven");
  });

  it("explains the recomputation formula and the public H seed", async () => {
    const text = await pageText();
    expect(text).toContain("secp256k1");
    expect(text).toContain("GSE-pedersen-h-secp256k1-v1");
    expect(text).toContain("hash-and-increment");
  });
});

describe("/verify/slate/opening — metadata", () => {
  it("sets a canonical entry for this route", async () => {
    const { metadata } = await import("@/app/verify/slate/opening/page");
    expect(metadata.alternates?.canonical).toBe("/verify/slate/opening");
  });
});

describe("/verify/slate/opening — source scan (CI-enforced vocabulary)", () => {
  const source = readFileSync(
    join(__dirname, "..", "app/verify/slate/opening/page.tsx"),
    "utf8",
  );

  it("never spells out an opener field name anywhere in the page source", () => {
    // Mirrors the exact ban already enforced on the API route's JSON body in
    // slate-opening-route.test.ts. This page renders no fetched data at all,
    // so the assertion is on the SOURCE, not just the DOM: even a future edit
    // that added a hardcoded example must not reintroduce these tokens.
    expect(source).not.toMatch(/blindingSum|aggregateValue/i);
  });

  it("never uses ZK / post-quantum language, including in comments", () => {
    // Same word list no-zk-overclaim.mjs enforces (comments included,
    // deliberately — see that guardrail's own docstring).
    const banned = [
      "zero-knowledge",
      "zero knowledge",
      "zk proof",
      "zk-proof",
      "zk-snark",
      "zk snark",
      "zk-stark",
      "zk stark",
      "post-quantum",
      "post quantum",
      "quantum-resistant",
      "quantum resistant",
      "quantum-proof",
      "quantum proof",
    ];
    const lower = source.toLowerCase();
    for (const phrase of banned) {
      expect(lower, `page source must not contain "${phrase}"`).not.toContain(phrase);
    }
  });

  it("uses only commitment / opening / binding for this cryptographic layer", () => {
    expect(source).toMatch(/\bcommitment\b/i);
    expect(source).toMatch(/\bopening\b/i);
    expect(source).toMatch(/\bbinding\b/i);
  });
});
