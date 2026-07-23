"use client";

/**
 * SleeperConnect — read-only league import.
 *
 * Enter your Sleeper username → pick a league → see your league's standings and
 * your real roster, resolved from Sleeper's public API. The fetch + the heavy
 * player map run SERVER-SIDE (see /api/sleeper/*), governed by the legal source
 * registry; we never write to your league. Live recommendations on real players
 * activate when the licensed projections source is wired (founder-gated); this
 * proves the sync and shows the roster. Below the sync, the connector matrix
 * states honestly what else can — and can't — be connected, and why.
 */

import { useEffect, useState } from "react";
import { SLEEPER_READONLY_NOTE, type League, type Team } from "@/lib/integrations/sleeper";
import type { StandingRow } from "@/lib/integrations/sleeper-sync";
import { connectorsByStatus, type ConnectorStatus } from "@/lib/integrations/connectors";

// Position identity (design tokens) — the same accent poles the draft tools use.
// Plasma here is identity (WR), never a warning.
const POS_TONE: Record<string, string> = { QB: "var(--orbital-cyan)", RB: "var(--ultraviolet)", WR: "var(--plasma)", TE: "var(--ion-white)", DEF: "var(--ion-1)", K: "var(--caution)" };

// Connector status: live = a real data read (cyan), OAuth = gated depth
// (ultraviolet), licensed-feed = pending review (caution), unavailable = muted.
const STATUS_TONE: Record<ConnectorStatus, string> = {
  live: "var(--orbital-cyan)",
  "oauth-gated": "var(--ultraviolet)",
  "licensed-feed": "var(--caution)",
  unavailable: "var(--ion-2)",
};

type LeagueView = { league: League; standings: readonly StandingRow[]; you: Team | null };
type Avail = Record<string, { rec: "play" | "watchlist" | "no-bet"; band: number }>;
// Availability verdicts are semantic: play = verify, watchlist = caution,
// no-bet = alert. Never plasma for a risk state.
const AVAIL_TONE: Record<"play" | "watchlist" | "no-bet", string> = { play: "var(--verify)", watchlist: "var(--caution)", "no-bet": "var(--alert)" };

export function SleeperConnect() {
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState("2025");
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [view, setView] = useState<LeagueView | null>(null);
  const [avail, setAvail] = useState<Avail>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overlay the Human Performance availability read (real injury status + game
  // weather) onto the synced roster, once it loads. Lazy + best-effort.
  useEffect(() => {
    const you = view?.you;
    if (!you) { setAvail({}); return; }
    const players = [...you.starters, ...you.bench].map((p) => ({ name: p.name, team: p.team }));
    if (players.length === 0) return;
    let active = true;
    fetch("/api/human/roster-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!active || !j?.data?.rows) return;
        const map: Avail = {};
        for (const row of j.data.rows as { player: string; modifier: { recommendation: Avail[string]["rec"]; bandWidenPct: number } }[]) {
          map[row.player.toLowerCase()] = { rec: row.modifier.recommendation, band: row.modifier.bandWidenPct };
        }
        setAvail(map);
      })
      .catch(() => { if (active) setAvail({}); });
    return () => { active = false; };
  }, [view]);

  const connect = async () => {
    const handle = username.trim();
    if (!handle) return;
    setBusy(true); setError(null); setLeagues(null); setView(null); setUserId(null);
    try {
      const res = await fetch(`/api/sleeper/leagues?username=${encodeURIComponent(handle)}&season=${season}`);
      const json = await res.json();
      const data = json?.data;
      if (!data || data.status === "source-error") {
        setError("Couldn't reach Sleeper. Please try again in a moment.");
        return;
      }
      if (data.status === "not-found" || !data.user) {
        setError(`No Sleeper user "${handle}". Check the spelling and try again.`);
        return;
      }
      setUserId(data.user.id);
      setLeagues(data.leagues);
      if (data.leagues.length === 0) setError(`No NFL leagues found for "${handle}" in ${season}. Try another season.`);
    } catch {
      setError("Couldn't reach Sleeper or find that username. Check the spelling and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (league: League) => {
    setBusy(true); setError(null);
    try {
      const qs = `leagueId=${encodeURIComponent(league.id)}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`;
      const res = await fetch(`/api/sleeper/league?${qs}`);
      const json = await res.json();
      const data = json?.data;
      if (!data || data.status === "source-error" || !data.league) {
        setError("Couldn't load that league's rosters from Sleeper.");
        return;
      }
      setView({ league: data.league, standings: data.standings, you: data.you });
    } catch {
      setError("Couldn't load that league's rosters from Sleeper.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* read-only guarantee */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-orbital-cyan/25 bg-orbital-cyan/5 p-3">
        <span className="rounded-full bg-orbital-cyan/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-orbital-cyan">Read-only</span>
        <span className="text-xs text-ion-1">{SLEEPER_READONLY_NOTE}</span>
      </div>

      {/* connect form */}
      <div className="surface-card flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-ion-1">
          Sleeper username
          <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && connect()}
            placeholder="your_sleeper_handle" className="mt-1 block w-56 rounded-md border border-mineral bg-transparent px-3 py-2 text-sm text-ion-white" />
        </label>
        <label className="text-xs text-ion-1">
          Season
          <input value={season} onChange={(e) => setSeason(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 block w-24 rounded-md border border-mineral bg-transparent px-3 py-2 text-sm text-ion-white" />
        </label>
        <button type="button" onClick={connect} disabled={busy || !username.trim()} aria-busy={busy} className="btn btn-primary disabled:opacity-50">
          {busy ? "Connecting…" : "Connect league"}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-alert/30 p-3 text-sm text-alert">{error}</p>}

      {/* league picker */}
      {leagues && leagues.length > 0 && !view && (
        <div className="surface-card p-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">Pick a league</p>
          <div className="space-y-2">
            {leagues.map((l) => (
              <button key={l.id} type="button" onClick={() => pick(l)} disabled={busy}
                className="flex w-full items-center justify-between rounded-lg border border-mineral p-3 text-left transition-colors hover:bg-white/5">
                <span className="text-sm font-semibold text-ion-white">{l.name}</span>
                <span className="text-xs text-ion-2">{l.size}-team · {l.status.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* resolved league: standings + your roster */}
      {view && (
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl text-ion-white">{view.league.name}</p>
            <span className="text-xs text-ion-2">{view.league.size}-team · {view.league.status.replace(/_/g, " ")}</span>
            <button type="button" onClick={() => setView(null)} className="ml-auto text-xs text-ion-1 underline-offset-2 hover:underline">← Pick another league</button>
          </div>

          {view.standings.length > 0 && <Standings rows={view.standings} />}

          {view.you ? (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-ion-white">Your roster</p>
                <span className="font-mono text-xs tabular-nums text-ion-1">{view.you.record} · {view.you.points} pts</span>
                <span className="text-[10px] text-ion-2">availability overlay: real injury status + game weather (never a body claim)</span>
              </div>
              <RosterGroup title="Starters" players={view.you.starters} avail={avail} />
              <RosterGroup title="Bench" players={view.you.bench} avail={avail} dim />
            </>
          ) : (
            <p className="mt-4 text-sm text-ion-1">Standings imported. Enter the username that owns a team in this league to resolve your roster.</p>
          )}

          <div className="mt-4 rounded-lg border border-ultraviolet/25 bg-ultraviolet/5 p-3">
            <p className="text-xs text-ultraviolet">League imported (read-only).</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ion-1">
              Live lineup, waiver, and trade recommendations on these real players activate when the licensed
              projections source is wired behind the founder gate. The GM Autopilot then drives this roster:
              still proposal-only, with every move explained, ledgered, and human-approved.
            </p>
            <a href="/fantasy/autopilot" className="mt-2 inline-block text-sm font-medium text-orbital-cyan">See how the Autopilot would drive it →</a>
          </div>
        </div>
      )}

      <ConnectorMatrix />
    </div>
  );
}

function Standings({ rows }: { rows: readonly StandingRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-mineral">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-wider text-ion-2">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Team</th>
            <th className="px-3 py-2 text-right font-medium">Record</th>
            <th className="px-3 py-2 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rosterId} className="border-t border-mineral" style={{ background: r.isYou ? "color-mix(in srgb, var(--orbital-cyan) 6%, transparent)" : "transparent" }}>
              <td className="px-3 py-2 font-mono text-xs tabular-nums text-ion-2">{r.rank}</td>
              <td className="px-3 py-2">
                <span className={r.isYou ? "font-semibold text-ion-white" : "text-ion-1"}>{r.teamName}</span>
                {r.isYou && <span className="ml-2 font-mono text-[9px] font-bold uppercase tracking-wider text-orbital-cyan">You</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ion-1">{r.record}</td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ion-1">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterGroup({ title, players, avail, dim }: { title: string; players: Team["starters"]; avail: Avail; dim?: boolean }) {
  if (players.length === 0) return null;
  return (
    <div className="mt-4" style={{ opacity: dim ? 0.7 : 1 }}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ion-2">{title}</p>
      <div className="space-y-1">
        {players.map((p) => {
          const tone = POS_TONE[p.pos] ?? "var(--ion-1)";
          const a = avail[p.name.toLowerCase()];
          const flag = a && a.rec !== "play" ? a : null;
          return (
            <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1">
              <span className="w-9 rounded px-1 py-0.5 text-center font-mono text-[9px] font-bold" style={{ color: tone, background: `color-mix(in srgb, ${tone} 11%, transparent)` }}>{p.pos}</span>
              <span className="flex-1 truncate text-sm text-ion-white">{p.name}</span>
              {flag && (
                <span className="rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider" style={{ color: AVAIL_TONE[flag.rec], background: `color-mix(in srgb, ${AVAIL_TONE[flag.rec]} 11%, transparent)` }} title={`Confidence band widened ~${Math.round(flag.band * 100)}% by public availability + conditions`}>
                  {flag.rec} +{Math.round(flag.band * 100)}%
                </span>
              )}
              {/* injury is a risk state — alert, never plasma */}
              {p.injury && <span className="font-mono text-[10px] font-semibold uppercase text-alert">{p.injury}</span>}
              <span className="font-mono text-[10px] text-ion-2">{p.team}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorMatrix() {
  const groups = connectorsByStatus();
  return (
    <div className="surface-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">What else can I connect?</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ion-1">
        The honest matrix. Sleeper syncs today; everything else is shown with its real legal status. We
        never scrape closed platforms or use unofficial private-cookie endpoints. When something can't be
        synced, we say so and explain why.
      </p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.status}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_TONE[g.status] }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: STATUS_TONE[g.status] }}>{g.label}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map((c) => (
                <div key={c.key} className="rounded-lg border border-mineral p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ion-white">{c.name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ion-2">{c.kind.replace("-", " ")}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ion-1">{c.enables}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ion-2">{c.path ?? c.why}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
