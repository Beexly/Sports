"use client";

/**
 * SleeperConnect — read-only league import.
 *
 * Enter your Sleeper username → pick a league → see your real roster, resolved
 * from Sleeper's public API. We never write to your league. Live recommendations
 * on real players activate when the licensed projections source is wired
 * (founder-gated); this proves the sync and shows the roster.
 */

import { useState } from "react";
import {
  sleeper, normalizeUser, normalizeLeague, normalizeRoster, rosterForUser,
  SLEEPER_READONLY_NOTE, type League, type Team, type SleeperPlayersMap,
} from "@/lib/integrations/sleeper";
import { BRAND_COLORS } from "@/lib/brand";

const POS_HEX: Record<string, string> = { QB: "#00E5FF", RB: "#7A5CFF", WR: "#FF2DD6", TE: "#F6F7FA", DEF: "#9fb3c8", K: "#E0A800" };

// cache the heavy (~5MB) player map for the session
let PLAYERS_CACHE: SleeperPlayersMap | null = null;

export function SleeperConnect() {
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState("2025");
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [team, setTeam] = useState<{ league: League; team: Team } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!username.trim()) return;
    setBusy(true); setError(null); setLeagues(null); setTeam(null);
    try {
      const user = normalizeUser(await sleeper.getUser(username.trim()));
      setUserId(user.id);
      const ls = (await sleeper.getLeagues(user.id, season)).map(normalizeLeague);
      setLeagues(ls);
      if (ls.length === 0) setError(`No NFL leagues found for "${username}" in ${season}. Try another season.`);
    } catch {
      setError("Couldn't reach Sleeper or find that username. Check the spelling and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (league: League) => {
    setBusy(true); setError(null);
    try {
      const [rosters, players] = await Promise.all([
        sleeper.getRosters(league.id),
        PLAYERS_CACHE ? Promise.resolve(PLAYERS_CACHE) : sleeper.getPlayers(),
      ]);
      PLAYERS_CACHE = players;
      const raw = userId ? rosterForUser(rosters, userId) : null;
      if (!raw) { setError("Couldn't find your roster in that league."); return; }
      setTeam({ league, team: normalizeRoster(raw, players) });
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
      {leagues && leagues.length > 0 && !team && (
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

      {/* resolved roster */}
      {team && (
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-xl text-white">{team.league.name}</p>
            <span className="text-xs text-ink-500">{team.league.size}-team</span>
            <span className="ml-auto font-mono text-sm text-ink-300">{team.team.record} · {team.team.points} pts</span>
          </div>

          <RosterGroup title="Starters" players={team.team.starters} />
          <RosterGroup title="Bench" players={team.team.bench} dim />

          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}44`, background: `${BRAND_COLORS.softUltraviolet}0a` }}>
            <p className="text-xs" style={{ color: BRAND_COLORS.softUltraviolet }}>Roster imported (read-only).</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
              Live lineup, waiver, and trade recommendations on these real players activate when the licensed
              projections source is wired behind the founder gate. The GM Autopilot then drives this roster —
              still proposal-only, with every move explained, ledgered, and human-approved.
            </p>
            <a href="/fantasy/autopilot" className="mt-2 inline-block text-sm font-medium" style={{ color: BRAND_COLORS.orbitalCyan }}>See how the Autopilot would drive it →</a>
          </div>
        </div>
      )}
    </div>
  );
}

function RosterGroup({ title, players, dim }: { title: string; players: Team["starters"]; dim?: boolean }) {
  if (players.length === 0) return null;
  return (
    <div className="mt-4" style={{ opacity: dim ? 0.7 : 1 }}>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-ink-600">{title}</p>
      <div className="space-y-1">
        {players.map((p) => {
          const hex = POS_HEX[p.pos] ?? "#9fb3c8";
          return (
            <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1">
              <span className="w-9 rounded px-1 py-0.5 text-center text-[9px] font-bold" style={{ color: hex, background: `${hex}1c` }}>{p.pos}</span>
              <span className="flex-1 truncate text-sm text-white">{p.name}</span>
              {p.injury && <span className="text-[10px] font-semibold uppercase" style={{ color: BRAND_COLORS.ionMagenta }}>{p.injury}</span>}
              <span className="font-mono text-[10px] text-ink-600">{p.team}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
