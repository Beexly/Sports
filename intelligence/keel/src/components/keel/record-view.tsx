import { useServerFn } from "@tanstack/react-start";
import { CLEVELAND_WEEK4, SEAL, SHIPS, WATSON_WEEKS, brierDelta, brierSkill } from "@/lib/doctrine";
import { recountSeal } from "@/lib/hunt-fn";
import { useKeel } from "@/lib/store";
import { Meta, Num, Panel, Stamp, ttt, when } from "@/components/keel/ui";

export function RecordView() {
  const recount = useKeel((s) => s.recount);
  const seal = useKeel((s) => s.seal);
  const busy = useKeel((s) => s.busy);
  const setBusy = useKeel((s) => s.setBusy);
  const setRecount = useKeel((s) => s.setRecount);
  const recountFn = useServerFn(recountSeal);

  const weeks = WATSON_WEEKS.filter((w) => w.week !== "0").map((w) => Number(w.ttt));
  const lo = Math.min(...weeks);
  const hi = Math.max(...weeks);

  async function recountNow() {
    if (useKeel.getState().busy) return;
    setBusy(true);
    try {
      setRecount(await recountFn({ data: { confirm: true } }));
    } catch (err) {
      setRecount({
        ok: false,
        checkedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Recount failed.",
        stubBytes: null,
      });
    } finally {
      setBusy(false);
    }
  }

  const sealMoved =
    seal &&
    (seal.injuriesMatch === false || seal.ngsMatch === false || seal.stubMatch === false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Meta>Recounted {SEAL.pulledAt} against the public releases</Meta>
          <p className="mt-2 max-w-3xl text-fg">
            The closed record held. Injury counts, the empty Pittsburgh line, the 616-byte stub, and Watson’s season rate all match the files.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recountNow()}
          disabled={busy}
          className="min-h-11 shrink-0 border border-line bg-surface px-4 font-mono text-sm text-fg disabled:opacity-50"
        >
          {busy ? "Working" : "Recount the files"}
        </button>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <Stamp tone={sealMoved ? "warn" : "good"}>{sealMoved ? "Seal moved" : "Seal held"}</Stamp>
          <p className="font-mono text-sm text-muted">
            {seal
              ? `Asset check ${when(seal.checkedAt)}. Injuries ${seal.injuriesBytes ?? "—"} bytes, combined passing ${seal.ngsBytes ?? "—"} bytes, 2024 stub ${seal.stubBytes ?? "—"} bytes.`
              : "Asset sizes have not been rechecked this session. The counts below are from the 4 Oct pull."}
          </p>
        </div>
        {recount && (
          <p className="mt-3 text-fg">
            {recount.ok && recount.injuries && recount.ngs
              ? `Live recount: ${recount.injuries.rows} injury rows, week 4 offensive line ${recount.injuries.week4Ol} with ${recount.injuries.week4OlOut} Out, Pittsburgh offensive line ${recount.injuries.pitWeek4Ol}. Watson season time-to-throw ${ttt(recount.ngs.watsonSeason)}. Stub ${recount.stubBytes ?? "—"} bytes.`
              : `Recount failed. ${recount.error ?? "The files could not be read."}`}
          </p>
        )}
        {recount?.ok && recount.injuries && recount.injuries.rows !== SEAL.injuriesRows && (
          <p className="mt-2 text-accent">The row count moved. Do not keep citing 1,052 until this screen is read.</p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <Meta>Gate 1 · injury</Meta>
            <Stamp tone="good">Source found</Stamp>
          </div>
          <h2 className="mt-3 text-2xl">The join the record said did not exist</h2>
          <p className="mt-3 text-fg">
            Play-by-play has no offensive-line injury fields. The nflverse injuries release does. Keyed by gsis_id, team, and week. The operator contract says the file updates at {SEAL.updateContract}. Starter ids from rosters join onto this file. A miss stays null.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-sm">
            <div>
              <dt className="text-muted">2026 rows</dt>
              <dd className="text-fg tabular-nums">{SEAL.injuriesRows}</dd>
            </div>
            <div>
              <dt className="text-muted">Week 4 rows</dt>
              <dd className="text-fg tabular-nums">{SEAL.week4Rows}</dd>
            </div>
            <div>
              <dt className="text-muted">Week 4 line</dt>
              <dd className="text-fg tabular-nums">{SEAL.week4Ol}</dd>
            </div>
            <div>
              <dt className="text-muted">Of those, Out</dt>
              <dd className="text-fg tabular-nums">{SEAL.week4OlOut}</dd>
            </div>
            <div>
              <dt className="text-muted">2025 rows</dt>
              <dd className="text-fg tabular-nums">{SEAL.season2025Rows}</dd>
            </div>
            <div>
              <dt className="text-muted">2025 line</dt>
              <dd className="text-fg tabular-nums">{SEAL.season2025Ol}</dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <Meta>Gate 3 · time to throw</Meta>
            <Stamp tone="warn">Unvalidated</Stamp>
          </div>
          <h2 className="mt-3 text-2xl">Still not a snap</h2>
          <p className="mt-3 text-fg">
            The combined passing file has avg_time_to_throw, and it already carries player_gsis_id. Week 0 is the season. A weekly mean is a prior with an error bar. Trust labels do not exist in public. The single-year 2024 file is {SEAL.ngsStubBytes} bytes. Do not use it. The fixture {SEAL.illegalFixture} stays illegal.
          </p>
          <p className="mt-3 font-mono text-sm text-muted">
            Watson {SEAL.watsonGsis} · 2026 week 0 · <Num>{ttt(SEAL.watsonSeasonTtt)}</Num> on <Num>{SEAL.watsonSeasonAttempts}</Num> attempts. The record’s 2.79 is this number, rounded.
          </p>
        </Panel>
      </div>

      <Panel>
        <Meta>What ships</Meta>
        <h2 className="mt-2 text-3xl">Fourth-down estimator. Partial label. No pick.</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Decisions, against win-probability-max</p>
            <p className="mt-2 font-mono text-4xl tabular-nums text-primary">+{SHIPS.liftPp.toFixed(2)}</p>
            <p className="mt-1 text-fg">percentage points on <Num>{SHIPS.decisions.toLocaleString()}</Num> decisions.</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Held-out Brier, on drives</p>
            <p className="mt-2 font-mono text-4xl tabular-nums text-fg">
              {SHIPS.brier.toFixed(4)}
              <span className="text-muted"> / {SHIPS.brierBaseline.toFixed(4)}</span>
            </p>
            <p className="mt-1 text-fg">
              on <Num>{SHIPS.drives}</Num> drives. Delta <Num>{brierDelta().toFixed(4)}</Num>. Skill <Num>{brierSkill().toFixed(4)}</Num>. These are not the same slice as the 3,988.
            </p>
          </div>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-fg">
          After the injury join, Gate 1 can cite Cleveland’s two Out linemen and must still say play-level time-to-throw is null.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <Stamp tone="good">Feature</Stamp>
          <h3 className="mt-3 text-xl">Injury row, when it exists</h3>
          <p className="mt-2 text-fg">gsis_id × team × week from the injuries file, attached to starters. Only the cells the file contains.</p>
        </Panel>
        <Panel>
          <Stamp tone="warn">Prior</Stamp>
          <h3 className="mt-3 text-xl">Time to throw, named grain</h3>
          <p className="mt-2 text-fg">Season or week mean from the combined file. An error bar stays attached. The play-level cell stays null.</p>
        </Panel>
        <Panel>
          <Stamp tone="flat">Refused</Stamp>
          <h3 className="mt-3 text-xl">Anything that invents</h3>
          <p className="mt-2 text-fg">The 2.1 fixture. The 616-byte stub. A Pittsburgh lineman who is not in the file. A spread column pretending to be closing-line value. A pick.</p>
        </Panel>
      </div>

      <Panel>
        <Meta>Cleveland week 4 · offensive line · cited</Meta>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left font-mono text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Player</th>
                <th className="py-2 pr-4 font-medium">Pos</th>
                <th className="py-2 pr-4 font-medium">Report</th>
                <th className="py-2 pr-4 font-medium">Practice</th>
                <th className="py-2 font-medium">Practice injury</th>
              </tr>
            </thead>
            <tbody>
              {CLEVELAND_WEEK4.map((row) => (
                <tr key={row.name} className="border-b border-line">
                  <td className="py-3 pr-4 text-fg">{row.name}</td>
                  <td className="py-3 pr-4">{row.pos}</td>
                  <td className="py-3 pr-4">{row.report || "—"}</td>
                  <td className="py-3 pr-4">{row.practice}</td>
                  <td className="py-3">{row.practiceInjury || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-fg">
          The two Out linemen are Elgton Jenkins and Teven Jenkins. Howard’s report status is blank; his practice status is full, with a knee noted on the practice side. The closed record’s “full participation” matches the practice field, not a report status that was never written.
        </p>
      </Panel>

      <Panel>
        <Meta>Pittsburgh week 4 · the null, next to a number that does not explain it</Meta>
        <p className="mt-3 text-fg">
          Offensive-line rows in the injury file: <Num>{SEAL.pitWeek4Ol}</Num>. That absence is a recorded null.
        </p>
        <p className="mt-3 text-fg">
          In the same week, the combined passing file has Aaron Rodgers at <Num>{ttt(SEAL.rodgersWeek4Ttt)}</Num> seconds on <Num>{SEAL.rodgersWeek4Attempts}</Num> attempts, one of only <Num>{SEAL.ngsWeek4Passers}</Num> passers present in the week-4 slice. The pair is not a cause. Nobody gets to invent a lineman to account for 2.811.
        </p>
      </Panel>

      <Panel>
        <Meta>Watson 2026 · avg_time_to_throw · means, not snaps</Meta>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left font-mono text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Week</th>
                <th className="py-2 pr-4 font-medium">Grain</th>
                <th className="py-2 pr-4 font-medium">Mean</th>
                <th className="py-2 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {WATSON_WEEKS.map((row) => (
                <tr key={row.week} className="border-b border-line">
                  <td className="py-3 pr-4 tabular-nums">{row.week}</td>
                  <td className="py-3 pr-4">{row.grain}</td>
                  <td className="py-3 pr-4 tabular-nums">{ttt(row.ttt)}</td>
                  <td className="py-3 tabular-nums">{row.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-fg">
          Weekly means run from <Num>{lo.toFixed(3)}</Num> to <Num>{hi.toFixed(3)}</Num>. That is the dispersion of weekly means. It is not a standard error of a snap, because the snap was never observed. Play-level time-to-throw remains null.
        </p>
      </Panel>
    </div>
  );
}
