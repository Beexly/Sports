import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  CONTENT_POLICIES,
  listContentKinds,
} from "@/lib/content/workflow";
import {
  evaluateContentReadiness,
  formatDraftForReview,
  listTemplates,
  type ContentDraftRecord,
  type ContentDraftType,
  type ContentSourceRecord,
} from "@/lib/content-engine";

/**
 * Cockpit · Content workflow (Phase 8 — Draft-Only Content Engine).
 *
 * No part of this surface publishes externally, posts to social, or sends
 * user communications. The cockpit shows BOTH the persisted
 * ContentDraft.status and the LIVE readiness verdict so a stale APPROVED
 * status never silently re-greenlights an aged-out draft.
 *
 * There is no auto-publish path from this surface. Approval is an
 * internal sign-off; surfacing a draft on the public blog still requires
 * a deliberate, audited operator action outside the cockpit.
 */

export const dynamic = "force-dynamic";

function toStringArray(raw: unknown): readonly string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string");
  }
  return [];
}

interface DraftRow {
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
  readonly verdict: ReturnType<typeof evaluateContentReadiness>;
  readonly formatted: ReturnType<typeof formatDraftForReview>;
}

async function loadDrafts(perfGateOn: boolean): Promise<readonly DraftRow[]> {
  const client = db as unknown as {
    contentDraft?: { findMany: (args: unknown) => Promise<unknown[]> };
  };
  if (!client.contentDraft) return [];
  let raws: unknown[];
  try {
    raws = await client.contentDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { sources: true },
    } as unknown as never);
  } catch {
    return [];
  }
  return raws.map((raw) => {
    const r = raw as {
      id: string; slug: string; title: string; contentType: ContentDraftType;
      status: string; visibility: string; sourceCoverageStatus: string;
      complianceStatus: string; responsibleGamingIncluded: boolean;
      affiliateDisclosureIncluded: boolean; performanceGateStatus: string;
      bannedPhraseScanClean: boolean; draftBody: string; excerpt: string | null;
      relatedPickIds: unknown; relatedPromotionIds: unknown; relatedBriefIds: unknown;
      sources: Array<{
        sourceType: ContentSourceRecord["sourceType"]; sourceLabel: string;
        sourceUrl: string | null; sourceStatus: ContentSourceRecord["sourceStatus"];
        trustLevel: ContentSourceRecord["trustLevel"]; fetchedAt: Date | null;
        notes: string | null;
      }>;
    };
    const record: ContentDraftRecord = {
      id: r.id, title: r.title, slug: r.slug, contentType: r.contentType,
      status: r.status as ContentDraftRecord["status"],
      visibility: r.visibility as ContentDraftRecord["visibility"],
      relatedPickIds: toStringArray(r.relatedPickIds),
      relatedPromotionIds: toStringArray(r.relatedPromotionIds),
      relatedBriefIds: toStringArray(r.relatedBriefIds),
      sourceCoverageStatus: r.sourceCoverageStatus as ContentDraftRecord["sourceCoverageStatus"],
      complianceStatus: r.complianceStatus as ContentDraftRecord["complianceStatus"],
      responsibleGamingIncluded: r.responsibleGamingIncluded,
      affiliateDisclosureIncluded: r.affiliateDisclosureIncluded,
      performanceGateStatus: r.performanceGateStatus as ContentDraftRecord["performanceGateStatus"],
      bannedPhraseScanClean: r.bannedPhraseScanClean,
      draftBody: r.draftBody, excerpt: r.excerpt, generatedBy: "seed",
      sources: r.sources.map((s) => ({
        sourceType: s.sourceType, sourceLabel: s.sourceLabel, sourceUrl: s.sourceUrl,
        sourceStatus: s.sourceStatus, trustLevel: s.trustLevel,
        fetchedAt: s.fetchedAt, notes: s.notes,
      })),
    };
    const verdict = evaluateContentReadiness({ draft: record, performanceGateOn: perfGateOn });
    return {
      id: r.id, slug: r.slug, title: r.title, contentType: r.contentType,
      status: r.status, visibility: r.visibility,
      sourceCoverageStatus: r.sourceCoverageStatus,
      complianceStatus: r.complianceStatus,
      responsibleGamingIncluded: r.responsibleGamingIncluded,
      affiliateDisclosureIncluded: r.affiliateDisclosureIncluded,
      performanceGateStatus: r.performanceGateStatus,
      verdict, formatted: formatDraftForReview(record, verdict),
    };
  });
}

async function loadLegacyMedia() {
  try {
    return await db.cockpitMediaItem.findMany({ orderBy: { updatedAt: "desc" }, take: 25 });
  } catch {
    return [];
  }
}

export default async function CockpitContentPage() {
  const gates = getReadinessGates();
  const [drafts, legacy] = await Promise.all([
    loadDrafts(gates.canExposePerformanceStats),
    loadLegacyMedia(),
  ]);
  const templates = listTemplates();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-plasma">
          Ava · Content workflow
        </p>
        <h1 className="text-2xl font-bold text-ion-white">Content drafts</h1>
        <p className="mt-1 text-sm text-ion-3">
          Drafts only. No part of this surface publishes externally, posts
          to social, or sends user communications.
        </p>
      </header>

      <section data-testid="content-draft-queue" className="rounded-xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Draft queue · Phase 8 content engine
        </h2>
        <p className="mb-3 text-[11px] text-ion-3">
          Performance gate is currently{" "}
          {gates.canExposePerformanceStats ? (
            <span className="text-verify">ON</span>
          ) : (
            <span className="text-caution">OFF</span>
          )}
          . Drafts that depend on the gate cannot be approved for public
          visibility while it is OFF.
        </p>
        {drafts.length === 0 ? (
          <p className="text-xs text-ion-3">
            No drafts in the queue yet. Drafts are created by the content
            engine builders (<code>apps/web/lib/content-engine</code>) and
            seeded by <code>db:seed</code>. They never auto-publish.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Content draft queue — status, coverage, compliance, and readiness" className="w-full min-w-[800px] text-left text-xs">
              <thead className="border-b border-titanium/40 text-[10px] uppercase tracking-widest text-ion-3">
                <tr>
                  <th scope="col" className="py-2 pr-3">Title</th>
                  <th scope="col" className="py-2 pr-3">Type</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2 pr-3">Coverage</th>
                  <th scope="col" className="py-2 pr-3">Compliance</th>
                  <th scope="col" className="py-2 pr-3">RG</th>
                  <th scope="col" className="py-2 pr-3">Disclosure</th>
                  <th scope="col" className="py-2 pr-3">Perf gate</th>
                  <th scope="col" className="py-2 pr-3">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id} data-testid={`content-draft-row-${d.slug}`} className="border-b border-titanium/40 align-top text-ion-1">
                    <td className="py-2 pr-3 font-semibold text-ion-white">{d.title}</td>
                    <td className="py-2 pr-3">{d.contentType}</td>
                    <td className="py-2 pr-3">{d.status}</td>
                    <td className="py-2 pr-3">{d.sourceCoverageStatus}</td>
                    <td className="py-2 pr-3">{d.complianceStatus}</td>
                    <td className="py-2 pr-3">{d.responsibleGamingIncluded ? "yes" : "—"}</td>
                    <td className="py-2 pr-3">{d.affiliateDisclosureIncluded ? "yes" : "—"}</td>
                    <td className="py-2 pr-3">{d.performanceGateStatus}</td>
                    <td className="py-2 pr-3">
                      <span data-testid={`content-readiness-${d.slug}`} className={d.verdict.readiness === "READY_FOR_REVIEW" ? "text-verify" : d.verdict.readiness === "BLOCKED" ? "text-alert" : "text-caution"}>
                        {d.verdict.readiness}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {drafts.length > 0 && (
          <ul data-testid="content-blockers-list" className="mt-4 space-y-2 text-[11px] text-ion-2">
            {drafts.map((d) => (
              <li key={`blockers-${d.id}`}>
                <span className="font-semibold text-ion-1">{d.title}</span>
                {" — "}
                {d.verdict.blockers.length > 0 ? d.verdict.blockers.join(" · ") : `Next: ${d.verdict.nextRecommendedAction}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Templates the engine is allowed to emit
        </h2>
        <table aria-label="Templates the content engine is allowed to emit" className="w-full text-left text-xs">
          <thead className="border-b border-titanium/40 text-[10px] uppercase tracking-widest text-ion-3">
            <tr>
              <th scope="col" className="py-2 pr-3">Template</th>
              <th scope="col" className="py-2 pr-3">Type</th>
              <th scope="col" className="py-2 pr-3">Required sources</th>
              <th scope="col" className="py-2 pr-3">Gate</th>
              <th scope="col" className="py-2 pr-3">RG?</th>
              <th scope="col" className="py-2 pr-3">Disclosure?</th>
              <th scope="col" className="py-2 pr-3">Visibility</th>
              <th scope="col" className="py-2 pr-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.key} className="border-b border-titanium/40 align-top text-ion-1">
                <td className="py-2 pr-3 font-semibold text-ion-white">{t.title}</td>
                <td className="py-2 pr-3">{t.contentType}</td>
                <td className="py-2 pr-3 text-ion-2">{t.requiredSources.join(", ")}</td>
                <td className="py-2 pr-3">{t.requiresPerformanceGate ? "PERF" : "—"}</td>
                <td className="py-2 pr-3">{t.requiresResponsibleGaming ? "yes" : "—"}</td>
                <td className="py-2 pr-3">{t.requiresAffiliateDisclosure ? "yes" : "—"}</td>
                <td className="py-2 pr-3">{t.defaultVisibility}</td>
                <td className="py-2 pr-3">{t.reviewOwner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Legacy content policy
        </h2>
        <table aria-label="Legacy content policy by content kind" className="w-full text-left text-xs">
          <thead className="border-b border-titanium/40 text-[10px] uppercase tracking-widest text-ion-3">
            <tr>
              <th scope="col" className="py-2 pr-3">Kind</th>
              <th scope="col" className="py-2 pr-3">Required sources</th>
              <th scope="col" className="py-2 pr-3">Gate?</th>
              <th scope="col" className="py-2 pr-3">Promo?</th>
              <th scope="col" className="py-2 pr-3">RG note?</th>
            </tr>
          </thead>
          <tbody>
            {listContentKinds().map((kind) => {
              const p = CONTENT_POLICIES[kind];
              return (
                <tr key={kind} className="border-b border-titanium/40 align-top text-ion-1">
                  <td className="py-2 pr-3">{kind}</td>
                  <td className="py-2 pr-3 text-ion-2">{p.requiredCategories.join(", ")}</td>
                  <td className="py-2 pr-3">{p.requiresPerformanceGate ? "PERF" : "—"}</td>
                  <td className="py-2 pr-3">{p.requiresPromotionDisclosure ? "Disclosure" : "—"}</td>
                  <td className="py-2 pr-3">{p.requiresRgNote ? "Required" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-titanium/40 bg-eclipse/40 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Legacy media queue (CockpitMediaItem)
        </h2>
        {legacy.length === 0 ? (
          <p className="text-xs text-ion-3">No legacy media items.</p>
        ) : (
          <table aria-label="Legacy media queue — channel, QA, and compliance per item" className="w-full text-left text-xs">
            <thead className="border-b border-titanium/40 text-[10px] uppercase tracking-widest text-ion-3">
              <tr>
                <th scope="col" className="py-2 pr-3">Title</th>
                <th scope="col" className="py-2 pr-3">Channel</th>
                <th scope="col" className="py-2 pr-3">QA</th>
                <th scope="col" className="py-2 pr-3">Compliance</th>
                <th scope="col" className="py-2 pr-3">Approved?</th>
              </tr>
            </thead>
            <tbody>
              {legacy.map((d) => (
                <tr key={d.id} className="border-b border-titanium/40 align-top text-ion-1">
                  <td className="py-2 pr-3 font-semibold text-ion-white">{d.briefTitle}</td>
                  <td className="py-2 pr-3">{d.channel}</td>
                  <td className="py-2 pr-3">{d.qaStatus}</td>
                  <td className="py-2 pr-3">{d.complianceStatus}</td>
                  <td className="py-2 pr-3">{d.approved ? "YES" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p data-testid="content-no-publish-banner" className="rounded-lg border border-caution/40 bg-caution/10 p-3 text-xs text-caution">
        Internal calibration only. No auto-publish. No auto-send. No automated betting.
        Approval is an internal sign-off; surfacing a draft on the public
        blog still requires a deliberate, audited operator action outside
        the cockpit.
      </p>
    </div>
  );
}
