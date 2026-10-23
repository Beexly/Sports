/**
 * Locked Coach Projection — the play is produced before any book is read.
 *
 * Doctrine: we are the bookmakers. We review the game, the coaches, the
 * players, the schemes, the usage, the injuries, the matchups. We form a
 * projection. Only after that projection is locked do we look at the lines.
 * If our total is 43 and the market is 50, we bet. We do not chase.
 *
 * This function takes only coach inputs. It does not accept OddsInput.
 * The fence rejects any market token inside this directory.
 */
import { simulateCoachGame, type CoachSimInput, type CoachProjection } from "./markov-simulator.js";

export interface LockedCoachProjection extends CoachProjection {
  lockedAt: string;
  inputHash: string;
  // No market fields. Comparison happens later, in Class B, at Step N.
}

export function lockCoachProjection(input: CoachSimInput): LockedCoachProjection {
  const projection = simulateCoachGame(input);
  return {
    ...projection,
    lockedAt: new Date().toISOString(),
    inputHash: hashInput(input),
  };
}

function hashInput(input: CoachSimInput): string {
  // Deterministic hash of the coach inputs only. No market numbers.
  const raw = JSON.stringify({
    home: input.homeTeam,
    away: input.awayTeam,
    week: input.week,
    support: input.coachSupport,
    injury: input.injuryDropOff ?? 0,
    shadows: (input.shadows ?? []).map((s) => s.wr + ":" + s.shadowRate).sort(),
  });
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

