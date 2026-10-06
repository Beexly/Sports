import { useMemo, useState } from "react";
import { EQUATIONS } from "@/lib/equations";
import { SHIPS, brierDelta, brierSkill } from "@/lib/doctrine";
import { Meta, Num, Panel } from "@/components/keel/ui";

function parseOdds(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? n : null;
}

export function EquationView() {
  const [bet, setBet] = useState("");
  const [close, setClose] = useState("");
  const [other, setOther] = useState("");

  const calc = useMemo(() => {
    const dBet = parseOdds(bet);
    const dClose = parseOdds(close);
    const dOther = parseOdds(other);
    if (!dBet || !dClose) return null;
    const clv = dBet / dClose - 1;
    let fair: number | null = null;
    let ev: number | null = null;
    if (dOther) {
      const a = 1 / dClose;
      const b = 1 / dOther;
      fair = a / (a + b);
      ev = dBet * fair - 1;
    }
    return { clv, fair, ev };
  }, [bet, close, other]);

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <Meta>Local CPU · sealed arithmetic only</Meta>
        <h2 className="mt-2 text-3xl">The bench does not refit the model.</h2>
        <p className="mt-3 max-w-3xl text-fg">
          These are the objects the closed record allows a CPU to own. The +6.77 and the two Brier numbers are reports, not something this console re-estimated. τ̂ is named and still undefined.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Brier delta</p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-fg">{brierDelta().toFixed(4)}</p>
            <p className="text-sm text-muted">
              {SHIPS.brierBaseline} − {SHIPS.brier}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Brier skill</p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-fg">{brierSkill().toFixed(4)}</p>
            <p className="text-sm text-muted">1 − BS / BS_base, on {SHIPS.drives} drives</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Decision lift</p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-primary">+{SHIPS.liftPp.toFixed(2)} pp</p>
            <p className="text-sm text-muted">{SHIPS.decisions.toLocaleString()} decisions, different slice</p>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        {EQUATIONS.map((card) => (
          <article key={card.id} className="border border-line bg-surface p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted">Law {card.law}</span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted">{card.owns}</span>
            </div>
            <h3 className="mt-2 text-2xl">{card.name}</h3>
            <pre className="mt-4 overflow-x-auto border border-line bg-bg p-4 font-mono text-sm leading-6 text-fg">
              {card.formula.join("\n")}
            </pre>
            <p className="mt-4 text-fg">{card.touches}</p>
            <p className="mt-2 text-muted">{card.forbidden}</p>
          </article>
        ))}
      </div>

      <Panel>
        <Meta>Closing-line calculator · crude de-vig labeled as crude</Meta>
        <h2 className="mt-2 text-2xl">A column that does not exist yet</h2>
        <p className="mt-2 max-w-2xl text-fg">
          Price CLV is your decimal odds divided by the closing decimal odds, minus one. Positive means you were longer than the close. If you also enter the other side of the close, the fair probability is the proportional split. Shin’s method is admitted on the shelf and is not implemented here.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wide text-muted">
            Odds taken
            <input value={bet} onChange={(e) => setBet(e.target.value)} inputMode="decimal" className="min-h-11 border border-line bg-bg px-3 font-mono text-base text-fg" placeholder="2.20" />
          </label>
          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wide text-muted">
            Close, same side
            <input value={close} onChange={(e) => setClose(e.target.value)} inputMode="decimal" className="min-h-11 border border-line bg-bg px-3 font-mono text-base text-fg" placeholder="2.00" />
          </label>
          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-wide text-muted">
            Close, other side
            <input value={other} onChange={(e) => setOther(e.target.value)} inputMode="decimal" className="min-h-11 border border-line bg-bg px-3 font-mono text-base text-fg" placeholder="optional" />
          </label>
        </div>
        <div className="mt-4">
          {calc ? (
            <p className="font-mono text-lg text-fg">
              CLV <Num>{(calc.clv * 100).toFixed(2)}%</Num>
              {calc.fair !== null && calc.ev !== null && (
                <>
                  {" "}
                  · crude fair <Num>{(calc.fair * 100).toFixed(2)}%</Num> · EV if that fair price is truth <Num>{(calc.ev * 100).toFixed(2)}%</Num>
                </>
              )}
            </p>
          ) : (
            <p className="text-muted">Enter decimal odds greater than 1. Nothing is stored. This does not increment the 200-row gate.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
