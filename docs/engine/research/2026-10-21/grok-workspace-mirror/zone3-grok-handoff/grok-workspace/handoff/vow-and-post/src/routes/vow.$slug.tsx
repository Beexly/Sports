import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SAMPLE_COUPLE, SAMPLE_MENU, SAMPLE_TABLES, VOW_PRODUCTS, type VowSlug } from "@/lib/vow";

export const Route = createFileRoute("/vow/$slug")({
  component: Proof,
});

function Proof() {
  const { slug } = Route.useParams();
  const product = VOW_PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw notFound();
  const s = slug as VowSlug;

  return (
    <div className="paper-shell min-h-screen text-ink">
      <div className="flex items-center justify-between px-5 py-4 print:hidden md:px-8">
        <Link to="/vow" className="text-sm text-faint no-underline">
          ← Vow & Post
        </Link>
        <button type="button" className="btn-on-paper text-sm" onClick={() => window.print()}>
          Print this proof
        </button>
      </div>
      <div className="mx-auto max-w-[900px] px-5 py-10 md:px-8">
        <p className="kicker !text-faint print:hidden">
          ${product.price} · {product.size} · {SAMPLE_COUPLE.note}
        </p>
        {s === "welcome" ? <Welcome /> : null}
        {s === "seating" ? <Seating /> : null}
        {s === "menu" ? <Menu /> : null}
        {s === "numbers" ? <Numbers /> : null}
        <aside className="mt-12 border-t border-ink/10 pt-6 print:hidden">
          <p className="kicker !text-faint">Etsy-ready</p>
          <h2 className="mt-2 font-display text-lg">{product.etsyTitle}</h2>
          <p className="mt-2 text-sm text-faint">{product.blurb} Digital printable. {product.size}. Personalization in 24h.</p>
          <p className="mt-2 text-xs text-faint">{product.tags.join(" · ")}</p>
        </aside>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <section className="print-sheet grid min-h-[70vh] place-items-center text-center">
      <div>
        <p className="kicker !text-faint">Welcome</p>
        <h1 className="display mt-6 text-3xl">
          {SAMPLE_COUPLE.a} <em>&</em> {SAMPLE_COUPLE.b}
        </h1>
        <p className="mt-6 text-faint">{SAMPLE_COUPLE.date}</p>
        <p className="mt-2">{SAMPLE_COUPLE.venue}</p>
        <p className="mt-10 max-w-[36ch] font-display text-xl italic">Please come in. You’re exactly on time.</p>
      </div>
    </section>
  );
}

function Seating() {
  return (
    <section className="print-sheet">
      <p className="kicker !text-faint text-center">Find your seat</p>
      <h1 className="display mt-4 text-center text-2xl">
        {SAMPLE_COUPLE.a} & {SAMPLE_COUPLE.b}
      </h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SAMPLE_TABLES.map((t) => (
          <div key={t.n} className="border-t border-ink/15 pt-4">
            <p className="font-display text-2xl italic">Table {t.n}</p>
            <p className="mt-2 text-sm text-faint">{t.guests}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Menu() {
  return (
    <section className="print-sheet mx-auto max-w-[420px] text-center">
      <p className="kicker !text-faint">Dinner</p>
      <h1 className="display mt-4 text-2xl">
        {SAMPLE_COUPLE.a} & {SAMPLE_COUPLE.b}
      </h1>
      <ul className="mt-10 grid gap-8">
        {SAMPLE_MENU.map((m) => (
          <li key={m.course}>
            <p className="kicker !text-faint">{m.course}</p>
            <p className="mt-2 font-display text-xl">{m.dish}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Numbers() {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="grid aspect-[5/7] place-items-center border border-ink/10">
          <p className="font-display text-4xl italic">{i + 1}</p>
        </div>
      ))}
    </section>
  );
}
