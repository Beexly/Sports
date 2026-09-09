// Authored design-sync preview for BoardHealthBadge.
// FIXTURE: trace id, row counts and health status below are layout fixtures, not a live board read.
import { BoardHealthBadge } from "sports-prediction-platform";
import type { BoardStatePayload } from "@/lib/board/state";

// Badge text (ion-white / ion-2) is contrast-tuned against carbon, the board's
// own background, so it needs the same dark ground here.
const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 460 };

const healthyMeta: BoardStatePayload["meta"] = {
  traceId: "trace-9f21a7b3-0001",
  degradations: [],
  health: {
    status: "HEALTHY",
    label: "Board is healthy",
    rowCount: 42,
    generatedAt: new Date().toISOString(),
    draftOnly: true,
    priced: false,
  },
  boardClass: {
    state: "HAS_ROWS",
    publicMessage: "Today's board has active rows.",
    refusePublicFire: false,
    honestEmpty: false,
  },
};

const degradedMeta: BoardStatePayload["meta"] = {
  traceId: "trace-9f21a7b3-0002",
  degradations: [
    {
      code: "STALE_DATA_SUPPRESSED",
      severity: "warning",
      source: "board-state",
      message: "Stale public-board rows were suppressed before rendering.",
    },
  ],
  health: {
    status: "DEGRADED",
    label: "Board is degraded",
    rowCount: 0,
    generatedAt: new Date().toISOString(),
    draftOnly: true,
    priced: false,
  },
  boardClass: {
    state: "SUPPRESSED_STALE",
    publicMessage: "Stale rows were suppressed rather than shown.",
    refusePublicFire: true,
    honestEmpty: false,
  },
};

export const Healthy = () => (
  <div style={ground}>
    <BoardHealthBadge meta={healthyMeta} />
  </div>
);

export const Degraded = () => (
  <div style={ground}>
    <BoardHealthBadge meta={degradedMeta} />
  </div>
);
