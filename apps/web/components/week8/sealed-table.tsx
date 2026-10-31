import type { SealedRow } from "@/lib/week8/types";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function SealedTable({ rows, watch = false }: { rows: SealedRow[]; watch?: boolean }): JSX.Element {
  return (
    <div className="overflow-x-auto border-y border-[#31353F]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm text-[#EDE8E0]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-[#8F8A82]">
            <th className="py-3 pr-4 font-medium">Play</th>
            <th className="py-3 pr-4 font-medium">Model win prob</th>
            <th className="py-3 pr-4 font-medium">Market prob</th>
            <th className="py-3 pr-4 font-medium">Edge</th>
            <th className="py-3 font-medium">{watch ? "Trigger" : "Status"}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={`${row.matchup}-${row.selection}`} className="border-t border-[#31353F]">
              <td className="py-4 pr-4">
                <div className="font-display text-xl uppercase text-[#EDE8E0]">{row.selection}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[#FF4D2E]">{row.matchup}</div>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#C4BFB6]">{row.rationale}</p>
              </td>
              <td className="py-4 pr-4 align-top">{pct(row.model_p)}</td>
              <td className="py-4 pr-4 align-top">{pct(row.market_p)}</td>
              <td className="py-4 pr-4 align-top text-[#FF4D2E]">{pct(row.edge)}</td>
              <td className="py-4 align-top text-xs uppercase tracking-[0.08em]">
                {row.decision === "PASS" ? "PASS — DO NOT BET" : row.decision}
                {watch && row.trigger_odds != null ? ` · ${row.trigger_odds}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
