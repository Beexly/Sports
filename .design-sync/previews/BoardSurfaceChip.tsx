// Authored design-sync preview for BoardSurfaceChip.
// FIXTURE: layout fixture only. The design runtime's process.env is empty (shimmed), so the
// chip resolves through boardSurfacePosture's fail-closed default — the oddsFresh axis is
// swept explicitly since the board-state layer normally passes null (auto -> signal).
// The chip's caution/orbital-cyan tones are contrast-tuned against carbon, the board's own
// background, so it needs the same dark ground here (it washes out on the white review body).
import { BoardSurfaceChip } from "sports-prediction-platform";

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  background: "var(--carbon)",
  padding: 16,
  borderRadius: 12,
};

export const OddsFreshUnknown = () => (
  <div style={row}>
    <BoardSurfaceChip oddsFresh={null} />
  </div>
);

export const OddsFreshTrue = () => (
  <div style={row}>
    <BoardSurfaceChip oddsFresh={true} />
  </div>
);

export const OddsFreshFalse = () => (
  <div style={row}>
    <BoardSurfaceChip oddsFresh={false} />
  </div>
);
