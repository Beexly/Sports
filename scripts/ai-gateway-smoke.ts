/**
 * AI Gateway smoke test (TypeScript / tsx variant).
 *
 * Same purpose as ai-gateway-smoke.mjs, but loads creds from a .env via
 * `dotenv/config` and prints token usage. Auth is either the Vercel OIDC token
 * (from `vc env pull`) or an AI_GATEWAY_API_KEY in .env.
 *
 * Run (npm workspace — use npx, not pnpm):
 *   vc env pull .env.local
 *   npx tsx scripts/ai-gateway-smoke.ts
 *   # or: npm run ai:smoke
 *
 * Override the model (confirm the slug is enabled in your Gateway model list):
 *   AI_GATEWAY_MODEL=anthropic/claude-sonnet-4-6 npx tsx scripts/ai-gateway-smoke.ts
 */
import "dotenv/config";
import { streamText } from "ai";

const model = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.4";

async function main(): Promise<void> {
  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
    console.error(
      "✗ No VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY found.\n" +
        "  Run `vc env pull .env.local` (OIDC) or put AI_GATEWAY_API_KEY in .env, then re-run.",
    );
    process.exit(1);
  }

  console.error(`→ AI Gateway smoke test · model: ${model}\n`);

  const result = streamText({
    model,
    prompt: "Invent a new holiday and describe its traditions.",
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
  console.log();
  console.log("Token usage:", await result.usage);
}

main().catch((err) => {
  console.error(`\n✗ Gateway call failed: ${err?.message ?? err}`);
  process.exit(1);
});
