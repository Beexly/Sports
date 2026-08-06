/**
 * Executable documentation for Jynx cloudAttemptOrder + model-map shape.
 * Import in tests or REPL — no secrets; fixtures only.
 *
 * @see docs/ops/JYNX_FAILOVER_AND_MODEL_MAPS.md
 * @see docs/ops/JYNX_VS_AI_GATEWAYS.md
 */
import { cloudAttemptOrder, planJynx, parseCloudOrder } from "./jynx";

/** Minimal Bedrock-shaped env for examples (not real credentials). */
export const EXAMPLE_BEDROCK_ENV = {
  AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "secretExample",
  AWS_BEDROCK_REGION: "us-east-1",
  BEDROCK_MODEL_MAP: JSON.stringify({
    "claude-sonnet-4-6": "anthropic.claude-sonnet-4-6-example-v1:0",
    "claude-haiku-4-5-20251001": "anthropic.claude-haiku-example-v1:0",
    "claude-opus-4-8": "anthropic.claude-opus-example-v1:0",
  }),
} as const;

/** Minimal Azure Foundry-shaped env for examples. */
export const EXAMPLE_AZURE_ENV = {
  AZURE_FOUNDRY_RESOURCE: "gse-foundry",
  AZURE_FOUNDRY_API_KEY: "az-example-key",
  AZURE_FOUNDRY_MODEL_MAP: JSON.stringify({
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001": "claude-haiku-4-5",
    "claude-opus-4-8": "claude-opus-4-8",
  }),
} as const;

/**
 * Code examples for cloudAttemptOrder — mirrors docs; used by unit tests
 * so examples cannot drift from behavior.
 */
export function exampleCloudAttemptOrderCases(): readonly {
  readonly name: string;
  readonly env: Record<string, string | undefined>;
  readonly expected: readonly string[];
}[] {
  return [
    {
      name: "auto with bedrock+azure → preference order",
      env: {
        CLAUDE_PROVIDER: "auto",
        ...EXAMPLE_BEDROCK_ENV,
        ...EXAMPLE_AZURE_ENV,
      },
      expected: ["bedrock", "azure"],
    },
    {
      name: "forced azure with failover → azure then bedrock",
      env: {
        CLAUDE_PROVIDER: "azure",
        JYNX_CLOUD_FAILOVER: "true",
        ...EXAMPLE_BEDROCK_ENV,
        ...EXAMPLE_AZURE_ENV,
      },
      expected: ["azure", "bedrock"],
    },
    {
      name: "forced azure failover off → azure only",
      env: {
        CLAUDE_PROVIDER: "azure",
        JYNX_CLOUD_FAILOVER: "false",
        ...EXAMPLE_BEDROCK_ENV,
        ...EXAMPLE_AZURE_ENV,
      },
      expected: ["azure"],
    },
    {
      name: "inert anthropic mode → empty (cash path)",
      env: {
        ...EXAMPLE_BEDROCK_ENV,
      },
      expected: [],
    },
    {
      name: "custom order azure first",
      env: {
        CLAUDE_PROVIDER: "auto",
        JYNX_CLOUD_ORDER: "azure,bedrock,vertex",
        ...EXAMPLE_BEDROCK_ENV,
        ...EXAMPLE_AZURE_ENV,
      },
      expected: ["azure", "bedrock"],
    },
  ];
}

/** Run all examples; returns name → actual order (for docs/debug). */
export function runCloudAttemptOrderExamples(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  for (const c of exampleCloudAttemptOrderCases()) {
    out[c.name] = cloudAttemptOrder(c.env);
  }
  return out;
}

/** Content free-lane plan example (primaryLane cerebras when enabled). */
export function exampleContentFreeLanePlan() {
  return planJynx(
    { surface: "content" },
    {
      CONTENT_FREE_LANE_ENABLED: "true",
      CEREBRAS_API_KEY: "cb-example",
      CLAUDE_PROVIDER: "auto",
      ...EXAMPLE_BEDROCK_ENV,
    },
  );
}

export function exampleDefaultCloudOrder(): readonly string[] {
  return parseCloudOrder({});
}
