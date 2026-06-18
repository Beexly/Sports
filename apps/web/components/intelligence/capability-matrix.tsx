import { STATUS_STYLE, CAPABILITY_COLUMNS } from "@/lib/intelligence/capabilities";

export function CapabilityMatrix() {
  return (
    <div>
      {/* Horizontal-scroll affordance — only shown on narrow screens */}
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-500 md:hidden">
        Scroll horizontally to see all four layers →
      </p>
      <div className="overflow-x-auto" tabIndex={0} aria-label="Capability matrix — scrolls horizontally on small screens">
      <div className="grid min-w-[640px] grid-cols-4 gap-3">
        {CAPABILITY_COLUMNS.map((col) => (
          <div key={col.label} className="flex flex-col gap-2">
            {/* Column header pill */}
            <span
              className="inline-flex w-full items-center justify-center rounded-full py-1.5 font-mono text-[9px] uppercase tracking-[0.16em]"
              style={{ color: col.color, background: `${col.color}0d`, border: `1px solid ${col.color}22` }}
            >
              {col.label}
            </span>

            {/* Items */}
            {col.items.map((item) => {
              const st = STATUS_STYLE[item.status];
              return (
                <div
                  key={item.name}
                  className="flex flex-col gap-1.5 rounded-lg border p-3 transition-all duration-200"
                  style={{ borderColor: `${col.color}18`, background: `${col.color}05` }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold leading-tight text-white">{item.name}</p>
                    <span
                      className="shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
                      style={{ color: st.color, background: st.bg, borderColor: st.border }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-tight text-ink-400">{item.note}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
