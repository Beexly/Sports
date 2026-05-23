type ProofSurfaceEmailCaptureProps = {
  variant: "default" | "loss-room" | "passes";
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
}: ProofSurfaceEmailCaptureProps) {
  const content = copy[variant];

  return (
    <aside className="proof-module" aria-label="Model Journal email signup">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <form className="form-row">
        <input aria-label="Email address" placeholder="you@example.com" type="email" />
        <button type="button">Subscribe</button>
      </form>
    </aside>
  );
}
