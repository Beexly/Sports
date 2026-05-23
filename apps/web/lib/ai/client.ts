/**
 * Shared Anthropic client factory.
 *
 * Each consumer gets its OWN isolated singleton — vitest can swap the
 * generator's, reviewer's, and slate-overview's clients independently.
 * The factory just collapses the singleton + lazy-init + maxRetries +
 * test-escape boilerplate that every Claude call site otherwise
 * re-implements verbatim.
 *
 * Usage:
 *   const { get: getClient, setForTests: __setClientForTests } =
 *     makeAnthropicHolder();
 *   export { __setClientForTests };
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicHolder {
  /** Lazy-init the singleton; throws if ANTHROPIC_API_KEY is missing. */
  get(): Anthropic;
  /** Vitest escape hatch — swap or clear the singleton. */
  setForTests(client: Anthropic | undefined): void;
}

export function makeAnthropicHolder(): AnthropicHolder {
  let client: Anthropic | undefined;

  return {
    get(): Anthropic {
      if (client) return client;
      const apiKey = process.env["ANTHROPIC_API_KEY"];
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }
      client = new Anthropic({ apiKey, maxRetries: 3 });
      return client;
    },
    setForTests(c: Anthropic | undefined): void {
      client = c;
    },
  };
}
