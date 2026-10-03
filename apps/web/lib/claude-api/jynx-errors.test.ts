import { describe, expect, it } from "vitest";
import {
  classifyJynxError,
  isCloudHopError,
  isFreeLaneHopError,
} from "./jynx-errors";
import { CerebrasMessagesError } from "./providers/cerebras";
import { OpenAiCompatError } from "./openai-compat";
import { BedrockConfigError, BedrockMessagesError } from "./providers/bedrock";
import { callCerebrasMessages } from "./providers/cerebras";

describe("jynx error taxonomy", () => {
  it("classifies free hop errors", () => {
    const c = new CerebrasMessagesError("down", { status: 500, durationMs: 1, modelName: "gpt-oss-120b" });
    const o = new OpenAiCompatError("down", { status: 502, durationMs: 1, modelName: "free/x" });
    expect(isFreeLaneHopError(c)).toBe(true);
    expect(isFreeLaneHopError(o)).toBe(true);
    expect(classifyJynxError(c).lane).toBe("free_cerebras");
    expect(classifyJynxError(o).hop).toBe(true);
  });

  it("classifies cloud hop errors", () => {
    const b = new BedrockMessagesError("503", { status: 503, durationMs: 2, modelName: "x" });
    const cfg = new BedrockConfigError("no map");
    expect(isCloudHopError(b)).toBe(true);
    expect(isCloudHopError(cfg)).toBe(true);
    expect(classifyJynxError(b).lane).toBe("cloud_bedrock");
  });

  it("does not hop generic errors", () => {
    const e = new Error("bug");
    expect(isFreeLaneHopError(e)).toBe(false);
    expect(isCloudHopError(e)).toBe(false);
    expect(classifyJynxError(e).hop).toBe(false);
  });
});

describe("Cerebras hoppable failures", () => {
  it("empty content throws CerebrasMessagesError (free-lane hoppable)", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 });
    await expect(
      callCerebrasMessages({
        apiKey: "k",
        system: "s",
        user: "u",
        maxTokens: 10,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(CerebrasMessagesError);
  });

  it("network failure throws CerebrasMessagesError", async () => {
    const fetchImpl = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(
      callCerebrasMessages({
        apiKey: "k",
        system: "s",
        user: "u",
        maxTokens: 10,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: "CerebrasMessagesError", status: 0 });
  });
});
