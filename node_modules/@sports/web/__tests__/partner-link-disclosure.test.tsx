import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  PartnerLink,
  PartnerLinkDisclosure,
  PARTNER_LINK_DISCLOSURE_HREF,
  isPartnerRedirectHref,
  isDisclosureCopyAdequate,
  evaluatePartnerLinkDisclosure,
} from "@/components/ui/partner-link-disclosure";

/**
 * PartnerLinkDisclosure / PartnerLink — the per-link FTC-2023 disclosure
 * primitive for any anchor routing through /go/[slug] (the paid-partner
 * redirect). Zero APPROVED_PARTNER rows exist today (see
 * apps/web/lib/cockpit/operator-registry.ts), so this ships ahead of
 * activation: no future /go/ link can render without the adjacent,
 * non-dismissible disclosure this component provides.
 */

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── Pure decision helper: isPartnerRedirectHref ────────────────────────────

describe("isPartnerRedirectHref", () => {
  it("is true for a root-relative /go/ href", () => {
    expect(isPartnerRedirectHref("/go/caesars")).toBe(true);
  });

  it("is true for bare /go with no slug", () => {
    expect(isPartnerRedirectHref("/go")).toBe(true);
  });

  it("is true for an absolute /go/ href", () => {
    expect(isPartnerRedirectHref("https://www.galaxysportsedge.com/go/caesars")).toBe(true);
  });

  it("is true even with query params or a hash", () => {
    expect(isPartnerRedirectHref("/go/caesars?state=NJ")).toBe(true);
    expect(isPartnerRedirectHref("/go/caesars#offer")).toBe(true);
  });

  it("is false for a non-/go/ internal link", () => {
    expect(isPartnerRedirectHref("/pricing")).toBe(false);
    expect(isPartnerRedirectHref("/promotions")).toBe(false);
  });

  it("is false for a path that merely starts with 'go' but isn't the /go/ segment", () => {
    expect(isPartnerRedirectHref("/gold-plan")).toBe(false);
  });

  it("is false for an external operator URL that bypasses /go/", () => {
    expect(isPartnerRedirectHref("https://sportsbook.draftkings.com/promo")).toBe(false);
  });

  it("is false for empty/invalid input", () => {
    expect(isPartnerRedirectHref("")).toBe(false);
    expect(isPartnerRedirectHref("not a url")).toBe(false);
  });
});

// ── Pure decision helper: isDisclosureCopyAdequate ──────────────────────────

describe("isDisclosureCopyAdequate", () => {
  it("is false for empty/missing copy", () => {
    expect(isDisclosureCopyAdequate(null)).toBe(false);
    expect(isDisclosureCopyAdequate(undefined)).toBe(false);
    expect(isDisclosureCopyAdequate("")).toBe(false);
  });

  it("is false for the bare words 'affiliate link' — FTC calls this out as inadequate", () => {
    expect(isDisclosureCopyAdequate("This is an affiliate link.")).toBe(false);
  });

  it("is true for plain-language 'paid partner' wording", () => {
    expect(isDisclosureCopyAdequate("Paid partner link — see how we make money.")).toBe(true);
  });

  it("is true for 'we may earn a commission' wording", () => {
    expect(isDisclosureCopyAdequate("We may earn a commission if you sign up.")).toBe(true);
  });

  it("is false for unrelated copy", () => {
    expect(isDisclosureCopyAdequate("Visit operator")).toBe(false);
  });
});

// ── Pure decision helper: evaluatePartnerLinkDisclosure ─────────────────────

describe("evaluatePartnerLinkDisclosure", () => {
  it("requires disclosure for a /go/ href regardless of adequate anchor copy", () => {
    const decision = evaluatePartnerLinkDisclosure({
      href: "/go/caesars",
      copy: "Paid partner link — see how we make money",
    });
    expect(decision.required).toBe(true);
    expect(decision.satisfiedByCopy).toBe(true);
  });

  it("still requires disclosure for a /go/ href even with inadequate copy", () => {
    const decision = evaluatePartnerLinkDisclosure({ href: "/go/caesars", copy: "Visit operator" });
    expect(decision.required).toBe(true);
    expect(decision.satisfiedByCopy).toBe(false);
  });

  it("does not require disclosure for a non-partner href", () => {
    const decision = evaluatePartnerLinkDisclosure({ href: "/pricing" });
    expect(decision.required).toBe(false);
  });
});

// ── Component: PartnerLinkDisclosure ────────────────────────────────────────

describe("PartnerLinkDisclosure", () => {
  it("renders the plain-language 'Paid partner link' label", () => {
    render(<PartnerLinkDisclosure />);
    const el = screen.getByTestId("partner-link-disclosure");
    expect(el.textContent ?? "").toMatch(/paid partner link/i);
  });

  it("never uses the bare 'affiliate link' wording the FTC calls inadequate", () => {
    render(<PartnerLinkDisclosure />);
    const el = screen.getByTestId("partner-link-disclosure");
    expect(el.textContent ?? "").not.toMatch(/\baffiliate link\b/i);
  });

  it("links to /how-we-make-money", () => {
    render(<PartnerLinkDisclosure />);
    const link = screen.getByRole("link", { name: /see how we make money/i });
    expect(link).toHaveAttribute("href", PARTNER_LINK_DISCLOSURE_HREF);
  });

  it("accepts an id so it can be wired to a paired link via aria-describedby", () => {
    render(<PartnerLinkDisclosure id="my-disclosure-id" />);
    expect(screen.getByTestId("partner-link-disclosure")).toHaveAttribute("id", "my-disclosure-id");
  });
});

// ── Component: PartnerLink ───────────────────────────────────────────────────

describe("PartnerLink", () => {
  it("renders the wrapped anchor with the given href and children", () => {
    render(
      <PartnerLink href="/go/caesars" className="btn">
        Visit operator
      </PartnerLink>,
    );
    const link = screen.getByRole("link", { name: "Visit operator" });
    expect(link).toHaveAttribute("href", "/go/caesars");
  });

  it("always renders the adjacent disclosure next to the link", () => {
    render(
      <PartnerLink href="/go/caesars">Visit operator</PartnerLink>,
    );
    expect(screen.getByTestId("partner-link-disclosure").textContent ?? "").toMatch(
      /paid partner link/i,
    );
  });

  it("associates the disclosure with the anchor via aria-describedby (non-dismissible, screen-reader-linked)", () => {
    render(<PartnerLink href="/go/caesars">Visit operator</PartnerLink>);
    const link = screen.getByRole("link", { name: "Visit operator" });
    const describedBy = link.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByTestId("partner-link-disclosure")).toHaveAttribute("id", describedBy);
  });

  it("passes through extra anchor attributes (target, rel) onto the real anchor", () => {
    render(
      <PartnerLink href="/go/caesars" target="_blank" rel="nofollow sponsored noopener noreferrer">
        Visit operator
      </PartnerLink>,
    );
    const link = screen.getByRole("link", { name: "Visit operator" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "nofollow sponsored noopener noreferrer");
  });
});
