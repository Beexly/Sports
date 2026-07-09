import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  vertexConfig,
  isVertexConfigured,
  isVertexProviderSelected,
  resolveVertexModelId,
  callVertexClaudeMessages,
  resetVertexTokenCacheForTests,
  VertexConfigError,
  VertexMessagesError,
} from "./vertex";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const SA_JSON = JSON.stringify({
  client_email: "svc@proj.iam.gserviceaccount.com",
  private_key: privateKey,
  token_uri: "https://oauth2.googleapis.com/token",
});

const ENV = {
  GOOGLE_VERTEX_PROJECT: "my-proj",
  GOOGLE_VERTEX_REGION: "us-east5",
  GOOGLE_APPLICATION_CREDENTIALS_JSON: SA_JSON,
  VERTEX_MODEL_MAP: JSON.stringify({ "claude-sonnet-4-6": "claude-3-5-sonnet-v2@20241022" }),
} as const;

function tokenResponse() {
  return { ok: true, status: 200, json: async () => ({ access_token: "ya29.tok", expires_in: 3600 }), text: async () => "" } as unknown as Response;
}
function vertexResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text: " hi from vertex " }], usage: { input_tokens: 5, output_tokens: 3 } }),
    text: async () => "",
  } as unknown as Response;
}

// A fetch mock that answers the OAuth token endpoint and the Vertex rawPredict
// endpoint distinctly, so we can assert both hops.
function routedFetch() {
  return vi.fn(async (url: string, _init?: RequestInit) =>
    String(url).includes("oauth2.googleapis.com") ? tokenResponse() : vertexResponse(),
  );
}

beforeEach(() => resetVertexTokenCacheForTests());

describe("vertexConfig / gating", () => {
  it("requires project, region, and a parseable service-account JSON", () => {
    expect(isVertexConfigured(ENV)).toBe(true);
    expect(vertexConfig(ENV)?.project).toBe("my-proj");
    expect(isVertexConfigured({ ...ENV, GOOGLE_APPLICATION_CREDENTIALS_JSON: "{bad" })).toBe(false);
    expect(isVertexConfigured({ GOOGLE_VERTEX_PROJECT: "p" })).toBe(false);
  });

  it("selects Vertex only when the flag AND config are both present", () => {
    expect(isVertexProviderSelected(ENV)).toBe(false); // no flag
    expect(isVertexProviderSelected({ ...ENV, CLAUDE_PROVIDER: "vertex" })).toBe(true);
    expect(isVertexProviderSelected({ CLAUDE_PROVIDER: "vertex" })).toBe(false); // no config
  });
});

describe("resolveVertexModelId — no fabricated ids", () => {
  it("maps a known id, throws when unmapped/absent/invalid", () => {
    expect(resolveVertexModelId("claude-sonnet-4-6", ENV)).toBe("claude-3-5-sonnet-v2@20241022");
    expect(() => resolveVertexModelId("claude-opus-4-8", ENV)).toThrow(VertexConfigError);
    expect(() => resolveVertexModelId("claude-sonnet-4-6", {})).toThrow(VertexConfigError);
    expect(() => resolveVertexModelId("claude-sonnet-4-6", { VERTEX_MODEL_MAP: "{bad" })).toThrow(VertexConfigError);
  });
});

describe("callVertexClaudeMessages", () => {
  const baseReq = {
    anthropicModelId: "claude-sonnet-4-6",
    system: "You are helpful.",
    user: "Summarize.",
    maxTokens: 200,
    now: new Date("2026-07-08T00:00:00Z"),
  };

  it("mints a token then posts rawPredict with the vertex body and bearer auth", async () => {
    const fetchImpl = routedFetch();
    const result = await callVertexClaudeMessages(
      { ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch },
      ENV,
    );

    const vertexCall = fetchImpl.mock.calls.find((c) => String(c[0]).includes("aiplatform"))!;
    expect(vertexCall[0]).toBe(
      "https://us-east5-aiplatform.googleapis.com/v1/projects/my-proj/locations/us-east5/publishers/anthropic/models/claude-3-5-sonnet-v2@20241022:rawPredict",
    );
    const init = vertexCall[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ya29.tok");

    const sent = JSON.parse(init.body as string);
    expect(sent.anthropic_version).toBe("vertex-2023-10-16");
    expect(sent).not.toHaveProperty("model");
    expect(sent.messages).toEqual([{ role: "user", content: "Summarize." }]);

    expect(result.modelName).toBe("claude-3-5-sonnet-v2@20241022");
    expect(result.text).toBe("hi from vertex");
    expect(result.inputTokens).toBe(5);
  });

  it("caches the access token across calls (only one token exchange for two calls)", async () => {
    const fetchImpl = routedFetch();
    await callVertexClaudeMessages({ ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch }, ENV);
    await callVertexClaudeMessages({ ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch }, ENV);
    const tokenCalls = fetchImpl.mock.calls.filter((c) => String(c[0]).includes("oauth2.googleapis.com"));
    expect(tokenCalls).toHaveLength(1);
  });

  it("throws VertexMessagesError on a non-OK rawPredict response", async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) =>
      String(url).includes("oauth2.googleapis.com")
        ? tokenResponse()
        : ({ ok: false, status: 429, json: async () => ({}), text: async () => "quota" } as unknown as Response),
    );
    await expect(
      callVertexClaudeMessages({ ...baseReq, fetchImpl: fetchImpl as unknown as typeof fetch }, ENV),
    ).rejects.toBeInstanceOf(VertexMessagesError);
  });
});
