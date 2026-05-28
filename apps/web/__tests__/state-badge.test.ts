import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { StateBadge } from "@/components/ui/state-badge";

/**
 * StateBadge — render assertion per state.
 *
 * Each of the seven readiness states must produce a visible label and
 * a stable data-state attribute so other tests (e.g. /intelligence
 * grid) can assert which state every card declares.
 */

const STATES = [
  "live",
  "preview",
  "beta",
  "demo",
  "waitlist",
  "internal",
  "locked",
] as const;

describe("StateBadge", () => {
  for (const state of STATES) {
    it(`renders the "${state}" state with a label and data-state attribute`, () => {
      const html = renderToStaticMarkup(
        createElement(StateBadge, { state, detail: "sample" })
      );
      expect(html).toContain(`data-state="${state}"`);
      expect(html).toContain(`data-testid="state-badge-${state}"`);
      expect(html.toLowerCase()).toContain("sample");
    });
  }

  it("supports a label override", () => {
    const html = renderToStaticMarkup(
      createElement(StateBadge, { state: "beta", label: "Beta · Gated" })
    );
    expect(html).toContain("Beta · Gated");
  });

  it("renders without a detail when none is provided", () => {
    const html = renderToStaticMarkup(
      createElement(StateBadge, { state: "live" })
    );
    expect(html).toContain(`data-state="live"`);
    expect(html.toLowerCase()).toContain("live");
  });
});
