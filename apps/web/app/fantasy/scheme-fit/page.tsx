const updatedAtIso = "2026-05-28";
const updatedAtLabel = "May 28, 2026";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "What is scheme fit in sports intelligence?",
  dateModified: updatedAtIso,
  author: {
    "@type": "Organization",
    name: "Galaxy Sports Edge",
  },
  description:
    "Scheme-fit methodology for mapping offensive structures to skill-position fantasy value.",
};

const schemes = [
  {
    name: "Air Raid",
    effect:
      "Typically elevates wide receiver route volume and can increase short-area reception floor.",
  },
  {
    name: "West Coast",
    effect:
      "Often emphasizes timing and efficiency, improving stable target distribution in structured concepts.",
  },
  {
    name: "Run-Heavy",
    effect:
      "Can compress pass-game ceilings while increasing touchdown leverage for primary rush roles.",
  },
  {
    name: "Spread",
    effect:
      "Stretches defensive spacing and can increase volatility through distribution to multiple skill players.",
  },
  {
    name: "Pro-Style",
    effect:
      "Scheme flexibility can support balanced production, but role certainty depends heavily on personnel usage.",
  },
];

export default function SchemeFitPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Fantasy GEO</p>
        <h1>What is scheme fit in sports intelligence?</h1>
        <p className="lede">
          Scheme fit evaluates how offensive structure influences role quality,
          opportunity concentration, and fantasy output pathways.
        </p>
        <p className="freshness">Last updated: {updatedAtLabel}</p>
      </section>

      <section className="section">
        <article className="copy-block">
          <h2>Direct answer</h2>
          <p>
            Scheme fit maps tactical structure to role opportunity. It is used
            to adjust projections before publication, not to guarantee outcomes.
          </p>
        </article>

        <article className="copy-block">
          <h2>Five scheme classifications</h2>
          {schemes.map((scheme) => (
            <p key={scheme.name}>
              <strong>{scheme.name}:</strong> {scheme.effect}
            </p>
          ))}
        </article>

        <article className="copy-block">
          <h2>Cluster links</h2>
          <p><a href="/fantasy">Fantasy hub</a></p>
          <p><a href="/methodology">Methodology overview</a></p>
        </article>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
