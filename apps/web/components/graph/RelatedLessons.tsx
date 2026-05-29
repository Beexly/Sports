import Link from "next/link";
import { ACADEMY_MODULES } from "@/lib/galaxy/kernel/academy";

interface Props {
  conceptIds: ReadonlyArray<string>;
  className?: string;
}

export function RelatedLessons({ conceptIds, className = "" }: Props) {
  const modules = ACADEMY_MODULES.filter((m) => conceptIds.includes(m.conceptId));
  if (modules.length === 0) return null;

  return (
    <ul className={["flex flex-col gap-2", className].join(" ")}>
      {modules.map((m) => (
        <li key={m.id}>
          <Link
            href="/academy"
            className="group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-400 hover:border-mineral hover:bg-gray-900/50 hover:text-white transition-all"
          >
            <span className="h-1 w-1 rounded-full bg-indigo-600 shrink-0" aria-hidden="true" />
            <span className="flex-1">{m.title}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
              {m.readMinutes}m →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
