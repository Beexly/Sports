import type { MemoryCandidate, MemoryType } from "./memory-types";
export function createMemoryCandidate(input: { id: string; type: MemoryType; title: string; summary: string; source: string; createdByAgent?: string; sensitivity?: MemoryCandidate["sensitivity"]; relatedArtifact?: string | null; now: string }): MemoryCandidate {
  const sensitivity = input.sensitivity ?? "LOW";
  return { id: input.id, type: input.type, title: input.title, summary: input.summary, source: input.source, createdByAgent: input.createdByAgent ?? "archive", sensitivity, status: sensitivity === "HIGH" ? "NEEDS_OWNER_REVIEW" : "CANDIDATE", ownerApprovalRequired: true, relatedArtifact: input.relatedArtifact ?? null, createdAt: input.now, reviewedAt: null, rejectedReason: null };
}
