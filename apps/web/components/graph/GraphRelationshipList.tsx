import Link from "next/link";
import type { GraphEdge } from "@/lib/galaxy/kernel/graph";
import { getSurface } from "@/lib/galaxy/kernel/surfaces";

interface Props {
  edges: ReadonlyArray<GraphEdge>;
  className?: string;
}

export function GraphRelationshipList({ edges, className = "" }: Props) {
  if (edges.length === 0) return null;

  return (
    <ul className={["flex flex-col gap-2", className].join(" ")}>
      {edges.map((edge) => {
        const target = getSurface(edge.to);
        if (!target) return null;
        return (
          <li key={`${edge.from}-${edge.to}-${edge.kind}`}>
            <Link
              href={target.path}
              className="group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-400 hover:border-mineral hover:bg-gray-900/50 hover:text-white transition-all"
            >
              <span className="h-1 w-1 rounded-full bg-gray-600 shrink-0 group-hover:bg-accent-300 transition-colors" aria-hidden="true" />
              <span className="flex-1">{edge.label}</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">
                {target.label} →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
