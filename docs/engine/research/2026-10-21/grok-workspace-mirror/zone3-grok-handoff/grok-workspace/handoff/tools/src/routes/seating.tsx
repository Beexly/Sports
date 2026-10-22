import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IG_DM } from "@/lib/kit-offer";
import { SAMPLE_GUESTS, SEATS_PER, TABLE_COUNT, type Guest } from "@/lib/seating";
import { LeadForm } from "@/components/studio/lead-form";
import { StudioNav } from "@/components/studio/nav";

export const Route = createFileRoute("/seating")({
  component: SeatingPage,
  head: () => ({
    meta: [{ title: "Seating planner — Vow & Post" }],
  }),
});

function SeatingPage() {
  const [guests, setGuests] = useState<Guest[]>(SAMPLE_GUESTS);
  const [hold, setHold] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const unseated = guests.filter((g) => g.table === null);
  const tables = useMemo(
    () =>
      Array.from({ length: TABLE_COUNT }, (_, i) => ({
        n: i + 1,
        people: guests.filter((g) => g.table === i + 1),
      })),
    [guests],
  );

  function seat(table: number) {
    if (!hold) return;
    setGuests((prev) =>
      prev.map((g) => {
        if (g.id !== hold) return g;
        const at = prev.filter((x) => x.table === table).length;
        if (at >= SEATS_PER) return g;
        return { ...g, table };
      }),
    );
    setHold(null);
  }

  return (
    <div className="kit-shell">
      <div className="grain" />
      <StudioNav current="/seating" cta={{ href: IG_DM, label: "DM VOW" }} />
      <section className="px-5 pb-6 pt-4 md:px-8">
        <p className="kicker">Lead magnet · sample guests</p>
        <h1 className="display mt-3 max-w-[14ch] text-3xl">
          Seat the room. Then see the chart.
        </h1>
        <p className="mt-3 max-w-[52ch] text-muted">
          Tap a guest, tap a table. The finished chart is gated on an email — then a Vow & Post upsell. Names below are
          sample data.
        </p>
      </section>
      <section className="grid gap-6 px-5 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] md:px-8">
        <aside className="rounded-[18px] border border-line p-4">
          <p className="kicker">Unseated</p>
          <ul className="mt-3 grid gap-2">
            {unseated.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setHold(g.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${hold === g.id ? "border-paper bg-paper text-ink" : "border-line"}`}
                >
                  {g.name}
                  <span className="mt-0.5 block text-xs opacity-60">{g.party}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div
          className="relative min-h-[480px] overflow-hidden rounded-[18px] border border-line bg-cover bg-center p-4"
          style={{ backgroundImage: "url(/studio/reception.jpg)" }}
        >
          <div className="absolute inset-0 bg-ink/55" />
          <div className="relative grid grid-cols-2 gap-3 md:grid-cols-3">
            {tables.map((t) => (
              <button
                key={t.n}
                type="button"
                onClick={() => seat(t.n)}
                className="min-h-[140px] rounded-full border border-line-strong bg-ink/70 p-4 text-left"
              >
                <p className="font-display text-xl italic">Table {t.n}</p>
                <p className="text-xs text-muted">
                  {t.people.length}/{SEATS_PER}
                </p>
                <ul className="mt-2 text-xs">
                  {t.people.map((g) => (
                    <li key={g.id}>{g.name.split(" ")[0]}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-[640px] rounded-[28px] border border-line bg-ink-2 p-8">
          {unlocked ? (
            <div>
              <p className="kicker">Finished chart</p>
              <h2 className="display mt-3 text-xl">Elena & Marcus — sample</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {tables.map((t) => (
                  <div key={t.n} className="border-t border-line pt-3">
                    <p className="font-display italic">Table {t.n}</p>
                    <p className="text-sm text-muted">
                      {t.people.map((g) => g.name).join(", ") || "—"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-muted">Print this as a seating chart — $79, names swapped for yours.</p>
              <Link to="/vow/$slug" params={{ slug: "seating" }} className="btn-primary mt-4">
                Open the Vow & Post proof
              </Link>
            </div>
          ) : (
            <div>
              <p className="kicker">Unlock the chart</p>
              <h2 className="display mt-3 text-xl">Leave an email to see the finished floor.</h2>
              <div className="mt-6">
                <LeadForm product="seating" cta="Show me the chart" onSaved={() => setUnlocked(true)} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
