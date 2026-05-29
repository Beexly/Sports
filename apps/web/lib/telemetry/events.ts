/**
 * Product Telemetry — typed event registry.
 *
 * Every telemetry event the product is allowed to emit must be declared
 * here. The registry exists to measure decision quality, not to maximize
 * betting volume.
 *
 * Hard rules (enforced by Constitution #5, #14, #20):
 *  - No event may carry confidential methodology (weights, thresholds,
 *    prompt text, calibration internals, formulas).
 *  - No event may carry user PII beyond the hashed user id and optional
 *    coarse subscription tier.
 *  - No event may be used to trigger a bet, transaction, or external post.
 *
 * Server-only. Never import from a `"use client"` file.
 */

import type { TelemetrySurfaceId } from "./surfaces";
import type { UserIntent } from "./intent";

/** Coarse user role tag. Never use raw user id off-server. */
export type TelemetryActor =
  | { kind: "anonymous" }
  | { kind: "free" }
  | { kind: "pro" }
  | { kind: "elite" }
  | { kind: "operator" }; // internal cockpit; never emitted to public analytics

/** Coarse client environment. Never carries IP, fingerprint, or fine geo. */
export interface TelemetryClient {
  readonly viewport: "mobile" | "tablet" | "desktop";
  readonly reducedMotion: boolean;
  readonly locale: string; // BCP-47 language tag, no region inference
}

/** Decision-quality oriented event taxonomy. */
export type TelemetryEvent =
  // --- understanding events ----------------------------------------------
  | { name: "surface.viewed"; surface: TelemetrySurfaceId; dwellMs: number }
  | { name: "surface.left"; surface: TelemetrySurfaceId; reason: "next" | "back" | "away" }
  | { name: "explainer.opened"; surface: TelemetrySurfaceId; key: string }
  | { name: "methodology.followed"; from: TelemetrySurfaceId }
  | { name: "academy.module_started"; module: string }
  | { name: "academy.module_completed"; module: string }
  // --- decision-quality events -------------------------------------------
  | { name: "pick.viewed"; tier: "free" | "pro" | "elite" }
  | { name: "pick.evidence_audit_opened"; tier: "free" | "pro" | "elite" }
  | { name: "no_bet.viewed"; reasonClass: string }
  | { name: "autopsy.opened" }
  | { name: "autopsy.process_grade_acknowledged"; grade: "A" | "B" | "C" | "D" | "F" }
  | { name: "parlay_mri.checked"; verdict: "AVOID" | "CAUTION" | "CLEAR" }
  // --- restraint events --------------------------------------------------
  | { name: "restraint.disclosure_shown"; surface: TelemetrySurfaceId }
  | { name: "restraint.responsible_play_followed"; from: TelemetrySurfaceId }
  | { name: "restraint.brain_q_refused"; reason: "out_of_scope" | "regulated" | "personal_advice" }
  // --- confusion / friction events ---------------------------------------
  | { name: "confusion.repeated_back"; surface: TelemetrySurfaceId; count: number }
  | { name: "confusion.short_dwell"; surface: TelemetrySurfaceId; dwellMs: number }
  | { name: "confusion.search_fallback"; query_intent: UserIntent }
  // --- conversion-adjacent (no betting-volume optimization) --------------
  | { name: "pricing.viewed" }
  | { name: "pricing.tier_compared"; tiers: ReadonlyArray<"FREE" | "PRO" | "ELITE"> }
  | { name: "auth.sign_in_attempted" }
  | { name: "auth.sign_in_succeeded" }
  // --- experiment exposure ------------------------------------------------
  | { name: "experiment.exposed"; experiment: string; variant: string };

export type TelemetryEventName = TelemetryEvent["name"];

/** Outer envelope written to whichever sink is configured. */
export interface TelemetryEnvelope {
  readonly id: string; // ULID, generated server-side
  readonly timestamp: string; // ISO8601
  readonly actor: TelemetryActor;
  readonly client: TelemetryClient;
  readonly event: TelemetryEvent;
  /** Hash bucket — never the raw user id. */
  readonly subjectBucket: number; // 0..1023 stable hash for cohort math
  /** Always false in prod. Set true when running fixtures. */
  readonly synthetic: boolean;
}

/** Categories the analytics layer publishes. Used for permission checks. */
export type TelemetryCategory =
  | "understanding"
  | "decision-quality"
  | "restraint"
  | "confusion"
  | "conversion"
  | "experiment";

const CATEGORY_BY_PREFIX: ReadonlyArray<readonly [string, TelemetryCategory]> = [
  ["surface.", "understanding"],
  ["explainer.", "understanding"],
  ["methodology.", "understanding"],
  ["academy.", "understanding"],
  ["pick.", "decision-quality"],
  ["no_bet.", "decision-quality"],
  ["autopsy.", "decision-quality"],
  ["parlay_mri.", "decision-quality"],
  ["restraint.", "restraint"],
  ["confusion.", "confusion"],
  ["pricing.", "conversion"],
  ["auth.", "conversion"],
  ["experiment.", "experiment"],
];

export function categoryOf(name: TelemetryEventName): TelemetryCategory {
  for (const [prefix, category] of CATEGORY_BY_PREFIX) {
    if (name.startsWith(prefix)) return category;
  }
  return "understanding";
}

/** Event names a betting-volume-maximization shop would emit. Forbidden. */
export const FORBIDDEN_EVENTS: ReadonlySet<string> = new Set([
  "bet.placed",
  "bet.amount_increased",
  "bet.suggested_higher",
  "user.urged_to_bet",
  "scarcity.timer_started",
  "social.bandwagon_shown",
]);

export function isForbiddenEvent(name: string): boolean {
  return FORBIDDEN_EVENTS.has(name);
}

/** All registered event names — used by the telemetry ingest route for validation. */
export const TELEMETRY_EVENT_NAMES: ReadonlySet<TelemetryEventName> = new Set<TelemetryEventName>([
  "surface.viewed",
  "surface.left",
  "explainer.opened",
  "methodology.followed",
  "academy.module_started",
  "academy.module_completed",
  "pick.viewed",
  "pick.evidence_audit_opened",
  "no_bet.viewed",
  "autopsy.opened",
  "autopsy.process_grade_acknowledged",
  "parlay_mri.checked",
  "restraint.disclosure_shown",
  "restraint.responsible_play_followed",
  "restraint.brain_q_refused",
  "confusion.repeated_back",
  "confusion.short_dwell",
  "confusion.search_fallback",
  "pricing.viewed",
  "pricing.tier_compared",
  "auth.sign_in_attempted",
  "auth.sign_in_succeeded",
  "experiment.exposed",
]);

export function isKnownEventName(name: string): name is TelemetryEventName {
  return (TELEMETRY_EVENT_NAMES as ReadonlySet<string>).has(name);
}
