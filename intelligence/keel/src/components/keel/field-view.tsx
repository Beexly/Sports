import { CATALOG, fieldArithmetic } from "@/lib/derive";
import { WATSON_WEEKS } from "@/lib/doctrine";
import { FIELD, type FieldSnap } from "@/lib/field";
import { useKeel } from "@/lib/store";
import { Meta, Num, Panel, Stamp } from "@/components/keel/ui";

const MARK = new Set(["00-0033537", "00-0023459"]);

export function FieldView() {
  const recount = useKeel((s) => s.recount);
  const live = recount?.field;
  const snap: FieldSnap = live ?? FIELD;
  const onReport = snap.ol.filter((row) => row.out === 0);
  const math = fieldArithmetic(snap, recount?.ngs?.watsonWeeks ?? WATSON_WEEKS);

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Stamp tone={live ? "good" : "flat"}>{live ? "Live recount" : "Sealed 4 Oct 2026"}</Stamp>
          <Meta>Season grain · not a snap</Meta>
        </div>
        <h2 className="mt-3 text-3xl">Thirty-seven public means. Seven recorded nulls.</h2>
        <p className="mt-3 max-w-3xl text-fg">
          Week 0 of the combined passing file is the 2026 season rate for every passer Next Gen Stats published. The minimum is <Num>{snap.min.toFixed(3)}</Num>, the median <Num>{snap.median.toFixed(3)}</Num>, the maximum <Num>{snap.max.toFixed(3)}</Num>. The illegal fixture 2.1 is outside that support. None of these numbers is a play.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <Meta>Week 4 offensive line · absence is null</Meta>
          <p className="mt-3 text-fg">
            <Num>{snap.nullTeams.length}</Num> teams have zero offensive-line rows. That is a recorded null, including Pittsburgh. It is not a clean injury report and it is not health.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {snap.nullTeams.map((team) => (
              <span key={team} className="border border-accent px-2 py-1 font-mono text-sm text-accent">
                {team} null
              </span>
            ))}
          </div>
          <p className="mt-4 font-mono text-sm text-muted">
            On the report with zero Out: {onReport.map((row) => row.team).join(", ") || "none"}.
          </p>
        </Panel>
        <Panel>
          <Meta>Week 4 · Out linemen, only where a row exists</Meta>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium">Line rows</th>
                  <th className="py-2 font-medium">Out</th>
                </tr>
              </thead>
              <tbody>
                {snap.ol
                  .filter((row) => row.out > 0)
                  .map((row) => (
                    <tr key={row.team} className="border-b border-line">
                      <td className="py-2 pr-4 text-fg">{row.team}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.ol}</td>
                      <td className="py-2 tabular-nums">{row.out}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-fg">Cleveland’s two Out linemen are in this count. The join still cannot write a play-level time-to-throw.</p>
        </Panel>
      </div>

      {math && (
        <Panel>
          <Meta>Arithmetic the sealed table supports · still not a snap</Meta>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Unweighted mean</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{math.mean.toFixed(3)}</p>
              <p className="text-sm text-muted">{math.n} season means, equal weight</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Attempt-weighted</p>
              <p className="mt-1 font-mono text-2xl tabular-nums text-primary">{math.weighted?.toFixed(3)}</p>
              <p className="text-sm text-muted">{math.attempts.toLocaleString()} attempts</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Quartiles</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">
                {math.q1.toFixed(3)} – {math.q3.toFixed(3)}
              </p>
              <p className="text-sm text-muted">Nearest rank. 2.1 is outside. {math.belowFixture} means at or under it.</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Line rows that exist</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">
                {math.lineOut}/{math.lineRows}
              </p>
              <p className="text-sm text-muted">
                Out over rows, {math.reporting} teams reporting. {math.nullTeams} teams are null, not zero.
              </p>
            </div>
          </div>
          {math.drift.length > 0 && math.seasonTtt !== null && (
            <div className="mt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                Watson prior drift · week minus season {math.seasonTtt.toFixed(3)}
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2 pr-4 font-medium">Week</th>
                      <th className="py-2 pr-4 font-medium">Mean</th>
                      <th className="py-2 pr-4 font-medium">Attempts</th>
                      <th className="py-2 font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {math.drift.map((row) => (
                      <tr key={row.week} className="border-b border-line">
                        <td className="py-2 pr-4">{row.week}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.ttt.toFixed(3)}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.attempts}</td>
                        <td className="py-2 tabular-nums">
                          {row.delta >= 0 ? "+" : ""}
                          {row.delta.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-muted">Both sides are means. The play is still null. Do not explain a delta with a lineman.</p>
            </div>
          )}
        </Panel>
      )}

      <Panel>
        <Meta>What a public file is allowed to say</Meta>
        <div className="mt-3 flex flex-col gap-3">
          {CATALOG.map((row) => (
            <article key={row.file} className="border border-line p-4">
              <h3 className="font-mono text-sm text-fg">{row.file}</h3>
              <p className="mt-1 text-sm text-muted">{row.grain}</p>
              <p className="mt-2 text-fg">May: {row.may}</p>
              <p className="mt-1 text-muted">May not: {row.mayNot}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <Meta>2026 week 0 · avg_time_to_throw · attempts descending</Meta>
        <div className="mt-3 max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[28rem] text-left font-mono text-sm">
            <thead className="sticky top-0 bg-surface text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Passer</th>
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">Mean</th>
                <th className="py-2 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {snap.passers.map((row) => (
                <tr key={row.gsis} className="border-b border-line">
                  <td className={`py-2 pr-4 ${MARK.has(row.gsis) ? "text-primary" : "text-fg"}`}>{row.name}</td>
                  <td className="py-2 pr-4">{row.team}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.ttt.toFixed(3)}</td>
                  <td className="py-2 tabular-nums">{row.att}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-muted">Watson and Rodgers are marked because the closed record already cites them. Marking is not a pick.</p>
      </Panel>
    </div>
  );
}
