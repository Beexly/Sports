/**
 * Conversation page — Layer H of Executive Intelligence v2.
 * Loads the live OwnerSummary server-side; the client component holds
 * the session and computes every Jarvis reply deterministically.
 */

import Link from "next/link";
import { loadOwnerSummaryServer } from "@/lib/jarvis/summary-loader";
import { JarvisConversation } from "@/components/jarvis/jarvis-conversation";

export const dynamic = "force-dynamic";

export default async function JarvisConversationPage() {
  const { summary, error } = await loadOwnerSummaryServer();

  if (!summary) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-slate-900 p-6">
        <h1 className="font-display text-xl text-white">Jarvis is unavailable</h1>
        <p className="mt-2 text-sm text-slate-300">
          The OwnerSummary failed to build: {error ?? "unknown cause"}. Jarvis refuses to
          improvise without state.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 pb-4">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
            Jarvis · Conversation
          </p>
          <h1 className="font-display text-xl text-white">Executive line — open</h1>
        </div>
        <Link href="/cockpit/jarvis/briefing" className="text-sm text-slate-400 hover:text-white">
          Morning briefing →
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <JarvisConversation summary={summary} />
      </div>
    </div>
  );
}
