/**
 * EXPLORATORY PROOF-OF-CONCEPT — not wired into any live path.
 * Written 2026-09-07 during an open-ended "free signals nobody has named yet"
 * research pass (see AGENTS.md Rounds 1-15 for what was already covered —
 * this idea is new, altitude/elevation does not appear anywhere in that log
 * or in packages/prediction-engine/src, confirmed by grep before writing this).
 *
 * IDEA: stadium-altitude / thin-air effect on a visiting team.
 *
 * Real, citable precedent (not folklore):
 *   - FIFA adopted, then partially relaxed, an outright ban on international
 *     matches above 2,500m (~8,200 ft) elevation in 2007-2008 after national
 *     federations (Bolivia, Colombia, Ecuador) complained low-altitude teams
 *     were physiologically disadvantaged playing in La Paz (~11,900 ft) and
 *     Quito (~9,350 ft) — a governing body codifying "altitude jump" as a
 *     real competitive factor, not a single anecdote.
 *   - Denver's Empower Field at Mile High sits at 5,280 ft (1,610 m) — the
 *     one NFL venue with a well-documented thin-air narrative ("Mile High"
 *     naming itself), verified this session against multiple independent
 *     sources (Wikipedia's Empower Field / Mile High Stadium articles, the
 *     venue's own "About Us" page, NFL.com). This is the ONLY NFL regular-
 *     season venue with a materially different elevation from the rest of
 *     the league — Kansas City, Atlanta, etc. sit at most a few hundred to
 *     ~1,000 ft up, well short of any threshold in the sports-science or
 *     FIFA literature. That means this feature is honestly closer to a
 *     "Denver-specific home-field-advantage proxy" than a smoothly-varying
 *     league-wide continuous signal — worth stating up front rather than
 *     overselling breadth the data doesn't have.
 *
 * WHAT THIS FILE DOES NOT DO:
 *   - It does not embed a 32-team stadium-elevation table. Only Denver's
 *     figure is used, as a verified test fixture. A real feature would need
 *     every venue's elevation sourced from a real geographic dataset (each
 *     stadium's Wikipedia infobox / USGS GNIS / a state agency page) rather
 *     than reconstructed from memory — that lookup table is NOT built here
 *     and should not be treated as sourced until it is.
 *   - It is not registered in the edge-lab §5 trials registry and carries no
 *     claim of predictive edge. It is a pure function + a unit test, nothing
 *     more, deliberately kept outside packages/prediction-engine/src/edge-lab/
 *     so it is not mistaken for an already-integrated candidate feature.
 *   - Elevation is a public geographic fact (not scraped, not a rights
 *     question) — but if this is ever built out with real per-team data
 *     pulled from a web source, that source still needs the normal
 *     .claude/rules/scraping.md clearance check like any other ingestion.
 */

/**
 * Feet of elevation gain a visiting team experiences at a given venue,
 * relative to that team's home elevation. Positive = playing higher than
 * home (the physiologically relevant direction — thinner air, more travel
 * strain); negative or zero = no altitude disadvantage.
 */
export function altitudeGainFeet(venueElevationFt: number, awayTeamHomeElevationFt: number): number {
  return venueElevationFt - awayTeamHomeElevationFt;
}

/**
 * Whether the gain crosses a threshold the literature treats as physiologically
 * meaningful. 3,000 ft (~914m) is a conservative floor: FIFA's own 2007 rule
 * targeted 2,500m (~8,200 ft) as the point requiring mandated acclimatization,
 * but that threshold was set for elite-endurance soccer at genuinely extreme
 * altitude (La Paz, Quito) — nothing in US pro sports reaches that. Denver's
 * gain from a sea-level opponent (5,280 ft) is the largest gap the NFL/MLB/NBA
 * actually produce, so a materially lower bar is used here deliberately: it is
 * a documented "worth investigating" threshold, not a validated cutoff — the
 * §5 trials registry (or equivalent for this proof-of-concept's later home)
 * would need real backtested data before this number is treated as tuned.
 */
export function isSignificantAltitudeJump(gainFeet: number, thresholdFeet = 3000): boolean {
  return gainFeet >= thresholdFeet;
}

/** Verified fixture: Empower Field at Mile High, Denver — 5,280 ft AMSL. */
export const DENVER_ELEVATION_FT = 5280;

/** Verified fixture: approximate sea-level baseline for a coastal opponent. */
export const SEA_LEVEL_ELEVATION_FT = 0;
