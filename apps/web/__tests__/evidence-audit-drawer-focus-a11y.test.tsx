import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EvidenceAuditDrawer } from "@/components/picks/evidence-audit-drawer";

/**
 * EvidenceAuditDrawer is the modal on every pick card — the surface a paying
 * Pro/Elite member opens to inspect the provenance they are paying for, and the
 * upgrade prompt a FREE member sees.
 *
 * It already declares role="dialog" + aria-modal="true", closes on Escape, and
 * moves focus to its close button on open. Two halves of the modal focus
 * contract were missing, and both strand a keyboard-only user:
 *
 *   1. NO FOCUS TRAP. aria-modal="true" tells assistive tech the rest of the
 *      page is inert, but Tab still walked straight out of the drawer into the
 *      page behind it — where the user is now typing into content their screen
 *      reader insists does not exist (WCAG 2.4.3).
 *
 *   2. NO FOCUS RESTORE. On close, focus was dropped on <body>, so the next Tab
 *      restarted from the top of the document. On a board of 20 pick cards that
 *      means re-tabbing the whole page to get back to where you were (WCAG 2.4.3).
 *
 * Queries here go through ACCESSIBLE ROLE AND NAME, and every assertion is a
 * RUNTIME check (apps/web/tsconfig.json excludes __tests__ from typecheck).
 */

const OPEN_TRIGGER = { name: /open evidence audit for this pick/i } as const;

beforeEach(() => {
  // The drawer fetches its audit on open. Return a clean 503 so the body
  // renders the error branch — this test is about focus, not payload shape.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as unknown as Response),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EvidenceAuditDrawer — modal focus contract", () => {
  it("moves focus into the dialog on open", async () => {
    const user = userEvent.setup();
    render(<EvidenceAuditDrawer pickId="pick_1" />);

    await user.click(screen.getByRole("button", OPEN_TRIGGER));

    const dialog = await screen.findByRole("dialog", { name: /evidence audit/i });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it("traps Tab inside the dialog instead of letting it walk into the page behind", async () => {
    const user = userEvent.setup();
    render(<EvidenceAuditDrawer pickId="pick_1" />);

    await user.click(screen.getByRole("button", OPEN_TRIGGER));
    const dialog = await screen.findByRole("dialog", { name: /evidence audit/i });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Walk forward past the end of the dialog's focusable set. Without a trap
    // this lands on the trigger button behind the modal.
    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("traps Shift+Tab inside the dialog too", async () => {
    const user = userEvent.setup();
    render(<EvidenceAuditDrawer pickId="pick_1" />);

    await user.click(screen.getByRole("button", OPEN_TRIGGER));
    const dialog = await screen.findByRole("dialog", { name: /evidence audit/i });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    for (let i = 0; i < 4; i += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("restores focus to the trigger when Escape closes the dialog", async () => {
    const user = userEvent.setup();
    render(<EvidenceAuditDrawer pickId="pick_1" />);

    const trigger = screen.getByRole("button", OPEN_TRIGGER);
    await user.click(trigger);
    await screen.findByRole("dialog", { name: /evidence audit/i });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /evidence audit/i }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("restores focus to the trigger when the close button closes the dialog", async () => {
    const user = userEvent.setup();
    render(<EvidenceAuditDrawer pickId="pick_1" />);

    const trigger = screen.getByRole("button", OPEN_TRIGGER);
    await user.click(trigger);
    await screen.findByRole("dialog", { name: /evidence audit/i });

    await user.click(screen.getByRole("button", { name: /^close$/i }));

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
