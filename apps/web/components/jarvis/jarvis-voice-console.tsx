"use client";

import { useEffect, useState } from "react";
import {
  buildVoiceProtocolStatus,
  type VoiceProtocolStatus,
} from "@/lib/jarvis/voice-protocol";

/**
 * Jarvis Voice Console — honest placeholder for the voice interface.
 * STT/TTS are NOT wired; this renders the protocol status, command grammar,
 * and privacy rules. Browser SpeechRecognition is feature-detected only —
 * no audio is ever recorded by this component.
 */

export function JarvisVoiceConsole() {
  const [status] = useState<VoiceProtocolStatus>(() => buildVoiceProtocolStatus());
  const [browserSpeech, setBrowserSpeech] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setBrowserSpeech(
      "SpeechRecognition" in w || "webkitSpeechRecognition" in w
    );
  }, []);

  const sttLabel = browserSpeech ? "BROWSER_AVAILABLE" : status.sttStatus;

  return (
    <section
      data-testid="jarvis-voice-console"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Voice Console
        </h2>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          {status.isActive ? "ACTIVE" : "NOT WIRED"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-slate-500">STT</p>
          <p className={browserSpeech ? "font-bold text-yellow-500" : "font-bold text-slate-500"}>
            {sttLabel}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-slate-500">TTS</p>
          <p className="font-bold text-slate-500">{status.ttsStatus}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <p className="text-slate-500">Wake</p>
          <p className="font-bold text-orange-400">{status.wakeMode}</p>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500"
        title="Voice is not wired yet — no audio is recorded."
      >
        Push to Talk — NOT WIRED
      </button>

      <div className="mt-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Supported commands ({status.supportedCommands.length})
        </p>
        <ul className="mt-1 space-y-0.5">
          {status.supportedCommands.map((c) => (
            <li key={c.intent} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-slate-400">{c.phrase}</span>
              <span className={c.safe ? "text-green-400" : "text-yellow-400"}>
                {c.safe ? "read-only" : "needs approval"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Privacy rules
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[10px] text-slate-400">
          {status.privacyRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-slate-500">
          Approval phrase before any write: <span className="font-bold text-yellow-400">&ldquo;{status.approvalPhrase}&rdquo;</span>
        </p>
      </div>
    </section>
  );
}
