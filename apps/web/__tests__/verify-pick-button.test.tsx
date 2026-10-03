import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VerifyPickButton } from "@/components/picks/verify-pick-button";

const okFetch = () =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        found: true,
        frozenAt: new Date().toISOString(),
        modelVersion: "v1",
      }),
  } as Response);

describe("VerifyPickButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("renders nothing when receiptHash is null", () => {
    const { container } = render(<VerifyPickButton receiptHash={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the verify button when receiptHash is present", () => {
    render(<VerifyPickButton receiptHash={"abc123".padEnd(64, "0")} />);
    expect(screen.getByRole("button", { name: /verify this pick/i })).toBeTruthy();
  });

  it("does not reveal content before click", () => {
    render(<VerifyPickButton receiptHash={"abc123".padEnd(64, "0")} />);
    expect(screen.queryByText(/content hash/i)).toBeNull();
  });

  it("reveals the hash and timestamp on click, with a link to /verify", async () => {
    vi.stubGlobal("fetch", okFetch);
    render(<VerifyPickButton receiptHash={"a".repeat(64)} />);
    fireEvent.click(screen.getByRole("button", { name: /verify this pick/i }));

    await waitFor(() => {
      expect(screen.getByText(/content hash/i)).toBeTruthy();
      expect(screen.getByText(/committed timestamp/i)).toBeTruthy();
    });

    const verifyLink = screen.getByRole("link", { name: /open \/verify/i });
    expect(verifyLink).toHaveAttribute("href", expect.stringContaining("/verify?hash="));
  });

  it("hides the panel on a second click", async () => {
    vi.stubGlobal("fetch", okFetch);
    render(<VerifyPickButton receiptHash={"a".repeat(64)} />);
    const btn = screen.getByRole("button", { name: /verify this pick/i });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/content hash/i)).toBeTruthy());

    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByText(/content hash/i)).toBeNull());
  });
});
