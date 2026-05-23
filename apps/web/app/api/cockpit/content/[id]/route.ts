/**
 * Cockpit Content API — /api/cockpit/content/[id]
 *
 * ADMIN-only. Returns a single draft with its sources and live readiness
 * verdict. Read-only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluateContentReadiness,
  formatDraftForReview,
  type ContentDraftRecord,
  type ContentDraftType,
  type ContentSourceRecord,
} from "@/lib/content-engine";

export const dynamic = "force-dynamic";

function toStringArray(raw: unknown): readonly string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  return [];
}

async function safeFindDraft(id: string) {
  const client = db as unknown as {
    contentDraft?: {
      findUnique: (args: unknown) => Promise<unknown>;
    };
  };
  if (!client.contentDraft) return null;
  try {
    return await client.contentDraft.findUnique({
      where: { id },
      include: { sources: true, reviews: true },
    } as unknown as never);
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const params = await context.params;
  const draftRaw = await safeFindDraft(params.id);
  if (!draftRaw) {
    return NextResponse.json(
      { success: false, error: "not-found" },
      { status: 404 }
    );
  }

  const r = draftRaw as {
    id: string;
    title: string;
    slug: string;
    contentType: ContentDraftType;
    status: string;
    visibility: string;
    sourceCoverageStatus: string;
    complianceStatus: string;
    responsibleGamingIncluded: boolean;
    affiliateDisclosureIncluded: boolean;
    performanceGateStatus: string;
    bannedPhraseScanClean: boolean;
    draftBody: string;
    excerpt: string | null;
    relatedPickIds: unknown;
    relatedPromotionIds: unknown;
    relatedBriefIds: unknown;
    generatedBy: string;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    publishedAt: Date | null;
    sources: Array<{
      sourceType: ContentSourceRecord["sourceType"];
      sourceLabel: string;
      sourceUrl: string | null;
      sourceStatus: ContentSourceRecord["sourceStatus"];
      trustLevel: ContentSourceRecord["trustLevel"];
      fetchedAt: Date | null;
      notes: string | null;
    }>;
    reviews: Array<{
      id: string;
      reviewer: string;
      decision: string;
      notes: string | null;
      createdAt: Date;
    }>;
  };

  const record: ContentDraftRecord = {
    id: r.id,
    title: r.title,
    slug: r.slug,
    contentType: r.contentType,
    status: r.status as ContentDraftRecord["status"],
    visibility: r.visibility as ContentDraftRecord["visibility"],
    relatedPickIds: toStringArray(r.relatedPickIds),
    relatedPromotionIds: toStringArray(r.relatedPromotionIds),
    relatedBriefIds: toStringArray(r.relatedBriefIds),
    sourceCoverageStatus:
      r.sourceCoverageStatus as ContentDraftRecord["sourceCoverageStatus"],
    complianceStatus:
      r.complianceStatus as ContentDraftRecord["complianceStatus"],
    responsibleGamingIncluded: r.responsibleGamingIncluded,
    affiliateDisclosureIncluded: r.affiliateDisclosureIncluded,
    performanceGateStatus:
      r.performanceGateStatus as ContentDraftRecord["performanceGateStatus"],
    bannedPhraseScanClean: r.bannedPhraseScanClean,
    draftBody: r.draftBody,
    excerpt: r.excerpt,
    generatedBy: r.generatedBy,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt,
    publishedAt: r.publishedAt,
    sources: r.sources.map((s) => ({
      sourceType: s.sourceType,
      sourceLabel: s.sourceLabel,
      sourceUrl: s.sourceUrl,
      sourceStatus: s.sourceStatus,
      trustLevel: s.trustLevel,
      fetchedAt: s.fetchedAt,
      notes: s.notes,
    })),
  };

  const gates = getReadinessGates();
  const readiness = evaluateContentReadiness({
    draft: record,
    performanceGateOn: gates.canExposePerformanceStats,
  });

  return NextResponse.json({
    success: true,
    data: {
      draft: record,
      readiness,
      formatted: formatDraftForReview(record, readiness),
      reviews: r.reviews,
    },
    policy: {
      autoPublishEnabled: false,
      note: "Drafts only. Read-only endpoint.",
    },
  });
}
