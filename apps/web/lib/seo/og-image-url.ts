/**
 * Pure helper to build the OG image URL for a pick.
 *
 * The slug is constructed from sport/home/away parts — safe for use in
 * Next.js dynamic route `/og/pick/[slug]/opengraph-image` without any DB
 * lookups. Parts are lowercased, spaces replaced with dashes, and non-
 * alphanumeric characters (except dashes) stripped.
 */

/**
 * Build the OG image URL for a pick from its sport, home team, and away team.
 *
 * @example
 *   pickOgImageUrl("NFL", "Dallas Cowboys", "Philadelphia Eagles")
 *   // => "/og/pick/nfl-dallas-cowboys-philadelphia-eagles"
 */
export function pickOgImageUrl(sport: string, home: string, away: string): string {
  const slug = [sport, home, away]
    .map((s) =>
      s
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    )
    .join("-");
  return `/og/pick/${slug}`;
}
