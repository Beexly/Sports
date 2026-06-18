/**
 * Compliance / Risk Scorer — Workstream J12.
 *
 * PURE, DETERMINISTIC, NO I/O. Given an owner-facing `ComplianceAction`
 * descriptor, `scoreComplianceRisk()` returns a structured, multi-axis risk
 * score and a single `verdict` the cockpit can route on. This is the
 * GSE-domain form of the brief's compliance/risk agent: it can hard-stop
 * ("BLOCK") any action that breaches a non-negotiable trust guardrail.
 *
 * It scores SEVEN axes, each 0..1 (1 = maximum risk):
 *   - legal            — statutory / contractual / cease-and-desist exposure
 *   - platform         — platform/ToS terms (automation bans, account rules)
 *   - reputation       — banned/over-claiming language, trust erosion
 *   - jurisdiction     — regulated/unknown jurisdiction exposure
 *   - age              — age-gating / minors-data handling
 *   - responsibleGaming — responsible-gaming duty (RG messaging, vulnerable users)
 *   - rights           — scraping / source-rights clearance (reuses the registry)
 *
 * VERDICTS, strictest wins:
 *   - BLOCK   — a non-negotiable guardrail is breached. Hard stop. The cockpit
 *               cannot make this safe; it is never routed to the owner as
 *               approvable.
 *   - REVIEW  — material risk OR an unknown that we refuse to silently allow.
 *               A human must look at it.
 *   - ALLOW   — only for actions with no material risk on any axis.
 *
 * This module is intentionally aligned with the rest of the platform so it can
 * feed Workstream J5 (`lib/cockpit/scoring`) as its compliance axis:
 *   - It reuses the Source Rights Registry (`getSourceRightsEntry`) — a source
 *     whose status is not `approved_*` is high rights-risk, and a BLOCK for
 *     scraping-kind actions.
 *   - It reuses the Trust Claim Registry banned-phrase list
 *     (`getBannedPhraseList`) plus the trust-gate superset — a public claim
 *     containing banned language is a BLOCK.
 *   - It reuses `FORBIDDEN_EXTERNAL_ACTIONS` — a forbidden/external action
 *     without explicit approval is a BLOCK.
 *
 * Honest defaults: an unknown sensitive input resolves to REVIEW, never a
 * silent ALLOW. Nothing here reads the DB, env, clock, or network — the same
 * input always yields the same output.
 */

import {
  getSourceRightsEntry,
  type SourceRightsStatus,
} from "@/lib/scraping/source-rights-registry";
import { getBannedPhraseList } from "@/lib/trust-claims";
import { FORBIDDEN_EXTERNAL_ACTIONS } from "@/lib/agents/agent-capabilities";

// ─── Input ──────────────────────────────────────────────────────────────────

/**
 * The kind of owner-facing action being scored. `claim`/`publish`/`message`
 * touch a public/external surface; `scrape` touches a source; `spend` moves
 * money; `pick` produces a customer-visible pick; `other` is the honest
 * catch-all (treated conservatively).
 */
export type ComplianceActionKind =
  | "publish" // ship copy/content to a public surface
  | "message" // send a message to a user/external party
  | "spend" // move money / incur cost
  | "scrape" // run an extraction job against a source
  | "claim" // assert a public claim (win-rate, social proof, capability)
  | "pick" // emit a customer-visible pick
  | "config" // change an internal setting
  | "other"; // unknown / catch-all — scored conservatively

/** Where the action lands. `public`/`external` are the riskiest surfaces. */
export type ComplianceSurface =
  | "public" // marketing / public web surface
  | "external" // outbound to a third party (email, push, API)
  | "dashboard" // signed-in customer surface
  | "internal" // operator-only / never customer-visible
  | "unknown";

/** A pure, fully-serializable descriptor of an owner-facing action. */
export interface ComplianceAction {
  /** What the action is (drives the strictest BLOCK rules). */
  readonly kind: ComplianceActionKind;
  /** Where it lands. Defaults to "unknown" → conservative. */
  readonly surface?: ComplianceSurface;
  /** Source id (matched against the Source Rights Registry) for scrape kinds. */
  readonly sourceId?: string;
  /** Public-facing claim text, scanned against the banned-phrase list. */
  readonly claimText?: string;
  /**
   * True when the claim asserts performance / win-rate / track-record. Such a
   * claim is only safe once the performance gate has passed.
   */
  readonly isPerformanceClaim?: boolean;
  /**
   * Whether the platform performance/calibration gate has passed. Passed IN so
   * the scorer stays pure (the live gate lives in the prediction-engine).
   * Defaults to false → ungated performance claims BLOCK.
   */
  readonly performanceGatePassed?: boolean;
  /** ISO country/region code, or "unknown". Drives the jurisdiction axis. */
  readonly jurisdiction?: string;
  /** Whether the action touches data about minors. */
  readonly touchesMinorsData?: boolean;
  /** Whether minors-data has cleared a privacy review (defaults false). */
  readonly minorsDataPrivacyReviewed?: boolean;
  /** Whether the surface enforces age-gating (18+/21+). Unknown → REVIEW. */
  readonly ageGated?: boolean;
  /** Whether the action reaches/affects a self-excluded or at-risk user. */
  readonly targetsAtRiskUser?: boolean;
  /** Whether required responsible-gaming messaging is present on the surface. */
  readonly hasResponsibleGamingMessaging?: boolean;
  /** Whether the action takes a forbidden external action (PUBLISH, SPEND…). */
  readonly isExternal?: boolean;
  /**
   * A forbidden external action token (from AGENT_ACTIONS), if known. Drives the
   * forbidden-action BLOCK without needing `isExternal` to be set.
   */
  readonly externalAction?: string;
  /** Whether an external/forbidden action has explicit owner approval on file. */
  readonly approved?: boolean;
}

// ─── Output ─────────────────────────────────────────────────────────────────

/** The seven risk axes, each 0..1 (1 = maximum risk). */
export interface ComplianceAxes {
  readonly legal: number;
  readonly platform: number;
  readonly reputation: number;
  readonly jurisdiction: number;
  readonly age: number;
  readonly responsibleGaming: number;
  readonly rights: number;
}

export type ComplianceVerdict = "ALLOW" | "REVIEW" | "BLOCK";

export interface ComplianceRiskResult {
  readonly axes: ComplianceAxes;
  /** The single overall risk, 0..1 (max of the axes, floored by verdict). */
  readonly overall: number;
  readonly verdict: ComplianceVerdict;
  /** Human-readable audit trail of why the verdict came out this way. */
  readonly reasons: readonly string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Source statuses considered cleared for automated extraction. */
const APPROVED_STATUSES: ReadonlySet<SourceRightsStatus> = new Set([
  "approved_public_logged_off",
  "approved_api",
  "approved_open_license",
  "approved_written_permission",
]);

const FORBIDDEN = new Set<string>(FORBIDDEN_EXTERNAL_ACTIONS);

/**
 * Supplemental banned phrases. The Trust Claim Registry
 * (`getBannedPhraseList`) is the SINGLE SOURCE OF TRUTH and is consumed first;
 * these are the extra detection phrases the CI guard
 * (`scripts/guardrails/trust-gate.mjs`) enforces but that are not (yet) in the
 * registry. Keep this list in sync with that script's BANNED_PHRASES. We do not
 * re-declare phrases already in the registry.
 */
const SUPPLEMENTAL_BANNED_PHRASES: readonly string[] = [
  "risk free",
  "riskless",
  "free money",
  "cant lose",
  "guaranteed roi",
  "guaranteed winner",
  "lock of the day",
  "automatic winner",
  "beat the book",
  "insider information",
  "profitable system",
  "no risk",
  "100% chance",
];

/** Jurisdictions we treat as low-friction for an English-language US product. */
const LOW_RISK_JURISDICTIONS: ReadonlySet<string> = new Set([
  "US",
  "USA",
  "GB",
  "UK",
  "CA",
  "AU",
]);

// Surfaces that reach a customer or third party (so reputation/RG/age matter).
const CUSTOMER_FACING: ReadonlySet<ComplianceSurface> = new Set([
  "public",
  "external",
  "dashboard",
]);

// ─── Helpers (pure) ───────────────────────────────────────────────────────────

function unit(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Whole-word match for short phrases; substring for multi-word phrases. */
function phraseMatches(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const useWordBoundary = !phrase.includes(" ") && phrase.length <= 6;
  const re = useWordBoundary
    ? new RegExp(`\\b${escaped}\\b`, "i")
    : new RegExp(escaped, "i");
  return re.test(haystack);
}

/** Return the first banned phrase the text hits, or null. Registry first. */
function findBannedPhrase(text: string): string | null {
  for (const phrase of getBannedPhraseList()) {
    if (phraseMatches(text, phrase)) return phrase;
  }
  for (const phrase of SUPPLEMENTAL_BANNED_PHRASES) {
    if (phraseMatches(text, phrase)) return phrase;
  }
  return null;
}

function isCustomerFacing(surface: ComplianceSurface): boolean {
  return CUSTOMER_FACING.has(surface);
}

// ─── The scorer ────────────────────────────────────────────────────────────

/**
 * Score an owner-facing action across seven compliance/risk axes and return a
 * routable verdict. Pure and deterministic.
 *
 * BLOCK is reserved for non-negotiable guardrail breaches:
 *   1. A forbidden / external action without explicit approval.
 *   2. A scrape against a source that is not `approved_*` (or not registered).
 *   3. A public/external claim containing banned (over-claiming) language.
 *   4. A public/external performance/win-rate claim before the gate passes.
 *   5. Minors-data without a completed privacy review.
 *
 * REVIEW is the honest default for material risk or unknown sensitive inputs;
 * ALLOW is reserved for actions with no material risk on any axis.
 */
export function scoreComplianceRisk(action: ComplianceAction): ComplianceRiskResult {
  const reasons: string[] = [];
  let block = false; // sticky: once a guardrail is breached, verdict is BLOCK
  let review = false; // sticky: once material/unknown risk is seen, >= REVIEW

  const surface: ComplianceSurface = action.surface ?? "unknown";
  const customerFacing = isCustomerFacing(surface);

  // Axes start at 0 (no risk) and are raised by the rules below.
  let legal = 0;
  let platform = 0;
  let reputation = 0;
  let jurisdiction = 0;
  let age = 0;
  let responsibleGaming = 0;
  let rights = 0;

  // ── Rule 1: forbidden / external action without approval → BLOCK ──────────
  // Mirrors J5's FORBIDDEN_EXTERNAL_ACTIONS hard stop. A known forbidden token,
  // or an action flagged isExternal, is hard-stopped UNLESS explicitly approved.
  const forbiddenToken =
    action.externalAction !== undefined && FORBIDDEN.has(action.externalAction);
  const wantsExternal = forbiddenToken || action.isExternal === true;
  if (wantsExternal && action.approved !== true) {
    legal = Math.max(legal, 1);
    platform = Math.max(platform, 1);
    block = true;
    reasons.push(
      forbiddenToken
        ? `Action "${action.externalAction}" is a forbidden external action — hard-stopped without explicit owner approval.`
        : "External action without explicit owner approval — hard-stopped (forbidden by agent authority).",
    );
  } else if (wantsExternal && action.approved === true) {
    // Approved external actions still carry residual legal/platform risk.
    legal = Math.max(legal, 0.5);
    platform = Math.max(platform, 0.5);
    review = true;
    reasons.push("External action carries residual risk even when approved — review.");
  }

  // ── Rule 2: scrape against a non-approved source → rights = 1 + BLOCK ──────
  if (action.kind === "scrape") {
    if (!action.sourceId) {
      rights = Math.max(rights, 1);
      block = true;
      reasons.push(
        "Scrape action without a sourceId — cannot verify rights clearance; hard-stopped.",
      );
    } else {
      const entry = getSourceRightsEntry(action.sourceId);
      if (!entry) {
        rights = Math.max(rights, 1);
        block = true;
        reasons.push(
          `Source "${action.sourceId}" is not in the Source Rights Registry — hard-stopped.`,
        );
      } else if (!APPROVED_STATUSES.has(entry.status)) {
        rights = Math.max(rights, 1);
        block = true;
        reasons.push(
          `Source "${entry.source_name}" has status "${entry.status}" (not approved_*) — scraping hard-stopped.`,
        );
      } else {
        // Approved source: low residual rights risk (attribution/scope still apply).
        rights = Math.max(rights, 0.1);
        if (entry.cease_and_desist_received) {
          // A C&D overrides any prior approval.
          rights = 1;
          legal = Math.max(legal, 1);
          block = true;
          reasons.push(
            `Source "${entry.source_name}" has a cease-and-desist on file — hard-stopped.`,
          );
        }
      }
    }
  } else if (action.sourceId) {
    // Non-scrape action that names a source: surface its rights as a signal.
    const entry = getSourceRightsEntry(action.sourceId);
    if (entry && !APPROVED_STATUSES.has(entry.status)) {
      rights = Math.max(rights, 0.5);
      review = true;
      reasons.push(
        `Referenced source "${entry.source_name}" is not approved_* — review before use.`,
      );
    }
  }

  // ── Rule 3 + 4: public/external claim language and performance gating ─────
  const claimSurface =
    action.kind === "claim" || action.kind === "publish" || customerFacing;
  if (action.claimText !== undefined) {
    if (claimSurface) {
      const banned = findBannedPhrase(action.claimText);
      if (banned) {
        reputation = Math.max(reputation, 1);
        legal = Math.max(legal, 0.6);
        block = true;
        reasons.push(
          `Claim contains banned over-claiming language ("${banned}") — hard-stopped.`,
        );
      }
      // Rule 4: a performance/win-rate claim is only safe once gated.
      if (action.isPerformanceClaim && action.performanceGatePassed !== true) {
        reputation = Math.max(reputation, 1);
        legal = Math.max(legal, 0.6);
        block = true;
        reasons.push(
          "Public performance/track-record claim before the performance gate has passed — hard-stopped.",
        );
      }
    } else {
      // Same text on an internal surface is lower risk but still worth a look
      // if it contains banned language (it may leak outward later).
      const banned = findBannedPhrase(action.claimText);
      if (banned) {
        reputation = Math.max(reputation, 0.4);
        review = true;
        reasons.push(
          `Internal copy contains banned language ("${banned}") — review before it can surface publicly.`,
        );
      }
    }
  } else if (
    action.isPerformanceClaim &&
    claimSurface &&
    action.performanceGatePassed !== true
  ) {
    // Performance claim with no text but flagged as such, on a public surface.
    reputation = Math.max(reputation, 1);
    block = true;
    reasons.push(
      "Public performance claim flagged before the performance gate has passed — hard-stopped.",
    );
  }

  // ── Rule 5: minors-data without privacy review → BLOCK ────────────────────
  if (action.touchesMinorsData) {
    age = Math.max(age, 1);
    legal = Math.max(legal, 0.8);
    if (action.minorsDataPrivacyReviewed !== true) {
      block = true;
      reasons.push(
        "Action touches data about minors without a completed privacy review — hard-stopped.",
      );
    } else {
      review = true;
      reasons.push("Action touches minors-data (privacy-reviewed) — review.");
    }
  }

  // ── Age-gating axis (customer-facing surfaces) ────────────────────────────
  if (customerFacing) {
    if (action.ageGated === false) {
      age = Math.max(age, 0.7);
      review = true;
      reasons.push("Customer-facing surface is not age-gated — review.");
    } else if (action.ageGated === undefined) {
      // Honest default: unknown age-gating on a customer surface is not a silent ALLOW.
      age = Math.max(age, 0.4);
      review = true;
      reasons.push("Age-gating status unknown on a customer-facing surface — review.");
    }
  }

  // ── Responsible-gaming axis ───────────────────────────────────────────────
  if (action.targetsAtRiskUser) {
    responsibleGaming = Math.max(responsibleGaming, 1);
    review = true;
    reasons.push(
      "Action reaches an at-risk / self-excluded user — responsible-gaming review required.",
    );
  }
  if (customerFacing && action.hasResponsibleGamingMessaging === false) {
    responsibleGaming = Math.max(responsibleGaming, 0.6);
    review = true;
    reasons.push(
      "Customer-facing surface lacks responsible-gaming messaging — review.",
    );
  }

  // ── Jurisdiction axis ─────────────────────────────────────────────────────
  const j = action.jurisdiction;
  if (j === undefined || j.toLowerCase() === "unknown") {
    if (customerFacing || action.kind === "spend") {
      // Unknown jurisdiction on a sensitive action is not a silent ALLOW.
      jurisdiction = Math.max(jurisdiction, 0.5);
      review = true;
      reasons.push("Jurisdiction unknown for a sensitive action — review.");
    }
  } else if (!LOW_RISK_JURISDICTIONS.has(j.toUpperCase())) {
    jurisdiction = Math.max(jurisdiction, 0.5);
    review = true;
    reasons.push(`Jurisdiction "${j}" is outside the low-friction set — review.`);
  }

  // ── Spend axis ────────────────────────────────────────────────────────────
  if (action.kind === "spend" && action.approved !== true) {
    legal = Math.max(legal, 0.5);
    review = true;
    reasons.push("Spend action without explicit approval — review.");
  }

  // ── Unknown-kind honest default ───────────────────────────────────────────
  if (action.kind === "other") {
    review = true;
    reasons.push("Unknown action kind — defaulting to review (never a silent allow).");
  }

  const axes: ComplianceAxes = {
    legal: unit(legal),
    platform: unit(platform),
    reputation: unit(reputation),
    jurisdiction: unit(jurisdiction),
    age: unit(age),
    responsibleGaming: unit(responsibleGaming),
    rights: unit(rights),
  };

  // Overall = the worst axis, with verdict-implied floors so a BLOCK never
  // reports a deceptively low overall.
  let overall = Math.max(
    axes.legal,
    axes.platform,
    axes.reputation,
    axes.jurisdiction,
    axes.age,
    axes.responsibleGaming,
    axes.rights,
  );

  let verdict: ComplianceVerdict;
  if (block) {
    verdict = "BLOCK";
    overall = 1;
  } else if (review) {
    verdict = "REVIEW";
    overall = Math.max(overall, 0.5);
  } else {
    verdict = "ALLOW";
    if (reasons.length === 0) {
      reasons.push("No material compliance risk detected on any axis.");
    }
  }

  return {
    axes,
    overall: unit(overall),
    verdict,
    reasons: Object.freeze([...reasons]),
  };
}

// ─── J5 adapter ──────────────────────────────────────────────────────────────

/**
 * The compliance signal shape the J5 cockpit scoring engine
 * (`lib/cockpit/scoring`) can consume. `complianceRisk` is the 0..1 axis J5
 * already understands; `forceBlock` lets J5 treat a hard guardrail breach as a
 * BLOCK without re-deriving the rules.
 */
export interface CockpitComplianceSignal {
  /** 0..1 risk to merge into `ScoringResult.complianceRisk` (use the max). */
  readonly complianceRisk: number;
  /** True when this scorer reached a hard BLOCK — J5 should not auto-route. */
  readonly forceBlock: boolean;
  /** The raw verdict, for audit/logging. */
  readonly verdict: ComplianceVerdict;
  /** Reasons, forwarded for the audit trail. */
  readonly reasons: readonly string[];
}

/**
 * Adapter: map a `ComplianceRiskResult` into the J5 compliance axis.
 *
 * TODO(J5-wiring): when J5 (`apps/web/lib/cockpit/scoring/index.ts`) is ready to
 * consume an external compliance signal, merge `complianceRisk` via
 * `Math.max(existing, signal.complianceRisk)` and route to BLOCK when
 * `forceBlock` is true. This is left as a thin, additive export so J5's own
 * logic is not rewritten here.
 */
export function toCockpitComplianceSignal(
  result: ComplianceRiskResult,
): CockpitComplianceSignal {
  return {
    complianceRisk: result.overall,
    forceBlock: result.verdict === "BLOCK",
    verdict: result.verdict,
    reasons: result.reasons,
  };
}

/** Convenience: score an action and return the J5 signal in one call. */
export function scoreComplianceRiskForCockpit(
  action: ComplianceAction,
): CockpitComplianceSignal {
  return toCockpitComplianceSignal(scoreComplianceRisk(action));
}
