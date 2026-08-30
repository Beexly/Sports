"use client";

/**
 * PartnerLinkDisclosure — the per-link, FTC-2023-compliant disclosure
 * primitive for any anchor that routes through the /go/[slug] paid-partner
 * redirect (apps/web/app/go/[slug]/route.ts).
 *
 * Context: the founder ruling (2026-07-16, reports/agent-handoffs/
 * ACTIVE_AGENT_RELAY.md "FOUNDER RULINGS") turned affiliate revenue ON under
 * a disclosed-conflict model. Per-link disclosure is one of the non-negotiable
 * conditions of that ruling, and per the 16 CFR Part 255 (rev. June 2023)
 * endorsement guide (reports/affiliate/PROGRAM_LANDSCAPE.md), disclosure must
 * be:
 *   - ADJACENT to the link (not buried in a footer or a separate page),
 *   - UNAVOIDABLE (a reader scanning the page cannot miss it), and
 *   - PLAIN LANGUAGE — the bare words "affiliate link" are explicitly called
 *     out by the FTC as inadequate; "Paid partner link" is the wording used
 *     here.
 *
 * The operator registry (apps/web/lib/cockpit/operator-registry.ts) has ZERO
 * APPROVED_PARTNER rows today, so nothing currently renders a live /go/ link
 * on a public surface. This primitive ships ahead of that activation so no
 * future partner link can go out without it — see the pointer comment in
 * apps/web/app/go/[slug]/route.ts.
 *
 * Usage:
 *   <PartnerLink href={`/go/${promo.slug}`} className="btn btn-primary">
 *     Visit operator
 *   </PartnerLink>
 *
 * `PartnerLink` always renders the disclosure immediately after the anchor
 * and wires it to the anchor via `aria-describedby` (same accessibility
 * pattern as the recurring-billing disclosure on SubscribeButton), so
 * assistive tech announces "Paid partner link" as part of the link's own
 * description — it is never a separate, skippable element.
 */

import { useId } from "react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/** The one place this copy is defined. Change here only. */
export const PARTNER_LINK_DISCLOSURE_PREFIX = "Paid partner link";
export const PARTNER_LINK_DISCLOSURE_SUFFIX = "see how we make money";
export const PARTNER_LINK_DISCLOSURE_HREF = "/how-we-make-money";

// ── Pure decision helpers (no React) — reusable from tests, other
// components, or future server-side lint tooling without importing React. ──

/**
 * True when `href` routes through the paid-partner redirect
 * (apps/web/app/go/[slug]/route.ts) — currently the only path in the app
 * that forwards a click to a signed affiliate URL. Handles both root-
 * relative hrefs ("/go/caesars") and absolute ones
 * ("https://www.galaxysportsedge.com/go/caesars").
 */
export function isPartnerRedirectHref(href: string): boolean {
  if (typeof href !== "string" || href.trim() === "") return false;
  let pathname: string;
  if (href.startsWith("/")) {
    pathname = href.split(/[?#]/)[0] ?? "";
  } else {
    try {
      pathname = new URL(href).pathname;
    } catch {
      return false;
    }
  }
  return pathname === "/go" || pathname.startsWith("/go/");
}

// FTC 2023 endorsement-guide bar (16 CFR Part 255, rev. June 2023): the bare
// words "affiliate link" are explicitly called out as inadequate wording.
// Plain, unambiguous "paid"/"sponsored"/"commission" language is required.
const INADEQUATE_DISCLOSURE_WORDING = /\baffiliate\s+link\b/i;
const ADEQUATE_DISCLOSURE_WORDING =
  /\b(paid partner|paid link|sponsored link|advertisement|we (?:may )?earn a commission)\b/i;

/**
 * Whether a piece of copy, taken on its own, would read as adequate FTC
 * disclosure wording. This is informational only (see
 * `evaluatePartnerLinkDisclosure` below) — a link's own anchor text can
 * never substitute for the dedicated, non-dismissible `<PartnerLinkDisclosure
 * />` element, because the FTC bar requires the disclosure to be adjacent
 * and unavoidable, not merely present somewhere in nearby prose.
 */
export function isDisclosureCopyAdequate(copy: string | null | undefined): boolean {
  const text = (copy ?? "").trim();
  if (text.length === 0) return false;
  if (INADEQUATE_DISCLOSURE_WORDING.test(text) && !ADEQUATE_DISCLOSURE_WORDING.test(text)) {
    return false;
  }
  return ADEQUATE_DISCLOSURE_WORDING.test(text);
}

export interface PartnerLinkDisclosureCheck {
  readonly href: string;
  /** The anchor's own visible text, if any. Informational only — see notes above. */
  readonly copy?: string | null;
}

export interface PartnerLinkDisclosureDecision {
  /** True when the adjacent `<PartnerLinkDisclosure />` element must render next to this link. */
  readonly required: boolean;
  /** Whether the link's own copy happens to use adequate FTC wording (never suppresses `required`). */
  readonly satisfiedByCopy: boolean;
  readonly reason: string;
}

/**
 * Given an anchor's href (and optionally its own visible copy), decide
 * whether the mandatory adjacent partner-link disclosure must render next to
 * it. Pure and framework-free, so it is trivially unit-testable and reusable
 * outside of React (e.g. a future lint rule or CI content check).
 */
export function evaluatePartnerLinkDisclosure(
  input: PartnerLinkDisclosureCheck
): PartnerLinkDisclosureDecision {
  const required = isPartnerRedirectHref(input.href);
  const satisfiedByCopy = isDisclosureCopyAdequate(input.copy ?? null);
  return {
    required,
    satisfiedByCopy,
    reason: required
      ? "href routes through the /go/ paid-partner redirect; FTC 2023 (16 CFR Part 255) requires an adjacent, unavoidable, plain-language disclosure regardless of the link's own copy."
      : "href does not route through /go/; no partner-link disclosure required.",
  };
}

// ── Components ──────────────────────────────────────────────────────────

export interface PartnerLinkDisclosureProps {
  /** DOM id — pass the same value as the paired link's `aria-describedby`. */
  id?: string;
  className?: string;
}

/**
 * The disclosure label itself: "Paid partner link — see how we make money",
 * with the second half linking to /how-we-make-money. Non-dismissible by
 * design — there is no close/hide affordance, and it always renders inline
 * with its paired link rather than behind a tooltip or accordion.
 */
export function PartnerLinkDisclosure({ id, className }: PartnerLinkDisclosureProps) {
  return (
    <p
      id={id}
      data-testid="partner-link-disclosure"
      className={["text-[11px] leading-relaxed text-ion-3", className ?? ""].join(" ")}
    >
      {PARTNER_LINK_DISCLOSURE_PREFIX}
      {" — "}
      <Link href={PARTNER_LINK_DISCLOSURE_HREF} className="underline hover:text-ion-2">
        {PARTNER_LINK_DISCLOSURE_SUFFIX}
      </Link>
      .
    </p>
  );
}

export interface PartnerLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  /** Class applied to the wrapping <span>, not the anchor. */
  wrapperClassName?: string;
  /** Class applied to the disclosure paragraph. */
  disclosureClassName?: string;
}

/**
 * PartnerLink — the only sanctioned way to render a link to the /go/
 * redirect on a public surface. Wraps a plain <a> (never next/link — the
 * destination is a server-side redirect through a compliance re-check, not
 * an internal route to prefetch) with its mandatory, adjacent, non-
 * dismissible disclosure, and wires the two together via `aria-describedby`
 * so screen readers announce "Paid partner link" as part of the link's own
 * description before a user activates it.
 *
 * A bare `<a href="/go/...">` ships without the FTC-required label — always
 * reach for this component instead once the operator registry has its first
 * APPROVED_PARTNER row.
 */
export function PartnerLink({
  href,
  children,
  className,
  wrapperClassName,
  disclosureClassName,
  ...rest
}: PartnerLinkProps) {
  const disclosureId = useId();

  return (
    <span className={["inline-flex flex-col items-start gap-1.5", wrapperClassName ?? ""].join(" ")}>
      <a href={href} aria-describedby={disclosureId} className={className} {...rest}>
        {children}
      </a>
      <PartnerLinkDisclosure id={disclosureId} className={disclosureClassName} />
    </span>
  );
}
