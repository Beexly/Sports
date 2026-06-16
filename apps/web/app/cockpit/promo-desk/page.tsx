import Link from "next/link";
import {
  listCockpitOperators,
  summarizeRegistry,
  type OperatorClass,
  type OperatorRegistryEntry,
} from "@/lib/cockpit/operator-registry";

export const dynamic = "force-dynamic";

function classBadge(operatorClass: OperatorClass): string {
  switch (operatorClass) {
    case "APPROVED_PARTNER":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "KNOWN_NOT_PARTNERED":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "DEMO":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "BLOCKED":
    default:
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  }
}

export default function PromoDeskPage(): JSX.Element {
  const operators = listCockpitOperators();
  const summary = summarizeRegistry();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ion-white">Promo Desk Operator Registry</h1>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="text-sm text-ion-2">
          Operators must be approved here before a promo can publish. New approved partner rows are code-review only.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Approved partners" value={summary.byClass.APPROVED_PARTNER} />
        <SummaryCard label="Demo" value={summary.byClass.DEMO} />
        <SummaryCard label="Blocked" value={summary.byClass.BLOCKED} />
      </section>

      {summary.publishablePartners === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>No publishable partners.</strong> Public promotions remain in the empty state until an APPROVED_PARTNER row is added by code review.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wide text-ion-3">Registered operators</h2>
        <ul className="flex flex-col gap-2">
          {operators.map((operator) => (
            <OperatorRow key={operator.key} entry={operator} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-titanium/40 bg-obsidian/50 p-3">
      <span className="text-[10px] uppercase tracking-wide text-ion-3">{label}</span>
      <span className="text-xl font-bold text-ion-white">{value}</span>
    </div>
  );
}

function OperatorRow({ entry }: { entry: OperatorRegistryEntry }): JSX.Element {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-titanium/40 bg-obsidian/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ion-white">{entry.displayName}</span>
          <code className="rounded bg-eclipse/70 px-1.5 py-0.5 text-[10px] text-ion-2">
            {entry.key}
          </code>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classBadge(entry.operatorClass)}`}>
          {entry.operatorClass.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] text-ion-2">
        <span>jurisdiction: <strong className="text-ion-1">{entry.jurisdiction}</strong></span>
        <span>states: <strong className="text-ion-1">{entry.licensedStates.length || "-"}</strong></span>
        <span>real: <strong className="text-ion-1">{entry.isReal ? "yes" : "no"}</strong></span>
        <span>reviewed: <strong className="text-ion-1">{entry.reviewedAt}</strong></span>
      </div>
      {entry.blockedReason && (
        <p className="rounded border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-200">
          Blocked: {entry.blockedReason}
        </p>
      )}
    </li>
  );
}
