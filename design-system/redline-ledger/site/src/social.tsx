import React from "react";
import ReactDOM from "react-dom/client";
import type { CSSProperties, ReactNode } from "react";
import "@fontsource/big-shoulders/latin-600.css";
import "@fontsource/big-shoulders/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "./styles/tokens.css";
import "./styles/social.css";
import { CFB_HOLD, LINEUP, PICKS, SNAPSHOT, salaryTotal } from "./data/week8";

const templates = {
  og: [1200, 630],
  pickX: [1600, 900],
  dfsPortrait: [1080, 1350],
  heldSquare: [1080, 1080],
  productX: [1600, 900],
  dfsCard: [1200, 675],
  story: [1080, 1920],
} as const;
type Template = keyof typeof templates;

function Frame({ template, children, className = "" }: { template: Template; children: ReactNode; className?: string }) {
  const [width, height] = templates[template];
  return (
    <div id="card" className={`social-card ${className}`} style={{ "--w": `${width}px`, "--h": `${height}px` } as CSSProperties}>
      {children}
    </div>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <div className={`social-brand ${dark ? "on-paper" : ""}`}><span>GSE</span><span>{SNAPSHOT}</span></div>;
}

function PickMetrics({ large = false }: { large?: boolean }) {
  const pick = PICKS[0];
  return (
    <div className={`social-metrics ${large ? "large" : ""}`}>
      <div><span>Model</span><strong className="num">{pick.modelProbability.toFixed(2)}%</strong></div>
      <div><span>Market</span><strong className="num">{pick.marketProbability.toFixed(2)}%</strong></div>
      <div className="accent"><span>Edge</span><strong className="primary-number">+{pick.edge.toFixed(2)}%</strong></div>
    </div>
  );
}

function Og() {
  return <Frame template="og" className="og"><Brand /><div className="og-image"><img src="/assets/higgsfield/hero-sideline.webp" alt="" /></div><div className="og-copy"><p>Week 8 / Redline Ledger</p><h1>The line<br />is only<br />the start.</h1><div className="og-selection"><strong>CHI ML</strong><span className="num">+142</span></div></div><PickMetrics /></Frame>;
}

function PickX() {
  return <Frame template="pickX" className="pick-x"><Brand /><div className="x-image"><img src="/assets/higgsfield/field-chalk.webp" alt="" /></div><div className="x-copy"><p>NFL · CHI @ SEA</p><h1>CHI<br />moneyline.</h1><div className="x-price num">+142</div></div><PickMetrics large /><p className="source-note">Post-reasoning model vs de-vig market · historical snapshot</p></Frame>;
}

function LineupRows({ compact = false }: { compact?: boolean }) {
  return <div className={`export-lineup ${compact ? "compact" : ""}`}>
    {LINEUP.map((row) => <div className="export-row" key={row.name}><span>{row.slot}</span><strong>{row.name}<small>{row.team}</small></strong><b className="salary">${row.salary.toLocaleString("en-US")}</b></div>)}
  </div>;
}

function DfsPortrait() {
  return <Frame template="dfsPortrait" className="dfs-portrait"><Brand dark /><div className="dfs-heading"><p>13-game flagship GPP</p><h1>Every dollar,<br />accounted for.</h1><div className="dfs-total num">${salaryTotal(LINEUP).toLocaleString("en-US")}</div></div><LineupRows /><div className="export-total"><span>Salary exact</span><strong className="num">$50,000</strong></div></Frame>;
}

function HeldSquare() {
  return <Frame template="heldSquare" className="held-square"><Brand dark /><div className="held-big"><span>CFB / Saturday</span><strong className="num">47</strong><p>games evaluated</p></div><div className="held-zero"><strong className="num">0</strong><span>published</span></div><p className="held-export-reason">{CFB_HOLD.reason}</p><h1>Held is<br />a finding.</h1></Frame>;
}

function ProductX() {
  return <Frame template="productX" className="product-x"><Brand /><div className="product-image"><img src="/assets/higgsfield/stats-desk.webp" alt="" /></div><div className="product-edition num">W08</div><div className="product-copy"><p>Week 8 All Access</p><h1>The full ledger.</h1><dl><div><dt>NFL games</dt><dd className="num">13</dd></div><div><dt>Published plays</dt><dd className="num">29</dd></div><div><dt>DFS salary</dt><dd className="num">$50,000</dd></div></dl><span>Board · props · derivatives · salary-exact portfolios</span></div></Frame>;
}

function DfsCardExport() {
  return <Frame template="dfsCard" className="dfs-card-export"><Brand dark /><div className="dfs-card-title"><p>13-game flagship GPP</p><h1 className="num">${salaryTotal(LINEUP).toLocaleString("en-US")}.<br />On the dot.</h1></div><LineupRows compact /><div className="export-total"><span>Salary exact</span><strong className="num">$50,000</strong></div></Frame>;
}

function Story() {
  return <Frame template="story" className="story"><Brand /><div className="story-image"><img src="/assets/higgsfield/football-seams-portrait.webp" alt="" /></div><div className="story-copy"><p>NFL · CHI @ SEA</p><h1>CHI<br />moneyline.</h1><div className="story-price num">+142</div></div><PickMetrics large /><p className="source-note">Week 8 Redline Ledger · October 30, 2026</p></Frame>;
}

const params = new URLSearchParams(window.location.search);
const requested = params.get("template") ?? "og";
const template: Template = requested in templates ? requested as Template : "og";
document.title = `GSE · ${template}`;
const views = { og: Og, pickX: PickX, dfsPortrait: DfsPortrait, heldSquare: HeldSquare, productX: ProductX, dfsCard: DfsCardExport, story: Story };
const View = views[template];
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><View /></React.StrictMode>);
