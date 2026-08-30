export const NO_BET_METHODOLOGY_VERSION = "2026-07-05.1" as const;

export type PublicNoBetDecision = "WATCH" | "PASS" | "HARD_PASS";

export type PublicNoBetReasonCode =
  | "missing_required_data"
  | "stale_market_context"
  | "source_rights_blocked"
  | "calibration_drift"
  | "calibration_debt"
  | "model_disagreement"
  | "responsible_gaming";

export interface PublicNoBetMethodologyExample {
  readonly id: string;
  readonly reasonCode: PublicNoBetReasonCode;
  readonly decision: PublicNoBetDecision;
  readonly title: string;
  readonly trigger: string;
  readonly userFacingCopy: string;
  readonly allowedLanguage: readonly string[];
  readonly internalBoundary: readonly string[];
  readonly evidenceNeededToReopen: readonly string[];
}

export const PUBLIC_NO_BET_METHODOLOGY_EXAMPLES: readonly PublicNoBetMethodologyExample[] = [
  {
    allowedLanguage: [
      "The required evidence is incomplete, so GSE withholds a directional call.",
      "No bet is the current decision because the evidence chain is not ready.",
    ],
    decision: "HARD_PASS",
    evidenceNeededToReopen: [
      "required source fields present",
      "fresh source timestamp",
      "source policy allows modeling use",
    ],
    id: "no-bet-missing-required-data",
    internalBoundary: [
      "Do not reveal formula coefficients.",
      "Do not replace missing evidence with a confidence label.",
      "Do not publish a directional call from partial required data.",
    ],
    reasonCode: "missing_required_data",
    title: "Missing Required Data",
    trigger: "A required evidence field is absent or unusable at review time.",
    userFacingCopy:
      "GSE is passing because a required evidence field is missing. The model is allowed to wait until the record is complete.",
  },
  {
    allowedLanguage: [
      "The market read is stale, so movement is not treated as a clean signal.",
      "A stale line can create false confidence; the correct state is review.",
    ],
    decision: "HARD_PASS",
    evidenceNeededToReopen: [
      "fresh market snapshot",
      "book dispersion review",
      "time-to-start context",
    ],
    id: "no-bet-stale-market-context",
    internalBoundary: [
      "Do not imply stale movement is a clean market signal.",
      "Do not expose raw provider prices unless payload rights allow it.",
      "Do not infer private market intent from movement alone.",
    ],
    reasonCode: "stale_market_context",
    title: "Stale Market Context",
    trigger: "The market context is older than the freshness window for the decision.",
    userFacingCopy:
      "GSE is passing because the market context is stale. Movement without freshness is not enough to support action.",
  },
  {
    allowedLanguage: [
      "The source policy blocks this use, so the metric cannot drive a public decision.",
      "GSE keeps the output internal until source rights are clear for the intended surface.",
    ],
    decision: "HARD_PASS",
    evidenceNeededToReopen: [
      "approved source-rights policy",
      "payload-rights review",
      "attribution or licensing notes where required",
    ],
    id: "no-bet-source-rights-blocked",
    internalBoundary: [
      "Do not describe this as legal clearance.",
      "Do not re-serve raw provider payloads.",
      "Do not copy restricted data into public examples.",
    ],
    reasonCode: "source_rights_blocked",
    title: "Source Rights Blocked",
    trigger: "A source is unknown, blocked, or not approved for the intended use.",
    userFacingCopy:
      "GSE is passing because one source is not approved for this use. Rights discipline overrides model interest.",
  },
  {
    allowedLanguage: [
      "Calibration drift forces restraint until the model earns public probability language again.",
      "The decision is blocked because the probability contract is not healthy.",
    ],
    decision: "HARD_PASS",
    evidenceNeededToReopen: [
      "fresh calibration check",
      "drift back inside policy bounds",
      "owner-reviewed model card update",
    ],
    id: "no-bet-calibration-drift",
    internalBoundary: [
      "Do not call the number a public win probability.",
      "Do not promote a model version while drift is active.",
      "Do not hide the drift driver from review logs.",
    ],
    reasonCode: "calibration_drift",
    title: "Calibration Drift",
    trigger: "Recent calibration evidence shows the probability contract is drifting.",
    userFacingCopy:
      "GSE is passing because calibration drift is active. A model that is drifting does not get to speak louder.",
  },
  {
    allowedLanguage: [
      "The model may still be interesting, but the public claim bar has not been earned.",
      "Calibration debt caps the decision until enough clean evidence accumulates.",
    ],
    decision: "PASS",
    evidenceNeededToReopen: [
      "sufficient settled sample",
      "non-worsening calibration check",
      "updated validation note",
    ],
    id: "no-bet-calibration-debt",
    internalBoundary: [
      "Do not frame confidence as probability.",
      "Do not convert an internal score into a public claim.",
      "Do not use settlement gaps as marketing material.",
    ],
    reasonCode: "calibration_debt",
    title: "Calibration Debt",
    trigger: "The model has not earned the public probability contract for this context.",
    userFacingCopy:
      "GSE is passing because the probability claim bar is not met. Confidence and probability stay separate.",
  },
  {
    allowedLanguage: [
      "Model disagreement moves the state to watch or pass until the conflict is explained.",
      "Disagreement is information; it does not become a stronger public call by itself.",
    ],
    decision: "WATCH",
    evidenceNeededToReopen: [
      "parliament disagreement review",
      "counter-case note",
      "fresh source reliability check",
    ],
    id: "no-bet-model-disagreement",
    internalBoundary: [
      "Do not average away disagreement without a review note.",
      "Do not expose protected model internals.",
      "Do not treat disagreement as a contrarian signal by default.",
    ],
    reasonCode: "model_disagreement",
    title: "Model Disagreement",
    trigger: "Independent model votes diverge enough to require a counter-case review.",
    userFacingCopy:
      "GSE is watching because the model parliament disagrees. The disagreement has to be explained before action.",
  },
  {
    allowedLanguage: [
      "GSE does not personalize wagering advice.",
      "Responsible-gaming context can override every other signal.",
    ],
    decision: "HARD_PASS",
    evidenceNeededToReopen: [
      "responsible-gaming review cleared",
      "jurisdiction and age policy confirmed",
      "no personalized staking instruction",
    ],
    id: "no-bet-responsible-gaming",
    internalBoundary: [
      "Do not give individualized staking instructions.",
      "Do not route a high-risk offer without state and age gates.",
      "Do not let sponsor copy influence the governor.",
    ],
    reasonCode: "responsible_gaming",
    title: "Responsible-Gaming Override",
    trigger: "The context requires responsible-gaming restraint or personalization is requested.",
    userFacingCopy:
      "GSE is passing because responsible-gaming discipline overrides the signal. The system does not personalize wagering advice.",
  },
];

export const PUBLIC_NO_BET_COPY_STRINGS: readonly string[] = PUBLIC_NO_BET_METHODOLOGY_EXAMPLES.flatMap(
  (example) => [
    example.title,
    example.trigger,
    example.userFacingCopy,
    ...example.allowedLanguage,
    ...example.internalBoundary,
    ...example.evidenceNeededToReopen,
  ],
);

export function publicNoBetExampleByReason(
  reasonCode: PublicNoBetReasonCode,
): PublicNoBetMethodologyExample | null {
  return PUBLIC_NO_BET_METHODOLOGY_EXAMPLES.find((example) => example.reasonCode === reasonCode) ?? null;
}

export function publicNoBetMethodologySummary(): string {
  return [
    "No bet is a governed decision, not an empty state.",
    "The governor can pass on a game when evidence, freshness, source rights, calibration, model agreement, or responsible-gaming boundaries are not ready.",
    "Public explanations show reason codes and review needs, not protected formula details.",
  ].join(" ");
}
