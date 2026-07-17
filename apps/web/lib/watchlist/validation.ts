/**
 * Watchlist — request input validation.
 *
 * Pure module (zod schemas only — no DB, no auth). The API routes are the
 * only callers; kept separate from `db.ts` / `eligibility.ts` so the shape
 * contract can be tested and reused without pulling in persistence.
 */

import { z } from "zod";
import type { WatchlistEntityType } from "./types";

// entityId is a cuid() in this schema (Team.id / Player.id) — 64 chars is
// generous headroom without being unbounded input.
const ENTITY_ID_MAX_LEN = 64;

// Kept as a literal tuple (not derived from WATCHLIST_ENTITY_TYPES, which is
// a widened readonly string[]) so zod infers the exact "TEAM" | "PLAYER"
// union rather than `string` — the db.ts / eligibility.ts call sites depend
// on the narrowed WatchlistEntityType type.
const ENTITY_TYPE_VALUES: [WatchlistEntityType, WatchlistEntityType] = ["TEAM", "PLAYER"];

export const WatchlistEntityTypeSchema = z.enum(ENTITY_TYPE_VALUES);

export const WatchlistTargetSchema = z.object({
  entityType: WatchlistEntityTypeSchema,
  entityId: z.string().trim().min(1, "entityId is required").max(ENTITY_ID_MAX_LEN),
});

export type WatchlistTargetInput = z.infer<typeof WatchlistTargetSchema>;

export interface ValidationOk {
  readonly success: true;
  readonly data: WatchlistTargetInput;
}
export interface ValidationErr {
  readonly success: false;
  readonly errors: string[];
}

/** Parses + validates an untrusted request body into a WatchlistTarget.
 *  Never throws — always returns a discriminated result. */
export function parseWatchlistTarget(body: unknown): ValidationOk | ValidationErr {
  const result = WatchlistTargetSchema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`),
    };
  }
  return { success: true, data: result.data };
}
