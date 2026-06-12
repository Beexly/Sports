import type { ScribeEntry } from "@/lib/jarvis/scribe-types";
import { buildScribeProtocolForAgent, summarizeScribeEntries } from "@/lib/jarvis/scribe";

/**
 * Jarvis Scribe Inbox — recent scribe entries (or honest empty state).
 * Agents write here: every session leaves structured, redacted notes.
 */

export function JarvisScribeInbox({ entries }: { entries?: readonly ScribeEntry[] }) {
  const items = entries ?? [];
  const protocol = buildScribeProtocolForAgent("jarvis");

  return (
    <section
      data-testid="jarvis-scribe-inbox"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Scribe Inbox
        </h2>
        <span className="rounded border border-green-900/60 bg-green-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
          FILE BACKED
        </span>
      </div>

      <p className="mt-2 text-[10px] text-slate-400">{summarizeScribeEntries(items)}</p>

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-[10px] text-slate-500">
          <p className="font-bold uppercase tracking-widest text-slate-400">
            Agents write here
          </p>
          <p className="mt-1">
            Every agent and session leaves structured notes via the Scribe protocol:
            validated, secret-redacted, rendered as markdown to{" "}
            <code className="text-slate-400">{protocol.outputPath}</code>. No entries
            flow into this view automatically yet — wiring the read path is a next step.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-200">{e.title}</p>
                <span className="font-mono text-[9px] uppercase text-slate-500">
                  {e.type} · {e.riskLevel}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">{e.summary}</p>
              <p className="mt-1 font-mono text-[9px] text-slate-600">
                {e.source} · {e.project} · {e.createdAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
