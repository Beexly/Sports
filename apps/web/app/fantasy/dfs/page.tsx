import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { loadDfsSalaries } from "@/lib/dfs/salaries";
import { loadCurrentDfsSlate } from "@/lib/fantasy/dfs-current-slate";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { LIVE_PACKAGE_CATALOG, getPackageBySlug } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  getActiveUpcomingWriteups,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const metadata: Metadata = {
  title: "DFS Slate Breakdown & Lineup Builder | Galaxy Sports Edge",
  description:
    "Plain-English NFL DFS game-environment breakdowns, target volume notes, cash cores, and tournament stack blueprints.",
  alternates: { canonical: "/fantasy/dfs" },
  robots: { index: false, follow: true },
};

export default async function DfsSuitePage() {
  const [dfs, viewer, slate] = await Promise.all([
    loadDfsSalaries().catch(() => null),
    getViewerEntitlements(),
    loadCurrentDfsSlate().catch(() => null),
  ]);
  const feedConnected = dfs !== null && dfs.status === "live" && dfs.rows.length > 0;
  const salaryIsReal = feedConnected && viewer.canUseFantasyFull;
  const feedDown = dfs === null || dfs.status !== "live" || dfs.rows.length === 0;

  const engineRows = slate?.players ?? [];
  const topRows = salaryIsReal && dfs
    ? dfs.rows.slice(0, 24).map((r) => ({
        name: r.name,
        team: r.team,
        position: r.position,
        salary: r.salary as number | null,
      }))
    : engineRows.slice(0, 24).map((p) => ({
        name: p.name,
        team: p.team || "n/a",
        position: p.pos,
        salary: p.salary > 0 ? p.salary : null,
      }));

  const boardCount = salaryIsReal && dfs ? dfs.rows.length : engineRows.length;
  const slateLabel = slate
    ? `NFL · ${slate.slateGames} game${slate.slateGames === 1 ? "" : "s"} in the window · measured through Week ${slate.measuredThroughWeek}`
    : "Weekly NFL DFS Slate Active";
  const measuredCopy = slate && engineRows.length > 0
    ? `${slateLabel}. Lineup builds start with offensive and defensive line matchups, injury reports, and target roles before comparing against salaries last.`
    : "Our plain-English game-environment breakdowns and DFS lineup packs below cover every game on the slate.";
  const note = feedDown
    ? `Live salary feed is currently offline. ${measuredCopy}`
    : measuredCopy;

  const dfsPackage = getPackageBySlug("week8-all-access") ?? LIVE_PACKAGE_CATALOG[3]!;
  const tnfPackage = getPackageBySlug("tnf-all-in-pack") ?? LIVE_PACKAGE_CATALOG[0]!;

  return (
    <FantasyShell
      eyebrow="Daily Fantasy Football · Game Environments & Lineup Blueprints"
      accent="cyan"
      projectionsBadge={false}
      title={
        <>
          Real Football Matchups First.{" "}
          <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
            Salaries &amp; Ownership Last.
          </span>
        </>
      }
      intro="Football is never played on a spreadsheet. We start with how each game will actually be played on the field — offensive line health, defensive coverage tendencies, injury replacements, and pace of play — before building cash-game cores and tournament stacks."
      note={note}
      wide
    >
      {/* ── SECTION 1: HOW WE BUILD DFS LINEUPS ── */}
      <section
        id="dfs-methodology-writeup"
        data-testid="dfs-writeup-dossier"
        className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8"
      >
        <div className="border-b border-mineral pb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
            How We Build Rosters · Film &amp; Trench Matchups → Target Roles → Salary Cap Last
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
            How We Break Down the Slate for Cash Games &amp; Tournaments
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ion-1">
            Every week we grade how coordinators called the previous game, how injuries change the offensive line and target tree, and which matchups set up for back-and-forth scoring before comparing against DraftKings and FanDuel salaries.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STEP 01</span>
              <span className="text-ion-2">TRENCHES &amp; COVERAGE</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Offensive Line Protection &amp; Secondary Matchups
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Before looking at a single salary, we look at which quarterbacks will have a clean pocket and which secondaries are missing starters on the outside or over the middle.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STEP 02</span>
              <span className="text-ion-2">PACE &amp; TARGET ROLES</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Tempo, Injury Replacements &amp; Red-Zone Usage
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              When a starting receiver, tight end, or lineman is ruled out, targets and carries condense fast. We track who stays on the field in two-minute drills and inside the ten-yard line.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STEP 03</span>
              <span className="text-ion-2">GAME ENVIRONMENTS</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Stacking Games That Push the Pace
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Tournament-winning lineups come from games where both offenses push each other to keep throwing in the fourth quarter, lifting the quarterback, his top two pass-catchers, and an opposing bring-back.
            </p>
          </div>

          <div className="border border-mineral/70 bg-carbon p-5">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-plasma">STEP 04</span>
              <span className="text-ion-2">SALARY &amp; OWNERSHIP LAST</span>
            </div>
            <h3 className="mt-2 font-semibold text-ion-white">
              Cash Cores, Showdown Captains &amp; Tournament Stacks
            </h3>
            <p className="mt-2 text-xs leading-5 text-ion-1">
              Only at the end do we compare our football reads against the salary cap to build steady cash-game cores, Showdown Captain picks, and tournament stacks.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: GAME-BY-GAME DFS ENVIRONMENT PREVIEWS (FREE STORYLINES ONLY) ── */}
      <section className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mineral pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
              Game-by-Game Matchup &amp; Pace Preview (Free)
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white">
              Every Slate Game Previewed: Tempo, Trench Notes &amp; Stack Setup
            </h2>
          </div>
          <span className="border border-plasma/40 bg-plasma/10 px-3 py-1 font-mono text-xs text-plasma">
            Official Picks &amp; Full Lineups Locked in Packs Below
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {getActiveUpcomingWriteups().map((w) => (
            <div key={w.id} className="border border-mineral/70 bg-carbon p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral/50 pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-plasma">
                    {formatWindowSlotLabel(w.windowSlot, w.matchup)}
                  </span>
                  <h3 className="mt-0.5 font-display text-xl font-semibold text-ion-white">
                    {w.matchup}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="border border-mineral bg-eclipse px-2.5 py-1 text-ion-1">
                    Pace: <strong className="text-ion-white">{w.paceOfPlay.neutralSecPerSnap}s / snap</strong>
                  </span>
                  <span className="border border-plasma/40 bg-plasma/10 px-2.5 py-1 text-plasma">
                    🔒 Official Spread, Total &amp; DFS Stack Locked
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-orbital-cyan">
                    Pace &amp; Clock Control
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ion-1">
                    {sanitizePlainFootballText(w.paceOfPlay.notes)}
                  </p>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-orbital-cyan">
                    Line of Scrimmage &amp; Matchup Storyline
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ion-1">
                    {sanitizePlainFootballText(w.schemeMatchup.coverageShell)}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-mineral/40 pt-3 font-mono text-xs text-plasma">
                🔒 Showdown Captain Picks, Cash Core, Tournament Stack &amp; Official Game Calls Unlock Below
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: IN-PLACE PAYWALL REVEAL CARDS FOR DFS & ALL-ACCESS PACKS ── */}
      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
              Instant On-Screen Unlock · Cash Cores, Showdown Captains &amp; Tournament Stacks
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white">
              Unlock Full DFS Lineup Cores &amp; Official Game Picks
            </h2>
          </div>
          <Link href="/packages" className="font-mono text-xs text-orbital-cyan underline">
            View All Football Packs →
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PaywallRevealCard
            pkg={dfsPackage}
            teasers={getRedactedTeasersForWindowSlot(dfsPackage.windowSlot)}
          />
          <PaywallRevealCard
            pkg={tnfPackage}
            teasers={getRedactedTeasersForWindowSlot(tnfPackage.windowSlot)}
          />
        </div>
      </section>

      {/* ── SECTION 4: ENTITLEMENT-GATED SALARY & PLAYER POOL LEDGER ── */}
      <section id="salary-board" className="surface-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ion-white">
            Player Pool &amp; Salary Board Status
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-orbital-cyan">
            {salaryIsReal
              ? `Licensed DFS feed · ${boardCount} priced rows`
              : `${boardCount} active players · salaries gated`}
          </span>
        </div>

        <p className="mt-1 text-sm text-ion-1">
          {salaryIsReal
            ? "Salaries come from the connected licensed DFS feed."
            : "Unlock the All-Access Pass above to reveal our full DFS cash cores, Showdown Captain picks, and tournament stacks."}
        </p>
        {feedConnected && !viewer.canUseFantasyFull && (
          <p className="mt-2 text-sm text-ion-1">
            The licensed salary feed is live. Full pricing unlocks with a{" "}
            <a href="/packages" className="text-orbital-cyan underline">pack purchase</a>.
          </p>
        )}
        {slate && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ion-2">{slateLabel}</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-widest text-ion-2">
                <th scope="col" className="py-1.5 pr-4 font-medium">Player</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Team</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Pos</th>
                <th scope="col" className="py-1.5 font-medium">Salary</th>
              </tr>
            </thead>
            <tbody className="text-ion-1">
              {topRows.map((r) => (
                <tr key={`${r.name}-${r.team}`} className="border-t border-mineral/60">
                  <td className="py-1.5 pr-4 text-ion-white">{r.name}</td>
                  <td className="py-1.5 pr-4">{r.team}</td>
                  <td className="py-1.5 pr-4 font-mono text-xs">{r.position}</td>
                  <td className="py-1.5 font-mono">{r.salary !== null ? `$${r.salary.toLocaleString()}` : "n/a"}</td>
                </tr>
              ))}
              {topRows.length === 0 && (
                <tr className="border-t border-mineral/60">
                  <td className="py-3 text-ion-2" colSpan={4}>
                    Unlock a DFS-enabled pack above to reveal our Showdown Captains, cash cores, and tournament stacks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </FantasyShell>
  );
}
