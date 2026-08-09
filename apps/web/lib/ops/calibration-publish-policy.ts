/**
 * Calibration publish automation — pure resolve + env policy.
 *
 * Founder sets CALIBRATION_AUTO_PUBLISH=true ONCE after reviewing engine design.
 * No weekly ceremony. Defaults safe (auto off).
 *
 * Effective published = env CALIBRATION_PUBLISHED OR (auto && eligibility GREEN durable)
 * Auto-unpublish (default when auto on): RED → unpublished.
 * PERFORMANCE claims only when published && eligibility GREEN.
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
  /** Durable receipt: last auto-written published state (null = none). */
  readonly durablePublished: boolean | null;
}

export interface PublishPolicyResult {
  readonly published: boolean;
  readonly source: "env" | "auto" | "unpublish" | "none";
  readonly autoPublish: boolean;
  readonly autoUnpublish: boolean;
  readonly envPublished: boolean;
  /** Should durable receipt be written as published=true on this evaluation. */
  readonly shouldPersistPublished: boolean;
  /** Should durable receipt be written as published=false. */
  readonly shouldPersistUnpublished: boolean;
  /** Honesty gate for public performance numbers. */
  readonly canExposePerformanceStats: boolean;
  readonly operatorHint: string;
}

export function resolveCalibrationPublishPolicy(
  input: PublishPolicyInput,
): PublishPolicyResult {
  const env = input.env ?? process.env;
  const envPublished = envFlag(env, "CALIBRATION_PUBLISHED", false);
  const autoPublish = envFlag(env, "CALIBRATION_AUTO_PUBLISH", false);
  // Default true when auto-publish on; else explicit true only.
  const autoUnpublishExplicit = env["CALIBRATION_AUTO_UNPUBLISH"]?.trim().toLowerCase();
  const autoUnpublish =
    autoUnpublishExplicit === undefined || autoUnpublishExplicit === ""
      ? autoPublish
      : autoUnpublishExplicit === "true" || autoUnpublishExplicit === "1";

  const green = input.eligibilityStatus === "GREEN";
  const durable = input.durablePublished;

  let published = false;
  let source: PublishPolicyResult["source"] = "none";
  let shouldPersistPublished = false;
  let shouldPersistUnpublished = false;

  if (autoUnpublish && !green) {
    published = false;
    source = "unpublish";
    if (durable === true || envPublished) {
      shouldPersistUnpublished = true;
    }
    // Env CALIBRATION_PUBLISHED=true without auto is sticky manual — still respect unpublish when auto path enabled
    if (!autoPublish && envPublished) {
      // Manual publish + auto unpublish off path: env alone keeps published only if green?
      // Law: RED → force dark. Even manual env published under RED should not expose performance.
      published = false;
      source = "unpublish";
    }
  } else if (envPublished) {
    published = true;
    source = "env";
  } else if (autoPublish && green) {
    published = true;
    source = "auto";
    shouldPersistPublished = durable !== true;
  } else if (durable === true && green) {
    // Sticky durable published while still green (auto may have been on previously)
    published = true;
    source = "auto";
  }

  // Final honesty: never expose performance when RED or unpublished
  const canExposePerformanceStats = published && green;

  let operatorHint: string;
  if (canExposePerformanceStats) {
    operatorHint = `Calibration published (${source}) + eligibility GREEN — performance claims path open.`;
  } else if (!green && published === false) {
    operatorHint =
      "Unpublished / RED — performance surfaces stay dark. Fix metrics or wait for streak.";
  } else if (green && !autoPublish && !envPublished) {
    operatorHint =
      "Eligibility GREEN. Set CALIBRATION_AUTO_PUBLISH=true (one-time) or CALIBRATION_PUBLISHED=true to publish.";
  } else {
    operatorHint = `Published=${published} eligibility=${input.eligibilityStatus} — performance dark until both published and GREEN.`;
  }

  return {
    published,
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
