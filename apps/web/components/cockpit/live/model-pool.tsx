/**
 * ModelPool — the multi-provider LLM pool, shown live.
 *
 * Jarvis runs on a free multi-provider pool — never single-sourced. This strip
 * reports availability FROM ENV PRESENCE ONLY, computed here (it intentionally
 * imports no other agent's model-pool module):
 *
 *   - Pollinations is keyless, so it is always LIVE.
 *   - Every other provider shows LIVE when its API-key env var is PRESENT, or
 *     "add key" when ABSENT.
 *
 * HONESTY: this reads `process.env[...]` only to test `.trim().length > 0`. It
 * NEVER renders, logs, or transmits a key value — present/absent is the entire
 * signal. Server component (env is server-only); no client JS, no secrets in the
 * payload sent to the browser.
 */

interface ProviderRow {
  readonly name: string;
  readonly envVar: string | null; // null = keyless
  readonly note: string;
}

// Keyless first (always live), then the keyed providers in the order the brief lists.
const PROVIDERS: readonly ProviderRow[] = [
  { name: "Pollinations", envVar: null, note: "keyless · always live" },
  { name: "Cerebras", envVar: "CEREBRAS_API_KEY", note: "fast inference lane" },
  { name: "Groq", envVar: "GROQ_API_KEY", note: "low-latency lane" },
  { name: "DeepSeek", envVar: "DEEPSEEK_API_KEY", note: "reasoning lane" },
  { name: "OpenRouter", envVar: "OPENROUTER_API_KEY", note: "broad model router" },
  { name: "Together", envVar: "TOGETHER_API_KEY", note: "open-weight lane" },
  { name: "Gemini", envVar: "GEMINI_API_KEY", note: "Google lane" },
  { name: "Anthropic", envVar: "ANTHROPIC_API_KEY", note: "Claude · review/content lane" },
];

/** Present/absent only — never the value. */
function keyPresent(envVar: string): boolean {
  return (process.env[envVar] ?? "").trim().length > 0;
}

export function ModelPool() {
  const rows = PROVIDERS.map((p) => ({
    ...p,
    live: p.envVar === null ? true : keyPresent(p.envVar),
  }));
  const liveCount = rows.filter((r) => r.live).length;

  return (
    <div className="surface-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent-300">
            Model pool
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Jarvis runs on a free multi-provider pool — never single-sourced.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-200">
          {liveCount}/{rows.length} live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.name}
            className={[
              "flex flex-col gap-1 rounded-lg border px-3 py-2.5",
              row.live
                ? "border-emerald-700/30 bg-emerald-950/15"
                : "border-white/[0.06] bg-white/[0.02]",
            ].join(" ")}
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                {row.live && (
                  <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-emerald-400/70" />
                )}
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${row.live ? "bg-emerald-400" : "bg-ink-600"}`}
                />
              </span>
              <span className="truncate text-xs font-semibold text-white">{row.name}</span>
            </div>
            <span
              className={[
                "font-mono text-[9px] font-bold uppercase tracking-widest",
                row.live ? "text-emerald-300" : "text-ink-500",
              ].join(" ")}
            >
              {row.live ? "live" : "add key"}
            </span>
            <span className="text-[10px] leading-tight text-ink-600">{row.note}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-ink-600">
        Status is computed from environment-variable presence only — never from any key value. A key is
        never rendered, logged, or sent to the browser. &ldquo;add key&rdquo; means the provider&apos;s
        env var is absent in this deployment; the keyless Pollinations lane keeps the pool live regardless.
      </p>
    </div>
  );
}
