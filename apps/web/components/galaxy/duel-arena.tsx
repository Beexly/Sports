"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface DuelScenario {
  id: string;
  matchup: string;
  market: string;
  optionA: string;
  optionB: string;
}
interface OpenDuel {
  id: string;
  prompt: string;
  creatorHandle: string;
}

interface DuelResult {
  resolution: {
    winner: "CREATOR" | "OPPONENT" | "TIE";
    creator: { points: number };
    opponent: { points: number };
    rationale: string;
  };
  youWon: boolean;
  opponentHandle: string;
  newRating: number;
  ratingDelta: number;
  ratingTier: string;
  creditsAwarded: number;
}

export function DuelArena({ scenarios, openDuels }: { scenarios: DuelScenario[]; openDuels: OpenDuel[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]!;
  const [option, setOption] = useState<"A" | "B">("A");
  const [confidence, setConfidence] = useState(65);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/galaxy/duel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Duel failed.");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duel failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function duelGhost() {
    const data = await post({ action: "ghost", scenarioId, option, confidence });
    if (data?.duel) setResult(data.duel as DuelResult);
  }
  async function createOpen() {
    const data = await post({ action: "create", scenarioId, option, confidence });
    if (data?.created) setNotice("Open duel posted — another player can now challenge your read.");
  }
  async function challenge(duelId: string) {
    const data = await post({ action: "join", duelId, option, confidence });
    if (data?.duel) setResult(data.duel as DuelResult);
  }

  return (
    <div>
      {/* Read setup */}
      <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18 }}>
        <label style={{ fontSize: 12, color: GALAXY.textMuted }}>Pick a game to read</label>
        <select
          value={scenarioId}
          onChange={(e) => { setScenarioId(e.target.value); setResult(null); }}
          style={{ display: "block", marginTop: 6, padding: "9px 12px", borderRadius: 9, background: GALAXY.void, color: GALAXY.text, border: `1px solid ${GALAXY.border}`, width: "100%", maxWidth: 420 }}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.matchup} — {s.market}</option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          {(["A", "B"] as const).map((k) => {
            const label = k === "A" ? scenario.optionA : scenario.optionB;
            const selected = option === k;
            return (
              <button key={k} onClick={() => setOption(k)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${selected ? GALAXY.gold : GALAXY.border}`, background: selected ? `${GALAXY.gold}14` : "transparent", color: GALAXY.text, cursor: "pointer", fontWeight: 700 }}>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: GALAXY.textMuted }}>Confidence</span>
          <input type="range" min={1} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ flex: 1, accentColor: GALAXY.gold }} aria-label="Confidence" />
          <span style={{ fontSize: 12, color: GALAXY.gold, fontWeight: 700, width: 36 }}>{confidence}%</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={duelGhost} disabled={busy} style={primaryBtn(GALAXY.gold)}>
            {busy ? "…" : "Duel a Ghost"}
          </button>
          <button onClick={createOpen} disabled={busy} style={outlineBtn()}>
            Post open duel
          </button>
        </div>
        {notice && <p style={{ color: GALAXY.cyan, fontSize: 13, marginTop: 10 }}>{notice}</p>}
        {error && <p style={{ color: GALAXY.magenta, fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 16, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18 }}>
          <h3 style={{ marginTop: 0, color: result.resolution.winner === "TIE" ? GALAXY.textMuted : result.youWon ? GALAXY.cyan : GALAXY.magenta }}>
            {result.resolution.winner === "TIE" ? "Draw" : result.youWon ? "You won the duel" : "You lost the duel"} vs {result.opponentHandle}
          </h3>
          <div style={{ display: "flex", gap: 16, fontSize: 14, flexWrap: "wrap" }}>
            <span>Your score: <strong style={{ color: GALAXY.text }}>{result.resolution.creator.points}</strong></span>
            <span>Opponent: <strong style={{ color: GALAXY.text }}>{result.resolution.opponent.points}</strong></span>
            <span style={{ color: result.ratingDelta >= 0 ? GALAXY.cyan : GALAXY.magenta, fontWeight: 700 }}>
              Rating {result.ratingDelta >= 0 ? "+" : ""}{result.ratingDelta} → {result.newRating} ({result.ratingTier})
            </span>
            <span style={{ color: GALAXY.gold, fontWeight: 700 }}>+{result.creditsAwarded} Credits</span>
          </div>
          <p style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 8 }}>{result.resolution.rationale}</p>
          <button onClick={() => setResult(null)} style={{ ...outlineBtn(), marginTop: 8 }}>Run another</button>
        </div>
      )}

      {/* Open duels */}
      <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginTop: 26 }}>OPEN DUELS</h2>
      {openDuels.length === 0 ? (
        <p style={{ color: GALAXY.textMuted, fontSize: 14 }}>
          No open duels right now — post one above, or duel a Ghost to climb the ladder.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {openDuels.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div>
                <div style={{ fontSize: 14, color: GALAXY.text }}>{d.prompt}</div>
                <div style={{ fontSize: 12, color: GALAXY.textMuted }}>by @{d.creatorHandle}</div>
              </div>
              <button onClick={() => challenge(d.id)} disabled={busy} style={primaryBtn(GALAXY.magenta)}>
                Challenge
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function primaryBtn(accent: string): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: accent, color: GALAXY.void, fontWeight: 800, cursor: "pointer", fontSize: 14 };
}
function outlineBtn(): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: `1px solid ${GALAXY.border}`, background: "transparent", color: GALAXY.text, fontWeight: 700, cursor: "pointer", fontSize: 14 };
}
