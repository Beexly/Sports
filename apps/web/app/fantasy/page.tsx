import Link from "next/link";

const updatedAt = "May 28, 2026";

const clusterPages = [
  {
    href: "/fantasy/how-start-sit-works",
    title: "How Start/Sit Works",
    body: "Methodology for converting injury, matchup, trend, and projection signals into a publishable start/sit view.",
  },
  {
    href: "/fantasy/usage-trends",
    title: "Usage Trends",
    body: "How target share, snap count, and route participation trends are measured and weighted.",
  },
  {
    href: "/fantasy/scheme-fit",
    title: "Scheme Fit",
    body: "How offensive structure shifts positional fantasy value before final publication decisions.",
  },
];

export default function FantasyHubPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Fantasy Intelligence</p>
        <h1>Fantasy methodology cluster.</h1>
        <p className="lede">
          This hub explains the process behind fantasy analysis. It does not
          publish live picks or guarantee outcomes.
        </p>
        <p className="freshness">Last updated: {updatedAt}</p>
      </section>

      <section className="grid" aria-label="Fantasy methodology pages">
        {clusterPages.map((page) => (
          <Link className="card" href={page.href} key={page.href}>
            <h2>{page.title}</h2>
            <p>{page.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
