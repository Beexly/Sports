/**
 * 2025 yards after catch per reception and drop rate for the 2026 weeks 1-3 target leader.
 * Same unique last-name join as the adot vote. A blank cell is omitted.
 */
export interface WrSkillPrior {
  readonly player: string;
  readonly yacPerReception: number;
  readonly dropRate: number;
}

export const NFL_2026_W4_WR_SKILL: Readonly<Record<string, WrSkillPrior>> = {
  ARI: { player: "Trey McBride", yacPerReception: 4.6, dropRate: 0.012 },
  ATL: { player: "Drake London", yacPerReception: 3.4, dropRate: 0.009 },
  BAL: { player: "Mark Andrews", yacPerReception: 2.1, dropRate: 0.043 },
  CAR: { player: "Tetairoa McMillan", yacPerReception: 3.8, dropRate: 0.066 },
  DAL: { player: "CeeDee Lamb", yacPerReception: 4.3, dropRate: 0.068 },
  GB: { player: "Matthew Golden", yacPerReception: 3.5, dropRate: 0.023 },
  HOU: { player: "Dalton Schultz", yacPerReception: 4.4, dropRate: 0.019 },
  IND: { player: "Josh Downs", yacPerReception: 2.5, dropRate: 0.045 },
  JAX: { player: "Parker Washington", yacPerReception: 4.6, dropRate: 0.074 },
  KC: { player: "Travis Kelce", yacPerReception: 5.6, dropRate: 0.065 },
  LA: { player: "Davante Adams", yacPerReception: 2.0, dropRate: 0.044 },
  LAC: { player: "Quentin Johnston", yacPerReception: 4.3, dropRate: 0.024 },
  MIA: { player: "Malik Washington", yacPerReception: 5.5, dropRate: 0.015 },
  MIN: { player: "Justin Jefferson", yacPerReception: 5.4, dropRate: 0.021 },
  NE: { player: "Mack Hollins", yacPerReception: 2.3, dropRate: 0.0 },
  NO: { player: "Chris Olave", yacPerReception: 2.9, dropRate: 0.032 },
  NYJ: { player: "Garrett Wilson", yacPerReception: 2.8, dropRate: 0.051 },
  PHI: { player: "DeVonta Smith", yacPerReception: 3.8, dropRate: 0.027 },
  PIT: { player: "DK Metcalf", yacPerReception: 7.0, dropRate: 0.051 },
  SEA: { player: "Jaxon Smith-Njigba", yacPerReception: 4.4, dropRate: 0.031 },
  TB: { player: "Emeka Egbuka", yacPerReception: 5.3, dropRate: 0.071 },
  WAS: { player: "Terry McLaurin", yacPerReception: 2.4, dropRate: 0.017 },
};
