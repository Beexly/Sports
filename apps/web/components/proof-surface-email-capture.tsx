"use client";

import { FormEvent, useState } from "react";

type ProofSurfaceEmailCaptureProps = {
  variant: "default" | "loss-room" | "passes";
  sourcePage?: string;
};

const copy = {
  default: {
    title: "Get the weekly Model Journal.",
    body: "One note on what the methodology did, passed, lost, or changed.",
  },
  "loss-room": {
    title: "Get the weekly Model Journal.",
    body: "One note on what the methodology lost, changed, or is still watching.",
  },
  passes: {
    title: "Get the weekly Model Journal.",
    body: "One note on what Galaxy published, passed, or held back.",
  },
};

export function ProofSurfaceEmailCapture({
  variant,
  sourcePage,
}: ProofSurfaceEmailCaptureProps) {
  const content = copy[variant];
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">(
    "idle",
  );

  async function submitEmailCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/proof/email-capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        sourcePage: sourcePage ?? variant,
        sourceModule: "proof_surface_email_capture",
      }),
    });

    setStatus(response.ok ? "sent" : "error");
  }

  return (
    <aside className="proof-module" aria-label="Model Journal email signup">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      {status === "sent" ? (
        <p role="status">Subscribed. The next Model Journal arrives Sunday.</p>
      ) : (
        <form className="form-row" onSubmit={submitEmailCapture}>
          <input
            aria-label="Email address"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          <button disabled={status === "submitting"} type="submit">
            {status === "submitting" ? "Submitting" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" ? (
        <p role="alert">
          Something failed. Try again or email garrett@galaxysportsedge.com.
        </p>
      ) : null}
    </aside>
  );
}
