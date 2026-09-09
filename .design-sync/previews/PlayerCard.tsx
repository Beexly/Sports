// Authored design-sync preview for PlayerCard.
// FIXTURE: player stat lines below are layout fixtures for the design tool, not sourced from a live loader.
import { PlayerCard } from "sports-prediction-platform";

const plate =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Cdefs%3E%3ClinearGradient id='p' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23FF38C7'/%3E%3Cstop offset='1' stop-color='%2300E5FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23p)'/%3E%3C/svg%3E";

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <PlayerCard
      name="Ja'Marr Chase"
      team="CIN"
      position="WR"
      headlineValue="21.4"
      headlineLabel="PPR / game"
      rank={1}
      stats={[
        { label: "Targets/gm", value: "9.8", tone: "cyan" },
        { label: "Rec yds/gm", value: "94.2", tone: "plasma" },
        { label: "Red-zone tgt", value: "2.1", tone: "uv" },
        { label: "Games played", value: "14", tone: "ion" },
      ]}
      footnote="Season 2025 · settled nflverse"
    />
  </div>
);

export const Compact = () => (
  <div style={{ maxWidth: 380 }}>
    <PlayerCard
      name="Bijan Robinson"
      team="ATL"
      position="RB"
      headlineValue="18.9"
      headlineLabel="PPR / game"
      stats={[
        { label: "Carries/gm", value: "17.4", tone: "cyan" },
        { label: "Rush yds/gm", value: "78.6", tone: "ion" },
      ]}
    />
  </div>
);

export const WithPlate = () => (
  <div style={{ maxWidth: 380 }}>
    <PlayerCard
      name="Amon-Ra St. Brown"
      team="DET"
      position="WR"
      headlineValue="19.7"
      headlineLabel="PPR / game"
      rank={3}
      stats={[
        { label: "Targets/gm", value: "10.1", tone: "cyan" },
        { label: "Rec yds/gm", value: "82.0", tone: "plasma" },
        { label: "TDs", value: "6", tone: "plasma" },
        { label: "Games played", value: "13", tone: "ion" },
      ]}
      footnote="Season 2025 · settled nflverse"
      plateSrc={plate}
    />
  </div>
);
