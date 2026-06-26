/**
 * PAGE FACTORY CONTRACT — the page becomes a renderer of compiled meaning, not an inventor of it.
 *
 * Composes (never duplicates) the existing route-authority-registry: a `PageSurface` is "a route plus
 * the compiled ClaimObjects it renders," and `validatePageRender` enforces, at render time, the gates
 * the registry only declared — a prediction page may render only PREDICTION claims that have a trial, a
 * bonus page only compliance-gated BONUS claims, and no page may render a claim above the expression its
 * route status permits. This is the change that makes "pages are renderers" both true and safe.
 *
 * Pure + deterministic.
 */

import { rankOf, type MaxPermittedStrength } from "../decision-state-stat-contract.js";
import { validateRouteAuthority, type RouteAuthority, type RouteStatus } from "../route-authority-registry.js";
import type { ClaimObject } from "./claim-object.js";

export interface PageSurface {
  readonly route: RouteAuthority;
  readonly claims: readonly ClaimObject[];
}

export interface PageRenderResult {
  readonly ok: boolean;
  readonly problems: readonly string[];
  /** The strongest expression actually rendered (the meet a viewer could trust). */
  readonly renderedExpression: MaxPermittedStrength;
}

/** The strongest expression a route status permits a rendered claim to carry. null = render nothing. */
export function maxExpressionForRoute(status: RouteStatus): MaxPermittedStrength | null {
  switch (status) {
    case "LIVE_ALLOWED":
      return "PUBLIC_ACTION";
    case "PREVIEW_ALLOWED":
      return "WATCH";
    case "FIXTURE_ONLY":
      return "INFO_ONLY";
    case "OWNER_GATED":
    case "DATA_GATED":
    case "RIGHTS_GATED":
      return "INFO_ONLY";
    case "DO_NOT_PUBLISH":
      return null;
  }
}

function strongest(claims: readonly ClaimObject[]): MaxPermittedStrength {
  return claims.reduce<MaxPermittedStrength>((acc, c) => (rankOf(c.publicExpression) > rankOf(acc) ? c.publicExpression : acc), "INFO_ONLY");
}

/**
 * Validate that a page may render its compiled claims. Composes validateRouteAuthority and adds the
 * render-time checks the registry's declared gates imply.
 */
export function validatePageRender(surface: PageSurface): PageRenderResult {
  const problems: string[] = [];

  // (a) the route itself must validate (delegated — no parallel route rules)
  const routeCheck = validateRouteAuthority([surface.route]);
  if (!routeCheck.ok) problems.push(...routeCheck.problems);

  const max = maxExpressionForRoute(surface.route.status);

  for (const c of surface.claims) {
    // (b) no claim may render above what the route status permits
    if (max === null) {
      problems.push(`${surface.route.pattern} is DO_NOT_PUBLISH but was given a claim to render (${c.subject})`);
    } else if (rankOf(c.publicExpression) > rankOf(max)) {
      problems.push(`${c.subject}: ${c.publicExpression} exceeds what ${surface.route.status} permits (${max})`);
    }
    // a DO_NOT_USE claim must never reach a page
    if (c.lifecycle === "DO_NOT_USE") {
      problems.push(`${c.subject}: a DO_NOT_USE claim must not be rendered`);
    }
  }

  // (c) the registry's declared gates, now enforced at render time
  if (surface.route.requiresPredictionTrial) {
    for (const c of surface.claims.filter((x) => x.objectType === "PREDICTION")) {
      if (!c.autopsyHook.hasTrial) problems.push(`${surface.route.pattern}: prediction "${c.subject}" has no trial (route requires one)`);
    }
  }
  if (surface.route.requiresTrendPassport) {
    for (const c of surface.claims.filter((x) => x.objectType === "TREND")) {
      if (!c.sourceLineage.proofRefs.some((r) => /trend-passport/.test(r))) {
        problems.push(`${surface.route.pattern}: trend "${c.subject}" has no passport (route requires one)`);
      }
    }
  }
  if (surface.route.requiresComplianceReview) {
    for (const c of surface.claims.filter((x) => x.objectType === "BONUS" || x.objectType === "BOOKMAKER_RATING")) {
      if (!c.rights.ownerApprovalRequired) problems.push(`${surface.route.pattern}: "${c.subject}" is not compliance-gated (route requires review)`);
    }
  }

  return { ok: problems.length === 0, problems, renderedExpression: strongest(surface.claims) };
}
