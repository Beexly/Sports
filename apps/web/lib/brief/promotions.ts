/**
 * Promotions composer — turns operator-supplied promotion offers into
 * a brief-ready PROMOTIONS section with structured disclosures.
 *
 * Every promo item includes its disclaimer; the composer is constrained
 * to surface promos with measured language and explicit terms-and-
 * conditions. No hype, no implied guarantee.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const MODEL = "claude-haiku-4-5";
const VERSION = "promotions/v1";

const SYSTEM_PROMPT = `You compose a brief-ready promotions section from operator-supplied offers.
Each offer has: book (sportsbook name), headline, terms, source URL.
You produce:
  - summary: one measured sentence saying how many offers are present (no hype)
  - items: structured list with each offer's clear value statement and required disclosure

Hard constraints:
  - Reference ONLY the supplied offers. Never invent offers or terms.
  - Use measured language. Never imply a guaranteed win or free money.
  - Every item.valueStatement must NOT contain words like "guaranteed", "lock",
    "risk-free", or "sure thing". Always include the offer's terms in item.disclosure.
  - Cap at 8 items.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          book: { type: "string" },
          headline: { type: "string" },
          valueStatement: { type: "string" },
          disclosure: { type: "string" },
        },
        required: ["book", "headline", "valueStatement", "disclosure"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "items"],
  additionalProperties: false,
} as const;

const MAX_ITEMS = 8;
const MAX_OFFERS = 12;

export interface PromotionOffer {
  readonly book: string;
  readonly headline: string;
  readonly terms: string;
  readonly sourceUrl?: string;
}

export interface PromotionItem {
  readonly book: string;
  readonly headline: string;
  readonly valueStatement: string;
  readonly disclosure: string;
}

export interface PromotionsReport {
  readonly summary: string;
  readonly items: readonly PromotionItem[];
  readonly composerVersion: string;
  readonly model: string;
  readonly composedAt: string;
}

export interface PromotionsInput {
  readonly offers: readonly PromotionOffer[];
}

interface Raw {
  readonly summary: string;
  readonly items: PromotionItem[];
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

/**
 * Compose PROMOTIONS items from operator-supplied offers. Throws on
 * empty offers (no spend when there's nothing to surface).
 */
export async function composePromotions(
  input: PromotionsInput
): Promise<PromotionsReport> {
  if (input.offers.length === 0) {
    throw new Error("composePromotions requires at least one offer");
  }
  const client = getClient();
  const offers = input.offers.slice(0, MAX_OFFERS);

  const offersBlock = offers
    .map(
      (o, i) =>
        `${i + 1}. ${o.book} — ${o.headline}\n   TERMS: ${o.terms}${o.sourceUrl ? `\n   SOURCE: ${o.sourceUrl}` : ""}`
    )
    .join("\n\n");

  const response = await withTelemetry(
    { callSite: "promotions", model: MODEL },
    () =>
      client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content: `OFFERS:\n${offersBlock}\n\nReturn JSON matching the schema. Disclosure on every item.`,
          },
        ],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) throw new Error("No text content in promotions response");
  const parsed = JSON.parse(textBlock.text) as Raw;

  return {
    summary: parsed.summary,
    items: parsed.items.slice(0, MAX_ITEMS),
    composerVersion: VERSION,
    model: MODEL,
    composedAt: new Date().toISOString(),
  };
}
