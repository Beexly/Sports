import type { LineupRow } from "../data/week8";

export function DfsCard({ row }: { row: LineupRow }) {
  return (
    <article className="card dfs-card">
      <div>
        <p className="dfs-team">{row.team} · {row.slot}</p>
        <h3>{row.name}</h3>
      </div>
      <div className="dfs-salary">
        <span>Salary</span>
        <strong className="primary-number">${row.salary.toLocaleString("en-US")}</strong>
      </div>
    </article>
  );
}
