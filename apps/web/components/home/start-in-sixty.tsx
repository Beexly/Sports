/**
 * "Start in 60 seconds" — conversion-funnel reassurance bar.
 *
 * Sits between the hero and the signal-preview-queue. Three explicit
 * promises that lower signup friction:
 *  1. No credit card required for free.
 *  2. 3-day refund window on every paid plan.
 *  3. One inbox — replies go to the founder personally.
 *
 * No banned phrases. Each promise maps to a fact already enforced in
 * the codebase (free-tier entitlements, Stripe refund policy, hq@ inbox).
 */

const PROMISES = [
  {
    title: "No card for free.",
    body: "Google sign-in and you're in. The Free tier never asks for billing.",
  },
  {
    title: "3-day refund window.",
    body: "Every paid plan. Cancel from your dashboard, no questions, no churn forms.",
  },
  {
    title: "Every reply gets read.",
    body: "hq@galaxysportsedge.com goes to the desk directly. Real support, real humans.",
  },
] as const;

export function StartInSixty() {
  return (
    <section
      aria-label="Reasons to start the free tier today"
      style={{
        padding: "32px 0",
        borderTop: "1px solid color-mix(in srgb, var(--ion-blue-glow) 12%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--ion-blue-glow) 12%, transparent)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--ion-blue-glow) 2%, transparent) 0%, transparent 100%)",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 28,
          alignItems: "start",
        }}
      >
        {PROMISES.map((promise) => (
          <div
            key={promise.title}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: 999,
                background:
                  "color-mix(in srgb, var(--ion-blue-glow) 14%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--ion-blue-glow) 35%, transparent)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ion-blue-glow)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  font: "700 14px/1.2 var(--f-display)",
                  color: "var(--ion-white)",
                  letterSpacing: "-0.01em",
                }}
              >
                {promise.title}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  font: "400 13px/1.5 var(--f-body)",
                  color: "var(--ion-1)",
                }}
              >
                {promise.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 720px) {
          section[aria-label="Reasons to start the free tier today"] .container {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
        }
      `}</style>
    </section>
  );
}
