/**
 * Rating "why" — the human read behind the GSE Rating.
 *
 * The player model publishes ONE number per player (processGrade) plus a
 * signal (buy-low / sell-high / in-line) and the production gap. That number is
 * trustworthy but mute. This module gives it a voice: a SHORT, result-framed
 * sentence that names the REAL drivers already on the PlayerProfile and says,
 * in plain English, what the rating is telling you to do.
 *
 * Hard constraints:
 *   • Pure mapping of EXISTING fields → language. We do NOT recompute the grade,
 *     re-rank, or publish any forward projection. The number is owned by
 *     player-model.ts; this only narrates it.
 *   • NO fabricated data. If a driver field is null we omit that clause — we
 *     never invent a target share, an EPA, a WOPR. Honest gaps over filler.
 *   • Server-safe AND client-safe: zero node/Next imports so it can be called
 *     from a loader, a server page, or a client render fn alike.
 *
 * Branches are organized by position × signal (buy-low / sell-high / in-line),
 * because the right thing to SAY about a WR whose role outruns his box score is
 * different from the right thing to say about a QB regressing to his process.
 */

import type { PlayerProfile, ModelPosition, ProcessSignal } from "./player-model";
import { ratingTier } from "./colors";

/** The minimal slice of a PlayerProfile the narrator reads. Accepting a Pick
 *  (rather than the full profile) keeps this callable from anywhere a few of
 *  these fields are in hand — and makes the "omit when null" contract explicit. */
export type RatingWhyInput = Pick<
  PlayerProfile,
  | "position"
  | "signal"
  | "processGrade"
  | "productionPct"
  | "epaPerPlay"
  | "wopr"
  | "targetShare"
  | "dakota"
  | "pacr"
  | "touches"
>;

// Percentile-ish thresholds for "is this driver actually a strength?" These read
// the values already on the profile; they do NOT re-grade. WOPR > 0.6 and target
// share > 0.24 are genuine alpha-role marks; EPA/play > 0.1 is clearly positive,
// < -0.05 clearly negative; DAKOTA > 0.1 is efficient QB play.
const HIGH_WOPR = 0.6;
const HIGH_TARGET_SHARE = 0.24;
const STRONG_EPA = 0.1;
const WEAK_EPA = -0.05;
const STRONG_DAKOTA = 0.1;
const HEAVY_TOUCHES = 200;

/** Format a target share (a 0..1 fraction) as a clean percent, no decimals. */
function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Assemble the strongest REAL usage clause for a pass-catcher (WR/TE). Returns
 * null when no opportunity field is present, so the caller can fall back rather
 * than fabricate. Order of preference: WOPR (the composite role number), then
 * target share alone.
 */
function receivingUsageClause(p: RatingWhyInput): string | null {
  if (p.wopr != null && p.wopr >= HIGH_WOPR) return "a top-tier weighted-opportunity role";
  if (p.targetShare != null && p.targetShare >= HIGH_TARGET_SHARE) return `a ${pct(p.targetShare)} target share`;
  if (p.wopr != null) return "a defined role in the passing game";
  if (p.targetShare != null) return `a ${pct(p.targetShare)} target share`;
  return null;
}

/** Tier word for the published grade, lowercased for mid-sentence use. */
function tierWord(grade: number): string {
  return ratingTier(grade).label.toLowerCase();
}

function whyReceiver(p: RatingWhyInput): string {
  const usage = receivingUsageClause(p);
  if (p.signal === "buy-low") {
    return usage
      ? `Elite usage — ${usage} — that the box score hasn't paid out yet; the role says the production is coming.`
      : "The process is outrunning the production here — a buy-low before the points catch up.";
  }
  if (p.signal === "sell-high") {
    return usage
      ? `The points are running ahead of the role (${usage}); sell into the production before it regresses.`
      : "Production has outrun the underlying role — sell-high while the value is rich.";
  }
  // in-line
  return usage
    ? `Role and production line up — ${usage} earning a ${tierWord(p.processGrade)} grade, priced about right.`
    : `Role and production are in step at a ${tierWord(p.processGrade)} grade — fairly priced.`;
}

function whyRunningBack(p: RatingWhyInput): string {
  const volume = p.touches >= HEAVY_TOUCHES ? `a heavy ${p.touches}-touch workload` : `${p.touches} touches`;
  const efficient = p.epaPerPlay >= STRONG_EPA;
  if (p.signal === "buy-low") {
    return `${volume.charAt(0).toUpperCase()}${volume.slice(1)} anchoring the role — the usage is there ahead of the production; buy before it pays out.`;
  }
  if (p.signal === "sell-high") {
    return efficient
      ? `Production is ahead of the workload on hot efficiency — sell-high before the touchdowns and the EPA come back to earth.`
      : `The box score is outrunning the workload behind it (${volume}); sell into the production.`;
  }
  return `${volume.charAt(0).toUpperCase()}${volume.slice(1)} and the production agree — a ${tierWord(p.processGrade)} grade that's fairly priced.`;
}

function whyQuarterback(p: RatingWhyInput): string {
  const efficient = p.epaPerPlay >= STRONG_EPA || (p.dakota != null && p.dakota >= STRONG_DAKOTA);
  const inefficient = p.epaPerPlay <= WEAK_EPA;
  if (p.signal === "buy-low") {
    return efficient
      ? "Efficient, high-EPA process the fantasy points haven't rewarded yet — the underlying play says it's coming."
      : "The process grade is ahead of the production — a buy-low if the efficiency holds.";
  }
  if (p.signal === "sell-high") {
    return "Fantasy production is outrunning the efficiency under it — sell-high before the play regresses to the process.";
  }
  if (inefficient) {
    return `Process and production agree on a ${tierWord(p.processGrade)} grade — the efficiency is the ceiling here.`;
  }
  return `Efficiency and production are in step at a ${tierWord(p.processGrade)} grade — priced about right.`;
}

/**
 * ratingWhy — the public entry point. Given a player profile (or the relevant
 * slice of one), return ONE short, human, result-framed sentence explaining the
 * GSE Rating from its real drivers.
 *
 * It never recomputes the grade, never invents a missing field, and always
 * returns a non-empty string (it falls back to a signal-only read when no
 * driver field is populated). Branches are position × signal.
 */
export function ratingWhy(profile: RatingWhyInput): string {
  switch (profile.position) {
    case "WR":
    case "TE":
      return whyReceiver(profile);
    case "RB":
      return whyRunningBack(profile);
    case "QB":
      return whyQuarterback(profile);
    default:
      return signalFallback(profile.signal);
  }
}

/** Signal-only read for the (typed-impossible) default case — keeps the function
 *  total without fabricating any driver. Exported for callers that have only a
 *  signal in hand (e.g. a compact chip) and want consistent house copy. */
export function signalFallback(signal: ProcessSignal): string {
  switch (signal) {
    case "buy-low":
      return "The process is ahead of the production — a buy-low before the market reprices it.";
    case "sell-high":
      return "Production has outrun the process behind it — sell-high into the value.";
    default:
      return "Process and production agree — fairly priced.";
  }
}

// Re-export the position type so consumers can narrow without reaching back into
// player-model for a single type.
export type { ModelPosition };
