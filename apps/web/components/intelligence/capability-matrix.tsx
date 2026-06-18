import { BRAND_COLORS } from "@/lib/brand";

type StatusKey = "LIVE" | "ACCRUING" | "GATED" | "SOON";

const STATUS_STYLE: Record<StatusKey, { color: string; bg: string; border: string }> = {
  LIVE:     { color: BRAND_COLORS.orbitalCyan, bg: "rgba(0,229,255,0.08)",   border: "rgba(0,229,255,0.22)"  },
  ACCRUING: { color: "#FFB454",                bg: "rgba(255,180,84,0.08)",  border: "rgba(255,180,84,0.22)" },
  GATED:    { color: BRAND_COLORS.softUltraviolet, bg: "rgba(122,92,255,0.08)", border: "rgba(122,92,255,0.22)" },
  SOON:     { color: "#9AA3B2",                bg: "rgba(154,163,178,0.06)", border: "rgba(154,163,178,0.14)" },
};

const COLUMNS = [
  {
    label: "Data Layer",
    color: BRAND_COLORS.orbitalCyan,
    items: [
      { name: "The Odds API",    note: "Live pricing",           status: "LIVE"     as StatusKey },
      { name: "nflverse",        note: "Player & team data",     status: "LIVE"     as StatusKey },
      { name: "Media Signal",    note: "Context intelligence",   status: "LIVE"     as StatusKey },
      { name: "Market Movement", note: "Steam & sharp action",   status: "LIVE"     as StatusKey },
    ],
  },
  {
    label: "Intelligence Engine",
    color: BRAND_COLORS.softUltraviolet,
    items: [
      { name: "Confidence Scoring", note: "0–100 calibrated",       status: "LIVE"     as StatusKey },
      { name: "Factor Model",       note: "4-factor signal score",   status: "LIVE"     as StatusKey },
      { name: "CLV Calibration",    note: "Closing-line alignment",  status: "ACCRUING" as StatusKey },
      { name: "Consensus Engine",   note: "Independent referees",    status: "LIVE"     as StatusKey },
    ],
  },
  {
    label: "Decision Gates",
    color: "#FFB454",
    items: [
      { name: "Min Confidence ≥55", note: "Hard floor threshold",   status: "LIVE"     as StatusKey },
      { name: "No-Bet Discipline",  note: "Silence is the default", status: "LIVE"     as StatusKey },
      { name: "King Standard",      note: "61/100 readiness",       status: "LIVE"     as StatusKey },
      { name: "History Grading",    note: "Settled-pick scoring",   status: "ACCRUING" as StatusKey },
    ],
  },
  {
    label: "Output Layer",
    color: BRAND_COLORS.ionMagenta,
    items: [
      { name: "Published Picks",  note: "Tiered with factor trail",  status: "LIVE" as StatusKey },
      { name: "Receipts Archive", note: "Tamper-evident ledger",      status: "LIVE" as StatusKey },
      { name: "Observatory",      note: "Live market monitoring",     status: "LIVE" as StatusKey },
      { name: "Accountability",   note: "Public settled record",      status: "LIVE" as StatusKey },
    ],
  },
] as const;

export function CapabilityMatrix() {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
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
                  className="flex flex-col gap-1.5 rounded-lg border p-3 transition-all duration-200 hover:border-opacity-50"
                  style={{ borderColor: `${col.color}18`, background: `${col.color}05` }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold leading-tight text-white">{item.name}</p>
                    <span
                      className="shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]"
                      style={{ color: st.color, background: st.bg, borderColor: st.border }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-tight text-ink-500">{item.note}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
