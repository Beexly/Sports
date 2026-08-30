import { z } from "zod";
import { WELL_ARCHITECTED_PILLARS, type WellArchitectedPillar } from "./aws-local-fixtures";

export const SHADOW_CONTROL_TYPES = ["preventive", "detective", "proactive"] as const;

const ShadowControlTypeSchema = z.enum(SHADOW_CONTROL_TYPES);
const PillarSchema = z.enum(WELL_ARCHITECTED_PILLARS);

const GuardrailSchema = z.object({
  guardrail_id: z.string().min(1),
  name: z.string().min(1),
  control_type: ShadowControlTypeSchema,
  pillar: PillarSchema,
  mapped_aws_concepts: z.array(z.string().min(1)).min(1),
  fable_gate: z.string().min(1),
  default_effect: z.enum(["block", "flag", "require_owner_approval"]),
  local_evaluator: z.string().min(1),
  zero_cost: z.literal(true),
});

const SelfExplainingAgentSchema = z.object({
  agent_id: z.string().min(1),
  purpose: z.string().min(1),
  self_explanation: z.string().min(1),
  allowed_tools: z.array(z.string().min(1)).min(1),
  refused_actions: z.array(z.string().min(1)).min(1),
  evidence_output_required: z.boolean(),
});

const DriftCardSchema = z.object({
  card_id: z.string().min(1),
  model_surface: z.string().min(1),
  drift_signal: z.string().min(1),
  local_metric: z.string().min(1),
  aws_mapping: z.string().min(1),
  blocked_until: z.string().min(1),
});

const CleanRoomsScenarioSchema = z.object({
  scenario_id: z.string().min(1),
  synthetic_parties: z.array(z.string().min(1)).min(2),
  allowed_output: z.string().min(1),
  disallowed_output: z.string().min(1),
  minimum_aggregation_rule: z.string().min(1),
});

const CdkFixtureSchema = z.object({
  fixture_id: z.string().min(1),
  synth_only: z.literal(true),
  deploy_allowed: z.literal(false),
  stack_shape: z.string().min(1),
  fixture_path: z.string().min(1),
});

export const ShadowControlTowerBlueprintSchema = z.object({
  schema_version: z.literal("fable-shadow-control-tower-v1"),
  generated_at: z.string().datetime(),
  scope_note: z.string().min(1),
  live_aws_action: z.literal(false),
  paid_resource_used: z.literal(false),
  landing_zone: z.string().min(1),
  organizational_units: z.array(z.string().min(1)).min(1),
  guard_rule_files: z.array(z.string().min(1)).min(1),
  guardrails: z.array(GuardrailSchema).min(WELL_ARCHITECTED_PILLARS.length),
  bedrock_agentcore_agents: z.array(SelfExplainingAgentSchema).min(1),
  sagemaker_drift_cards: z.array(DriftCardSchema).min(1),
  clean_rooms_nfl_scenarios: z.array(CleanRoomsScenarioSchema).min(1),
  cdk_iac_fixtures: z.array(CdkFixtureSchema).min(1),
});

export type ShadowControlType = (typeof SHADOW_CONTROL_TYPES)[number];
export type ShadowControlTowerBlueprint = z.infer<typeof ShadowControlTowerBlueprintSchema>;

export type WellArchitectedLensCheck = {
  readonly pillar: WellArchitectedPillar;
  readonly guardrailIds: readonly string[];
  readonly generatedCheck: string;
};

export type ShadowControlTowerEvaluation = {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly guardrailCount: number;
  readonly controlTypeCounts: Record<ShadowControlType, number>;
  readonly pillarChecks: readonly WellArchitectedLensCheck[];
};

function emptyControlTypeCounts(): Record<ShadowControlType, number> {
  return {
    detective: 0,
    preventive: 0,
    proactive: 0,
  };
}

export function generateWellArchitectedLensChecks(
  blueprint: ShadowControlTowerBlueprint
): readonly WellArchitectedLensCheck[] {
  return WELL_ARCHITECTED_PILLARS.map((pillar) => {
    const guardrailIds = blueprint.guardrails
      .filter((guardrail) => guardrail.pillar === pillar)
      .map((guardrail) => guardrail.guardrail_id);

    return {
      generatedCheck: `Require at least one local Shadow Control Tower guardrail for ${pillar}.`,
      guardrailIds,
      pillar,
    };
  });
}

export function evaluateShadowControlTowerBlueprint(raw: unknown): ShadowControlTowerEvaluation {
  const parsed = ShadowControlTowerBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      controlTypeCounts: emptyControlTypeCounts(),
      guardrailCount: 0,
      issues: [`schema: ${parsed.error.message}`],
      ok: false,
      pillarChecks: [],
    };
  }

  const issues: string[] = [];
  const controlTypeCounts = emptyControlTypeCounts();

  for (const guardrail of parsed.data.guardrails) {
    controlTypeCounts[guardrail.control_type] += 1;
  }

  for (const controlType of SHADOW_CONTROL_TYPES) {
    if (controlTypeCounts[controlType] === 0) {
      issues.push(`missing Shadow Control Tower control type: ${controlType}`);
    }
  }

  const pillarChecks = generateWellArchitectedLensChecks(parsed.data);
  for (const check of pillarChecks) {
    if (check.guardrailIds.length === 0) {
      issues.push(`missing Well-Architected pillar guardrail: ${check.pillar}`);
    }
  }

  if (parsed.data.bedrock_agentcore_agents.some((agent) => agent.evidence_output_required === false)) {
    issues.push("all Bedrock/AgentCore mock agents must require evidence output");
  }

  return {
    controlTypeCounts,
    guardrailCount: parsed.data.guardrails.length,
    issues,
    ok: issues.length === 0,
    pillarChecks,
  };
}
