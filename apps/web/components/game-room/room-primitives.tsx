import Link from "next/link";
import { formatMarketDelta } from "@sports/types";

export function Panel({ title, children }: { readonly title: string; readonly children: React.ReactNode }): JSX.Element {
  return (
    <section className="border border-titanium bg-carbon/45 p-5">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="min-h-20 border border-titanium bg-carbon/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export function Fact({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="border border-titanium bg-obsidian/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</dt>
      <dd className="mt-1 text-ion-1">{value}</dd>
    </div>
  );
}

export function NextStep({ href, label, hint }: { readonly href: string; readonly label: string; readonly hint: string }): JSX.Element {
  return (
    <Link href={href} className="group block border border-titanium bg-obsidian/55 p-4 transition-colors hover:border-cyan-500/40">
      <p className="font-mono text-xs font-semibold text-cyan-200 group-hover:text-cyan-100">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ion-2">{hint}</p>
    </Link>
  );
}

export function formatNullable(value: number | null): string {
  return value === null ? "N/A" : formatMarketDelta(value);
}
