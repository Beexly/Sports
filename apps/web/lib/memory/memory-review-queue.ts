import type { MemoryCandidate } from "./memory-types";
export function approveMemory(candidate: MemoryCandidate, reviewedAt: string): MemoryCandidate { return { ...candidate, status: "APPROVED", reviewedAt }; }
export function rejectMemory(candidate: MemoryCandidate, reviewedAt: string, rejectedReason: string): MemoryCandidate { return { ...candidate, status: "REJECTED", reviewedAt, rejectedReason }; }
export function summarizeApprovedMemory(candidates: readonly MemoryCandidate[]): readonly string[] { return candidates.filter((candidate) => candidate.status === "APPROVED").map((candidate) => candidate.summary); }
export function countMemoryReviewQueue(candidates: readonly MemoryCandidate[]): number { return candidates.filter((candidate) => candidate.status === "CANDIDATE" || candidate.status === "NEEDS_OWNER_REVIEW").length; }
