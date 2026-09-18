/**
 * Calibration sample floors. One home. Values copied byte-identical from
 * the previous homes (calibration-apply.ts and clf-v0.ts both exported
 * DEFAULT_MIN_CALIBRATION_SAMPLE = 100). Do not invent additional floors
 * here. Callers re-export this symbol so existing import paths keep working.
 */
export const DEFAULT_MIN_CALIBRATION_SAMPLE = 100;
