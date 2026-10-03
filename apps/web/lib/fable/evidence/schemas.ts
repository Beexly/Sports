import { z } from "zod";

export const CLAIM_TYPES = [
  "legal/data-source claim",
  "model-performance claim",
  "AWS capability claim",
  "AWS cost claim",
  "AWS security claim",
  "NFL metric derivation claim",
  "calibration claim",
  "drift/bias claim",
  "active learning claim",
  "labeling/Ground Truth claim",
  "MC Dropout/uncertainty claim",
  "production-readiness claim",
  "GitHub visibility claim",
  "competitive edge claim",
] as const;

export const CLAIM_STATUSES = [
  "proven",
  "partially proven",
  "unsupported",
  "false",
  "blocked",
  "needs legal review",
  "needs owner decision",
] as const;

const RiskSchema = z.enum(["none", "low", "medium", "high", "unknown"]);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ClaimEvidenceEntrySchema = z.object({
  claim_id: z.string().min(1),
  exact_claim_text: z.string().min(1),
  source_file_or_prompt_section: z.string().min(1),
  claim_type: z.enum(CLAIM_TYPES),
  status: z.enum(CLAIM_STATUSES),
  evidence_files: z.array(z.string().min(1)),
  evidence_line_or_test_path: z.string().min(1),
  command_proving_it: z.string().min(1),
  test_result: z.string().min(1),
  data_source_used: z.string().min(1),
  legal_source_risk: RiskSchema,
  cost_risk: RiskSchema,
  security_risk: RiskSchema,
  owner_decision_needed: z.boolean(),
  legal_review_marker: z.string().min(1).optional(),
  next_action: z.string().min(1),
});

export const ClaimEvidenceLedgerSchema = z.object({
  schema_version: z.literal("fable-claim-evidence-ledger-v1"),
  generated_at: z.string().datetime(),
  scope_note: z.string().min(1),
  claims: z.array(ClaimEvidenceEntrySchema).min(1),
});

export const EdgeExperimentEntrySchema = z.object({
  candidate_id: z.string().min(1),
  hypothesis: z.string().min(1),
  source_type: z.string().min(1),
  legal_tos_risk: RiskSchema,
  cost_to_test_usd: z.number().min(0),
  metric_affected: z.string().min(1),
  expected_improvement: z.string().min(1),
  minimum_detectable_effect: z.string().min(1),
  sample_size_needed: z.string().min(1),
  overfit_risk: RiskSchema,
  measurement_method: z.string().min(1),
  falsification_rule: z.string().min(1),
  decision: z.enum(["test", "hold", "reject", "needs data", "needs legal review"]),
});

export const AwsGateConfigSchema = z.object({
  FABLE_AWS_ALLOW_EXPERIMENTS: z.literal("false"),
  FABLE_AWS_ALLOW_DEPLOY: z.literal("false"),
  FABLE_AWS_ALLOW_PAID_RESOURCES: z.literal("false"),
  FABLE_AWS_MAX_MONTHLY_COST_USD: z.literal("0"),
});

export const AwsDecisionEngineEvaluationSchema = z.object({
  actionTier: z.enum([
    "tier0_local_only",
    "tier1_local_validation",
    "tier2_read_only_discovery",
    "tier3_reversible_change",
    "tier4_cost_impacting_change",
    "tier5_destructive_production_security",
  ]),
  blastRadius: z.enum(["low", "medium", "high", "critical"]),
  costRisk: z.enum(["low", "medium", "high", "critical"]),
  iamRisk: z.enum(["low", "medium", "high", "critical"]),
  dataRightsRisk: z.enum(["low", "medium", "high", "critical"]),
  productionRisk: z.enum(["low", "medium", "high", "critical"]),
  reversibility: z.enum(["easy", "planned", "hard", "destructive"]),
  approvalRequired: z.boolean(),
  allowed: z.boolean(),
  allowedByDefault: z.boolean(),
  requiredDryRunCommand: z.boolean(),
  requiredRollbackField: z.boolean(),
  requiredOwnerDecision: z.boolean(),
  blockers: z.array(z.string()),
});

export const PERSONAL_LEARNING_COMPLETION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "verified_public",
] as const;

export const PERSONAL_LEARNING_PROOF_TYPES = [
  "course_name_only",
  "learning_summary",
  "approved_screenshot_path",
  "public_badge_url",
  "not_yet_public",
] as const;

export const PersonalLearningEvidenceEntrySchema = z.object({
  learning_provider: z.string().min(1),
  course_or_badge_name: z.string().min(1),
  completion_status: z.enum(PERSONAL_LEARNING_COMPLETION_STATUSES),
  date_completed: IsoDateSchema.nullable(),
  proof_type: z.enum(PERSONAL_LEARNING_PROOF_TYPES),
  proof_link_or_path: z.string().min(1),
  public_safe: z.boolean(),
  gse_relevance: z.string().min(1),
  repo_action: z.string().min(1),
  no_secrets_confirmed: z.boolean(),
  no_paid_resource_confirmed: z.boolean(),
  owner_approved_for_public_use: z.boolean(),
});

export const PersonalLearningEvidenceLedgerSchema = z.object({
  schema_version: z.literal("fable-personal-learning-evidence-v1"),
  generated_at: z.string().datetime(),
  scope_note: z.string().min(1),
  evidence: z.array(PersonalLearningEvidenceEntrySchema).min(1),
});

export const ForensicReportInputSchema = z.object({
  fixture_id: z.string().min(1),
  source_id: z.string().min(1),
  source_freshness: z.string().min(1),
  market_open_probability: z.number().min(0).max(1),
  current_model_probability: z.number().min(0).max(1),
  event_timestamp: z.string().datetime(),
  features: z.array(z.object({ name: z.string().min(1), value: z.string().min(1) })).min(1),
});

export const ForensicReportOutputSchema = z.object({
  fixture_id: z.string().min(1),
  probability_delta: z.number(),
  uncertainty_flag: z.boolean(),
  gse_flags: z.array(z.string().min(1)),
  would_not_claim: z.array(z.string().min(1)),
});

export type ClaimEvidenceLedger = z.infer<typeof ClaimEvidenceLedgerSchema>;
export type ClaimEvidenceEntry = z.infer<typeof ClaimEvidenceEntrySchema>;
export type ForensicReportOutput = z.infer<typeof ForensicReportOutputSchema>;
export type PersonalLearningEvidenceLedger = z.infer<typeof PersonalLearningEvidenceLedgerSchema>;
