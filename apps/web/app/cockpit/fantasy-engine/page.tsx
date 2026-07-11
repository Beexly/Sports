import { loadMlbFantasyBoards, type BoardSection } from "@/lib/cockpit/fantasy-mlb-boards";
import type { BurrScore, RvsScore, SmashTier } from "@sports/fantasy-engine";

/**
 * Cockpit Fantasy Engine — LIVE MLB boards from the glass-box engine.
 *
 * Founder-gated by the cockpit layout (ADMIN role). Every number here is
 * computed on demand through the rights machinery: clearance gates →
 * SourceClearanceProof-requiring adapters → SMASH/BURR/RVS. Raw MLB payloads
 * are compute-and-discard (registry: derived-analytics only) — this page
 * renders our derived scores and the REQUIRED attribution strings.
 *
 * Honesty markers: a refused clearance renders as BLOCKED with the codes; a
 * dead upstream renders as UNAVAILABLE with the reason. Never an empty board
 * dressed as a quiet slate.
 */
export const dynamic = "force-dynamic";
// Cold compute fetches two Savant CSVs + paginated statsapi (can take ~30s+).
export const maxDuration = 60;

const TIER_CLASSES: Record<SmashTier, string> = {
  ELITE: "text-emerald-300",
  GREEN: "text-emerald-500",
  WHITE: "text-ion-1",
  RED: "text-red-400",
  AVOID: "text-red-500",
};

function TierBadge({ tier }: { tier: SmashTier | null }) {
  if (tier === null) return <span className="text-ion-3">UNRATED</span>;
  return <span className={TIER_CLASSES[tier]}>{tier}</span>;
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-ion-3">{title}</h2>
      <p className="mb-3 text-[11px] leading-relaxed text-ion-2">{subtitle}</p>
      {children}
    </section>
  );
}

function DegradedState<T>({ section }: { section: BoardSection<T> }) {
  if (section.status === "blocked") {
    return (
      <p className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-[11px] text-yellow-200">
        Clearance refused — no fetch was attempted. Blocks: {section.blocks.join(", ")}
      </p>
    );
  }
  if (section.status === "unavailable") {
    return (
      <p className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
        Upstream unavailable — board withheld rather than fabricated. {section.reason}
      </p>
    );
  }
  return null;
}

const TOP_N = 25;

export default async function CockpitFantasyEnginePage() {
  const boards = await loadMlbFantasyBoards();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-ion-1">Fantasy Engine — MLB boards (live)</h1>
        <p className="text-[11px] text-ion-3">
          Season {boards.season} · computed {boards.computedAt} · glass-box: published weights and
          thresholds, population z-scores — the reader can re-derive every number. Raw MLB data is
          never stored (derived analytics only).
        </p>
      </header>

      <SectionShell
        title="SMASH — hitters"
        subtitle="Skills-over-results index (xwOBA, barrel%, hard-hit%, K%, BB%, whiff%), 50±10 over the qualified population."
      >
        {boards.hitters.status !== "ok" ? (
          <DegradedState section={boards.hitters} />
        ) : (
          <SmashTable rows={boards.hitters.data.slice(0, TOP_N)} />
        )}
      </SectionShell>

      <SectionShell
        title="SMASH — pitchers"
        subtitle="The suppression view of the same six skills; higher = more dominant arm."
      >
        {boards.pitchers.status !== "ok" ? (
          <DegradedState section={boards.pitchers} />
        ) : (
          <SmashTable rows={boards.pitchers.data.slice(0, TOP_N)} />
        )}
      </SectionShell>

      <SectionShell
        title="BURR — bullpen matchup index"
        subtitle="14-category league-normalized bullpen strength; 1.00 = league average, higher = stronger pen (worse for opposing hitters)."
      >
        {boards.bullpens.status !== "ok" ? (
          <DegradedState section={boards.bullpens} />
        ) : (
          <BurrTable rows={boards.bullpens.data} />
        )}
      </SectionShell>

      <SectionShell
        title="RVS — reliever value (closer grid)"
        subtitle="Leverage-weighted volume (SV + 0.7·HLD), percentile skill (K−BB%, FIP), conversion reliability; public role rules."
      >
        {boards.relievers.status !== "ok" ? (
          <DegradedState section={boards.relievers} />
        ) : (
          <RvsTable rows={boards.relievers.data.slice(0, TOP_N)} />
        )}
      </SectionShell>

      <footer className="rounded-lg border border-titanium/40 bg-eclipse/40 px-3 py-2 text-[10px] text-ion-3">
        {boards.attributions.map((a) => (
          <p key={a}>{a}</p>
        ))}
        <p>
          Boards are derived analytics computed by Galaxy Sports Edge; source facts fetched under
          the Scraping Clearance Engine and discarded after computation.
        </p>
      </footer>
    </div>
  );
}

function SmashTable({
  rows,
}: {
  rows: ReadonlyArray<{ name: string; pa: number; score: { smash: number; tier: SmashTier | null } }>;
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] uppercase tracking-widest text-ion-3">
          <th scope="col" className="py-1 pr-4 font-medium">#</th>
          <th scope="col" className="py-1 pr-4 font-medium">Player</th>
          <th scope="col" className="py-1 pr-4 font-medium">PA</th>
          <th scope="col" className="py-1 pr-4 font-medium">SMASH</th>
          <th scope="col" className="py-1 font-medium">Tier</th>
        </tr>
      </thead>
      <tbody className="text-ion-1">
        {rows.map((r, i) => (
          <tr key={`${r.name}-${i}`} className="border-t border-titanium/20">
            <td className="py-1 pr-4 text-ion-3">{i + 1}</td>
            <td className="py-1 pr-4">{r.name}</td>
            <td className="py-1 pr-4">{Number.isFinite(r.pa) ? r.pa : "—"}</td>
            <td className="py-1 pr-4 font-mono">
              {Number.isFinite(r.score.smash) ? r.score.smash.toFixed(1) : "—"}
            </td>
            <td className="py-1">
              <TierBadge tier={r.score.tier} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BurrTable({ rows }: { rows: readonly BurrScore[] }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] uppercase tracking-widest text-ion-3">
          <th scope="col" className="py-1 pr-4 font-medium">Rank</th>
          <th scope="col" className="py-1 pr-4 font-medium">Team</th>
          <th scope="col" className="py-1 font-medium">BURR</th>
        </tr>
      </thead>
      <tbody className="text-ion-1">
        {rows.map((r) => (
          <tr key={r.team} className="border-t border-titanium/20">
            <td className="py-1 pr-4 text-ion-3">{r.rank}</td>
            <td className="py-1 pr-4">{r.team}</td>
            <td className="py-1 font-mono">{r.burr.toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RvsTable({
  rows,
}: {
  rows: ReadonlyArray<{ playerName: string; teamName: string | null; score: RvsScore }>;
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-[10px] uppercase tracking-widest text-ion-3">
          <th scope="col" className="py-1 pr-4 font-medium">#</th>
          <th scope="col" className="py-1 pr-4 font-medium">Reliever</th>
          <th scope="col" className="py-1 pr-4 font-medium">Team</th>
          <th scope="col" className="py-1 pr-4 font-medium">Role</th>
          <th scope="col" className="py-1 pr-4 font-medium">Solds</th>
          <th scope="col" className="py-1 pr-4 font-medium">Conv%</th>
          <th scope="col" className="py-1 font-medium">RVS</th>
        </tr>
      </thead>
      <tbody className="text-ion-1">
        {rows.map((r, i) => (
          <tr key={r.score.id} className="border-t border-titanium/20">
            <td className="py-1 pr-4 text-ion-3">{i + 1}</td>
            <td className="py-1 pr-4">{r.playerName}</td>
            <td className="py-1 pr-4">{r.teamName ?? "—"}</td>
            <td className="py-1 pr-4">{r.score.role}</td>
            <td className="py-1 pr-4 font-mono">{r.score.solds}</td>
            <td className="py-1 pr-4 font-mono">
              {r.score.soldsPct === null ? "—" : `${(r.score.soldsPct * 100).toFixed(0)}%`}
            </td>
            <td className="py-1 font-mono">{r.score.rvs.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
