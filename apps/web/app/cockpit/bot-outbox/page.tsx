import Link from "next/link";
import { loadBotOutboxDrafts } from "@/lib/bot-outbox/load";
import type { PlannedBotOutboxItem } from "@/lib/bot-outbox/plan";

export const dynamic = "force-dynamic";

const CHANNEL_STYLES: Readonly<Record<PlannedBotOutboxItem["channel"], string>> = {
  TWITTER: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  DISCORD: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
};

export default async function CockpitBotOutboxPage(): Promise<JSX.Element> {
  const drafts = await loadBotOutboxDrafts({ lookbackMinutes: 180, limitPerKind: 20 });
  const readyItems = drafts.items.filter((item) => item.shouldPost);
  const blockedItems = drafts.items.filter((item) => !item.shouldPost);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Bot Outbox
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Draft Event Planner</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-mineral px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-gray-400">
          Recent draft payloads for the Twitter/X and Discord bot surfaces. This page discovers
          eligible events, renders draft items, and does not deliver or persist channel work.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Draft items" value={String(drafts.counts.outboxItems)} />
        <Metric label="Ready" value={String(readyItems.length)} />
        <Metric label="Blocked" value={String(blockedItems.length)} />
        <Metric label="Lookback" value={`${drafts.lookbackMinutes} min`} />
      </section>

      <section className="overflow-hidden rounded-lg border border-mineral bg-carbon">
        <div className="border-b border-mineral px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Draft Items</h2>
          <p className="mt-1 text-xs text-gray-500">
            Generated {new Date(drafts.generatedAt).toLocaleString("en-US")}
          </p>
        </div>
        {drafts.items.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No draftable bot events in the current window.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800 text-sm">
              <thead className="bg-gray-900/60 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Game</th>
                  <th className="px-4 py-3">Draft</th>
                  <th className="px-4 py-3">Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {drafts.items.map((item) => (
                  <OutboxRow key={item.idempotencyKey} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-mineral bg-carbon p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function OutboxRow({ item }: { readonly item: PlannedBotOutboxItem }): JSX.Element {
  const preview = item.bodyText ?? item.threadText?.[0] ?? item.embed?.title ?? "Blocked before rendering.";

  return (
    <tr className="align-top text-gray-300">
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className={
            item.shouldPost
              ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
              : "rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
          }
        >
          {item.shouldPost ? "ready" : item.blockedReason}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className={`rounded-md border px-2 py-1 text-[11px] ${CHANNEL_STYLES[item.channel]}`}>
          {item.channel}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{item.eventKind}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <Link href={`/room/${item.gameId}`} className="text-yellow-200 hover:text-yellow-100">
          {item.gameId}
        </Link>
      </td>
      <td className="max-w-xl px-4 py-3 text-xs leading-5 text-gray-400">
        <span className="line-clamp-4 whitespace-pre-line">{preview}</span>
      </td>
      <td className="max-w-xs break-all px-4 py-3 text-[11px] text-gray-500">
        {item.idempotencyKey}
      </td>
    </tr>
  );
}
