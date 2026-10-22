import { createFileRoute, Link } from "@tanstack/react-router";
import { IG_DM } from "@/lib/kit-offer";
import { StudioNav } from "@/components/studio/nav";
import { SignBuilder } from "@/components/signpreview/builder";

export const Route = createFileRoute("/signpreview")({
  component: SignPreviewPage,
  head: () => ({
    meta: [
      { title: "SignPreview — See the sign before you buy it" },
      {
        name: "description",
        content: "Free photoreal sign mockup. $150 print-ready package. Embeddable for sign shops.",
      },
    ],
  }),
});

function SignPreviewPage() {
  return (
    <div className="kit-shell">
      <div className="grain" />
      <StudioNav current="/signpreview" cta={{ href: IG_DM, label: "DM SIGN" }} />
      <section className="px-5 pb-8 pt-4 md:px-8">
        <p className="kicker">SignPreview</p>
        <h1 className="display mt-3 max-w-[16ch] text-3xl">
          See your new sign <em>before</em> you buy it.
        </h1>
        <p className="mt-4 max-w-[52ch] text-muted">
          Type the name. Pick a style. The letters are real type on a real storefront — spelled exactly. Free. The $150
          package is the print-ready file.
        </p>
      </section>
      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          <SignBuilder />
        </div>
      </section>
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-4 md:grid-cols-3">
          {[
            ["i", "You describe it", "Name, type, style. Twenty seconds. No design vocabulary."],
            ["ii", "You see it", "A storefront with your letters on it. Not a sketch."],
            ["iii", "You decide", "Love it: $150 for the cut file. Hate it: pay nothing."],
          ].map(([n, t, b]) => (
            <article key={n} className="rounded-[18px] border border-line p-6">
              <p className="font-display text-3xl italic text-copper">{n}.</p>
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-paper p-8 text-ink md:p-14">
          <p className="text-xs tracking-[0.18em] uppercase text-faint">For sign shops</p>
          <h2 className="display mt-3 text-2xl">This closes quotes.</h2>
          <p className="mt-3 max-w-[52ch] text-faint">
            Drop the widget on your quote page. Customers who see the sign approve faster. Setup is one iframe.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/signpreview/setup" className="btn-on-paper">
              Setup docs
            </Link>
            <Link to="/signpreview/embed" search={{ shop: "" }} className="btn-ghost !border-ink/20 !text-ink">
              Open the embed
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
