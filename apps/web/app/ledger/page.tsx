import { ContextualVaultCta } from "@/components/contextual-vault-cta";
import { contextualVaultCtaEnabled } from "@/lib/feature-flags";

const sampleLedger = [
  {
    date: "26 May",
    game: "Boston @ Miami",
    publication: "Boston -3.5",
    result: "Loss",
  },
  {
    date: "25 May",
    game: "Dallas @ Los Angeles",
    publication: "Under 219.5",
    result: "Win",
  },
  {
    date: "24 May",
    game: "Seattle @ Texas",
    publication: "Seattle moneyline",
    result: "Push",
  },
];

export default function LedgerPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Ledger</p>
        <h1>The settlement record.</h1>
        <p className="lede">
          The Ledger records published calls and outcomes. Production will
          connect this surface to settlement data, calibration bands, and
          permanent publication pages.
        </p>
      </section>

      <section className="section">
        <h2>Recent settlements</h2>
        <div className="table" role="table" aria-label="Recent settlements">
          <div className="row header" role="row">
            <span>Date</span>
            <span>Game</span>
            <span>Publication</span>
            <span>Result</span>
          </div>
          {sampleLedger.map((entry) => (
            <div className="row" role="row" key={`${entry.date}-${entry.game}`}>
              <span>{entry.date}</span>
              <span>{entry.game}</span>
              <span>{entry.publication}</span>
              <span>{entry.result}</span>
            </div>
          ))}
        </div>
      </section>

      {contextualVaultCtaEnabled() ? (
        <ContextualVaultCta surface="ledger" />
      ) : null}
    </main>
  );
}
