import { ContextualVaultCta } from "@/components/contextual-vault-cta";
import { ProofSurfaceEmailCapture } from "@/components/proof-surface-email-capture";
import {
  contextualVaultCtaEnabled,
  proofSurfaceEmailCaptureEnabled,
} from "@/lib/feature-flags";

const sampleAutopsies = [
  {
    date: "26 May 2026",
    game: "Boston @ Miami",
    pick: "Boston -3.5 at 64%",
    cause: "02 - Factor-interaction blind spot",
  },
  {
    date: "19 May 2026",
    game: "Chicago @ Detroit",
    pick: "Detroit moneyline at 61%",
    cause: "03 - Sample-size noise",
  },
  {
    date: "12 May 2026",
    game: "Texas @ Seattle",
    pick: "Seattle under 8.5 at 62%",
    cause: "04 - Line-movement misread",
  },
];

export default function LossRoomPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">The Loss Room</p>
        <h1>Every settled losing pick. Every autopsy. Public.</h1>
        <p className="lede">
          This scaffold establishes the public archive shape. Production entries
          will be permanent, filterable, and linked to model versions.
        </p>
      </section>

      <section className="section">
        <h2>Recent autopsies</h2>
        <div className="table" role="table" aria-label="Recent autopsies">
          <div className="row header" role="row">
            <span>Date</span>
            <span>Game</span>
            <span>Publication</span>
            <span>Root cause</span>
          </div>
          {sampleAutopsies.map((entry) => (
            <div className="row" role="row" key={`${entry.date}-${entry.game}`}>
              <span>{entry.date}</span>
              <span>{entry.game}</span>
              <span>{entry.pick}</span>
              <span>{entry.cause}</span>
            </div>
          ))}
        </div>
      </section>

      {contextualVaultCtaEnabled() ? (
        <ContextualVaultCta surface="loss-room" />
      ) : null}
      {proofSurfaceEmailCaptureEnabled() ? (
        <ProofSurfaceEmailCapture variant="loss-room" />
      ) : null}
    </main>
  );
}
