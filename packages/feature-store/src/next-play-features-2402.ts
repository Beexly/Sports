/**
 * Team-contextualized next-play event model: pre-play state -> feature vector
 *
 * Research port: arXiv:2402.06815
 * Normalized lane: tracking | Doctrine: INFRA
 *
 * Feature builder for the team-contextualized next-play event models: the general NFL event model encodes pre-play state (down, distance, yardline, score, time, personnel groupings, motion flags) into a fixed feature vector; team fine-tuning consumes the same vector. Pure transform.
 *
 * ACCEPTANCE GATE: ADOPT the fine-tuning recipe only if fine-tuned team-context models beat the Elo simulation baseline by >= 1.0 win MAE on the held-out season AND beat the general model. Live-data gate -> GSE_TEAM_CONTEXT_MODEL_ENABLED flag (default false).
 */

export interface PrePlayState {
  down: number;
  distance: number;
  yardline: number; // 0..100
  scoreDiff: number; // offense minus defense
  quarter: number;
  secondsRemaining: number;
  personnel: string; // e.g. "11", "12", "21"
  shotgun: boolean;
  noHuddle: boolean;
  motion: boolean;
  teamId: string;
}

export const NEXT_PLAY_FEATURE_DIM = 16;

/** Encode pre-play state into the fixed 16-dim feature vector. */
export function encodePrePlayState(s: PrePlayState): number[] {
  const v = new Array<number>(NEXT_PLAY_FEATURE_DIM).fill(0);
  v[0] = s.down / 4;
  v[1] = Math.min(1, s.distance / 20);
  v[2] = s.yardline / 100;
  v[3] = Math.max(-1, Math.min(1, s.scoreDiff / 21));
  v[4] = s.quarter / 4;
  v[5] = s.secondsRemaining / 3600;
  const personnelDigits = s.personnel.replace(/[^0-9]/g, "");
  v[6] = personnelDigits.length >= 1 ? Number(personnelDigits[0]) / 3 : 0;
  v[7] = personnelDigits.length >= 2 ? Number(personnelDigits[1]) / 4 : 0;
  v[8] = s.shotgun ? 1 : 0;
  v[9] = s.noHuddle ? 1 : 0;
  v[10] = s.motion ? 1 : 0;
  v[11] = s.down === 3 || s.down === 4 ? 1 : 0; // money down
  v[12] = s.yardline >= 80 ? 1 : 0; // red zone
  v[13] = s.yardline <= 10 ? 1 : 0; // backed up
  v[14] = Math.abs(s.scoreDiff) <= 8 ? 1 : 0; // one-score game
  v[15] = s.secondsRemaining <= 120 ? 1 : 0; // two-minute drill
  return v;
}

/** Team-context key for the fine-tuning head. */
export function teamContextKey(teamId: string): string {
  return `teamctx:${teamId}`;
}

/** Live-data gate: >=1.0 win MAE improvement over the Elo sim baseline. */
export const GSE_TEAM_CONTEXT_MODEL_ENABLED = false;

