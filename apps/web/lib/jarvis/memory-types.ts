/**
 * Jarvis Memory Protocol — types.
 *
 * What Jarvis is allowed to remember, how candidates are classified, and the
 * honest backing status of the store. Pure type definitions only.
 */

export type MemoryType =
  | "OWNER_PREFERENCE"
  | "PROJECT_FACT"
  | "SYSTEM_STATE"
  | "DECISION"
  | "PROMPT_PATTERN"
  | "AGENT_CAPABILITY"
  | "RISK_RULE"
  | "DESIGN_DOCTRINE"
  | "LEGAL_POLICY"
  | "BUILD_STATUS";

export type MemoryBackingStatus =
  | "DESIGNED"
  | "FILE_BACKED"
  | "DB_BACKED"
  | "VECTOR_BACKED"
  | "ACTIVE"
  | "HELD";

export interface MemoryCandidate {
  readonly type: MemoryType;
  readonly content: string;
  readonly source: string;
  readonly createdAt: string;
  readonly tags: readonly string[];
  readonly sensitive: boolean;
}

export interface JarvisMemoryRecord {
  readonly id: string;
  readonly type: MemoryType;
  readonly content: string;
  readonly source: string;
  readonly createdAt: string;
  readonly backingStatus: MemoryBackingStatus;
  readonly tags: readonly string[];
  readonly expiresAt?: string;
  readonly redacted: boolean;
}

export interface MemoryProtocolStatus {
  readonly isWired: boolean;
  readonly backingStatus: MemoryBackingStatus;
  readonly truth: string;
  readonly capabilities: readonly string[];
  readonly limitations: readonly string[];
  readonly nextWiringStep: string;
}
