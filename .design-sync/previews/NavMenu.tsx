// Authored design-sync preview for NavMenu.
// FIXTURE: nav copy mirrors the product's real information architecture (layout fixture only).
import { NavMenu } from "sports-prediction-platform";

const boardGroups = [
  {
    heading: "Board",
    items: [
      { label: "Today's Picks", href: "/picks", desc: "The full board, ranked by confidence." },
      { label: "Today's Board", href: "/board", desc: "Every scored game, market and signal." },
      { label: "Mission Control", href: "/today", desc: "The day's slate at a glance." },
    ],
  },
  {
    heading: "Proof",
    items: [
      { label: "The Proof Room", href: "/calibration", desc: "Calibration and track record." },
      { label: "Closing Line Value", href: "/clv", desc: "How our lines moved vs close." },
    ],
  },
];

const intelligenceGroups = [
  {
    items: [
      { label: "Intelligence Engines", href: "/intelligence/engines", desc: "Every model factor, documented." },
      { label: "Galaxy Twin", href: "/observatory", desc: "The live market map." },
    ],
  },
];

// NavMenu has no paper/dark variant prop — it renders only inside the app's
// dark header bar and inherits the page's dark-theme text color, so both
// cells sit on a dark ground; the axis swept here is real nav composition
// (a headed multi-group menu vs. a single flat group).
const darkGround: React.CSSProperties = { background: "var(--carbon)", padding: "24px 32px", display: "flex", gap: 24 };

export const Dark = () => (
  <div style={darkGround}>
    <NavMenu label="Board" href="/board" groups={boardGroups} />
  </div>
);

export const FlatGroup = () => (
  <div style={darkGround}>
    <NavMenu label="Intelligence" href="/intelligence/engines" groups={intelligenceGroups} />
  </div>
);
