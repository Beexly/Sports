import { ContextualVaultCta } from "@/components/contextual-vault-cta";
import { ProofSurfaceEmailCapture } from "@/components/proof-surface-email-capture";
import { proofSurfaceEmailCaptureEnabled } from "@/lib/feature-flags";

const samplePasses = [
  {
    date: "26 May",
    game: "NYK @ IND G6",
    confidence: "64%",
    category: "A - Confidence below floor",
  },
  {
    date: "26 May",
    game: "PIT @ CHC",
    confidence: "62%",
    category: "B - Factor quality concern",
  },
  {
    date: "26 May",
    game: "DET @ KCR",
    confidence: "63%",
    category: "C - Cross-model disagreement",
  },
];

export default function PassesPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">The Pass List</p>
        <h1>Every game Galaxy considered publishing and chose not to.</h1>
        <p className="lede">
          This scaffold sets the compact table pattern for a high-volume public
          archive. Production will add filters, permalinks, and hindsight
          calibration.
        </p>
      </section>

      <section className="section">
        <h2>Recent passes</h2>
        <div className="table" role="table" aria-label="Recent passes">
          <div className="row header" role="row">
            <span>Date</span>
            <span>Game</span>
            <span>Confidence</span>
            <span>Category</span>
          </div>
          {samplePasses.map((entry) => (
            <div className="row" role="row" key={`${entry.date}-${entry.game}`}>
              <span>{entry.date}</span>
              <span>{entry.game}</span>
              <span>{entry.confidence}</span>
              <span>{entry.category}</span>
            </div>
          ))}
        </div>
      </section>

      <ContextualVaultCta surface="passes" />
      {proofSurfaceEmailCaptureEnabled() ? (
        <ProofSurfaceEmailCapture variant="passes" />
      ) : null}
    </main>
  );
}
