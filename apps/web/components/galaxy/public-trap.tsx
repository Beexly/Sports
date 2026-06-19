"use client";

import { useState } from "react";
import { PUBLIC_TRAP_SCENARIOS, type TrapSide } from "@sports/galaxy-engine";
import { GALAXY } from "@/lib/galaxy/theme";

interface StepResult {
  resisted: boolean;
  teaching: string;
  outcome: { result: "WIN" | "LOSS" | "PUSH"; reward: { xp: number; credits: number } };
}
interface BossResult {
  result: {
    cleared: boolean;
    resistedCount: number;
    totalSteps: number;
    totalXp: number;
    totalCredits: number;
    steps: StepResult[];
  };
  merchUnlocked: { sku: string; name: string } | null;
  questsCompleted: string[];
}

type Answer = { chosen: TrapSide | null; confidence: number };

export function PublicTrapBoss() {
  const [answers, setAnswers] = useState<Record<string, Answer>>(
    Object.fromEntries(PUBLIC_TRAP_SCENARIOS.map((s) => [s.id, { chosen: null, confidence: 60 }])),
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BossResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = PUBLIC_TRAP_SCENARIOS.every((s) => answers[s.id]?.chosen != null);

  function set(id: string, patch: Partial<Answer>) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
  }

  async function fight() {
    if (!allAnswered) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        answers: PUBLIC_TRAP_SCENARIOS.map((s) => ({
          scenarioId: s.id,
          chosen: answers[s.id]!.chosen,
          confidence: answers[s.id]!.confidence,
        })),
      };
      const res = await fetch("/api/galaxy/boss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The Trap held.");
      setResult(data as BossResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The Trap held.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const r = result.result;
    return (
      <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 16, padding: 22 }}>
        <h2 style={{ marginTop: 0, color: r.cleared ? GALAXY.cyan : GALAXY.magenta }}>
          {r.cleared ? "The Public Trap — CLEARED" : "The Public Trap held"}
        </h2>
        <p style={{ color: GALAXY.text }}>
          You read value over the crowd on{" "}
          <strong style={{ color: GALAXY.gold }}>
            {r.resistedCount}/{r.totalSteps}
          </strong>{" "}
          steps.
        </p>
        <div style={{ display: "flex", gap: 16, fontWeight: 700 }}>
          <span style={{ color: GALAXY.cyan }}>+{r.totalXp} XP</span>
          <span style={{ color: GALAXY.gold }}>+{r.totalCredits} Credits</span>
        </div>
        {result.merchUnlocked && (
          <p style={{ marginTop: 12, color: GALAXY.gold }}>
            🎖 Merch unlocked: <strong>{result.merchUnlocked.name}</strong> — claim it in the Merch Foundry.
          </p>
        )}
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {r.steps.map((s, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: s.resisted ? GALAXY.text : GALAXY.textMuted,
                borderLeft: `3px solid ${s.resisted ? GALAXY.cyan : GALAXY.magenta}`,
                paddingLeft: 10,
              }}
            >
              {s.teaching}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <a href="/galaxy/dynasty" style={{ color: GALAXY.cyan }}>
            View My Dynasty →
          </a>
          {!r.cleared && (
            <button
              onClick={() => setResult(null)}
              style={{ background: "transparent", border: `1px solid ${GALAXY.border}`, color: GALAXY.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {PUBLIC_TRAP_SCENARIOS.map((s) => {
        const a = answers[s.id]!;
        return (
          <div key={s.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontWeight: 800, color: GALAXY.text }}>{s.matchup}</div>
            <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 2 }}>
              {Math.round(s.publicPct * 100)}% of the crowd is on one side.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => set(s.id, { chosen: "PUBLIC" })}
                style={choiceStyle(a.chosen === "PUBLIC", GALAXY.magenta)}
              >
                {s.publicLabel}
                <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 4 }}>Follow the crowd</div>
              </button>
              <button
                onClick={() => set(s.id, { chosen: "VALUE" })}
                style={choiceStyle(a.chosen === "VALUE", GALAXY.cyan)}
              >
                {s.valueLabel}
                <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 4 }}>Read the value</div>
              </button>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: GALAXY.textMuted }}>Confidence</span>
              <input
                type="range"
                min={1}
                max={99}
                value={a.confidence}
                onChange={(e) => set(s.id, { confidence: Number(e.target.value) })}
                style={{ flex: 1, accentColor: GALAXY.gold }}
                aria-label={`Confidence for ${s.matchup}`}
              />
              <span style={{ fontSize: 12, color: GALAXY.gold, fontWeight: 700, width: 36 }}>{a.confidence}%</span>
            </div>
          </div>
        );
      })}

      {error && <p style={{ color: GALAXY.magenta, fontSize: 13 }}>{error}</p>}

      <button
        onClick={fight}
        disabled={!allAnswered || busy}
        style={{
          padding: 14,
          borderRadius: 12,
          border: "none",
          background: allAnswered ? GALAXY.magenta : GALAXY.border,
          color: allAnswered ? GALAXY.void : GALAXY.textMuted,
          fontWeight: 800,
          fontSize: 16,
          cursor: allAnswered && !busy ? "pointer" : "not-allowed",
        }}
      >
        {busy ? "Facing the Trap…" : "Face The Public Trap"}
      </button>
    </div>
  );
}

function choiceStyle(selected: boolean, accent: string): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${selected ? accent : GALAXY.border}`,
    background: selected ? `${accent}14` : "transparent",
    color: GALAXY.text,
    cursor: "pointer",
    fontWeight: 700,
  };
}
