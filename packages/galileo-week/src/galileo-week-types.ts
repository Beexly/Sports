/**
 * GALILEO WEEK — types for the eight atlases + the week intelligence summary.
 *
 * One real NFL week, run through data-intelligence → decision-factory, produces eight atlases that
 * answer: who saw it first, how truth moved through the market and fantasy, what cards a user would
 * have seen, which scars we avoided, whether we got smarter, what we should buy, and what we should
 * stop buying. This package builds the whole STRUCTURE over fixtures; live execution is owner-gated.
 */

export interface SourceRaceAtlas {
  readonly races: readonly { factType: string; entityId: string; winner: string | null; laggards: readonly string[]; contradictionSignal: boolean }[];
  readonly fastestSource: string | null;
  readonly note: string;
}

export interface MarketAbsorptionAtlas {
  readonly observerCount: number;
  readonly avgVelocity: number;
  readonly bookLagDetected: boolean;
  readonly note: string;
}

export interface FantasyAbsorptionAtlas {
  readonly avgAbsorptionGap: number;
  readonly crowdMoved: boolean;
  readonly note: string;
}

export interface DecisionCardAtlas {
  readonly emitted: number;
  readonly suppressed: number;
  readonly byState: Readonly<Record<string, number>>;
  readonly headlines: readonly { title: string; state: string; strength: string }[];
  readonly note: string;
}

export interface ScarAtlas {
  readonly trapsAvoided: readonly { subject: string; verdict: string }[];
  readonly processHeld: readonly { subject: string; verdict: string }[];
  readonly note: string;
}

export interface IntelligenceDeltaAtlas {
  /** VALIDATED-improving ledgers (0 on fixtures — nothing is validated without a live sample). */
  readonly improvingCount: number;
  /** Ledgers merely trending up (the honest fixture signal). */
  readonly upwardTrendCount: number;
  readonly intelligenceDelta: number;
  readonly improvingLedgers: readonly string[];
  readonly dataMode: "FIXTURE" | "LIVE";
  readonly validated: boolean;
  readonly note: string;
}

export interface MissedObservationAtlas {
  readonly gaps: readonly { entityId: string; missingFactGroup: string }[];
  readonly toBuy: readonly string[];
  readonly note: string;
}

export interface OverObservationAtlas {
  readonly noise: readonly { factType: string; sourceId: string }[];
  readonly toStopBuying: readonly string[];
  readonly note: string;
}

export interface WeekIntelligenceAtlas {
  readonly week: string;
  readonly mode: "PREVIEW_FIXTURES" | "LIVE";
  readonly sourceRace: SourceRaceAtlas;
  readonly marketAbsorption: MarketAbsorptionAtlas;
  readonly fantasyAbsorption: FantasyAbsorptionAtlas;
  readonly decisionCard: DecisionCardAtlas;
  readonly scar: ScarAtlas;
  readonly intelligenceDelta: IntelligenceDeltaAtlas;
  readonly missedObservation: MissedObservationAtlas;
  readonly overObservation: OverObservationAtlas;
  /** The public moment: "GSE checked N books, M fantasy signals, K injury sources — here are the X things that mattered." */
  readonly publicMoment: string;
}

/** Owner approval is required to ever run LIVE. This package holds neither keys nor network. */
export interface OwnerApproval {
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly keysProvided: boolean;
}
