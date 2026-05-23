import { getVaultSeatCountFromEnv } from "@/lib/vault/seats";

export default function VaultPage() {
  const seatCount = getVaultSeatCountFromEnv();

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Vault</p>
        <h1>The rationale layer.</h1>
        <p className="lede">
          Vault is the private member tier for readers who want the internal
          rationale, monthly office hours, quarterly data reviews, and the
          slower room behind the public record.
        </p>
      </section>

      <section className="section">
        <h2>What this scaffold covers</h2>
        <p>
          This route is a placeholder for the canonical Vault landing page and
          checkout flow. It intentionally does not implement Stripe, Discord, or
          member gating yet.
        </p>
      </section>

      <section className="section">
        <h2>Founding seat counter</h2>
        <p>
          {seatCount.remaining} of {seatCount.cap} founding seats remain. The
          public API exposes counts only, never member identity.
        </p>
      </section>
    </main>
  );
}
