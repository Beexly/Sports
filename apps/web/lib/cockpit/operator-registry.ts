/**
 * Operator Registry - Promo Desk 2.0 runtime gate.
 *
 * Operators must be explicitly approved here before a promo can publish.
 * Demo rows may appear in cockpit QA surfaces, but never on public promo
 * surfaces. New APPROVED_PARTNER rows are code-review only.
 */

export type OperatorClass =
  | "APPROVED_PARTNER"
  | "KNOWN_NOT_PARTNERED"
  | "DEMO"
  | "BLOCKED";

export type OperatorJurisdiction = "US" | "INTL";

export interface OperatorRegistryEntry {
  readonly key: string;
  readonly displayName: string;
  readonly homepage?: string;
  readonly operatorClass: OperatorClass;
  readonly licensedStates: readonly string[];
  readonly responsibleGamingHotline?: string;
  readonly jurisdiction: OperatorJurisdiction;
  readonly isReal: boolean;
  readonly blockedReason?: string;
  readonly registeredAt: string;
  readonly reviewedAt: string;
  readonly reviewer: string;
}

export const OPERATOR_REGISTRY: readonly OperatorRegistryEntry[] = [
  {
    key: "stellar",
    displayName: "Stellar Sportsbook (demo)",
    operatorClass: "DEMO",
    licensedStates: [],
    jurisdiction: "US",
    isReal: false,
    registeredAt: "2026-05-22",
    reviewedAt: "2026-05-22",
    reviewer: "garrett",
  },
  {
    key: "comet",
    displayName: "Comet Books (demo)",
    operatorClass: "DEMO",
    licensedStates: [],
    jurisdiction: "US",
    isReal: false,
    registeredAt: "2026-05-22",
    reviewedAt: "2026-05-22",
    reviewer: "garrett",
  },
  {
    key: "nebula",
    displayName: "Nebula Wagering (demo)",
    operatorClass: "DEMO",
    licensedStates: [],
    jurisdiction: "US",
    isReal: false,
    registeredAt: "2026-05-22",
    reviewedAt: "2026-05-22",
    reviewer: "garrett",
  },
  {
    key: "orbit",
    displayName: "Orbit Sportsbook (demo)",
    operatorClass: "DEMO",
    licensedStates: [],
    jurisdiction: "US",
    isReal: false,
    registeredAt: "2026-05-22",
    reviewedAt: "2026-05-22",
    reviewer: "garrett",
  },
];

const BY_KEY: ReadonlyMap<string, OperatorRegistryEntry> = new Map(
  OPERATOR_REGISTRY.map((entry) => [entry.key, entry])
);

export class OperatorRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperatorRegistryError";
  }
}

/** Looks up a sportsbook operator by normalized registry key. */
export function getOperator(key: string): OperatorRegistryEntry | undefined {
  if (!key) return undefined;
  return BY_KEY.get(key.toLowerCase());
}

/** Throws unless the operator is explicitly approved for public promos. */
export function assertPromoPublishAllowed(operatorKey: string): void {
  const entry = getOperator(operatorKey);
  if (!entry) {
    throw new OperatorRegistryError(
      `Operator '${operatorKey}' is not in the registry; cannot publish.`
    );
  }
  if (entry.operatorClass === "BLOCKED") {
    throw new OperatorRegistryError(
      `Operator '${operatorKey}' is blocked: ${
        entry.blockedReason ?? "no reason recorded"
      }.`
    );
  }
  if (entry.operatorClass !== "APPROVED_PARTNER") {
    throw new OperatorRegistryError(
      `Operator '${operatorKey}' has class '${entry.operatorClass}'; only APPROVED_PARTNER can publish promos.`
    );
  }
}

/** Returns true only when an operator is an approved publishing partner. */
export function isPublishingPartner(operatorKey: string): boolean {
  const entry = getOperator(operatorKey);
  return Boolean(entry && entry.operatorClass === "APPROVED_PARTNER");
}

/** Lists all operators visible inside the internal cockpit registry. */
export function listCockpitOperators(): readonly OperatorRegistryEntry[] {
  return OPERATOR_REGISTRY;
}

/** Lists operators eligible for public promotion surfaces. */
export function listPublicOperators(): readonly OperatorRegistryEntry[] {
  return OPERATOR_REGISTRY.filter(
    (entry) => entry.operatorClass === "APPROVED_PARTNER"
  );
}

/** Checks whether an operator has an explicit US state license entry. */
export function isOperatorLicensedInState(
  operatorKey: string,
  stateCode: string
): boolean {
  const entry = getOperator(operatorKey);
  if (!entry || entry.jurisdiction !== "US") return false;
  if (entry.licensedStates.length === 0) return false;
  return entry.licensedStates.includes(stateCode.toUpperCase());
}

export interface OperatorRegistrySummary {
  readonly total: number;
  readonly byClass: Record<OperatorClass, number>;
  readonly publishablePartners: number;
}

/** Produces a count snapshot for cockpit health and compliance review. */
export function summarizeRegistry(): OperatorRegistrySummary {
  const byClass: Record<OperatorClass, number> = {
    APPROVED_PARTNER: 0,
    KNOWN_NOT_PARTNERED: 0,
    DEMO: 0,
    BLOCKED: 0,
  };
  for (const entry of OPERATOR_REGISTRY) byClass[entry.operatorClass] += 1;
  return {
    total: OPERATOR_REGISTRY.length,
    byClass,
    publishablePartners: byClass.APPROVED_PARTNER,
  };
}
