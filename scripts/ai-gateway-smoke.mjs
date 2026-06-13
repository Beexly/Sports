/**
 * AI Gateway smoke test.
 *
 * Verifies the Vercel AI Gateway path works end-to-end via the `ai` SDK.
 * Auth is the Vercel OIDC token (pulled by `vc env pull .env.local`), so no
 * separate AI Gateway API key is needed.
 *
 * Run:
 *   vc env pull .env.local              # pulls VERCEL_OIDC_TOKEN (+ rest)
 *   node --env-file=.env.local scripts/ai-gateway-smoke.mjs
 *
 * Override the model (confirm the exact slug in your Gateway model list):
 *   AI_GATEWAY_MODEL=anthropic/claude-sonnet-4-6 node --env-file=.env.local scripts/ai-gateway-smoke.mjs
 */
import { streamText } from "ai";

const model = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.5";

if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
  console.error(
    "✗ No VERCEL_OIDC_TOKEN (or AI_GATEWAY_API_KEY) in env.\n" +
      "  Run `vc env pull .env.local` first, then `node --env-file=.env.local scripts/ai-gateway-smoke.mjs`.",
  );
  process.exit(1);
}

console.error(`→ AI Gateway smoke test · model: ${model}\n`);

try {
  const result = streamText({
    model,
    prompt: "Explain quantum computing in simple terms.",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");
  console.error("\n✓ Gateway responded.");
} catch (err) {
  console.error(`\n✗ Gateway call failed: ${err?.message ?? err}`);
  console.error(
    "  Common causes: token expired (re-pull), model slug not enabled in the Gateway, or no Gateway access on the project.",
  );
  process.exit(1);
}
