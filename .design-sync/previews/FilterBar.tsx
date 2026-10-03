// Authored design-sync preview for FilterBar.
import { FilterBar, Tabs } from "sports-prediction-platform";

const items = [
  { value: "all", label: "All sports" },
  { value: "nfl", label: "NFL" },
  { value: "mlb", label: "MLB" },
] as const;

export const Paper = () => (
  <FilterBar trailing={<span>18 picks on the board</span>}>
    <Tabs param="sport" active="all" items={items} pathname="/picks" ariaLabel="Sport filter" />
  </FilterBar>
);

export const TrailingOnly = () => (
  <div style={{ maxWidth: 640 }}>
    <FilterBar trailing={<span>Last refresh 6 minutes ago</span>} />
  </div>
);
