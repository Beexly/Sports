import { z } from "zod";

export const FABLE_LABEL_TASK_TYPES = [
  "outcome_review",
  "injury_status_review",
  "source_rights_review",
  "feature_quality_review",
] as const;

export const LabelingManifestItemSchema = z.object({
  candidate_id: z.string().min(1),
  task_type: z.enum(FABLE_LABEL_TASK_TYPES),
  source_id: z.string().min(1),
  prompt: z.string().min(1),
  priority: z.number().int().min(1).max(5),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});

export const LabelingManifestSchema = z.object({
  schema_version: z.literal("fable-labeling-v1"),
  provider: z.literal("local"),
  priced: z.literal(false),
  generated_at: z.string().datetime(),
  items: z.array(LabelingManifestItemSchema),
  notes: z.string(),
});

export type LabelingManifestItem = z.infer<typeof LabelingManifestItemSchema>;
export type LabelingManifest = z.infer<typeof LabelingManifestSchema>;

export type LabelingCostInput = {
  readonly itemCount: number;
  readonly humanMinutesPerItem: number;
  readonly reviewerHourlyRateUsd: number;
  readonly qaReviewRate: number;
};

export type LabelingCostEstimate = {
  readonly itemCount: number;
  readonly reviewedItemCount: number;
  readonly laborHours: number;
  readonly qaLaborHours: number;
  readonly estimatedCostUsd: number;
  readonly priced: false;
  readonly note: string;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function createLabelingManifest(
  items: readonly LabelingManifestItem[],
  now = new Date()
): LabelingManifest {
  return LabelingManifestSchema.parse({
    generated_at: now.toISOString(),
    items,
    notes:
      "Local labeling manifest only. It does not create AWS Ground Truth jobs or paid labeling work.",
    priced: false,
    provider: "local",
    schema_version: "fable-labeling-v1",
  });
}

export function simulateLabelingCost(input: LabelingCostInput): LabelingCostEstimate {
  const itemCount = Math.floor(nonNegative(input.itemCount));
  const humanMinutesPerItem = nonNegative(input.humanMinutesPerItem);
  const reviewerHourlyRateUsd = nonNegative(input.reviewerHourlyRateUsd);
  const qaReviewRate = Math.min(1, nonNegative(input.qaReviewRate));
  const laborHours = (itemCount * humanMinutesPerItem) / 60;
  const reviewedItemCount = Math.ceil(itemCount * qaReviewRate);
  const qaLaborHours = (reviewedItemCount * humanMinutesPerItem) / 60;
  const estimatedCostUsd = (laborHours + qaLaborHours) * reviewerHourlyRateUsd;

  return {
    estimatedCostUsd: roundMoney(estimatedCostUsd),
    itemCount,
    laborHours: roundMoney(laborHours),
    note:
      "Simulation only. No AWS account, paid labeling provider, or Ground Truth job is configured.",
    priced: false,
    qaLaborHours: roundMoney(qaLaborHours),
    reviewedItemCount,
  };
}
