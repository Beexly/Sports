import Link from "next/link";

const surfaces = [
  {
    href: "/methodology",
    title: "Methodology",
    body: "How Galaxy publishes, passes, autopsies losses, and checks calibration.",
  },
  {
    href: "/loss-room",
    title: "Loss Room",
    body: "Every settled losing publication gets a public autopsy.",
  },
  {
    href: "/passes",
    title: "Pass List",
    body: "The archive of games Galaxy considered and chose not to publish.",
  },
  {
    href: "/vault",
    title: "Vault",
    body: "The private rationale layer for readers who want more context.",
  },
  {
    href: "/fantasy",
    title: "Fantasy",
    body: "Methodology pages for start/sit logic, usage trends, and scheme fit.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Public record scaffold</p>
        <h1>Proof surfaces before promotion.</h1>
        <p className="lede">
          This local scaffold gives Galaxy a static implementation target for the
          public pages that carry the monetization plan.
        </p>
      </section>
      <section className="grid" aria-label="Galaxy surfaces">
        {surfaces.map((surface) => (
          <Link className="card" href={surface.href} key={surface.href}>
            <h2>{surface.title}</h2>
            <p>{surface.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
