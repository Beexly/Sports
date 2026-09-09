// Authored design-sync preview for SourceError.
import { SourceError } from "sports-prediction-platform";

export const Paper = () => (
  <div style={{ maxWidth: 480 }}>
    <SourceError reason="ESPN scoreboard returned no games for this date. The board stays empty rather than showing a stale slate." />
  </div>
);

export const Dark = () => (
  <div style={{ maxWidth: 480, background: "var(--carbon)", padding: 24, borderRadius: 16 }}>
    <SourceError
      variant="dark"
      kicker="Source error"
      title="This board is intentionally empty."
      reason="Both odds sources rate-limited within the last refresh window."
    >
      <a href="#" style={{ fontSize: 13, fontWeight: 600 }}>
        View source status →
      </a>
    </SourceError>
  </div>
);
