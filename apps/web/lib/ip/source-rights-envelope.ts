import { getSourceRightsEntry, snapshotRights } from "@/lib/source-rights/source-rights-registry";

export interface IpSourceRightsEnvelope {
  readonly sourceId: string;
  readonly status: string;
  readonly mayUseForModeling: boolean;
  readonly mayExposeDerived: boolean;
  readonly mayExposeRaw: false;
  readonly attributionRequired: string | null;
  readonly evidenceUrls: readonly string[];
  readonly notes: readonly string[];
}

export function buildIpSourceRightsEnvelope(sourceId: string): IpSourceRightsEnvelope | null {
  const entry = getSourceRightsEntry(sourceId);
  if (entry === undefined) return null;
  const snapshot = snapshotRights(entry);
  return {
    attributionRequired: snapshot.attribution_text,
    evidenceUrls: entry.evidence_urls,
    mayExposeDerived: snapshot.derived_analytics_allowed,
    mayExposeRaw: false,
    mayUseForModeling: snapshot.model_training_allowed,
    notes: [entry.notes],
    sourceId: snapshot.source_id,
    status: snapshot.status,
  };
}
