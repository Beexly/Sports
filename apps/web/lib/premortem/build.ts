export interface PickPremortemPickInput {
  readonly id: string;
  readonly selection: string;
  readonly pickType: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  readonly riskLevel: string;
  readonly modelVersion: string;
}

export interface PickPremortemSnapshotInput {
  readonly id: string;
  readonly capturedAt: Date;
  readonly hadLineMovementSignal: boolean;
  readonly hadRestSignal: boolean;
  readonly hadScheduleSignal: boolean;
  readonly hadAtsFormSignal: boolean;
  readonly hadH2HSignal: boolean;
  readonly hadVenueSignal: boolean;
  readonly hadWeatherSignal: boolean;
  readonly hadInjurySignal: boolean;
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly lineMovementDelta: number | null;
  readonly restAdvantageNet: number | null;
  readonly atsFormSampleSize: number | null;
  readonly h2hSampleSize: number | null;
  readonly scheduleDensityHome: number | null;
  readonly scheduleDensityAway: number | null;
  readonly modelVersion: string;
}

export interface PickPremortemNote {
  readonly status: "READY" | "NEEDS_SNAPSHOT";
  readonly pickId: string;
  readonly headline: string;
  readonly summary: string;
  readonly riskDrivers: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly modelVersion: string;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function compactDrivers(drivers: readonly string[]): readonly string[] {
  return drivers.length > 0
    ? drivers.slice(0, 4)
    : ["the market closes against the selection", "the strongest factor inputs fail to persist"];
}

export function buildPickPremortemNote(
  pick: PickPremortemPickInput,
  snapshot: PickPremortemSnapshotInput | null
): PickPremortemNote {
  if (!snapshot) {
    return {
      status: "NEEDS_SNAPSHOT",
      pickId: pick.id,
      headline: `Pre-mortem pending for ${pick.selection}`,
      summary: "Signal snapshot is required before a public pre-mortem can be generated.",
      riskDrivers: [],
      evidenceRefs: [`pick:${pick.id}`],
      modelVersion: pick.modelVersion,
    };
  }

  const drivers: string[] = [];
  if (snapshot.hadLineMovementSignal && snapshot.lineMovementDelta !== null) {
    drivers.push(`line movement reverses from ${signed(snapshot.lineMovementDelta)} before close`);
  }
  if (snapshot.hadRestSignal && snapshot.restAdvantageNet !== null) {
    drivers.push(`rest edge does not hold (${signed(snapshot.restAdvantageNet)} net rest days)`);
  }
  if (
    snapshot.hadScheduleSignal &&
    snapshot.scheduleDensityHome !== null &&
    snapshot.scheduleDensityAway !== null
  ) {
    drivers.push(
      `schedule density was misread (${snapshot.scheduleDensityHome}-${snapshot.scheduleDensityAway} last seven days)`
    );
  }
  if (snapshot.hadAtsFormSignal && snapshot.atsFormSampleSize !== null) {
    drivers.push(`ATS form sample (${snapshot.atsFormSampleSize} games) stops carrying forward`);
  }
  if (snapshot.hadH2HSignal && snapshot.h2hSampleSize !== null) {
    drivers.push(`head-to-head sample (${snapshot.h2hSampleSize} games) proves noisy`);
  }
  if (snapshot.hadVenueSignal) drivers.push("venue context does not translate to this matchup");
  if (snapshot.hadWeatherSignal) drivers.push("weather context moves after the snapshot");
  if (snapshot.hadInjurySignal) drivers.push("availability context changes after the snapshot");
  if (snapshot.dataQualityScore < 75) drivers.push(`evidence health is thin (${Math.round(snapshot.dataQualityScore)}/100)`);
  if (snapshot.bookmakerCount < 4) drivers.push(`book depth stays thin (${snapshot.bookmakerCount} books)`);

  const riskDrivers = compactDrivers(drivers);
  const factorText = riskDrivers.join("; ");

  return {
    status: "READY",
    pickId: pick.id,
    headline: `What would have to go wrong for ${pick.selection}`,
    summary:
      `If this loses: ${factorText}. The pick was scored at ${pick.confidence} confidence ` +
      `with ${pct(pick.consensusPct)} market consensus and ${snapshot.bookmakerCount} books in the snapshot.`,
    riskDrivers,
    evidenceRefs: [`pick:${pick.id}`, `snapshot:${snapshot.id}`],
    modelVersion: snapshot.modelVersion || pick.modelVersion,
  };
}
