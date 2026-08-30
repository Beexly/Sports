import type { RevenuePartnerCategory } from "./partner-types";

export interface OutreachAllocation {
  readonly category: RevenuePartnerCategory;
  readonly targetMessages: number;
  readonly purpose: string;
}

export const DEFAULT_DAILY_OUTREACH_PLAN: readonly OutreachAllocation[] = [
  { category: "creator_tool", purpose: "workflow and creator stack partners", targetMessages: 4 },
  { category: "sports_data", purpose: "data/API workflow partners", targetMessages: 2 },
  { category: "fantasy_tool", purpose: "player signal and fantasy audience partners", targetMessages: 1 },
  { category: "sports_cards", purpose: "collector education partners", targetMessages: 1 },
  { category: "local_sponsor", purpose: "founding local supporters", targetMessages: 1 },
  { category: "podcast_tool", purpose: "podcast or creator collaboration", targetMessages: 1 },
] as const;

export function dailyOutreachTarget(plan: readonly OutreachAllocation[] = DEFAULT_DAILY_OUTREACH_PLAN): number {
  return plan.reduce((sum, item) => sum + item.targetMessages, 0);
}
