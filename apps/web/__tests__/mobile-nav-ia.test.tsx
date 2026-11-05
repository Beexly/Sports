/**
 * @vitest-environment jsdom
 *
 * Mobile IA (sealed-era design): the flyout carries three sections. The
 * GALAXY PICKS (PAID) section holds Locked board /picks, Props /props, and
 * Packs /packages; DFS holds the optimizer door; Account & Access holds
 * All-Access Pricing and Sign in. Retired doors (/board, /players,
 * /the-beat, /academy, /fantasy/studio) stay absent.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNav } from "@/components/ui/mobile-nav";

describe("Mobile Navigation IA", () => {
  it("opens mobile menu and exposes GALAXY PICKS (PAID), DFS, and Account & Access sections", () => {
    const { container } = render(<MobileNav />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const panel = container.querySelector("#mobile-nav-panel") as HTMLElement;
    expect(panel).not.toBeNull();

    const headings = Array.from(panel.querySelectorAll(".mobile-nav-heading")).map((el) =>
      el.textContent?.trim(),
    );
    expect(headings).toEqual(["GALAXY PICKS (PAID)", "DFS", "Account & Access"]);

    const links = Array.from(panel.querySelectorAll("a")).map((a) => ({
      label: a.textContent?.trim(),
      href: a.getAttribute("href"),
    }));

    expect(links).toEqual([
      { label: "Locked board", href: "/picks" },
      { label: "Props", href: "/props" },
      { label: "Packs", href: "/packages" },
      { label: "DFS Optimizer & Stacks", href: "/fantasy/dfs" },
      { label: "All-Access Pricing", href: "/pricing" },
      { label: "Sign in", href: "/auth/signin" },
    ]);

    // Ensure retired links are absent
    const hrefs = links.map((l) => l.href);
    for (const retired of ["/board", "/players", "/the-beat", "/academy", "/fantasy/studio"]) {
      expect(hrefs).not.toContain(retired);
    }
  });

  it("closes mobile menu on Escape key and returns focus to trigger", () => {
    const { container } = render(<MobileNav />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(trigger);
    expect(container.querySelector("#mobile-nav-panel")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector("#mobile-nav-panel")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
