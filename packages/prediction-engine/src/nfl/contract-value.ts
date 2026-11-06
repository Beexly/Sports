/**
 * Contract value — EPA-per-dollar ranking within position.
 *
 * valuePerDollar = totalEPA / capHitMillions
 *
 * Rules (all fail-closed, nothing imputed):
 *  - Zero or negative cap hits are excluded entirely (undefined value).
 *  - Missing / non-finite cap data is never ranked.
 *  - Ranking is within-position. The top decile is labelled `surplus`,
 *    the bottom decile `overpaid`, everything between `fair`.
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface ContractPlayer {
  playerId: string;
  position: string;
  totalEPA: number;
  /** Cap charge in millions. `null` / `undefined` / ≤ 0 is never ranked. */
  capHitMillions: number | null | undefined;
}

export type ValueLabel = "surplus" | "fair" | "overpaid";

export interface RankedContract {
  playerId: string;
  position: string;
  totalEPA: number;
  capHitMillions: number;
  valuePerDollar: number;
  /** 1-based rank within position, 1 = highest valuePerDollar. */
  rankInPosition: number;
  positionGroupSize: number;
  label: ValueLabel;
}

function isUsableNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * totalEPA / capHitMillions. `null` when EPA is non-finite or the cap hit is
 * missing, non-finite, zero, or negative — never imputed.
 */
export function valuePerDollar(
  player: Pick<ContractPlayer, "totalEPA" | "capHitMillions"> | null | undefined,
): number | null {
  if (player == null) return null;
  const { totalEPA, capHitMillions } = player;
  if (!isUsableNumber(totalEPA)) return null;
  if (!isUsableNumber(capHitMillions)) return null;
  if (capHitMillions <= 0) return null;
  const v = totalEPA / capHitMillions;
  return Number.isFinite(v) ? v : null;
}

function labelFor(index: number, n: number): ValueLabel {
  if (n <= 1) return "fair";
  const percentile = index / (n - 1); // 0 = best value, 1 = worst value
  if (percentile <= 0.1) return "surplus";
  if (percentile >= 0.9) return "overpaid";
  return "fair";
}

/**
 * Rank eligible players within their position by valuePerDollar (descending).
 * Players with missing / non-finite / non-positive cap hits are dropped and
 * never appear in the output. Returns a new array; input is not mutated.
 */
export function rankContracts(
  players: readonly (ContractPlayer | null | undefined)[] | null | undefined,
): readonly RankedContract[] {
  if (!Array.isArray(players)) return [];
  const eligible: RankedContract[] = [];
  const byPosition = new Map<string, RankedContract[]>();

  for (const p of players) {
    if (p == null) continue;
    if (typeof p.playerId !== "string" || p.playerId.length === 0) continue;
    if (typeof p.position !== "string" || p.position.length === 0) continue;
    const v = valuePerDollar(p);
    if (v === null) continue;
    const cap = p.capHitMillions;
    if (!isUsableNumber(cap) || cap <= 0) continue;
    if (!isUsableNumber(p.totalEPA)) continue;
    const row: RankedContract = {
      playerId: p.playerId,
      position: p.position,
      totalEPA: p.totalEPA,
      capHitMillions: cap,
      valuePerDollar: v,
      rankInPosition: 0,
      positionGroupSize: 0,
      label: "fair",
    };
    eligible.push(row);
    const group = byPosition.get(p.position);
    if (group === undefined) byPosition.set(p.position, [row]);
    else group.push(row);
  }

  for (const group of byPosition.values()) {
    group.sort((a, b) => {
      if (b.valuePerDollar !== a.valuePerDollar) return b.valuePerDollar - a.valuePerDollar;
      // Deterministic tie-break on playerId.
      return a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0;
    });
    const n = group.length;
    for (let i = 0; i < n; i++) {
      const row = group[i];
      if (row === undefined) continue;
      row.rankInPosition = i + 1;
      row.positionGroupSize = n;
      row.label = labelFor(i, n);
    }
  }

  // Stable output order: position alphabetically, then rank.
  return [...eligible].sort((a, b) => {
    if (a.position !== b.position) return a.position < b.position ? -1 : 1;
    return a.rankInPosition - b.rankInPosition;
  });
}

// --- Engine-facing API (handoff-suite contract) -----------------------------
export interface SalaryProviderLike {
  getCapHitMillions(playerName: string, season: number): Promise<number | null>;
  getAllCapHits(season: number): Promise<ReadonlyMap<string, number>>;
  isAvailable(): boolean;
}
export interface ContractValueApi {
  analyze(players: readonly { player: string; position: string; totalEPA: number; capHitM: number | null }[]): Promise<RankedContract[]>;
}
export interface ContractValueOptions {
  readonly salaryProvider?: SalaryProviderLike;
}
export function createContractValueAnalyzer(options: ContractValueOptions = {}): ContractValueApi {
  const provider = options.salaryProvider;
  return {
    async analyze(players): Promise<RankedContract[]> {
      const rows: ContractPlayer[] = [];
      for (const p of players) {
        let capHitM = p.capHitM;
        if (capHitM == null && provider) {
          capHitM = await provider.getCapHitMillions(p.player, 2026);
        }
        rows.push({ playerId: p.player, position: p.position, totalEPA: p.totalEPA, capHitMillions: capHitM });
      }
      const ranked = rankContracts(rows); return Promise.resolve([...ranked]);
    },
  };
}
