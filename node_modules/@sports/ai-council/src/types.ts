/**
 * Adversarial AI Council — destroy-to-improve audit types.
 * Not legal advice. Engineering refuse-default for claims/compliance.
 */

export type CouncilSeatId =
  | "ftc_section5"
  | "endorsement_predator"
  | "classification_auditor"
  | "substantiation_auditor"
  | "license_vampire"
  | "crypto_honesty"
  | "fire_authority_skeptic"
  | "state_gaming_ad"
  | "ai_claim_auditor"
  | "residual_truth_teller";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type RegulationPattern =
  | "FTC_SECTION_5"
  | "FTC_MMO_PENALTY_NOTICE"
  | "FTC_ENDORSEMENT_GUIDES"
  | "FTC_REVIEWS_TESTIMONIALS_RULE"
  | "NAD_COMPARATIVE"
  | "NAD_SUPERIORITY"
  | "NAD_AI_CLAIMS"
  | "NY_SPORTS_AD"
  | "STATE_RISK_FREE"
  | "CFTC_IDENTITY"
  | "SP800_227_MISUSE"
  | "LICENSE_COPYLEFT"
  | "EXPORT_RIGHTS"
  | "FOUNDER_RESIDUAL"
  | "UK_TIPSTER_PROOFING_ANALOG";

export interface DestroyFinding {
  readonly seat: CouncilSeatId;
  readonly severity: Severity;
  readonly surface: string;
  readonly claim: string;
  readonly impliedClaim: string;
  readonly evidenceMissing: string[];
  readonly regulationPattern: RegulationPattern;
  readonly remediation: string;
  readonly shipBlock: boolean;
  readonly findingId: string;
}

export interface DestroyReport {
  readonly runId: string;
  readonly asOf: string;
  readonly surfacesAudited: number;
  readonly findings: DestroyFinding[];
  readonly counts: Record<Severity, number>;
  readonly shipBlocked: boolean;
  readonly criticalHigh: DestroyFinding[];
  readonly notes: string;
}

export interface AuditSurface {
  readonly id: string;
  readonly path: string;
  readonly kind:
    | "marketing"
    | "product"
    | "api"
    | "partner"
    | "crypto"
    | "rights"
    | "gate"
    | "residual";
  readonly text: string;
  readonly meta?: {
    readonly hasFourField?: boolean;
    readonly hasWatermark?: boolean;
    readonly competitiveStudyId?: string | null;
    readonly liveBoardOn?: boolean;
    readonly phaseCVerified?: boolean;
    readonly sportsbookCpa?: boolean;
    readonly claimsPostQuantumLedger?: boolean;
    readonly publicApiEligible?: boolean;
    readonly founderGateClaimedShipped?: boolean;
    readonly spdxPresent?: boolean;
    readonly classification?: "tool" | "tipster" | "exchange" | "unknown";
  };
}

export interface CouncilSeat {
  readonly id: CouncilSeatId;
  readonly name: string;
  readonly mission: string;
  readonly attackSurface: string;
  readonly audit: (surfaces: readonly AuditSurface[]) => DestroyFinding[];
}
