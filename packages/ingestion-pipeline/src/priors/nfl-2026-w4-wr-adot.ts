/**
 * 2026 weeks 1-3 target leader, joined to wr_smash.csv by unique last name and team.
 * An ambiguous or missing name is omitted. Week 4 only.
 */
export interface WrAdotPrior {
  readonly player: string;
  readonly adot: number;
}

export const NFL_2026_W4_WR_ADOT: Readonly<Record<string, WrAdotPrior>> = {
  ARI: { player: "Trey McBride", adot: 6.8 },
  ATL: { player: "Drake London", adot: 10.9 },
  BAL: { player: "Mark Andrews", adot: 7.4 },
  CAR: { player: "Tetairoa McMillan", adot: 11.6 },
  DAL: { player: "CeeDee Lamb", adot: 11.7 },
  GB: { player: "Matthew Golden", adot: 12.5 },
  HOU: { player: "Dalton Schultz", adot: 6.2 },
  IND: { player: "Josh Downs", adot: 7.2 },
  JAX: { player: "Parker Washington", adot: 12.5 },
  KC: { player: "Travis Kelce", adot: 6.8 },
  LA: { player: "Davante Adams", adot: 12.6 },
  LAC: { player: "Quentin Johnston", adot: 11.8 },
  MIA: { player: "Malik Washington", adot: 4.9 },
  MIN: { player: "Justin Jefferson", adot: 10.2 },
  NE: { player: "Mack Hollins", adot: 13.0 },
  NO: { player: "Chris Olave", adot: 11.8 },
  NYJ: { player: "Garrett Wilson", adot: 9.1 },
  PHI: { player: "DeVonta Smith", adot: 11.9 },
  PIT: { player: "DK Metcalf", adot: 10.5 },
  SEA: { player: "Jaxon Smith-Njigba", adot: 11.2 },
  TB: { player: "Emeka Egbuka", adot: 12.1 },
  WAS: { player: "Terry McLaurin", adot: 13.9 },
};
