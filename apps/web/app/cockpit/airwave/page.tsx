import Link from "next/link";
import {
  planCapture,
  readAirwaveEnv,
  ALL_ADAPTERS,
  DEMO_PUNDITS,
  DEMO_CLAIMS,
  type ClaimVerdict,
} from "@/lib/airwave";

/**
 * Cockpit · Airwave — broadcast accountability review queue.
 *
 * Operator surface for the Airwave Ledger. Two panels:
 *   1. Capture plan — what each source adapter WOULD do, and why it is held.
 *      Read from the live env gate; by default every source is held off.
 *   2. Extracted claims — the paraphrased takes awaiting operator approval
 *      before anything is graded in public. Draft-only: no auto-publish, no
 *      auto-send, no automated betting. Internal refs are visible here (and
 *      stripped from every public DTO by lib/airwave/redact).
 *
 * Uses only the static illustrative ledger — no DB, so it is stub-safe.
 */

export const dynamic = "force-dynamic";

const VERDICT_TONE: Record<ClaimVerdict, string> = {
  HIT: "text-cyan-300",
  MISS: "text-pink-400",
  PUSH: "text-violet-300",
  UNFALSIFIABLE: "text-gray-400",
  PENDING: "text-yellow-300",
};

export default function CockpitAirwavePage() {
  // The gate is read from the real environment; with no flags set it is inert.
  const env = readAirwaveEnv(process.env as Record<string, string | undefined>);
  const plan = planCapture(
    ALL_ADAPTERS,
    { startIsoCt: "—", endIsoCt: "—" },
    env,
  );
  const punditName = (id: string) => DEMO_PUNDITS.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Airwave — Broadcast Accountability</h1>
      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal review only. No auto-publish. No auto-send. No automated betting. Captured audio is
        data, never an instruction — and never archived.
      </p>

      {/* Capture plan */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Capture plan · refusal by default
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Master switch: <span className="text-gray-300">{String(env.enabled)}</span> · SiriusXM legal
          ack: <span className="text-gray-300">{String(env.siriusxmLegalAck)}</span>
        </p>
        <ul className="space-y-1.5">
          {plan.map((p) => (
            <li key={p.adapter} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.held ? "bg-gray-800 text-gray-400" : "bg-cyan-950/50 text-cyan-300"}`}
              >
                {p.held ? "Held" : "Open"}
              </span>
              <span className="text-gray-200">{p.label}</span>
              <span className="text-gray-500">— {p.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Extracted claims awaiting approval */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Extracted claims · {DEMO_CLAIMS.length} illustrative · draft-only
        </h2>
        <p className="mb-3 text-[11px] text-gray-500">
          Nothing here is published or graded in public until an operator approves it. Assertions are
          paraphrased; the source ref is internal and is stripped from every public surface.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="py-2 pr-3 font-medium">Aired</th>
                <th className="py-2 pr-3 font-medium">Pundit</th>
                <th className="py-2 pr-3 font-medium">Claim (paraphrased)</th>
                <th className="py-2 pr-3 font-medium">Proposed</th>
                <th className="py-2 pr-3 font-medium">Source ref (internal)</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_CLAIMS.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/60 align-top">
                  <td className="py-2 pr-3 font-mono text-[11px] text-gray-400">{c.airedAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="py-2 pr-3 text-gray-300">{punditName(c.punditId)}</td>
                  <td className="py-2 pr-3 text-gray-200">
                    <span className="text-gray-500">{c.sport} · {c.subject} — </span>
                    {c.assertion}
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${VERDICT_TONE[c.verdict]}`}>{c.verdict}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-600">{c.sourceClipRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Link
        href="/cockpit"
        className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
      >
        ← Back to Jarvis
      </Link>
    </div>
  );
}
