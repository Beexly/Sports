// Authored design-sync preview for DataTable.
// FIXTURE: rows below are layout fixtures for the design tool, not settled results.
import type { CSSProperties } from "react";
import { DataTable, ToneCell } from "sports-prediction-platform";
import type { Column } from "sports-prediction-platform";

interface BoardRow {
  id: string;
  matchup: string;
  sport: string;
  pickType: string;
  line: number;
  confidence: number;
  edge: "good" | "bad" | "neutral";
}

const rows: BoardRow[] = [
  { id: "r1", matchup: "Bills @ Chiefs", sport: "NFL", pickType: "Spread", line: -2.5, confidence: 64, edge: "good" },
  { id: "r2", matchup: "Dodgers @ Braves", sport: "MLB", pickType: "Moneyline", line: 125, confidence: 55, edge: "neutral" },
  { id: "r3", matchup: "Wolverines @ Buckeyes", sport: "NCAAF", pickType: "Total", line: 48.5, confidence: 58, edge: "bad" },
  { id: "r4", matchup: "Celtics @ Knicks", sport: "NBA", pickType: "Spread", line: -4, confidence: 61, edge: "good" },
];

const columns: Column<BoardRow>[] = [
  { key: "matchup", label: "Matchup" },
  { key: "sport", label: "Sport" },
  { key: "pickType", label: "Type" },
  {
    key: "line",
    label: "Line",
    align: "right",
    render: (row) => (row.line > 0 ? `+${row.line}` : row.line),
  },
  {
    key: "confidence",
    label: "Confidence",
    align: "right",
    render: (row) => (
      <ToneCell tone={row.edge}>{row.confidence}</ToneCell>
    ),
  },
];

const wide: CSSProperties = { maxWidth: 900 };
const dark: CSSProperties = { maxWidth: 900, background: "var(--carbon)", padding: 24, borderRadius: 16 };

export const Paper = () => (
  <div style={wide}>
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      caption="Today's board"
      searchable
      searchAccessor={(row) => `${row.matchup} ${row.sport}`}
      showRank
    />
  </div>
);

export const Dark = () => (
  <div style={dark}>
    <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} variant="dark" caption="Today's board" showRank />
  </div>
);

export const Empty = () => (
  <div style={wide}>
    <DataTable
      columns={columns}
      rows={[]}
      rowKey={(row) => row.id}
      caption="Today's board"
      emptyTitle="This board is intentionally empty."
      emptyHint="No games clear the freshness window yet — check back after the next refresh."
    />
  </div>
);
