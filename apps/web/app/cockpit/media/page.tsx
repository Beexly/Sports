import { db } from "@sports/db";

export default async function CockpitMediaPage() {
  const items = await db.cockpitMediaItem.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 60,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Media workflow</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sports content drafts (Ava). Briefs become drafts; drafts become reviewed items; reviewed
          items are queued for the editor. Nothing publishes from this surface — the platform&apos;s
          public blog gate is the only path to live content.
        </p>
      </header>

      <p className="rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-4 text-xs leading-relaxed text-yellow-200">
        Draft-only. The `scheduledFor` field below is metadata for the editor; no worker reads it,
        and no external publishing happens from this page.
      </p>

      {items.length === 0 ? (
        <p
          data-testid="media-empty"
          className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-500"
        >
          No media items yet. Seed the cockpit_media_items table to populate a demo state.
        </p>
      ) : (
        <ul data-testid="media-list" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
            >
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">{m.briefTitle}</h3>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    channel: <code className="rounded bg-gray-800 px-1 text-gray-300">{m.channel}</code>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
                    QA: {m.qaStatus}
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      m.complianceStatus === "CLEAR"
                        ? "bg-green-900/40 text-green-200"
                        : m.complianceStatus === "REVIEW_REQUIRED"
                        ? "bg-yellow-900/40 text-yellow-200"
                        : m.complianceStatus === "HOLD"
                        ? "bg-red-900/40 text-red-200"
                        : "bg-gray-800 text-gray-300",
                    ].join(" ")}
                  >
                    {m.complianceStatus}
                  </span>
                </div>
              </header>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-400">
                {m.briefBody}
              </p>
              <footer className="mt-3 flex items-center justify-between text-[11px] text-gray-600">
                <span>{m.approved ? "Approved · ready for editor" : "Draft / unapproved"}</span>
                {m.scheduledFor && (
                  <span>scheduled metadata: {m.scheduledFor.toUTCString()}</span>
                )}
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
