import { NextResponse } from "next/server";
import {
  CONTEXT_INTELLIGENCE_SOURCES,
  DATA_SOURCE_STACK,
  PUBLIC_DATA_SOURCES,
  TREND_BACKLOG,
  sourceCostLabel,
  sourceStatusLabel,
  type DataSourceCard,
  type SourceStatus,
} from "@/lib/data-sources/catalog";
import { loadSourceLiveEvidence } from "@/lib/data-sources/live-evidence";
import { providerStatuses, readinessSummary } from "@/lib/integrations/providers";

export const dynamic = "force-dynamic";

const STATUS_ORDER: readonly SourceStatus[] = [
  "wired",
  "adapter-ready",
  "scheduled-code",
  "manual-ingest",
  "founder-gated",
  "permission-required",
  "planned",
];

const COST_ORDER: readonly DataSourceCard["cost"][] = ["free", "low-cost", "paid-optional", "owned", "licensed"];

export async function GET(): Promise<NextResponse> {
  const liveEvidence = await loadSourceLiveEvidence();
  const providers = providerStatuses().map((provider) => ({
    key: provider.key,
    name: provider.name,
    category: provider.category,
    envVar: provider.envVar,
    configured: provider.configured,
    unlocks: provider.unlocks,
    note: provider.note,
  }));

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    data: {
      summary: {
        totalSources: DATA_SOURCE_STACK.length,
        publicSources: PUBLIC_DATA_SOURCES.length,
        contextSources: CONTEXT_INTELLIGENCE_SOURCES.length,
        providersConfigured: readinessSummary().configured,
        providersTotal: readinessSummary().total,
        byStatus: STATUS_ORDER.map((status) => ({
          status,
          label: sourceStatusLabel(status),
          count: DATA_SOURCE_STACK.filter((source) => source.status === status).length,
        })).filter((item) => item.count > 0),
        byCost: COST_ORDER.map((cost) => ({
          cost,
          label: sourceCostLabel(cost),
          count: DATA_SOURCE_STACK.filter((source) => source.cost === cost).length,
        })).filter((item) => item.count > 0),
      },
      sources: DATA_SOURCE_STACK,
      publicSources: PUBLIC_DATA_SOURCES,
      contextSources: CONTEXT_INTELLIGENCE_SOURCES,
      trendBacklog: TREND_BACKLOG,
      liveEvidence,
      providers,
      policy: {
        exposesSecretValues: false,
        permissionRequiredMeans: "Research-only until consent, API terms, or partnership exists.",
        rowCountsIncluded: liveEvidence.status !== "source-error",
        rowCountsDoNotMean: "Database writes, scoring inputs, or trend publication are active.",
      },
    },
  });
}
