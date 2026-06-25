/**
 * FANTASY DISCOVERY LAYER — Platform DNA Genome (Invention F17).
 *
 * Fantasy platforms, ranking sites, and DFS pricers each have a behavioral fingerprint: some update
 * projections slowly, some are conservative on ranks, some lag on backup-role promotions or rookie
 * breakouts, some overreact to last week's box score or to a matchup. Knowing the genome tells GSE
 * WHERE and HOW LONG a given role shock will sit un-absorbed on each surface. Pure + deterministic.
 */

export interface PlatformTraits {
  readonly projectionUpdateSpeed: number; // 0..1 (1 = fast)
  readonly rankingConservatism: number;   // 0..1 (1 = slow to move ranks)
  readonly injuryStatusLatency: number;   // 0..1 (1 = slow on injury news)
  readonly rookieUpdateLag: number;       // 0..1
  readonly backupRoleLag: number;         // 0..1
  readonly nameValueBias: number;         // 0..1 (clings to name value)
  readonly boxScoreOverweight: number;    // 0..1 (overreacts to last box score)
  readonly matchupOverweight: number;     // 0..1 (overreacts to matchup)
}

export interface PlatformGenome {
  readonly platform: string;
  readonly traits: PlatformTraits;
}

export type FantasySituation =
  | "backup_role_shock" | "injury_downgrade" | "rookie_breakout" | "matchup_shift" | "box_score_spike";

export type PlatformBehavior = "slow_to_update" | "overreacts" | "balanced";

export interface PlatformLagResult {
  readonly platform: string;
  readonly situation: FantasySituation;
  /** 0..1 expected absorption lag (higher = slower; the exploitable surface). */
  readonly expectedLag: number;
  /** 0..1 expected overreaction (higher = fades into a trap). */
  readonly overreaction: number;
  readonly behavior: PlatformBehavior;
  readonly drivers: readonly string[];
}

/** Predict how a platform will (mis)handle a given situation. */
export function platformLagScore(g: PlatformGenome, situation: FantasySituation): PlatformLagResult {
  const t = g.traits;
  let lag = 0, overreaction = 0;
  const drivers: string[] = [];
  switch (situation) {
    case "backup_role_shock": lag = 0.6 * t.backupRoleLag + 0.4 * (1 - t.projectionUpdateSpeed); drivers.push("backup-role lag + projection speed"); break;
    case "injury_downgrade": lag = 0.7 * t.injuryStatusLatency + 0.3 * (1 - t.projectionUpdateSpeed); drivers.push("injury-status latency"); break;
    case "rookie_breakout": lag = 0.6 * t.rookieUpdateLag + 0.4 * t.rankingConservatism; drivers.push("rookie update lag + ranking conservatism"); break;
    case "matchup_shift": overreaction = t.matchupOverweight; drivers.push("matchup overweight (overreaction risk)"); break;
    case "box_score_spike": overreaction = t.boxScoreOverweight; drivers.push("box-score overweight (overreaction risk)"); break;
  }
  const behavior: PlatformBehavior = overreaction > 0.5 ? "overreacts" : lag > 0.5 ? "slow_to_update" : "balanced";
  return { platform: g.platform, situation, expectedLag: Number(lag.toFixed(3)), overreaction: Number(overreaction.toFixed(3)), behavior, drivers };
}

/** Rank platforms slowest-to-absorb first for a lag-type situation — the slowest is the edge window. */
export function rankPlatformsByLag(genomes: readonly PlatformGenome[], situation: FantasySituation): PlatformLagResult[] {
  return genomes.map((g) => platformLagScore(g, situation)).sort((a, b) => b.expectedLag - a.expectedLag);
}
