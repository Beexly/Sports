"use client";

/**
 * JarvisChat — real, Claude-powered "Ask Jarvis" chat with optional voice.
 *
 * Advisory only: this UI POSTs questions to /api/cockpit/jarvis/ask and renders
 * the model's grounded answer. It triggers NO actions (no transitions, no
 * publishing, no spending) — the endpoint is read-only and so is this panel.
 *
 * Voice (all feature-detected; degrades to text-only when unavailable):
 *   - STT: Web Speech API SpeechRecognition / webkitSpeechRecognition. The mic
 *          toggle is HIDDEN entirely when the API is absent.
 *   - TTS: window.speechSynthesis reads Jarvis's answer aloud. Off by default;
 *          the speaker toggle is HIDDEN when synthesis is unavailable.
 *
 * Accessibility: labeled icon buttons (aria-label / aria-pressed), an aria-live
 * answer region, and prefers-reduced-motion respected for the "thinking" pulse.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly groundedOn?: readonly string[];
}

interface AskResponse {
  readonly answer?: string;
  readonly modelName?: string;
  readonly groundedOn?: readonly string[];
  readonly error?: string;
}

// Minimal structural typing for the Web Speech API (no DOM lib dependency).
interface SpeechRecognitionResultLike {
  readonly transcript: string;
}
interface SpeechRecognitionAlternativesLike {
  readonly 0: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionAlternativesLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function JarvisChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);

  // Voice capability flags resolve client-side after mount (avoids SSR mismatch).
  const [sttAvailable, setSttAvailable] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakAloud, setSpeakAloud] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSttAvailable(getRecognitionCtor() !== null);
    setTtsAvailable(hasSpeechSynthesis());
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  // Stop any speech + recognition on unmount.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      if (hasSpeechSynthesis()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!hasSpeechSynthesis()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      /* synthesis is best-effort */
    }
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || pending) return;

      setError(null);
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { role: "user", content: question }]);
      setInput("");
      setPending(true);

      try {
        const res = await fetch("/api/cockpit/jarvis/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history }),
        });
        const data = (await res.json().catch(() => ({}))) as AskResponse;

        if (!res.ok || typeof data.answer !== "string") {
          const msg = data.error ?? `Request failed (${res.status}).`;
          setError(msg);
          return;
        }

        if (data.modelName) setModelName(data.modelName);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer as string, groundedOn: data.groundedOn },
        ]);
        if (speakAloud) speak(data.answer);
      } catch {
        setError("Could not reach Jarvis. Your question was not answered and nothing was changed.");
      } finally {
        setPending(false);
      }
    },
    [messages, pending, speakAloud, speak]
  );

  const toggleListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          // Drop the spoken question straight into the input for review/send.
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  const toggleSpeak = useCallback(() => {
    setSpeakAloud((prev) => {
      const next = !prev;
      if (!next && hasSpeechSynthesis()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      }
      return next;
    });
  }, []);

  return (
    <section
      data-testid="jarvis-chat"
      aria-label="Ask Jarvis — advisory chat"
      className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-300">
            Ask Jarvis
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Advisory only · grounded in the live operating state · takes no actions
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {sttAvailable && (
            <button
              type="button"
              onClick={toggleListening}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={listening}
              title={listening ? "Stop voice input" : "Speak your question"}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg border text-sm",
                listening
                  ? "border-rose-500/50 bg-rose-950/40 text-rose-300"
                  : "border-white/[0.10] bg-obsidian/60 text-ink-400 hover:border-white/[0.20]",
              ].join(" ")}
            >
              <span aria-hidden>{listening ? "◉" : "🎙"}</span>
            </button>
          )}
          {ttsAvailable && (
            <button
              type="button"
              onClick={toggleSpeak}
              aria-label={speakAloud ? "Mute spoken answers" : "Read answers aloud"}
              aria-pressed={speakAloud}
              title={speakAloud ? "Spoken answers on" : "Spoken answers off"}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg border text-sm",
                speakAloud
                  ? "border-accent-500/50 bg-accent-950/40 text-accent-300"
                  : "border-white/[0.10] bg-obsidian/60 text-ink-400 hover:border-white/[0.20]",
              ].join(" ")}
            >
              <span aria-hidden>{speakAloud ? "🔊" : "🔈"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Message log */}
      <div
        data-testid="jarvis-chat-log"
        className="mb-3 flex max-h-72 min-h-[3rem] flex-col gap-2 overflow-y-auto pr-1"
      >
        {messages.length === 0 && !pending && (
          <p className="text-[11px] text-ink-500">
            Ask about company health, the decision queue, gates, or what&apos;s wired.
            Jarvis answers from the real operating state and will say &ldquo;I don&apos;t
            have that wired yet&rdquo; rather than guess.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              {...(m.role === "assistant" ? { "aria-live": "polite" as const } : {})}
              className={[
                "max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-accent-900/30 text-accent-50"
                  : "bg-obsidian/60 text-ink-200",
              ].join(" ")}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && m.groundedOn && m.groundedOn.length > 0 && (
                <p className="mt-1.5 text-[9px] uppercase tracking-widest text-ink-600">
                  grounded on: {m.groundedOn.join(" · ")}
                </p>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start" aria-live="polite">
            <div className="rounded-xl bg-obsidian/60 px-3 py-2 text-sm text-ink-400">
              <span className={reducedMotion ? "" : "animate-pulse"}>Jarvis is thinking…</span>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {error && (
        <p role="alert" className="mb-2 text-[11px] text-rose-300">
          {error}
        </p>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor="jarvis-chat-input" className="sr-only">
          Ask Jarvis a question
        </label>
        <input
          id="jarvis-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask Jarvis about the live state…"}
          disabled={pending}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/[0.10] bg-obsidian/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-accent-500/50 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length === 0}
          className="rounded-lg border border-accent-500/40 bg-accent-900/30 px-3 py-2 text-sm font-semibold text-accent-200 hover:bg-accent-900/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-2 text-[9px] uppercase tracking-widest text-ink-600">
        {modelName ? `model: ${modelName} · ` : ""}advisory · no actions taken
      </p>
    </section>
  );
}
