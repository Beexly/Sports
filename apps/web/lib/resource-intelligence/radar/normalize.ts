/**
 * R&D Radar — deterministic identity + posture normalization.
 *
 * Mirrors scripts/resource-radar-import.mjs exactly. The import script bakes
 * these values into the committed snapshot; this module re-exposes the same
 * rules so tests can prove the fixture and the runtime never disagree, and so
 * future snapshots normalize identically.
 */

import type { RadarPosture, RadarWindow } from "./types";

/** Lowercased owner/name for real repos; `concept:<slug>` for non-repo items. */
export function normalizeRepository(raw: string): string {
  const trimmed = raw.trim().replace(/\.git$/i, "").replace(/\s+/g, " ");
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed.toLowerCase();
  return (
    "concept:" +
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

/**
 * Reduce free-text research postures ("PROTOTYPE_RIGHTS_CLEARED",
 * "REFERENCE_ONLY_UNTIL_LICENSE_REVIEW", "OWNER_LEGAL_REVIEW", …) to the
 * eight-value policy enum. Prefix rules, checked in restrictiveness order:
 * quarantine and owner-review claims always win their prefix class.
 *
 * FAIL-CLOSED fallback (G-4): a posture string no rule recognizes is an
 * evidence defect, not a watch signal — it gates as OWNER_REVIEW (counts
 * surfaced, blocks spelled out, structurally excluded from the action list)
 * instead of silently becoming watch-only OBSERVE. "REJECTED"/"REJECT_NOISE"
 * variants match the REJECT prefix rather than falling through.
 */
export function normalizePosture(raw: string): RadarPosture {
  const p = raw.trim().toUpperCase();
  if (p.startsWith("QUARANTINE")) return "QUARANTINE";
  if (p.startsWith("OWNER")) return "OWNER_REVIEW";
  if (p.startsWith("REJECT")) return "REJECT";
  if (p.startsWith("ADOPT_PATTERNS")) return "ADOPT_PATTERNS";
  if (p.startsWith("PROTOTYPE")) return "PROTOTYPE";
  if (p.startsWith("PILOT")) return "PILOT";
  if (p.startsWith("REFERENCE") || p === "DESIGN_REFERENCE" || p === "UNVERIFIED_REFERENCE") {
    return "REFERENCE_ONLY";
  }
  if (p === "OBSERVE" || p === "EVALUATE") return "OBSERVE";
  return "OWNER_REVIEW";
}

/** Stable observation id — window-scoped so re-observations dedupe cleanly. */
export function observationId(window: RadarWindow, repository: string): string {
  return `${window}:${normalizeRepository(repository)}`;
}

/** Human display name from a normalized identity. */
export function displayName(normalizedRepository: string): string {
  return normalizedRepository.startsWith("concept:")
    ? normalizedRepository.slice("concept:".length).replace(/-/g, " ")
    : normalizedRepository;
}
