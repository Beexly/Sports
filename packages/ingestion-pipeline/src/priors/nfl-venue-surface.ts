/**
 * Playing surface and roof, copied from apps/web/lib/human-performance/environment.ts
 * so the slate does not import the web app. That file calls this a 2025 public-record
 * table. It is not a 2026 resurvey. Grass versus synthetic only. Slit-film versus
 * monofilament is not in the source, so it is not here.
 *
 * Keyed by the GSE abbreviation. The Rams are LA here, not LAR.
 */
export type VenueSurface = "grass" | "synthetic";

export interface VenueSurfaceFact {
  readonly venue: string;
  readonly surface: VenueSurface;
  readonly controlledRoof: boolean;
  readonly asOf: "2025-public-record";
}

export const NFL_VENUE_SURFACE: Readonly<Record<string, VenueSurfaceFact>> = {
  ARI: { venue: "State Farm Stadium", surface: "grass", controlledRoof: true, asOf: "2025-public-record" },
  ATL: { venue: "Mercedes-Benz Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  BAL: { venue: "M&T Bank Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  BUF: { venue: "Highmark Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  CAR: { venue: "Bank of America Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  CHI: { venue: "Soldier Field", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  CIN: { venue: "Paycor Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  CLE: { venue: "Huntington Bank Field", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  DAL: { venue: "AT&T Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  DEN: { venue: "Empower Field at Mile High", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  DET: { venue: "Ford Field", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  GB: { venue: "Lambeau Field", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  HOU: { venue: "NRG Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  IND: { venue: "Lucas Oil Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  JAX: { venue: "EverBank Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  KC: { venue: "Arrowhead Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  LV: { venue: "Allegiant Stadium", surface: "grass", controlledRoof: true, asOf: "2025-public-record" },
  LAC: { venue: "SoFi Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  LA: { venue: "SoFi Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  MIA: { venue: "Hard Rock Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  MIN: { venue: "U.S. Bank Stadium", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  NE: { venue: "Gillette Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  NO: { venue: "Caesars Superdome", surface: "synthetic", controlledRoof: true, asOf: "2025-public-record" },
  NYG: { venue: "MetLife Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  NYJ: { venue: "MetLife Stadium", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  PHI: { venue: "Lincoln Financial Field", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  PIT: { venue: "Acrisure Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  SF: { venue: "Levi's Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  SEA: { venue: "Lumen Field", surface: "synthetic", controlledRoof: false, asOf: "2025-public-record" },
  TB: { venue: "Raymond James Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  TEN: { venue: "Nissan Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
  WAS: { venue: "Northwest Stadium", surface: "grass", controlledRoof: false, asOf: "2025-public-record" },
};
