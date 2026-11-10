/**
 * Conserved Week 9 MNF (BUF @ MIN) and NFL Slate Projections Summary.
 * Synchronized with the 503-book / 21,419-equation conserved NFL projection spine
 * (`data/projections/mnf_buf_min_conserved_stat_projections_2026_11_09.json` and
 * `docs/predictions/research/2026-11-08/all-15-week9-command-packets/15_BUF_at_MIN_Week9_2026_Command_Packet.md`).
 */

export interface ConservedMnfPlayerProjection {
  readonly player: string;
  readonly team: "BUF" | "MIN";
  readonly position: "QB" | "RB" | "WR" | "TE";
  readonly passYards?: number;
  readonly rushYards?: number;
  readonly recYards?: number;
  readonly receptions?: number;
  readonly projDkPts: number;
}

export const CONSERVED_MNF_BUF_MIN_SLATE_PROJECTIONS: readonly ConservedMnfPlayerProjection[] = [
  {
    player: "Josh Allen",
    team: "BUF",
    position: "QB",
    passYards: 241.7,
    rushYards: 38.9,
    projDkPts: 22.84,
  },
  {
    player: "James Cook",
    team: "BUF",
    position: "RB",
    rushYards: 73.7,
    recYards: 21.2,
    receptions: 2.9,
    projDkPts: 16.42,
  },
  {
    player: "Khalil Shakir",
    team: "BUF",
    position: "WR",
    recYards: 55.6,
    receptions: 4.5,
    projDkPts: 12.18,
  },
  {
    player: "Dalton Kincaid",
    team: "BUF",
    position: "TE",
    recYards: 45.3,
    receptions: 4.3,
    projDkPts: 10.95,
  },
  {
    player: "Sam Darnold",
    team: "MIN",
    position: "QB",
    passYards: 244.5,
    rushYards: 14.2,
    projDkPts: 18.12,
  },
  {
    player: "Justin Jefferson",
    team: "MIN",
    position: "WR",
    recYards: 86.2,
    receptions: 6.3,
    projDkPts: 18.85,
  },
  {
    player: "Aaron Jones",
    team: "MIN",
    position: "RB",
    rushYards: 68.5,
    recYards: 21.8,
    receptions: 2.9,
    projDkPts: 15.14,
  },
] as const;
