import { describe, expect, it } from "vitest";
import { validateProofSurfaceEmailCapture } from "./proof-email-capture";

describe("proof surface email capture validation", () => {
  it("accepts valid email capture input and normalizes email", () => {
    expect(
      validateProofSurfaceEmailCapture({
        email: "READER@example.com",
        sourcePage: "/loss-room",
        sourceModule: "proof_surface_email_capture",
        utmSource: "x",
        utmMedium: "social",
      }),
    ).toEqual({
      ok: true,
      input: {
        email: "reader@example.com",
        sourcePage: "/loss-room",
        sourceModule: "proof_surface_email_capture",
        utmSource: "x",
        utmMedium: "social",
        utmCampaign: undefined,
        utmContent: undefined,
      },
    });
  });

  it("rejects invalid email capture input", () => {
    const result = validateProofSurfaceEmailCapture({
      email: "bad",
      sourcePage: "",
      sourceModule: "wrong_module",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field)).toEqual([
        "email",
        "sourcePage",
        "sourceModule",
      ]);
    }
  });
});
