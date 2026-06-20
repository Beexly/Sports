"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface SprintQ {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
  tag: string;
}
interface Reveal {
  id: string;
  tag: string;
  correct: boolean;
  explanation: string;
}
interface Result {
  reveals: Reveal[];
  correctCount: number;
  total: number;
  xp: number;
  credits: number;
  strongTags: string[];
  weakTags: string[];
}

export function SignalSprint({ questions }: { questions: SprintQ[] }) {
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ id: string; choice: "A" | "B" }[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setPhase("play"); setIdx(0); setAnswers([]); setResult(null); setError(null);
  }

  async function pick(choice: "A" | "B") {
    if (busy) return;
    const q = questions[idx]!;
    const next = [...answers, { id: q.id, choice }];
    setAnswers(next);
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      return;
    }
    // submit
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/galaxy/sprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Sprint failed.");
      setResult(data as Result);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sprint failed.");
      setPhase("intro");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "intro") {
    return (
      <div style={card()}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, color: GALAXY.gold, fontWeight: 800 }}>FEATURED · SIGNAL SPRINT</div>
        <h2 style={{ margin: "6px 0 4px", fontSize: 24 }}>5 reads. Beat the buzzer.</h2>
        <p style={{ color: GALAXY.textMuted, marginTop: 0, maxWidth: 560 }}>
          Five rapid sports-intelligence prompts — injury signals, public traps, sample
          size, card heat. Build your sports brain map. Pure sports-IQ training —
          sharpen the read.
        </p>
        {error && <p style={{ color: GALAXY.magenta, fontSize: 13 }}>{error}</p>}
        <button onClick={start} style={primary()}>Start the Sprint</button>
      </div>
    );
  }

  if (phase === "play") {
    const q = questions[idx]!;
    return (
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GALAXY.textMuted }}>
          <span>SIGNAL SPRINT</span>
          <span>{idx + 1} / {questions.length}</span>
        </div>
        <div style={{ height: 6, background: GALAXY.border, borderRadius: 99, margin: "8px 0 14px", overflow: "hidden" }}>
          <div style={{ width: `${(idx / questions.length) * 100}%`, height: "100%", background: GALAXY.gold }} />
        </div>
        <div style={{ fontSize: 11, color: GALAXY.cyan, fontWeight: 700, letterSpacing: 0.5 }}>{q.tag.toUpperCase()}</div>
        <div style={{ fontSize: 18, fontWeight: 700, margin: "6px 0 14px" }}>{q.prompt}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => pick("A")} disabled={busy} style={choice()}>{q.optionA}</button>
          <button onClick={() => pick("B")} disabled={busy} style={choice()}>{q.optionB}</button>
        </div>
      </div>
    );
  }

  // done
  const r = result!;
  return (
    <div style={card()}>
      <h2 style={{ marginTop: 0, color: GALAXY.gold }}>
        Sprint complete — {r.correctCount}/{r.total}
      </h2>
      <div style={{ display: "flex", gap: 16, fontWeight: 700, marginBottom: 8 }}>
        <span style={{ color: GALAXY.cyan }}>+{r.xp} XP</span>
        <span style={{ color: GALAXY.gold }}>+{r.credits} Credits</span>
      </div>
      {r.strongTags.length > 0 && (
        <p style={{ fontSize: 13, color: GALAXY.textMuted }}>
          Strong: <span style={{ color: GALAXY.cyan }}>{[...new Set(r.strongTags)].join(", ")}</span>
        </p>
      )}
      {r.weakTags.length > 0 && (
        <p style={{ fontSize: 13, color: GALAXY.textMuted }}>
          Work on: <span style={{ color: GALAXY.magenta }}>{[...new Set(r.weakTags)].join(", ")}</span>
        </p>
      )}
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {r.reveals.map((rv) => (
          <div key={rv.id} style={{ fontSize: 13, color: GALAXY.textMuted, borderLeft: `3px solid ${rv.correct ? GALAXY.cyan : GALAXY.magenta}`, paddingLeft: 10 }}>
            <strong style={{ color: rv.correct ? GALAXY.cyan : GALAXY.magenta }}>{rv.tag}</strong> — {rv.explanation}
          </div>
        ))}
      </div>
      <button onClick={start} style={{ ...primary(), marginTop: 14 }}>Run it back</button>
    </div>
  );
}

function card(): React.CSSProperties {
  return { background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 16, padding: 20 };
}
function primary(): React.CSSProperties {
  return { marginTop: 12, padding: "12px 24px", borderRadius: 10, border: "none", background: GALAXY.gold, color: GALAXY.void, fontWeight: 800, fontSize: 15, cursor: "pointer" };
}
function choice(): React.CSSProperties {
  return { textAlign: "left", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${GALAXY.border}`, background: "transparent", color: GALAXY.text, cursor: "pointer", fontWeight: 700, fontSize: 14 };
}
