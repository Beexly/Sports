/**
 * Alpha WR Target Ceiling & Duress Funnel Signal
 *
 * Formulates:
 * 1. Weighted Opportunity Rating (WOPR = 1.5 * TargetShare + 0.7 * AirYardShare)
 * 2. Targets Per Route Run (TPRR) & First-Read Target Share
 * 3. Pocket Collapse Duress Target Funnel Factor (TDUD)
 * 4. Ceiling Funnel Score (CFS) for high-stakes GPP tournaments
 */

export interface ReceiverMetrics {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly targetShare: number;        // 0.10 to 0.35
  readonly airYardShare: number;      // 0.10 to 0.48
  readonly firstReadShare: number;    // 0.15 to 0.42
  readonly tprr: number;              // Targets per route run (0.12 to 0.38)
  readonly routeParticipation: number;// % of team dropbacks running a route (0.60 to 0.98)
  readonly adot: number;              // Average depth of target (5.0 to 16.0)
  readonly redZoneShare: number;      // Target share in red zone (0.10 to 0.38)
}

export interface MatchupDuressContext {
  readonly oppTeam: string;
  readonly edgePrwr: number;           // Edge Pass Rush Win Rate (0.15 to 0.32)
  readonly otPbwr: number;             // OT Pass Block Win Rate (0.55 to 0.85)
  readonly blitzRate: number;          // Blitz frequency (0.15 to 0.45)
  readonly qbTimeToThrow: number;      // Seconds (2.40 to 3.10)
  readonly teamProjectedDropbacks: number; // 28 to 48
  readonly spread: number;             // Positive if underdog (trailing game script)
  readonly teamHhi: number;            // Target tree concentration HHI (0.10 to 0.22)
}

export interface CeilingFunnelOutput {
  readonly cfs: number;                // 0 to 100
  readonly wopr: number;
  readonly pocketCollapseProb: number;
  readonly duressFunnelRatio: number;
  readonly isAlphaMonopoly: boolean;   // CFS >= 75
}

/**
 * Weighted Opportunity Rating:
 * WOPR = 1.5 * TargetShare + 0.7 * AirYardShare
 * Elite Alpha: WOPR >= 0.70.
 */
export function calculateWopr(targetShare: number, airYardShare: number): number {
  return 1.5 * targetShare + 0.7 * airYardShare;
}

/**
 * Probability of pocket collapse / duress within 2.30s:
 * Determined by edge pass rush vs tackle pass protection and blitz intensity.
 */
export function calculatePocketCollapseProb(ctx: MatchupDuressContext): number {
  const trenchDelta = ctx.edgePrwr - ctx.otPbwr + 0.45;
  const z = 4.5 * trenchDelta + 1.2 * ctx.blitzRate - 0.8 * (ctx.qbTimeToThrow - 2.65);
  const zClipped = Math.max(-60.0, Math.min(60.0, -z));
  const p = 1.0 / (1.0 + Math.exp(zClipped));
  return Math.min(0.65, Math.max(0.15, p));
}

/**
 * Duress Funnel Ratio (psi):
 * Under pressure, QBs do not progress to reads 3-4; they lock onto alpha security blankets.
 * Intermediate / quick separation routes thrive under duress (psi > 1.30).
 */
export function calculateDuressFunnelRatio(rec: ReceiverMetrics): number {
  let base = 1.0;
  base += 1.2 * Math.max(0.0, rec.firstReadShare - 0.22);

  if (rec.adot < 9.5) {
    base += 0.25;
  } else if (rec.adot > 13.5) {
    base -= 0.35;
  }

  base += 0.8 * Math.max(0.0, rec.tprr - 0.22);
  return Math.min(2.20, Math.max(0.60, base));
}

/**
 * Computes Ceiling Funnel Score (CFS) on a 0-100 scale.
 */
export function computeCeilingFunnelScore(rec: ReceiverMetrics, ctx: MatchupDuressContext): CeilingFunnelOutput {
  const wopr = calculateWopr(rec.targetShare, rec.airYardShare);
  const pDuress = calculatePocketCollapseProb(ctx);
  const psi = calculateDuressFunnelRatio(rec);

  // 1. Earning base
  const eBase = (0.40 * Math.min(1.5, wopr / 0.70) +
                 0.35 * Math.min(1.5, rec.tprr / 0.30) +
                 0.25 * Math.min(1.5, rec.firstReadShare / 0.35));

  // 2. Tree concentration
  const cTree = 1.0 + 1.25 * Math.max(0.0, ctx.teamHhi - 0.14);

  // 3. Duress funnel leverage
  const dMult = 1.0 + 1.20 * pDuress * (psi - 1.0);

  // 4. Pace and dropback volume
  const spreadFactor = 1.0 + 0.025 * Math.min(14.0, Math.max(0.0, ctx.spread));
  const vPace = Math.pow(ctx.teamProjectedDropbacks / 35.0, 0.85) * spreadFactor * rec.routeParticipation;

  const cfsRaw = eBase * cTree * dMult * vPace;
  const zCfs = Math.max(-60.0, Math.min(60.0, -3.2 * (cfsRaw - 1.35)));
  const cfs = 100.0 / (1.0 + Math.exp(zCfs));
  const roundedCfs = Math.round(cfs * 10) / 10;

  return {
    cfs: roundedCfs,
    wopr: Math.round(wopr * 1000) / 1000,
    pocketCollapseProb: Math.round(pDuress * 1000) / 1000,
    duressFunnelRatio: Math.round(psi * 100) / 100,
    isAlphaMonopoly: roundedCfs >= 75.0,
  };
}
