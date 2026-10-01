/**
 * Week-4 entering pressure matchup. Same formula as scripts/situational-edges.py:
 * home (pressure created minus pressure allowed) minus the same net for the
 * visitor. 2025 regular season is the prior. 2026 weeks 1-3 are the
 * observation, blended at 150 prior dropbacks. Week 4 plays are not in
 * the counts.
 *
 * The 2025 walk-forward already allowed this into the tilt (r 0.241, 250
 * games). Fourth-down go rate did not (r -0.014) and is not in this table.
 * A game that is not this week's row abstains.
 */
export const NFL_2026_W4_PRESSURE_EDGE: Readonly<Record<string, number>> = {
  "NYG|ARI": -0.028561,
  "NO|ATL": -0.017716,
  "HOU|DAL": -0.004935,
  "SF|DEN": -0.109582,
  "CAR|DET": -0.005926,
  "TB|GB": 0.042724,
  "WAS|IND": 0.023779,
  "CIN|JAX": -0.01116,
  "LV|KC": 0.017834,
  "SEA|LAC": 0.092766,
  "PHI|LA": 0.0162,
  "MIN|MIA": 0.030643,
  "BUF|NE": 0.043791,
  "CHI|NYJ": 0.071884,
  "CLE|PIT": -0.076191,
  "BAL|TEN": 0.001667,
};
