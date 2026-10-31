import type { LineupRow } from "../data/week8";
import { salaryTotal } from "../data/week8";

export function LineupTable({ rows }: { rows: LineupRow[] }) {
  return (
    <div className="lineup-wrap">
      <table className="lineup-table">
        <caption>13-game flagship GPP · salary-exact source lineup</caption>
        <thead>
          <tr>
            <th scope="col">Slot</th>
            <th scope="col">Player</th>
            <th scope="col" className="num-col">Salary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.slot}-${row.name}`}>
              <td>{row.slot}</td>
              <th scope="row">{row.name} <span>{row.team}</span></th>
              <td className="salary">${row.salary.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>Total</th>
            <td className="salary">${salaryTotal(rows).toLocaleString("en-US")}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
