import type { MaterialChange, OpportunityObservation } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function observationKey(observation: OpportunityObservation): string {
  const stableExternalId = observation.externalId.trim();
  if (stableExternalId) return `${observation.sourceId}:${stableExternalId}`;
  return `${observation.sourceId}:${fnv1a(`${normalize(observation.title)}|${normalize(observation.url)}`)}`;
}

function materialityFor(observation: OpportunityObservation | null): MaterialChange["materiality"] {
  if (!observation) return "LOW";
  const text = `${observation.title} ${observation.labels.join(" ")}`.toLowerCase();
  if (
    /\b(security|vulnerability|breach|shutdown|sunset|deprecated|deprecation|retire|removed|breaking|deadline|terms change|pricing increase|price increase)\b/.test(
      text,
    )
  ) {
    return "CRITICAL";
  }
  if (
    /\b(credit|grant|funding|affiliate|commission|marketplace|partner|revenue share|api launch|model release|agent|mcp|data feed|free tier)\b/.test(
      text,
    )
  ) {
    return "HIGH";
  }
  if (/\b(update|preview|beta|integration|sdk|workflow|database|benchmark|research)\b/.test(text)) {
    return "MEDIUM";
  }
  return "LOW";
}

function changeReasons(
  kind: MaterialChange["kind"],
  previous: OpportunityObservation | null,
  current: OpportunityObservation | null,
): readonly string[] {
  if (kind === "NEW") return ["Previously unseen source item."];
  if (kind === "REMOVED") return ["Previously observed item is absent from the current source snapshot."];
  if (kind === "UNCHANGED") return ["Content fingerprint and normalized metadata are unchanged."];

  const reasons: string[] = [];
  if (previous?.contentFingerprint !== current?.contentFingerprint) reasons.push("Content fingerprint changed.");
  if (previous?.title !== current?.title) reasons.push("Title changed.");
  if (previous?.url !== current?.url) reasons.push("Canonical URL changed.");
  if (previous?.publishedAt !== current?.publishedAt) reasons.push("Published timestamp changed.");
  if (JSON.stringify(previous?.labels ?? []) !== JSON.stringify(current?.labels ?? [])) {
    reasons.push("Source labels changed.");
  }
  return reasons.length > 0 ? reasons : ["Material source metadata changed."];
}

export function detectMaterialChanges(
  previousSnapshot: readonly OpportunityObservation[],
  currentSnapshot: readonly OpportunityObservation[],
): readonly MaterialChange[] {
  const previous = new Map(previousSnapshot.map((item) => [observationKey(item), item]));
  const current = new Map(currentSnapshot.map((item) => [observationKey(item), item]));
  const keys = new Set([...previous.keys(), ...current.keys()]);
  const changes: MaterialChange[] = [];

  for (const key of [...keys].sort()) {
    const before = previous.get(key) ?? null;
    const after = current.get(key) ?? null;
    let kind: MaterialChange["kind"];
    if (!before && after) kind = "NEW";
    else if (before && !after) kind = "REMOVED";
    else if (
      before?.contentFingerprint === after?.contentFingerprint &&
      before?.title === after?.title &&
      before?.url === after?.url &&
      before?.publishedAt === after?.publishedAt &&
      JSON.stringify(before?.labels ?? []) === JSON.stringify(after?.labels ?? [])
    ) {
      kind = "UNCHANGED";
    } else {
      kind = "UPDATED";
    }

    const focal = after ?? before;
    changes.push({
      key,
      kind,
      previous: before,
      current: after,
      materiality: kind === "UNCHANGED" ? "LOW" : materialityFor(focal),
      reasons: changeReasons(kind, before, after),
    });
  }

  return changes;
}
