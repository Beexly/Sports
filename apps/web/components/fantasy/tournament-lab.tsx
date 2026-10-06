"use client";

/**
 * TournamentLab — the tournament room (Beexly/Sports#795, #798).
 *
 * One stage, two acts on the sample slate: the portfolio simulation (kBest
 * lineups vs a simulated field under flat and top-heavy pay tables) and the
 * post-lock readout (pre-lock lineup vs lateSwap with the first three
 * locked). Sample projections throughout — illustrative, not predictions.
 */

import { useMemo } from "react";
import { kBest, lateSwap } from "@/lib/fantasy/dfs-exact";
import { activeDfsSlate } from "@/lib/integrations/dfs";
import { PortfolioSim } from "./portfolio-sim";
import { PostLockPanel } from "./postlock-panel";
import { StackExposurePanel } from "./stack-exposure-panel";

export function TournamentLab() {
  const { pools, pre, post, locked } = useMemo(() => {
    const slate = activeDfsSlate();
    const pools = kBest({ mode: "gpp" }, 8, slate);
    const pre = pools[0] ?? [];
    const locked = new Set(pre.slice(0, 3).map((p) => p.id));
    const post = pre.length > 0 ? lateSwap(pre, locked, "gpp", slate) : pre;
    return { pools, pre, post, locked };
  }, []);

  return (
    <section aria-label="Tournament lab" className="relative mt-10 overflow-hidden rounded-2xl border border-orbital-cyan/20 p-5 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(0,229,255,0.10), transparent 65%)",
        }}
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-orbital-cyan">
        The tournament lab
      </p>
      <h2 className="mt-1 max-w-2xl font-display text-2xl font-semibold text-ion-white sm:text-4xl">
        Contests are won <span className="gse-editorial" style={{ fontSize: "1.08em" }}>after lock.</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
        Your best eight lineups against a simulated field of one hundred — then the
        late-swap room, where locked players hold and everything else re-optimizes.
        Sample slate throughout: the math is real, the players are illustrative.
      </p>
      <div className="mt-6 grid gap-4">
        <PortfolioSim lineups={pools} />
        <StackExposurePanel lineups={pools} />
        <PostLockPanel pre={pre} post={post} lockedIds={locked} />
      </div>
    </section>
  );
}
