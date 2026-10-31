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
            <th className="px-4 py-5 font-medium">Play</th>
            <th className="px-4 py-5 font-medium">Model win prob</th>
            <th className="px-4 py-5 font-medium">Market prob</th>
            <th className="px-4 py-5 font-medium">Edge</th>
            <th className="px-4 py-5 font-medium">Read</th>
            <th className="px-4 py-5 font-medium">{watch ? "Trigger" : "Status"}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={`${row.matchup}-${row.selection}`} className="border-t border-[#31353F]">
              <td className="px-4 py-8 pr-6 align-top">
                <div className="font-display text-2xl uppercase leading-none text-[#EDE8E0]">{row.selection}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.12em] text-[#FF4D2E]">{row.matchup}</div>
                <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#C4BFB6]">{row.rationale}</p>
              </td>
              <td className="px-4 py-8 align-top">{pct(row.model_p)}</td>
              <td className="px-4 py-8 align-top">{pct(row.market_p)}</td>
              <td className="px-4 py-8 align-top text-[#FF4D2E]">{pct(row.edge)}</td>
              <td className="px-4 py-8 align-top">{row.confidence_display}</td>
              <td className="px-4 py-8 align-top text-xs uppercase tracking-[0.08em]">
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
