/**
 * Helicone "Async" (Custom/Manual Logger) integration for Claude API calls.
 *
 * Round 5 of the repo-leverage audit (docs/ai/airwave/GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md)
 * found that Helicone's Proxy mode is a real single point of failure on the critical
 * path — Helicone's own docs mark Proxy "on the critical path" vs. Async "not on the
 * critical path." So this repo never reroutes the live Claude call through Helicone's
 * proxy; it calls Anthropic/the cloud provider directly (unchanged), then logs the
 * completed request/response pair to Helicone afterward. A Helicone outage can only
 * ever cost a logging entry, never the actual Claude call.
 *
 * Endpoint and body shape verified against Helicone's own docs
 * (https://docs.helicone.ai/integrations/data/curl, checked 2026-09-06):
 *   POST https://api.worker.helicone.ai/custom/v1/log
 *   Authorization: Bearer <HELICONE_API_KEY>
 *   { providerRequest: {url, json, meta}, providerResponse: {json, status, headers},
 *     timing: {startTime, endTime} }  — timestamps as {seconds, milliseconds}.
 *
 * The request/response JSON logged here is RECONSTRUCTED from the already-normalized
 * ClaudeMessagesResult (messages.ts does not retain the literal wire bytes past
 * parsing) — it mirrors Anthropic's real Messages API shape but is not a byte-for-byte
 * capture of what was actually sent/received.
 *
 * Inert by default: every function here is a no-op unless HELICONE_API_KEY is set —
 * flip that one Vercel env var and logging turns on with no further code change.
 */

type Env = Record<string, string | undefined>;

const DEFAULT_HELICONE_LOG_URL = "https://api.worker.helicone.ai/custom/v1/log";
const LOG_TIMEOUT_MS = 3_000;

function toHeliconeTime(ms: number): { seconds: number; milliseconds: number } {
  return { seconds: Math.floor(ms / 1000), milliseconds: ms % 1000 };
}

export interface HeliconeClaudeLogParams {
  readonly modelName: string;
  readonly system: string;
  readonly user: string;
  readonly responseText: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly status: number;
}

/**
 * Log a completed Claude call to Helicone. Never throws and never meaningfully
 * blocks the caller: it no-ops instantly when HELICONE_API_KEY is unset, and is
 * bounded by its own short timeout otherwise. Any failure (network, timeout,
 * non-2xx) is swallowed and warned, never propagated — a logging problem must
 * never turn into a Claude-call problem.
 */
export async function logClaudeCallToHelicone(
  params: HeliconeClaudeLogParams,
  env: Env = process.env,
): Promise<void> {
  const apiKey = env["HELICONE_API_KEY"]?.trim();
  if (!apiKey) return;

  const logUrl = env["HELICONE_LOG_URL"]?.trim() || DEFAULT_HELICONE_LOG_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOG_TIMEOUT_MS);

  try {
    await fetch(logUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerRequest: {
          url: "https://api.anthropic.com/v1/messages",
          json: {
            model: params.modelName,
            system: params.system,
            messages: [{ role: "user", content: params.user }],
          },
          meta: {},
        },
        providerResponse: {
          json: {
            model: params.modelName,
            content: [{ type: "text", text: params.responseText }],
            usage: { input_tokens: params.inputTokens, output_tokens: params.outputTokens },
          },
          status: params.status,
          headers: {},
        },
        timing: {
          startTime: toHeliconeTime(params.startedAtMs),
          endTime: toHeliconeTime(params.completedAtMs),
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    console.warn(
      `Helicone logging failed (non-fatal — the Claude call already completed): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
