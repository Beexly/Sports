/**
 * TD Equity — who actually gets the score, not who gets the yards.
 *
 * Three deterministic reads on where a team's touchdowns really come from,
 * replacing three LLM prompt templates that were circulating publicly as
 * "AI fantasy analyst" prompts for the exact same three questions. The
 * underlying analytical questions are legitimate and quantifiable; the
 * prompt form was not — an LLM free-text answer to "how much does this QB
 * vulture your RB's goal-line work" is neither reproducible nor auditable,
 * and GSE never treats an LLM's guess as a probability (rule 8). These are
 * the same three questions answered as pure functions over real counts.
 *
 * 1. `goalLineVultureRisk` — how much of a team's short-yardage scoring
 *    the QB keeps for himself via sneaks/designed runs, at his skill
 *    players' expense (the "QB Vulture" read).
 * 2. `scoringProfile` — whether a player's touchdowns come from the goal
 *    line or from distance, since those are different skills that get
 *    priced differently (the "Long Score" read).
 * 3. `defensiveSoftSpot` — which position group a defense actually gives
 *    up touchdowns to near the end zone, independent of total yardage
 *    allowed (the "Soft Spot" read).
 *
 * Pure functions, illustrative inputs. Real inputs (QB/team goal-line carry
 * splits, a player's touchdown-by-distance history, a defense's TDs allowed
 * by position) need real play-by-play — GSE does not have an ingested
 * source for this yet (see the CC-BY-4.0 nflverse-data path scoped
 * elsewhere in this audit). Deliberately unwired until that lands; no
 * fabricated counts here or anywhere downstream.
 */

export type TdEquityVerdict = "high_vulture_risk" | "moderate_vulture_risk" | "low_vulture_risk";

export interface GoalLineCarries {
  /** QB carries inside the opponent 5-yard line (sneaks + designed runs). */
  readonly qbCarries: number;
  /** The specific skill player's own carries inside the opponent 5-yard line. */
  readonly playerCarries: number;
  /** All other skill-position carries inside the opponent 5-yard line. */
  readonly otherSkillCarries: number;
}

export interface GoalLineVultureRead {
  readonly qbShare: number;
  readonly playerShare: number;
  readonly verdict: TdEquityVerdict;
  /** Plain-language one-liner, mirroring the source prompts' "one-line verdict" step. */
  readonly note: string;
}

/**
 * Step 1-2-5 of "The QB Vulture": how often the QB scores it himself near
 * the goal line, and what that leaves for the named skill player. A QB who
 * never appears on any depth chart as a runner is still a real competitor
 * for these specific touches — that's the whole point of the read.
 */
export function goalLineVultureRisk(carries: GoalLineCarries): GoalLineVultureRead {
  const total = carries.qbCarries + carries.playerCarries + carries.otherSkillCarries;
  if (total <= 0) {
    return {
      qbShare: 0,
      playerShare: 0,
      verdict: "low_vulture_risk",
      note: "No goal-line carry sample yet — nothing to judge.",
    };
  }
  const qbShare = carries.qbCarries / total;
  const playerShare = carries.playerCarries / total;
  const verdict: TdEquityVerdict = qbShare >= 0.4 ? "high_vulture_risk" : qbShare >= 0.2 ? "moderate_vulture_risk" : "low_vulture_risk";
  const pct = (x: number): string => `${Math.round(x * 100)}%`;
  const note =
    verdict === "high_vulture_risk"
      ? `QB takes ${pct(qbShare)} of goal-line carries himself — a real threat to this player's scoring.`
      : verdict === "moderate_vulture_risk"
        ? `QB takes ${pct(qbShare)} of goal-line carries — a minor factor, not the deciding one.`
        : `QB takes only ${pct(qbShare)} of goal-line carries — not an issue for this player.`;
  return { qbShare, playerShare, verdict, note };
}

export type ScoringProfile = "goal_line_scorer" | "distance_scorer" | "both" | "insufficient_sample";

export interface TouchdownsByDistance {
  /** Touchdowns scored from inside the opponent 5-yard line. */
  readonly goalLine: number;
  /** Touchdowns scored from the red zone but outside the 5 (6-20 yards out). */
  readonly redZone: number;
  /** Touchdowns scored from beyond 20 yards out. */
  readonly distance: number;
}

export interface ScoringProfileRead {
  readonly profile: ScoringProfile;
  readonly goalLineShare: number;
  readonly distanceShare: number;
  readonly note: string;
}

/**
 * "The Long Score": separates a player whose touchdowns need a play call
 * (goal-line work) from one whose touchdowns need a broken play (distance) —
 * the source prompt's own rule is that the second kind is less repeatable
 * and should be priced differently, not read as equally reliable.
 */
export function scoringProfile(byDistance: TouchdownsByDistance): ScoringProfileRead {
  const total = byDistance.goalLine + byDistance.redZone + byDistance.distance;
  if (total <= 0) {
    return {
      profile: "insufficient_sample",
      goalLineShare: 0,
      distanceShare: 0,
      note: "No touchdown sample yet — nothing to classify.",
    };
  }
  const goalLineShare = (byDistance.goalLine + byDistance.redZone) / total;
  const distanceShare = byDistance.distance / total;
  const profile: ScoringProfile =
    goalLineShare >= 0.7 ? "goal_line_scorer" : distanceShare >= 0.7 ? "distance_scorer" : "both";
  const note =
    profile === "goal_line_scorer"
      ? "Scores are goal-line work — repeatable, tied to play-calling near the end zone."
      : profile === "distance_scorer"
        ? "Scores come from distance — needs a broken play, not a play call. Less repeatable."
        : "Mixed profile — real goal-line role and occasional distance scores.";
  return { profile, goalLineShare, distanceShare, note };
}

export type SkillPosition = "RB" | "TE" | "WR_outside" | "WR_slot";

export interface TouchdownsAllowedByPosition {
  readonly RB: number;
  readonly TE: number;
  readonly WR_outside: number;
  readonly WR_slot: number;
}

export type SoftSpotVerdict = "target_for_position" | "neutral" | "bad_matchup";

export interface DefensiveSoftSpotRead {
  readonly weakestPosition: SkillPosition | null;
  readonly verdict: SoftSpotVerdict;
  readonly note: string;
}

/**
 * "The Soft Spot": which position group a defense actually surrenders
 * touchdowns to near the end zone — total yardage allowed is a distraction
 * here, per the source prompt's own rule (a defense can be gashed for
 * yardage and still be stingy in the red zone).
 */
export function defensiveSoftSpot(
  tdsAllowed: TouchdownsAllowedByPosition,
  playerPosition: SkillPosition,
): DefensiveSoftSpotRead {
  const entries = Object.entries(tdsAllowed) as [SkillPosition, number][];
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total <= 0) {
    return { weakestPosition: null, verdict: "neutral", note: "No red-zone touchdown sample yet for this defense." };
  }
  const [weakestPosition] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const weakestShare = tdsAllowed[weakestPosition] / total;
  const matchesWeakness = weakestPosition === playerPosition;
  const verdict: SoftSpotVerdict = matchesWeakness && weakestShare >= 0.35 ? "target_for_position" : matchesWeakness ? "neutral" : "bad_matchup";
  const note =
    verdict === "target_for_position"
      ? `This defense gives up the most red-zone scores to ${weakestPosition.replace("_", " ")} — a real target for this position.`
      : verdict === "bad_matchup"
        ? `This defense's soft spot is ${weakestPosition.replace("_", " ")}, not ${playerPosition.replace("_", " ")} — a tougher matchup than the raw stats suggest.`
        : "No clear position-group weakness for this defense near the end zone.";
  return { weakestPosition, verdict, note };
}

export const TD_EQUITY_DISCLAIMER =
  "Illustrative inputs. Real reads need real play-by-play (goal-line carry splits, touchdown-by-distance history, red-zone touchdowns allowed by position) that GSE has not yet ingested. Never a guarantee — a deterministic read of the numbers you give it, nothing more.";
