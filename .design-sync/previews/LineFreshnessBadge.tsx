// Authored design-sync preview for LineFreshnessBadge.
// FIXTURE: timestamps below are layout fixtures for the design tool, not live line data.
import { LineFreshnessBadge } from "sports-prediction-platform";

const row: React.CSSProperties = { display: "flex", gap: 16, flexWrap: "wrap" };

const fresh = new Date(Date.now() - 4 * 60_000).toISOString();
const minutesOld = new Date(Date.now() - 47 * 60_000).toISOString();
const hoursOld = new Date(Date.now() - 5 * 3_600_000).toISOString();

export const Fresh = () => (
  <div style={row}>
    <LineFreshnessBadge freshestIso={fresh} />
  </div>
);

export const MinutesOld = () => (
  <div style={row}>
    <LineFreshnessBadge freshestIso={minutesOld} />
  </div>
);

export const HoursOld = () => (
  <div style={row}>
    <LineFreshnessBadge freshestIso={hoursOld} />
  </div>
);
