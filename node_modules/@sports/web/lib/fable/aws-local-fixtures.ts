import { z } from "zod";

export const WELL_ARCHITECTED_PILLARS = [
  "operational_excellence",
  "security",
  "reliability",
  "performance_efficiency",
  "cost_optimization",
  "sustainability",
] as const;

export const AWS_LOCAL_FIXTURE_TYPES = [
  "s3_storage_policy_mock",
  "iam_policy_review_cases",
  "sagemaker_model_card_fixture",
  "bedrock_agentcore_refusal_cases",
  "clean_rooms_synthetic_scenarios",
] as const;

const WellArchitectedPillarSchema = z.enum(WELL_ARCHITECTED_PILLARS);
const AwsLocalFixtureTypeSchema = z.enum(AWS_LOCAL_FIXTURE_TYPES);

const AwsLocalFixtureCheckSchema = z.object({
  check_id: z.string().min(1),
  pillar: WellArchitectedPillarSchema,
  expectation: z.string().min(1),
  pass_condition: z.string().min(1),
});

const AwsLocalFixtureSchema = z.object({
  fixture_id: z.string().min(1),
  fixture_type: AwsLocalFixtureTypeSchema,
  title: z.string().min(1),
  aws_services: z.array(z.string().min(1)).min(1),
  learning_inputs: z.array(z.string().min(1)).min(1),
  well_architected_pillars: z.array(WellArchitectedPillarSchema).min(1),
  live_aws_action: z.literal(false),
  paid_resource_used: z.literal(false),
  owner_approval_required: z.literal(true),
  boundary: z.string().min(1),
  success_metrics: z.array(z.string().min(1)).min(1),
  checks: z.array(AwsLocalFixtureCheckSchema).min(1),
  mock_artifacts: z.array(z.string().min(1)).min(1),
});

export const AwsLocalFixtureLibrarySchema = z.object({
  schema_version: z.literal("fable-aws-local-fixture-library-v1"),
  generated_at: z.string().datetime(),
  scope_note: z.string().min(1),
  fixtures: z.array(AwsLocalFixtureSchema).min(AWS_LOCAL_FIXTURE_TYPES.length),
});

export type WellArchitectedPillar = (typeof WELL_ARCHITECTED_PILLARS)[number];
export type AwsLocalFixtureType = (typeof AWS_LOCAL_FIXTURE_TYPES)[number];
export type AwsLocalFixtureLibrary = z.infer<typeof AwsLocalFixtureLibrarySchema>;

export type AwsLocalFixtureValidationReport = {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly fixtureCount: number;
  readonly pillarCoverage: Record<WellArchitectedPillar, boolean>;
};

function emptyPillarCoverage(): Record<WellArchitectedPillar, boolean> {
  return {
    cost_optimization: false,
    operational_excellence: false,
    performance_efficiency: false,
    reliability: false,
    security: false,
    sustainability: false,
  };
}

export function validateAwsLocalFixtureLibrary(raw: unknown): AwsLocalFixtureValidationReport {
  const parsed = AwsLocalFixtureLibrarySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fixtureCount: 0,
      issues: [`schema: ${parsed.error.message}`],
      ok: false,
      pillarCoverage: emptyPillarCoverage(),
    };
  }

  const issues: string[] = [];
  const fixtureTypes = new Set<AwsLocalFixtureType>();
  const pillarCoverage = emptyPillarCoverage();

  for (const fixture of parsed.data.fixtures) {
    fixtureTypes.add(fixture.fixture_type);
    for (const pillar of fixture.well_architected_pillars) {
      pillarCoverage[pillar] = true;
    }
    for (const check of fixture.checks) {
      pillarCoverage[check.pillar] = true;
    }

    if (
      fixture.success_metrics.some((metric) =>
        /paid resource works|paid resource succeeds|deploy succeeds|live aws action succeeds/i.test(metric)
      )
    ) {
      issues.push(`${fixture.fixture_id}: success metrics must stay local and no-cost.`);
    }
  }

  for (const fixtureType of AWS_LOCAL_FIXTURE_TYPES) {
    if (!fixtureTypes.has(fixtureType)) {
      issues.push(`missing fixture type: ${fixtureType}`);
    }
  }

  for (const pillar of WELL_ARCHITECTED_PILLARS) {
    if (!pillarCoverage[pillar]) {
      issues.push(`missing Well-Architected pillar coverage: ${pillar}`);
    }
  }

  return {
    fixtureCount: parsed.data.fixtures.length,
    issues,
    ok: issues.length === 0,
    pillarCoverage,
  };
}
