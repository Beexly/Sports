/** Rights envelope — every metric carries this. Non-negotiable. */

export type RightsClass =
  | "cc_by_4"
  | "licensed_odds"
  | "free_legal_gov"
  | "optical_derived"
  | "internal_synthetic"
  | "rights_hold"
  | "excluded_sharealike";

export type PublicSurface =
  | "public_api"
  | "pro_api"
  | "elite_api"
  | "internal_only"
  | "dark";

export interface RightsEnvelope {
  readonly rights: RightsClass;
  readonly surface: PublicSurface;
  readonly attributionRequired: boolean;
  readonly commercialOk: boolean;
  readonly notes: string;
}

export function isPublicApiEligible(e: RightsEnvelope): boolean {
  if (e.rights === "rights_hold" || e.rights === "excluded_sharealike") return false;
  if (e.surface === "internal_only" || e.surface === "dark") return false;
  return e.surface === "public_api" || e.surface === "pro_api" || e.surface === "elite_api";
}
