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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-caution">
              Bot Outbox
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ion-white">Draft Event Planner</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ion-2">
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

      <section className="overflow-hidden rounded-lg border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Draft Items</h2>
          <p className="mt-1 text-xs text-ion-3">
            Generated {new Date(drafts.generatedAt).toLocaleString("en-US")}
          </p>
        </div>
        {drafts.items.length === 0 ? (
          <div className="p-6 text-sm text-ion-3">No draftable bot events in the current window.</div>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Bot outbox draft items — state, channel, and event per draft" className="min-w-full divide-y divide-titanium/30 text-sm">
              <thead className="bg-eclipse/50 text-left text-[11px] uppercase tracking-wider text-ion-3">
                <tr>
                  <th scope="col" className="px-4 py-3">State</th>
                  <th scope="col" className="px-4 py-3">Channel</th>
                  <th scope="col" className="px-4 py-3">Event</th>
                  <th scope="col" className="px-4 py-3">Game</th>
                  <th scope="col" className="px-4 py-3">Draft</th>
                  <th scope="col" className="px-4 py-3">Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-titanium/30">
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
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ion-white">{value}</p>
    </div>
  );
}

function OutboxRow({ item }: { readonly item: PlannedBotOutboxItem }): JSX.Element {
  const preview = item.bodyText ?? item.threadText?.[0] ?? item.embed?.title ?? "Blocked before rendering.";

  return (
    <tr className="align-top text-ion-1">
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className={
            item.shouldPost
              ? "rounded-full border border-verify/40 bg-verify/10 px-2 py-1 text-[11px] text-verify"
              : "rounded-full border border-caution/40 bg-caution/10 px-2 py-1 text-[11px] text-caution"
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
      <td className="whitespace-nowrap px-4 py-3 font-medium text-ion-white">{item.eventKind}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <Link href={`/room/${item.gameId}`} className="text-caution hover:text-caution">
          {item.gameId}
        </Link>
      </td>
      <td className="max-w-xl px-4 py-3 text-xs leading-5 text-ion-2">
        <span className="line-clamp-4 whitespace-pre-line">{preview}</span>
      </td>
      <td className="max-w-xs break-all px-4 py-3 text-[11px] text-ion-3">
        {item.idempotencyKey}
      </td>
    </tr>
  );
}
