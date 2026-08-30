/**
 * Cockpit Content API — /api/cockpit/content
 *
 * ADMIN-only. Lists every `ContentDraft` along with its live readiness
 * verdict. Pure read; this endpoint does not create, update, publish, or
 * archive drafts. The cockpit UI drives mutations via dedicated routes.
 *
 * Non-negotiables:
 *   - No publish path on this surface.
 *   - The live readiness verdict is recomputed on every read so a stale
 *     `ContentDraft.status` never silently re-greenlights an approved
 *     draft whose evidence has aged out.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluateContentReadiness,
  type ContentDraftRecord,
  type ContentDraftType,
  type ContentSourceRecord,
} from "@/lib/content-engine";

export const dynamic = "force-dynamic";

interface DraftListRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly contentType: ContentDraftType;
  readonly status: string;
  readonly visibility: string;
  readonly sourceCoverageStatus: string;
  readonly complianceStatus: string;
  readonly responsibleGamingIncluded: boolean;
  readonly affiliateDisclosureIncluded: boolean;
  readonly performanceGateStatus: string;
  readonly bannedPhraseScanClean: boolean;
  readonly readiness: ReturnType<typeof evaluateContentReadiness>;
  readonly nextRecommendedAction: string;
}

function toStringArray(raw: unknown): readonly string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  return [];
}

async function safeFindDrafts() {
  const client = db as unknown as {
    contentDraft?: {
      findMany: (args: unknown) => Promise<unknown[]>;
    };
  };
  if (!client.contentDraft) return [];
  try {
    return await client.contentDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { sources: true },
    } as unknown as never);
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const gates = getReadinessGates();
  const rows = await safeFindDrafts();

  const drafts: DraftListRow[] = rows.map((raw) => {
    const r = raw as {
      id: string;
      slug: string;
      title: string;
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
      sources: Array<{
        sourceType: ContentSourceRecord["sourceType"];
        sourceLabel: string;
        sourceUrl: string | null;
        sourceStatus: ContentSourceRecord["sourceStatus"];
        trustLevel: ContentSourceRecord["trustLevel"];
        fetchedAt: Date | null;
        notes: string | null;
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
      generatedBy: "api",
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
    const readiness = evaluateContentReadiness({
      draft: record,
      performanceGateOn: gates.canExposePerformanceStats,
    });

    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      contentType: r.contentType,
      status: r.status,
      visibility: r.visibility,
      sourceCoverageStatus: r.sourceCoverageStatus,
      complianceStatus: r.complianceStatus,
      responsibleGamingIncluded: r.responsibleGamingIncluded,
      affiliateDisclosureIncluded: r.affiliateDisclosureIncluded,
      performanceGateStatus: r.performanceGateStatus,
      bannedPhraseScanClean: r.bannedPhraseScanClean,
      readiness,
      nextRecommendedAction: readiness.nextRecommendedAction,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      performanceGateOn: gates.canExposePerformanceStats,
      draftCount: drafts.length,
      drafts,
    },
    // Explicit policy signal so any consumer can assert that this surface
    // is draft-only.
    policy: {
      autoPublishEnabled: false,
      note: "Drafts only. There is no auto-publish path. Approval here is an internal sign-off.",
    },
  });
}

/**
 * Block any mutation method that an unaware client might try. The cockpit
 * uses the per-id endpoints for mutations.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "auto-publish-disabled",
      message:
        "There is no auto-publish or auto-create endpoint here. Create drafts via the engine builders + seed, then route review via /api/cockpit/content/[id]/review.",
    },
    { status: 405 }
  );
}
