import type { AuthorityMatrix } from "@/lib/cockpit/daily-command/types";

/**
 * AuthorityMatrix — the visible L0–L5 autonomy ladder. L5 is shown empty by
 * design so the gap is legible: no agent can take external action.
 */
export function AuthorityMatrixView({ matrix }: { matrix: AuthorityMatrix }): JSX.Element {
  const safe = matrix.externalActionCapableCount === 0;
  return (
    <section
      data-testid="authority-matrix"
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-300">
            Authority Matrix · L0–L5
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            What each agent is allowed to do, and who decides.
          </p>
        </div>
        <span
          className={[
            "rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            safe
              ? "border-accent-800/50 bg-accent-950/30 text-accent-300"
              : "border-rose-700/60 bg-rose-950/40 text-rose-300",
          ].join(" ")}
        >
          {matrix.externalActionCapableCount} agents can act externally
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matrix.rungs.map((rung) => {
          const empty = rung.agents.length === 0;
          return (
            <div
              key={rung.level}
              data-testid={`authority-rung-${rung.level}`}
              className={[
                "rounded-xl border p-3",
                rung.level === "L5"
                  ? "border-dashed border-white/[0.12] bg-white/[0.01]"
                  : "border-white/[0.06] bg-obsidian/50",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-400">
                  {rung.level} · {rung.title}
                </span>
                <span className="text-[10px] text-ink-500">{rung.agents.length}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{rung.description}</p>
              {empty ? (
                <p className="mt-2 rounded bg-white/[0.02] px-2 py-1 text-center text-[10px] text-ink-500">
                  {rung.level === "L5" ? "Declared empty by design" : "No agents at this rung"}
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {rung.agents.map((a) => (
                    <li
                      key={a.id}
                      title={`${a.role} · ${a.status} · risk ${a.riskLevel}`}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-ink-300"
                    >
                      {a.displayName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-ink-500">{matrix.note}</p>
    </section>
  );
}
