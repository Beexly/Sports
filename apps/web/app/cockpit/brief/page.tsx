import Link from "next/link";
import { composeDailyBrief } from "@/lib/brief/compose";
import {
  JsonHumanizer,
  type JsonFieldSchema,
} from "@/components/ui/json-humanizer";

/**
 * /cockpit/brief — the operator's daily brief, humanized.
 *
 * Admin-gated by `app/cockpit/layout.tsx`. Previously this page was a stub
 * that pointed the operator at the raw cockpit-brief JSON endpoint;
 * the composer output now renders through {@link JsonHumanizer} (table-first,
 * every field explained), with the raw payload demoted to the copy/download
 * actions in the card header. Presentation only — the compose pipeline at
 * `lib/brief/compose.ts` and the API route are unchanged.
 *
 * Honesty: the composer is still the post-truncation rebuild stub, so the
 * table shows exactly the rebuild-status payload it returns today. Nothing
 * is fabricated; when the composer is rebuilt this page gets richer for free.
 */

export const dynamic = "force-dynamic";

const BRIEF_SCHEMA: ReadonlyArray<JsonFieldSchema> = [
  {
    key: "date",
    label: "Brief date",
    description: "The slate day this brief covers (UTC).",
  },
  {
    key: "status",
    label: "Status",
    description: "Lifecycle state — DRAFT briefs are internal-only.",
  },
  {
    key: "summary",
    label: "Summary",
    description: "The composer's one-paragraph read on the day.",
  },
  {
    key: "slateOverview",
    label: "Slate overview",
    description: "Plain-language overview of today's slate.",
  },
  {
    key: "sections",
    label: "Sections",
    description: "Composed brief sections (title, body, type).",
  },
  {
    key: "promotions",
    label: "Promotions",
    description: "Active promotions eligible to surface in the brief.",
  },
  {
    key: "whatChanged",
    label: "What changed",
    description: "Material changes since the previous brief.",
  },
  {
    key: "contentIdeas",
    label: "Content ideas",
    description: "Composer-suggested content angles for the day.",
  },
  {
    key: "manualReview",
    label: "Manual review",
    description: "Items the composer flags for human review before publish.",
  },
  {
    key: "responsibleGamingText",
    label: "Responsible gaming note",
    description: "The note appended to every brief surface.",
  },
];

export default function CockpitBriefPage(): JSX.Element {
  const brief = composeDailyBrief({ date: new Date() });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily brief</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">
            The compose pipeline output, rendered readable. The composer body
            is being rebuilt after a truncation incident, so today&apos;s
            payload is the rebuild-status stub — shown exactly as returned.
          </p>
        </div>
        <Link
          href="/cockpit"
          className="rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
        >
          ← Back to Jarvis
        </Link>
      </header>

      <JsonHumanizer
        data-testid="cockpit-brief-humanized"
        data={brief}
        title="Today's brief at a glance"
        eyebrow="Daily brief"
        usedFor="The operator's morning read: slate overview, composed sections, promotions, and anything flagged for manual review."
        schema={BRIEF_SCHEMA}
        rawFilename={`daily-brief-${brief.date}`}
        emptyLabel="The composer returned nothing for today — no brief has been composed yet."
      />

      <p className="text-[10px] text-gray-600">
        Composed live by{" "}
        <code className="rounded bg-gray-800 px-1">lib/brief/compose.ts</code>.
        The raw payload is available from the copy/download actions above.
      </p>
    </div>
  );
}
