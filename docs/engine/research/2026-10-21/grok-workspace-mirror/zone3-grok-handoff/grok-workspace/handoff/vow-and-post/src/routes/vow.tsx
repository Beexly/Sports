import { createFileRoute, Link } from "@tanstack/react-router";
import { IG_DM } from "@/lib/kit-offer";
import { SAMPLE_COUPLE, VOW_PRODUCTS } from "@/lib/vow";
import { StudioNav } from "@/components/studio/nav";

export const Route = createFileRoute("/vow")({
  component: VowPage,
  head: () => ({
    meta: [
      { title: "Vow & Post — Wedding paper, as a system" },
      {
        name: "description",
        content: "Welcome, seating, menu, table numbers. $29–79. Print-ready. Sample suite for Elena & Marcus.",
      },
    ],
  }),
});

function VowPage() {
  return (
    <div className="paper-shell min-h-screen text-ink">
      <StudioNav
        current="/vow"
        paper
        cta={{ href: IG_DM, label: "DM VOW" }}
      />
      <section className="px-5 pb-10 pt-6 md:px-8">
        <div className="mx-auto grid max-w-[1240px] items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="kicker !text-faint">Vow & Post</p>
            <h1 className="display mt-3 max-w-[12ch] text-3xl">
              Paper that belongs in the room.
            </h1>
            <p className="mt-4 max-w-[48ch] text-faint leading-[1.55]">
              Welcome, seating, menu, table numbers — one suite, not four strangers from four shops. $29–79. You see it
              with your names before anything is printed.
            </p>
            <p className="mt-3 text-xs tracking-[0.14em] uppercase text-faint">{SAMPLE_COUPLE.note}</p>
          </div>
          <img
            src="/studio/vow-suite.jpg"
            alt="Sample wedding paper suite — welcome, seating, menu, table number"
            className="w-full rounded-[18px]"
          />
        </div>
      </section>
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-4 md:grid-cols-2">
          {VOW_PRODUCTS.map((p) => (
            <Link
              key={p.slug}
              to="/vow/$slug"
              params={{ slug: p.slug }}
              className="rounded-[18px] border border-ink/10 bg-paper p-6 no-underline text-ink transition-transform duration-150 hover:-translate-y-0.5"
            >
              <p className="kicker !text-faint">{p.size}</p>
              <h2 className="display mt-2 text-xl">
                {p.name} · ${p.price}
              </h2>
              <p className="mt-2 text-sm text-faint">{p.blurb}</p>
              <p className="mt-4 text-sm">Open the print proof →</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
