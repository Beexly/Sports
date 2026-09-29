/**
 * jynxComplete — lane-routing invariants.
 *
 * This is the preferred single entry for every LLM surface (plan → free lane →
 * multi-cloud callClaude → cash), so it is the one file whose wrong answer is
 * invisible at the call site: every caller gets back a normal ClaudeMessagesResult
 * and none of them read `jynxPrimaryLane` / `jynxReason`. The lane string is the
 * only customer-visible record of WHICH path actually ran, and it is derived
 * independently of the dispatch decision (planJynx recomputes
 * shouldUseFreeLane at jynx.ts:161; the dispatch recomputes it at
 * jynx-complete.ts:32). Two derivations of one predicate is exactly the shape
 * that drifts, and the drift is a reason string that lies.
 *
 * These tests are pure: every provider is reached through an injected
 * `fetchImpl` and every routing decision is made by an explicitly passed `env`,
 * so there is no network, no database, and no invented product data. Expected
 * values are either literals the source already states or values the source
 * itself supplies (planJynx is called directly to derive the expectation).
 */

import { describe, expect, it, vi } from "vitest";
import { jynxComplete, type JynxCompleteResult } from "@/lib/claude-api/jynx-complete";
import { planJynx } from "@/lib/claude-api/jynx";
import type { ContentMessagesRequest } from "@/lib/claude-api/free-lane";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";

const anthropicResponse = () =>
  new Response(
    JSON.stringify({
      content: [{ type: "text", text: "Anthropic text" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200 },
  );

const cerebrasResponse = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: "Cerebras text" } }],
      usage: { prompt_tokens: 8, completion_tokens: 4 },
    }),
    { status: 200 },
  );

/** Free lane enabled the way free-lane-policy.ts defines it. */
const FREE_ON = { CONTENT_FREE_LANE_ENABLED: "true", CEREBRAS_API_KEY: "cb-local-test" } as const;

const base: ContentMessagesRequest = {
  apiKey: "anthropic-local-test",
  system: "S",
  user: "U",
  maxTokens: 100,
};

const requestedUrls = (fetchImpl: ReturnType<typeof vi.fn>): string[] =>
  (fetchImpl.mock.calls as unknown as Array<[string]>).map((c) => c[0]);

/** Every ClaudeMessagesResult field the provider result must survive onto. */
const expectProviderFieldsIntact = (result: JynxCompleteResult, text: string) => {
  expect(result.text).toBe(text);
  expect(typeof result.modelName).toBe("string");
  expect(result.modelName.length).toBeGreaterThan(0);
  expect(Number.isFinite(result.inputTokens)).toBe(true);
  expect(Number.isFinite(result.outputTokens)).toBe(true);
  expect(Number.isFinite(result.durationMs)).toBe(true);
};

describe("jynxComplete — the stamped lane describes the lane actually taken", () => {
  it("routes to the free lane and stamps content_free when free lane is eligible and enabled", async () => {
    const fetchImpl = vi.fn(async () => cerebrasResponse());
    const result = await jynxComplete({ ...base, surface: "brief", fetchImpl }, { ...FREE_ON });

    expect(requestedUrls(fetchImpl)[0]).toBe(CEREBRAS_URL);
    expect(result.jynxPrimaryLane).toBe("content_free");
    expectProviderFieldsIntact(result, "Cerebras text");
  });

  it("does not touch the free lane and does not stamp content_free when it is disabled", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete({ ...base, surface: "brief", fetchImpl }, {});

    expect(requestedUrls(fetchImpl)[0]).toBe(ANTHROPIC_URL);
    expect(result.jynxPrimaryLane).not.toBe("content_free");
    expect(result.jynxPrimaryLane).toBe("anthropic_direct");
  });

  it("keeps the stamp honest for a free-lane-ELIGIBLE surface that is eligible but off", async () => {
    // The trap this pins: "brief" is on the free-lane allow-list, so an
    // eligibility-only implementation would stamp content_free here. The
    // dispatch went to cash Anthropic, so the stamp must not say otherwise.
    const request = { ...base, surface: "brief" as const };
    expect(planJynx({ surface: "brief" }, {}).freeLaneEligible).toBe(true);
    expect(planJynx({ surface: "brief" }, {}).freeLaneWillTry).toBe(false);

    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete({ ...request, fetchImpl }, {});

    expect(requestedUrls(fetchImpl)[0]).toBe(ANTHROPIC_URL);
    expect(result.jynxPrimaryLane).toBe("anthropic_direct");
  });

  it("keeps the stamp honest for a surface the free lane may never serve", async () => {
    // Enabled, but "studio" is not on the allow-list: env alone must not open it.
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete({ ...base, surface: "studio", fetchImpl }, { ...FREE_ON });

    expect(requestedUrls(fetchImpl)[0]).toBe(ANTHROPIC_URL);
    expect(result.jynxPrimaryLane).not.toBe("content_free");
  });

  it("reports the plan's own lane and reason verbatim for the same inputs", async () => {
    // Computed from planJynx rather than hardcoded, so this fails if the stamp
    // stops being the plan's values — not merely if a reason string is reworded.
    for (const [surface, env] of [
      ["brief", { ...FREE_ON }],
      ["brief", {}],
      ["studio", { ...FREE_ON }],
    ] as const) {
      const plan = planJynx({ surface, maxTokens: base.maxTokens }, env);
      const fetchImpl = vi.fn(async () =>
        (plan.primaryLane === "content_free" ? cerebrasResponse : anthropicResponse)(),
      );
      const result = await jynxComplete({ ...base, surface, fetchImpl }, env);

      expect(result.jynxPrimaryLane, `surface=${surface}`).toBe(plan.primaryLane);
      expect(result.jynxReason, `surface=${surface}`).toBe(plan.reason);
    }
  });

  it("stamps a non-empty reason on every path", async () => {
    const freeRun = vi.fn(async () => cerebrasResponse());
    const cashRun = vi.fn(async () => anthropicResponse());

    const freeResult = await jynxComplete(
      { ...base, surface: "brief", fetchImpl: freeRun },
      { ...FREE_ON },
    );
    const cashResult = await jynxComplete({ ...base, surface: "brief", fetchImpl: cashRun }, {});

    expect(freeResult.jynxReason.trim().length).toBeGreaterThan(0);
    expect(cashResult.jynxReason.trim().length).toBeGreaterThan(0);
  });

  it("names the planned surface in the free-lane reason but NOT in the cash reason", async () => {
    // OBSERVED ASYMMETRY, pinned so nobody "fixes" one side into a regression
    // of the other. Only the content_free branch of planJynx interpolates the
    // surface (jynx.ts:170); the cloud and cash branches (jynx.ts:173, :179)
    // describe the provider mode and the env vars instead. Both statements are
    // true of the source today, so both are asserted — if a future edit adds the
    // surface to the cash branch, the second half fails and that change is a
    // deliberate one to acknowledge.
    const freeRun = vi.fn(async () => cerebrasResponse());
    const cashRun = vi.fn(async () => anthropicResponse());

    const freeResult = await jynxComplete(
      { ...base, surface: "brief", fetchImpl: freeRun },
      { ...FREE_ON },
    );
    const cashResult = await jynxComplete({ ...base, surface: "brief", fetchImpl: cashRun }, {});

    expect(freeResult.jynxReason).toContain("surface=brief");
    expect(cashResult.jynxReason).not.toContain("brief");
  });
});

describe("jynxComplete — model resolution", () => {
  it("fills an omitted model from the plan's surface-resolved model id", async () => {
    const request: ContentMessagesRequest = { ...base, surface: "brief" };
    const plan = planJynx({ surface: "brief", maxTokens: request.maxTokens }, {});
    expect(request.model).toBeUndefined();
    expect(plan.anthropicModelId.length).toBeGreaterThan(0);

    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete({ ...request, fetchImpl }, {});

    expect(result.modelName).toBe(plan.anthropicModelId);
  });

  it("preserves a caller-supplied model instead of overwriting it with the plan default", async () => {
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete(
      { ...base, surface: "brief", model: "claude-opus-explicit", fetchImpl },
      {},
    );

    expect(result.modelName).toBe("claude-opus-explicit");
  });

  it("does not mutate the caller's request object", async () => {
    // The SAME object is handed to jynxComplete and then inspected. An earlier
    // version of this test passed `{ ...request, fetchImpl }` and asserted on
    // `request`, which made it unfalsifiable: the function was always handed a
    // throwaway copy, so it could never write to the object under assertion.
    // Mutation check M7 (replacing the spread with an in-place
    // `request.model = ...`) passed silently against the old version of this
    // test and fails against this one.
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const request: ContentMessagesRequest = { ...base, surface: "brief", fetchImpl };
    const keysBefore = Object.keys(request).sort();

    await jynxComplete(request, {});

    expect(request.model).toBeUndefined();
    expect(Object.keys(request).sort()).toEqual(keysBefore);
  });
});

describe("jynxComplete — env threading", () => {
  it("routes off the passed env, not off process.env", async () => {
    // Same request, two envs, two different lanes. If the function read
    // process.env anywhere, both would land on the same host.
    const freeRun = vi.fn(async () => cerebrasResponse());
    const cashRun = vi.fn(async () => anthropicResponse());

    const freeResult = await jynxComplete({ ...base, surface: "brief", fetchImpl: freeRun }, {
      ...FREE_ON,
    });
    const cashResult = await jynxComplete({ ...base, surface: "brief", fetchImpl: cashRun }, {});

    expect(requestedUrls(freeRun)[0]).toBe(CEREBRAS_URL);
    expect(requestedUrls(cashRun)[0]).toBe(ANTHROPIC_URL);
    expect(freeResult.jynxPrimaryLane).toBe("content_free");
    expect(cashResult.jynxPrimaryLane).toBe("anthropic_direct");
  });

  it("defaults env to process.env when none is supplied", async () => {
    // Byte-for-byte the same call shape as the explicit-env tests; this only
    // asserts the default parameter resolves to a usable env object.
    const fetchImpl = vi.fn(async () => anthropicResponse());
    const result = await jynxComplete({ ...base, surface: "brief", fetchImpl });

    expectProviderFieldsIntact(result, "Anthropic text");
    expect(result.jynxPrimaryLane).toBe(planJynx({ surface: "brief" }, process.env).primaryLane);
  });
});
