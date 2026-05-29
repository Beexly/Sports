import Link from "next/link";
import { REPORT_TYPES } from "@/lib/galaxy/kernel/reports";
import type { ReportTypeId } from "@/lib/galaxy/kernel/reports";

interface Props {
  typeIds: ReadonlyArray<ReportTypeId>;
  className?: string;
}

export function RelatedReports({ typeIds, className = "" }: Props) {
  const reports = REPORT_TYPES.filter((r) => typeIds.includes(r.id));
  if (reports.length === 0) return null;

  return (
    <ul className={["flex flex-col gap-2", className].join(" ")}>
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            href={`/reports/${r.id}`}
            className="group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-400 hover:border-mineral hover:bg-gray-900/50 hover:text-white transition-all"
          >
            <span className={["h-1 w-1 rounded-full shrink-0", r.dotClass].join(" ")} aria-hidden="true" />
            <span className="flex-1">{r.name}</span>
            <span className={["font-mono text-[9px] uppercase tracking-widest", r.labelClass, "opacity-60 group-hover:opacity-100 transition-opacity"].join(" ")}>
              {r.cadence} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
