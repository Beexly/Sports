const updatedAtIso = "2026-05-28";
const updatedAtLabel = "May 28, 2026";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How does a start/sit recommendation work?",
  dateModified: updatedAtIso,
  datePublished: updatedAtIso,
  author: {
    "@type": "Organization",
    name: "Galaxy Sports Edge",
  },
  description:
    "Methodology for start/sit recommendations using injury status, matchup grade, target-share trend, and snap-count projection.",
};

export default function StartSitMethodologyPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Fantasy GEO</p>
        <h1>How does a start/sit recommendation work?</h1>
        <p className="lede">
          Start/sit analysis is a four-input process: injury status, matchup
          grade, target-share trend, and snap-count projection. Each input is
          scored, normalized, and reviewed before publication.
        </p>
        <p className="freshness">Last updated: {updatedAtLabel}</p>
      </section>

      <section className="section">
        <article className="copy-block">
          <h2>Direct answer</h2>
          <p>
            A recommendation is produced by combining four inputs, then running
            a final consistency check against role volatility and uncertainty
            flags. If uncertainty is too high, the recommendation is withheld.
          </p>
        </article>

        <article className="copy-block">
          <h2>Four-step pipeline</h2>
          <p>1) Collect source evidence for each input domain.</p>
          <p>2) Score each input on a consistent numeric scale.</p>
          <p>3) Apply weighting logic with uncertainty penalties.</p>
          <p>4) Publish only if confidence clears the threshold.</p>
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
