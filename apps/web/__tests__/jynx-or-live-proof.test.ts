import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

// LIVE end-to-end proof — deliberately NOT mocked. Calls the real OpenRouter
// free endpoint with the real key from apps/web/.env.local (gitignored).
// Run: npx vitest run __tests__/jynx-or-live-proof.test.ts --no-file-parallelism
// NOTE: skips when .env.local is absent (CI / other machines) so it never breaks
// the suite; the gate is identical to provider-config's (OPENROUTER_API_KEY).

const envPath = ".env.local";
const localEnvRaw = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
// Skip on CI / machines without the local lane env; never break the suite.
const hasLocalEnv = localEnvRaw.includes("OPENROUTER_API_KEY=");

describe.skipIf(!hasLocalEnv)("Jynx OpenRouter lane (live)", () => {
  it("routes content through the OpenRouter free host with the real key", async () => {
    // Load env into process.env BEFORE importing the module (vitest run does not
    // auto-load .env.local for the module graph).
    for (const line of localEnvRaw.split("\n")) {
      const i = line.indexOf("=");
      if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
    }
    const { generateContentMessages } = await import("@/lib/claude-api/free-lane");

    expect(process.env.OPENROUTER_API_KEY?.length ?? 0).toBeGreaterThan(10);

    const result = await generateContentMessages(
      {
        surface: "content",
        apiKey: "unused-for-or",
        system: "You are a terse assistant. Reply with one short sentence.",
        user: "Say exactly: jynx-or-lane-live",
        maxTokens: 60,
        temperature: 0,
      },
      process.env
    );

    expect(result.modelName).toMatch(/^free-openrouter\//);
    expect(result.text).toContain("jynx-or-lane-live");
    console.log("LIVE OK — modelName:", result.modelName);
    console.log("LIVE OK — text:", JSON.stringify(result.text));
    console.log(
      "LIVE OK — tokens:",
      result.inputTokens,
      "in /",
      result.outputTokens,
      "out |",
      result.durationMs,
      "ms"
    );
  }, 60_000);
});