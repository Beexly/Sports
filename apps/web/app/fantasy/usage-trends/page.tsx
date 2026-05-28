const updatedAtIso = "2026-05-28";
const updatedAtLabel = "May 28, 2026";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is target-share trend analysis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Target-share trend analysis tracks directional change in a player's opportunity share across recent games, then compares it to seasonal baseline.",
      },
    },
    {
      "@type": "Question",
      name: "Why is snap count important?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Snap count captures on-field participation volume, which sets the upper bound for opportunity.",
      },
    },
    {
      "@type": "Question",
      name: "How does route participation affect projections?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Route participation estimates receiving involvement and helps separate static snap volume from actionable route opportunity.",
      },
    },
    {
      "@type": "Question",
      name: "Why do usage trends lag real role changes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most trend metrics are trailing indicators, so sudden role shifts may not fully register until enough new games are observed.",
      },
    },
    {
      "@type": "Question",
      name: "How should recent versus seasonal usage be weighted?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Recent usage is weighted more heavily when role stability is high; seasonal priors carry more weight when volatility is elevated.",
      },
    },
  ],
  dateModified: updatedAtIso,
};

export default function UsageTrendsPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Fantasy GEO</p>
        <h1>What is usage-trend analysis in fantasy sports?</h1>
        <p className="lede">
          Usage trends estimate opportunity trajectory. They improve context but
          do not eliminate uncertainty.
        </p>
        <p className="freshness">Last updated: {updatedAtLabel}</p>
      </section>

      <section className="section">
        <article className="copy-block">
          <h2>Direct answer</h2>
          <p>
            Usage-trend analysis blends target share, snap count, and route
            participation over time to estimate whether player opportunity is
            rising, flat, or declining.
          </p>
        </article>

        <article className="copy-block">
          <h2>Cluster links</h2>
          <p><a href="/methodology">Methodology overview</a></p>
          <p><a href="/fantasy">Fantasy hub</a></p>
        </article>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
