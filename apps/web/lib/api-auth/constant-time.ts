/**
 * Constant-time string comparison for the EDGE runtime.
 *
 * WHY THIS EXISTS INSTEAD OF `timingSafeEqual`
 * --------------------------------------------
 * The repo's Node-runtime secret comparisons already use `node:crypto`'s
 * `timingSafeEqual` — `lib/b2b/api-key-auth.ts` (constantTimeEquals),
 * `lib/cron/authorize.ts` → `@sports/util` (safeEqualSecret), and
 * `lib/api-auth/hash.ts` (timingSafeHashEqual). None of those are reachable
 * from `middleware.ts`: Next 14 middleware runs on the Edge runtime, which has
 * Web Crypto but no `node:crypto`, so importing any of them from the waitlist
 * gate would break the edge bundle at build time. This is the Edge twin of that
 * primitive, and the same rules apply — never compare a secret with `===`.
 *
 * WHAT `===` LEAKS THAT THIS DOES NOT
 * -----------------------------------
 * String `===` short-circuits at the first differing byte, so the time it takes
 * is a function of how many leading bytes the attacker guessed correctly. That
 * is the signal a byte-at-a-time guessing attack needs. Comparing two fields
 * before branching (the previous "constant-time-ish" approach in
 * lib/waitlist/access-gate.ts) removes only the field-ORDER leak; the per-byte
 * leak inside each `===` survives it.
 *
 * This compares every byte of the two candidates, accumulating differences with
 * OR, and only inspects the accumulator at the end — the work done does not
 * depend on WHERE the first difference is.
 *
 * LENGTH: like every length-checked implementation in this repo
 * (`safeEqualSecret`, `constantTimeEquals`), an unequal byte length returns
 * false immediately. The length of a configured credential is not the secret
 * the attacker is after, and pretending otherwise would require padding to a
 * fixed width for no real gain.
 */

const encoder = new TextEncoder();

/**
 * True when `a` and `b` are the same string, compared without short-circuiting
 * on the first differing byte.
 *
 * Nullish inputs are never equal to anything — a missing credential must not be
 * able to match a missing expectation.
 */
export function constantTimeStringEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) return false;

  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= (left[i] as number) ^ (right[i] as number);
  }
  return diff === 0;
}
