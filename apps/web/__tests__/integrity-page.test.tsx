import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * /integrity — public "Governed Decision Path" front door. Pins:
 *   - it renders without a live database/query (pure server component)
 *   - the NON-CLAIMS are actually present in the rendered DOM, not just in
 *     source comments
 *   - it distinguishes itself from /accountability (betting-picks record)
 *   - it links to real, checkable artifacts (SRQC_STATUS.md sections, the
 *     demo script, the public keyring route) rather than fabricating a
 *     live counter
 *   - no digit-percent pattern anywhere (no invented shadow-would-refuse
 *     number, no fake uptime theater)
 */

vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

import IntegrityPage, { metadata } from "@/app/integrity/page";

const DIGIT_PERCENT = /\d+(\.\d+)?%/;

describe("/integrity", () => {
  it("renders without throwing and without any live data dependency", () => {
    expect(() => render(<IntegrityPage />)).not.toThrow();
  });

  it("carries every NON-CLAIM sentence in the rendered DOM", () => {
    const { container } = render(<IntegrityPage />);
    const text = container.textContent ?? "";

    expect(text).toContain("Not a parameterized (∀N) proof");
    expect(text).toContain("Not a production enforce-by-default posture");
    expect(text).toContain(
      "Not a claim about bet-settlement correctness or any user-facing betting logic",
    );
    expect(text).toContain("Not a SOC 2, ISO 27001, or EU AI Act certification");
    expect(text).toContain("Not autonomous");
  });

  it("never renders a fabricated digit-percent claim anywhere on the page", () => {
    const { container } = render(<IntegrityPage />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(DIGIT_PERCENT);
  });

  it("links to SRQC_STATUS.md, the demo script, and the public keyring instead of a live counter", () => {
    const { container } = render(<IntegrityPage />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );

    expect(hrefs).toContain("/.well-known/receipt-keys.json");
    expect(
      hrefs.some((h) => h?.includes("docs/formal/SRQC_STATUS.md")),
    ).toBe(true);
    expect(hrefs.some((h) => h?.includes("docs/devrel/DEMO_SCRIPT.md"))).toBe(
      true,
    );
    // Points readers to the active-certificate and attack-checklist sections
    // this PR added to SRQC_STATUS.md, not a stale link.
    expect(
      hrefs.some((h) => h?.includes("#10-active-certificate")),
    ).toBe(true);
    expect(
      hrefs.some((h) => h?.includes("#11-attack-checklist-for-outsiders")),
    ).toBe(true);
  });

  it("distinguishes itself from the betting-picks accountability surface", () => {
    const { container } = render(<IntegrityPage />);
    const text = container.textContent ?? "";

    expect(text.toLowerCase()).not.toContain("win rate");
    expect(text.toLowerCase()).not.toContain("closing line value");
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/accountability");
  });

  it("does not link to the admin-only /cockpit/integrity ledger", () => {
    const { container } = render(<IntegrityPage />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );

    expect(hrefs.some((h) => h?.includes("/cockpit"))).toBe(false);
  });

  it("sets a canonical /integrity metadata entry", () => {
    expect(metadata.alternates?.canonical).toBe("/integrity");
    expect(metadata.title).toContain("Integrity");
  });
});
