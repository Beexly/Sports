/**
 * Calibration publish automation — pure resolve + env policy.
 *
 * publishedEffective =
 *   (CALIBRATION_PUBLISHED === true)
 *   OR (CALIBRATION_AUTO_PUBLISH === true
 *       AND eligibility.status === GREEN
 *       AND consecutiveGreen >= K)  // K default 3; GREEN already implies streak
 * if CALIBRATION_AUTO_UNPUBLISH && status === RED:
 *   publishedEffective = false
 * canExposePerformanceStats = publishedEffective && status === GREEN
 *
 * Defaults: AUTO_PUBLISH false. Never hardcode published true.
 * LIVE_BOARD is independent (odds freshness).
 */

import type { EligibilityStatus } from "@/lib/ops/calibration-eligibility";

export type EnvMap = Record<string, string | undefined>;

function envFlag(env: EnvMap, name: string, defaultVal = false): boolean {
  const v = env[name]?.trim().toLowerCase();
  if (v === undefined || v === "") return defaultVal;
  return v === "true" || v === "1";
}

export interface PublishPolicyInput {
  readonly env?: EnvMap;
  readonly eligibilityStatus: EligibilityStatus;
  /** Streak count; required for auto path when status is GREEN. */
  readonly consecutiveGreen?: number;
  readonly streakRequired?: number;
  /** Durable receipt: last auto-written published state (null = none). */
  readonly durablePublished: boolean | null;
}

export interface PublishPolicyResult {
  readonly published: boolean;
  readonly publishedEffective: boolean;
  readonly source: "env" | "auto" | "unpublish" | "none";
  readonly autoPublish: boolean;
  readonly autoUnpublish: boolean;
  readonly envPublished: boolean;
  readonly shouldPersistPublished: boolean;
  readonly shouldPersistUnpublished: boolean;
  readonly canExposePerformanceStats: boolean;
  readonly operatorHint: string;
}

export function resolveCalibrationPublishPolicy(
  input: PublishPolicyInput,
): PublishPolicyResult {
  const env = input.env ?? process.env;
  const envPublished = envFlag(env, "CALIBRATION_PUBLISHED", false);
  const autoPublish = envFlag(env, "CALIBRATION_AUTO_PUBLISH", false);
  const autoUnpublishExplicit = env["CALIBRATION_AUTO_UNPUBLISH"]?.trim().toLowerCase();
  const autoUnpublish =
    autoUnpublishExplicit === undefined || autoUnpublishExplicit === ""
      ? autoPublish
      : autoUnpublishExplicit === "true" || autoUnpublishExplicit === "1";

  const green = input.eligibilityStatus === "GREEN";
  const streakRequired = input.streakRequired ?? 3;
  const consecutiveGreen = input.consecutiveGreen ?? (green ? streakRequired : 0);
  const streakMet = consecutiveGreen >= streakRequired;
  const durable = input.durablePublished;

  let published = false;
  let source: PublishPolicyResult["source"] = "none";
  let shouldPersistPublished = false;
  let shouldPersistUnpublished = false;

  // RED + auto-unpublish (default when auto on) → force dark
  if (autoUnpublish && !green) {
    published = false;
    source = "unpublish";
    if (durable === true || envPublished) {
      shouldPersistUnpublished = true;
    }
  } else if (envPublished && green) {
    // Sticky env publish only effective while GREEN
    published = true;
    source = "env";
  } else if (envPublished && !green) {
    // Env alone cannot expose while RED
    published = false;
    source = "unpublish";
  } else if (autoPublish && green && streakMet) {
    published = true;
    source = "auto";
    shouldPersistPublished = durable !== true;
  } else if (durable === true && green && streakMet) {
    published = true;
    source = "auto";
  }

  const publishedEffective = published;
  const canExposePerformanceStats = publishedEffective && green;

  let operatorHint: string;
  if (canExposePerformanceStats) {
    operatorHint = `Calibration published (${source}) + eligibility GREEN — performance claims path open.`;
  } else if (!green) {
    operatorHint =
      "Unpublished / RED — performance surfaces stay dark. Fix metrics or wait for streak.";
  } else if (green && !autoPublish && !envPublished) {
    operatorHint =
      "Eligibility GREEN. Set CALIBRATION_AUTO_PUBLISH=true (one-time) or CALIBRATION_PUBLISHED=true to publish.";
  } else {
    operatorHint = `Published=${published} eligibility=${input.eligibilityStatus} streak=${consecutiveGreen}/${streakRequired} — performance dark until publishedEffective && GREEN.`;
  }

  return {
    published,
    publishedEffective,
    source,
    autoPublish,
    autoUnpublish,
    envPublished,
    shouldPersistPublished,
    shouldPersistUnpublished,
    canExposePerformanceStats,
    operatorHint,
  };
}
