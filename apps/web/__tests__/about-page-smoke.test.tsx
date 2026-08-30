import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

/**
 * Smoke test: /about — the public "why this exists" page.
 *
 * Reachable from the footer (About link). Makes public claims about the
 * product's honesty model, data sourcing, and operating principles.
 * A render regression here would silently break a core trust surface.
 *
 * This is the first of 5 smoke tests for untested LIVE routes (P16-05).
 * Nav and Footer are server/async components; stub them to keep the
 * render focused on the page's own JSX.
 */
vi.mock("@/components/ui/nav", () => ({
  Nav: (): null => null,
}));
vi.mock("@/components/ui/footer", () => ({
  Footer: (): null => null,
}));

import AboutPage from "@/app/about/page";

describe("/about smoke", () => {
  it("renders without throwing", async () => {
    const { container } = render(await AboutPage());
    await waitFor(() => {
      expect(container).not.toBeEmptyDOMElement();
    });
  });

  it("renders the main heading and principles", async () => {
    const { getByText } = render(await AboutPage());
    await waitFor(() => {
      expect(
        getByText(/Built for people tired of paying for picks/i),
      ).toBeInTheDocument();
    });
    // The four operating principles are the core content block.
    expect(
      getByText(/The four rules we don't break/i),
    ).toBeInTheDocument();
  });
});
