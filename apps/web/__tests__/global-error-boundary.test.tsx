import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

/**
 * Root error boundary wiring.
 *
 * `app/global-error.tsx` must (1) render its on-brand fallback when the root
 * layout throws, and (2) report the error through the observability layer via
 * captureError — which itself stays a no-op (local log line only) without a
 * provider key. We mock the observability barrel so we can assert the call
 * shape without depending on provider presence.
 */

const captureErrorMock = vi.fn();

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureErrorMock(...args),
}));

// Imported after the mock is registered so the boundary picks up the stub.
import GlobalError from "@/app/global-error";

const PROVIDER_KEYS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of PROVIDER_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  captureErrorMock.mockReset();
  // The boundary writes its own console.error; silence it during the test.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const key of PROVIDER_KEYS) {
    const prev = savedEnv[key];
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
  cleanup();
  vi.restoreAllMocks();
});

describe("app/global-error root boundary", () => {
  it("renders the on-brand fallback with a retry control", () => {
    const error = Object.assign(new Error("root layout exploded"), {
      digest: "abc123",
    });
    render(<GlobalError error={error} reset={() => undefined} />);

    expect(
      screen.getByRole("heading", { name: "Something broke on my side." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry" })
    ).toBeInTheDocument();
  });

  it("reports the error through captureError with the global surface + digest", () => {
    const error = Object.assign(new Error("root layout exploded"), {
      digest: "abc123",
    });
    render(<GlobalError error={error} reset={() => undefined} />);

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(error, {
      surface: "global",
      digest: "abc123",
    });
  });
});
