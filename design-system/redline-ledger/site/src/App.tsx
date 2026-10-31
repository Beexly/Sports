import { useState } from "react";
import { AssetDownload } from "./components/AssetDownload";
import { DfsCard } from "./components/DfsCard";
import { FilterTabs } from "./components/FilterTabs";
import { HeldNotice } from "./components/HeldNotice";
import { LineupTable } from "./components/LineupTable";
import { PickProof } from "./components/PickProof";
import { CFB_HOLD, DATA_PROVENANCE, LINEUP, PICKS, SNAPSHOT } from "./data/week8";

type View = "board" | "dfs" | "held";

const viewOptions: { id: View; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "dfs", label: "DFS" },
  { id: "held", label: "Held" },
];

export default function App() {
  const [view, setView] = useState<View>("board");

  function selectView(nextView: View) {
    setView(nextView);
    const targetId = nextView === "dfs" ? "salary" : nextView === "held" ? "cfb-held" : "ledger";
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.getElementById(targetId);
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  return (
    <>
      <a className="skip-link" href="#ledger">Skip to the ledger</a>
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Galaxy Sports Edge home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Galaxy Sports Edge</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#ledger">Board</a>
          <a href="#salary">DFS</a>
          <a href="#method">Method</a>
        </nav>
        <p className="edition num">W08 / 2026</p>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="snapshot">{SNAPSHOT}</p>
            <h1 id="hero-title">The line<br />is only<br />the start.</h1>
            <div className="hero-bottom">
              <p>GSE reads price, timing, and volatility. Then it shows the work—the model, the market, and the decision to publish or hold.</p>
              <a className="primary-action" href="#ledger">Read the Week 8 ledger <span aria-hidden="true">↘</span></a>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/assets/higgsfield/hero-sideline.webp" alt="Worn chalk and a sideline marker on an empty football field" />
            <span className="registration-mark" aria-hidden="true"></span>
            <div className="hero-caption">
              <span>Field note 01</span>
              <span>Evidence before spectacle</span>
            </div>
          </div>
          <aside className="hero-proof" aria-label="Featured pick proof">
            <span className="proof-label">Highest moneyline edge on the locked card</span>
            <PickProof pick={PICKS[0]} rank={1} />
          </aside>
        </section>

        <section className="ledger-section" id="ledger" aria-labelledby="ledger-title">
          <div className="section-heading">
            <div>
              <p className="section-index">The locked card / 29 published plays</p>
              <h2 id="ledger-title">Read the discrepancy.</h2>
            </div>
            <p>Three source-locked moneyline rows. Edge is a comparison, never an outcome promise.</p>
          </div>
          <FilterTabs label="Ledger view" options={viewOptions} value={view} onChange={selectView} />
          <div className="ledger-content">
            {view === "board" && (
              <div className="pick-list">
                {PICKS.map((pick, index) => <PickProof key={pick.id} pick={pick} rank={index + 1} />)}
              </div>
            )}
          </div>
        </section>

        <div id="cfb-held"><HeldNotice {...CFB_HOLD} /></div>

        <section className="paper-section" id="salary" aria-labelledby="salary-title">
          <div className="salary-intro">
            <p className="section-index">DFS / 13-game slate</p>
            <h2 id="salary-title">Every dollar,<br />accounted for.</h2>
            <p>The flagship GPP roster fits the cap exactly. Names stay left. Salaries stay right. Nothing shifts when the numbers change.</p>
            <DfsCard row={LINEUP[0]} />
          </div>
          <LineupTable rows={LINEUP} />
        </section>

        <section className="method-section" id="method" aria-labelledby="method-title">
          <div className="method-heading">
            <p className="section-index">Method / no black box theater</p>
            <h2 id="method-title">A decision in three passes.</h2>
          </div>
          <ol className="method-list">
            <li><span className="num">01</span><h3>Build the internal read.</h3><p>Simulate before looking at the sportsbook. The source report seals the internal run before market comparison.</p></li>
            <li><span className="num">02</span><h3>Put price beside probability.</h3><p>Compare the model with de-vig market probability. The difference is shown as arithmetic, not dressed up as certainty.</p></li>
            <li><span className="num">03</span><h3>Publish—or hold the row.</h3><p>A missing input does not become a pick. The CFB slate stays at zero published until its evidence spine exists.</p></li>
          </ol>
        </section>

        <section className="asset-section" aria-labelledby="asset-title">
          <div className="asset-copy">
            <p className="section-index">Asset desk / ready to post</p>
            <h2 id="asset-title">The same story.<br />Every crop.</h2>
            <p>Static cards and motion use the same source data and tabular type as the page. No text is baked into a generated image.</p>
          </div>
          <div className="asset-preview asset-preview-wide">
            <img src="/assets/og/gse-redline-og.png" alt="GSE Redline Ledger OG card with the Week 8 Chicago moneyline proof" />
            <div><span>OG · 1200 × 630</span><AssetDownload href="/assets/og/gse-redline-og.png" label="Download OG card">PNG</AssetDownload></div>
          </div>
          <div className="asset-preview asset-preview-portrait">
            <img src="/assets/social/gse-dfs-portrait.png" alt="Salary-exact DFS portrait card" />
            <div><span>Portrait · 1080 × 1350</span><AssetDownload href="/assets/social/gse-dfs-portrait.png" label="Download DFS portrait">PNG</AssetDownload></div>
          </div>
          <div className="asset-motion">
            <div><span>Story motion · 1080 × 1920</span><AssetDownload href="/assets/social/gse-redline-story.mp4" label="Download story motion">MP4</AssetDownload></div>
          </div>
        </section>
      </main>

      <footer>
        <p>{DATA_PROVENANCE}</p>
        <div><a href="https://www.ncpgambling.org/help-treatment/">Responsible play</a><span>1-800-GAMBLER</span></div>
      </footer>
    </>
  );
}
