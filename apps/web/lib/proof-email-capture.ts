export type ProofSurfaceEmailCaptureInput = {
  email: string;
  sourcePage: string;
  sourceModule: "proof_surface_email_capture";
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

export type ProofSurfaceEmailCaptureValidationError = {
  field: keyof ProofSurfaceEmailCaptureInput;
  message: string;
};

export type ProofSurfaceEmailCaptureValidationResult =
  | {
      ok: true;
      input: ProofSurfaceEmailCaptureInput;
    }
  | {
      ok: false;
      errors: ProofSurfaceEmailCaptureValidationError[];
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateProofSurfaceEmailCapture(
  body: unknown,
): ProofSurfaceEmailCaptureValidationResult {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = asString(record.email).toLowerCase();
  const sourcePage = asString(record.sourcePage);
  const sourceModule = asString(record.sourceModule);
  const errors: ProofSurfaceEmailCaptureValidationError[] = [];

  if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "A valid email is required." });
  }

  if (!sourcePage) {
    errors.push({ field: "sourcePage", message: "Source page is required." });
  }

  if (sourceModule !== "proof_surface_email_capture") {
    errors.push({
      field: "sourceModule",
      message: "Source module is not recognized.",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      email,
      sourcePage,
      sourceModule: "proof_surface_email_capture",
      utmSource: asString(record.utmSource) || undefined,
      utmMedium: asString(record.utmMedium) || undefined,
      utmCampaign: asString(record.utmCampaign) || undefined,
      utmContent: asString(record.utmContent) || undefined,
    },
  };
}
