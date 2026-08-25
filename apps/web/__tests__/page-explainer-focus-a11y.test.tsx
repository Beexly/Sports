import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PageExplainer } from "@/components/explainers/page-explainer";
import type { PageExplainer as PageExplainerData } from "@/lib/explainers/registry";

/**
 * PageExplainer is mounted once in the ROOT LAYOUT and its launcher renders on
 * every route with a registered explainer — including "/" (the homepage) and
 * "/board" (the picks board). Both are on the paid-conversion path, so its
 * modal is the first dialog many visitors ever open on this product.
 *
 * It already declares role="dialog" + aria-modal="true", focuses its close
 * button, locks body scroll and closes on Escape. It was missing the same two
 * halves of the focus contract as EvidenceAuditDrawer:
 *
 *   TRAP    — Tab walked out of the dialog into the homepage behind it, which
 *             aria-modal="true" has just told assistive tech does not exist.
 *   RESTORE — on close, focus was dropped on <body>, so the visitor had to
 *             re-tab the entire homepage to get back to the launcher.
 *
 * (WCAG 2.4.3.) Queries go through accessible role and name; assertions are
 * RUNTIME (apps/web/tsconfig.json excludes __tests__ from typecheck).
 */

const EXPLAINER: PageExplainerData = {
  route: "/",
  title: "Start here: what Galaxy is",
  durationLabel: "0:40",
  intro: "New here?",
  beats: [
    { tag: "The idea", body: "The market is mostly noise." },
    { tag: "Your move", body: "Start at the Board." },
  ],
};

const LAUNCHER = { name: /guided walkthrough/i } as const;

describe("PageExplainer — modal focus contract", () => {
  it("traps Tab inside the guide instead of letting it reach the page behind", async () => {
    const user = userEvent.setup();
    render(<PageExplainer explainer={EXPLAINER} />);

    await user.click(screen.getByRole("button", LAUNCHER));
    const dialog = await screen.findByRole("dialog", { name: EXPLAINER.title });

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("traps Shift+Tab inside the guide too", async () => {
    const user = userEvent.setup();
    render(<PageExplainer explainer={EXPLAINER} />);

    await user.click(screen.getByRole("button", LAUNCHER));
    const dialog = await screen.findByRole("dialog", { name: EXPLAINER.title });

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    for (let i = 0; i < 6; i += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("restores focus to the launcher when Escape closes the guide", async () => {
    const user = userEvent.setup();
    render(<PageExplainer explainer={EXPLAINER} />);

    const launcher = screen.getByRole("button", LAUNCHER);
    await user.click(launcher);
    await screen.findByRole("dialog", { name: EXPLAINER.title });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: EXPLAINER.title }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(launcher);
    });
  });

  it("restores focus to the launcher when 'Got it' closes the guide", async () => {
    const user = userEvent.setup();
    render(<PageExplainer explainer={EXPLAINER} />);

    const launcher = screen.getByRole("button", LAUNCHER);
    await user.click(launcher);
    await screen.findByRole("dialog", { name: EXPLAINER.title });

    // Advance to the last beat, then close via the terminal CTA.
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /got it/i }));

    await waitFor(() => {
      expect(document.activeElement).toBe(launcher);
    });
  });
});
