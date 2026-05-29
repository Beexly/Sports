import Link from "next/link";
import { SURFACES } from "@/lib/galaxy/kernel/surfaces";

interface Props {
  surfaceIds: ReadonlyArray<string>;
  className?: string;
}

export function RelatedDecisionCards({ surfaceIds, className = "" }: Props) {
  const surfaces = surfaceIds
    .map((id) => SURFACES.find((s) => s.id === id))
    .filter(Boolean) as typeof SURFACES[number][];

  if (surfaces.length === 0) return null;

  return (
    <ul className={["flex flex-col gap-2", className].join(" ")}>
      {surfaces.map((s) => (
        <li key={s.id}>
          <Link
            href={s.path}
            className="group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-400 hover:border-mineral hover:bg-gray-900/50 hover:text-white transition-all"
          >
            <span className="h-1 w-1 rounded-full bg-cyan-600 shrink-0" aria-hidden="true" />
            <span className="flex-1">{s.label}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
              {s.kind} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
