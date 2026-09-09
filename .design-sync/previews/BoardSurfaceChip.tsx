// Authored design-sync preview for BoardSurfaceChip.
// FIXTURE: layout fixture only. The design runtime's process.env is empty (shimmed), so the
// chip resolves through boardSurfacePosture's fail-closed default — the oddsFresh axis is
// swept explicitly since the board-state layer normally passes null (auto -> signal).
import { BoardSurfaceChip } from "sports-prediction-platform";

const row: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };

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
