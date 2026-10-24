import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { IG_DM } from "@/lib/kit-offer";
import { MATERIALS, ballpark, letterHeightInches, type MaterialId } from "@/lib/quote";
import { LeadForm } from "@/components/studio/lead-form";
import { StudioNav } from "@/components/studio/nav";

export const Route = createFileRoute("/quote")({
  component: QuotePage,
  head: () => ({
    meta: [{ title: "Sign size & quote — ballpark, not a bid" }],
  }),
});

function QuotePage() {
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(3);
  const [view, setView] = useState(40);
  const [material, setMaterial] = useState<MaterialId>("acm");
  const [unlocked, setUnlocked] = useState(false);
  const letters = letterHeightInches(view);
  const quote = ballpark({ widthFt: width, heightFt: height, viewFt: view, material });

  return (
    <div className="kit-shell">
      <div className="grain" />
      <StudioNav current="/quote" cta={{ href: IG_DM, label: "DM SIGN" }} />
      <section className="grid items-end gap-8 px-5 pb-10 pt-4 lg:grid-cols-2 md:px-8">
        <div>
          <p className="kicker">Lead magnet · Houston ranges</p>
          <h1 className="display mt-3 max-w-[14ch] text-3xl">
            How big should the sign be?
          </h1>
          <p className="mt-4 max-w-[50ch] text-muted">
            Enter the opening. Get letter height, a material, and a ballpark. The dollar range is behind an email — then
            SignPreview and Kit.
          </p>
        </div>
        <img
          src="/studio/measure.jpg"
          alt="Measuring a storefront opening — sample"
          className="w-full rounded-[18px]"
        />
      </section>
      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-line p-6 md:p-8">
            <Range label="Width" unit="ft" value={width} min={2} max={24} onChange={setWidth} />
            <Range label="Height" unit="ft" value={height} min={1} max={12} onChange={setHeight} />
            <Range label="Viewing distance" unit="ft" value={view} min={10} max={200} onChange={setView} />
            <p className="kicker mt-6">Material</p>
            <div className="mt-2 grid gap-2">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterial(m.id)}
                  className={`rounded-lg border px-4 py-3 text-left ${material === m.id ? "border-paper bg-paper text-ink" : "border-line"}`}
                >
                  <span className="block font-medium">{m.label}</span>
                  <span className={`block text-xs ${material === m.id ? "text-faint" : "text-muted"}`}>{m.note}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-line bg-ink-2 p-6 md:p-8">
            <p className="kicker">Recommendation</p>
            <p className="display mt-3 text-2xl">{letters}″ cap height</p>
            <p className="mt-2 text-sm text-muted">
              Rule of thumb: one inch of letter height per ten feet of viewing distance. Panel {width}×{height} ft ·{" "}
              {quote.area} sq ft.
            </p>
            {unlocked ? (
              <div className="mt-8">
                <p className="kicker">Ballpark — not a bid</p>
                <p className="display mt-2 text-3xl">
                  ${quote.low.toLocaleString()}–${quote.high.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {quote.spec.label}. Houston 2026 shop ranges. Permits, install, and electric not always included.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/signpreview" className="btn-primary">
                    Mock it in SignPreview
                  </Link>
                  <Link to="/" className="btn-ghost">
                    Get a $350 site
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <p className="kicker">Unlock the number</p>
                <h2 className="display mt-2 text-xl">Email first. Then the range.</h2>
                <div className="mt-4">
                  <LeadForm product="quote" cta="Show the ballpark" onSaved={() => setUnlocked(true)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Range({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-sm">
        <span className="kicker">{label}</span>
        <span>
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-copper"
      />
    </label>
  );
}
