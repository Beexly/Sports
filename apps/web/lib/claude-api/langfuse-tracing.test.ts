import { describe, expect, it, vi, afterEach } from "vitest";

const startObservationMock = vi.fn();
const setLangfuseTracerProviderMock = vi.fn();
const forceFlushMock = vi.fn(async () => undefined);

vi.mock("@langfuse/tracing", () => ({
  startObservation: (...args: unknown[]) => startObservationMock(...args),
  setLangfuseTracerProvider: (...args: unknown[]) => setLangfuseTracerProviderMock(...args),
}));

vi.mock("@langfuse/otel", () => ({
  LangfuseSpanProcessor: vi.fn().mockImplementation((params: unknown) => ({ __params: params })),
}));

vi.mock("@opentelemetry/sdk-trace-base", () => ({
  BasicTracerProvider: vi.fn().mockImplementation(() => ({
    forceFlush: forceFlushMock,
  })),
}));

const baseParams = {
  surfaceName: "brief",
  modelName: "claude-sonnet-4-6",
  inputTokens: 100,
  outputTokens: 50,
  costUsd: 0.001,
  durationMs: 250,
};

describe("traceClaudeCallToLangfuse", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("is a complete no-op when keys are unset — never creates a span or provider", async () => {
    const { traceClaudeCallToLangfuse } = await import("./langfuse-tracing");
    await traceClaudeCallToLangfuse(baseParams, {});

    expect(startObservationMock).not.toHaveBeenCalled();
    expect(setLangfuseTracerProviderMock).not.toHaveBeenCalled();
  });

  it("creates a generation observation with no input/output text when keys are set", async () => {
    const endMock = vi.fn();
    startObservationMock.mockReturnValue({ end: endMock });

    const { traceClaudeCallToLangfuse } = await import("./langfuse-tracing");
    await traceClaudeCallToLangfuse(baseParams, {
      LANGFUSE_PUBLIC_KEY: "pk-test",
      LANGFUSE_SECRET_KEY: "sk-test",
    });

    expect(setLangfuseTracerProviderMock).toHaveBeenCalledTimes(1);
    expect(startObservationMock).toHaveBeenCalledTimes(1);

    const [name, attrs, options] = startObservationMock.mock.calls[0] as [string, Record<string, unknown>, Record<string, unknown>];
    expect(name).toBe("brief");
    expect(options).toEqual({ asType: "generation" });
    expect(attrs).not.toHaveProperty("input");
    expect(attrs).not.toHaveProperty("output");
    expect(attrs.model).toBe("claude-sonnet-4-6");
    expect(attrs.usageDetails).toEqual({ input: 100, output: 50 });
    expect(attrs.costDetails).toEqual({ total: 0.001 });

    expect(endMock).toHaveBeenCalledTimes(1);
    expect(forceFlushMock).toHaveBeenCalledTimes(1);
  });

  it("initializes the isolated provider only once across repeated calls", async () => {
    startObservationMock.mockReturnValue({ end: vi.fn() });
    const { traceClaudeCallToLangfuse } = await import("./langfuse-tracing");
    const env = { LANGFUSE_PUBLIC_KEY: "pk-test", LANGFUSE_SECRET_KEY: "sk-test" };

    await traceClaudeCallToLangfuse(baseParams, env);
    await traceClaudeCallToLangfuse(baseParams, env);

    expect(setLangfuseTracerProviderMock).toHaveBeenCalledTimes(1);
    expect(startObservationMock).toHaveBeenCalledTimes(2);
  });

  it("fails open — an error from startObservation never propagates", async () => {
    startObservationMock.mockImplementation(() => {
      throw new Error("langfuse down");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { traceClaudeCallToLangfuse } = await import("./langfuse-tracing");
    await expect(
      traceClaudeCallToLangfuse(baseParams, { LANGFUSE_PUBLIC_KEY: "pk-test", LANGFUSE_SECRET_KEY: "sk-test" }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
