/**
 * Runtime selective publish + pause-list for public board rows.
 * SELECTIVE_PUBLISH_ENABLED === "true" only; default OFF.
 * Does not invent edge; filters low-conviction / paused groups.
 */

import { flagEnabled } from "@/lib/env/flags";
import {
  passesSelectiveThresholds,
  type SelectiveThresholds,
} from "@/lib/calibration/selective-publish";

export type PublicPickLike = {
  readonly confidence?: number | null;
  readonly pickType?: string | null;
  readonly sportKey?: string | null;
  readonly marketImpliedProb?: number | null;
};

const DEFAULT_DELTA = 0.1;

export function loadSelectiveRuntimeConfig(env: Record<string, string | undefined> = process.env): {
  readonly enabled: boolean;
  readonly thresholds: SelectiveThresholds;
  readonly pausedGroups: readonly string[];
} {
  const enabled = flagEnabled("SELECTIVE_PUBLISH_ENABLED", env);
  const deltaRaw = env["SELECTIVE_PUBLISH_DELTA"]?.trim();
  const delta = deltaRaw ? Number(deltaRaw) : DEFAULT_DELTA;
  const pauseRaw = env["SELECTIVE_PAUSE_GROUPS"]?.trim() ?? "";
  const pausedGroups = pauseRaw
    ? pauseRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    enabled,
    thresholds: {
      delta: Number.isFinite(delta) ? delta : DEFAULT_DELTA,
      edge: null,
      minGroupRes: null,
    },
    pausedGroups,
  };
}

export function passesPublicSelectiveFilter(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const cfg = loadSelectiveRuntimeConfig(env);
  if (!cfg.enabled) return true;
  const p =
    typeof pick.confidence === "number" && Number.isFinite(pick.confidence)
      ? Math.min(1, Math.max(0, pick.confidence / 100))
      : 0.5;
  const groupKey = `${pick.sportKey ?? "unknown"}|${pick.pickType ?? "unknown"}`;
  if (cfg.pausedGroups.includes(groupKey)) return false;
  return passesSelectiveThresholds(
    {
      p,
      y: 0,
      groupKey,
      marketP: pick.marketImpliedProb ?? null,
    },
    cfg.thresholds,
  );
}
