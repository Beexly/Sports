/**
 * Cockpit Content Review API — /api/cockpit/content/[id]/review
 *
 * ADMIN-only. Appends an operator review (decision + notes) to a draft.
 *
 * Approval here only flips the draft's `status` to APPROVED and records a
 * `ContentReview` row. It NEVER:
 *   - sets `publishedAt`
 *   - posts to social media
 *   - sends emails
 *   - calls any external API
 *
 * If the live readiness verdict is not READY_FOR_REVIEW, approval is
 * refused. This keeps an approved-then-stale draft from being re-greenlit.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluateContentReadiness,
  type ContentDraftRecord,
  type ContentDraftType,
  type ContentReviewDecision,
  type ContentSourceRecord,
} from "@/lib/content-engine";

export const dynamic = "force-dynamic";

const VALID_DECISIONS: ReadonlySet<string> = new Set<ContentReviewDecision>([
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "ESCALATED",
  "INTERNAL_ONLY",
]);

interface ReviewBody {
  readonly decision?: string;
  readonly notes?: string;
}

function toStringArray(raw: unknown): readonly string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export async function POST(
  req: Request,
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
  const body = (await req.json().catch(() => ({}))) as ReviewBody;
  const decisionRaw = body.decision ?? "";
  if (!VALID_DECISIONS.has(decisionRaw)) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid-decision",
        validDecisions: Array.from(VALID_DECISIONS),
      },
      { status: 400 }
    );
  }
  const decision = decisionRaw as ContentReviewDecision;

  const client = db as unknown as {
    contentDraft?: {
      findUnique: (args: unknown) => Promise<unknown>;
      update: (args: unknown) => Promise<unknown>;
    };
    contentReview?: {
      create: (args: unknown) => Promise<unknown>;
    };
  };

  if (!client.contentDraft || !client.contentReview) {
    return NextResponse.json(
      {
        success: false,
        error: "model-not-generated",
        message:
          "ContentDraft model not yet generated. Run `npm run db:generate && npm run db:push`.",
      },
      { status: 503 }
    );
  }

  const draftRaw = await client.contentDraft
    .findUnique({
      where: { id: params.id },
      include: { sources: true },
    } as unknown as never)
    .catch(() => null);
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
    complianceStatus: r.complianceStatus as ContentDraftRecord["complianceStatus"],
    responsibleGamingIncluded: r.responsibleGamingIncluded,
    affiliateDisclosureIncluded: r.affiliateDisclosureIncluded,
    performanceGateStatus:
      r.performanceGateStatus as ContentDraftRecord["performanceGateStatus"],
    bannedPhraseScanClean: r.bannedPhraseScanClean,
    draftBody: r.draftBody,
    excerpt: r.excerpt,
    generatedBy: r.generatedBy,
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

  // APPROVED is conditionally allowed.
  if (decision === "APPROVED" && readiness.readiness !== "READY_FOR_REVIEW") {
    return NextResponse.json(
      {
        success: false,
        error: "draft-not-ready",
        readiness,
        message:
          "Draft cannot be approved while its live readiness verdict is not READY_FOR_REVIEW. Resolve blockers first.",
      },
      { status: 409 }
    );
  }

  const reviewerId = session.user.email ?? session.user.id ?? "admin:unknown";

  const nextStatus =
    decision === "APPROVED"
      ? "APPROVED"
      : decision === "REJECTED"
        ? "REJECTED"
        : decision === "CHANGES_REQUESTED"
          ? "NEEDS_REVIEW"
          : decision === "ESCALATED"
            ? "NEEDS_COMPLIANCE"
            : "DRAFT";

  await client.contentDraft.update({
    where: { id: params.id },
    data: {
      status: nextStatus,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      // publishedAt is INTENTIONALLY never touched here.
    },
  } as unknown as never);

  const review = await client.contentReview.create({
    data: {
      draftId: params.id,
      reviewer: reviewerId,
      decision,
      notes: body.notes ?? null,
    },
  } as unknown as never);

  return NextResponse.json({
    success: true,
    data: { review, nextStatus, readiness },
    policy: {
      autoPublishEnabled: false,
      note: "Approval is an internal sign-off. No publish, no send, no post.",
    },
  });
}
