import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LAWS } from "@/lib/doctrine";
import { useKeel } from "@/lib/store";
import { CostView } from "@/components/keel/cost-view";
import { EquationView } from "@/components/keel/equation-view";
import { FieldView } from "@/components/keel/field-view";
import { HuntView } from "@/components/keel/hunt-view";
import { RecordView } from "@/components/keel/record-view";

export const Route = createFileRoute("/")({ component: Home });

const VIEWS = [
  { id: "record", label: "Record" },
  { id: "field", label: "Field" },
  { id: "hunt", label: "Hunt" },
  { id: "equations", label: "Equations" },
  { id: "cost", label: "Cost" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

function Home() {
  const [view, setView] = useState<ViewId>("record");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void useKeel.persist.rehydrate();
    setReady(true);
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="border-b border-primary pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Closed record · 2026 week 4</p>
        <h1 className="mt-2 text-5xl text-fg sm:text-6xl">Keel</h1>
        <p className="mt-4 max-w-3xl text-xl text-fg">
          The intake for the fourth-down estimator. It hunts equations and datasets. A recorded null is not a license to invent one.
        </p>
        <p className="mt-3 max-w-3xl text-muted">
          The watch rewrites its own paper query from words it has admitted twice and never rejected. It does not rewrite a null, it does not name τ̂, and it does not emit a pick. World-best stays an objective: a lower held-out Brier, a real decision lift, and closing-line value once 200 rows are settled.
        </p>
      </header>

      <section className="mt-6 flex gap-3 overflow-x-auto pb-2" aria-label="Laws">
        {LAWS.map((law) => (
          <article key={law.id} className="min-w-64 shrink-0 border border-line bg-surface p-4">
            <p className="font-mono text-xs tracking-widest text-primary">
              {law.id} · {law.name}
            </p>
            <p className="mt-2 text-sm text-fg">{law.text}</p>
          </article>
        ))}
      </section>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Sections">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`min-h-11 px-4 font-mono text-sm ${view === item.id ? "bg-fg text-bg" : "border border-line text-fg"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {view === "record" && <RecordView />}
        {view === "field" && <FieldView />}
        {view === "hunt" && <HuntView ready={ready} />}
        {view === "equations" && <EquationView />}
        {view === "cost" && <CostView />}
      </div>

      <footer className="mt-10 border-t border-line py-6 font-mono text-sm text-muted">
        Partial label. No pick. Play-level time-to-throw is null. τ̂ stays unnamed.
      </footer>
    </main>
  );
}
