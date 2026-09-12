import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Atmosphere } from "@/components/ui/atmosphere";
import {
  NBA_SLATE,
  NBA_SALARY_CAP,
  NBA_LINEUP_SIZE,
  validateNbaLineup,
} from "@/lib/fantasy/nba-slate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fictional NBA DFS Slate — Validator Demo",
  description:
    "A fictional NBA DFS slate for optimizer and lineup-validation testing. All players, salaries, and projections are invented — not real contest data.",
  alternates: { canonical: "/fantasy/nba" },
};

/**
 * FICTIONAL demo lineup (8 distinct slate players, fills every roster slot
 * under the cap). Validated below at render time; the verdict shown is the
 * validator's, not a hard-coded claim.
 */
const DEMO_LINEUP_IDS = [
  "nba27", // Aaron Steele — PG/SG
  "nba24", // Sean Riley — SG
  "nba13", // Nate Sullivan — SF
  "nba14", // Kyle Benson — PF
  "nba26", // Peter Crane — C
  "nba20", // Trevor Shaw — PG/SG (G)
  "nba21", // Will Osborne — SF/PF (F)
  "nba28", // Jonah Pierce — PF/C (UTIL)
] as const;

export default function NbaFantasyPage() {
  const byId = new Map(NBA_SLATE.map((p) => [p.id, p]));
  const demoLineup = DEMO_LINEUP_IDS.map((id) => byId.get(id)!).filter(Boolean);
  const verdict = validateNbaLineup(demoLineup);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(255,77,46, 0.08), transparent 70%)" }}
          />
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow inline-flex items-center gap-2 text-orbital-cyan">
              <span className="live-dot" />
              Fantasy · NBA · Validator demo
            </p>
            <h1
              className="mt-5 font-display text-balance text-ion-white"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
            >
              A slate that never happened.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ion-1">
              Every player, salary, and projection below is invented for
              optimizer and validation testing — not real contest data.
            </p>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-amber-300">
                Fictional slate — not real contest data
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ion-1">
                All {NBA_SLATE.length} players, salaries, and projections are
                invented. Real NBA team codes appear for roster-shape realism
                only. Salary cap ${NBA_SALARY_CAP.toLocaleString()} · {NBA_LINEUP_SIZE}-man
                DraftKings Classic shape (PG, SG, SF, PF, C, G, F, UTIL).
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="surface-card overflow-hidden">
              <div className="border-b border-titanium px-4 py-3 sm:px-5">
                <h2 className="text-lg font-semibold text-ion-white">The slate</h2>
                <p className="mt-1 text-xs text-ion-2">
                  {NBA_SLATE.length} fictional players · projections in fantasy points
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-titanium font-mono text-[11px] uppercase tracking-wider text-ion-2">
                      <th scope="col" className="px-4 py-3 font-medium">Player</th>
                      <th scope="col" className="px-4 py-3 font-medium">Team</th>
                      <th scope="col" className="px-4 py-3 font-medium">Pos</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Salary</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Proj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NBA_SLATE.map((p) => (
                      <tr key={p.id} className="border-b border-titanium/60 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-ion-white">{p.name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ion-2">{p.team}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ion-1">{p.positions.join("/")}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ion-1">
                          ${p.salary.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ion-1">
                          {p.projection.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="surface-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-ion-white">Validator demo</h2>
              <p className="mt-1 text-sm leading-relaxed text-ion-1">
                An 8-man fictional lineup run through{" "}
                <span className="font-mono text-[13px]">validateNbaLineup</span> at
                render time — the verdict below is the validator&apos;s output.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {demoLineup.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-titanium bg-void/60 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-ion-white">
                      {p.name}{" "}
                      <span className="font-mono text-[11px] font-normal text-ion-2">
                        {p.team} · {p.positions.join("/")}
                      </span>
                    </span>
                    <span className="font-mono text-xs tabular-nums text-ion-2">
                      ${p.salary.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-titanium bg-void/60 px-4 py-3">
                <p className="text-sm font-semibold text-ion-white">
                  Verdict:{" "}
                  <span className={verdict.valid ? "text-orbital-cyan" : "text-ion-magenta"}>
                    {verdict.valid ? "VALID" : "INVALID"}
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs tabular-nums text-ion-2">
                  salary ${verdict.totalSalary.toLocaleString()} / $
                  {NBA_SALARY_CAP.toLocaleString()} · proj{" "}
                  {verdict.totalProjection.toFixed(1)}
                </p>
                {verdict.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-ion-magenta">
                    {verdict.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/fantasy" className="btn btn-ghost">Fantasy home</Link>
                <Link href="/airwave" className="btn btn-ghost">The Airwave Ledger</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
