/**
 * GSE Founding Waitlist — input validation + no-claim copy guard.
 *
 * - `waitlistLeadSchema` / `validateWaitlistLead` validate a lead submission
 *   (used both client-side and re-checked server-side; the server never trusts
 *   the client).
 * - `runNoClaimGuard` reuses the platform compliance scanner
 *   (`@/lib/compliance-scanner/rules`) so waitlist copy is held to the SAME
 *   banned-vocabulary rules as every other surface. It does not weaken or fork
 *   that ruleset.
 *
 * Pure module — no network, no PII persisted here.
 */

import { z } from "zod";
import {
  getRulesForTemplate,
  type ComplianceRule,
} from "@/lib/compliance-scanner/rules";
import { normalizeForComplianceScan } from "@/lib/compliance-scanner/normalize";

export const WAITLIST_ROLES = ["operator", "analyst", "founder", "bettor"] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const waitlistLeadSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  role: z.enum(WAITLIST_ROLES, {
    errorMap: () => ({ message: "Pick a role" }),
  }),
  sportInterests: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Pick at least one sport")
    .max(12, "Too many sports selected"),
  currentStack: optionalText(2000),
  weakestProcess: optionalText(2000),
  // Consent must be explicitly true — a hard gate before any persistence.
  consent: z
    .boolean()
    .refine((v) => v === true, { message: "Consent is required before joining" }),
  // Provenance (optional, non-identifying funnel context).
  utmSource: optionalText(200),
  utmCampaign: optionalText(200),
  referrer: optionalText(500),
  path: optionalText(500),
  copyVersion: optionalText(50),
});

export type WaitlistLeadInput = z.infer<typeof waitlistLeadSchema>;

export type WaitlistValidationResult =
  | { success: true; data: WaitlistLeadInput }
  | { success: false; errors: Record<string, string> };

/** Validate an unknown payload. Returns typed data or a flat field->message map. */
export function validateWaitlistLead(input: unknown): WaitlistValidationResult {
  const parsed = waitlistLeadSchema.safeParse(input);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  const flattened = parsed.error.flatten();
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    const first = messages?.[0];
    if (first !== undefined) {
      errors[field] = first;
    }
  }
  // Surface form-level errors too (e.g. non-object body).
  const formError = flattened.formErrors[0];
  if (formError !== undefined && Object.keys(errors).length === 0) {
    errors["_form"] = formError;
  }
  return { success: false, errors };
}

export interface NoClaimFlag {
  readonly id: string;
  readonly message: string;
  readonly severity: ComplianceRule["severity"];
}

export interface NoClaimGuardResult {
  /** True when there is no `block`-severity violation. */
  readonly ok: boolean;
  readonly flags: readonly NoClaimFlag[];
}

// Compliance-scanner patterns are authored with the global flag for highlight
// scans; strip it so `.test()` is stateless here.
function statelessPattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace("g", ""));
}

/**
 * Run the platform's banned-vocabulary scanner over a piece of copy. Any
 * `block`-severity match means the copy is not allowed to ship.
 *
 * `templateKind` defaults to a generic surface, so the platform-wide
 * LAYER 1-3 rules (guarantees, win-rate claims, EV/Kelly, tout language) all
 * apply.
 */
export function runNoClaimGuard(
  text: string,
  templateKind = "GSE_WAITLIST",
): NoClaimGuardResult {
  const flags: NoClaimFlag[] = [];
  // Collapse soft line-wraps before scanning so a banned phrase split across a
  // newline can't slip the gate (defense in depth, matching the read-time guard).
  const scanTarget = normalizeForComplianceScan(text);
  for (const rule of getRulesForTemplate(templateKind)) {
    if (statelessPattern(rule.pattern).test(scanTarget)) {
      flags.push({ id: rule.id, message: rule.message, severity: rule.severity });
    }
  }
  return { ok: !flags.some((f) => f.severity === "block"), flags };
}

/**
 * Positive performance-claim patterns that must NEVER appear in waitlist copy,
 * even where the compliance scanner is silent. These are deliberately narrow so
 * honest disavowals ("does not beat naive") never trip them.
 */
const POSITIVE_PERFORMANCE_PATTERNS: readonly RegExp[] = [
  /\b\d{1,3}\s*%\s*(win|hit|accuracy|roi|return|edge|profit)\b/i,
  /\bguarantee/i,
  /\bprofit(?:able|s)?\b/i,
  /\brisk[-\s]?free\b/i,
  /\bcan'?t lose\b/i,
];

/** True when copy is free of positive performance claims. */
export function hasNoPerformanceClaim(text: string): boolean {
  return !POSITIVE_PERFORMANCE_PATTERNS.some((p) => p.test(text));
}
