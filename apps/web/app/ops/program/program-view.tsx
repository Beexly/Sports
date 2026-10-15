import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PROGRAM_REVIEW as R } from "@/lib/program-review/program-data";

/**
 * Program review — presentational rendering of the committed fleet record
 * (lib/program-review/program-data.ts). No fetching, no computation of
 * record values, no emission: this component formats the record only.
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ion-white">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-titanium bg-carbon/60 p-4">
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <div>
        <div className="text-sm text-ion-1">{label}</div>
        {sub ? <div className="text-xs text-ion-2">{sub}</div> : null}
      </div>
      <div className="text-right font-semibold text-ion-white">{value}</div>
    </div>
  );
}

export function ProgramReviewView() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian p-8 text-ion-1">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <h1 className="text-2xl font-bold text-ion-white">Program Review</h1>
          <p className="mt-1 text-sm text-ion-2">
            The engine program as it stands — internal record, as of {R.asOf}.
          </p>
        </header>

        <div
          data-testid="emission-banner"
          className="mt-6 rounded-2xl border border-plasma bg-carbon p-4"
        >
          <div className="font-bold text-ion-white">
            Emission: {R.emission.state} · RVC {R.emission.rvc}
          </div>
          <p className="mt-1 text-sm text-ion-2">{R.emission.banner}</p>
        </div>

        <Section title="The Frozen Book">
          <Card>
            <Row
              label={R.frozenBook.baseline.label}
              value={R.frozenBook.baseline.crps}
              sub={R.frozenBook.baseline.status}
            />
            <Row
              label={R.frozenBook.bestVerified.label}
              value={R.frozenBook.bestVerified.crps}
              sub={R.frozenBook.bestVerified.status}
            />
            <Row
              label={R.frozenBook.bar.label}
              value={R.frozenBook.bar.crps}
              sub={R.frozenBook.bar.status}
            />
            <p className="mt-2 text-xs text-ion-2">{R.frozenBook.bar.note}</p>
            <p className="mt-2 text-xs text-ion-2">{R.frozenBook.filter}</p>
          </Card>
        </Section>

        <Section title="The Forward Program">
          <p className="text-xs text-ion-2">{R.forwardProgram.ratified}</p>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.forwardProgram.specA.name}
            </div>
            <div className="text-sm text-plasma">
              {R.forwardProgram.specA.status}
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-ion-2">
              {R.forwardProgram.specA.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.forwardProgram.candidate1.name}
            </div>
            <p className="mt-1 text-sm text-ion-1">
              {R.forwardProgram.candidate1.composition}
            </p>
            <p className="mt-1 text-xs text-ion-2">
              {R.forwardProgram.candidate1.status}
            </p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.forwardProgram.situationalSlot.name}
            </div>
            <p className="mt-1 text-sm text-ion-2">
              {R.forwardProgram.situationalSlot.status}
            </p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.forwardProgram.products.name}
            </div>
            <p className="mt-1 text-sm text-ion-1">
              {R.forwardProgram.products.status}
            </p>
            <p className="mt-1 text-sm text-ion-2">
              {R.forwardProgram.products.bar}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-ion-2">
              {R.forwardProgram.products.priceable.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ion-2">
              {R.forwardProgram.products.gap}
            </p>
          </Card>
        </Section>

        <Section title="Tonight — SEA@DEN">
          <Card>
            <div className="font-semibold text-ion-white">
              {R.tonight.matchup}
            </div>
            <p className="mt-1 text-sm text-ion-2">
              {R.tonight.kickoff} · {R.tonight.venue}
            </p>
            <p className="text-xs text-ion-2">
              Canonical key: {R.tonight.gameKey}
            </p>
            <div className="mt-3">
              <Row label="Spread" value={R.tonight.line.spread} />
              <Row label="Total" value={R.tonight.line.total} />
              <Row label="Moneyline" value={R.tonight.line.moneyline} />
            </div>
            <p className="mt-2 text-xs text-ion-2">{R.tonight.line.note}</p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">Injuries</div>
            <ul className="mt-2 grid gap-1 text-sm">
              {R.tonight.injuries.map((inj) => (
                <li key={`${inj.team}-${inj.player}`}>
                  <span className="text-ion-2">{inj.team}</span>{" "}
                  <span className="text-ion-1">{inj.player}</span>{" "}
                  <span className="font-semibold text-ion-white">
                    {inj.status}
                  </span>{" "}
                  <span className="text-ion-2">— {inj.detail}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <Row
              label="Archiver — main-line rows today"
              value={String(R.tonight.archiver.mainLineRows)}
            />
            <Row
              label="Archiver — alternate-ladder rows today"
              value={String(R.tonight.archiver.altRows)}
            />
            <p className="mt-2 text-xs text-ion-2">{R.tonight.archiver.note}</p>
          </Card>
        </Section>

        <Section title="Ingestion">
          <Card>
            <Row
              label="Cataloged signals with an ingestion home"
              value={`${R.ingestion.withHome} of ${R.ingestion.total}`}
            />
            <Row label="In the wiring queue (no home yet)" value={String(R.ingestion.queue)} />
            <div className="mt-3 border-t border-titanium pt-2">
              {R.ingestion.homes.map((h) => (
                <Row key={h.label} label={h.label} value={String(h.count)} />
              ))}
            </div>
            <p className="mt-2 text-xs text-ion-2">{R.ingestion.target}</p>
          </Card>
        </Section>

        <Section title="Layer 2 — The Reasoning Layer">
          <p className="text-sm text-ion-2">{R.layer2.intro}</p>
          <Card>
            <div className="font-semibold text-ion-white">
              Reasoning availability — of {R.layer2.reasoningAvailability.total}{" "}
              cataloged signals
            </div>
            <div className="mt-2">
              {R.layer2.reasoningAvailability.rows.map((row) => (
                <Row key={row.label} label={row.label} value={String(row.count)} />
              ))}
            </div>
            <p className="mt-2 text-xs text-ion-2">
              {R.layer2.reasoningAvailability.note}
            </p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.layer2.situationalGraph.name}
            </div>
            <p className="mt-1 text-sm text-ion-2">
              {R.layer2.situationalGraph.status}
            </p>
            <div className="mt-3 font-semibold text-ion-white">
              {R.layer2.situationalGraph.edgeTypes.label}
            </div>
            <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
              {R.layer2.situationalGraph.edgeTypes.rows.map((e) => (
                <li key={e.type}>
                  <span className="text-ion-1">{e.type}</span>{" "}
                  <span className="text-ion-2">— {e.kind}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 font-semibold text-ion-white">
              {R.layer2.situationalGraph.seaDen.label}
            </div>
            <ul className="mt-1 list-disc pl-5 text-sm text-ion-2">
              {R.layer2.situationalGraph.seaDen.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.layer2.templates.label}
            </div>
            <ul className="mt-2 grid gap-1 text-sm">
              {R.layer2.templates.rows.map((t) => (
                <li key={t.id}>
                  <span className="text-ion-2">{t.id}</span>{" "}
                  <span className="text-ion-1">{t.name}</span>{" "}
                  <span className="text-ion-2">— {t.reasoning}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ion-2">{R.layer2.templates.note}</p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.layer2.deepeningBuilds.label}
            </div>
            <ul className="mt-2 grid gap-3 text-sm">
              {R.layer2.deepeningBuilds.rows.map((b) => (
                <li key={b.name}>
                  <span className="text-ion-2">{b.id}</span>{" "}
                  <span className="font-semibold text-ion-white">{b.name}</span>{" "}
                  <span className="text-plasma">{b.status}</span>
                  <div className="text-ion-2">{b.note}</div>
                </li>
              ))}
            </ul>
          </Card>
        </Section>

        <Section title="Gates">
          <Card>
            <Row label="Gates wired live" value={String(R.gates.wiredLive)} />
            <p className="mt-2 text-xs text-ion-2">{R.gates.censusNote}</p>
          </Card>
          <Card>
            <div className="font-semibold text-ion-white">
              {R.gates.shadowBatch1.label}
            </div>
            <ul className="mt-2 grid gap-1 text-sm">
              {R.gates.shadowBatch1.rows.map((g) => (
                <li key={g.id}>
                  <span className="text-ion-2">{g.id}</span>{" "}
                  <span className="text-ion-1">{g.name}</span>{" "}
                  <span className="text-ion-2">— shadow, weight 0</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ion-2">{R.gates.batch2}</p>
          </Card>
        </Section>

        <footer className="mt-10 border-t border-titanium pt-4 text-xs text-ion-2">
          Record source: lib/program-review/program-data.ts (fleet record,{" "}
          {R.asOf}). Internal surface — not linked from public navigation.
          <RiskDisclosure variant="compact" className="mt-3" />
        </footer>
      </div>
    </div>
  );
}
