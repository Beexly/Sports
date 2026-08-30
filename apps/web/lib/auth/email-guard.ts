/**
 * Email guard for the ADMIN allow-list path.
 *
 * Why this exists: GHSA-7rqj-j65f-68wh (auth.js email normalizer, critical)
 * is the homoglyph class — an address containing a Unicode lookalike for `@`
 * (U+FF20 FULLWIDTH COMMERCIAL AT, etc.) can slip past validation. The
 * upstream fix is a dependency bump (owner-gated; package.json changes are
 * forbidden in unattended runs). Until then this is the code-level,
 * fail-CLOSED mitigation: an admin email must be plain ASCII.
 *
 * Google-issued account emails are always ASCII (lowercased, punycode-encoded
 * for IDN). So rejecting non-ASCII cannot lock out a legitimate admin, and it
 * makes the Unicode-lookalike attack impossible on this path — a homoglyph
 * email simply can never match the allow-list, in either direction.
 *
 * Deliberately pure: no imports, no env, no DB — trivially unit-testable and
 * safe to call from the auth callback.
 */

/** True only for plausible plain-ASCII emails. Fail-closed on anything else. */
export function isAsciiEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const value = email.trim();
  if (value.length === 0 || value.length > 254) return false;
  // Every character must be ASCII (covers U+FF20 and every other lookalike).
  if (!/^[\x00-\x7F]*$/.test(value)) return false;
  // Basic shape: local@domain.tld with a dotted domain.
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) return false;
  return true;
}

/** Canonical form used for allow-list comparison (trim + lowercase). */
export function canonicalEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}
