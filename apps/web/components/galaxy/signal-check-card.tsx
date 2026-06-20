"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface SignalOption {
  readonly key: "A" | "B";
  readonly label: string;
  readonly sublabel?: string;
}

interface BreakdownRow {
  label: string;
  value: string;
  impact: "positive" | "neutral" | "negative";
}

interface SignalCheckResult {
  outcome: {
    result: "WIN" | "LOSS" | "PUSH";
    correct: boolean | null;
    reward: { xp: number; credits: number; calibrationScore: number | null; explanation: string };
    breakdown: BreakdownRow[];
  };
  reward: { newBalance: number; characterLeveledUp: boolean; skillLeveledUp: boolean };
  questsCompleted: string[];
}

const impactColor = (i: "positive" | "neutral" | "negative") =>
  i === "positive" ? GALAXY.cyan : i === "negative" ? GALAXY.magenta : GALAXY.textMuted;

function confidenceLabel(c: number): string {
  if (c >= 70) return "Conviction";
  if (c >= 55) return "Read";
  return "Lean";
}

export function SignalCheckCard({
  surface,
  title,
  context,
  optionA,
  optionB,
  scenarioId,
  questionId,
  reveal,
  proIntel,
  isPro,
}: {
  surface: "WAR_ROOM" | "BLACKTOP" | "ACADEMY";
  title: string;
  context: string;
  optionA: SignalOption;
  optionB: SignalOption;
  scenarioId?: string;
  questionId?: string;
  /** Optional text revealed after grading (lesson / final). */
  reveal?: string;
  /** GSE Pro "deeper read" intel (vision, not the answer). */
  proIntel?: string;
  /** Whether the viewer has GSE Pro/Elite. */
  isPro?: boolean;
}) {
  const [choice, setChoice] = useState<"A" | "B" | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SignalCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/galaxy/signal-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surface, scenarioId, questionId, option: choice, confidence }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Signal Check failed.");
      setResult(data as SignalCheckResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signal Check failed.");
    } finally {
      setBusy(false);
    }
  }

  const options = [optionA, optionB];

  return (
    <div
      style={{
        background: GALAXY.panel,
        border: `1px solid ${GALAXY.border}`,
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 1.5, color: GALAXY.gold, fontWeight: 700 }}>
        SIGNAL CHECK
      </div>
      <h2 style={{ margin: "6px 0 4px", fontSize: 22, color: GALAXY.text }}>{title}</h2>
      <p style={{ color: GALAXY.textMuted, marginTop: 0 }}>{context}</p>

      {proIntel && !result && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 10,
            border: `1px solid ${isPro ? GALAXY.cyan : GALAXY.border}55`,
            background: isPro ? `${GALAXY.cyan}10` : "rgba(255,255,255,0.02)",
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1, color: GALAXY.cyan, fontWeight: 700 }}>
            GSE PRO · SHARP READ
          </div>
          {isPro ? (
            <div style={{ fontSize: 13, color: GALAXY.text, marginTop: 4 }}>{proIntel}</div>
          ) : (
            <div style={{ fontSize: 13, color: GALAXY.textMuted, marginTop: 4 }}>
              Pro unlocks the deeper read — the context a sharp weighs before the call.{" "}
              <a href="/pricing" style={{ color: GALAXY.cyan }}>See GSE Pro →</a>{" "}
              <span style={{ color: GALAXY.textMuted }}>(Pro = vision, never the answer.)</span>
            </div>
          )}
        </div>
      )}

      {!result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            {options.map((o) => {
              const selected = choice === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => setChoice(o.key)}
                  disabled={busy}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1.5px solid ${selected ? GALAXY.gold : GALAXY.border}`,
                    background: selected ? `${GALAXY.gold}14` : "transparent",
                    color: GALAXY.text,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{o.label}</div>
                  {o.sublabel && (
                    <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 4 }}>
                      {o.sublabel}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: GALAXY.textMuted }}>How sure are you?</span>
              <span style={{ color: GALAXY.gold, fontWeight: 700 }}>
                {confidence}% · {confidenceLabel(confidence)}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={99}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              disabled={busy}
              style={{ width: "100%", accentColor: GALAXY.gold, marginTop: 8 }}
              aria-label="Confidence"
            />
            <div style={{ fontSize: 11, color: GALAXY.textMuted }}>
              Calibration is the game — match your confidence to how sure you really are.
            </div>
          </div>

          {error && <p style={{ color: GALAXY.magenta, fontSize: 13 }}>{error}</p>}

          <button
            onClick={submit}
            disabled={!choice || busy}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: choice ? GALAXY.gold : GALAXY.border,
              color: choice ? GALAXY.void : GALAXY.textMuted,
              fontWeight: 800,
              fontSize: 15,
              cursor: choice && !busy ? "pointer" : "not-allowed",
            }}
          >
            {busy ? "Grading…" : "Make the call"}
          </button>
        </>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 800,
              background:
                result.outcome.result === "WIN"
                  ? `${GALAXY.cyan}22`
                  : result.outcome.result === "LOSS"
                    ? `${GALAXY.magenta}22`
                    : `${GALAXY.border}`,
              color:
                result.outcome.result === "WIN"
                  ? GALAXY.cyan
                  : result.outcome.result === "LOSS"
                    ? GALAXY.magenta
                    : GALAXY.textMuted,
            }}
          >
            {result.outcome.result}
          </div>

          <p style={{ color: GALAXY.text, marginTop: 12 }}>{result.outcome.reward.explanation}</p>

          {/* Glass-box breakdown (transparent grading — bible §4.3) */}
          <div
            style={{
              marginTop: 12,
              border: `1px solid ${GALAXY.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {result.outcome.breakdown.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  borderTop: i === 0 ? "none" : `1px solid ${GALAXY.border}`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: GALAXY.textMuted }}>{row.label}</span>
                <span style={{ color: impactColor(row.impact), fontWeight: 700 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 14 }}>
            <span style={{ color: GALAXY.cyan, fontWeight: 700 }}>+{result.outcome.reward.xp} XP</span>
            <span style={{ color: GALAXY.gold, fontWeight: 700 }}>
              +{result.outcome.reward.credits} Credits
            </span>
            {result.reward.skillLeveledUp && (
              <span style={{ color: GALAXY.violet, fontWeight: 700 }}>Skill level up!</span>
            )}
            {result.reward.characterLeveledUp && (
              <span style={{ color: GALAXY.violet, fontWeight: 700 }}>Rank up!</span>
            )}
          </div>

          {result.questsCompleted.length > 0 && (
            <p style={{ color: GALAXY.gold, fontSize: 13, marginTop: 8 }}>
              Quest complete: {result.questsCompleted.join(", ")}
            </p>
          )}

          {reveal && <p style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 8 }}>{reveal}</p>}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/galaxy/dynasty"
              style={{
                padding: "9px 14px",
                borderRadius: 9,
                border: `1px solid ${GALAXY.border}`,
                color: GALAXY.text,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              View My Dynasty →
            </a>
            <button
              onClick={() => {
                setResult(null);
                setChoice(null);
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 9,
                border: `1px solid ${GALAXY.border}`,
                background: "transparent",
                color: GALAXY.textMuted,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Run another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
