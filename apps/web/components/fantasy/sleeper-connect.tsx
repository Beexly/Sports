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
import { BRAND_COLORS } from "@/lib/brand";

const POS_HEX: Record<string, string> = { QB: "#00E5FF", RB: "#7B61FF", WR: "#FF38C7", TE: "#F5F7FF", DEF: "#9fb3c8", K: "#E0A800" };

const STATUS_HEX: Record<ConnectorStatus, string> = {
  live: BRAND_COLORS.orbitalCyan,
  "oauth-gated": BRAND_COLORS.softUltraviolet,
  "licensed-feed": "#E0A800",
  unavailable: "#9fb3c8",
};

type LeagueView = { league: League; standings: readonly StandingRow[]; you: Team | null };
type Avail = Record<string, { rec: "play" | "watchlist" | "no-bet"; band: number }>;
const AVAIL_HEX: Record<"play" | "watchlist" | "no-bet", string> = { play: BRAND_COLORS.orbitalCyan, watchlist: "#E0A800", "no-bet": BRAND_COLORS.ionMagenta };

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
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3" style={{ borderColor: `${BRAND_COLORS.orbitalCyan}44`, background: `${BRAND_COLORS.orbitalCyan}0a` }}>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.orbitalCyan}1c`, color: BRAND_COLORS.orbitalCyan }}>Read-only</span>
        <span className="text-xs text-ink-300">{SLEEPER_READONLY_NOTE}</span>
      </div>

      {/* connect form */}
      <div className="surface-card flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-ink-400">
          Sleeper username
          <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && connect()}
            placeholder="your_sleeper_handle" className="mt-1 block w-56 rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
        </label>
        <label className="text-xs text-ink-400">
          Season
          <input value={season} onChange={(e) => setSeason(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 block w-24 rounded-md border bg-transparent px-3 py-2 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
        </label>
        <button type="button" onClick={connect} disabled={busy || !username.trim()} className="btn btn-primary disabled:opacity-50">
          {busy ? "Connecting…" : "Connect league"}
        </button>
      </div>

      {error && <p className="rounded-lg border p-3 text-sm" style={{ borderColor: `${BRAND_COLORS.ionMagenta}55`, color: BRAND_COLORS.ionMagenta }}>{error}</p>}

      {/* league picker */}
      {leagues && leagues.length > 0 && !view && (
        <div className="surface-card p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-500">Pick a league</p>
          <div className="space-y-2">
            {leagues.map((l) => (
              <button key={l.id} type="button" onClick={() => pick(l)} disabled={busy}
                className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-white/5" style={{ borderColor: BRAND_COLORS.steelGray }}>
                <span className="text-sm font-semibold text-white">{l.name}</span>
                <span className="text-xs text-ink-500">{l.size}-team · {l.status.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* resolved league: standings + your roster */}
      {view && (
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl text-white">{view.league.name}</p>
            <span className="text-xs text-ink-500">{view.league.size}-team · {view.league.status.replace(/_/g, " ")}</span>
            <button type="button" onClick={() => setView(null)} className="ml-auto text-xs text-ink-400 underline-offset-2 hover:underline">← Pick another league</button>
          </div>

          {view.standings.length > 0 && <Standings rows={view.standings} />}

          {view.you ? (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-white">Your roster</p>
                <span className="font-mono text-xs text-ink-400">{view.you.record} · {view.you.points} pts</span>
                <span className="text-[10px] text-ink-600">availability overlay: real injury status + game weather (never a body claim)</span>
              </div>
              <RosterGroup title="Starters" players={view.you.starters} avail={avail} />
              <RosterGroup title="Bench" players={view.you.bench} avail={avail} dim />
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-400">Standings imported. Enter the username that owns a team in this league to resolve your roster.</p>
          )}

          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}44`, background: `${BRAND_COLORS.softUltraviolet}0a` }}>
            <p className="text-xs" style={{ color: BRAND_COLORS.softUltraviolet }}>League imported (read-only).</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
              Live lineup, waiver, and trade recommendations on these real players activate when the licensed
              projections source is wired behind the founder gate. The GM Autopilot then drives this roster —
              still proposal-only, with every move explained, ledgered, and human-approved.
            </p>
            <a href="/fantasy/autopilot" className="mt-2 inline-block text-sm font-medium" style={{ color: BRAND_COLORS.orbitalCyan }}>See how the Autopilot would drive it →</a>
          </div>
        </div>
      )}

      <ConnectorMatrix />
    </div>
  );
}

function Standings({ rows }: { rows: readonly StandingRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: BRAND_COLORS.steelGray }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-ink-600">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Team</th>
            <th className="px-3 py-2 text-right font-medium">Record</th>
            <th className="px-3 py-2 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rosterId} className="border-t" style={{ borderColor: BRAND_COLORS.steelGray, background: r.isYou ? `${BRAND_COLORS.orbitalCyan}0f` : "transparent" }}>
              <td className="px-3 py-2 font-mono text-xs text-ink-500">{r.rank}</td>
              <td className="px-3 py-2">
                <span className={r.isYou ? "font-semibold text-white" : "text-ink-200"}>{r.teamName}</span>
                {r.isYou && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan }}>You</span>}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-ink-300">{r.record}</td>
              <td className="px-3 py-2 text-right font-mono text-xs text-ink-300">{r.points}</td>
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
      <p className="mb-2 text-[10px] uppercase tracking-wider text-ink-600">{title}</p>
      <div className="space-y-1">
        {players.map((p) => {
          const hex = POS_HEX[p.pos] ?? "#9fb3c8";
          const a = avail[p.name.toLowerCase()];
          const flag = a && a.rec !== "play" ? a : null;
          return (
            <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1">
              <span className="w-9 rounded px-1 py-0.5 text-center text-[9px] font-bold" style={{ color: hex, background: `${hex}1c` }}>{p.pos}</span>
              <span className="flex-1 truncate text-sm text-white">{p.name}</span>
              {flag && (
                <span className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: AVAIL_HEX[flag.rec], background: `${AVAIL_HEX[flag.rec]}1c` }} title={`Confidence band widened ~${Math.round(flag.band * 100)}% by public availability + conditions`}>
                  {flag.rec} +{Math.round(flag.band * 100)}%
                </span>
              )}
              {p.injury && <span className="text-[10px] font-semibold uppercase" style={{ color: BRAND_COLORS.ionMagenta }}>{p.injury}</span>}
              <span className="font-mono text-[10px] text-ink-600">{p.team}</span>
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
      <p className="text-xs uppercase tracking-[0.18em] text-ink-500">What else can I connect?</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
        The honest matrix. Sleeper syncs today; everything else is shown with its real legal status. We
        never scrape closed platforms or use unofficial private-cookie endpoints — when something can't be
        synced, we say so and explain why.
      </p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.status}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_HEX[g.status] }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: STATUS_HEX[g.status] }}>{g.label}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map((c) => (
                <div key={c.key} className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-ink-600">{c.kind.replace("-", " ")}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{c.enables}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-600">{c.path ?? c.why}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
