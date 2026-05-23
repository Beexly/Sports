import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import { makeAnthropicHolder } from "@/lib/ai/client";

describe("makeAnthropicHolder", () => {
  beforeEach(() => {
    delete process.env["ANTHROPIC_API_KEY"];
  });
  afterEach(() => {
    delete process.env["ANTHROPIC_API_KEY"];
  });

  it("throws when ANTHROPIC_API_KEY is missing", () => {
    const holder = makeAnthropicHolder();
    expect(() => holder.get()).toThrow("ANTHROPIC_API_KEY is not configured");
  });

  it("reuses the injected client across calls (singleton semantics)", () => {
    const fake = { messages: { create: () => null } } as unknown as Anthropic;
    const holder = makeAnthropicHolder();

    holder.setForTests(fake);

    expect(holder.get()).toBe(fake);
    expect(holder.get()).toBe(fake);
  });

  it("clears the injected client when setForTests is called with undefined", () => {
    const fake = { messages: { create: () => null } } as unknown as Anthropic;
    const holder = makeAnthropicHolder();

    holder.setForTests(fake);
    expect(holder.get()).toBe(fake);

    // Clear; next get() would try a real init, which without an API key throws.
    holder.setForTests(undefined);
    expect(() => holder.get()).toThrow("ANTHROPIC_API_KEY is not configured");
  });

  it("gives each holder its own isolated singleton (consumers don't share)", () => {
    const fakeA = { messages: { create: () => "A" } } as unknown as Anthropic;
    const fakeB = { messages: { create: () => "B" } } as unknown as Anthropic;
    const holderA = makeAnthropicHolder();
    const holderB = makeAnthropicHolder();

    holderA.setForTests(fakeA);
    holderB.setForTests(fakeB);

    expect(holderA.get()).toBe(fakeA);
    expect(holderB.get()).toBe(fakeB);
  });
});
