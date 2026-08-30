"use client";

export function FilterBar({ options, active, paramName = "filter" }: { options: Array<{ label: string; value: string }>; active: string; paramName?: string; }) {
  return <div className="flex gap-2 flex-wrap">{options.map((opt) => <a key={opt.value} href={`?${paramName}=${encodeURIComponent(opt.value)}`} className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors no-underline whitespace-nowrap ${active === opt.value ? "border-orbital-cyan bg-orbital-cyan/10 text-orbital-cyan" : "border-mineral text-ion-1 hover:border-orbital-cyan hover:text-orbital-cyan"}`}>{opt.label}</a>)}</div>;
}
