/**
 * Galaxy Sports Edge — analytics & utility toolkit.
 * Single cohesive entry point grouping every pure library by domain.
 *
 * Usage:
 *   import { sports, analytics, math, utils } from '@/lib/toolkit';
 *   sports.badmintonAnalytics.gameWinner(21, 19);
 *   math.numberTheory.gcd(48, 18);
 *   utils.unitConversion.milesToKm(26.2);
 */

export * as sports from './sports';
export * as analytics from './analytics';
export * as math from './math';
export * as utils from './utils/toolkit';
