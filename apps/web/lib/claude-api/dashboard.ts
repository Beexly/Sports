import { db } from "@sports/db";
import {
  CLAUDE_API_SURFACES,
  evaluateClaudeBudgetUsage,
  type ClaudeApiSurface,
  type ClaudeBudgetStatus,
} from "@/lib/claude-api/cost-monitor";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import {
  getCurrentMonthClaudeSpendUsd,
  getUtcMonthWindow,
} from "@/lib/claude-api/usage-store";
import { getCreditPoolBreakdown } from "@/lib/claude-api/credit-pool-store";
import type { CreditPoolTotals } from "@/lib/claude-api/credit-pool";

export interface ClaudeApiCostSurfaceSummary {
  readonly surface: ClaudeApiSurface;
  readonly spentUsd: number;
  readonly budgetUsd: number;
  readonly ratio: number;
  readonly status: ClaudeBudgetStatus;
  readonly requestAllowed: boolean;
  readonly overrideActive: boolean;
  readonly callCount: number;
  readonly errorCount: number;
}

export interface ClaudeApiRecentError {
  readonly id: string;
  readonly surface: string;
  readonly modelName: string;
  readonly errorKind: string | null;
  readonly gameId: string | null;
  readonly templateKind: string | null;
  readonly observedAtIso: string;
}

export interface ClaudeApiCostsDashboard {
  readonly generatedAtIso: string;
  readonly monthStartIso: string;
  readonly monthEndIso: string;
  readonly surfaces: readonly ClaudeApiCostSurfaceSummary[];
  readonly totalSpentUsd: number;
  readonly totalBudgetUsd: number;
  readonly recentErrors: readonly ClaudeApiRecentError[];
  /**
   * Spend attributed to the credit pool that paid for it (Bedrock→AWS Activate,
   * Vertex→partner credit, direct→Anthropic/cash). Shows how much of each program's
   * credits we're actually burning. Empty until a provider is activated.
   */
  readonly creditPools: readonly CreditPoolTotals[];
}

export async function loadClaudeApiCostsDashboard(now = new Date()): Promise<ClaudeApiCostsDashboard> {
  const window = getUtcMonthWindow(now);
  const surfaces = await Promise.all(
    CLAUDE_API_SURFACES.map(async (surface) => {
      const [budget, spentUsd, callCount, errorCount] = await Promise.all([
        loadClaudeBudgetPolicy(surface, now),
        getCurrentMonthClaudeSpendUsd(surface, now),
        db.claudeApiCallRecord.count({
          where: { surface, observedAt: { gte: window.start, lt: window.end } },
        }),
        db.claudeApiCallRecord.count({
          where: { surface, success: false, observedAt: { gte: window.start, lt: window.end } },
        }),
      ]);
      const usage = evaluateClaudeBudgetUsage(surface, spentUsd, budget.policy);

      return {
        surface,
        spentUsd,
        budgetUsd: usage.budgetUsd,
        ratio: usage.ratio,
        status: usage.status,
        requestAllowed: budget.overrideActive ? true : usage.requestAllowed,
        overrideActive: budget.overrideActive,
        callCount,
        errorCount,
      };
    })
  );

  const [recentErrors, creditPools] = await Promise.all([
    db.claudeApiCallRecord.findMany({
      where: { success: false },
      orderBy: { observedAt: "desc" },
      take: 8,
      select: {
        id: true,
        surface: true,
        modelName: true,
        errorKind: true,
        gameId: true,
        templateKind: true,
        observedAt: true,
      },
    }),
    getCreditPoolBreakdown(now),
  ]);

  return {
    generatedAtIso: now.toISOString(),
    monthStartIso: window.start.toISOString(),
    monthEndIso: window.end.toISOString(),
    surfaces,
    totalSpentUsd: surfaces.reduce((sum, surface) => sum + surface.spentUsd, 0),
    totalBudgetUsd: surfaces.reduce((sum, surface) => sum + surface.budgetUsd, 0),
    recentErrors: recentErrors.map((error) => ({
      id: error.id,
      surface: error.surface,
      modelName: error.modelName,
      errorKind: error.errorKind,
      gameId: error.gameId,
      templateKind: error.templateKind,
      observedAtIso: error.observedAt.toISOString(),
    })),
    creditPools,
  };
}
