export interface PortfolioAnalytics {
  lineupCount: number;
  avgProjection: number;
  avgCeiling: number;
  avgOwnership: number;
  avgLeverage: number;
  avgSalary: number;
  playerExposure: Array<{
    name: string;
    position: string;
    team: string;
    count: number;
    pct: number;
  }>;
  teamExposure: Record<string, number>;
  gameExposure: Record<string, number>;
  positionExposure: Record<string, number>;
  stackDistribution: Record<string, number>;
  chalkConcentration: number; // 0-1
  fragileAssumptionCount: number;
  narrativeDependencyCount: number;
  weatherDependencyCount: number;
  portfolioThesis: string;
  portfolioCounterThesis: string;
  sourceConfidenceAvg: number;
  duplicationRiskScore: number; // 0-100
}

interface LineupPlayer {
  name: string;
  position: string;
  team: string;
  projection: number;
  ceiling: number;
  ownership: number;
  salary: number;
}

interface Lineup {
  players: LineupPlayer[];
  primaryStack?: string | null;
}

interface AnalyzeOpts {
  narrativeSignals?: Array<{ playerName: string }>;
  weatherAffectedTeams?: string[];
}

export function analyzePortfolio(
  lineups: Lineup[],
  opts?: AnalyzeOpts
): PortfolioAnalytics {
  const lineupCount = lineups.length;

  if (lineupCount === 0) {
    return {
      lineupCount: 0,
      avgProjection: 0,
      avgCeiling: 0,
      avgOwnership: 0,
      avgLeverage: 0,
      avgSalary: 0,
      playerExposure: [],
      teamExposure: {},
      gameExposure: {},
      positionExposure: {},
      stackDistribution: {},
      chalkConcentration: 0,
      fragileAssumptionCount: 0,
      narrativeDependencyCount: 0,
      weatherDependencyCount: 0,
      portfolioThesis: "No lineups in portfolio.",
      portfolioCounterThesis: "No lineups in portfolio.",
      sourceConfidenceAvg: 0.75,
      duplicationRiskScore: 0,
    };
  }

  // Aggregate per-lineup metrics
  let totalProjection = 0;
  let totalCeiling = 0;
  let totalOwnership = 0;
  let totalSalary = 0;

  for (const lineup of lineups) {
    for (const player of lineup.players) {
      totalProjection += player.projection;
      totalCeiling += player.ceiling;
      totalOwnership += player.ownership;
      totalSalary += player.salary;
    }
    // leverage is not on individual players in this data shape — skip
  }

  const totalPlayers = lineups.reduce((s, l) => s + l.players.length, 0);
  const avgProjection = totalPlayers > 0 ? totalProjection / lineupCount : 0;
  const avgCeiling = totalPlayers > 0 ? totalCeiling / lineupCount : 0;
  const avgOwnership = totalPlayers > 0 ? totalOwnership / totalPlayers : 0;
  const avgLeverage = 0; // not available in input
  const avgSalary = totalPlayers > 0 ? totalSalary / lineupCount : 0;

  // Player exposure
  const playerCountMap = new Map<
    string,
    { name: string; position: string; team: string; count: number }
  >();

  for (const lineup of lineups) {
    for (const player of lineup.players) {
      const key = `${player.name}::${player.position}::${player.team}`;
      const existing = playerCountMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        playerCountMap.set(key, {
          name: player.name,
          position: player.position,
          team: player.team,
          count: 1,
        });
      }
    }
  }

  const playerExposure = Array.from(playerCountMap.values())
    .map((p) => ({
      ...p,
      pct: (p.count / lineupCount) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Team exposure — % of lineups with ≥1 player from that team
  const teamLineupSets = new Map<string, Set<number>>();
  lineups.forEach((lineup, idx) => {
    for (const player of lineup.players) {
      if (!teamLineupSets.has(player.team)) {
        teamLineupSets.set(player.team, new Set());
      }
      teamLineupSets.get(player.team)!.add(idx);
    }
  });

  const teamExposure: Record<string, number> = {};
  for (const [team, idxSet] of teamLineupSets) {
    teamExposure[team] = idxSet.size / lineupCount;
  }

  // Game exposure — use teamExposure as proxy per spec
  const gameExposure: Record<string, number> = { ...teamExposure };

  // Position exposure — average players per position across lineups
  const positionTotals = new Map<string, number>();
  for (const lineup of lineups) {
    const posMap = new Map<string, number>();
    for (const player of lineup.players) {
      posMap.set(player.position, (posMap.get(player.position) ?? 0) + 1);
    }
    for (const [pos, cnt] of posMap) {
      positionTotals.set(pos, (positionTotals.get(pos) ?? 0) + cnt);
    }
  }

  const positionExposure: Record<string, number> = {};
  for (const [pos, total] of positionTotals) {
    positionExposure[pos] = total / lineupCount;
  }

  // Stack distribution — count lineups by primaryStack
  const stackDistribution: Record<string, number> = {};
  for (const lineup of lineups) {
    const stack = lineup.primaryStack ?? "NONE";
    stackDistribution[stack] = (stackDistribution[stack] ?? 0) + 1;
  }

  // Chalk concentration — avg of top 5 highest-exposure players' pct / 100
  const top5 = playerExposure.slice(0, 5);
  const chalkConcentration =
    top5.length > 0
      ? top5.reduce((s, p) => s + p.pct, 0) / top5.length / 100
      : 0;

  // Fragile assumption count — players in >80% of lineups
  const fragileThreshold = 0.8 * lineupCount;
  const fragileAssumptionCount = playerExposure.filter(
    (p) => p.count > fragileThreshold
  ).length;

  // Narrative dependency count
  const narrativePlayerNames = new Set(
    (opts?.narrativeSignals ?? []).map((s) => s.playerName)
  );
  const lineupPlayerNames = new Set(
    lineups.flatMap((l) => l.players.map((p) => p.name))
  );
  let narrativeDependencyCount = 0;
  for (const name of narrativePlayerNames) {
    if (lineupPlayerNames.has(name)) narrativeDependencyCount += 1;
  }

  // Weather dependency count — lineups with ≥1 player from weatherAffectedTeams
  const weatherTeams = new Set(opts?.weatherAffectedTeams ?? []);
  let weatherDependencyCount = 0;
  for (const lineup of lineups) {
    if (lineup.players.some((p) => weatherTeams.has(p.team))) {
      weatherDependencyCount += 1;
    }
  }

  // Duplication risk — avg Jaccard similarity across a sample of lineup pairs, scaled to 0-100
  let duplicationRiskScore = 0;
  if (lineupCount > 1) {
    const MAX_PAIRS = 200;
    let pairCount = 0;
    let totalJaccard = 0;

    outer: for (let i = 0; i < lineupCount; i++) {
      for (let j = i + 1; j < lineupCount; j++) {
        const lineupA = lineups[i];
        const lineupB = lineups[j];
        if (!lineupA || !lineupB) continue;
        const setA = new Set(lineupA.players.map((p) => p.name));
        const setB = new Set(lineupB.players.map((p) => p.name));
        const intersection = [...setA].filter((x) => setB.has(x)).length;
        const union = new Set([...setA, ...setB]).size;
        totalJaccard += union > 0 ? intersection / union : 0;
        pairCount += 1;
        if (pairCount >= MAX_PAIRS) break outer;
      }
    }

    duplicationRiskScore =
      pairCount > 0 ? (totalJaccard / pairCount) * 100 : 0;
  }

  const analytics: PortfolioAnalytics = {
    lineupCount,
    avgProjection,
    avgCeiling,
    avgOwnership,
    avgLeverage,
    avgSalary,
    playerExposure,
    teamExposure,
    gameExposure,
    positionExposure,
    stackDistribution,
    chalkConcentration,
    fragileAssumptionCount,
    narrativeDependencyCount,
    weatherDependencyCount,
    portfolioThesis: "",
    portfolioCounterThesis: "",
    sourceConfidenceAvg: 0.75,
    duplicationRiskScore,
  };

  analytics.portfolioThesis = generatePortfolioThesis(analytics);
  analytics.portfolioCounterThesis = generatePortfolioCounterThesis(analytics);

  return analytics;
}

export function generatePortfolioThesis(analytics: PortfolioAnalytics): string {
  const topStack = Object.entries(analytics.stackDistribution)
    .filter(([k]) => k !== "NONE")
    .sort(([, a], [, b]) => b - a)[0];

  const topStackTeam = topStack ? topStack[0] : "none";

  return (
    `Portfolio of ${analytics.lineupCount} lineups averaging ` +
    `${analytics.avgProjection.toFixed(1)} pts. ` +
    `Primary stack: ${topStackTeam}. ` +
    `Chalk concentration: ${(analytics.chalkConcentration * 100).toFixed(0)}%.`
  );
}

export function generatePortfolioCounterThesis(
  analytics: PortfolioAnalytics
): string {
  const topPlayer = analytics.playerExposure[0];

  if (!topPlayer) {
    return "Counter-thesis: No concentrated exposure identified.";
  }

  return (
    `Counter-thesis: If ${topPlayer.name} (${topPlayer.pct.toFixed(0)}% exposure) underperforms, ` +
    `${analytics.fragileAssumptionCount} concentrated assumptions break. ` +
    `Duplication risk: ${analytics.duplicationRiskScore.toFixed(0)}/100.`
  );
}
