"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export interface BossScenarioView {
  id: string;
  matchup: string;
  trapLabel: string;
  valueLabel: string;
  biasPct: number;
}
export interface BossView {
  key: string;
  name: string;
  bias: string;
  blurb: string;
  merchName: string;
  scenarios: BossScenarioView[];
}

type Side = "TRAP" | "VALUE";
type Answer = { chosen: Side | null; confidence: number };

interface StepResult {
  resisted: boolean;
  teaching: string;
}
interface BossResult {
  result: {
    bossName: string;
    cleared: boolean;
    resistedCount: number;
    totalSteps: number;
    totalXp: number;
    totalCredits: number;
    steps: StepResult[];
  };
  merchUnlocked: { sku: string; name: string } | null;
}

export function BossEncounter({ bosses }: { bosses: BossView[] }) {
  const [activeKey, setActiveKey] = useState(bosses[0]?.key ?? "");
  const boss = bosses.find((b) => b.key === activeKey) ?? bosses[0]!;
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BossResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectBoss(key: string) {
    setActiveKey(key);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  function set(id: string, patch: Partial<Answer>) {
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { chosen: null, confidence: 60 }), ...patch } }));
  }

  const allAnswered = boss.scenarios.every((s) => answers[s.id]?.chosen != null);

  async function fight() {
    if (!allAnswered) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/galaxy/boss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bossKey: boss.key,
          answers: boss.scenarios.map((s) => ({
            scenarioId: s.id,
            chosen: answers[s.id]!.chosen,
            confidence: answers[s.id]?.confidence ?? 60,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "The boss held.");
      setResult(data as BossResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The boss held.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Boss selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {bosses.map((b) => {
          const active = b.key === boss.key;
          return (
            <button
              key={b.key}
              onClick={() => selectBoss(b.key)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? GALAXY.magenta : GALAXY.border}`,
                background: active ? `${GALAXY.magenta}1a` : "transparent",
                color: active ? GALAXY.text : GALAXY.textMuted,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {b.name}
            </button>
          );
        })}
      </div>

      <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{boss.name}</div>
        <div style={{ fontSize: 12, color: GALAXY.magenta, fontWeight: 700, marginTop: 2 }}>
          Bias: {boss.bias}
        </div>
        <div style={{ color: GALAXY.textMuted, fontSize: 14, marginTop: 6 }}>{boss.blurb}</div>
      </div>

      {result ? (
        <BossResultView result={result} onReset={() => { setResult(null); setAnswers({}); }} />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {boss.scenarios.map((s) => {
            const a = answers[s.id] ?? { chosen: null, confidence: 60 };
            return (
              <div key={s.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 700 }}>{s.matchup}</div>
                <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 2 }}>
                  {Math.round(s.biasPct * 100)}% lean one way.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                  <button onClick={() => set(s.id, { chosen: "TRAP" })} style={choiceStyle(a.chosen === "TRAP", GALAXY.magenta)}>
                    {s.trapLabel}
                    <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 4 }}>Follow the bias</div>
                  </button>
                  <button onClick={() => set(s.id, { chosen: "VALUE" })} style={choiceStyle(a.chosen === "VALUE", GALAXY.cyan)}>
                    {s.valueLabel}
                    <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 4 }}>Read the value</div>
                  </button>
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: GALAXY.textMuted }}>Confidence</span>
                  <input type="range" min={1} max={99} value={a.confidence} onChange={(e) => set(s.id, { confidence: Number(e.target.value) })} style={{ flex: 1, accentColor: GALAXY.gold }} aria-label={`Confidence for ${s.matchup}`} />
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
            {busy ? "Facing the boss…" : `Face ${boss.name}`}
          </button>
        </div>
      )}
    </div>
  );
}

function BossResultView({ result, onReset }: { result: BossResult; onReset: () => void }) {
  const r = result.result;
  return (
    <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 16, padding: 20 }}>
      <h2 style={{ marginTop: 0, color: r.cleared ? GALAXY.cyan : GALAXY.magenta }}>
        {r.bossName} — {r.cleared ? "CLEARED" : "held"}
      </h2>
      <p style={{ color: GALAXY.text }}>
        Resisted the bias on <strong style={{ color: GALAXY.gold }}>{r.resistedCount}/{r.totalSteps}</strong> steps.
      </p>
      <div style={{ display: "flex", gap: 16, fontWeight: 700 }}>
        <span style={{ color: GALAXY.cyan }}>+{r.totalXp} XP</span>
        <span style={{ color: GALAXY.gold }}>+{r.totalCredits} Credits</span>
      </div>
      {result.merchUnlocked && (
        <p style={{ marginTop: 12, color: GALAXY.gold }}>
          🎖 Unlocked: <strong>{result.merchUnlocked.name}</strong> — claim it in the Merch Foundry.
        </p>
      )}
      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {r.steps.map((s, i) => (
          <div key={i} style={{ fontSize: 13, color: s.resisted ? GALAXY.text : GALAXY.textMuted, borderLeft: `3px solid ${s.resisted ? GALAXY.cyan : GALAXY.magenta}`, paddingLeft: 10 }}>
            {s.teaching}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <a href="/galaxy/dynasty" style={{ color: GALAXY.cyan }}>View My Dynasty →</a>
        <button onClick={onReset} style={{ background: "transparent", border: `1px solid ${GALAXY.border}`, color: GALAXY.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          Pick another boss
        </button>
      </div>
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
