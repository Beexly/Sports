import type { SgpProjectionRow } from "@/lib/sgp/load-sgp-projections";

export interface SgpProjectionTableProps {
  rows: readonly SgpProjectionRow[];
}

function formatProjection(projectionPct: number): string {
  return `${projectionPct.toFixed(1)}%`;
}

export function SgpProjectionTable({ rows }: SgpProjectionTableProps) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-widest text-ion-2">
            <th scope="col" className="py-1.5 pr-4 font-medium">
              Game
            </th>
            <th scope="col" className="py-1.5 pr-4 font-medium">
              Market
            </th>
            <th scope="col" className="py-1.5 font-medium">
              Our projection
            </th>
          </tr>
        </thead>
        <tbody className="text-ion-1">
          {rows.map((row, index) => (
            <tr
              key={`${row.game}-${row.market}-${index}`}
              className="border-t border-mineral/60"
            >
              <td className="py-1.5 pr-4 text-ion-white">{row.game}</td>
              <td className="py-1.5 pr-4">{row.market}</td>
              <td className="py-1.5 font-mono">
                {formatProjection(row.projectionPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
