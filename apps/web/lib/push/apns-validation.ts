/**
 * APNs device registration — request input validation.
 *
 * Pure module (zod schemas only, no DB, no auth), mirroring
 * lib/watchlist/validation.ts and lib/push/validation.ts. Kept separate so
 * the shape contract can be tested and reused without pulling in persistence.
 *
 * The token length is not a guess. APNs device tokens are 32 bytes, hex
 * encoded to 64 characters. Anything else is a malformed token, and storing
 * it would put a row in the table that can never receive a push.
 */

import { z } from "zod";

const HEX_64 = /^[0-9a-fA-F]{64}$/;

export const ApnsDeviceInputSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(HEX_64, "token must be a 64-character hex APNs device token"),
  platform: z.literal("ios").default("ios"),
});

export type ApnsDeviceInput = z.infer<typeof ApnsDeviceInputSchema>;

export interface ValidationOk {
  readonly success: true;
  readonly data: ApnsDeviceInput;
}
export interface ValidationErr {
  readonly success: false;
  readonly errors: readonly string[];
}

/**
 * Validates an untrusted request body into an APNs device target.
 * Never throws — always returns a discriminated result.
 */
export function parseApnsDeviceInput(body: unknown): ValidationOk | ValidationErr {
  const result = ApnsDeviceInputSchema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`,
      ),
    };
  }
  // Normalise to lowercase so the unique index cannot be bypassed by casing:
  // "AB12..." and "ab12..." are the same APNs token, and storing both would
  // register one device twice.
  return { success: true, data: { ...result.data, token: result.data.token.toLowerCase() } };
}
